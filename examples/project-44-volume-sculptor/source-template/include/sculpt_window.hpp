#pragma once

#include "sculpt_gl.hpp"
#include <chrono>
#include <thread>
#include <vector>

namespace sculpt {

// SDL and the GL context must outlive all dependent GPU objects.
// Constructor failures unwind acquired window/context resources before SDL_Quit.
class NativeWindow {
    public:
    explicit NativeWindow(bool hidden) {
        if (!SDL_Init(SDL_INIT_VIDEO))
            throw std::runtime_error(SDL_GetError());
        try {
            attribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
            attribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
            attribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
            attribute(SDL_GL_DEPTH_SIZE, 24);
            attribute(SDL_GL_DOUBLEBUFFER, 1);
            SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
            if (hidden)
                flags |= SDL_WINDOW_HIDDEN;
            window_ = SDL_CreateWindow("Project 44 - Volume Sculptor", 1280, 820, flags);
            if (!window_)
                throw std::runtime_error(SDL_GetError());
            context_ = SDL_GL_CreateContext(window_);
            if (!context_)
                throw std::runtime_error(SDL_GetError());
            SDL_SetWindowMinimumSize(window_, 880, 680);
            int interval = 1;
            if (hidden)
                interval = 0;
            vsync_ = SDL_GL_SetSwapInterval(interval);
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

    SDL_Window* get() const {
        return window_;
    }

    bool vsync() const {
        return vsync_;
    }

    private:
    static void attribute(SDL_GLAttr name, int value) {
        if (!SDL_GL_SetAttribute(name, value))
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

inline void captureFrame(GlApi& gl, int width, int height, const std::filesystem::path& path) {
    if (width <= 0 || height <= 0 || width > 4096 || height > 4096 || std::filesystem::exists(path))
        throw std::invalid_argument("Capture needs a new path and dimensions no larger than 4096");
    std::vector<std::uint8_t> pixels(static_cast<std::size_t>(width) * height * 4);
    gl.PixelStorei(GL_PACK_ALIGNMENT, 1);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    gl.PixelStorei(GL_PACK_ALIGNMENT, 4);
    if (gl.GetError() != GL_NO_ERROR)
        throw std::runtime_error("Could not read the rendered frame");
    const std::size_t stride = static_cast<std::size_t>(width) * 4;
    for (int row = 0; row < height / 2; ++row) {
        const auto first = pixels.begin() + static_cast<std::ptrdiff_t>(row * stride);
        const auto last = pixels.begin() + static_cast<std::ptrdiff_t>((row + 1) * stride);
        const auto opposite = pixels.begin() + static_cast<std::ptrdiff_t>((height - 1 - row) * stride);
        std::swap_ranges(first, last, opposite);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), width * 4);
    if (!surface)
        throw std::runtime_error(SDL_GetError());
    const bool saved = SDL_SaveBMP(surface, path.string().c_str());
    SDL_DestroySurface(surface);
    if (!saved)
        throw std::runtime_error(SDL_GetError());
}

} // namespace sculpt
