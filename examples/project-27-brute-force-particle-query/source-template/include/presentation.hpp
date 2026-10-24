#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline bool drawLabels(SDL_Renderer* renderer, const Scene& scene) {
    bool okay = SDL_SetRenderDrawColor(renderer, 210, 223, 242, 255);
    const auto line = [&](float x, float y, const char* text) {
        okay = SDL_RenderDebugText(renderer, x, y, text) && okay;
    };
    char text[250]{};
    line(32, 25, "100,000 PARTICLES / BRUTE-FORCE LENS");
    std::snprintf(text, sizeof(text), "N = %zu | seed = %08x | every particle is drawn (overlap is possible)", scene.count, static_cast<unsigned>(scene.seed));
    line(32, 48, text);
    line(32, 765, "Gray: all points. Gold: all hits. Blue: query. Red: nearest (even outside radius).");
    line(32, 785, "No grid/tree/index. The particles are static; only the query moves.");
    if (!scene.debug) {
        line(32, 70, "F: show debug | Space: auto lens | R: reset | close window to exit");
        return okay;
    }
    line(690, 110, "R: reset | F: clean/debug | Esc: stop");
#if LAB_CHECKPOINT >= 1
    line(690, 136, "1/2/3: N=1k/10k/100k | P: seed");
#endif
#if LAB_CHECKPOINT >= 2
    std::snprintf(text, sizeof(text), "center=(%.3f, %.3f) R=%.3f", scene.query.center.x, scene.query.center.y, scene.query.radius);
    line(690, 170, text);
    line(690, 192, "Move mouse / drag: move query");
#if LAB_CHECKPOINT >= 6
    line(690, 214, "W/A/D/J: center | Up/Down: radius");
#else
    line(690, 214, "WASD: center | Up/Down: radius");
#endif
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT >= 4
    const auto& result = scene.workspace;
#else
    const auto& result = scene.readable;
#endif
    std::snprintf(text, sizeof(text), "scanned=%zu | hits=%zu", result.scanned, result.hitIndices.size());
    line(690, 250, text);
    std::snprintf(text, sizeof(text), "query = %.3f us (render excluded)", scene.queryMicroseconds);
    line(690, 272, text);
    if (scene.debug) {
        if (result.nearestIndex == kNoParticle) {
            std::snprintf(text, sizeof(text), "nearest: none (empty scan)");
        } else {
            std::snprintf(text, sizeof(text), "nearest index = %zu", result.nearestIndex);
        }
        line(690, 294, text);
    }
#if LAB_CHECKPOINT == 3
    line(690, 316, "Left/Right: scan prefix -/+ 10%");
#endif
#if LAB_CHECKPOINT == 4
    line(690, 316, scene.referenceMatches ? "sqrt / squared: complete hit lists MATCH" : "ERROR: results differ");
#endif
#endif
#if LAB_CHECKPOINT >= 5
    line(690, 360, "B: benchmark | Esc: cancel job");
    if (scene.job.active) {
        std::snprintf(text, sizeof(text), "job row=%zu warm-up=%zu/24 run=%zu/48", scene.job.row + 1, scene.job.warmup, scene.job.cursor);
        line(690, 384, text);
    }
    if (scene.benchmark.queryCount > 0) {
        const auto& batch = scene.benchmark;
        std::snprintf(text, sizeof(text), "N=%zu Q=%zu scans=%zu", scene.count, batch.queryCount, batch.totalScanned);
        line(690, 410, text);
        std::snprintf(text, sizeof(text), "%.3f us/query | checksum=%08x", batch.elapsedMicroseconds / static_cast<double>(batch.queryCount), static_cast<unsigned>(batch.checksum));
        line(690, 432, text);
    }
#endif
#if LAB_CHECKPOINT >= 6
    line(690, 470, "S: scaling / same 24 queries x 2");
    line(690, 494, "N       Q       scans       us/query");
    for (std::size_t index = 0; index < scene.rows.size(); ++index) {
        const auto& row = scene.rows[index];
        std::snprintf(text, sizeof(text), "%-7zu %-7zu %-11zu %.3f", row.particleCount, row.metrics.queryCount, row.metrics.totalScanned, row.metrics.elapsedMicroseconds / static_cast<double>(row.metrics.queryCount));
        line(690, 518 + static_cast<float>(index) * 28, text);
    }
    line(690, 616, "Timing is measured, not forced linear.");
    line(690, 638, "Exact work = N x Q, whatever radius.");
#endif
#if LAB_CHECKPOINT >= 7
    line(690, 686, scene.paused ? "Space: auto lens / N: one step" : "Space: pause / N: one step");
#endif
    return okay;
}
} // namespace lab
