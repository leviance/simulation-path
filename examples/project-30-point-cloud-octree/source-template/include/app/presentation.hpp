#pragma once
// HUD ASCII; hướng dẫn tiếng Việt và đơn vị được trình bày đầy đủ trong README.
#include "controls.hpp"
#include "view/render.hpp"

namespace survey {
inline void hud(SDL_Renderer* renderer, const Scene& scene, const Job& job) {
    SDL_SetRenderDrawColor(renderer, 205, 219, 231, 255);
    SDL_RenderDebugTextFormat(renderer, 12, 590, "POINT CLOUD SURVEY | N=%zu selected=%zu visible=%zu drawn=%zu | nodes=%zu", scene.points.size(), scene.selected.indices.size(), scene.visible.indices.size(), scene.drawn, scene.tree.nodes.size());
    SDL_RenderDebugTextFormat(renderer, 12, 610, "build=%.3fms query=%.3fms culling=%.3fms render=%.3fms | point+tree backing=%.2f MiB", scene.tree.buildMilliseconds, scene.selected.milliseconds, scene.visible.milliseconds, scene.renderMilliseconds, double(scene.points.capacity() * sizeof(Point) + scene.tree.allocatedBytes()) / (1024 * 1024));
    SDL_RenderDebugTextFormat(renderer, 12, 630, "query candidates=%zu visited=%zu pruned=%zu | height=[%.2f,%.2f]m", scene.selected.candidates, scene.selected.visited.size(), scene.selected.pruned.size(), scene.region.minimumHeight, scene.region.maximumHeight);
    if (scene.summary.count > 0) {
        const Vec3 p = scene.summary.centroid;
        SDL_RenderDebugTextFormat(renderer, 12, 650, "centroid=(%.4f,%.4f,%.4f)m min=(%.3f,%.3f,%.3f) max=(%.3f,%.3f,%.3f)", p.x, p.y, p.z, scene.summary.bounds.minimum.x, scene.summary.bounds.minimum.y, scene.summary.bounds.minimum.z, scene.summary.bounds.maximum.x, scene.summary.bounds.maximum.y, scene.summary.bounds.maximum.z);
    } else {
        SDL_RenderDebugText(renderer, 12, 650, "No statistics: empty selection (or lesson < 07).");
    }
    SDL_RenderDebugText(renderer, 12, 673, "Drag: orbit | Right drag: pan | wheel: zoom | F: orbit/fly | WASD/QE: move | Home: frame dataset");
    SDL_RenderDebugText(renderer, 12, 693, "1/2: box/sphere | J/L I/K U/O: region X/Y/Z | [ ]: size | Delete: clear selection | X: export CSV");
    SDL_RenderDebugText(renderer, 12, 713, "H: height filter | PgUp/PgDn: max Y (Shift: min Y) | C: culling | T: nodes | M: Tree/Brute");
    SDL_RenderDebugText(renderer, 12, 733, "V: validate | B: benchmark | Space: pause/resume job | R: reopen | N: room/uniform | Esc: cancel/exit");
    SDL_RenderDebugTextFormat(renderer, 12, 755, "%s | %s", scene.origin.c_str(), scene.notice.c_str());
    if (job.active) {
        SDL_RenderDebugTextFormat(renderer, 12, 775, "Job query %zu/%zu iteration %zu/7; paused=%d", job.queryIndex, job.regions.size(), job.iteration, int(job.paused));
    } else if (!job.report.empty()) {
        SDL_RenderDebugText(renderer, 12, 775, job.report.c_str());
    }
}
} // namespace survey
