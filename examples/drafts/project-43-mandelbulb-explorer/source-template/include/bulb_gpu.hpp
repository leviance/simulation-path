#pragma once
#include "bulb_gl.hpp"
#include "bulb_jobs.hpp"
#include <chrono>
#include <cstring>
#include <vector>

namespace bulb {

struct BatchResult {
    Snapshot snapshot;
    Tile tile;
    Counters counters;
    double gpuMs{};
    double submitMs{};
    int destination{};
};

class GpuRenderer {
    public:
    explicit GpuRenderer(GlApi &gl)
        : gl_(gl), compute_(gl, "bulb.comp"), display_(gl, "fullscreen.vert", "display.frag") {
        GLint major{}, minor{}, bindings{}, invocations{}, groupX{}, groupY{};
        gl_.GetIntegerv(GL_MAJOR_VERSION, &major);
        gl_.GetIntegerv(GL_MINOR_VERSION, &minor);
        gl_.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
        gl_.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
        gl_.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &groupX);
        gl_.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 1, &groupY);
        GLint64 blockLimit{};
        gl_.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &blockLimit);
        if (major < 4 || (major == 4 && minor < 3) || bindings < 3 || invocations < 64 || groupX < 8 || groupY < 8 || blockLimit < static_cast<GLint64>(bufferBytes(imageWidth, imageHeight)))
            throw std::runtime_error("OpenGL 4.3, 64-invocation groups, three SSBO bindings and a 25 MB block are required");
        gl_.GenBuffers(4, buffers_.data());
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenQueries(1, &query_);
        try {
            for (GLuint id : buffers_)
                if (!id)
                    throw std::runtime_error("GPU buffer allocation failed");
#if LAB_CHECKPOINT >= 7
            finalCount_ = imageWidth * imageHeight;
#else
            finalCount_ = 1;
#endif
            allocate(buffers_[0], (finalCount_ + 1) * sizeof(Pixel));
            allocate(buffers_[1], bufferBytes(previewWidth, previewHeight));
            allocate(buffers_[2], bufferBytes(previewWidth, previewHeight));
            allocate(buffers_[3], 48);
            writeCanary(buffers_[0], finalCount_);
            writeCanary(buffers_[1], previewWidth * previewHeight);
            writeCanary(buffers_[2], previewWidth * previewHeight);
            if (!vao_ || !query_)
                throw std::runtime_error("Could not allocate fullscreen VAO/timer");
        } catch (...) {
            release();
            throw;
        }
    }
    ~GpuRenderer() {
        release();
    }
    GpuRenderer(const GpuRenderer &) = delete;
    GpuRenderer &operator=(const GpuRenderer &) = delete;
    bool busy() const {
        return fence_ != nullptr;
    }

    void submit(const Snapshot &snapshot, Tile tile) {
        if (busy())
            throw std::logic_error("Only one bounded GPU batch may be pending");
        Settings settings = snapshot.settings;
        if (tile.preview)
            settings = previewSettings(settings);
        batchBound(settings, static_cast<std::uint64_t>(tile.width) * tile.height, !tile.preview);
        const auto begin = std::chrono::steady_clock::now();
        pending_ = {snapshot, tile, {}, 0.0, 0.0, 0};
        pending_.destination = 0;
        if (tile.preview)
            pending_.destination = 3 - activePreview_;
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, buffers_[pending_.destination]);
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, buffers_[3]);
        const std::array<std::uint32_t, 12> zero{};
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[3]);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(zero), zero.data());
        compute_.use();
        two("imageSize", imageWidth, imageHeight);
        if (tile.preview)
            two("imageSize", previewWidth, previewHeight);
        two("tileOrigin", tile.x, tile.y);
        two("tileExtent", tile.width, tile.height);
        gl_.Uniform1ui(compute_.uniform("generation"), snapshot.generation);
        int jitterIndex = -1;
        if (settings.samples == 4)
            jitterIndex = tile.sample;
        integer("sampleIndex", jitterIndex);
        integer("power", settings.power);
        integer("iterationLimit", settings.iterations);
        integer("rayLimit", settings.raySteps);
        integer("palette", settings.palette);
        integer("sliceMode", static_cast<int>(settings.slice));
        scalar("sliceY", settings.sliceY);
        scalar("bailout", settings.bailout);
        scalar("hitEpsilon", settings.epsilon);
        scalar("normalStep", settings.normalStep);
        scalar("safety", settings.safety);
        scalar("farBound", settings.farBound);
        scalar("tanHalfFov", snapshot.camera.tanHalfFov);
        integer("detailed", static_cast<int>(!tile.preview));
        vector("eye", snapshot.camera.eye());
        vector("forward", snapshot.camera.forward());
        vector("right", snapshot.camera.right());
        vector("up", snapshot.camera.up());
        gl_.BeginQuery(GL_TIME_ELAPSED, query_);
        gl_.DispatchCompute((tile.width + 7) / 8, (tile.height + 7) / 8, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        gl_.EndQuery(GL_TIME_ELAPSED);
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence_)
            throw std::runtime_error("Could not fence GPU batch");
        gl_.Flush();
        pending_.submitMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - begin).count();
        deadline_ = std::chrono::steady_clock::now() + std::chrono::seconds(3);
    }

    std::optional<BatchResult> poll() {
        if (!fence_)
            return std::nullopt;
        const GLenum status = gl_.ClientWaitSync(fence_, 0, 0);
        if (status == GL_WAIT_FAILED)
            throw std::runtime_error("GPU fence wait failed");
        GLint available{};
        gl_.GetQueryObjectiv(query_, GL_QUERY_RESULT_AVAILABLE, &available);
        if ((status != GL_ALREADY_SIGNALED && status != GL_CONDITION_SATISFIED) || !available) {
            if (std::chrono::steady_clock::now() > deadline_)
                throw std::runtime_error("GPU batch exceeded three-second deadline");
            return std::nullopt;
        }
        gl_.DeleteSync(fence_);
        fence_ = nullptr;
        GLuint64 elapsed{};
        gl_.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &elapsed);
        pending_.gpuMs = static_cast<double>(elapsed) / 1000000.0;
        std::array<std::uint32_t, 12> values{};
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[3]);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(values), values.data());
        pending_.counters = {values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7], values[8]};
        if (pending_.counters.samples != static_cast<std::uint64_t>(pending_.tile.width) * pending_.tile.height)
            throw std::runtime_error("GPU did not process the complete batch");
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("OpenGL error after completed batch");
        return pending_;
    }
    void publishPreview(int index) {
        activePreview_ = index;
    }
    void display(int x, int y, int width, int height, const RenderPlan &plan, int mode) {
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Viewport(x, y, width, height);
        display_.use();
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, buffers_[0]);
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, buffers_[activePreview_]);
        gl_.Uniform2f(display_.uniform("viewportSize"), static_cast<float>(width), static_cast<float>(height));
        gl_.Uniform2f(display_.uniform("viewportOrigin"), static_cast<float>(x), static_cast<float>(y));
        std::uint32_t generation = 0;
        Settings settings;
        if (plan.active()) {
            generation = plan.active()->generation;
            settings = plan.active()->settings;
        }
        gl_.Uniform1ui(display_.uniform("generation"), generation);
        gl_.Uniform1i(display_.uniform("viewMode"), mode);
        int finalEnabled = 0;
#if LAB_CHECKPOINT >= 7
        finalEnabled = 1;
#endif
        gl_.Uniform1i(display_.uniform("useFinal"), finalEnabled);
        gl_.Uniform1i(display_.uniform("maximumSteps"), settings.raySteps);
        gl_.Uniform1i(display_.uniform("maximumIterations"), settings.iterations);
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
    }
    std::vector<Pixel> readPixels(std::size_t first, std::size_t count, bool preview = false) {
        std::size_t limit = finalCount_;
        int index = 0;
        if (preview) {
            limit = previewWidth * previewHeight;
            index = activePreview_;
        }
        if (busy() || count > 4096 || first + count > limit)
            throw std::invalid_argument("Readback needs an idle GPU and at most 4096 in-range records");
        std::vector<Pixel> result(count);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[index]);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, first * sizeof(Pixel), count * sizeof(Pixel), result.data());
        return result;
    }
    bool canariesIntact() {
        if (busy())
            throw std::logic_error("Wait for the finite batch before reading canaries");
        for (int index = 0; index < 3; ++index) {
            std::size_t limit = previewWidth * previewHeight;
            if (index == 0)
                limit = finalCount_;
            Pixel actual;
            gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[index]);
            gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, limit * sizeof(Pixel), sizeof(Pixel), &actual);
            const auto expected = canary();
            if (std::memcmp(&actual, &expected, sizeof(Pixel)) != 0)
                return false;
        }
        return true;
    }
    std::uint64_t bytes() const {
        return (finalCount_ + 1) * sizeof(Pixel) + 2 * bufferBytes(previewWidth, previewHeight) + 48;
    }

    private:
    static Pixel canary() {
        return {{-1337, -719, -991, -1}, {0x13579bdfU, 0xfedcba98U, 0x12345678U, 0xabcdef01U}, {-1, -2, -3, -4}};
    }
    void writeCanary(GLuint buffer, std::size_t count) {
        const auto value = canary();
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, count * sizeof(Pixel), sizeof(Pixel), &value);
    }
    void allocate(GLuint buffer, std::uint64_t bytes) {
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), nullptr, GL_DYNAMIC_DRAW);
        GLint64 actual{};
        gl_.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &actual);
        if (gl_.GetError() != GL_NO_ERROR || actual != static_cast<GLint64>(bytes))
            throw std::runtime_error("SSBO allocation failed; image size has not been reduced");
        const std::uint32_t zero = 0;
        gl_.ClearBufferData(GL_SHADER_STORAGE_BUFFER, GL_R32UI, GL_RED_INTEGER, GL_UNSIGNED_INT, &zero);
    }
    void integer(const char *name, int value) {
        const auto location = compute_.optionalUniform(name);
        if (location >= 0)
            gl_.Uniform1i(location, value);
    }
    void scalar(const char *name, double value) {
        const auto location = compute_.optionalUniform(name);
        if (location >= 0)
            gl_.Uniform1f(location, static_cast<float>(value));
    }
    void two(const char *name, int x, int y) {
        const auto location = compute_.optionalUniform(name);
        if (location >= 0)
            gl_.Uniform2i(location, x, y);
    }
    void vector(const char *name, Vec3 value) {
        const auto location = compute_.optionalUniform(name);
        if (location >= 0)
            gl_.Uniform3f(location, static_cast<float>(value.x), static_cast<float>(value.y), static_cast<float>(value.z));
    }
    void release() {
        if (fence_)
            gl_.DeleteSync(fence_);
        if (query_)
            gl_.DeleteQueries(1, &query_);
        if (vao_)
            gl_.DeleteVertexArrays(1, &vao_);
        gl_.DeleteBuffers(4, buffers_.data());
    }
    GlApi &gl_;
    Program compute_, display_;
    std::array<GLuint, 4> buffers_{};
    GLuint vao_{}, query_{};
    GLsync fence_{};
    std::chrono::steady_clock::time_point deadline_;
    BatchResult pending_;
    int activePreview_{1};
    std::size_t finalCount_{};
};

} // namespace bulb
