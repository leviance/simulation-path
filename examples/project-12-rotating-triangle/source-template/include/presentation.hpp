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

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
#if LAB_CHECKPOINT >= 7
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
#endif
    if (!text(renderer, 16, 14, "PROJECT 12 | W/S pitch, A/D yaw, Q/E roll | O order | arrows XY, PageUp/Down Z | R reset | Esc quit") || !text(renderer, 16, 34, "F1 reset, F2 quarter turns, F3 general, F4 near, F5 outside | drag yaw/pitch from lesson 6")) {
        return false;
    }
    char value[230]{};
    std::snprintf(value, sizeof(value), "model / pivot (%.2f, %.2f, %.2f) | sensitivity %.3f rad/logical-pixel", scene.position.x, scene.position.y, scene.position.z, scene.sensitivity);
    if (!text(renderer, 16, 60, value)) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    const char* order = "XYZ";
    if (scene.order == RotationOrder::Zyx) {
        order = "ZYX";
    }
    std::snprintf(value, sizeof(value), "pitch %.2f yaw %.2f roll %.2f deg | apply %s along fixed WORLD axes", scene.angles.pitch * 180.0 / kPi, scene.angles.yaw * 180.0 / kPi, scene.angles.roll * 180.0 / kPi, order);
    if (!text(renderer, 16, 82, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 1
    const auto projection = projectTriangle(worldTriangle(scene), scene.camera, scene.lens, viewportFor());
    std::snprintf(value, sizeof(value), "vertex A: %s | B: %s | C: %s | edge AB orange, BC green, CA blue", statusText(projection.vertices[0].status), statusText(projection.vertices[1].status), statusText(projection.vertices[2].status));
    if (!text(renderer, 16, 704, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const Vec3 normal = triangleUnitNormal(worldTriangle(scene));
    std::snprintf(value, sizeof(value), "YELLOW unit normal (%.4f, %.4f, %.4f), display length 1.2 world | RED pivot", normal.x, normal.y, normal.z);
    if (!text(renderer, 16, 724, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    const char* state = "PAUSED";
    if (!scene.paused) {
        state = "ROTATING";
    }
    std::snprintf(value, sizeof(value), "%s | Space pause, N step 0.1s | F: hide debug (triangle + depth scene stay visible)", state);
    if (!text(renderer, 16, 746, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    const Triangle3 local = toLocalTriangle(defaultWorldTriangle());
    const Triangle3 rotated = rotateTriangle(local, scene.angles, scene.order);
    std::snprintf(value, sizeof(value), "edge error %.2e | inverse error %.2e | normal rotation error %.2e", maximumEdgeLengthError(local, rotated), rotationRoundTripError(local.a, scene.angles, scene.order), normalRotationError(local, rotated, scene.angles, scene.order));
    if (!text(renderer, 16, 770, value)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
