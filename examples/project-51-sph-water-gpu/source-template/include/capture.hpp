#pragma once
#include "gl_api.hpp"
#include <algorithm>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>

namespace water3 {
// OpenGL đọc từ dưới lên; SDL surface lưu dòng đầu ở trên. Không đổi physics.
inline void captureFrame(lab::GlApi& gl, int width, int height, const std::string& filename) {
    if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
        throw std::runtime_error("Capture dimensions exceed bounded image allocation");
    }
    const auto rowBytes = static_cast<std::size_t>(width) * 4;
    std::vector<std::uint8_t> pixels(rowBytes * height), topDown(pixels.size());
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    if (gl.GetError() != GL_NO_ERROR)
        throw std::runtime_error("OpenGL capture failed");
    for (int row = 0; row < height; ++row) {
        std::copy_n(pixels.data() + (height - 1 - row) * rowBytes, rowBytes, topDown.data() + row * rowBytes);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, topDown.data(), width * 4);
    if (!surface)
        throw std::runtime_error(SDL_GetError());
    if (!SDL_SaveBMP(surface, filename.c_str())) {
        const std::string error = SDL_GetError();
        SDL_DestroySurface(surface);
        throw std::runtime_error(error);
    }
    SDL_DestroySurface(surface);
}
} // namespace water3
