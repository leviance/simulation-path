#pragma once
#include "projection.hpp"

namespace lab {
inline Vec2 worldToScreen(Vec2 world) {
    return {550.0 + 45.0 * world.x, 365.0 - 45.0 * world.y};
}

inline Vec2 screenToWorld(Vec2 screen) {
    return {(screen.x - 550.0) / 45.0, (365.0 - screen.y) / 45.0};
}

inline std::uint32_t shade2D(std::uint32_t color, double value) {
    const auto red = static_cast<std::uint32_t>(static_cast<double>((color >> 24) & 255U) * value);
    const auto green = static_cast<std::uint32_t>(static_cast<double>((color >> 16) & 255U) * value);
    const auto blue = static_cast<std::uint32_t>(static_cast<double>((color >> 8) & 255U) * value);
    return (red << 24) | (green << 16) | (blue << 8) | 255U;
}

// Phần vẽ circle đã học: world state không bị đổi thành pixel trong Ball.
inline void drawBall(Framebuffer& image, const Ball& ball) {
    if (!finiteBall(ball))
        return;
    const Vec2 center = worldToScreen(ball.position);
    const double radius = ball.radius * 45.0;
    if (radius <= 0.0 || radius > 300.0 || center.x + radius < 100 || center.x - radius > 1000 || center.y + radius < 95 || center.y - radius > 635)
        return;
    const int left = static_cast<int>(std::floor(std::clamp(center.x - radius, 100.0, 1000.0)));
    const int right = static_cast<int>(std::ceil(std::clamp(center.x + radius, 100.0, 1000.0)));
    const int top = static_cast<int>(std::floor(std::clamp(center.y - radius, 95.0, 635.0)));
    const int bottom = static_cast<int>(std::ceil(std::clamp(center.y + radius, 95.0, 635.0)));
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            const double nx = (x + 0.5 - center.x) / radius;
            const double ny = (y + 0.5 - center.y) / radius;
            if (nx * nx + ny * ny <= 1.0) {
                const double nz = std::sqrt(std::max(0.0, 1.0 - nx * nx - ny * ny));
                const double light = 0.25 + 0.75 * std::max(0.0, -0.4 * nx - 0.5 * ny + 0.76 * nz);
                image.putPixel(x, y, shade2D(ball.color, std::min(1.0, light)));
            }
        }
    }
}

inline void arrow2D(Framebuffer& image, Vec2 point, Vec2 direction, double amount, std::uint32_t color) {
    const Vec2 start = worldToScreen(point);
    const Vec2 end = worldToScreen(add(point, scale(direction, amount)));
    drawLine(image, start.x, start.y, end.x, end.y, color);
    const Vec2 unit = normalizedOr(subtract(end, start), {1.0, 0.0});
    const Vec2 side{-unit.y, unit.x};
    drawLine(image, end.x, end.y, end.x - unit.x * 7 + side.x * 4, end.y - unit.y * 7 + side.y * 4, color);
    drawLine(image, end.x, end.y, end.x - unit.x * 7 - side.x * 4, end.y - unit.y * 7 - side.y * 4, color);
}

inline void drawTank2D(Framebuffer& image, const Scene& scene) {
    rectangle(image, 100, 95, 1000, 635, 0x7187b4ffU, false);
    if (scene.debug) {
        for (int x = -8; x <= 8; x += 2) {
            const Vec2 a = worldToScreen({static_cast<double>(x), -6});
            const Vec2 b = worldToScreen({static_cast<double>(x), 6});
            drawLine(image, a.x, a.y, b.x, b.y, kGrid);
        }
    }
    for (const auto& ball : scene.balls)
        drawBall(image, ball);
#if LAB_CHECKPOINT >= 7
    if (scene.debug) {
        for (const auto& contact : scene.stats.debugContacts) {
            arrow2D(image, contact.point, contact.normal, 0.5, 0xffe26cffU);
            if (contact.impulse > 0.0)
                arrow2D(image, contact.point, contact.normal, std::min(2.0, contact.impulse * 0.2), 0xff7b72ffU);
        }
    }
#elif LAB_CHECKPOINT >= 4
    if (scene.debug && scene.lastContact.colliding && scene.balls.size() == 2) {
        arrow2D(image, scene.balls[0].position, scene.lastContact.normal, 1.5, 0xffe26cffU);
    }
#endif
}

#if LAB_CHECKPOINT >= 8
inline void drawHistory(Framebuffer& image, const Scene& scene) {
    if (scene.history.size() < 2)
        return;
    const double first = scene.history.front().time;
    const double span = std::max(scene.dt, scene.history.back().time - first);
    double energyScale = std::max(1e-6, scene.initialEnergy);
    double penetrationScale = 1e-6;
    for (const auto& sample : scene.history) {
        energyScale = std::max(energyScale, sample.energy);
        penetrationScale = std::max(penetrationScale, sample.penetration);
    }
    rectangle(image, 50, 720, 530, 780, kGrid, false);
    rectangle(image, 580, 720, 1060, 780, kGrid, false);
    for (std::size_t i = 1; i < scene.history.size(); ++i) {
        const auto& a = scene.history[i - 1];
        const auto& b = scene.history[i];
        const double x0 = 480.0 * (a.time - first) / span;
        const double x1 = 480.0 * (b.time - first) / span;
        drawLine(image, 50 + x0, 780 - 60 * a.energy / energyScale, 50 + x1, 780 - 60 * b.energy / energyScale, 0x53f0aeffU);
        drawLine(image, 580 + x0, 780 - 60 * a.penetration / penetrationScale, 580 + x1, 780 - 60 * b.penetration / penetrationScale, 0xffe26cffU);
    }
}
#endif

#if LAB_CHECKPOINT >= 10
inline void renderScene(Framebuffer& image, const Scene& scene, DepthBuffer& depth) {
#else
inline void renderScene(Framebuffer& image, const Scene& scene) {
#endif
    image.clear();
#if LAB_CHECKPOINT >= 10
    if (scene.spatial) {
        drawTank3D(image, depth, scene);
    } else {
        drawTank2D(image, scene);
    }
#else
    drawTank2D(image, scene);
#endif
#if LAB_CHECKPOINT >= 8
    drawHistory(image, scene);
#endif
}
} // namespace lab
