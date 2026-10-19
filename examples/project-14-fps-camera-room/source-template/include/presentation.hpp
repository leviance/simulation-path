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

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const RenderStats& stats, bool mouseLookActive) {
    static_cast<void>(stats);
    static_cast<void>(mouseLookActive);
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
    if (!text(renderer, 16, 14, "PROJECT 14 | ROOM 12 x 22 x 4 | R reset | F1..F5 presets | Esc release mouse, again quit")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char value[256]{};
    const FpsCamera camera = activeCamera(scene);
    std::snprintf(value, sizeof(value), "camera (%.2f %.2f %.2f) | yaw %.1f pitch %.1f | %zu rasterized segments", camera.position.x, camera.position.y, camera.position.z, camera.yaw * 180.0 / kPi, camera.pitch * 180.0 / kPi, stats.visibleSegments);
    if (!text(renderer, 16, 38, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (!text(renderer, 16, 60, "I/K pitch, J/L yaw | yaw+ turns right; pitch+ looks up | room world vertices never change")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    const CameraBasis basis = cameraBasis(camera);
    std::snprintf(value, sizeof(value), "forward (%.2f %.2f %.2f) right (%.2f %.2f %.2f) up (%.2f %.2f %.2f)", basis.forward.x, basis.forward.y, basis.forward.z, basis.right.x, basis.right.y, basis.right.z, basis.up.x, basis.up.y, basis.up.z);
    if (!text(renderer, 16, 82, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const char* state = "ACTIVE";
    if (scene.paused) {
        state = "PAUSED";
    }
    if (!text(renderer, 16, 126, state)) {
        return false;
    }
    if (!text(renderer, 16, 722, "WASD: move at 3.5 world/s | [ ]: speed | keyboard movement works while cursor is released")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    const char* mode = "WALK: Y=1.6, pitch does not change horizontal direction";
    if (scene.fly) {
        mode = "FLY: W/S follow view; Q/E down/up along WORLD Y";
    }
    if (!text(renderer, 16, 742, mode)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    const char* look = "mouse released: click in viewport to enable relative look";
    if (mouseLookActive) {
        look = "RELATIVE mouse look | Esc releases | -/+: sensitivity | M toggles Walk/Fly";
    }
    if (!text(renderer, 16, 762, look)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (!text(renderer, 16, 782, "Space pause | N step 0.1s when paused | T demo | F debug/showcase | outer walls only, crates are markers")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 9
    std::snprintf(value, sizeof(value), "basis error %.2e | view inverse error %.2e | world point (2,1,12)", basisError(scene.camera), viewRoundTripError({2.0, 1.0, 12.0}, scene.camera));
    if (!text(renderer, 16, 104, value)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
