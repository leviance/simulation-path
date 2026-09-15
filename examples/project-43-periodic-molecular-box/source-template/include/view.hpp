#pragma once

#include "dynamics.hpp"

#include <SDL3/SDL.h>
#include <algorithm>

namespace view {

// Camera cố định nhìn đủ ô gốc và một phần các ô kề, không đổi dữ liệu vật lý.
struct Viewport {
    float left{};
    float top{};
    float side{};
};

inline Viewport makeViewport(int width, int height) {
    const float side = std::max(60.0f, std::min(float(width) * 0.56f, float(height) * 0.62f));
    return {(float(width) - side) * 0.5f, 30.0f + (float(height) * 0.72f - side) * 0.5f, side};
}

inline SDL_FPoint toScreen(pbc::Vec2 point, pbc::Box box, Viewport viewport) {
    return {viewport.left + float(point.x / box.width) * viewport.side, viewport.top + float(point.y / box.height) * viewport.side};
}

inline pbc::Vec2 toWorld(float x, float y, pbc::Box box, Viewport viewport) {
    return {double((x - viewport.left) / viewport.side) * box.width, double((y - viewport.top) / viewport.side) * box.height};
}

inline bool line(SDL_Renderer* renderer, pbc::Vec2 a, pbc::Vec2 b, pbc::Box box, Viewport viewport) {
    const SDL_FPoint start = toScreen(a, box, viewport);
    const SDL_FPoint end = toScreen(b, box, viewport);
    return SDL_RenderLine(renderer, start.x, start.y, end.x, end.y);
}

inline bool marker(SDL_Renderer* renderer, pbc::Vec2 position, pbc::Box box, Viewport viewport, float radius) {
    const SDL_FPoint center = toScreen(position, box, viewport);
    // Marker vuông chỉ là ký hiệu vị trí; không đưa kích thước pixel vào điều kiện biên.
    const SDL_FRect rect{center.x - radius, center.y - radius, 2.0f * radius, 2.0f * radius};
    return SDL_RenderFillRect(renderer, &rect);
}

#if LAB_CHECKPOINT >= 7
struct TraceSample {
    double wrappedX{};
    double unwrappedX{};
};

inline void appendTrace(std::vector<TraceSample>& trace, const pbc::Particle& particle) {
    trace.push_back({particle.position.x, particle.unwrapped.x});
    if (trace.size() > 240) {
        trace.erase(trace.begin());
    }
}

inline bool drawTrace(SDL_Renderer* renderer, const std::vector<TraceSample>& trace, int width, int height, double boxWidth) {
    if (trace.size() < 2) {
        return true;
    }
    double minimum = 0.0;
    double maximum = boxWidth;
    for (const TraceSample sample : trace) {
        minimum = std::min(minimum, sample.unwrappedX);
        maximum = std::max(maximum, sample.unwrappedX);
    }
    for (int curve = 0; curve < 2; ++curve) {
        if (curve == 0) {
            if (!SDL_SetRenderDrawColor(renderer, 96, 165, 250, 255)) {
                return false;
            }
        } else {
            if (!SDL_SetRenderDrawColor(renderer, 251, 191, 36, 255)) {
                return false;
            }
        }
        for (std::size_t i = 1; i < trace.size(); ++i) {
            double a = trace[i - 1].wrappedX;
            double b = trace[i].wrappedX;
            if (curve == 1) {
                a = trace[i - 1].unwrappedX;
                b = trace[i].unwrappedX;
            }
            const float x0 = 24.0f + float(i - 1) * float(width - 48) / float(trace.size() - 1);
            const float x1 = 24.0f + float(i) * float(width - 48) / float(trace.size() - 1);
            const float y0 = float(height - 24) - float((a - minimum) / (maximum - minimum)) * 90.0f;
            const float y1 = float(height - 24) - float((b - minimum) / (maximum - minimum)) * 90.0f;
            if (!SDL_RenderLine(renderer, x0, y0, x1, y1)) {
                return false;
            }
        }
    }
    return true;
}
#endif

inline bool drawScene(SDL_Renderer* renderer, const pbc::System& system, Viewport viewport, bool showImages) {
    if (!SDL_SetRenderDrawColor(renderer, 12, 18, 32, 255)) {
        return false;
    }
    if (!SDL_RenderClear(renderer)) {
        return false;
    }
    if (!SDL_SetRenderDrawColor(renderer, 126, 148, 176, 255)) {
        return false;
    }
    const SDL_FRect box{viewport.left, viewport.top, viewport.side, viewport.side};
    if (!SDL_RenderRect(renderer, &box)) {
        return false;
    }
#if LAB_CHECKPOINT >= 6
    if (showImages) {
        if (!SDL_SetRenderDrawColor(renderer, 65, 80, 105, 255)) {
            return false;
        }
        for (const pbc::Particle& particle : system.particles) {
            for (const pbc::Vec2 image : pbc::imagePositions(particle.position, system.box)) {
                if (!marker(renderer, image, system.box, viewport, 3.0f)) {
                    return false;
                }
            }
        }
    }
#else
    (void)showImages;
#endif
#if LAB_CHECKPOINT >= 3
    if (system.particles.size() == 2) {
        const pbc::Vec2 a = system.particles[0].position;
        const pbc::Vec2 b = system.particles[1].position;
        if (!SDL_SetRenderDrawColor(renderer, 99, 115, 138, 255)) {
            return false;
        }
        if (!line(renderer, a, b, system.box, viewport)) {
            return false;
        }
        const pbc::Vec2 delta = pbc::minimumImage(pbc::subtract(b, a), system.box);
        if (!SDL_SetRenderDrawColor(renderer, 251, 191, 36, 255)) {
            return false;
        }
        if (!line(renderer, a, pbc::add(a, delta), system.box, viewport)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (system.particles.size() == 2) {
        const pbc::Evaluation forces = pbc::evaluate(system);
        if (forces.valid) {
            if (!SDL_SetRenderDrawColor(renderer, 248, 113, 113, 255)) {
                return false;
            }
            for (std::size_t i = 0; i < system.particles.size(); ++i) {
                const pbc::Vec2 start = system.particles[i].position;
                // Giới hạn độ dài đường lực trên màn hình, không clamp lực trong solver.
                const double magnitude = pbc::length(forces.forces[i]);
                const pbc::Vec2 offset = pbc::scale(forces.forces[i], 0.6 / std::max(1.0, magnitude));
                if (!line(renderer, start, pbc::add(start, offset), system.box, viewport)) {
                    return false;
                }
            }
        }
    }
#endif
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        if (i == 0) {
            if (!SDL_SetRenderDrawColor(renderer, 251, 191, 36, 255)) {
                return false;
            }
        } else {
            if (!SDL_SetRenderDrawColor(renderer, 96, 165, 250, 255)) {
                return false;
            }
        }
        if (!marker(renderer, system.particles[i].position, system.box, viewport, 4.0f)) {
            return false;
        }
    }
    return true;
}

} // namespace view
