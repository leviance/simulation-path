#pragma once

#include "geometry_gl.hpp"

#include <algorithm>
#include <cstdint>
#include <memory>
#include <vector>

namespace geometry {

// Own the SDL window and GL context so a failed setup releases both.
class NativeWindow {
    public:
    explicit NativeWindow(bool hidden) {
        if (!SDL_Init(SDL_INIT_VIDEO))
            throw std::runtime_error(SDL_GetError());
        try {
            setAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
            setAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
            setAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
            setAttribute(SDL_GL_DEPTH_SIZE, 24);
            setAttribute(SDL_GL_DOUBLEBUFFER, 1);
            SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
            if (hidden)
                flags |= SDL_WINDOW_HIDDEN;
            window_ = SDL_CreateWindow("Project 41 - Geometry Workshop", 1200, 800, flags);
            if (!window_)
                throw std::runtime_error(SDL_GetError());
            context_ = SDL_GL_CreateContext(window_);
            if (!context_)
                throw std::runtime_error(SDL_GetError());
            SDL_SetWindowMinimumSize(window_, 740, 600);
            if (hidden)
                SDL_GL_SetSwapInterval(0);
            else
                vsync_ = SDL_GL_SetSwapInterval(1);
        } catch (...) {
            release();
            throw;
        }
    }

    ~NativeWindow() {
        release();
    }

    NativeWindow(const NativeWindow&) = delete;
    NativeWindow& operator=(const NativeWindow&) = delete;

    SDL_Window* window() const {
        return window_;
    }

    bool vsync() const {
        return vsync_;
    }

    private:
    static void setAttribute(SDL_GLAttr attribute, int value) {
        if (!SDL_GL_SetAttribute(attribute, value))
            throw std::runtime_error(SDL_GetError());
    }

    void release() {
        if (context_)
            SDL_GL_DestroyContext(context_);
        if (window_)
            SDL_DestroyWindow(window_);
        SDL_Quit();
    }

    SDL_Window* window_{};
    SDL_GLContext context_{};
    bool vsync_{};
};

inline void validateGlContext(GlApi& gl) {
    GLint major{};
    GLint minor{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &major);
    gl.GetIntegerv(GL_MINOR_VERSION, &minor);
    if (major < 3 || (major == 3 && minor < 3))
        throw std::runtime_error("Geometry Workshop requires OpenGL 3.3");
}

inline void captureFrame(GlApi& gl, int width, int height, const std::string& path) {
    if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
        throw std::runtime_error("Capture dimensions exceed 4096 x 4096");
    }
    if (std::filesystem::exists(pathFromUtf8(path))) {
        throw std::runtime_error("Capture path already exists");
    }
    const std::size_t stride = static_cast<std::size_t>(width) * 4;
    std::vector<std::uint8_t> pixels(stride * static_cast<std::size_t>(height));
    gl.PixelStorei(GL_PACK_ALIGNMENT, 1);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    gl.PixelStorei(GL_PACK_ALIGNMENT, 4);
    if (gl.GetError() != GL_NO_ERROR)
        throw std::runtime_error("OpenGL frame read-back failed");
    for (int row = 0; row < height / 2; ++row) {
        auto* top = pixels.data() + static_cast<std::size_t>(row) * stride;
        auto* bottom = pixels.data() + static_cast<std::size_t>(height - 1 - row) * stride;
        std::swap_ranges(top, top + stride, bottom);
    }
    std::unique_ptr<SDL_Surface, decltype(&SDL_DestroySurface)> surface(
        SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), width * 4), SDL_DestroySurface
    );
    if (!surface || !SDL_SaveBMP(surface.get(), path.c_str()))
        throw std::runtime_error(SDL_GetError());
}

} // namespace geometry
