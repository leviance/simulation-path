#pragma once
#include "gpu/api.hpp"
#include <filesystem>
#include <vector>

namespace water51 {
// Explicit screenshot readback only; ordinary frames never read positions to CPU.

inline void saveCapture(Gl& gl, int width, int height, const std::filesystem::path& file) {
    const auto bytes = static_cast<std::size_t>(width) * height * 4;
    std::vector<unsigned char> pixels(bytes);
    gl.PixelStorei(GL_PACK_ALIGNMENT, 4);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    std::vector<unsigned char> row(static_cast<std::size_t>(width) * 4);
    for (int y = 0; y < height / 2; ++y) {
        auto* a = pixels.data() + static_cast<std::size_t>(y) * width * 4;
        auto* b = pixels.data() + static_cast<std::size_t>(height - 1 - y) * width * 4;
        std::copy_n(a, row.size(), row.data());
        std::copy_n(b, row.size(), a);
        std::copy_n(row.data(), row.size(), b);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), width * 4);
    if (surface == nullptr)
        throw std::runtime_error(SDL_GetError());
    const bool saved = SDL_SaveBMP(surface, file.string().c_str());
    SDL_DestroySurface(surface);
    if (!saved)
        throw std::runtime_error("Cannot save capture: " + file.string());
}
} // namespace water51
