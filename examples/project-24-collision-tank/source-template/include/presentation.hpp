#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {

// Chọn nhãn từ scene hiện tại, không thay đổi state trong lúc vẽ HUD.
inline bool drawHud(SDL_Renderer* renderer, const Scene& scene) {
    if (!SDL_SetRenderDrawColor(renderer, 233, 241, 255, 255))
        return false;
    char value[240]{};
    std::size_t count = scene.balls.size();
#if LAB_CHECKPOINT >= 10
    if (scene.spatial)
        count = scene.spheres.size();
#endif
    const char* dimension = "2D";
    if (scene.spatial) {
        dimension = "3D";
    }
    const char* motion = "RUNNING";
    if (scene.paused) {
        motion = "PAUSED";
    }
    std::snprintf(value, sizeof(value), "COLLISION TANK | %s | %zu bodies | t %.3f s | dt %.5f | e scale %.2f | %s", dimension, count, scene.elapsed, scene.dt, scene.restitution, motion);
    if (!SDL_RenderDebugText(renderer, 30, 22, value))
        return false;
    const char* controls = "Space pause | N step (from lesson 2) | R reset | F debug";
#if LAB_CHECKPOINT >= 11
    controls = "2/3 mode | Space pause | N step | R reset | E restitution | I iterations | D correction | F debug | B spawn";
#elif LAB_CHECKPOINT >= 10
    controls = "2/3 mode | Space pause | N step | R reset | E restitution | I iterations | D correction | F debug";
#elif LAB_CHECKPOINT >= 8
    controls = "Space/N/R/F | E restitution | D correction | I iterations | C count | H elastic | Enter fast job";
#elif LAB_CHECKPOINT >= 7
    controls = "Space/N/R/F | E restitution | D correction | I iterations | C count";
#elif LAB_CHECKPOINT >= 6
    controls = "Space/N/R/F | E restitution | D correction";
#elif LAB_CHECKPOINT >= 3
    controls = "Space/N/R/F | E restitution | [ ] fixed dt";
#endif
    if (!SDL_RenderDebugText(renderer, 30, 45, controls))
        return false;
    const char* interaction = "2D world: 20 x 12 m. Size/color/material differ. Drag kick is available in final (lesson 11).";
    if (scene.spatial) {
        interaction = "Drag: orbit camera, not physics. Wheel: distance. Arrows: yaw/pitch. Box size: 16 x 10 x 12 m.";
    }
    if (!SDL_RenderDebugText(renderer, 30, 65, interaction))
        return false;
#if LAB_CHECKPOINT >= 7
    if (scene.debug) {
        std::size_t pairs = scene.stats.pairChecks, contacts = scene.stats.contacts, impulses = scene.stats.impulses;
#if LAB_CHECKPOINT >= 10
        if (scene.spatial) {
            pairs = scene.sphereStats.pairChecks;
            contacts = scene.sphereStats.contacts;
            impulses = scene.sphereStats.impulses;
        }
#endif
        std::snprintf(value, sizeof(value), "Solver / last physics step: %zu checks | %zu contact visits (not unique pairs) | %zu impulses | iter %d", pairs, contacts, impulses, scene.iterations);
        if (!SDL_RenderDebugText(renderer, 30, 660, value))
            return false;
    }
#elif LAB_CHECKPOINT >= 4
    std::snprintf(value, sizeof(value), "Last detected contact: n=(%.3f, %.3f) | penetration %.5f m | relative normal speed %.4f m/s | j %.5f Ns", scene.lastContact.normal.x, scene.lastContact.normal.y, scene.lastContact.penetration, scene.lastNormalSpeed, scene.lastImpulse);
    if (!SDL_RenderDebugText(renderer, 30, 670, value))
        return false;
#endif
#if LAB_CHECKPOINT >= 8
    double energy = scene.metrics.kineticEnergy, pen = scene.metrics.maximumPenetration;
#if LAB_CHECKPOINT >= 10
    if (scene.spatial) {
        energy = scene.sphereMetrics.energy;
        pen = scene.sphereMetrics.penetration;
    }
#endif
    std::snprintf(value, sizeof(value), "K %.5f J | remaining overlap depth %.6f m | |P-P0-Jwall| %.3e kg m/s | yellow normals / red j vectors", energy, pen, momentumResidual(scene));
    if (scene.debug && !SDL_RenderDebugText(renderer, 30, 685, value))
        return false;
    if (!SDL_RenderDebugText(renderer, 50, 705, "Kinetic energy (J), auto scale") || !SDL_RenderDebugText(renderer, 580, 705, "Remaining penetration (m), independent auto scale"))
        return false;
    std::snprintf(value, sizeof(value), "History: %.2f -> %.2f s, %zu physics samples (rolling max 601). Enter: bounded +2 simulation seconds.", scene.history.front().time, scene.history.back().time, scene.history.size());
    if (!SDL_RenderDebugText(renderer, 30, 792, value))
        return false;
#endif
    if (!scene.message.empty() && !SDL_RenderDebugText(renderer, 30, 812, scene.message.c_str()))
        return false;
    return true;
}
} // namespace lab
