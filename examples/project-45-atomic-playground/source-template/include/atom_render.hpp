#pragma once

#include "atom_camera.hpp"
#include "atom_gpu.hpp"
#include "atom_overlay.hpp"

namespace atom {

struct ViewStyle {
    int clipAxis{-1}, palette{};
    float clipOffset{}, pointSize{2}, opacity{0.08F}, exposure{1};
    bool densityBoost{};
    bool showProbe{};
    Vec3 probeCenter{};
    float probeRadius{2};
};

// Additive floating-point splats are order independent. Tone mapping is a display
// transform, not a measurement of probability or an extra physical density.
class CloudRenderer {
    public:
    CloudRenderer(GlApi& gl, MemoryBudget& budget) :
        gl_(gl),
        budget_(budget),
        cloud_(gl, "cloud.vert", "cloud.frag") {
#if LAB_CHECKPOINT >= 6
        tone_ = std::make_unique<Program>(gl_, "tone.vert", "tone.frag");
#endif
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenQueries(1, &drawQuery_);
        dummy_ = std::make_unique<Buffer>(gl_, budget_, sizeof(PointRecord));
        if (!vao_)
            throw std::runtime_error("Cloud VAO allocation failed");
    }

    ~CloudRenderer() {
        if (texture_)
            gl_.DeleteTextures(1, &texture_);
        if (fbo_)
            gl_.DeleteFramebuffers(1, &fbo_);
        gl_.DeleteVertexArrays(1, &vao_);
        gl_.DeleteQueries(1, &drawQuery_);
        if (bytes_)
            budget_.release(bytes_);
    }

    // A resize is a candidate allocation too: keep the previous target on failure.
    void resize(int width, int height) {
        if (width == width_ && height == height_)
            return;
        if (width <= 0 || height <= 0 || width > 4096 || height > 2160)
            throw std::invalid_argument("Drawable dimensions outside the finite target budget");
#if LAB_CHECKPOINT >= 6
        const auto bytes = static_cast<std::size_t>(width) * height * 8;
        budget_.acquire(bytes);
        GLuint texture{}, fbo{};
        try {
            gl_.GenTextures(1, &texture);
            gl_.BindTexture(GL_TEXTURE_2D, texture);
            gl_.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, width, height, 0, GL_RGBA, GL_FLOAT, nullptr);
            gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
            gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
            gl_.GenFramebuffers(1, &fbo);
            gl_.BindFramebuffer(GL_FRAMEBUFFER, fbo);
            gl_.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
            if (!texture || !fbo || gl_.GetError() != GL_NO_ERROR || gl_.CheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE)
                throw std::runtime_error("HDR framebuffer allocation failed");
        } catch (...) {
            if (texture)
                gl_.DeleteTextures(1, &texture);
            if (fbo)
                gl_.DeleteFramebuffers(1, &fbo);
            budget_.release(bytes);
            gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
            throw;
        }
        if (texture_)
            gl_.DeleteTextures(1, &texture_);
        if (fbo_)
            gl_.DeleteFramebuffers(1, &fbo_);
        if (bytes_)
            budget_.release(bytes_);
        texture_ = texture;
        fbo_ = fbo;
        bytes_ = bytes;
#endif
        width_ = width;
        height_ = height;
    }

    void begin(int width, int height) {
        resize(width, height);
#if LAB_CHECKPOINT >= 6
        gl_.BindFramebuffer(GL_FRAMEBUFFER, fbo_);
#else
        // The early field/CPU/GPU checkpoints draw straight into the window.
        // Lesson 6 replaces this low-dynamic-range baseline with an HDR target.
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
#endif
        gl_.Viewport(0, 0, width, height);
        gl_.ClearColor(0, 0, 0, 0);
        gl_.Clear(GL_COLOR_BUFFER_BIT);
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Enable(GL_PROGRAM_POINT_SIZE);
        gl_.Enable(GL_BLEND);
        gl_.BlendFunc(GL_ONE, GL_ONE);
        gl_.BindVertexArray(vao_);
        if (drawPending_) {
            GLint available{};
            gl_.GetQueryObjectiv(drawQuery_, GL_QUERY_RESULT_AVAILABLE, &available);
            if (available) {
                GLuint64 elapsed{};
                gl_.GetQueryObjectui64v(drawQuery_, GL_QUERY_RESULT, &elapsed);
                drawMs_ = static_cast<double>(elapsed) / 1000000.0;
                ++drawSerial_;
                drawPending_ = false;
            }
        }
        measuring_ = !drawPending_;
        if (measuring_)
            gl_.BeginQuery(GL_TIME_ELAPSED, drawQuery_);
    }

    // snippet:atom-cloud-draw
    void draw(const GpuCloud* cloud, const SamplingConfig& preview, const Camera& camera, const ViewStyle& style, int x, int width, int height, const Buffer* cpuPoints = nullptr, std::uint32_t cpuCount = 0) {
        cloud_.use();
        const SamplingConfig* selected = &preview;
        if (cloud)
            selected = &cloud->config();
        const SamplingConfig& config = *selected;
        gl_.Viewport(x, 0, width, height);
        vector("cameraEye", camera.eye());
        vector("cameraRight", camera.right());
        vector("cameraUp", camera.up());
        vector("cameraForward", camera.forward());
        gl_.Uniform1f(cloud_.uniform("tanHalfFov"), camera.tanHalfFov);
        gl_.Uniform1f(cloud_.uniform("aspect"), static_cast<float>(width) / height);
        gl_.Uniform1f(cloud_.uniform("referenceDistance"), camera.distance);
        gl_.Uniform1f(cloud_.uniform("pointSize"), style.pointSize);
        gl_.Uniform1f(cloud_.uniform("rMax"), config.radius);
        gl_.Uniform1f(cloud_.uniform("opacity"), style.opacity);
        gl_.Uniform1i(cloud_.uniform("orbital"), static_cast<int>(config.orbital));
        int lattice = 0;
        if (!cloud && !cpuPoints)
            lattice = 1;
        gl_.Uniform1i(cloud_.uniform("latticeMode"), lattice);
        gl_.Uniform1i(cloud_.uniform("clipAxis"), style.clipAxis);
        gl_.Uniform1f(cloud_.uniform("clipOffset"), style.clipOffset);
        gl_.Uniform1i(cloud_.uniform("palette"), style.palette);
        gl_.Uniform1i(cloud_.uniform("densityBoost"), static_cast<int>(style.densityBoost));
        gl_.Uniform1i(cloud_.uniform("showProbe"), static_cast<int>(style.showProbe));
        gl_.Uniform4f(cloud_.uniform("probeSphere"), style.probeCenter.x, style.probeCenter.y, style.probeCenter.z, style.probeRadius);
        if (cloud)
            cloud->points().bind(2);
        if (cpuPoints)
            cpuPoints->bind(2);
        if (!cloud && !cpuPoints)
            dummy_->bind(2);
        GLsizei count = 48 * 48 * 48;
        if (cloud)
            count = static_cast<GLsizei>(cloud->accepted());
        if (cpuPoints)
            count = static_cast<GLsizei>(cpuCount);
        gl_.DrawArrays(GL_POINTS, 0, count);
    }

    // end-snippet:atom-cloud-draw

    void finish(const ViewStyle& style) {
#if LAB_CHECKPOINT >= 6
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl_.Viewport(0, 0, width_, height_);
        gl_.Disable(GL_BLEND);
        gl_.Disable(GL_DEPTH_TEST);
        tone_->use();
        gl_.ActiveTexture(GL_TEXTURE0);
        gl_.BindTexture(GL_TEXTURE_2D, texture_);
        gl_.Uniform1i(tone_->uniform("accumulation"), 0);
        gl_.Uniform1f(tone_->uniform("exposure"), style.exposure);
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
#else
        // Exposure has no effect until the tone-mapping pass is introduced.
        (void)style;
#endif
        if (measuring_) {
            gl_.EndQuery(GL_TIME_ELAPSED);
            drawPending_ = true;
        }
    }

    double drawMs() const {
        return drawMs_;
    }

    std::uint64_t drawSerial() const {
        return drawSerial_;
    }

    private:
    void vector(const char* name, Vec3 p) {
        gl_.Uniform3f(cloud_.uniform(name), p.x, p.y, p.z);
    }

    GlApi& gl_;
    MemoryBudget& budget_;
    Program cloud_;
    std::unique_ptr<Program> tone_;
    GLuint vao_{}, fbo_{}, texture_{};
    int width_{}, height_{};
    std::size_t bytes_{};
    std::unique_ptr<Buffer> dummy_;
    GLuint drawQuery_{};
    bool drawPending_{}, measuring_{};
    double drawMs_{};
    std::uint64_t drawSerial_{};
};

class OverlayRenderer {
    public:
    explicit OverlayRenderer(GlApi& gl) :
        gl_(gl),
        program_(gl, "overlay.vert", "overlay.frag") {
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenBuffers(1, &buffer_);
        if (!vao_ || !buffer_)
            throw std::runtime_error("UI allocation failed");
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), nullptr);
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), reinterpret_cast<void*>(12));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
    }

    ~OverlayRenderer() {
        gl_.DeleteBuffers(1, &buffer_);
        gl_.DeleteVertexArrays(1, &vao_);
    }

    void draw(const Overlay& overlay, int width, int height) {
        if (overlay.vertices().size() > 250000)
            throw std::runtime_error("UI geometry budget exceeded");
        gl_.Viewport(0, 0, width, height);
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Disable(GL_BLEND);
        program_.use();
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, overlay.vertices().size() * sizeof(LineVertex), overlay.vertices().data(), GL_DYNAMIC_DRAW);
        gl_.DrawArrays(GL_TRIANGLES, 0, static_cast<GLsizei>(overlay.vertices().size()));
    }

    private:
    GlApi& gl_;
    Program program_;
    GLuint vao_{}, buffer_{};
};

} // namespace atom
