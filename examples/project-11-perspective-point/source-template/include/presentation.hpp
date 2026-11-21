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
inline bool finishFrame(SDL_Renderer* renderer, const char* capturePath) {
    // Đọc chính khung đã vẽ, trước khi SDL đổi back buffer.
    if (capturePath) {
        SDL_Surface* frame = SDL_RenderReadPixels(renderer, nullptr);
        if (!frame) {
            return false;
        }
        const bool saved = SDL_SavePNG(frame, capturePath);
        SDL_DestroySurface(frame);
        if (!saved) {
            return false;
        }
    }
    return SDL_RenderPresent(renderer);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const char* capturePath = nullptr) {
    // Letterbox phải dùng màu nền, không dùng lại màu chữ của frame trước.
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
#if LAB_CHECKPOINT >= 8
    if (!scene.debug) {
        if (!SDL_SetRenderDrawColor(renderer, 153, 183, 214, 255) || !text(renderer, 30, 21, "PROJECT 11   /   PERSPECTIVE                            CPU FRAMEBUFFER")) return false;
        if (!SDL_SetRenderDrawColor(renderer, 230, 238, 251, 255) || !SDL_SetRenderScale(renderer, 2, 2)) return false;
        const bool titleDrawn = text(renderer, 15, 26, "Starfield");
        if (!SDL_SetRenderScale(renderer, 1, 1) || !titleDrawn) return false;
        char telemetry[150]{};
        std::snprintf(telemetry, sizeof(telemetry), "Camera Z: %5.2f / 12      vFOV: %.0f deg      Stars in world: %zu", scene.camera.position.z, scene.lens.verticalFovRadians * 180.0 / kPi, starCatalog().size());
        if (!text(renderer, 30, 720, telemetry)) return false;
        const char* hint = "Hold W to fly forward. Release to stop. The amber star stays in the same place in the world.";
        if (scene.camera.position.z >= flightLimit) hint = "End of this star field. Hold S to fly back, or R to return to the start.";
        if (!SDL_SetRenderDrawColor(renderer, 167, 190, 214, 255) || !text(renderer, 30, 746, hint)) return false;
        if (!text(renderer, 30, 774, "W/S: forward / back    Space: cruise    N: step    +/-: lens    V: aspect    F/M: instruments    R: reset")) return false;
        return finishFrame(renderer, capturePath);
    }
#endif
    const char* controls = "PROJECT 11 | Arrows: star XY, Q/E: Z | R: reset | Esc: quit";
#if LAB_CHECKPOINT >= 2
    controls = "PROJECT 11 | Arrows: star XY, Q/E: Z | J/L: observer Z | R: reset | Esc: quit";
#endif
#if LAB_CHECKPOINT >= 4
    controls = "PROJECT 11 | Arrows + Q/E: test star | J/L: observer Z | +/-: lens | V: aspect | R: reset | Esc: quit";
#endif
    const char* experiment = "F1 / F2: compare the same X/Y at depths 4 and 8";
#if LAB_CHECKPOINT >= 5
    experiment = "F1 / F2: compare depths | F3 near, F4 behind, F5 beyond far, F6 outside | [ ] near, ; ' far";
#endif
    if (!text(renderer, 16, 14, controls) || !text(renderer, 16, 34, experiment)) {
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
        state = "CRUISE";
    }
    if (scene.forwardHeld || scene.backwardHeld) state = "MANUAL";
    std::snprintf(value, sizeof(value), "t %.3f s | %s | W/S: hold to fly | Space: cruise | N: step | F: instruments", scene.elapsed, state);
    if (!text(renderer, 16, 768, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT <= 2
    if (!text(renderer, 16, 724, "XY PREVIEW ONLY - Z input changes data, not image yet. Perspective starts at lesson 3.")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    const char* guide = "M: compare two depths | solid A = point, ring B = same X/Y at twice camera Z";
    if (scene.measureDepth) {
        const auto reading = measureDoubleDepth(scene.point, scene.camera, scene.lens, viewportFor(scene));
        if (reading) {
            std::snprintf(value, sizeof(value), "Distance from center | A: %.2f px at Z %.2f | B: %.2f px at Z %.2f | M: hide ruler", reading->firstOffset, projected.cameraPoint.z, reading->secondOffset, 2.0 * projected.cameraPoint.z);
            guide = value;
        } else {
            guide = "Cannot measure: A and B must both be visible. F1: reset | M: hide ruler";
        }
    }
    if (!text(renderer, 16, 705, guide)) {
        return false;
    }
#endif
    return finishFrame(renderer, capturePath);
}
} // namespace lab
