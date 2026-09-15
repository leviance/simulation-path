#pragma once

#include "neighbor_dynamics.hpp"
#include <SDL3/SDL.h>
#include <sstream>

namespace view {

// Renderer chỉ đọc model. Vòng tròn hiển thị không được dùng làm phép tìm hàng xóm.
struct Viewport {
    float left{};
    float top{90.0f};
    float side{};
};

inline Viewport makeViewport(int width, int height) {
    const float side = std::max(60.0f, std::min(float(width - 70), float(height - 180)));
    return {(float(width) - side) * 0.5f, 90.0f, side};
}

inline SDL_FPoint toScreen(pbc::Vec2 p, pbc::Box box, Viewport viewport) {
    return {viewport.left + float(p.x / box.width) * viewport.side, viewport.top + float(p.y / box.height) * viewport.side};
}

inline bool segment(SDL_Renderer* renderer, pbc::Vec2 a, pbc::Vec2 b, pbc::Box box, Viewport viewport) {
    const SDL_FPoint first = toScreen(a, box, viewport);
    const SDL_FPoint second = toScreen(b, box, viewport);
    return SDL_RenderLine(renderer, first.x, first.y, second.x, second.y);
}

#if LAB_CHECKPOINT >= 1
inline bool drawRadius(SDL_Renderer* renderer, pbc::Vec2 center, double radius, pbc::Box box, Viewport viewport) {
    // Vẽ ảnh của đường tròn để phần vượt mép xuất hiện ở mép đối diện.
    for (const pbc::Vec2 image : pbc::imagePositions(center, box)) {
        for (int step = 0; step < 64; ++step) {
            const double angle0 = 6.283185307179586 * step / 64.0;
            const double angle1 = 6.283185307179586 * (step + 1) / 64.0;
            const pbc::Vec2 a{image.x + radius * std::cos(angle0), image.y + radius * std::sin(angle0)};
            const pbc::Vec2 b{image.x + radius * std::cos(angle1), image.y + radius * std::sin(angle1)};
            if (!segment(renderer, a, b, box, viewport)) {
                return false;
            }
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool draw(SDL_Renderer* renderer, const pbc::System& system, Viewport viewport, double skin, const neighbors::NeighborList& list, bool grid, const std::string& status) {
#else
inline bool draw(SDL_Renderer* renderer, const pbc::System& system, Viewport viewport, double skin, bool grid, const std::string& status) {
#endif
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
        return false;
    }
    const SDL_FRect border{viewport.left, viewport.top, viewport.side, viewport.side};
    if (!SDL_SetRenderDrawColor(renderer, 148, 163, 184, 255) || !SDL_RenderRect(renderer, &border)) {
        return false;
    }
    const SDL_Rect clip{int(viewport.left), int(viewport.top), int(viewport.side), int(viewport.side)};
    if (!SDL_SetRenderClipRect(renderer, &clip)) {
        return false;
    }
#if LAB_CHECKPOINT >= 5
    if (grid) {
        const double radius = system.parameters.cutoff + skin;
        const int columns = int(std::min(128.0, std::floor(system.box.width / radius)));
        const int rows = int(std::min(128.0, std::floor(system.box.height / radius)));
        if (!SDL_SetRenderDrawColor(renderer, 40, 55, 78, 255)) {
            return false;
        }
        for (int x = 1; x < columns; ++x) {
            if (!segment(renderer, {system.box.width * x / columns, 0.0}, {system.box.width * x / columns, system.box.height}, system.box, viewport)) {
                return false;
            }
        }
        for (int y = 1; y < rows; ++y) {
            if (!segment(renderer, {0.0, system.box.height * y / rows}, {system.box.width, system.box.height * y / rows}, system.box, viewport)) {
                return false;
            }
        }
    }
#else
    (void)grid;
#endif
#if LAB_CHECKPOINT >= 1
    if (!system.particles.empty()) {
        const pbc::Vec2 center = system.particles[0].position;
#if LAB_CHECKPOINT >= 2
        if (!SDL_SetRenderDrawColor(renderer, 245, 158, 11, 255) || !drawRadius(renderer, center, system.parameters.cutoff + skin, system.box, viewport)) {
            return false;
        }
        for (const neighbors::PairIndex pair : list.pairs) {
            if (pair.i != 0) {
                continue;
            }
            const pbc::Vec2 delta = pbc::minimumImage(pbc::subtract(system.particles[pair.j].position, center), system.box);
            if (!SDL_SetRenderDrawColor(renderer, 86, 101, 131, 255) || !segment(renderer, center, pbc::add(center, delta), system.box, viewport)) {
                return false;
            }
        }
#endif
        if (!SDL_SetRenderDrawColor(renderer, 52, 211, 153, 255) || !drawRadius(renderer, center, system.parameters.cutoff, system.box, viewport)) {
            return false;
        }
    }
#endif
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        if (i == 0) {
            if (!SDL_SetRenderDrawColor(renderer, 251, 191, 36, 255)) {
                return false;
            }
        } else if (!SDL_SetRenderDrawColor(renderer, 96, 165, 250, 255)) {
            return false;
        }
        const SDL_FPoint center = toScreen(system.particles[i].position, system.box, viewport);
        const SDL_FRect marker{center.x - 3.0f, center.y - 3.0f, 6.0f, 6.0f};
        if (!SDL_RenderFillRect(renderer, &marker)) {
            return false;
        }
    }
    if (!SDL_SetRenderClipRect(renderer, nullptr) || !SDL_SetRenderDrawColor(renderer, 226, 232, 240, 255)) {
        return false;
    }
    (void)skin;
    return SDL_RenderDebugText(renderer, 16.0f, 12.0f, status.c_str());
}

} // namespace view
