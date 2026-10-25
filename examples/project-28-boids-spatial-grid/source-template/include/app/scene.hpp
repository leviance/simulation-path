#pragma once
#include "grid/benchmark.hpp"
#include "grid/validation.hpp"
#include <string>

namespace lab {
struct GridScene {
    Params params{};
    std::vector<Boid> boids;
    std::size_t count = 256;
    std::uint32_t seed = 1;
    double cellSize = 64;
    Layout layout = Layout::Uniform;
    Method method = Method::Brute;
    std::size_t selected{};
    bool paused = true;
    bool debug = true;
    bool showCells = true;
    bool showOccupancy{};
    std::size_t steps{};
    double time{};
    double accumulator{};
    double droppedSeconds{};
    std::optional<StepJob> step;
    GridBenchmark benchmark{};
    ValidationJob validation{};
    GridMetrics metrics{};
    std::optional<Grid> inspectionGrid;
    GridQuery inspectionQuery;
    bool inspectionDirty = true;
    std::size_t drawn{};
    std::size_t resultPage{};
    std::string notice = "Paused. N: one complete step. Same rules as Project 27.";
};

#if LAB_CHECKPOINT >= 1
// [snippet:selectedCell]
inline std::size_t selectedCell(const GridScene& scene) {
    const auto geometry = gridGeometry(scene.params, scene.cellSize);
    return gridAddress(scene.boids.at(scene.selected).position, geometry);
}

// [/snippet:selectedCell]
#endif

inline void stopScene(GridScene& scene) {
    scene.paused = true;
    scene.accumulator = 0;
    if (scene.step) {
        cancelStep(*scene.step);
    }
    scene.step.reset();
    cancelBenchmark(scene.benchmark);
    scene.validation.active = false;
}

inline void invalidateModel(GridScene& scene) {
    stopScene(scene);
    scene.inspectionDirty = true;
    scene.metrics = {};
    scene.benchmark = {};
    scene.validation = {};
}

inline void resetScene(GridScene& scene) {
    invalidateModel(scene);
#if LAB_CHECKPOINT >= 5
    scene.method = Method::Grid;
#endif
    scene.boids = makeDataset(scene.count, scene.seed, scene.params, scene.layout);
    scene.selected = 0;
    scene.steps = 0;
    scene.time = 0;
    scene.droppedSeconds = 0;
    scene.inspectionGrid.reset();
    scene.inspectionQuery = {};
    scene.notice = "Reset by seed. No trajectory is stored or replayed.";
}

inline void refreshInspection(GridScene& scene) {
    if (!scene.inspectionDirty) {
        return;
    }
    scene.inspectionQuery = {};
    findNeighbors(scene.boids, scene.selected, scene.params, scene.inspectionQuery.neighbors);
#if LAB_CHECKPOINT >= 2
    scene.inspectionGrid = buildGrid(scene.boids, scene.params, scene.cellSize);
#endif
#if LAB_CHECKPOINT >= 3
    const auto& grid = *scene.inspectionGrid;
    const auto point = scene.boids.at(scene.selected).position;
    const auto columns = axisCells(point.x, scene.params.radius, grid.width, grid.cellSize);
    const auto rows = axisCells(point.y, scene.params.radius, grid.height, grid.cellSize);
    for (std::size_t row : rows) {
        for (std::size_t column : columns) {
            scene.inspectionQuery.cells.push_back(row * grid.columns + column);
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    queryGrid(scene.boids, scene.selected, scene.params, *scene.inspectionGrid, scene.inspectionQuery);
#endif
    scene.inspectionDirty = false;
}

// [snippet:requestStep]
inline void requestStep(GridScene& scene) {
    stopScene(scene);
    scene.step = createStep(scene.boids, scene.params, scene.cellSize, scene.method);
}

inline void advanceScene(GridScene& scene, double elapsed) {
#if LAB_CHECKPOINT >= 9
    if (scene.benchmark.active) {
        tickGridBenchmark(scene.benchmark);
        return;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (scene.validation.active) {
        tickValidation(scene.validation);
        return;
    }
#endif
    if (!scene.paused) {
        scene.accumulator += elapsed;
        if (scene.accumulator > fixedDt) {
            scene.droppedSeconds += scene.accumulator - fixedDt;
            scene.accumulator = fixedDt;
        }
        if (!scene.step && scene.accumulator + 1e-12 >= fixedDt) {
            scene.step = createStep(scene.boids, scene.params, scene.cellSize, scene.method);
        }
    }
    if (scene.step && advanceStep(*scene.step)) {
        // Không công bố output dở: cả N cá thể đã đọc cùng snapshot cũ.
        scene.boids.swap(scene.step->output);
        scene.metrics = scene.step->metrics;
        scene.step.reset();
        ++scene.steps;
        scene.time += fixedDt;
        scene.accumulator = std::max(0.0, scene.accumulator - fixedDt);
        scene.inspectionDirty = true;
    }
}

// [/snippet:requestStep]
} // namespace lab
