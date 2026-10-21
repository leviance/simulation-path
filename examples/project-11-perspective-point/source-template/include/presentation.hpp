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
#if LAB_CHECKPOINT >= 3
inline const char* statusText(ProjectionStatus status) {
    switch (status) {
    case ProjectionStatus::Visible:
        return "visible";
    case ProjectionStatus::BehindCamera:
        return "behind";
    case ProjectionStatus::BeforeNearPlane:
        return "before-near";
    case ProjectionStatus::BeyondFarPlane:
        return "beyond-far";
    case ProjectionStatus::OutsideFrustum:
        return "outside";
    default:
        return "invalid";
    }
}
#endif
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene) {
    // Letterbox phải dùng màu nền, không dùng lại màu chữ của frame trước.
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
#if LAB_CHECKPOINT >= 8
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
#endif
    if (!text(renderer, 16, 14, "PROJECT 11 | WASD: XY, Q/E: Z | IJKL U/O: camera | +/- FOV | V aspect | R reset | Esc quit") || !text(renderer, 16, 34, "F1 default, F2 far, F3 near, F4 behind, F5 beyond-far, F6 outside | [ ] near, ; ' far")) {
        return false;
    }
    char value[230]{};
    std::snprintf(value, sizeof(value), "world (%.3f, %.3f, %.3f) | camera at (%.2f, %.2f, %.2f)", scene.point.x, scene.point.y, scene.point.z, scene.camera.position.x, scene.camera.position.y, scene.camera.position.z);
    if (!text(renderer, 16, 58, value)) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    const auto projected = projectPerspective(scene.point, scene.camera, scene.lens, viewportFor(scene));
    std::snprintf(value, sizeof(value), "camera point (%.3f, %.3f, %.3f) | status %s", projected.cameraPoint.x, projected.cameraPoint.y, projected.cameraPoint.z, statusText(projected.status));
    if (!text(renderer, 16, 80, value)) {
        return false;
    }
    if (projected.screen && projected.ndc) {
        std::snprintf(value, sizeof(value), "NDC (%.4f, %.4f) -> screen (%.2f, %.2f), continuous viewport coordinates", projected.ndc->x, projected.ndc->y, projected.screen->x, projected.screen->y);
    } else {
        std::snprintf(value, sizeof(value), "NDC / screen: undefined (depth rejected before division)");
    }
    if (!text(renderer, 16, 724, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    std::snprintf(value, sizeof(value), "vFOV %.1f deg | near %.2f far %.2f | aspect %.4f | resize letterboxes, V changes viewport", scene.lens.verticalFovRadians * 180.0 / kPi, scene.lens.nearPlane, scene.lens.farPlane, viewportFor(scene).width / viewportFor(scene).height);
    if (!text(renderer, 16, 746, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    const char* state = "PAUSED";
    if (!scene.paused) {
        state = "FLYING";
    }
    std::snprintf(value, sizeof(value), "t %.3f s | %s | Space pause, N step 0.1s, mouse drag from lesson 7, F debug from lesson 8", scene.elapsed, state);
    if (!text(renderer, 16, 768, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT <= 2
    if (!text(renderer, 16, 724, "XY PREVIEW ONLY - Z input changes data, not image yet. Perspective starts at lesson 3.")) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
