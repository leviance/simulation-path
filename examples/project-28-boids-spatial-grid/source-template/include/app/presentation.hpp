#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// HUD phân biệt tiến độ công việc và số đo đã hoàn tất, không đo lại khi vẽ.
inline bool drawLabels(SDL_Renderer* renderer, const GridScene& scene) {
    if (!SDL_SetRenderDrawColor(renderer, 210, 223, 242, 255)) {
        return false;
    }
    const auto text = [renderer](float y, const char* value) {
        return SDL_RenderDebugText(renderer, 70, y, value);
    };
    if (!text(18, "PROJECT 28 / BOIDS + SPATIAL GRID / CPU")) {
        return false;
    }
    const char* method = "Brute";
    if (scene.method == Method::Grid) {
        method = "Grid";
    }
    char line[256]{};
    std::snprintf(line, sizeof(line), "N=%zu %s S=%.0f R=%.0f seed=%u %s step=%zu t=%.3fs | Space pause | N step | R reset", scene.count, method, scene.cellSize, scene.params.radius, scene.seed, layoutName(scene.layout), scene.steps, scene.time);
    if (!text(40, line)) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    std::snprintf(line, sizeof(line), "Selected ID=%u cell=%zu | cells=%zu candidates=%zu neighbors=%zu | drawn=%zu", scene.boids.at(scene.selected).id, selectedCell(scene), scene.inspectionQuery.cells.size(), scene.inspectionQuery.candidates.size(), scene.inspectionQuery.neighbors.size(), scene.drawn);
#else
    std::snprintf(line, sizeof(line), "Selected ID=%u | candidates=%zu neighbors=%zu drawn=%zu", scene.boids.at(scene.selected).id, scene.inspectionQuery.candidates.size(), scene.inspectionQuery.neighbors.size(), scene.drawn);
#endif
    if (!text(62, line)) {
        return false;
    }
    if (!text(686, "1/2/3: 256/1024/10000 | M Brute/Grid | [/] cell size | L layout | P seed | F clean/debug")) {
        return false;
    }
    if (!scene.debug) {
        return text(710, "F: show diagnostics. All simulation controls remain available.");
    }
    if (scene.benchmark.active || !scene.benchmark.rows.empty()) {
        std::snprintf(line, sizeof(line), "Benchmark %zu/%zu iteration=%zu/7 (2 warm-up + 5 samples) | F5/F6 page | Esc cancels", std::min(scene.benchmark.row + 1, scene.benchmark.cases.size()), scene.benchmark.cases.size(), scene.benchmark.iteration + 1);
        if (!text(708, line)) {
            return false;
        }
        const std::size_t first = scene.resultPage * 3;
        const std::size_t last = std::min(first + 3, scene.benchmark.rows.size());
        for (std::size_t index = first; index < last; ++index) {
            const auto& row = scene.benchmark.rows[index];
            const char* rowMethod = "Grid";
            if (row.config.method == Method::Brute) {
                rowMethod = "Brute";
            }
            std::snprintf(line, sizeof(line), "N=%zu %s S=%.0f total %.2f [%.2f..%.2f] B/Q/U %.2f/%.2f/%.2f ms candidates=%zu", row.config.count, rowMethod, row.config.cellSize, row.medianMs, row.minMs, row.maxMs, row.buildMs, row.queryMs, row.updateMs, row.candidates);
            if (!text(734 + static_cast<float>(index - first) * 24, line)) {
                return false;
            }
        }
        return true;
    }
    std::snprintf(line, sizeof(line), "Weights %.1f/%.1f/%.1f speed=%.0f accel=%.0f | Q/A W/S E/D T/G Y/H U/J | F3 cells F4 occupancy", scene.params.separationWeight, scene.params.alignmentWeight, scene.params.cohesionWeight, scene.params.maxSpeed, scene.params.maxAcceleration);
    if (!text(708, line)) {
        return false;
    }
    std::snprintf(line, sizeof(line), "Build=%.2f query=%.2f update=%.2f CPU=%.2f wall=%.2f ms | candidates=%zu neighbors=%zu", scene.metrics.buildMs, scene.metrics.queryMs, scene.metrics.updateMs, scene.metrics.totalMs, scene.metrics.wallMs, scene.metrics.candidates, scene.metrics.neighbors);
    if (!text(730, line)) {
        return false;
    }
    std::size_t occupancy = 0;
    std::size_t maximum = 0;
    if (scene.inspectionGrid) {
        occupancy = scene.inspectionGrid->occupiedCells;
        maximum = scene.inspectionGrid->maximumOccupancy;
    }
    std::size_t progress = 0;
    if (scene.step) {
        progress = scene.step->nextIndex;
    }
    std::snprintf(line, sizeof(line), "Busy=%zu/%zu occupied=%zu max/cell=%zu dropped=%.3fs | V validate | B scale | K cell study", progress, scene.count, occupancy, maximum, scene.droppedSeconds);
    if (!text(752, line)) {
        return false;
    }
    if (scene.validation.active || scene.validation.checked > 0) {
        const char* status = "stopped/done";
        if (scene.validation.active) {
            status = "running";
        }
        std::snprintf(line, sizeof(line), "Validation %zu/%zu failures=%zu tolerance=1e-9 | %s", scene.validation.checked, scene.validation.snapshot.size(), scene.validation.failures, status);
        return text(778, line);
    }
    return text(778, scene.notice.c_str());
}

inline bool presentFrame(SDL_Renderer* renderer, SDL_Texture* texture, const Framebuffer& image, const GridScene& scene, bool imageChanged) {
    if (imageChanged && !SDL_UpdateTexture(texture, nullptr, image.pixels.data(), Framebuffer::width * static_cast<int>(sizeof(std::uint32_t)))) {
        return false;
    }
    return SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) && SDL_RenderClear(renderer) && SDL_RenderTexture(renderer, texture, nullptr, nullptr) && drawLabels(renderer, scene) && SDL_RenderPresent(renderer);
}
} // namespace lab
