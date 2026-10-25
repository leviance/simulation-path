#pragma once
// HUD tách số đo query/update/culling; present không tính vào thời gian query.
#include "controls.hpp"
#include "graphics/view.hpp"
#include <cstdio>

namespace maplab {
inline bool drawLabels(SDL_Renderer* renderer, const Scene& scene) {
    if (!SDL_SetRenderDrawColor(renderer, 210, 223, 242, 255))
        return false;
    const auto text = [renderer](float y, const char* value) {
        return SDL_RenderDebugText(renderer, 70, y, value);
    };
    if (!text(18, "PROJECT 29 / MAP EDITOR / AREA-BEARING AABBs + QUADTREE"))
        return false;
    char line[256]{};
    const char* method = "Brute";
    if (scene.document.useTree)
        method = "Tree";
    std::snprintf(line, sizeof(line), "N=%zu visible=%zu selected=%zu drawn=%zu | %s | tool=%s seed=%u zoom=%.3f", scene.document.tree.objects.size(), scene.visible.ids.size(), scene.document.selection.size(), scene.drawn, method, toolName(scene.tool), scene.seed, scene.camera.zoom);
    if (!text(40, line))
        return false;
    if (!scene.document.selection.empty()) {
        const auto id = *scene.document.selection.begin();
        const auto& box = scene.document.tree.objects.at(id).box;
        std::snprintf(line, sizeof(line), "Inspect ID=%u position=(%.1f,%.1f) size=(%.1f,%.1f) | camera=(%.1f,%.1f)", id, box.x, box.y, box.width, box.height, scene.camera.x, scene.camera.y);
    } else {
        std::snprintf(line, sizeof(line), "No selection | camera=(%.1f,%.1f) | Click topmost ID; drag rectangle to select by intersection", scene.camera.x, scene.camera.y);
    }
    if (!text(62, line))
        return false;
    if (!text(688, "1 Select | 2 Pan | 3 Move group | 4 Add | Wheel/+/- zoom | Home camera | C select viewport"))
        return false;
    if (!text(710, "R reset | P seed | L layout | F2 10k/100k | M Tree/Brute | [/] capacity | F debug | Esc cancel/exit"))
        return false;
    if (scene.benchmark.active || !scene.benchmark.rows.empty()) {
        std::snprintf(line, sizeof(line), "Benchmark iteration=%zu/7 query=%zu/16 | 2 warm-up, 5 samples | V reference | Esc cancel", std::min(scene.benchmark.iteration + 1, std::size_t{7}), scene.benchmark.queryIndex + 1);
        if (!text(732, line))
            return false;
        for (std::size_t index = 0; index < scene.benchmark.rows.size(); ++index) {
            const auto& row = scene.benchmark.rows[index];
            const char* name = "Brute";
            if (row.useTree)
                name = "Tree";
            std::snprintf(line, sizeof(line), "%s N=%zu Q=%zu median=%.3f [%.3f..%.3f] ms candidates=%zu checksum=%08x", name, row.objects, row.queries, row.medianMs, row.minimumMs, row.maximumMs, row.candidates, row.checksum);
            if (!text(754 + static_cast<float>(index) * 22, line))
                return false;
        }
        return true;
    }
    std::snprintf(line, sizeof(line), "Index %.2f ms / %zu nodes | culling %.2f ms / %zu tests / %zu visited / %zu pruned", scene.document.tree.buildMilliseconds, scene.document.tree.nodes.size(), scene.visible.milliseconds, scene.visible.candidates, scene.visible.visited.size(), scene.visible.pruned.size());
    if (!text(732, line))
        return false;
    std::snprintf(line, sizeof(line), "Update %s: %zu objects %.2f ms | Shift+arrows move 8 world | Del remove | A add at center | T type", scene.document.edit.action.c_str(), scene.document.edit.objects, scene.document.edit.milliseconds);
    if (!text(754, line))
        return false;
    if (scene.validation.tree) {
        std::snprintf(line, sizeof(line), "Validation %zu/%zu failures=%zu active=%d stale=%d", scene.validation.checked, scene.validation.boxes.size(), scene.validation.failures, static_cast<int>(scene.validation.active), static_cast<int>(scene.validation.stale));
        return text(778, line);
    }
    return text(778, scene.document.notice.c_str());
}

inline bool presentFrame(SDL_Renderer* renderer, SDL_Texture* texture, const Framebuffer& image, const Scene& scene, bool changed) {
    if (changed && !SDL_UpdateTexture(texture, nullptr, image.pixels.data(), Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))))
        return false;
    return SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) && SDL_RenderClear(renderer) && SDL_RenderTexture(renderer, texture, nullptr, nullptr) && drawLabels(renderer, scene) && SDL_RenderPresent(renderer);
}
} // namespace maplab
