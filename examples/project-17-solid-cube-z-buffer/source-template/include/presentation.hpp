#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL chỉ upload framebuffer và vẽ HUD; không nhận API geometry hay GPU depth.
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 800);
    if (texture && !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const RenderStats& stats, const PixelProbe& probe) {
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
    if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 16, 616, "Project 17 | drag/arrows model | 1/2/3 preset R reset | O order D depth V depth-view C cull F clean")) {
        return false;
    }
    char line[256]{};
    std::snprintf(line, sizeof(line), "triangles %zu | culled %zu | invalid %zu | covered %zu | pass %zu | reject %zu", stats.submittedCount, stats.culledCount, stats.invalidCount, stats.coveredCount, stats.passedCount, stats.rejectedCount);
    if (!SDL_RenderDebugText(renderer, 16, 642, line)) {
        return false;
    }
    std::snprintf(line, sizeof(line), "yaw %.2f pitch %.2f | Space pause N step | depth %d cull %d reversed %d", scene.angleY, scene.angleX, static_cast<int>(scene.depthEnabled), static_cast<int>(scene.cullEnabled), static_cast<int>(scene.reverseOrder));
    if (!SDL_RenderDebugText(renderer, 16, 668, line)) {
        return false;
    }
#if LAB_CHECKPOINT >= 4
    if (!probe.traces.empty()) {
        const auto& fragment = probe.traces.back();
        std::snprintf(line, sizeof(line), "pixel (%d %d) | triangle %zu | weights %.3f %.3f %.3f | depth %.6f", probe.x, probe.y, fragment.triangleIndex, fragment.weights.a, fragment.weights.b, fragment.weights.c, fragment.newDepth);
        if (!SDL_RenderDebugText(renderer, 16, 694, line)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!probe.traces.empty()) {
        const auto& fragment = probe.traces.back();
        std::snprintf(line, sizeof(line), "last fragment | stored %.6f -> incoming %.6f | pass %d | %zu fragments at pixel", fragment.storedDepth, fragment.newDepth, static_cast<int>(fragment.passed), probe.traces.size());
        if (!SDL_RenderDebugText(renderer, 16, 720, line)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 9
    std::snprintf(line, sizeof(line), "J/L camera X %.2f | I/K camera Z %.2f | model angles do not rotate the world grid", scene.camera.x, scene.camera.z);
    if (!SDL_RenderDebugText(renderer, 16, 746, line)) {
        return false;
    }
#endif
    (void)probe;
    return SDL_RenderPresent(renderer);
}
} // namespace lab
