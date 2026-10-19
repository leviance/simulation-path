#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL chỉ trình bày ảnh CPU và chữ; không tính projection thay cho lab.hpp.
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 800);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST) || !SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const RenderStats& stats) {
    static_cast<void>(stats);
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
    if (!text(renderer, 16, 14, "PROJECT 13 | CPU WIREFRAME | F1 default F2 front F3 far F4 near F5 outside | R reset | Esc quit")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char value[256]{};
    std::snprintf(value, sizeof(value), "cube vertex cache: %zu | model (%.2f, %.2f, %.2f) | X red Y green Z blue", stats.vertexProjections, scene.position.x, scene.position.y, scene.position.z);
    if (!text(renderer, 16, 36, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    std::snprintf(value, sizeof(value), "8 vertices / 12 edges | rasterized: %zu | extra projections for depth clipping: %zu", stats.edgeCount, stats.extraProjections);
    if (!text(renderer, 16, 58, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (!text(renderer, 16, 80, "Arrow keys: pitch/yaw, PageUp/Down: roll | O: XYZ/ZYX fixed-world-axis order")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    const char* projection = "PERSPECTIVE";
    if (scene.projection == ProjectionMode::Orthographic) {
        projection = "ORTHOGRAPHIC";
    }
    std::snprintf(value, sizeof(value), "%s | P: toggle projection | zoom %.2fx (same scale at camera Z=6)", projection, scene.zoom);
    if (!text(renderer, 16, 102, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!text(renderer, 16, 744, "Drag: rotate | W/S +/-Z A/D -/+X Q/E -/+Y | wheel or +/-: lens zoom | [ ]: sensitivity")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!text(renderer, 16, 764, "Space: auto/pause | N: step 0.1s | C: depth cue | F: debug (cube and depth scene stay)")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    const auto local = makeCubeVertices(scene.halfExtent);
    const auto rotated = rotateCube(local, scene.angles, scene.order);
    std::snprintf(value, sizeof(value), "edge error %.2e | inverse error %.2e | topology: 8 vertices, 12 unique edges, degree 3", maximumCubeEdgeLengthError(local, rotated), cubeRotationRoundTripError(local, scene.angles, scene.order));
    if (!text(renderer, 16, 784, value)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
