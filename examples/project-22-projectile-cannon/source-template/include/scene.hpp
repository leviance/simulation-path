#pragma once
#include "framebuffer.hpp"
#include "simulation.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// Vùng nhìn chỉ đổi tỷ lệ pixel/mét, không thay đổi dữ liệu vật lý.
inline WorldView makeWorldView(const Experiment& experiment) {
    double range = 100.0;
    double height = 40.0;
#if LAB_CHECKPOINT >= 3
    range = 20.0;
    height = 12.0;
    const auto includeLaunch = [&](const BallisticLaunch& launch) {
        const double gravity = -launch.acceleration.y;
        const double duration = 2.0 * launch.velocity.y / gravity + std::sqrt(2.0 * launch.position.y / gravity);
        range = std::max(range, analyticPosition(launch, duration).x + 12.0);
        const auto apex = timeToApex(launch);
        if (apex) {
            height = std::max(height, analyticPosition(launch, *apex).y + 8.0);
        }
    };
    includeLaunch(makeLaunch(experiment.settings));
#if LAB_CHECKPOINT >= 4
    if (experiment.current.exists) {
        includeLaunch(experiment.current.launch);
    }
    for (const Shot& shot : experiment.history) {
        includeLaunch(shot.launch);
    }
#endif
#else
    (void)experiment;
#endif
    return {{70.0, 510.0}, std::min(880.0 / range, 450.0 / height)};
}

#if LAB_CHECKPOINT >= 4
inline void drawShotTrail(Framebuffer& frame, const Shot& shot, const WorldView& view, std::uint32_t color) {
    for (std::size_t index = 1; index < shot.samples.size(); ++index) {
        drawLine(frame, worldToScreen(shot.samples[index - 1].position, view), worldToScreen(shot.samples[index].position, view), color);
    }
}
#endif

inline void renderScene(Framebuffer& frame, const Experiment& experiment) {
    std::fill(frame.pixels.begin(), frame.pixels.end(), 0x0b1020ffU);
    const WorldView view = makeWorldView(experiment);
    if (experiment.debug) {
        double spacing = 10.0;
        if (view.pixelsPerMeter < 3.0) {
            spacing = 50.0;
        }
        for (double x = 0.0; x * view.pixelsPerMeter < 920.0; x += spacing) {
            drawLine(frame, worldToScreen({x, 0.0}, view), worldToScreen({x, 500.0 / view.pixelsPerMeter}, view), 0x1d2940ffU);
        }
        for (double y = spacing; y * view.pixelsPerMeter < 460.0; y += spacing) {
            drawLine(frame, worldToScreen({0.0, y}, view), worldToScreen({920.0 / view.pixelsPerMeter, y}, view), 0x1d2940ffU);
        }
    }
    drawLine(frame, {0.0, view.screenOrigin.y}, {999.0, view.screenOrigin.y}, 0x6f8f72ffU);
    const Vec2 muzzle = worldToScreen({0.0, 1.2}, view);
    const Vec2 direction{std::cos(experiment.settings.angle), -std::sin(experiment.settings.angle)};
    const Vec2 barrelBase = subtract(muzzle, scale(direction, 24.0));
    fillCircle(frame, barrelBase, 12, 0x344564ffU);
    for (int offset = -2; offset <= 2; ++offset) {
        drawLine(frame, add(barrelBase, {0.0, double(offset)}), add(muzzle, {0.0, double(offset)}), 0xd5deefffU);
    }
#if LAB_CHECKPOINT >= 1
    const Vec2 velocity{experiment.settings.speed * direction.x, -experiment.settings.speed * direction.y};
    const Vec2 aimEnd = add(muzzle, {velocity.x * 5.0, -velocity.y * 5.0});
    drawArrow(frame, muzzle, aimEnd, 0x70d6ffffU);
#if LAB_CHECKPOINT >= 2
    if (experiment.debug) {
        const Vec2 horizontal = add(muzzle, {velocity.x * 5.0, 0.0});
        drawArrow(frame, muzzle, horizontal, 0xffb454ffU);
        drawArrow(frame, horizontal, aimEnd, 0xc792eaffU);
    }
#endif
#endif
#if LAB_CHECKPOINT >= 3
    BallisticLaunch reference = makeLaunch(experiment.settings);
#if LAB_CHECKPOINT >= 4
    for (const Shot& old : experiment.history) {
        drawShotTrail(frame, old, view, 0x536782ffU);
    }
    if (experiment.current.exists) {
        reference = experiment.current.launch;
    }
#endif
    double duration = 2.0 * reference.velocity.y / -reference.acceleration.y + 0.2;
#if LAB_CHECKPOINT >= 6
    duration = solveGroundImpactTime(reference, 0.0).value_or(duration);
#endif
    const auto exact = sampleAnalyticTrajectory(reference, duration, 160);
    for (std::size_t index = 1; index < exact.size(); ++index) {
        drawLine(frame, worldToScreen(exact[index - 1], view), worldToScreen(exact[index], view), 0xffd166ffU);
    }
    const auto apex = timeToApex(reference);
    if (apex) {
        fillCircle(frame, worldToScreen(analyticPosition(reference, *apex), view), 4, 0xffd166ffU);
    }
#if LAB_CHECKPOINT >= 4
    const Shot& shot = experiment.current;
    drawShotTrail(frame, shot, view, 0x53f0aeffU);
    if (shot.exists) {
        const Vec2 numerical = worldToScreen(shot.projectile.position, view);
        const Vec2 exactPoint = worldToScreen(analyticPosition(shot.launch, shot.projectile.elapsed), view);
        drawLine(frame, numerical, exactPoint, 0xff7b86ffU);
        fillCircle(frame, exactPoint, 4, 0xff7b86ffU);
        fillCircle(frame, numerical, 6, 0x53f0aeffU);
    }
#if LAB_CHECKPOINT >= 6
    if (experiment.debug && shot.impact.impacted) {
        const Vec2 raw = worldToScreen(shot.impact.uncorrectedPosition, view);
        drawLine(frame, add(raw, {-4.0, -4.0}), add(raw, {4.0, 4.0}), 0xff7b86ffU);
        drawLine(frame, add(raw, {-4.0, 4.0}), add(raw, {4.0, -4.0}), 0xff7b86ffU);
    }
#endif
#endif
#endif
}

inline bool presentScene(SDL_Renderer* renderer, SDL_Texture* texture, const Framebuffer& frame, const Experiment& experiment) {
    const SDL_FRect viewport{0.0F, 0.0F, 1000.0F, 560.0F};
    if (!SDL_UpdateTexture(texture, nullptr, frame.pixels.data(), frame.width * int(sizeof(std::uint32_t))) || !SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, &viewport) || !SDL_SetRenderDrawColor(renderer, 220, 231, 247, 255)) {
        return false;
    }
    char text[240]{};
    const Settings& settings = experiment.settings;
    std::snprintf(text, sizeof(text), "NEXT: speed %.1f m/s | angle %.1f deg | g %.2f m/s2 | dt %.5f s | grid %.1f px/m", settings.speed, settings.angle * 180.0 / kPi, settings.gravity, settings.fixedDt, makeWorldView(experiment).pixelsPerMeter);
    if (!SDL_RenderDebugText(renderer, 12, 568, text)) {
        return false;
    }
#if LAB_CHECKPOINT >= 4
    const Shot& shot = experiment.current;
    const char* status = "PAUSED";
    if (!experiment.paused) {
        status = "RUNNING";
    }
    if (!shot.projectile.active) {
        status = "STOPPED";
    }
    if (!shot.exists) {
        status = "NOT FIRED";
    }
#if LAB_CHECKPOINT >= 7
    std::snprintf(text, sizeof(text), "SHOT: t %.3f s | g %.2f | dt %.5f | samples %zu | max %.5f m | mean %.5f m | %s", shot.projectile.elapsed, -shot.launch.acceleration.y, shot.fixedDt, shot.errors.count, shot.errors.maximum, shot.errors.mean(), status);
#else
    std::snprintf(text, sizeof(text), "SHOT: t %.3f s | samples %zu | %s", shot.projectile.elapsed, shot.samples.size(), status);
#endif
    if (!SDL_RenderDebugText(renderer, 12, 588, text)) {
        return false;
    }
    if (shot.logLimitReached && !SDL_RenderDebugText(renderer, 12, 16, "Sample limit reached; stopped safely.")) {
        return false;
    }
#endif
    if (!SDL_RenderDebugText(renderer, 12, 610, "Drag/arrows aim | Enter fire | Space pause | N step | R reset | [ ] dt | G/H gravity")) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 12, 630, "1 low  2 high  3 low-gravity preset | F grid/debug | grey: last 4 shots | Esc quit")) {
        return false;
    }
    return SDL_RenderPresent(renderer);
}
} // namespace lab
