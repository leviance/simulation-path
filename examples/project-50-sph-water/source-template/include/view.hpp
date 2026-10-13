#pragma once
#include "diagnostics.hpp"
#include <SDL3/SDL.h>

namespace water {
// Logical coordinates are shared by drawing and pointer input; resizing preserves physics.
inline Vec2 toScreen(Vec2 p) {
    return {50 + 700 * p.x, 610 - 700 * p.y};
}

inline Vec2 fromScreen(Vec2 p) {
    return {(p.x - 50) / 700, (610 - p.y) / 700};
}

inline bool drawDisk(SDL_Renderer* renderer, Vec2 center, double radius) {
    for (int row = -static_cast<int>(radius); row <= static_cast<int>(radius); ++row) {
        const double halfWidth = std::sqrt(std::max(0.0, radius * radius - row * row));
        if (!SDL_RenderLine(renderer, static_cast<float>(center.x - halfWidth), static_cast<float>(center.y + row), static_cast<float>(center.x + halfWidth), static_cast<float>(center.y + row))) {
            return false;
        }
    }
    return true;
}

inline bool drawScene(SDL_Renderer* renderer, [[maybe_unused]] const State& state, [[maybe_unused]] std::size_t selected, [[maybe_unused]] bool showWalls, [[maybe_unused]] bool densityColor, [[maybe_unused]] Vec2 nozzle) {
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
        return false;
    }
    const SDL_FRect tank{50, 50, 700, 560};
    if (!SDL_SetRenderDrawColor(renderer, 110, 130, 160, 255) || !SDL_RenderRect(renderer, &tank)) {
        return false;
    }
#if LAB_CHECKPOINT >= 4
    if (showWalls) {
        if (!SDL_SetRenderDrawColor(renderer, 85, 90, 110, 255)) {
            return false;
        }
        for (const auto p : state.walls) {
            if (!drawDisk(renderer, toScreen(p), 2)) {
                return false;
            }
        }
    }
#endif
#if LAB_CHECKPOINT >= 1
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        const auto& p = state.particles[i];
        Uint8 red = 70;
        Uint8 green = 170;
#if LAB_CHECKPOINT >= 4
        if (densityColor) {
            const double compression = std::clamp((p.density / restDensity - 0.7) / 0.6, 0.0, 1.0);
            red = static_cast<Uint8>(50 + 200 * compression);
            green = static_cast<Uint8>(200 - 100 * compression);
        }
#endif
        if (!SDL_SetRenderDrawColor(renderer, red, green, 240, 255) || !drawDisk(renderer, toScreen(p.position), 7)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (selected < state.particles.size()) {
        const auto center = toScreen(state.particles[selected].position);
        if (!SDL_SetRenderDrawColor(renderer, 250, 210, 90, 255)) {
            return false;
        }
        Vec2 previous{center.x + 700 * support, center.y};
        for (int k = 1; k <= 64; ++k) {
            const double angle = 2 * std::numbers::pi * k / 64;
            Vec2 next{center.x + 700 * support * std::cos(angle), center.y + 700 * support * std::sin(angle)};
            if (!SDL_RenderLine(renderer, static_cast<float>(previous.x), static_cast<float>(previous.y), static_cast<float>(next.x), static_cast<float>(next.y))) {
                return false;
            }
            previous = next;
        }
    }
#endif
#if LAB_CHECKPOINT >= 8
    const auto center = toScreen(nozzle);
    if (!SDL_SetRenderDrawColor(renderer, 255, 210, 70, 255) || !SDL_RenderLine(renderer, static_cast<float>(center.x - 8), static_cast<float>(center.y), static_cast<float>(center.x + 8), static_cast<float>(center.y))) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace water
