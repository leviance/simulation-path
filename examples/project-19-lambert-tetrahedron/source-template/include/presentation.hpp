#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL chỉ trình bày framebuffer CPU và telemetry; không vẽ geometry thay renderer.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const FrameStats& stats) {
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }

    // Debug là overlay riêng, không thay dữ liệu ảnh CPU hoặc kết quả depth test.
    if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    const char* movementHelp = "P19 Starter | F clean/debug | R reset | Escape quit";
#if LAB_CHECKPOINT >= 1
    movementHelp = "P19 | drag / WASD: model | T: triangle | R: reset | Escape: quit";
#endif
#if LAB_CHECKPOINT >= 6
    movementHelp = "P19 | drag / WASD: selected target | M: model-camera | wheel: distance";
#endif
    if (!SDL_RenderDebugText(renderer, 16, 492, movementHelp)) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    if (!SDL_RenderDebugText(renderer, 16, 516, "Q,E / [,]: light | 1..4 preset | Space orbit | . step | N vectors | F clean")) {
        return false;
    }
#elif LAB_CHECKPOINT >= 2
    if (!SDL_RenderDebugText(renderer, 16, 516, "N: normal vector | T: select triangle | F: clean/debug")) {
        return false;
    }
#endif

#if LAB_CHECKPOINT >= 1
    char line[240]{};
    const auto& sample = stats.faces[scene.selectedFace];
#if LAB_CHECKPOINT >= 4
    std::snprintf(line, sizeof(line), "face %zu | N (%.2f %.2f %.2f) | dot %.3f diffuse %.3f intensity %.3f", scene.selectedFace, sample.normal.x, sample.normal.y, sample.normal.z, sample.lighting.dotValue, sample.lighting.diffuse, sample.lighting.intensity);
#elif LAB_CHECKPOINT >= 2
    std::snprintf(line, sizeof(line), "face %zu | normal world (%.3f %.3f %.3f)", scene.selectedFace, sample.normal.x, sample.normal.y, sample.normal.z);
#else
    std::snprintf(line, sizeof(line), "face %zu | 8 shared vertices, 12 triangles | material palette", scene.selectedFace);
    (void)sample;
#endif
    if (!SDL_RenderDebugText(renderer, 16, 540, line)) {
        return false;
    }
#if LAB_CHECKPOINT >= 5
    std::snprintf(line, sizeof(line), "L lighting %d | ambient %.2f [5/6] strength %.2f [7/8] | P palette %d", int(scene.lighting), scene.ambient, scene.diffuseStrength, int(scene.palette));
    if (!SDL_RenderDebugText(renderer, 16, 564, line)) {
        return false;
    }
#endif
    const char* target = "model";
    if (scene.dragTarget == DragTarget::camera) {
        target = "camera";
    }
    std::snprintf(line, sizeof(line), "drag: %s | submitted %zu culled %zu | clipped triangles %zu | fragments %zu", target, stats.submitted, stats.culled, stats.clippedTriangles, stats.passed);
    if (!SDL_RenderDebugText(renderer, 16, 588, line)) {
        return false;
    }
#endif
    (void)stats;
    return SDL_RenderPresent(renderer);
}
} // namespace lab
