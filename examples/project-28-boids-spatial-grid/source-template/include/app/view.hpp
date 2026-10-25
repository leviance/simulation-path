#pragma once
#include "boids/framebuffer.hpp"
#include "scene.hpp"
#include <limits>

namespace lab {
inline constexpr double viewLeft = 70.0;
inline constexpr double viewTop = 80.0;

inline Vec2 worldToScreen(Vec2 point) {
    return {viewLeft + point.x, viewTop + point.y};
}

inline Vec2 screenToWorld(Vec2 point) {
    return {point.x - viewLeft, point.y - viewTop};
}

inline bool inViewport(Vec2 point, const Params& params) {
    const Vec2 world = screenToWorld(point);
    return world.x >= 0 && world.x < params.width && world.y >= 0 && world.y < params.height;
}

// [snippet:drawBoid]
inline void drawBoid(Framebuffer& image, const Boid& boid, double size, std::uint32_t color) {
    const Vec2 center = worldToScreen(boid.position);
    Vec2 direction{1, 0};
    const double speed = length(boid.velocity);
    if (speed > vectorEpsilon) {
        direction = multiply(boid.velocity, 1.0 / speed);
    }
    const Vec2 side{-direction.y, direction.x};
    const Vec2 tip = add(center, multiply(direction, size));
    const Vec2 tail = subtract(center, multiply(direction, size * 0.7));
    const Vec2 left = add(tail, multiply(side, size * 0.55));
    const Vec2 right = subtract(tail, multiply(side, size * 0.55));
    drawLine(image, tip.x, tip.y, left.x, left.y, color);
    drawLine(image, left.x, left.y, right.x, right.y, color);
    drawLine(image, right.x, right.y, tip.x, tip.y, color);
}

// [/snippet:drawBoid]

inline std::size_t nearestBoid(const GridScene& scene, Vec2 point) {
    double best = std::numeric_limits<double>::infinity();
    std::size_t result = 0;
    for (std::size_t index = 0; index < scene.boids.size(); ++index) {
        const double distance = length(subtract(scene.boids[index].position, point));
        if (distance < best) {
            best = distance;
            result = index;
        }
    }
    return result;
}

inline void drawRadius(Framebuffer& image, Vec2 center, double radius) {
    // Vẽ chín ảnh để nhìn thấy lân cận liên tục ở hai mép miền tuần hoàn.
    for (double dx : {-960.0, 0.0, 960.0}) {
        for (double dy : {-600.0, 0.0, 600.0}) {
            Vec2 previous{center.x + dx + radius, center.y + dy};
            for (int sample = 1; sample <= 96; ++sample) {
                const double angle = sample * 6.2831853071795864769 / 96.0;
                const Vec2 next{center.x + dx + radius * std::cos(angle), center.y + dy + radius * std::sin(angle)};
                const Vec2 a = worldToScreen(previous);
                const Vec2 b = worldToScreen(next);
                drawLine(image, a.x, a.y, b.x, b.y, 0x6b6038ff);
                previous = next;
            }
        }
    }
}

inline void drawArrow(Framebuffer& image, Vec2 origin, Vec2 vector, std::uint32_t color) {
    const Vec2 start = worldToScreen(origin);
    const Vec2 end = add(start, multiply(vector, 1.3));
    drawLine(image, start.x, start.y, end.x, end.y, color);
    if (length(vector) <= vectorEpsilon) {
        return;
    }
    const double angle = std::atan2(vector.y, vector.x);
    drawLine(image, end.x, end.y, end.x - 6 * std::cos(angle - 0.5), end.y - 6 * std::sin(angle - 0.5), color);
    drawLine(image, end.x, end.y, end.x - 6 * std::cos(angle + 0.5), end.y - 6 * std::sin(angle + 0.5), color);
}

inline void drawScene(Framebuffer& image, GridScene& scene) {
    refreshInspection(scene);
    image.clear();
    const auto& query = scene.inspectionQuery;
    if (scene.debug && scene.inspectionGrid) {
        const auto& grid = *scene.inspectionGrid;
        std::vector<bool> visited(grid.buckets.size(), false);
        for (std::size_t cell : query.cells) {
            visited[cell] = true;
        }
        for (std::size_t row = 0; row < grid.rows; ++row) {
            for (std::size_t column = 0; column < grid.columns; ++column) {
                const auto cell = row * grid.columns + column;
                const int left = static_cast<int>(viewLeft + column * grid.cellSize);
                const int top = static_cast<int>(viewTop + row * grid.cellSize);
                const int right = static_cast<int>(viewLeft + std::min(grid.width, (column + 1) * grid.cellSize));
                const int bottom = static_cast<int>(viewTop + std::min(grid.height, (row + 1) * grid.cellSize));
                if (scene.showOccupancy && !grid.buckets[cell].empty()) {
                    const double ratio = static_cast<double>(grid.buckets[cell].size()) / std::max(std::size_t{1}, grid.maximumOccupancy);
                    const auto brightness = static_cast<std::uint32_t>(24 + 64 * ratio);
                    const auto color = (brightness << 24U) | (20U << 16U) | (brightness << 8U) | 255U;
                    rectangle(image, left, top, right, bottom, color, true);
                }
                if (scene.showCells) {
                    std::uint32_t color = kGrid;
                    if (visited[cell]) {
                        color = 0x465c80ff;
                    }
                    rectangle(image, left, top, right, bottom, color, false);
                }
            }
        }
    }
    std::vector<std::uint8_t> mask(scene.boids.size(), 0);
    for (std::size_t index : query.candidates) {
        mask[index] = 1;
    }
    for (std::size_t index : query.neighbors) {
        mask[index] = 2;
    }
    if (scene.debug) {
        drawRadius(image, scene.boids.at(scene.selected).position, scene.params.radius);
    }
    scene.drawn = 0;
    for (std::size_t index = 0; index < scene.boids.size(); ++index) {
        std::uint32_t color = 0x53dcb6ff;
        double size = 4;
        if (scene.debug && mask[index] == 1) {
            color = 0x82b8ffff;
        }
        if (scene.debug && mask[index] == 2) {
            color = 0xf4ca64ff;
        }
        if (scene.debug && index == scene.selected) {
            color = kExact;
            size = 8;
        }
        drawBoid(image, scene.boids[index], size, color);
        ++scene.drawn;
    }
    if (scene.debug) {
        const auto steering = computeSteering(scene.boids, scene.selected, query.neighbors, scene.params);
        const auto origin = scene.boids.at(scene.selected).position;
        drawArrow(image, origin, steering.separation, 0xff7b72ff);
        drawArrow(image, origin, steering.alignment, 0x82b8ffff);
        drawArrow(image, origin, steering.cohesion, 0x6be89bff);
        drawArrow(image, origin, steering.acceleration, 0xf4ca64ff);
    }
    rectangle(image, 0, 0, Framebuffer::width - 1, 78, kBackground, true);
    rectangle(image, 0, 681, Framebuffer::width - 1, Framebuffer::height - 1, kBackground, true);
    rectangle(image, 0, 79, 68, 680, kBackground, true);
    rectangle(image, 1031, 79, Framebuffer::width - 1, 680, kBackground, true);
}
} // namespace lab
