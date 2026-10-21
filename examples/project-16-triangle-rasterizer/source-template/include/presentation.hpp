#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 800);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

// HUD đọc chính stats của renderer, không thay sản phẩm bằng title bar.
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
    char line[256]{};
    const char* mode = "2D raster workbench";
    if (scene.worldMode) {
        mode = "3D scene -> perspective -> CPU fill";
    }
    if (!SDL_RenderDebugText(renderer, 16, 618, mode) || !SDL_RenderDebugText(renderer, 16, 640, "1 default, 2 reverse, 3 degenerate, 4 clipped, 5 shared | T rule C color | Space scan N step R reset")) {
        return false;
    }
    const char* depthState = "depth valid";
    if (stats.rejected) {
        depthState = "REJECTED DEPTH";
    }
    std::snprintf(line, sizeof(line), "tested %zu/%zu | covered %zu+%zu | overlap %zu | %s", stats.primary.testedCount + stats.secondary.testedCount, stats.primary.candidateCount + stats.secondary.candidateCount, stats.primary.coveredCount, stats.secondary.coveredCount, stats.overlap, depthState);
    if (!SDL_RenderDebugText(renderer, 16, 662, line)) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    std::snprintf(line, sizeof(line), "area2 %.2f | sample (%.1f %.1f) edges %.2f %.2f %.2f", stats.area, stats.sample.position.x, stats.sample.position.y, stats.sample.edgeAB, stats.sample.edgeBC, stats.sample.edgeCA);
    if (!SDL_RenderDebugText(renderer, 16, 684, line)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    std::snprintf(line, sizeof(line), "B 2D/3D | F clean | Tab select v%d | arrows XY PageUp/Down Z | J/L camera X U/O camera Z | +/- FOV %.0f", scene.selected, scene.camera.fov * 180.0 / 3.141592653589793);
    if (!SDL_RenderDebugText(renderer, 16, 706, line)) {
        return false;
    }
    const Vec3 point = scene.world[static_cast<std::size_t>(scene.selected)];
    std::snprintf(line, sizeof(line), "world (%.2f %.2f %.2f) | camera (%.2f %.2f %.2f) | paused %d", point.x, point.y, point.z, scene.camera.position.x, scene.camera.position.y, scene.camera.position.z, static_cast<int>(scene.paused));
    if (!SDL_RenderDebugText(renderer, 16, 752, line)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    std::snprintf(line, sizeof(line), "weights %.4f %.4f %.4f | inside %d", stats.sample.barycentric.a, stats.sample.barycentric.b, stats.sample.barycentric.c, static_cast<int>(stats.sample.inside));
    if (!SDL_RenderDebugText(renderer, 16, 730, line)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
