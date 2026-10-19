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

// Hình học nằm trong ảnh CPU; SDL chỉ trình bày texture và chữ debug ASCII.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, bool paused) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 16, 14, "UNIT CIRCLE | Space: pause/resume | R: reset | Escape: quit")) {
        return false;
    }
    if (!text(renderer, 16, 32, "F1-F5: 0, 90, 180, 270 deg, 1 rad | Left/Right: angle +/- 5 deg")) {
        return false;
    }
    if (!text(renderer, 493, 404, "X") || !text(renderer, 285, 166, "Y") || !text(renderer, 454, 408, "+1") || !text(renderer, 76, 408, "-1") || !text(renderer, 285, 205, "+1") || !text(renderer, 285, 568, "-1")) {
        return false;
    }
    if (paused && !text(renderer, 960, 14, "PAUSED")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char label[240]{};
    std::snprintf(label, sizeof(label), "theta %.5f rad = %.2f deg | orange arc | 1 turn = 2*pi rad", scene.angle, radiansToDegrees(scene.angle));
    if (!text(renderer, 16, 62, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    const Vec2 direction = unitDirection(scene.angle);
    std::snprintf(label, sizeof(label), "P = (cos(theta), sin(theta)) = (%.5f, %.5f) | yellow needle", direction.x, direction.y);
    if (!text(renderer, 16, 82, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    const double period = periodFromAngularSpeed(scene.angularSpeed);
    std::snprintf(label, sizeof(label), "omega %.4f rad/s | period %.4f s | Up/Down: speed | S: step 0.1 s while paused", scene.angularSpeed, period);
    if (!text(renderer, 16, 104, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    std::snprintf(label, sizeof(label), "BLUE: X / cos %.5f | GREEN: Y / sin %.5f | gray: projection guides", direction.x, direction.y);
    if (!text(renderer, 16, 640, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    std::snprintf(label, sizeof(label), "Simulation time %.3f s | samples %zu / %zu | 60 Hz, not one sample/frame", scene.elapsedTime, scene.samples.size(), kMaximumSamples);
    if (!text(renderer, 16, 662, label) || !text(renderer, 575, 215, "sin GREEN | cos BLUE") || !text(renderer, 575, 574, "-6 s") || !text(renderer, 1015, 574, "now") || !text(renderer, 545, 266, "+1") || !text(renderer, 545, 526, "-1")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!text(renderer, 16, 686, "Left drag yellow point: atan2(y,x) | drag pauses | center dead zone: 8 logical px")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    std::snprintf(label, sizeof(label), "cos^2 + sin^2 error: %.3e | all visuals use one angle", std::abs(direction.x * direction.x + direction.y * direction.y - 1.0));
    if (!text(renderer, 16, 710, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
