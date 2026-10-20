#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
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

inline void formatRow(char* output, std::size_t capacity, const InspectorRow& row) {
    if (!row.value) {
        std::snprintf(output, capacity, "%-8s  -- (not available; never substitute zero)", row.name);
        return;
    }
    const Vec4 value = *row.value;
    if (row.components == 4) {
        std::snprintf(output, capacity, "%-8s  %11.5f  %11.5f  %11.5f  %11.5f", row.name, value.x, value.y, value.z, value.w);
    } else if (row.components == 3) {
        std::snprintf(output, capacity, "%-8s  %11.5f  %11.5f  %11.5f", row.name, value.x, value.y, value.z);
    } else {
        std::snprintf(output, capacity, "%-8s  %11.3f  %11.3f  (logical pixels)", row.name, value.x, value.y);
    }
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const Inspection& inspection) {
    if (!SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    if (!scene.debug) {
        return SDL_RenderPresent(renderer);
    }
    if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    char value[256]{};
    std::snprintf(value, sizeof(value), "P15 | vertex %zu | R reset | V next vertex | 1..6 select row | F1..F7 presets | %s", scene.selectedVertex, inspection.status);
    if (!text(renderer, 16, 14, value)) {
        return false;
    }
    std::snprintf(value, sizeof(value), "model x/z %.2f/%.2f yaw %.1f scaleX %.2f | camera z %.2f yaw/pitch %.1f/%.1f | FOV %.1f near %.2f far %.2f", scene.model.position.x, scene.model.position.z, scene.model.yaw * 180.0 / kPi, scene.model.scale.x, scene.camera.position.z, scene.camera.yaw * 180.0 / kPi, scene.camera.pitch * 180.0 / kPi, scene.lens.verticalFovRadians * 180.0 / kPi, scene.lens.nearPlane, scene.lens.farPlane);
    if (!text(renderer, 16, 34, value)) {
        return false;
    }

    // Sáu dòng cùng xuất hiện; chọn stage chỉ đổi màu, không giấu năm dòng khác.
    if (!text(renderer, 16, 574, "STAGE                  x            y            z            w   | viewport 1100 x 560")) {
        return false;
    }
    for (std::size_t index = 0; index < inspection.rows.size(); ++index) {
        if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
            return false;
        }
        if (static_cast<int>(index) == scene.selectedStage && !SDL_SetRenderDrawColor(renderer, 255, 226, 108, 255)) {
            return false;
        }
        formatRow(value, sizeof(value), inspection.rows[index]);
        if (!text(renderer, 16, 596.0F + 19.0F * static_cast<float>(index), value)) {
            return false;
        }
    }
    if (!SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
#if LAB_CHECKPOINT == 2
    const Vec4 point = transform(translationMatrix({2.0, 1.0, 3.0}), toPoint(scene.vertices[scene.selectedVertex]));
    const Vec4 direction = transform(translationMatrix({2.0, 1.0, 3.0}), toDirection(scene.vertices[scene.selectedVertex]));
    std::snprintf(value, sizeof(value), "translation(2,1,3): POINT (%.2f %.2f %.2f w=%.0f) | DIRECTION (%.2f %.2f %.2f w=%.0f)", point.x, point.y, point.z, point.w, direction.x, direction.y, direction.z, direction.w);
    if (!text(renderer, 16, 720, value)) {
        return false;
    }
#else
    if (!text(renderer, 16, 720, "Arrows/PageUp/Down local XYZ | A/D model X, W/S Z, Q/E yaw, U/O scaleX | J/L camera yaw, I/K pitch, Z/X Z")) {
        return false;
    }
#endif
    if (!text(renderer, 16, 742, "[ ] FOV | -/= near | 9/0 far | near < far always | click selects a vertex | F debug/clean")) {
        return false;
    }
#if LAB_CHECKPOINT >= 7
    const char* state = "PAUSED";
    if (!scene.paused) {
        state = "ROTATING";
    }
    if (inspection.agreement) {
        std::snprintf(value, sizeof(value), "MVP agreement %.2e | %s | Space pause/resume, N step | w=depth, not a screen coordinate", *inspection.agreement, state);
    } else {
        std::snprintf(value, sizeof(value), "MVP agreement -- invalid input | %s", state);
    }
    if (!text(renderer, 16, 764, value)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
