#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL upload ảnh CPU; clipping và raster không gọi geometry API.
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    auto* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 800);
    if (texture && !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const FrameStats& stats) {
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
    if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 16, 616, "Project 18 | drag / hold A,D depth | W,S near | 1..5 preset R reset")) {
        return false;
    }
    if (!SDL_RenderDebugText(renderer, 770, 616, "ZX: gray before / green after")) {
        return false;
    }
    char line[256]{};
#if LAB_CHECKPOINT >= 7
    std::snprintf(line, sizeof(line), "near %.2f | offset %.2f | Space sweep N step | V clip %d", scene.nearPlane, scene.depthOffset, static_cast<int>(scene.clipping));
#else
    std::snprintf(line, sizeof(line), "near %.2f | offset %.2f | clipping %d", scene.nearPlane, scene.depthOffset, static_cast<int>(scene.clipping));
#endif
    if (!SDL_RenderDebugText(renderer, 16, 642, line)) {
        return false;
    }
#if LAB_CHECKPOINT >= 2
    std::snprintf(line, sizeof(line), "inside %d outside %d on %d | valid %d", stats.clip.inputCounts.inside, stats.clip.inputCounts.outside, stats.clip.inputCounts.onPlane, static_cast<int>(stats.clip.inputCounts.valid));
    if (!SDL_RenderDebugText(renderer, 16, 668, line)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    std::snprintf(line, sizeof(line), "polygon %zu | output triangles %zu | rendered %zu | pixels %zu", stats.clip.polygon.count, stats.clip.batch.count, stats.renderedTriangles, stats.covered);
    if (!SDL_RenderDebugText(renderer, 16, 694, line)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    std::snprintf(line, sizeof(line), "max near violation %.3g | candidates %zu", maximumNearPlaneViolation(stats.clip.polygon, scene.nearPlane), stats.candidates);
    if (!SDL_RenderDebugText(renderer, 16, 720, line)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    std::snprintf(line, sizeof(line), "J,L camera X %.2f | I,K camera Z %.2f | F clean/debug", scene.camera.x, scene.camera.z);
    if (!SDL_RenderDebugText(renderer, 16, 746, line)) {
        return false;
    }
#endif
    (void)stats;
    return SDL_RenderPresent(renderer);
}
} // namespace lab
