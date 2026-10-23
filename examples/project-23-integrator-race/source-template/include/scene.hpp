#pragma once
#include "benchmark.hpp"
#include <deque>
#include <optional>

namespace lab {
inline constexpr std::array<double, 7> kStepSizes{0.25, 0.1, 1.0 / 15.0, 1.0 / 30.0, 1.0 / 60.0, 1.0 / 120.0, 1.0 / 240.0};
inline constexpr std::size_t kHistoryLimit = 1201;
enum class Graph { position,
                   error,
                   energy };

#if LAB_CHECKPOINT >= 6
struct HistorySample {
    double time = 0.0;
    double exactPosition = 0.0;
    std::array<double, 3> positions{};
    std::array<double, 3> errors{};
    std::array<double, 3> energies{};
};
#endif

struct Scene {
    OscillatorParameters parameters{};
    OscillatorState initial{2.5, 0.0, 0.0};
    std::array<IntegratorKind, 3> kinds = kDefaultKinds;
    IntegratorRace race = makeIntegratorRace(initial, kinds);
    std::optional<IntegratorRace> beforeLast;
    int dtIndex = 3;
    double elapsed = 0.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substeps = 0;
    int fastRemaining = 0;
    bool paused = true;
    bool debug = true;
    Graph graph = Graph::position;
    const char* warning = "";
#if LAB_CHECKPOINT >= 6
    std::deque<HistorySample> history;
#endif
#if LAB_CHECKPOINT >= 8
    BenchmarkJob benchmark;
    bool showBenchmark = false;
#endif
};

inline double fixedDelta(const Scene& scene) {
    return kStepSizes[static_cast<std::size_t>(scene.dtIndex)];
}

inline void stopJobs(Scene& scene) {
    scene.paused = true;
    scene.fastRemaining = 0;
#if LAB_CHECKPOINT >= 8
    scene.benchmark.running = false;
#endif
}

#if LAB_CHECKPOINT >= 6
inline void recordSample(Scene& scene) {
    HistorySample sample;
    sample.time = scene.elapsed;
    sample.exactPosition = analyticOscillatorState(scene.initial, scene.parameters, scene.elapsed).position;
    for (std::size_t index = 0; index < scene.race.lanes.size(); ++index) {
        const auto& state = scene.race.lanes[index].state;
        const auto metrics = integratorMetrics(state, scene.initial, scene.parameters);
        sample.positions[index] = state.position;
        sample.errors[index] = metrics.phaseSpaceError;
        sample.energies[index] = metrics.relativeEnergyDrift;
    }
    scene.history.push_back(sample);
    if (scene.history.size() > kHistoryLimit) {
        scene.history.pop_front();
    }
}
#endif

inline void resetExperiment(Scene& scene) {
    stopJobs(scene);
    scene.race = makeIntegratorRace(scene.initial, scene.kinds);
    scene.beforeLast.reset();
    scene.elapsed = 0.0;
    scene.accumulator = 0.0;
    scene.droppedTime = 0.0;
    scene.substeps = 0;
    scene.warning = "";
#if LAB_CHECKPOINT >= 6
    scene.history.clear();
    recordSample(scene);
#endif
#if LAB_CHECKPOINT >= 8
    scene.benchmark = {};
    scene.showBenchmark = false;
#endif
}

inline Scene makeScene() {
    Scene scene;
    resetExperiment(scene);
    return scene;
}

inline bool stepScene(Scene& scene) {
#if LAB_CHECKPOINT >= 1
    if (scene.warning[0] != '\0') {
        return false;
    }
    const double dt = fixedDelta(scene);
#if LAB_CHECKPOINT >= 2
    const IntegratorRace before = scene.race;
#if LAB_CHECKPOINT >= 5
    if (!stepIntegratorRace(scene.race, scene.parameters, dt)) {
        scene.warning = "Invalid numerical step: all lanes stopped.";
        stopJobs(scene);
        return false;
    }
#else
    // Các bài đầu chỉ chạy những phương pháp người học đã viết.
    auto next = scene.race;
#if LAB_CHECKPOINT >= 4
    constexpr std::size_t laneCount = 3;
#elif LAB_CHECKPOINT >= 3
    constexpr std::size_t laneCount = 2;
#else
    constexpr std::size_t laneCount = 1;
#endif
    for (std::size_t index = 0; index < laneCount; ++index) {
        const auto result = stepIntegrator(next.lanes[index].kind, next.lanes[index].state, scene.parameters, dt);
        if (result.forceEvaluations == 0) {
            scene.warning = "Invalid numerical step.";
            stopJobs(scene);
            return false;
        }
        next.lanes[index].state = result.state;
        next.lanes[index].forceEvaluations += static_cast<std::size_t>(result.forceEvaluations);
    }
    ++next.stepCount;
    scene.race = next;
#endif
    scene.beforeLast = before;
#endif
    scene.elapsed += dt;
    ++scene.substeps;
#if LAB_CHECKPOINT >= 6
    recordSample(scene);
#endif
    // Không clamp state vật lý để che việc Euler đang phân kỳ.
    for (const auto& lane : scene.race.lanes) {
        if (std::abs(lane.state.position) > 1e6 || std::abs(lane.state.velocity) > 1e6) {
            scene.warning = "Divergence exceeds safety range (1e6). Reset or reduce dt.";
            stopJobs(scene);
            return false;
        }
    }
    return true;
#else
    (void)scene;
    return false;
#endif
}

inline void advanceFrame(Scene& scene, double frameSeconds) {
    scene.substeps = 0;
#if LAB_CHECKPOINT >= 8
    if (scene.benchmark.running) {
        advanceBenchmark(scene.benchmark);
        return;
    }
#endif
    if (scene.fastRemaining > 0) {
        const int count = std::min(scene.fastRemaining, 128);
        for (int index = 0; index < count; ++index) {
            if (!stepScene(scene)) {
                return;
            }
            --scene.fastRemaining;
        }
        return;
    }
    if (scene.paused) {
        return;
    }
    const auto plan = planFixedSteps(scene.accumulator, frameSeconds, fixedDelta(scene), 32, 0.1);
    scene.accumulator = plan.remainder;
    scene.droppedTime += plan.droppedTime;
    for (int index = 0; index < plan.steps; ++index) {
        if (!stepScene(scene)) {
            return;
        }
    }
}

inline void setInitialPosition(Scene& scene, double position) {
    if (!std::isfinite(position)) {
        return;
    }
    scene.initial.position = std::clamp(position, -3.2, 3.2);
    resetExperiment(scene);
}

inline void setStepIndex(Scene& scene, int index) {
    scene.dtIndex = std::clamp(index, 0, static_cast<int>(kStepSizes.size()) - 1);
    resetExperiment(scene);
}

inline void cycleLane(Scene& scene, std::size_t index) {
#if LAB_CHECKPOINT >= 5
    if (index < scene.kinds.size()) {
        const auto kind = static_cast<std::size_t>(scene.kinds[index]);
        scene.kinds[index] = kDefaultKinds[(kind + 1) % kDefaultKinds.size()];
        resetExperiment(scene);
    }
#else
    (void)scene;
    (void)index;
#endif
}

inline void requestFastRun(Scene& scene) {
#if LAB_CHECKPOINT >= 6
    stopJobs(scene);
    if (scene.warning[0] == '\0') {
        scene.fastRemaining = static_cast<int>(std::lround(20.0 / fixedDelta(scene)));
    }
#else
    (void)scene;
#endif
}

inline void requestBenchmark(Scene& scene) {
#if LAB_CHECKPOINT >= 8
    stopJobs(scene);
    scene.showBenchmark = true;
    scene.benchmark = makeBenchmark({scene.parameters, scene.initial, fixedDelta(scene), 16, 5});
#else
    (void)scene;
#endif
}
} // namespace lab
