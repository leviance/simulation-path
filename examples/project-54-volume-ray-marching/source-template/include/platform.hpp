#pragma once
#include "program.hpp"
#include <algorithm>
#include <iostream>
#include <vector>

namespace volume54 {
// Construct first, then open: partial SDL/GL initialization is still cleaned up.
struct Platform {
    SDL_Window* window = nullptr;
    SDL_GLContext context = nullptr;
    GlApi gl;

    // [snippet open-context]
    void open(bool hidden) {
        if (!SDL_Init(SDL_INIT_VIDEO))
            throw std::runtime_error(SDL_GetError());
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3))
            throw std::runtime_error(SDL_GetError());
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3))
            throw std::runtime_error(SDL_GetError());
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE))
            throw std::runtime_error(SDL_GetError());
        if (!SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1))
            throw std::runtime_error(SDL_GetError());
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (hidden)
            flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("Project 54 | Volume Lightbox", 1320, 900, flags);
        if (!window)
            throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window, 960, 760);
        context = SDL_GL_CreateContext(window);
        if (!context)
            throw std::runtime_error(SDL_GetError());
        gl.load();
        SDL_GL_SetSwapInterval(1);
    }

    // [/snippet open-context]

    void capabilities() {
        GLint major = 0;
        GLint minor = 0;
        GLint maximum3D = 0;
        gl.GetIntegerv(GL_MAJOR_VERSION, &major);
        gl.GetIntegerv(GL_MINOR_VERSION, &minor);
        gl.GetIntegerv(GL_MAX_3D_TEXTURE_SIZE, &maximum3D);
        if (major < 3 || (major == 3 && minor < 3) || maximum3D < 128)
            throw std::runtime_error("OpenGL 3.3 core and 128^3 textures required");
        std::cout << "GL: " << gl.GetString(GL_VERSION) << " | " << gl.GetString(GL_RENDERER) << " | max3D=" << maximum3D << '\n';
    }

    void capture(const std::string& file, int width, int height) {
        if (width < 1 || height < 1 || static_cast<std::size_t>(width) * height > 4194304)
            throw std::runtime_error("Capture limit: 4 Mi pixels");
        const std::size_t rowBytes = static_cast<std::size_t>(width) * 4;
        std::vector<std::uint8_t> pixels(rowBytes * height);
        gl.PixelStorei(GL_PACK_ALIGNMENT, 1);
        gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
        gl.PixelStorei(GL_PACK_ALIGNMENT, 4);
        if (gl.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Screenshot readback failed");
        for (int row = 0; row < height / 2; ++row) {
            auto first = pixels.begin() + static_cast<std::ptrdiff_t>(row * rowBytes);
            auto last = pixels.begin() + static_cast<std::ptrdiff_t>((height - 1 - row) * rowBytes);
            std::swap_ranges(first, first + static_cast<std::ptrdiff_t>(rowBytes), last);
        }
        SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), static_cast<int>(rowBytes));
        if (!surface)
            throw std::runtime_error(SDL_GetError());
        const bool saved = SDL_SaveBMP(surface, file.c_str());
        SDL_DestroySurface(surface);
        if (!saved)
            throw std::runtime_error(SDL_GetError());
    }

    ~Platform() {
        if (context)
            SDL_GL_DestroyContext(context);
        if (window)
            SDL_DestroyWindow(window);
        SDL_Quit();
    }
};
} // namespace volume54
