#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>
#include <new>
#include <utility>

namespace lab {
// Thay ảnh/texture theo giao dịch: lỗi thì giữ nguyên tài nguyên cũ.
inline bool resizeFramebuffer(SDL_Window* window, SDL_Renderer* renderer, SDL_Texture*& texture, Framebuffer& image) {
    int width = 0;
    int height = 0;
    if (!SDL_GetWindowSize(window, &width, &height)) {
        return false;
    }
    if (width <= 0 || height <= 0) {
        return true;
    }
    if (texture && width == image.width && height == image.height) {
        return true;
    }
    if (width > 4096 || height > 4096) {
        return SDL_SetError("Framebuffer budget: maximum 4096 x 4096 logical pixels");
    }
    Framebuffer next;
    next.width = width;
    next.height = height;
    try {
        next.pixels.resize(static_cast<std::size_t>(width) * height);
    } catch (const std::bad_alloc&) {
        return SDL_SetError("Framebuffer allocation failed");
    }
    SDL_Texture* candidate = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
    if (!candidate) {
        return false;
    }
    if (!SDL_SetTextureBlendMode(candidate, SDL_BLENDMODE_NONE) || !SDL_SetTextureScaleMode(candidate, SDL_SCALEMODE_NEAREST) || !SDL_SetRenderLogicalPresentation(renderer, width, height, SDL_LOGICAL_PRESENTATION_STRETCH)) {
        SDL_DestroyTexture(candidate);
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = candidate;
    image = std::move(next);
    return true;
}

inline bool uploadFramebuffer(SDL_Texture* texture, const Framebuffer& image) {
    return SDL_UpdateTexture(texture, nullptr, image.pixels.data(), image.width * static_cast<int>(sizeof(std::uint32_t)));
}

inline bool text(SDL_Renderer* renderer, double x, double y, const char* value) {
    return SDL_RenderDebugText(renderer, static_cast<float>(x), static_cast<float>(y), value);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, bool paused) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!SDL_SetRenderDrawColor(renderer, 220, 230, 245, 255)) {
        return false;
    }
    if (!text(renderer, 12, 12, "COORDINATE MAP | Space: pause | Esc: quit")) {
        return false;
    }
    if (paused && !text(renderer, 12, 28, "PAUSED")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    char label[180]{};
    std::snprintf(label, sizeof(label), "center (%.2f, %.2f) | %.1f px/unit", scene.camera.centerWorld.x, scene.camera.centerWorld.y, scene.camera.scale());
    if (!text(renderer, 12, 44, label)) {
        return false;
    }
    const Vec2 viewport = scene.camera.viewportPixels;
#if LAB_CHECKPOINT >= 2
    const Vec2 origin = scene.camera.worldToScreen({0.0, 0.0});
#else
    const Vec2 origin{viewport.x * 0.5, viewport.y * 0.5};
#endif
    if (origin.y >= 0.0 && origin.y < viewport.y && !text(renderer, viewport.x - 24.0, origin.y + 6.0, "X")) {
        return false;
    }
    if (origin.x >= 0.0 && origin.x < viewport.x && !text(renderer, origin.x + 6.0, 82.0, "Y")) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    const Vec2 world = scene.camera.screenToWorld(scene.cursorScreen);
    std::snprintf(label, sizeof(label), "screen (%.1f, %.1f) | world (%.4f, %.4f)", scene.cursorScreen.x, scene.cursorScreen.y, world.x, world.y);
    if (!text(renderer, 12, 60, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (!text(renderer, 12, viewport.y - 20.0, "Right drag: pan | R: reset view")) {
        return false;
    }
    const double spacing = gridSpacing(scene.camera.scale());
    const Vec2 corner = scene.camera.screenToWorld({0.0, viewport.y});
    const double firstX = std::ceil(corner.x / spacing) * spacing;
    const double firstY = std::ceil(corner.y / spacing) * spacing;
    for (int index = 0; index <= static_cast<int>(viewport.x / 40.0) + 1; ++index) {
        const double x = firstX + index * spacing;
        const Vec2 screen = scene.camera.worldToScreen({x, 0.0});
        std::snprintf(label, sizeof(label), "%.4g", x);
        if (!text(renderer, screen.x + 3.0, std::clamp(origin.y + 6.0, 100.0, viewport.y - 42.0), label)) {
            return false;
        }
    }
    for (int index = 0; index <= static_cast<int>(viewport.y / 40.0) + 1; ++index) {
        const double y = firstY + index * spacing;
        const Vec2 screen = scene.camera.worldToScreen({0.0, y});
        std::snprintf(label, sizeof(label), "%.4g", y);
        if (screen.y >= 100.0 && screen.y < viewport.y - 35.0 && !text(renderer, std::clamp(origin.x + 5.0, 5.0, viewport.x - 70.0), screen.y, label)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!text(renderer, 12, viewport.y - 36.0, "Wheel / +/-: zoom at cursor")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!text(renderer, 12, viewport.y - 52.0, "Left: place/drag | Tab: select | arrows: nudge | Delete: erase")) {
        return false;
    }
    for (std::size_t index = 0; index < scene.points.size(); ++index) {
        const Vec2 point = scene.points[index];
        const Vec2 screen = scene.camera.worldToScreen(point);
        if (screen.x < 0.0 || screen.x > viewport.x - 32.0 || screen.y < 100.0 || screen.y > viewport.y - 72.0) {
            continue;
        }
        std::snprintf(label, sizeof(label), "P%zu (%.2f, %.2f)", index + 1, point.x, point.y);
        if (!text(renderer, screen.x + 12.0, screen.y - 12.0, label)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    const Vec2 restored = scene.camera.screenToWorld(scene.camera.worldToScreen(world));
    std::snprintf(label, sizeof(label), "round-trip error: %.3g world | points: %zu/256", distance(restored, world), scene.points.size());
    if (!text(renderer, 12, 76, label)) {
        return false;
    }
#endif
#else
    (void)scene;
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
