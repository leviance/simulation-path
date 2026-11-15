#pragma once
#include "diagnostics.hpp"
#include "particles.hpp"
#include <SDL3/SDL.h>

namespace wind {
// Bố cục logical cố định; SDL scale/letterbox khi window hoặc DPI thay đổi.
inline constexpr int logicalWidth = 1180;
inline constexpr int logicalHeight = 780;
inline constexpr double plotLeft = 28;
inline constexpr double plotTop = 108;
inline constexpr double plotScale = 208;

enum class Layer {
    Arrows,
    Potential,
    Gradient,
    Divergence,
    Curl
};

inline Layer initialLayer() {
#if LAB_CHECKPOINT == 3
    return Layer::Gradient;
#elif LAB_CHECKPOINT == 6
    return Layer::Gradient;
#elif LAB_CHECKPOINT == 4
    return Layer::Divergence;
#elif LAB_CHECKPOINT >= 5
    return Layer::Curl;
#else
    return Layer::Arrows;
#endif
}

// [snippet world-screen]
// [snippet to-screen]
inline Vec2 toScreen(Vec2 p) {
    return {plotLeft + (p.x + 2) * plotScale, plotTop + (1.5 - p.y) * plotScale};
}

// [/snippet to-screen]

inline bool mouseWorld(SDL_Renderer* renderer, float mouseX, float mouseY, Vec2& p) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, mouseX, mouseY, &logicalX, &logicalY)) {
        return false;
    }
    p = {(logicalX - plotLeft) / plotScale - 2, 1.5 - (logicalY - plotTop) / plotScale};
    // SDL nhận float: chỉ hấp thụ sai số sát cạnh, không hút cả letterbox vào miền.
    if (!std::isfinite(p.x) || !std::isfinite(p.y) || p.x < -2 - 1e-6 || p.x > 2 + 1e-6 || p.y < -1.5 - 1e-6 || p.y > 1.5 + 1e-6) {
        return false;
    }
    p.x = std::clamp(p.x, -2.0, 2.0);
    p.y = std::clamp(p.y, -1.5, 1.5);
    return true;
}

// [/snippet world-screen]

// [snippet signed-color]
inline SDL_Color scalarColor(double value, double range = 2) {
    if (!std::isfinite(value)) {
        return {255, 0, 255, 255};
    }
    const double t = std::min(1.0, std::abs(value) / range);
    if (value >= 0) {
        return {static_cast<Uint8>(std::lround(21 + 112 * t)), static_cast<Uint8>(std::lround(32 + 37 * t)), static_cast<Uint8>(std::lround(47 - 9 * t)), 255};
    }
    return {static_cast<Uint8>(std::lround(21 - t)), static_cast<Uint8>(std::lround(32 + 59 * t)), static_cast<Uint8>(std::lround(47 + 99 * t)), 255};
}

// [/snippet signed-color]

#if LAB_CHECKPOINT >= 1
// [snippet line]
inline bool line(SDL_Renderer* renderer, Vec2 a, Vec2 b) {
    const Vec2 start = toScreen(a);
    const Vec2 end = toScreen(b);
    return SDL_RenderLine(renderer, static_cast<float>(start.x), static_cast<float>(start.y), static_cast<float>(end.x), static_cast<float>(end.y));
}

// [/snippet line]

// [snippet arrow]
inline bool drawArrow(SDL_Renderer* renderer, Vec2 p, Vec2 v) {
    const double speed = std::hypot(v.x, v.y);
    if (!std::isfinite(speed)) {
        return false;
    }
    if (speed < 1e-12) {
        const Vec2 screen = toScreen(p);
        return SDL_RenderPoint(renderer, static_cast<float>(screen.x), static_cast<float>(screen.y));
    }
    // Giới hạn chỉ tác động nét vẽ. Không chuẩn hóa hoặc clamp vận tốc lưu trong field.
    const double length = std::min(0.16, 0.09 * speed);
    const Vec2 direction{v.x / speed, v.y / speed};
    const Vec2 tip{p.x + length * direction.x, p.y + length * direction.y};
    const double head = std::min(0.035, length * 0.35);
    const Vec2 left{tip.x - head * direction.x - head * 0.5 * direction.y, tip.y - head * direction.y + head * 0.5 * direction.x};
    const Vec2 right{tip.x - head * direction.x + head * 0.5 * direction.y, tip.y - head * direction.y - head * 0.5 * direction.x};
    return line(renderer, p, tip) && line(renderer, tip, left) && line(renderer, tip, right);
}

// [/snippet arrow]

#if LAB_CHECKPOINT >= 3
// [snippet overlay-value]
inline double overlayValue(const Field& field, Layer layer, int x, int y) {
    const auto i = field.index(x, y);
    if (layer == Layer::Gradient) {
        return std::hypot(derivativeX(field, field.scalar, x, y), derivativeY(field, field.scalar, x, y));
    }
#if LAB_CHECKPOINT >= 4
    // [snippet divergence-layer]
    if (layer == Layer::Divergence) {
        return divergence(field, x, y);
    }
    // [/snippet divergence-layer]
#endif
#if LAB_CHECKPOINT >= 5
    // [snippet curl-layer]
    if (layer == Layer::Curl) {
        return curl(field, x, y);
    }
    // [/snippet curl-layer]
#endif
    return field.scalar[i];
}

// [/snippet overlay-value]
#endif

inline bool drawField(SDL_Renderer* renderer, const Field& field, [[maybe_unused]] Layer layer) {
    const SDL_Rect clip{28, 108, 833, 625};
    if (!SDL_SetRenderClipRect(renderer, &clip)) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    if (layer != Layer::Arrows) {
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                const SDL_Color color = scalarColor(overlayValue(field, layer, x, y));
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
    // Axes còn thấy được trên bản đồ màu; chỉ glyph bị lấy thưa, dữ liệu không bị giảm.
    if (!SDL_SetRenderDrawColor(renderer, 76, 101, 129, 255) || !line(renderer, {-2, 0}, {2, 0}) || !line(renderer, {0, -1.5}, {0, 1.5})) {
        return false;
    }
    const int stride = std::max(1, (field.width - 1) / 16);
    for (int y = 0; y < field.height; y += stride) {
        for (int x = 0; x < field.width; x += stride) {
            const auto i = field.index(x, y);
            // [snippet gradient-glyph]
            Vec2 vector{field.vx[i], field.vy[i]};
#if LAB_CHECKPOINT >= 3
            if (layer == Layer::Gradient) {
                vector = {derivativeX(field, field.scalar, x, y), derivativeY(field, field.scalar, x, y)};
            }
#endif
            // [/snippet gradient-glyph]
            if (!SDL_SetRenderDrawColor(renderer, 199, 221, 238, 255) || !drawArrow(renderer, world(field, x, y), vector)) {
                return false;
            }
        }
    }
    return SDL_SetRenderClipRect(renderer, nullptr);
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool drawParticles(SDL_Renderer* renderer, const std::vector<Particle>& particles) {
    for (const auto& particle : particles) {
        // Đọc ring buffer theo thứ tự thời gian, kể cả sau khi đã quay vòng.
        for (int age = 1; age < particle.trailSize; ++age) {
            const int a = (particle.trailHead - particle.trailSize + age - 1 + 24) % 24;
            const int b = (a + 1) % 24;
            const auto brightness = static_cast<Uint8>(70 + 150 * age / 24);
            if (!SDL_SetRenderDrawColor(renderer, brightness, brightness, 105, 255) || !line(renderer, particle.trail[a], particle.trail[b])) {
                return false;
            }
        }
        const Vec2 p = toScreen(particle.position);
        const SDL_FRect marker{static_cast<float>(p.x - 1.6), static_cast<float>(p.y - 1.6), 3.2F, 3.2F};
        if (!SDL_SetRenderDrawColor(renderer, 253, 228, 143, 255) || !SDL_RenderFillRect(renderer, &marker)) {
            return false;
        }
    }
    return true;
}
#endif
} // namespace wind
