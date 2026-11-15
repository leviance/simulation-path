#pragma once
#include "state.hpp"
#include <SDL3/SDL.h>

namespace smoke {
inline constexpr float viewX = 24;
inline constexpr float viewY = 105;
inline constexpr float viewSize = 768;

inline fluid::Vec2 screen(fluid::Vec2 p) {
    return {viewX + viewSize * p.x, viewY + viewSize * (1 - p.y)};
}

inline bool world(SDL_Renderer* renderer, float x, float y, fluid::Vec2& p) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, x, y, &logicalX, &logicalY)) {
        return false;
    }
    p = {(logicalX - viewX) / viewSize, 1 - (logicalY - viewY) / viewSize};
    return fluid::inside(p);
}

inline SDL_Color signedColor(double value, double range) {
    if (!std::isfinite(value)) {
        return {255, 0, 255, 255};
    }
    const double amount = std::clamp(std::abs(value) / range, 0.0, 1.0);
    if (value >= 0) {
        return {static_cast<Uint8>(18 + 222 * amount), static_cast<Uint8>(28 + 72 * amount), 42, 255};
    }
    return {18, static_cast<Uint8>(28 + 115 * amount), static_cast<Uint8>(42 + 208 * amount), 255};
}

inline SDL_Color cellColor(const fluid::Grid& grid, int x, int y, [[maybe_unused]] fluid::Layer layer, [[maybe_unused]] bool colored) {
    const int i = y * grid.n + x;
    const double density = grid.density[i];
    if (!std::isfinite(density)) {
        return {255, 0, 255, 255};
    }
    double opacity = std::clamp(density, 0.0, 1.0);
    fluid::Ink ink = fluid::white;
#if LAB_CHECKPOINT >= 8
    // Màu là passive tracer. Đây là tone mapping, không phải mô hình tán xạ ánh sáng 3D.
    opacity = 1 - std::exp(-1.8 * std::max(0.0, density));
    if (colored && density > 1e-12) {
        ink = {grid.pigment[0][i] / density, grid.pigment[1][i] / density, grid.pigment[2][i] / density};
    }
#endif
    SDL_Color color{static_cast<Uint8>(std::lround(7 + opacity * (248 * std::clamp(ink.r, 0.0, 1.0) - 7))), static_cast<Uint8>(std::lround(12 + opacity * (250 * std::clamp(ink.g, 0.0, 1.0) - 12))), static_cast<Uint8>(std::lround(21 + opacity * (255 * std::clamp(ink.b, 0.0, 1.0) - 21))), 255};
#if LAB_CHECKPOINT >= 4
    if (layer == fluid::Layer::Divergence) {
        color = signedColor(grid.divergence[i], 1);
    }
    if (layer == fluid::Layer::Velocity) {
        const auto flow = fluid::velocityAt(grid, {(x + 0.5) * grid.h, (y + 0.5) * grid.h});
        color = signedColor(-std::hypot(flow.x, flow.y), 0.6);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (layer == fluid::Layer::Pressure) {
        color = signedColor(grid.pressure[i], 0.08);
    }
#endif
    return color;
}

struct Image {
    SDL_Texture* texture = nullptr;
    int n = 0;

    void dispose() {
        if (texture) {
            SDL_DestroyTexture(texture);
        }
        texture = nullptr;
        n = 0;
    }

    // Trình bày được cấp sẵn trong starter; thuật toán chất lưu được thêm ở các checkpoint.
    // [snippet image]
    bool draw(SDL_Renderer* renderer, const fluid::Grid& grid, fluid::Layer layer, bool colored) {
        if (n != grid.n) {
            dispose();
            texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, grid.n, grid.n);
            if (!texture || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_LINEAR)) {
                return false;
            }
            n = grid.n;
        }
        void* pixels = nullptr;
        int pitch = 0;
        if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch)) {
            return false;
        }
        for (int row = 0; row < n; ++row) {
            auto* output = static_cast<Uint8*>(pixels) + row * pitch;
            for (int x = 0; x < n; ++x) {
                const auto color = cellColor(grid, x, n - 1 - row, layer, colored);
                output[x * 4] = color.r;
                output[x * 4 + 1] = color.g;
                output[x * 4 + 2] = color.b;
                output[x * 4 + 3] = 255;
            }
        }
        SDL_UnlockTexture(texture);
        const SDL_FRect destination{viewX, viewY, viewSize, viewSize};
        return SDL_RenderTexture(renderer, texture, nullptr, &destination);
    }

    // [/snippet image]
};
} // namespace smoke
