#pragma once
#include "diagnostics.hpp"
#include "particles.hpp"
#include <SDL3/SDL.h>

namespace wind {
enum class Layer {
    Arrows,
    Potential,
    Divergence,
    Curl,
};

inline Layer initialLayer() {
#if LAB_CHECKPOINT == 3
    return Layer::Potential;
#elif LAB_CHECKPOINT == 6
    return Layer::Potential;
#elif LAB_CHECKPOINT >= 5
    return Layer::Curl;
#elif LAB_CHECKPOINT == 4
    return Layer::Divergence;
#else
    return Layer::Arrows;
#endif
}

inline Vec2 toScreen(Vec2 p) {
    const double scale = std::min((800.0 - 32) / 4, (600.0 - 32) / 3);
    const double left = (800 - 4 * scale) / 2;
    const double top = (600 - 3 * scale) / 2;
    return {left + (p.x + 2) * scale, top + (1.5 - p.y) * scale};
}

inline bool mouseWorld(SDL_Renderer* renderer, float mouseX, float mouseY, Vec2& p) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, mouseX, mouseY, &logicalX, &logicalY)) {
        return false;
    }
    const double scale = std::min((800.0 - 32) / 4, (600.0 - 32) / 3);
    const double left = (800 - 4 * scale) / 2;
    const double top = (600 - 3 * scale) / 2;
    p = {(logicalX - left) / scale - 2, 1.5 - (logicalY - top) / scale};
    // Logical coordinates của SDL là float; cho phép sai số làm tròn sát cạnh.
    if (!std::isfinite(p.x) || !std::isfinite(p.y) || p.x < -2 - 1e-6 || p.x > 2 + 1e-6 || p.y < -1.5 - 1e-6 || p.y > 1.5 + 1e-6) {
        return false;
    }
    p.x = std::clamp(p.x, -2.0, 2.0);
    p.y = std::clamp(p.y, -1.5, 1.5);
    return true;
}

inline SDL_Color scalarColor(double value, double range = 2) {
    if (!std::isfinite(value)) {
        return {255, 0, 255, 255};
    }
    const double t = std::min(1.0, std::abs(value) / range);
    if (value >= 0) {
        return {static_cast<Uint8>(std::lround(35 + 205 * t)), static_cast<Uint8>(std::lround(45 + 55 * t)), static_cast<Uint8>(std::lround(60 - 20 * t)), 255};
    }
    return {static_cast<Uint8>(std::lround(35 - 15 * t)), static_cast<Uint8>(std::lround(45 + 95 * t)), static_cast<Uint8>(std::lround(60 + 180 * t)), 255};
}

#if LAB_CHECKPOINT >= 1
inline bool line(SDL_Renderer* renderer, Vec2 a, Vec2 b) {
    const Vec2 start = toScreen(a);
    const Vec2 end = toScreen(b);
    return SDL_RenderLine(renderer, static_cast<float>(start.x), static_cast<float>(start.y), static_cast<float>(end.x), static_cast<float>(end.y));
}

inline bool drawArrow(SDL_Renderer* renderer, Vec2 p, Vec2 v) {
    const double speed = std::hypot(v.x, v.y);
    if (speed < 1e-12) {
        const Vec2 screen = toScreen(p);
        return SDL_RenderPoint(renderer, static_cast<float>(screen.x), static_cast<float>(screen.y));
    }
    // Giới hạn chiều dài chỉ để mũi tên không che hàng xóm; dữ liệu v giữ nguyên.
    const double length = std::min(0.16, 0.09 * speed);
    const Vec2 direction{v.x / speed, v.y / speed};
    const Vec2 tip{p.x + length * direction.x, p.y + length * direction.y};
    const Vec2 left{tip.x - 0.035 * direction.x - 0.018 * direction.y, tip.y - 0.035 * direction.y + 0.018 * direction.x};
    const Vec2 right{tip.x - 0.035 * direction.x + 0.018 * direction.y, tip.y - 0.035 * direction.y - 0.018 * direction.x};
    return line(renderer, p, tip) && line(renderer, tip, left) && line(renderer, tip, right);
}

// Layer được dùng từ bài 3; hai checkpoint đầu chỉ vẽ mũi tên.
inline bool drawField(SDL_Renderer* renderer, const Field& field, [[maybe_unused]] Layer layer) {
#if LAB_CHECKPOINT >= 3
    if (layer != Layer::Arrows) {
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                const auto i = field.index(x, y);
                double value = field.scalar[i];
#if LAB_CHECKPOINT >= 4
                if (layer == Layer::Divergence) {
                    value = divergence(field, x, y);
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (layer == Layer::Curl) {
                    value = curl(field, x, y);
                }
#endif
                const SDL_Color color = scalarColor(value);
                if (!SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a)) {
                    return false;
                }
                const Vec2 p = world(field, x, y);
                const Vec2 a = toScreen({std::max(-2.0, p.x - field.dx / 2), std::min(1.5, p.y + field.dy / 2)});
                const Vec2 b = toScreen({std::min(2.0, p.x + field.dx / 2), std::max(-1.5, p.y - field.dy / 2)});
                const SDL_FRect rect{static_cast<float>(a.x), static_cast<float>(a.y), static_cast<float>(b.x - a.x + 0.25), static_cast<float>(b.y - a.y + 0.25)};
                if (!SDL_RenderFillRect(renderer, &rect)) {
                    return false;
                }
            }
        }
    }
#endif
    if (!SDL_SetRenderDrawColor(renderer, 225, 235, 245, 255)) {
        return false;
    }
    const int stride = std::max(1, (field.width - 1) / 16);
    for (int y = 0; y < field.height; y += stride) {
        for (int x = 0; x < field.width; x += stride) {
            const auto i = field.index(x, y);
            if (!drawArrow(renderer, world(field, x, y), {field.vx[i], field.vy[i]})) {
                return false;
            }
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool drawParticles(SDL_Renderer* renderer, const std::vector<Particle>& particles) {
    if (!SDL_SetRenderDrawColor(renderer, 250, 220, 110, 255)) {
        return false;
    }
    for (const auto& particle : particles) {
        const Vec2 p = toScreen(particle.position);
        const SDL_FRect marker{static_cast<float>(p.x - 1.5), static_cast<float>(p.y - 1.5), 3, 3};
        if (!SDL_RenderFillRect(renderer, &marker)) {
            return false;
        }
    }
    return true;
}
#endif
} // namespace wind
