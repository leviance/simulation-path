#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline bool drawLabels(SDL_Renderer* renderer, const Scene& scene) {
    if (!SDL_SetRenderDrawColor(renderer, 210, 223, 242, 255)) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 70, 20, "PROJECT 27 / BOIDS 2D / CPU ALL-PAIRS")) {
        return false;
    }
    char text[256]{};
    std::snprintf(text, sizeof(text), "N=%zu seed=%u step=%zu t=%.3fs | Space pause | N step | R reset | F debug", scene.boids.size(), static_cast<unsigned>(scene.seed), scene.steps, scene.time);
    if (!SDL_RenderDebugText(renderer, 70, 44, text)) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    const auto& selected = scene.boids.at(scene.selected);
    std::snprintf(text, sizeof(text), "Selected ID=%u position=(%.1f,%.1f) velocity=(%.1f,%.1f)", static_cast<unsigned>(selected.id), selected.position.x, selected.position.y, selected.velocity.x, selected.velocity.y);
    if (!SDL_RenderDebugText(renderer, 70, 62, text)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (scene.debug) {
        std::vector<std::size_t> neighbors;
        findNeighbors(scene.boids, scene.selected, scene.params, neighbors);
        const Steering steering = computeSteering(scene.boids, scene.selected, neighbors, scene.params);
        // Dòng giá trị nằm dưới viewport, không đè lên các cá thể hoặc bảng benchmark.
        std::snprintf(text, sizeof(text), "Separation=(%.1f,%.1f) Align=(%.1f,%.1f) Cohesion=(%.1f,%.1f) Total=(%.1f,%.1f) world/s^2", steering.separation.x, steering.separation.y, steering.alignment.x, steering.alignment.y, steering.cohesion.x, steering.cohesion.y, steering.acceleration.x, steering.acceleration.y);
        if (!SDL_RenderDebugText(renderer, 70, 684, text)) {
            return false;
        }
    }
#endif
    if (!SDL_RenderDebugText(renderer, 70, 700, "1/2/3: 256/512/1024 | P seed | Click select | Drag while paused | Left/Right select")) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderDebugText(renderer, 70, 724, "F: show debug | Controls remain available in clean mode.");
    }
#if LAB_CHECKPOINT >= 8
    if (!scene.job.rows.empty() || scene.job.active) {
        std::snprintf(text, sizeof(text), "BENCHMARK: row %zu/3 warm-up=%zu/2 sample=%zu/7 | B restart | Esc cancel", std::min(scene.job.row + 1, std::size_t{3}), scene.job.warmup, scene.job.samples.size());
        if (!SDL_RenderDebugText(renderer, 70, 722, text)) {
            return false;
        }
        for (std::size_t row = 0; row < scene.job.rows.size(); ++row) {
            const auto& result = scene.job.rows[row];
            std::snprintf(text, sizeof(text), "N=%zu Q=%zu checks=%zu median=%.3f [%.3f..%.3f] ms checksum=%08x", result.count, result.samples, result.comparisons, result.medianMs, result.minMs, result.maxMs, static_cast<unsigned>(result.checksum));
            if (!SDL_RenderDebugText(renderer, 70, 746 + static_cast<float>(row) * 22, text)) {
                return false;
            }
        }
        return true;
    }
#endif
    std::snprintf(text, sizeof(text), "radius=%.0f sep=%.1f align=%.1f coh=%.1f speed=%.0f accel=%.0f", scene.params.radius, scene.params.separationWeight, scene.params.alignmentWeight, scene.params.cohesionWeight, scene.params.maxSpeed, scene.params.maxAcceleration);
    if (!SDL_RenderDebugText(renderer, 70, 722, text)) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 70, 744, "Q/A sep | W/S align | E/D cohesion | T/G radius | Y/H speed | U/J acceleration")) {
        return false;
    }
    std::snprintf(text, sizeof(text), "checks=%zu query=%.3fms update=%.3fms total=%.3fms dropped=%.3fs", scene.metrics.comparisons, scene.metrics.queryMs, scene.metrics.updateMs, scene.metrics.totalMs, scene.droppedSeconds);
    if (!SDL_RenderDebugText(renderer, 70, 766, text)) {
        return false;
    }
    return SDL_RenderDebugText(renderer, 70, 790, "Red separation | Blue alignment | Green cohesion | Gold total | B benchmark | Esc cancel/exit");
}

inline bool presentFrame(SDL_Renderer* renderer, SDL_Texture* texture, const Framebuffer& image, const Scene& scene) {
    if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), Framebuffer::width * static_cast<int>(sizeof(std::uint32_t)))) {
        return false;
    }
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255)) {
        return false;
    }
    if (!SDL_RenderClear(renderer)) {
        return false;
    }
    if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!drawLabels(renderer, scene)) {
        return false;
    }
    return SDL_RenderPresent(renderer);
}
} // namespace lab
