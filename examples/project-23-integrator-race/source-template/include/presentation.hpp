#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene) {
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 20, 12, "PROJECT 23 | INTEGRATOR RACE | white outline: exact solution, same time") || !text(renderer, 20, 32, "Space run/pause | N step | R reset | Left/Right x0 | Up/Down k | U/O v0 | M mass | Esc quit") || !text(renderer, 20, 50, "[ / ] dt | 1/2/3 change lane solver (lesson 5) | G plot | Enter +20s | B benchmark | F clean")) {
        return false;
    }
    char value[240]{};
    const char* motion = "RUNNING";
    if (scene.paused) {
        motion = "PAUSED";
    }
    std::snprintf(value, sizeof(value), "t %.3f s | dt %.6f | m %.2f | k %.2f | x0 %.2f | v0 %.2f | %s | fast steps left %d", scene.elapsed, fixedDelta(scene), scene.parameters.mass, scene.parameters.stiffness, scene.initial.position, scene.initial.velocity, motion, scene.fastRemaining);
    if (!text(renderer, 20, 74, value)) {
        return false;
    }
    for (std::size_t index = 0; index < 3; ++index) {
        const auto& lane = scene.race.lanes[index];
        std::snprintf(value, sizeof(value), "Lane %zu: %s | x %.5f m | v %.5f m/s | evaluations %zu", index + 1, integratorName(lane.kind), lane.state.position, lane.state.velocity, lane.forceEvaluations);
        if (!laneAvailable(index)) {
            std::snprintf(value, sizeof(value), "Lane %zu: exact preview (solver added in a later lesson)", index + 1);
        }
        if (!text(renderer, 60, static_cast<float>(laneY(index) - 38), value)) {
            return false;
        }
    }
#if LAB_CHECKPOINT >= 8
    if (scene.showBenchmark) {
        const auto& job = scene.benchmark;
        if (!text(renderer, 40, 432, "NATIVE C++ BENCHMARK | median of 5 batches after warmup | no SDL/render/logger in timed work") || !text(renderer, 40, 454, "METHOD                us / step      state error (m) at T   steps / batch      force evals / batch")) {
            return false;
        }
        for (std::size_t index = 0; index < job.rows.size(); ++index) {
            const auto& row = job.rows[index];
            std::snprintf(value, sizeof(value), "%-20s  %10.5f     %16.7e       %8zu            %8zu", integratorName(row.kind), row.microsecondsPerStep, row.phaseSpaceError, row.work.steps, row.work.forceEvaluations);
            if (!text(renderer, 40, 482.0f + static_cast<float>(index) * 26.0f, value)) {
                return false;
            }
        }
        const char* status = "Press B to measure again. Build Release before comparing runtime.";
        if (job.running) {
            status = "Measuring one bounded batch per frame. Escape/Space or parameter edit cancels.";
        }
        if (job.failed) {
            status = "Benchmark stopped: invalid work or 5-second deadline exceeded.";
        }
        if (!text(renderer, 40, 584, status) || !text(renderer, 40, 608, "Each batch: 16 resets to the SAME initial state, floor(2/dt) steps per trajectory. Time excludes warmup.") || !text(renderer, 40, 630, "Clock-limited values near zero are not proof of zero cost. Force counts are NOT runtime measurements.")) {
            return false;
        }
    } else {
#endif
#if LAB_CHECKPOINT >= 6
        const char* label = "POSITION x(t), m | white exact, lane 1 red, lane 2 green, lane 3 purple";
        if (scene.graph == Graph::error) {
            label = "STATE ERROR sqrt(dx^2 + (dv/omega)^2), m | not an angle error";
        }
        if (scene.graph == Graph::energy) {
            label = "RELATIVE ENERGY (E-E0)/E0 | signed ratio, NOT percent | undefined if E0=0";
        }
        const auto scale = graphScale(scene);
        if (!text(renderer, 40, 416, label)) {
            return false;
        }
        std::snprintf(value, sizeof(value), "Vertical extent %.3e | time %.3f .. %.3f s | last %zu physics samples (limit %zu)", scale.extent, scale.firstTime, scale.lastTime, scene.history.size(), kHistoryLimit);
        if (!text(renderer, 40, 670, value)) {
            return false;
        }
#else
    if (!text(renderer, 40, 450, "First understand each step. The history graphs are added in lesson 6.")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (scene.debug) {
        for (std::size_t index = 0; index < 3; ++index) {
            const auto metrics = integratorMetrics(scene.race.lanes[index].state, scene.initial, scene.parameters);
            std::snprintf(value, sizeof(value), "Lane %zu | |dx| %.6e m | state error %.6e m | energy drift %+.6e | steps %zu", index + 1, metrics.positionError, metrics.phaseSpaceError, metrics.relativeEnergyDrift, scene.race.stepCount);
            if (!text(renderer, 20, 706.0f + static_cast<float>(index) * 20.0f, value)) {
                return false;
            }
        }
    }
#endif
    std::snprintf(value, sizeof(value), "Dropped %.4f s | substeps %d | %s", scene.droppedTime, scene.substeps, scene.warning);
    if (!text(renderer, 20, 788, value)) {
        return false;
    }
    return SDL_RenderPresent(renderer);
}
} // namespace lab
