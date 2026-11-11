#pragma once

#include "morph_gl.hpp"
#include "morph_preparation.hpp"
#include <cstddef>

namespace morph {

struct Capabilities {
    GLint64 maxBlock{};
    GLint maxGroups{};
};

inline Capabilities readCapabilities(GlApi &gl) {
    GLint major{};
    GLint minor{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &major);
    gl.GetIntegerv(GL_MINOR_VERSION, &minor);
    if (major < 4 || (major == 4 && minor < 3))
        throw std::runtime_error("Particle Morph Studio needs OpenGL 4.3; no CPU scale fallback");
    GLint bindings{};
    GLint computeBlocks{};
    GLint vertexBlocks{};
    GLint invocations{};
    GLint localX{};
    Capabilities caps;
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &caps.maxBlock);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &computeBlocks);
    gl.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &localX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &caps.maxGroups);
    if (gl.GetError() != GL_NO_ERROR || bindings < 5 || computeBlocks < 5 || vertexBlocks < 2 || invocations < 256 || localX < 256)
        throw std::runtime_error("Context does not support the declared buffer and workgroup layout");
    return caps;
}

inline void preflight(const Capabilities &caps, std::uint32_t count, std::uint32_t active = 0) {
    const auto plan = planMemory(count, active);
    if (plan.currentBytes > static_cast<std::uint64_t>(caps.maxBlock) || (count + 255U) / 256U > static_cast<std::uint32_t>(caps.maxGroups))
        throw std::invalid_argument("N exceeds the context SSBO or dispatch limit");
}

inline constexpr Vec4 tailCanary{-313.0F, -719.0F, -991.0F, -1.0F};

class GpuParticles {
    public:
    GpuParticles(GlApi &gl, const Capabilities &caps, std::shared_ptr<Prepared> data, std::uint32_t activeCount)
        : gl_(gl), data_(std::move(data)) {
        const auto submitBegin = std::chrono::steady_clock::now();
        preflight(caps, data_->settings.count, activeCount);
        const auto plan = planMemory(data_->settings.count, activeCount);
        bytes_ = {plan.sourceBytes, plan.targetBytes, plan.currentBytes, plan.pathBytes, plan.mappingBytes};
        gl_.GenBuffers(static_cast<GLsizei>(buffers_.size()), buffers_.data());
        try {
            for (std::size_t slot = 0; slot < buffers_.size(); ++slot) {
                if (!buffers_[slot])
                    throw std::runtime_error("Could not allocate a candidate buffer name");
                gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[slot]);
                gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes_[slot]), nullptr, GL_DYNAMIC_DRAW);
                GLint64 actual{};
                gl_.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &actual);
                if (gl_.GetError() != GL_NO_ERROR || actual != static_cast<GLint64>(bytes_[slot]))
                    throw std::runtime_error("Candidate allocation failed; keep ACTIVE buffers");
            }
            gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
            gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(data_->settings.count * sizeof(Vec4)), sizeof(Vec4), &tailCanary);
            uploadSubmitMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - submitBegin).count();
        } catch (...) {
            gl_.DeleteBuffers(static_cast<GLsizei>(buffers_.size()), buffers_.data());
            throw;
        }
    }
    ~GpuParticles() {
        gl_.DeleteBuffers(static_cast<GLsizei>(buffers_.size()), buffers_.data());
    }
    GpuParticles(const GpuParticles &) = delete;
    GpuParticles &operator=(const GpuParticles &) = delete;

    bool uploadNext() {
        const auto begin = std::chrono::steady_clock::now();
        if (slot_ == 2)
            ++slot_; // Compute fills CURRENT; only its tail sentinel was initialized.
        if (slot_ >= buffers_.size())
            return true;
        const void *pointer = nullptr;
        if (slot_ == 0)
            pointer = data_->source.data();
        if (slot_ == 1)
            pointer = data_->target.data();
        if (slot_ == 3)
            pointer = data_->path.data();
        if (slot_ == 4)
            pointer = data_->mapping.data();
        constexpr std::uint64_t chunkLimit = 4ULL * 1024 * 1024;
        const auto amount = std::min(chunkLimit, bytes_[slot_] - uploaded_);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[slot_]);
        const auto *bytes = static_cast<const std::byte *>(pointer);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(uploaded_), static_cast<GLsizeiptr>(amount), bytes + uploaded_);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Candidate upload failed; keep last-good");
        uploaded_ += amount;
        uploadSubmitMs_ += std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - begin).count();
        if (uploaded_ == bytes_[slot_]) {
            ++slot_;
            uploaded_ = 0;
        }
        if (slot_ == 2)
            ++slot_;
        return slot_ == buffers_.size();
    }
    void bind() const {
        for (GLuint binding = 0; binding < buffers_.size(); ++binding)
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers_[binding]);
    }
    void update(const Program &program, double t, Matching matching, Easing easing, Path path) {
        program.use();
        bind();
        gl_.Uniform1ui(program.uniform("particleCount"), data_->settings.count);
        gl_.Uniform1f(program.uniform("modelTime"), static_cast<float>(t));
        gl_.Uniform1i(program.uniform("matchingMode"), static_cast<int>(matching));
        gl_.Uniform1i(program.uniform("easingMode"), static_cast<int>(easing));
        gl_.Uniform1i(program.uniform("pathMode"), static_cast<int>(path));
        gl_.DispatchCompute((data_->settings.count + 255U) / 256U, 1, 1);
        // The next consumer is the vertex shader reading SSBOs, not a vertex attribute fetch.
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    }
    void updateOnCpu(double t, Matching matching, Easing easing, Path path) {
        std::vector<Vec4> current;
        current.reserve(data_->settings.count);
        for (std::uint32_t id = 0; id < data_->settings.count; ++id)
            current.push_back(pack(positionAt(*data_, id, t, matching, easing, path), static_cast<float>(id)));
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(current.size() * sizeof(Vec4)), current.data());
    }
    std::vector<Vec4> readCurrent(std::uint32_t first, std::uint32_t count) const {
        if (count == 0 || count > 16384 || static_cast<std::uint64_t>(first) + count > static_cast<std::uint64_t>(data_->settings.count) + 1)
            throw std::invalid_argument("Readback batch is outside the declared buffer");
        std::vector<Vec4> result(count);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(first * sizeof(Vec4)), static_cast<GLsizeiptr>(count * sizeof(Vec4)), result.data());
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Current buffer readback failed");
        return result;
    }
    double uploadSubmitMs() const {
        return uploadSubmitMs_;
    }
    const Prepared &data() const {
        return *data_;
    }

    private:
    GlApi &gl_;
    std::shared_ptr<Prepared> data_;
    std::array<GLuint, 5> buffers_{};
    std::array<std::uint64_t, 5> bytes_{};
    std::size_t slot_{};
    std::uint64_t uploaded_{};
    double uploadSubmitMs_{};
};

} // namespace morph
