#pragma once
#include "viewer.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// HUD là phần trình bày; không tham gia parser hoặc software rasterizer.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const ViewerState& state, const ViewerStats& stats, double renderMs, const ViewerModel& model) {
    (void)model;
    const SDL_FRect viewport{0.0F, 0.0F, 800.0F, 500.0F};
    if (!SDL_SetRenderDrawColor(renderer, 9, 15, 29, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, &viewport) || !SDL_SetRenderDrawColor(renderer, 225, 235, 247, 255)) {
        return false;
    }

    const char* controls = "Drag/arrows model | Space pause | . step | R reset | F debug | Esc quit";
#if LAB_CHECKPOINT >= 8
    controls = "1 cube  2 sphere  3 rocket | V model/camera | W wire | N normals | F debug";
#endif
    if (!SDL_RenderDebugText(renderer, 12, 512, controls)) {
        return false;
    }

    if (state.debug) {
        char text[280]{};
        const char* target = "MODEL";
        if (state.cameraDrag) {
            target = "CAMERA ORBIT";
        }
        std::snprintf(text, sizeof(text), "%s | distance %.2f | raster %zu pass %zu reject %zu | CPU %.2f ms", target, state.distance, stats.triangles, stats.passed, stats.rejected, renderMs);
        if (!SDL_RenderDebugText(renderer, 12, 534, text)) {
            return false;
        }
#if LAB_CHECKPOINT >= 1
        std::snprintf(text, sizeof(text), "v %zu | source face %zu | triangle %zu | ignored metadata %zu", model.mesh.positions.size(), model.sourceFaces, model.mesh.triangles.size(), model.ignoredRecords);
        if (!SDL_RenderDebugText(renderer, 12, 556, text)) {
            return false;
        }
        std::snprintf(text, sizeof(text), "%.92s", model.path.c_str());
        if (!SDL_RenderDebugText(renderer, 12, 578, text)) {
            return false;
        }
#endif
    }
#if LAB_CHECKPOINT >= 1
    if (!model.message.empty()) {
        // Lỗi vẫn hiện khi tắt debug; đầy đủ path/line được in ra stderr.
        if (!SDL_SetRenderDrawColor(renderer, 255, 130, 130, 255) || !SDL_RenderDebugText(renderer, 12, 16, "OBJ load failed. Previous model kept; see terminal for path/line.")) {
            return false;
        }
    }
#endif

    return SDL_RenderPresent(renderer);
}
} // namespace lab
