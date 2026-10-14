#pragma once
#include "program.hpp"
#include "reference.hpp"

namespace fog {
// Render at a fixed small resolution. Resizing the window never multiplies ray work.
struct Renderer {
    GLuint program = 0;
    GLuint present = 0;
    GLuint vao = 0;
    GLuint framebuffer = 0;
    GLuint resultTexture = 0;
    GLuint densityTexture = 0;
    int width = 240;
    int height = 180;

    void dispose(GlApi& gl) {
        if (program) {
            gl.DeleteProgram(program);
        }
        if (present) {
            gl.DeleteProgram(present);
        }
        if (vao) {
            gl.DeleteVertexArrays(1, &vao);
        }
        if (framebuffer) {
            gl.DeleteFramebuffers(1, &framebuffer);
        }
        if (resultTexture) {
            gl.DeleteTextures(1, &resultTexture);
        }
        if (densityTexture) {
            gl.DeleteTextures(1, &densityTexture);
        }
    }

#if LAB_CHECKPOINT >= 1
    void initialize(GlApi& gl, bool verify) {
        if (verify) {
            width = 16;
            height = 12;
        }
        program = loadProgram(gl, shaderDirectory(), "volume.frag");
        present = loadProgram(gl, shaderDirectory(), "present.frag");
        gl.GenVertexArrays(1, &vao);
        gl.GenTextures(1, &resultTexture);
        gl.BindTexture(GL_TEXTURE_2D, resultTexture);
        gl.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, GL_RGBA, GL_FLOAT, nullptr);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl.GenFramebuffers(1, &framebuffer);
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, resultTexture, 0);
        if (gl.CheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
            throw std::runtime_error("Incomplete RGBA32F framebuffer");
        }
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_BLEND);
        gl.Disable(GL_FRAMEBUFFER_SRGB);
    }
#endif

#if LAB_CHECKPOINT >= 4
    void upload(GlApi& gl, const Volume& volume) {
        GLint maximum = 0;
        gl.GetIntegerv(GL_MAX_3D_TEXTURE_SIZE, &maximum);
        if (maximum < 64) {
            throw std::runtime_error("3D texture size unsupported");
        }
        if (!densityTexture) {
            gl.GenTextures(1, &densityTexture);
        }
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_3D, densityTexture);
        gl.PixelStorei(GL_UNPACK_ALIGNMENT, 1);
        gl.TexImage3D(GL_TEXTURE_3D, 0, GL_R32F, 64, 48, 40, 0, GL_RED, GL_FLOAT, volume.density.data());
        gl.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);
        gl.PixelStorei(GL_UNPACK_ALIGNMENT, 4);
        if (gl.GetError() != GL_NO_ERROR) {
            throw std::runtime_error("3D texture upload failed");
        }
    }
#endif

#if LAB_CHECKPOINT >= 1
    void render(GlApi& gl, [[maybe_unused]] Camera camera, [[maybe_unused]] Settings settings) {
        validate(settings);
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.Viewport(0, 0, width, height);
        gl.UseProgram(program);
        gl.Uniform2f(uniform(gl, program, "uSize"), static_cast<float>(width), static_cast<float>(height));
#if LAB_CHECKPOINT >= 2
        const auto basis = cameraBasis(camera);
        for (const auto& [name, value] : {std::pair{"uForward", basis.forward}, std::pair{"uRight", basis.right}, std::pair{"uUp", basis.up}}) {
            gl.Uniform3f(uniform(gl, program, name), static_cast<float>(value[0]), static_cast<float>(value[1]), static_cast<float>(value[2]));
        }
#endif
#if LAB_CHECKPOINT >= 3
        gl.Uniform3f(uniform(gl, program, "uOrigin"), static_cast<float>(basis.origin[0]), static_cast<float>(basis.origin[1]), static_cast<float>(basis.origin[2]));
#endif
#if LAB_CHECKPOINT >= 4
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_3D, densityTexture);
        gl.Uniform1i(uniform(gl, program, "uDensity"), 0);
#endif
#if LAB_CHECKPOINT >= 5
        gl.Uniform1f(uniform(gl, program, "uSigma"), static_cast<float>(settings.sigma));
#endif
#if LAB_CHECKPOINT >= 6
        gl.Uniform1f(uniform(gl, program, "uStep"), static_cast<float>(settings.stepLength));
#endif
#if LAB_CHECKPOINT >= 7
        gl.Uniform1i(uniform(gl, program, "uWarm"), static_cast<int>(settings.warm));
#endif
#if LAB_CHECKPOINT >= 8
        gl.Uniform1i(uniform(gl, program, "uEarly"), static_cast<int>(settings.early));
#endif
        gl.BindVertexArray(vao);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
    }

    void display(GlApi& gl, int framebufferWidth, int framebufferHeight) {
        const double scale = std::min(static_cast<double>(framebufferWidth) / width, static_cast<double>(framebufferHeight) / height);
        const int w = static_cast<int>(width * scale);
        const int h = static_cast<int>(height * scale);
        const int x = (framebufferWidth - w) / 2;
        const int y = (framebufferHeight - h) / 2;
        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(0.01F, 0.015F, 0.025F, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT);
        gl.Viewport(x, y, w, h);
        gl.UseProgram(present);
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_2D, resultTexture);
        gl.Uniform1i(uniform(gl, present, "uResult"), 0);
        gl.Uniform2f(uniform(gl, present, "uDisplaySize"), static_cast<float>(w), static_cast<float>(h));
        gl.Uniform2f(uniform(gl, present, "uOffset"), static_cast<float>(x), static_cast<float>(y));
        gl.BindVertexArray(vao);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
    }
#endif
};
} // namespace fog
