#pragma once
#include "program.hpp"
#include "reference.hpp"
#include <cstdint>

namespace volume54 {
// GL wrapper is a scaffold. Integration itself remains visible in volume.frag.
class Renderer {
    GlApi& gl_;
    GLuint program_ = 0;
    GLuint present_ = 0;
    GLuint vao_ = 0;
    GLuint framebuffer_ = 0;
    GLuint resultTexture_ = 0;
    GLuint densityTexture_ = 0;
    float spacing_ = 0;
    GLuint query_ = 0;
    bool queryPending_ = false;
    Uint64 queryStarted_ = 0;

    public:
    int width = 0;
    int height = 0;
    double gpuMilliseconds = 0;

    explicit Renderer(GlApi& gl)
        : gl_(gl) {}

    Renderer(const Renderer&) = delete;
    Renderer& operator=(const Renderer&) = delete;

    void open() {
#if LAB_CHECKPOINT >= 1
        program_ = loadProgram(gl_, shaderDirectory(), "volume.frag");
        present_ = loadProgram(gl_, shaderDirectory(), "present.frag");
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenQueries(1, &query_);
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Disable(GL_BLEND);
        gl_.Disable(GL_FRAMEBUFFER_SRGB);
#endif
    }

#if LAB_CHECKPOINT >= 1
    // [snippet resize-target]
    void resize(int requestedWidth, int requestedHeight) {
        if (requestedWidth < 1 || requestedHeight < 1)
            throw std::invalid_argument("Positive target dimensions required");
        GLint maximum = 0;
        gl_.GetIntegerv(GL_MAX_TEXTURE_SIZE, &maximum);
        double scale = std::min(1.0, 4096.0 / std::max(requestedWidth, requestedHeight));
        scale = std::min(scale, static_cast<double>(maximum) / std::max(requestedWidth, requestedHeight));
        const double pixels = static_cast<double>(requestedWidth) * requestedHeight;
        scale = std::min(scale, std::sqrt(4194304.0 / pixels));
        const int newWidth = std::max(1, static_cast<int>(requestedWidth * scale));
        const int newHeight = std::max(1, static_cast<int>(requestedHeight * scale));
        if (newWidth == width && newHeight == height)
            return;
        GLuint texture = 0;
        GLuint framebuffer = 0;
        gl_.GenTextures(1, &texture);
        gl_.BindTexture(GL_TEXTURE_2D, texture);
        gl_.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, newWidth, newHeight, 0, GL_RGBA, GL_FLOAT, nullptr);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl_.GenFramebuffers(1, &framebuffer);
        gl_.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl_.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
        const bool complete = gl_.CheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE;
        const GLenum error = gl_.GetError();
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        if (!complete || error != GL_NO_ERROR) {
            gl_.DeleteFramebuffers(1, &framebuffer);
            gl_.DeleteTextures(1, &texture);
            throw std::runtime_error("RGBA32F target allocation failed; previous target retained");
        }
        if (framebuffer_)
            gl_.DeleteFramebuffers(1, &framebuffer_);
        if (resultTexture_)
            gl_.DeleteTextures(1, &resultTexture_);
        framebuffer_ = framebuffer;
        resultTexture_ = texture;
        width = newWidth;
        height = newHeight;
    }

    // [/snippet resize-target]
#endif

#if LAB_CHECKPOINT >= 4
    // [snippet upload-volume]
    void upload(const Volume& volume) {
        GLint maximum = 0;
        gl_.GetIntegerv(GL_MAX_3D_TEXTURE_SIZE, &maximum);
        if (volume.side() > maximum)
            throw std::runtime_error("3D texture exceeds hardware limit");
        GLuint texture = 0;
        gl_.GenTextures(1, &texture);
        gl_.ActiveTexture(GL_TEXTURE0);
        gl_.BindTexture(GL_TEXTURE_3D, texture);
        gl_.PixelStorei(GL_UNPACK_ALIGNMENT, 1);
        const int side = volume.side();
        gl_.TexImage3D(GL_TEXTURE_3D, 0, GL_R32F, side, side, side, 0, GL_RED, GL_FLOAT, volume.values().data());
        gl_.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl_.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl_.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);
        gl_.PixelStorei(GL_UNPACK_ALIGNMENT, 4);
        if (gl_.GetError() != GL_NO_ERROR) {
            gl_.DeleteTextures(1, &texture);
            throw std::runtime_error("Volume upload failed; previous texture retained");
        }
        if (densityTexture_)
            gl_.DeleteTextures(1, &densityTexture_);
        densityTexture_ = texture;
        spacing_ = static_cast<float>(volume.spacing());
    }

    // [/snippet upload-volume]
#endif

#if LAB_CHECKPOINT >= 1
    void render([[maybe_unused]] Camera camera, Settings settings, bool timed = false) {
        validate(settings);
        if (!framebuffer_)
            throw std::runtime_error("Resize target before rendering");
        gl_.BindFramebuffer(GL_FRAMEBUFFER, framebuffer_);
        gl_.Viewport(0, 0, width, height);
        gl_.Disable(GL_BLEND);
        gl_.UseProgram(program_);
        gl_.Uniform2f(uniform(gl_, program_, "uSize"), static_cast<float>(width), static_cast<float>(height));
#if LAB_CHECKPOINT >= 2
        setBasis(program_, camera, false);
#endif
#if LAB_CHECKPOINT >= 3
        const Vec3 origin = cameraBasis(camera).origin;
        gl_.Uniform3f(uniform(gl_, program_, "uOrigin"), static_cast<float>(origin.x), static_cast<float>(origin.y), static_cast<float>(origin.z));
#endif
#if LAB_CHECKPOINT >= 4
        gl_.ActiveTexture(GL_TEXTURE0);
        gl_.BindTexture(GL_TEXTURE_3D, densityTexture_);
        gl_.Uniform1i(uniform(gl_, program_, "uDensity"), 0);
#endif
#if LAB_CHECKPOINT >= 5
        // [snippet projection-uniforms]
        gl_.Uniform1i(uniform(gl_, program_, "uMode"), static_cast<int>(settings.mode));
        gl_.Uniform1f(uniform(gl_, program_, "uStep"), static_cast<float>(settings.stepLength));
        // [/snippet projection-uniforms]
#endif
#if LAB_CHECKPOINT >= 6
        gl_.Uniform1f(uniform(gl_, program_, "uSigma"), static_cast<float>(settings.sigma));
#endif
#if LAB_CHECKPOINT >= 7
        gl_.Uniform1i(uniform(gl_, program_, "uPalette"), settings.palette);
        gl_.Uniform1f(uniform(gl_, program_, "uCutoff"), static_cast<float>(settings.cutoff));
        gl_.Uniform1i(uniform(gl_, program_, "uLighting"), static_cast<int>(settings.lighting));
        gl_.Uniform1f(uniform(gl_, program_, "uSpacing"), spacing_);
#endif
#if LAB_CHECKPOINT >= 9
        gl_.Uniform1i(uniform(gl_, program_, "uEarly"), static_cast<int>(settings.early));
#endif
        bool measure = timed && !queryPending_;
        if (measure)
            gl_.BeginQuery(GL_TIME_ELAPSED, query_);
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
        if (measure) {
            gl_.EndQuery(GL_TIME_ELAPSED);
            queryPending_ = true;
            queryStarted_ = SDL_GetTicks();
        }
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
    }

    // [snippet poll-timer]
    bool pollGpu() {
        if (!queryPending_)
            return false;
        GLint available = 0;
        gl_.GetQueryObjectiv(query_, GL_QUERY_RESULT_AVAILABLE, &available);
        if (!available) {
            if (SDL_GetTicks() - queryStarted_ > 3000)
                throw std::runtime_error("GPU timer wait exceeded 3 seconds");
            return false;
        }
        GLuint64 nanoseconds = 0;
        gl_.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &nanoseconds);
        gpuMilliseconds = static_cast<double>(nanoseconds) / 1e6;
        queryPending_ = false;
        return true;
    }

    // [/snippet poll-timer]

    void display([[maybe_unused]] Camera camera, [[maybe_unused]] Settings settings, int viewWidth, int viewHeight, int left = 0, int bottom = 0) {
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl_.Viewport(left, bottom, viewWidth, viewHeight);
        gl_.UseProgram(present_);
        gl_.ActiveTexture(GL_TEXTURE0);
        gl_.BindTexture(GL_TEXTURE_2D, resultTexture_);
        gl_.Uniform1i(uniform(gl_, present_, "uResult"), 0);
        gl_.Uniform2f(uniform(gl_, present_, "uSize"), static_cast<float>(viewWidth), static_cast<float>(viewHeight));
        gl_.Uniform2f(uniform(gl_, present_, "uOffset"), static_cast<float>(left), static_cast<float>(bottom));
#if LAB_CHECKPOINT >= 5
        setBasis(present_, camera, true);
#endif
#if LAB_CHECKPOINT >= 6
        gl_.Uniform1i(uniform(gl_, present_, "uMode"), static_cast<int>(settings.mode));
#endif
#if LAB_CHECKPOINT >= 7
        gl_.Uniform1i(uniform(gl_, present_, "uPalette"), settings.palette);
#endif
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
    }

    std::vector<float> read() {
        std::vector<float> image(static_cast<std::size_t>(width) * height * 4);
        gl_.BindFramebuffer(GL_FRAMEBUFFER, framebuffer_);
        gl_.ReadPixels(0, 0, width, height, GL_RGBA, GL_FLOAT, image.data());
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Raw image readback failed");
        return image;
    }
#endif

#if LAB_CHECKPOINT >= 2
    void setBasis(GLuint program, Camera camera, bool originRequired) {
        const Basis basis = cameraBasis(camera);
        for (const auto& [name, value] : {std::pair{"uForward", basis.forward}, std::pair{"uRight", basis.right}, std::pair{"uUp", basis.up}})
            gl_.Uniform3f(uniform(gl_, program, name), static_cast<float>(value.x), static_cast<float>(value.y), static_cast<float>(value.z));
        if (originRequired)
            gl_.Uniform3f(uniform(gl_, program, "uOrigin"), static_cast<float>(basis.origin.x), static_cast<float>(basis.origin.y), static_cast<float>(basis.origin.z));
    }
#endif

    ~Renderer() {
        if (program_)
            gl_.DeleteProgram(program_);
        if (present_)
            gl_.DeleteProgram(present_);
        if (vao_)
            gl_.DeleteVertexArrays(1, &vao_);
        if (framebuffer_)
            gl_.DeleteFramebuffers(1, &framebuffer_);
        if (resultTexture_)
            gl_.DeleteTextures(1, &resultTexture_);
        if (densityTexture_)
            gl_.DeleteTextures(1, &densityTexture_);
        if (query_)
            gl_.DeleteQueries(1, &query_);
    }
};
} // namespace volume54
