#pragma once
#include "lab.hpp"
#include <string>
#include <vector>

namespace lab {
inline constexpr double kStepOptions[]{1.0 / 30.0, 1.0 / 60.0, 1.0 / 120.0, 1.0 / 240.0, 1.0 / 480.0, 1.0 / 960.0};
inline constexpr int kMaximumSubsteps = 32;

#if LAB_CHECKPOINT >= 3
struct HistorySample {
    double time{};
    double energyErrorA{};
#if LAB_CHECKPOINT >= 4
    double energyErrorB{};
#endif
#if LAB_CHECKPOINT >= 5
    double physical{};
#endif
#if LAB_CHECKPOINT >= 6
    double numerical{};
    double energyErrorReference{};
#endif
};
#endif

struct Scene {
    DoublePendulumParameters parameters{};
    DoublePendulumState initial{2.0, 0.0, 1.1, 0.0, 0.0};
    bool paused{true};
    bool debug{true};
    std::string message{};
#if LAB_CHECKPOINT >= 3
    int dtIndex{3};
    double accumulator{};
    double droppedTime{};
    int substeps{};
    std::size_t steps{};
    double initialEnergyA{};
    double maximumEnergyErrorA{};
    std::vector<HistorySample> history{};
#endif
#if LAB_CHECKPOINT >= 6
    ChaosExperiment experiment{};
#elif LAB_CHECKPOINT >= 4
    TwinPendulums twins{};
#elif LAB_CHECKPOINT >= 3
    DoublePendulumState single{};
#endif
#if LAB_CHECKPOINT >= 4
    double perturbation{1e-4};
    double initialEnergyB{};
    double maximumEnergyErrorB{};
    std::vector<Vec2> trailA{};
    std::vector<Vec2> trailB{};
#endif
#if LAB_CHECKPOINT >= 6
    double maximumEnergyErrorReference{};
    int fastRemaining{};
#endif
#if LAB_CHECKPOINT >= 7
    ChaosPreset preset{ChaosPreset::chaotic};
    bool dragging{};
    double dragOffset{};
#endif
};

inline const DoublePendulumState& primaryState(const Scene& scene) {
#if LAB_CHECKPOINT >= 6
    return scene.experiment.twins.primary;
#elif LAB_CHECKPOINT >= 4
    return scene.twins.primary;
#elif LAB_CHECKPOINT >= 3
    return scene.single;
#else
    return scene.initial;
#endif
}

#if LAB_CHECKPOINT >= 4
inline const DoublePendulumState& perturbedState(const Scene& scene) {
#if LAB_CHECKPOINT >= 6
    return scene.experiment.twins.perturbed;
#else
    return scene.twins.perturbed;
#endif
}
#endif

inline void stopScene(Scene& scene) {
    scene.paused = true;
#if LAB_CHECKPOINT >= 3
    scene.accumulator = 0.0;
    scene.substeps = 0;
#endif
#if LAB_CHECKPOINT >= 6
    scene.fastRemaining = 0;
#endif
#if LAB_CHECKPOINT >= 7
    scene.dragging = false;
#endif
}

#if LAB_CHECKPOINT >= 3
// Mẫu lấy theo thời gian physics. Bước đơn/cuối job có thể thêm một endpoint.
inline void recordHistory(Scene& scene, bool force = false) {
    const auto& primary = primaryState(scene);
    if (!scene.history.empty()) {
        const double interval = primary.elapsed - scene.history.back().time;
        if (interval <= 1e-12 || (!force && interval < 0.04 - 1e-12)) {
            return;
        }
    }
    HistorySample sample{};
    sample.time = primary.elapsed;
    sample.energyErrorA = pendulumEnergy(primary, scene.parameters) - scene.initialEnergyA;
#if LAB_CHECKPOINT >= 4
    sample.energyErrorB = pendulumEnergy(perturbedState(scene), scene.parameters) - scene.initialEnergyB;
    scene.trailA.push_back(pendulumGeometry(primary, scene.parameters).bob2);
    scene.trailB.push_back(pendulumGeometry(perturbedState(scene), scene.parameters).bob2);
    if (scene.trailA.size() > 751) {
        scene.trailA.erase(scene.trailA.begin());
        scene.trailB.erase(scene.trailB.begin());
    }
#endif
#if LAB_CHECKPOINT >= 5
    sample.physical = phaseSpaceSeparation(primary, perturbedState(scene), scene.parameters);
#endif
#if LAB_CHECKPOINT >= 6
    sample.numerical = phaseSpaceSeparation(primary, scene.experiment.halfStepReference, scene.parameters);
    sample.energyErrorReference = pendulumEnergy(scene.experiment.halfStepReference, scene.parameters) - scene.initialEnergyA;
#endif
    scene.history.push_back(sample);
    if (scene.history.size() > 751) {
        scene.history.erase(scene.history.begin());
    }
}
#endif

// Đổi điều kiện đầu/dt bắt đầu lại phép đo, không ghép dữ liệu hai thí nghiệm.
inline void resetScene(Scene& scene) {
    stopScene(scene);
    scene.initial.elapsed = 0.0;
    scene.message.clear();
#if LAB_CHECKPOINT >= 6
    scene.experiment = makeChaosExperiment(scene.initial, scene.perturbation);
#elif LAB_CHECKPOINT >= 4
    scene.twins = makeTwinPendulums(scene.initial, scene.perturbation);
#elif LAB_CHECKPOINT >= 3
    scene.single = scene.initial;
#endif
#if LAB_CHECKPOINT >= 3
    scene.steps = 0;
    scene.droppedTime = 0.0;
    scene.maximumEnergyErrorA = 0.0;
    scene.initialEnergyA = pendulumEnergy(primaryState(scene), scene.parameters);
    scene.history.clear();
#endif
#if LAB_CHECKPOINT >= 4
    scene.initialEnergyB = pendulumEnergy(perturbedState(scene), scene.parameters);
    scene.maximumEnergyErrorB = 0.0;
    scene.trailA.clear();
    scene.trailB.clear();
#endif
#if LAB_CHECKPOINT >= 6
    scene.maximumEnergyErrorReference = 0.0;
#endif
#if LAB_CHECKPOINT >= 3
    recordHistory(scene, true);
#endif
}

inline Scene makeScene() {
    Scene scene{};
    resetScene(scene);
    return scene;
}

#if LAB_CHECKPOINT >= 3
inline bool withinExperiment(const DoublePendulumState& state) {
    return finiteState(state) && std::abs(state.omega1) <= 10000.0 && std::abs(state.omega2) <= 10000.0;
}

inline bool stepScene(Scene& scene) {
    if (scene.dtIndex < 0 || scene.dtIndex >= 6) {
        stopScene(scene);
        scene.message = "Stopped: invalid dt index.";
        return false;
    }
    const double dt = kStepOptions[scene.dtIndex];
    bool accepted = false;
#if LAB_CHECKPOINT >= 6
    ChaosExperiment candidate = scene.experiment;
    accepted = stepChaosExperiment(candidate, scene.parameters, dt);
    accepted = accepted && withinExperiment(candidate.twins.primary) && withinExperiment(candidate.twins.perturbed) && withinExperiment(candidate.halfStepReference) && measureChaos(candidate, scene.parameters).finite;
    if (accepted) {
        scene.experiment = candidate;
    }
#elif LAB_CHECKPOINT >= 4
    TwinPendulums candidate = scene.twins;
    accepted = stepTwinPendulums(candidate, scene.parameters, dt);
    accepted = accepted && withinExperiment(candidate.primary) && withinExperiment(candidate.perturbed) && std::isfinite(pendulumEnergy(candidate.primary, scene.parameters)) && std::isfinite(pendulumEnergy(candidate.perturbed, scene.parameters));
    if (accepted) {
        scene.twins = candidate;
    }
#else
    const DoublePendulumState candidate = stepRk4(scene.single, scene.parameters, dt);
    accepted = candidate.elapsed > scene.single.elapsed && withinExperiment(candidate) && std::isfinite(pendulumEnergy(candidate, scene.parameters));
    if (accepted) {
        scene.single = candidate;
    }
#endif
    if (!accepted) {
        stopScene(scene);
        scene.message = "Stopped: invalid, non-finite or unsafe step. Reduce dt or reset; state was not clamped.";
        return false;
    }
    ++scene.steps;
    ++scene.substeps;
    scene.maximumEnergyErrorA = std::max(scene.maximumEnergyErrorA, std::abs(pendulumEnergy(primaryState(scene), scene.parameters) - scene.initialEnergyA));
#if LAB_CHECKPOINT >= 4
    scene.maximumEnergyErrorB = std::max(scene.maximumEnergyErrorB, std::abs(pendulumEnergy(perturbedState(scene), scene.parameters) - scene.initialEnergyB));
#endif
#if LAB_CHECKPOINT >= 6
    scene.maximumEnergyErrorReference = std::max(scene.maximumEnergyErrorReference, std::abs(pendulumEnergy(scene.experiment.halfStepReference, scene.parameters) - scene.initialEnergyA));
#endif
    recordHistory(scene);
    return true;
}

inline void singleStep(Scene& scene) {
    stopScene(scene);
    stepScene(scene);
    recordHistory(scene, true);
}
#endif

#if LAB_CHECKPOINT >= 7
inline void choosePreset(Scene& scene, ChaosPreset preset) {
    scene.preset = preset;
    scene.initial = presetState(preset);
    resetScene(scene);
}

#endif
#if LAB_CHECKPOINT >= 6

inline void requestFast(Scene& scene, double duration = 10.0) {
    stopScene(scene);
    if (scene.dtIndex < 0 || scene.dtIndex >= 6 || !std::isfinite(duration) || duration <= 0.0 || duration > 30.0) {
        scene.message = "Stopped: invalid dt index.";
        return;
    }
    const double dt = kStepOptions[scene.dtIndex];
    scene.fastRemaining = static_cast<int>(std::lround(duration / dt));
}

#endif
#if LAB_CHECKPOINT >= 7

// Kéo chỉ đặt lại theta2 ban đầu; không phải tác động lực lên hệ đang chạy.
inline bool beginAngleDrag(Scene& scene, Vec2 pointer, double hitRadius) {
    if (!std::isfinite(pointer.x) || !std::isfinite(pointer.y) || !std::isfinite(hitRadius) || hitRadius <= 0.0 || !finiteState(primaryState(scene)) || !validParameters(scene.parameters)) {
        return false;
    }
    const auto geometry = pendulumGeometry(primaryState(scene), scene.parameters);
    if (length(subtract(pointer, geometry.bob2)) > hitRadius) {
        return false;
    }
    const Vec2 delta = subtract(pointer, geometry.bob1);
    if (length(delta) <= 1e-12) {
        return false;
    }
    const double pointerAngle = std::atan2(delta.x, -delta.y);
    scene.initial = primaryState(scene);
    scene.initial.theta1 = wrapAngle(scene.initial.theta1);
    scene.initial.theta2 = wrapAngle(scene.initial.theta2);
    scene.initial.omega1 = 0.0;
    scene.initial.omega2 = 0.0;
    const double offset = scene.initial.theta2 - pointerAngle;
    resetScene(scene);
    scene.dragging = true;
    scene.dragOffset = offset;
    return true;
}

inline void moveAngleDrag(Scene& scene, Vec2 pointer) {
    if (!scene.dragging || !std::isfinite(pointer.x) || !std::isfinite(pointer.y)) {
        return;
    }
    const auto geometry = pendulumGeometry(scene.initial, scene.parameters);
    const Vec2 delta = subtract(pointer, geometry.bob1);
    if (length(delta) <= 0.1) {
        return;
    }
    const double angle = std::atan2(delta.x, -delta.y) + scene.dragOffset;
    scene.initial.theta2 = wrapAngle(angle);
    const double offset = scene.dragOffset;
    resetScene(scene);
    scene.dragging = true;
    scene.dragOffset = offset;
}
#endif

#if LAB_CHECKPOINT >= 3
inline void advanceFrame(Scene& scene, double frameSeconds) {
    scene.substeps = 0;
    if (scene.dtIndex < 0 || scene.dtIndex >= 6) {
        stopScene(scene);
        scene.message = "Stopped: invalid dt index.";
        return;
    }
#if LAB_CHECKPOINT >= 6
    if (scene.fastRemaining > 0) {
        const int batch = std::min(kMaximumSubsteps, scene.fastRemaining);
        for (int i = 0; i < batch; ++i) {
            if (!stepScene(scene)) {
                break;
            }
            --scene.fastRemaining;
        }
        if (scene.fastRemaining == 0) {
            recordHistory(scene, true);
        }
        return;
    }
#endif
    if (scene.paused) {
        return;
    }
    const auto plan = planFixedSteps(scene.accumulator, frameSeconds, kStepOptions[scene.dtIndex], kMaximumSubsteps, 0.1);
    scene.accumulator = plan.remainder;
    scene.droppedTime += plan.droppedTime;
    for (int i = 0; i < plan.steps; ++i) {
        if (!stepScene(scene)) {
            break;
        }
    }
}
#endif
} // namespace lab
