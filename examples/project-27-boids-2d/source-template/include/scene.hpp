#pragma once
#include "benchmark.hpp"

namespace lab {
struct Scene {
    Params params{};
    std::size_t count = 256;
    std::uint32_t seed = 1;
    std::vector<Boid> boids;
    std::vector<Boid> next;
    std::size_t selected{};
    bool paused = false;
    bool debug = true;
    double time{};
    double accumulator{};
    double droppedSeconds{};
    std::size_t steps{};
    Metrics metrics{};
#if LAB_CHECKPOINT >= 8
    BenchmarkJob job{};
#endif
};

inline void stopScene(Scene& scene) {
    scene.paused = true;
    scene.accumulator = 0;
#if LAB_CHECKPOINT >= 8
    scene.job.active = false;
#endif
}

inline void resetScene(Scene& scene) {
    scene.paused = true;
    scene.time = 0;
    scene.steps = 0;
    scene.accumulator = 0;
    scene.droppedSeconds = 0;
    scene.selected = 0;
    scene.metrics = {};
    scene.next.clear();
    scene.boids.clear();
#if LAB_CHECKPOINT <= 1
    scene.boids.push_back({0, {240, 300}, {scene.params.maxSpeed * 0.6, 0}});
#endif
#if LAB_CHECKPOINT >= 2
    scene.boids = makeFlock(scene.count, scene.seed, scene.params);
#endif
#if LAB_CHECKPOINT >= 8
    scene.job = {};
#endif
}

#if LAB_CHECKPOINT >= 0
// [snippet:stepScene]
inline void stepScene(Scene& scene) {
    scene.metrics = stepBoids(scene.boids, scene.next, scene.params, fixedDt);
    scene.boids.swap(scene.next);
    scene.time += fixedDt;
    ++scene.steps;
}
// [/snippet:stepScene]

// [snippet:advanceScene]
inline void advanceScene(Scene& scene, double elapsed) {
#if LAB_CHECKPOINT >= 8
    if (scene.job.active) {
        tickBenchmark(scene.job);
        return;
    }
#endif
    if (scene.paused) {
        return;
    }
    scene.accumulator += elapsed;
    const double budget = 3.0 * fixedDt;
    if (scene.accumulator > budget) {
        scene.droppedSeconds += scene.accumulator - budget;
        scene.accumulator = budget;
    }
    for (int count = 0; count < 3 && scene.accumulator + 1e-12 >= fixedDt; ++count) {
        stepScene(scene);
        scene.accumulator -= fixedDt;
    }
    scene.accumulator = std::max(0.0, scene.accumulator);
}
// [/snippet:advanceScene]
#endif
} // namespace lab
