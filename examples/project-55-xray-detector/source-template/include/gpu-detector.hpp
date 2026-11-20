#pragma once
#include "detector.hpp"

#if LAB_CHECKPOINT >= 9
#include "gl-support/program.hpp"
#include <iostream>

namespace xray {
// The SDL renderer may own a different context (or none when using Direct3D).
// Restore it before drawing any of the labels, housing or detector overlay.
struct RestoreContext {
    SDL_Window* window = SDL_GL_GetCurrentWindow();
    SDL_GLContext context = SDL_GL_GetCurrentContext();
    ~RestoreContext() {
        SDL_GL_MakeCurrent(window, context);
    }
};

struct GpuDetector {
    SDL_Window* window = nullptr;
    SDL_GLContext context = nullptr;
    volume54::GlApi gl;
    GLuint program = 0, framebuffer = 0, target = 0, triangle = 0;
    std::array<float, imageWidth * imageHeight> raw{};

    GpuDetector() = default;
    GpuDetector(const GpuDetector&) = delete;
    GpuDetector& operator=(const GpuDetector&) = delete;

    void open() {
        RestoreContext restore;
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE))
            throw std::runtime_error(SDL_GetError());
        window = SDL_CreateWindow("detector integration", imageWidth, imageHeight, SDL_WINDOW_OPENGL | SDL_WINDOW_HIDDEN);
        if (!window) throw std::runtime_error(SDL_GetError());
        context = SDL_GL_CreateContext(window);
        if (!context || !SDL_GL_MakeCurrent(window, context)) throw std::runtime_error(SDL_GetError());
        gl.load();
        program = volume54::loadProgram(gl, volume54::shaderDirectory("attenuation.frag"), "attenuation.frag");
        gl.GenVertexArrays(1, &triangle);
        gl.GenTextures(1, &target);
        gl.BindTexture(GL_TEXTURE_2D, target);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        gl.TexImage2D(GL_TEXTURE_2D, 0, GL_R32F, imageWidth, imageHeight, 0, GL_RED, GL_FLOAT, nullptr);
        gl.GenFramebuffers(1, &framebuffer);
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, target, 0);
        if (gl.CheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
            throw std::runtime_error("Detector R32F framebuffer is incomplete");
        }
    }

    GLint location(const std::string& name) {
        return volume54::uniform(gl, program, name.c_str());
    }

    void integrate(const Scene& scene, Settings settings) {
        validate(settings);
        validateScene(scene);
        RestoreContext restore;
        if (!SDL_GL_MakeCurrent(window, context)) throw std::runtime_error(SDL_GetError());
        gl.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl.Viewport(0, 0, imageWidth, imageHeight);
        gl.UseProgram(program);
        gl.Uniform2f(location("uSize"), imageWidth, imageHeight);
        gl.Uniform1i(location("uCount"), static_cast<GLint>(scene.size()));
        gl.Uniform1f(location("uAngle"), static_cast<float>(settings.angle));
        gl.Uniform1f(location("uStrength"), static_cast<float>(settings.strength));
        gl.Uniform1f(location("uStep"), static_cast<float>(settings.stepLength));
        gl.Uniform1f(location("uLowWeight"), static_cast<float>(settings.lowWeight));
        gl.Uniform1i(location("uMidpoint"), static_cast<int>(settings.numeric));
        gl.Uniform1i(location("uSpectral"), static_cast<int>(settings.spectral));
        for (size_t i = 0; i < scene.size(); ++i) {
            const auto& region = scene[i];
            const auto suffix = "[" + std::to_string(i) + "]";
            const auto setPoint = [&](const std::string& key, Point p) {
                gl.Uniform3f(location(key + suffix), static_cast<float>(p[0]), static_cast<float>(p[1]), static_cast<float>(p[2]));
            };
            setPoint("uMin", region.minimum);
            setPoint("uMax", region.maximum);
            gl.Uniform2f(location("uMu" + suffix), static_cast<float>(region.muLow), static_cast<float>(region.muHigh));
        }
        // [snippet read-detector]
        gl.BindVertexArray(triangle);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
        gl.ReadPixels(0, 0, imageWidth, imageHeight, GL_RED, GL_FLOAT, raw.data());
        // [/snippet read-detector]
        if (gl.GetError() != GL_NO_ERROR) throw std::runtime_error("Detector GPU draw or readback failed");
    }

    Image display(Settings settings) const {
        Image result;
        for (size_t i = 0; i < raw.size(); ++i) {
            double value = raw[i];
            if (!std::isfinite(value)) throw std::runtime_error("Non-finite GPU transmission");
            if (settings.logView) value = -std::log(std::max(value, 1e-12)) / settings.logRange;
            value = std::clamp(value, 0.0, 1.0);
            if (settings.invert) value = 1 - value;
            const auto gray = static_cast<std::uint8_t>(std::lround(255 * value));
            for (int c = 0; c < 3; ++c) result.rgba[4 * i + c] = gray;
            result.rgba[4 * i + 3] = 255;
        }
        return result;
    }

    ~GpuDetector() {
        if (context) {
            RestoreContext restore;
            if (SDL_GL_MakeCurrent(window, context)) {
                if (program) gl.DeleteProgram(program);
                if (triangle) gl.DeleteVertexArrays(1, &triangle);
                if (framebuffer) gl.DeleteFramebuffers(1, &framebuffer);
                if (target) gl.DeleteTextures(1, &target);
            }
            SDL_GL_DestroyContext(context);
        }
        SDL_DestroyWindow(window);
    }
};
#endif
#if LAB_CHECKPOINT >= 10
// [snippet compare-raw]
inline double detectorError(const GpuDetector& gpu, const Scene& scene, Settings settings) {
    double worst = 0;
    for (int y = 0; y < imageHeight; y += 5) {
        for (int x = 0; x < imageWidth; x += 5) {
            const auto ray = detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight);
            const double expected = measure(ray, scene, settings).ratio;
            worst = std::max(worst, std::abs(gpu.raw[x + imageWidth * y] - expected));
        }
    }
    return worst;
}
// [/snippet compare-raw]
#endif
#if LAB_CHECKPOINT >= 9
} // namespace xray
#endif
