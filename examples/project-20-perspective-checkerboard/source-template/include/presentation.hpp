#pragma once
#include "render.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL trình bày framebuffer đã tô xong; debug text không tham gia texture mapping.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene, const RenderStats& stats) {
    if (!SDL_SetRenderDrawColor(renderer, 9, 15, 29, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 230, 240, 250, 255)) {
        return false;
    }
    int y = viewportHeight(scene, 640) + 8;
    const auto text = [&](const char* value) {
        const bool ok = SDL_RenderDebugText(renderer, 16, float(y), value);
        y += 20;
        return ok;
    };

    const char* label = "P20 STARTER | R reset | Esc quit";
#if LAB_CHECKPOINT >= 1
    label = "Drag / WASD tilt | 1-3 presets | wheel distance | R reset | Esc quit";
#endif
#if LAB_CHECKPOINT >= 6
    label = "M affine/correct | C compare | Drag/WASD tilt | 1-3 presets | R reset";
    const char* viewLabel = "AFFINE";
    if (!scene.compare && scene.corrected) {
        viewLabel = "PERSPECTIVE-CORRECT";
    }
    if (!SDL_RenderDebugText(renderer, 12, 12, viewLabel)) {
        return false;
    }
    if (scene.compare && !SDL_RenderDebugText(renderer, 498, 12, "PERSPECTIVE-CORRECT")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    label = "M A/B | C compare | F debug | Space pause/run | . step | 1-4 presets | R reset";
#endif
    if (!text(label)) {
        return false;
    }

    if (scene.debug) {
        char buffer[180]{};
        std::snprintf(buffer, sizeof(buffer), "Yaw %.3f  Pitch %.3f  Distance %.2f | triangles %zu | pixels %zu", scene.yaw, scene.pitch, scene.distance, stats.triangles, stats.covered);
        if (!text(buffer)) {
            return false;
        }
#if LAB_CHECKPOINT == 2
        const auto checker = makeCheckerTexture();
        const auto texel = nearestTexelIndex(checker, scene.sampleUv, scene.address);
        std::snprintf(buffer, sizeof(buffer), "J/L U %.2f | I/K V %.2f | texel %d,%d | T clamp/repeat", scene.sampleUv.x, scene.sampleUv.y, texel[0], texel[1]);
        if (!text(buffer)) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 4
        const auto& p = stats.inspection;
        if (!p.covered) {
            if (!text("Selected pixel outside quad; click a covered pixel.")) {
                return false;
            }
        } else {
            std::snprintf(buffer, sizeof(buffer), "lambda %.3f %.3f %.3f | Affine UV %.4f %.4f | Ray UV %.4f %.4f", p.weights[0], p.weights[1], p.weights[2], p.affineUv.x, p.affineUv.y, p.referenceUv.x, p.referenceUv.y);
            if (!text(buffer)) {
                return false;
            }
            std::snprintf(buffer, sizeof(buffer), "Affine error %.6f | texel %d,%d", uvDistance(p.affineUv, p.referenceUv), p.texel[0], p.texel[1]);
            if (!text(buffer)) {
                return false;
            }
#if LAB_CHECKPOINT >= 5
            std::snprintf(buffer, sizeof(buffer), "1/z denominator %.6f", p.denominator);
            if (!text(buffer)) {
                return false;
            }
#endif
#if LAB_CHECKPOINT >= 6
            std::snprintf(buffer, sizeof(buffer), "Corrected UV %.4f %.4f | reference error %.3e", p.correctedUv.x, p.correctedUv.y, uvDistance(p.correctedUv, p.referenceUv));
            if (!text(buffer)) {
                return false;
            }
#endif
        }
#endif
    }

    return SDL_RenderPresent(renderer);
}
} // namespace lab
