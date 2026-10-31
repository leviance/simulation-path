#pragma once
#include "chamber_math.hpp"
#include "chamber_program.hpp"

#if LAB_CHECKPOINT >= 12
namespace chamber {

// Presentation scaffold. It only samples rendered color; it never reads or writes particle SSBOs.
struct PostTargets {
    GLuint sceneFbo{}, sceneColor{}, sceneDepth{};
    std::array<GLuint, 2> blurFbo{}, blurColor{};
    int width{}, height{}, blurWidth{}, blurHeight{};

    void destroy(GlApi& gl) {
        if (sceneFbo)
            gl.DeleteFramebuffers(1, &sceneFbo);
        if (sceneColor)
            gl.DeleteTextures(1, &sceneColor);
        if (sceneDepth)
            gl.DeleteTextures(1, &sceneDepth);
        gl.DeleteFramebuffers(2, blurFbo.data());
        gl.DeleteTextures(2, blurColor.data());
        *this = {};
    }
};

class PostProcessor {
    PostTargets targets_{};
    GLuint array_{}, extract_{}, blur_{}, combine_{};

    static void texture(GlApi& gl, GLuint& name, int width, int height, bool depth) {
        gl.GenTextures(1, &name);
        gl.BindTexture(GL_TEXTURE_2D, name);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        if (depth)
            gl.TexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH_COMPONENT24, width, height, 0, GL_DEPTH_COMPONENT, GL_UNSIGNED_INT, nullptr);
        else
            gl.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, width, height, 0, GL_RGBA, GL_HALF_FLOAT, nullptr);
    }

    bool target(GlApi& gl, GLuint& framebuffer, GLuint color, GLuint depth) {
        gl.GenFramebuffers(1, &framebuffer);
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, color, 0);
        if (depth)
            gl.FramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_TEXTURE_2D, depth, 0);
        return gl.CheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE;
    }

    void fullscreen(GlApi& gl, GLuint program, GLuint input, GLuint framebuffer, int width, int height) {
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.Viewport(0, 0, width, height);
        gl.UseProgram(program);
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_2D, input);
        gl.Uniform1i(gl.GetUniformLocation(program, "uSource"), 0);
        gl.BindVertexArray(array_);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
    }

    public:
    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        extract_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "post.vert"}, {GL_FRAGMENT_SHADER, directory / "post_extract.frag"}}, error);
        if (!extract_)
            return false;
        blur_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "post.vert"}, {GL_FRAGMENT_SHADER, directory / "post_blur.frag"}}, error);
        if (!blur_)
            return false;
        combine_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "post.vert"}, {GL_FRAGMENT_SHADER, directory / "post_combine.frag"}}, error);
        if (!combine_)
            return false;
        gl.GenVertexArrays(1, &array_);
        return gl.GetError() == GL_NO_ERROR;
    }

    bool resize(GlApi& gl, int requestedWidth, int requestedHeight, std::string& error) {
        if (requestedWidth < 1 || requestedHeight < 1)
            return false;
        float scale = std::min(1.0F, std::min(2048.0F / requestedWidth, 1152.0F / requestedHeight));
        const int width = std::max(1, static_cast<int>(requestedWidth * scale));
        const int height = std::max(1, static_cast<int>(requestedHeight * scale));
        if (targets_.width == width && targets_.height == height)
            return true;
        GLint limit = 0;
        gl.GetIntegerv(GL_MAX_TEXTURE_SIZE, &limit);
        if (width > limit || height > limit) {
            error = "Render target exceeds hardware texture size";
            return false;
        }
        PostTargets candidate{};
        candidate.width = width;
        candidate.height = height;
        candidate.blurWidth = std::max(1, (width + 3) / 4);
        candidate.blurHeight = std::max(1, (height + 3) / 4);
        const std::size_t bytes = static_cast<std::size_t>(width) * height * 12U + static_cast<std::size_t>(candidate.blurWidth) * candidate.blurHeight * 16U;
        if (bytes > 32U * 1024U * 1024U) {
            error = "Render target exceeds the declared 32 MiB cap";
            return false;
        }
        gl.ActiveTexture(GL_TEXTURE0);
        texture(gl, candidate.sceneColor, width, height, false);
        texture(gl, candidate.sceneDepth, width, height, true);
        bool valid = target(gl, candidate.sceneFbo, candidate.sceneColor, candidate.sceneDepth);
        for (std::size_t slot = 0; slot < 2; ++slot) {
            texture(gl, candidate.blurColor[slot], candidate.blurWidth, candidate.blurHeight, false);
            valid = target(gl, candidate.blurFbo[slot], candidate.blurColor[slot], 0) && valid;
        }
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        if (!valid || gl.GetError() != GL_NO_ERROR) {
            candidate.destroy(gl);
            error = "Post-processing allocation failed; particle state is intact";
            return false;
        }
        targets_.destroy(gl);
        targets_ = candidate;
        return true;
    }

    float scale(int destinationWidth) const {
        return static_cast<float>(targets_.width) / destinationWidth;
    }

    int width() const {
        return targets_.width;
    }

    int height() const {
        return targets_.height;
    }

    void begin(GlApi& gl) {
        gl.BindFramebuffer(GL_FRAMEBUFFER, targets_.sceneFbo);
        gl.Viewport(0, 0, targets_.width, targets_.height);
        gl.Enable(GL_DEPTH_TEST);
        gl.DepthMask(GL_TRUE);
        gl.ClearColor(0.0025F, 0.004F, 0.007F, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    }

    void end(GlApi& gl, int destinationWidth, int destinationHeight) {
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_BLEND);
        fullscreen(gl, extract_, targets_.sceneColor, targets_.blurFbo[0], targets_.blurWidth, targets_.blurHeight);
        int source = 0;
        for (int pass = 0; pass < 4; ++pass) {
            const int destination = 1 - source;
            gl.UseProgram(blur_);
            if (pass % 2 == 0)
                gl.Uniform2f(gl.GetUniformLocation(blur_, "uDirection"), 1.0F / targets_.blurWidth, 0);
            else
                gl.Uniform2f(gl.GetUniformLocation(blur_, "uDirection"), 0, 1.0F / targets_.blurHeight);
            fullscreen(gl, blur_, targets_.blurColor[static_cast<std::size_t>(source)], targets_.blurFbo[static_cast<std::size_t>(destination)], targets_.blurWidth, targets_.blurHeight);
            source = destination;
        }
        gl.UseProgram(combine_);
        gl.ActiveTexture(GL_TEXTURE1);
        gl.BindTexture(GL_TEXTURE_2D, targets_.blurColor[static_cast<std::size_t>(source)]);
        gl.Uniform1i(gl.GetUniformLocation(combine_, "uBloom"), 1);
        fullscreen(gl, combine_, targets_.sceneColor, 0, destinationWidth, destinationHeight);
        gl.ActiveTexture(GL_TEXTURE0);
        gl.Enable(GL_DEPTH_TEST);
    }

    void destroy(GlApi& gl) {
        targets_.destroy(gl);
        for (GLuint* program : {&extract_, &blur_, &combine_}) {
            if (*program)
                gl.DeleteProgram(*program);
            *program = 0;
        }
        if (array_)
            gl.DeleteVertexArrays(1, &array_);
        array_ = 0;
    }
};

} // namespace chamber
#endif
