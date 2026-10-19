#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
// Hình học được vẽ vào ảnh CPU; SDL chỉ trình bày kết quả.
inline void lineBetween(Framebuffer& image, Vec2 a, Vec2 b, std::uint32_t color) {
    drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), color);
}

inline void drawBoard(Framebuffer& image) {
    image.clear(kBackground);
    for (int x = 30; x < Framebuffer::width; x += 40) {
        drawLine(image, x, 130, x, 690, kGrid);
    }
    for (int y = 130; y <= 690; y += 40) {
        drawLine(image, 30, y, 1070, y, kGrid);
    }
    drawLine(image, 30, 410, 1070, 410, kGuide);
    drawLine(image, 550, 130, 550, 690, kGuide);
    drawCircle(image, 550, 410, 260, kGuide);
}

inline void arrow(Framebuffer& image, Vec2 startWorld, Vec2 endWorld, std::uint32_t color) {
    const Vec2 start = worldToScreen(startWorld);
    const Vec2 end = worldToScreen(endWorld);
    const Vec2 delta = subtract(end, start);
    const double distance = length(delta);
    if (distance < 1e-9) {
        return;
    }
    lineBetween(image, start, end, color);
    const Vec2 unit = normalize(delta);
    const Vec2 side{-unit.y, unit.x};
    const double head = std::min(12.0, distance * 0.6);
    const Vec2 base = subtract(end, scale(unit, head));
    lineBetween(image, end, add(base, scale(side, head * 0.45)), color);
    lineBetween(image, end, subtract(base, scale(side, head * 0.45)), color);
}

#if LAB_CHECKPOINT >= 1
inline void drawTurret(Framebuffer& image, Vec2 forward) {
    disc(image, 550, 410, 24, kGrid);
    drawCircle(image, 550, 410, 24, kWhite);
    const Vec2 side{-forward.y * 0.15, forward.x * 0.15};
    const Vec2 muzzle = scale(forward, 2.4);
    lineBetween(image, worldToScreen(side), worldToScreen(add(muzzle, side)), kWhite);
    lineBetween(image, worldToScreen(scale(side, -1.0)), worldToScreen(subtract(muzzle, side)), kWhite);
    lineBetween(image, worldToScreen(add(muzzle, side)), worldToScreen(subtract(muzzle, side)), kWhite);
    arrow(image, {}, scale(forward, 3.0), kNeedle);
}

inline void drawTarget(Framebuffer& image, Vec2 target, std::uint32_t color) {
    const Vec2 screen = worldToScreen(target);
    const int x = static_cast<int>(std::lround(screen.x));
    const int y = static_cast<int>(std::lround(screen.y));
    disc(image, x, y, 8, color);
    drawLine(image, x - 13, y, x + 13, y, kWhite);
    drawLine(image, x, y - 13, x, y + 13, kWhite);
}
#endif

#if LAB_CHECKPOINT >= 4
inline void drawProjection(Framebuffer& image, Vec2 target, Vec2 forward) {
    const Vec2 parallel = vectorProjection(target, forward);
    arrow(image, {}, parallel, kProjection);
    lineBetween(image, worldToScreen(parallel), worldToScreen(target), kRejected);
}
#endif

#if LAB_CHECKPOINT >= 5
inline void drawAngleArc(Framebuffer& image, double angle, double error) {
    Vec2 previous = worldToScreen(scale(directionFromAngle(angle), 1.1));
    const int steps = std::max(1, static_cast<int>(std::ceil(std::abs(error) * 25.0)));
    for (int index = 1; index <= steps; ++index) {
        const double phase = angle + error * static_cast<double>(index) / static_cast<double>(steps);
        const Vec2 next = worldToScreen(scale(directionFromAngle(phase), 1.1));
        lineBetween(image, previous, next, kWhite);
        previous = next;
    }
}
#endif

#if LAB_CHECKPOINT >= 6
inline void drawCone(Framebuffer& image, const Scene& scene) {
    const Vec2 lower = scale(directionFromAngle(scene.turretAngle - scene.halfViewAngle), kTargetRadius);
    const Vec2 upper = scale(directionFromAngle(scene.turretAngle + scene.halfViewAngle), kTargetRadius);
    lineBetween(image, kOrigin, worldToScreen(lower), kGuide);
    lineBetween(image, kOrigin, worldToScreen(upper), kGuide);
}
#endif

inline void renderScene(Framebuffer& image, const Scene& scene) {
    drawBoard(image);
#if LAB_CHECKPOINT >= 1
    const Vec2 forward = directionFromAngle(scene.turretAngle);
    lineBetween(image, kOrigin, worldToScreen(scene.targetOffset), kGrid);
#if LAB_CHECKPOINT >= 6
    drawCone(image, scene);
#endif
#if LAB_CHECKPOINT >= 4
    drawProjection(image, scene.targetOffset, forward);
#endif
    if (targetHasDirection(scene)) {
        arrow(image, {}, scale(normalize(scene.targetOffset), 3.5), kTarget);
#if LAB_CHECKPOINT >= 5
        drawAngleArc(image, scene.turretAngle, signedAngleBetween(forward, scene.targetOffset));
#endif
    }
    drawTurret(image, forward);
    std::uint32_t targetColor = kRejected;
#if LAB_CHECKPOINT >= 6
    if (targetHasDirection(scene) && isWithinViewCone(forward, scene.targetOffset, scene.halfViewAngle)) {
        targetColor = kTarget;
    }
#endif
    drawTarget(image, scene.targetOffset, targetColor);
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
}
} // namespace lab
