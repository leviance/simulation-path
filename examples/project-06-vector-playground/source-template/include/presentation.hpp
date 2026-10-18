#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL chỉ trình bày ảnh CPU và chữ ASCII; không vẽ primitive vector thay ta.
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

inline bool uploadFramebuffer(SDL_Texture* texture, const Framebuffer& image) {
    return SDL_UpdateTexture(texture, nullptr, image.pixels.data(), Framebuffer::width * static_cast<int>(sizeof(std::uint32_t)));
}

inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

#if LAB_CHECKPOINT >= 1
inline bool endpointLabel(SDL_Renderer* renderer, Vec2 world, const char* label) {
    const Vec2 screen = worldToScreen(world);
    return text(renderer, static_cast<float>(screen.x + 12.0), static_cast<float>(screen.y - 14.0), label);
}
#endif

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, bool paused) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 16, 14, "VECTOR PLAYGROUND | Space: pause | R: reset | Escape: quit")) {
        return false;
    }
    if (paused && !text(renderer, 850, 14, "PAUSED")) {
        return false;
    }
    if (!text(renderer, 1060, kOriginY + 10, "X") || !text(renderer, kOriginX + 10, 128, "Y")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char label[200]{};
    std::snprintf(label, sizeof(label), "A green (%.3f, %.3f) | B blue (%.3f, %.3f) | 1 unit = 45 logical px", scene.vectorA.x, scene.vectorA.y, scene.vectorB.x, scene.vectorB.y);
    if (!text(renderer, 16, 34, label) || !endpointLabel(renderer, scene.vectorA, "A") || !endpointLabel(renderer, scene.vectorB, "B")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    std::snprintf(label, sizeof(label), "|A| %.6f | |B| %.6f", length(scene.vectorA), length(scene.vectorB));
    if (!text(renderer, 16, 50, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (!text(renderer, 16, 708, "Left drag endpoints | Tab: select A/B | arrows: nudge | F1-F5: presets")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    const Vec2 sum = scene.vectorA + scene.vectorB;
    std::snprintf(label, sizeof(label), "A+B gold (%.3f, %.3f) | gray edges copy A and B", sum.x, sum.y);
    if (!text(renderer, 16, 66, label) || !endpointLabel(renderer, sum, "A+B")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const Vec2 difference = scene.vectorA - scene.vectorB;
    std::snprintf(label, sizeof(label), "A-B coral (%.3f, %.3f) | moved copy: B -> A", difference.x, difference.y);
    if (!text(renderer, 16, 82, label) || !endpointLabel(renderer, difference, "A-B")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    std::snprintf(label, sizeof(label), "scalar %.2f | distance(A,B) %.6f | overlay %d", scene.scalar, distance(scene.vectorA, scene.vectorB), static_cast<int>(scene.viewMode));
    if (!text(renderer, 16, 98, label) || !text(renderer, 16, 724, "1: arithmetic | 2: scalar | Q/E: change scalar")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    const Vec2 unitA = normalize(scene.vectorA);
    std::snprintf(label, sizeof(label), "unit A (%.4f, %.4f), length %.4f | A=0 has no direction", unitA.x, unitA.y, length(unitA));
    if (scene.viewMode == Scene::ViewMode::Unit || scene.viewMode == Scene::ViewMode::All) {
        if (!text(renderer, 16, 114, label)) {
            return false;
        }
    }
    if (!text(renderer, 600, 724, "3: unit circle / normalize(A)")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    const Vec2 point = lerp(scene.vectorA, scene.vectorB, scene.interpolation);
    std::snprintf(label, sizeof(label), "4: lerp | 0: all | [ / ]: t %.2f | P (%.3f, %.3f)", scene.interpolation, point.x, point.y);
    if (!text(renderer, 16, 740, label)) {
        return false;
    }
#else
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
