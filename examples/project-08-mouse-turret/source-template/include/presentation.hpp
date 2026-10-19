#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, Framebuffer::width, Framebuffer::height);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE) || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

// SDL chỉ trình bày ảnh CPU và chữ ASCII, không thay rasterizer.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, bool paused) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 16, 14, "TURRET | Space: pause | R: reset | S: step | Escape: quit")) {
        return false;
    }
    if (!text(renderer, 16, 32, "Mouse: target | F: follow on/off | arrows: move target | A/D: heading | F1-F7: presets")) {
        return false;
    }
    if (paused && !text(renderer, 970, 14, "PAUSED")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char label[220]{};
    const Vec2 forward = directionFromAngle(scene.turretAngle);
    std::snprintf(label, sizeof(label), "T (%.3f, %.3f) world | forward (%.3f, %.3f) | mouse follow %d | domain radius 6.5", scene.targetOffset.x, scene.targetOffset.y, forward.x, forward.y, static_cast<int>(scene.followMouse));
    if (!text(renderer, 16, 58, label) || !text(renderer, 16, 708, "YELLOW forward | GREEN target direction | BLUE projection | RED rejection")) {
        return false;
    }
    const bool valid = targetHasDirection(scene);
    if (!valid && !text(renderer, 16, 82, "Target near center: direction/angle undefined; turret keeps heading, not locked")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (valid) {
        std::snprintf(label, sizeof(label), "raw dot %.5f world | normalized dot %.6f", dot(forward, scene.targetOffset), cosineBetween(forward, scene.targetOffset));
        if (!text(renderer, 16, 82, label)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (valid) {
        std::snprintf(label, sizeof(label), "unsigned angle %.4f deg", angleBetween(forward, scene.targetOffset) * 180.0 / kPi);
        if (!text(renderer, 16, 104, label)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    const Vec2 parallel = vectorProjection(scene.targetOffset, forward);
    const Vec2 residual = rejection(scene.targetOffset, forward);
    std::snprintf(label, sizeof(label), "scalar projection %.4f world | residual %.4f | projection dot rejection %.3e", scalarProjection(scene.targetOffset, forward), length(residual), dot(parallel, residual));
    if (!text(renderer, 16, 728, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    std::snprintf(label, sizeof(label), "signed error %.3f deg | speed %.3f rad/s | Q/E: speed", signedAngleBetween(forward, scene.targetOffset) * 180.0 / kPi, scene.turnSpeed);
    if (valid && !text(renderer, 16, 124, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    const bool locked = valid && isWithinViewCone(forward, scene.targetOffset, scene.halfViewAngle);
    std::snprintf(label, sizeof(label), "half cone %.1f deg | locked %d (angle only) | [ / ]: cone", scene.halfViewAngle * 180.0 / kPi, static_cast<int>(locked));
    if (!text(renderer, 16, 746, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    const double reconstructionError = length(subtract(add(parallel, residual), scene.targetOffset));
    std::snprintf(label, sizeof(label), "reconstruction error %.3e world", reconstructionError);
    if (!text(renderer, 16, 144, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
