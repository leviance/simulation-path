#pragma once
#include "diagnostics.hpp"
#include <SDL3/SDL.h>

namespace fluid {
enum class Layer {
    Smoke,
    Pressure,
    Divergence,
};

inline Layer initialLayer() {
#if LAB_CHECKPOINT == 4
    return Layer::Divergence;
#elif LAB_CHECKPOINT == 5
    return Layer::Pressure;
#elif LAB_CHECKPOINT == 6
    return Layer::Divergence;
#else
    return Layer::Smoke;
#endif
}

inline Vec2 toScreen(Vec2 p) {
    return {16 + 768 * p.x, 16 + 768 * (1 - p.y)};
}

inline bool mouseWorld(SDL_Renderer* renderer, float mouseX, float mouseY, Vec2& p) {
    float x = 0;
    float y = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, mouseX, mouseY, &x, &y)) {
        return false;
    }
    p = {(x - 16) / 768.0, 1 - (y - 16) / 768.0};
    if (!std::isfinite(p.x) || !std::isfinite(p.y) || p.x < -1e-6 || p.x > 1 + 1e-6 || p.y < -1e-6 || p.y > 1 + 1e-6) {
        return false;
    }
    // Chỉ hấp thụ sai số float sát cạnh; input ngoài bản đồ bị từ chối.
    p.x = std::clamp(p.x, 0.0, 1.0);
    p.y = std::clamp(p.y, 0.0, 1.0);
    return true;
}

inline SDL_Color signedColor(double value, double range) {
    if (!std::isfinite(value)) {
        return {255, 0, 255, 255};
    }
    const double t = std::min(1.0, std::abs(value) / range);
    if (value >= 0) {
        return {static_cast<Uint8>(std::lround(30 + 210 * t)), static_cast<Uint8>(std::lround(40 + 60 * t)), 55, 255};
    }
    return {30, static_cast<Uint8>(std::lround(40 + 95 * t)), static_cast<Uint8>(std::lround(55 + 190 * t)), 255};
}

#if LAB_CHECKPOINT >= 1
inline bool drawGrid(SDL_Renderer* renderer, const Grid& grid, [[maybe_unused]] Layer layer) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            // Clamp chỉ dành cho màu. Solver vẫn lưu concentration bằng double.
            const auto intensity = static_cast<Uint8>(std::lround(12 + 235 * std::clamp(grid.density[i], 0.0, 1.0)));
            SDL_Color color{intensity, intensity, intensity, 255};
#if LAB_CHECKPOINT >= 4
            if (layer == Layer::Divergence) {
                color = signedColor(grid.div[i], 2);
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (layer == Layer::Pressure) {
                color = signedColor(grid.pressure[i], 4);
            }
#endif
            if (!SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a)) {
                return false;
            }
            const Vec2 top = toScreen({x * grid.h, (y + 1) * grid.h});
            const SDL_FRect cell{static_cast<float>(top.x), static_cast<float>(top.y), static_cast<float>(768 * grid.h + 0.25), static_cast<float>(768 * grid.h + 0.25)};
            if (!SDL_RenderFillRect(renderer, &cell)) {
                return false;
            }
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool drawInspector(SDL_Renderer* renderer, const Grid& grid, int x, int y) {
    const auto p = toScreen({x * grid.h, (y + 1) * grid.h});
    const SDL_FRect box{static_cast<float>(p.x), static_cast<float>(p.y), static_cast<float>(768 * grid.h), static_cast<float>(768 * grid.h)};
    return SDL_SetRenderDrawColor(renderer, 120, 255, 180, 255) && SDL_RenderRect(renderer, &box);
}
#endif

#if LAB_CHECKPOINT >= 4
inline bool drawArrows(SDL_Renderer* renderer, const Grid& grid) {
    if (!SDL_SetRenderDrawColor(renderer, 110, 190, 255, 255)) {
        return false;
    }
    const int stride = std::max(2, grid.n / 8);
    for (int y = 0; y < grid.n; y += stride) {
        for (int x = 0; x < grid.n; x += stride) {
            const Vec2 p{(x + 0.5) * grid.h, (y + 0.5) * grid.h};
            const Vec2 flow = velocity(grid, p);
            const double speed = std::hypot(flow.x, flow.y);
            if (speed < 1e-12) {
                continue;
            }
            const double length = std::min(0.06, 0.12 * speed);
            const Vec2 a = toScreen(p);
            const Vec2 b = toScreen({p.x + length * flow.x / speed, p.y + length * flow.y / speed});
            const double dx = b.x - a.x;
            const double dy = b.y - a.y;
            const Vec2 left{b.x - 0.35 * dx - 0.18 * dy, b.y - 0.35 * dy + 0.18 * dx};
            const Vec2 right{b.x - 0.35 * dx + 0.18 * dy, b.y - 0.35 * dy - 0.18 * dx};
            if (!SDL_RenderLine(renderer, static_cast<float>(a.x), static_cast<float>(a.y), static_cast<float>(b.x), static_cast<float>(b.y)) || !SDL_RenderLine(renderer, static_cast<float>(b.x), static_cast<float>(b.y), static_cast<float>(left.x), static_cast<float>(left.y)) || !SDL_RenderLine(renderer, static_cast<float>(b.x), static_cast<float>(b.y), static_cast<float>(right.x), static_cast<float>(right.y))) {
                return false;
            }
        }
    }
    return true;
}
#endif
} // namespace fluid
