#pragma once
#include "scene.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline bool drawHud(SDL_Renderer* renderer, const Scene& scene) {
    SDL_SetRenderDrawColor(renderer, 205, 215, 235, 255);
    char line[200]{};
    std::snprintf(line, sizeof(line), "SPRING CHAIN | %zu masses / %zu springs | t=%.3f s | %s", scene.chain.particles.size(), scene.chain.springs.size(), scene.elapsed, scene.paused ? "PAUSED" : "RUNNING");
    if (!SDL_RenderDebugText(renderer, 30, 20, line)) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 30, 42, "Space pause | N step (lesson 4+) | R reset | F clean/debug | Esc quit")) {
        return false;
    }
#if LAB_CHECKPOINT == 2
    SDL_RenderDebugText(renderer, 30, 64, "Left/Right: distance | Up/Down: angle. F = k * (distance - restLength) * direction.");
    const auto sample = sampleElasticSpring(scene.chain, scene.chain.springs.front());
    std::snprintf(line, sizeof(line), "d=%.3f m | L0=1 m | stretch=%.3f m | F_A=(%.3f, %.3f) N", sample.distance, sample.stretch, sample.forceOnFirst.x, sample.forceOnFirst.y);
    SDL_RenderDebugText(renderer, 30, 700, line);
#endif
#if LAB_CHECKPOINT >= 3
    SDL_RenderDebugText(renderer, 30, 64, "G gravity | D damping (lesson 5+) | Drag or arrows move selected mass (lesson 6+)");
#endif
#if LAB_CHECKPOINT >= 7
    SDL_RenderDebugText(renderer, 30, 680, "C: 20/32/64/100 masses | K stiffness | M mass | [ / ] dt | 1/2: no/with damping | 3: unstable");
    if (scene.debug) {
        const auto& m = scene.metrics;
        std::snprintf(line, sizeof(line), "K=%.6f J | Us=%.6f J | Ug=%.6f J | q=%.4f", m.kineticEnergy, m.springEnergy, m.gravitationalEnergy, springStabilityIndex(scene.stiffness, scene.mass, kStepOptions[scene.dtIndex]));
        SDL_RenderDebugText(renderer, 30, 720, line);
        std::snprintf(line, sizeof(line), "max stretch=%.5f m | speed=%.5f m/s | anchor error=%.3e m | dt=%.6f s", m.maximumStretch, m.maximumSpeed, m.anchorError, kStepOptions[scene.dtIndex]);
        SDL_RenderDebugText(renderer, 30, 740, line);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (scene.debug && scene.hasTrace) {
        std::snprintf(line, sizeof(line), "node %zu | p: (%.3f, %.3f) -> (%.3f, %.3f) m | v: (%.3f, %.3f) -> (%.3f, %.3f) m/s", scene.selected, scene.traceBefore.position.x, scene.traceBefore.position.y, scene.traceAfter.position.x, scene.traceAfter.position.y, scene.traceBefore.velocity.x, scene.traceBefore.velocity.y, scene.traceAfter.velocity.x, scene.traceAfter.velocity.y);
        SDL_RenderDebugText(renderer, 30, 700, line);
    }
#endif
#if LAB_CHECKPOINT >= 6
    SDL_RenderDebugText(renderer, 735, 128, "DISPLACEMENT x (m), by node index");
    SDL_RenderDebugText(renderer, 735, 384, "Plot clips large x; physics unchanged.");
#endif
#if LAB_CHECKPOINT >= 8
    SDL_RenderDebugText(renderer, 735, 430, "ENERGY (J): white E, green K");
    SDL_RenderDebugText(renderer, 735, 446, "yellow Us, purple Ug; zero line");
    if (!scene.history.empty()) {
        std::snprintf(line, sizeof(line), "time %.3f -> %.3f s", scene.history.front().time, scene.history.back().time);
        SDL_RenderDebugText(renderer, 735, 625, line);
    }
    std::snprintf(line, sizeof(line), "Delta E=%.6f J | samples=%zu | fast steps=%d | Enter: +20 s", totalMechanicalEnergy(scene.metrics) - scene.initialEnergy, scene.history.size(), scene.fastRemaining);
    SDL_RenderDebugText(renderer, 30, 760, line);
#endif
    if (!scene.message.empty()) {
        SDL_RenderDebugText(renderer, 30, 790, scene.message.c_str());
    }
    return true;
}
} // namespace lab
