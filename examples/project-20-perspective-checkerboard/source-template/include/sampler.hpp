#pragma once
#include "geometry.hpp"

namespace lab {
// Ảnh nguồn giữ RGB cố định; camera và theme không làm đổi các texel này.
#if LAB_CHECKPOINT >= 2
enum class AddressMode {
    clamp, // Giữ UV ở mép ảnh khi ra ngoài miền.
    repeat // Lặp lại ảnh bằng phần lẻ của UV.
};

struct Texture2D {
    int width{};
    int height{};
    std::vector<Color> texels;
};

inline Texture2D makeCheckerTexture(int width = 64, int height = 64, int cells = 8) {
    Texture2D texture;
    if (width <= 0 || height <= 0 || cells <= 0 || width > 4096 || height > 4096 || cells > 4096) {
        return texture;
    }
    texture.width = width;
    texture.height = height;
    texture.texels.resize(std::size_t(width) * std::size_t(height));
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            const int cellX = x * cells / width;
            const int cellY = y * cells / height;
            Color color{236, 240, 248};
            if ((cellX + cellY) % 2 != 0) {
                color = {38, 48, 72};
            }
            texture.texels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
        }
    }
    return texture;
}

inline double addressCoordinate(double value, AddressMode mode) {
    if (!std::isfinite(value)) {
        return 0;
    }
    if (mode == AddressMode::clamp) {
        return std::clamp(value, 0.0, 1.0);
    }
    return value - std::floor(value);
}

inline std::array<int, 2> nearestTexelIndex(const Texture2D& texture, Vec2 uv, AddressMode mode) {
    if (texture.width <= 0 || texture.height <= 0) {
        return {0, 0};
    }
    const double u = addressCoordinate(uv.x, mode);
    const double v = addressCoordinate(uv.y, mode);
    const int x = std::min(int(std::floor(u * texture.width)), texture.width - 1);
    const int y = std::min(int(std::floor(v * texture.height)), texture.height - 1);
    return {x, y};
}

inline Color sampleNearest(const Texture2D& texture, Vec2 uv, AddressMode mode) {
    if (texture.width <= 0 || texture.height <= 0 || texture.texels.size() != std::size_t(texture.width) * std::size_t(texture.height) || !isFinite(uv)) {
        return {255, 0, 255};
    }
    const auto texel = nearestTexelIndex(texture, uv, mode);
    return texture.texels[std::size_t(texel[1]) * std::size_t(texture.width) + std::size_t(texel[0])];
}
#endif
} // namespace lab
