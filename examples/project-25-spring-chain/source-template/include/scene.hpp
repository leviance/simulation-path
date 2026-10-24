#pragma once
#include "lab.hpp"
#include "metrics.hpp"
#include <string>
#include <vector>

namespace lab {
inline constexpr double kStepOptions[]{1.0 / 960.0, 1.0 / 480.0, 1.0 / 240.0, 1.0 / 120.0, 1.0 / 30.0};

struct EnergySample {
    double time{};
    double kinetic{};
    double elastic{};
    double gravity{};
    double total{};
};

struct Scene {
    SpringChain chain{};
    int count{32};
    double stiffness{120.0};
    double mass{0.04};
    double damping{0.24};
    double restLength{0.22};
    Vec2 gravity{0.0, -9.81};
    bool gravityEnabled{false};
    bool dampingEnabled{false};
    bool debug{true};
    bool paused{true};
    int dtIndex{1};
    double accumulator{};
    double elapsed{};
    double droppedTime{};
    int steps{};
    int substeps{};
    int fastRemaining{};
    std::size_t selected{16};
    double pairDistance{1.2};
    double pairAngle{};
    std::string message{};
#if LAB_CHECKPOINT >= 4
    Particle traceBefore{};
    Particle traceAfter{};
    bool hasTrace{};
#endif
#if LAB_CHECKPOINT >= 6
    DragConstraint drag{};
#endif
#if LAB_CHECKPOINT >= 7
    ChainMetrics metrics{};
#endif
#if LAB_CHECKPOINT >= 8
    double initialEnergy{};
    std::vector<EnergySample> history{};
#endif
};

inline void stopScene(Scene& scene) {
    scene.paused = true;
    scene.fastRemaining = 0;
    scene.accumulator = 0.0;
}

inline void refreshMetrics(Scene& scene) {
#if LAB_CHECKPOINT >= 7
    scene.metrics = measureChain(scene.chain, scene.gravity, scene.gravityEnabled);
#else
    static_cast<void>(scene);
#endif
}
#if LAB_CHECKPOINT >= 8
inline void recordEnergy(Scene& scene, bool force = false) {
    if (!scene.history.empty()) {
        const double interval = scene.elapsed - scene.history.back().time;
        if (interval <= 1e-12 || (!force && interval < 1.0 / 60.0 - 1e-12)) {
            return;
        }
    }
    const auto& m = scene.metrics;
    scene.history.push_back({scene.elapsed, m.kineticEnergy, m.springEnergy, m.gravitationalEnergy, totalMechanicalEnergy(m)});
    if (scene.history.size() > 1201) {
        scene.history.erase(scene.history.begin());
    }
}
#endif
// Một can thiệp từ ngoài bắt đầu đoạn đo mới, không trộn hai hệ khác nhau.
inline void beginMeasurement(Scene& scene) {
    scene.accumulator = 0.0;
    scene.elapsed = 0.0;
    scene.steps = 0;
    scene.substeps = 0;
    scene.droppedTime = 0.0;
    scene.fastRemaining = 0;
    refreshMetrics(scene);
#if LAB_CHECKPOINT >= 4
    scene.hasTrace = false;
#endif
#if LAB_CHECKPOINT >= 8
    scene.initialEnergy = totalMechanicalEnergy(scene.metrics);
    scene.history.clear();
    recordEnergy(scene);
#endif
}

inline void rebuildScene(Scene& scene) {
    stopScene(scene);
    scene.message.clear();
#if LAB_CHECKPOINT >= 6
    scene.drag = {};
#endif
#if LAB_CHECKPOINT >= 1
    scene.chain = makeVerticalChain(static_cast<std::size_t>(scene.count), {0.0, 0.0}, scene.restLength, scene.mass, 0.10, scene.stiffness, scene.damping);
#if LAB_CHECKPOINT == 2
    scene.chain = makeVerticalChain(2, {0.0, 0.0}, 1.0, scene.mass, 0.10, scene.stiffness, scene.damping);
    scene.selected = 1;
    scene.chain.particles[1].position = {scene.pairDistance * std::cos(scene.pairAngle), scene.pairDistance * std::sin(scene.pairAngle)};
#endif
#if LAB_CHECKPOINT >= 3
    scene.selected = scene.chain.particles.size() / 2;
    scene.chain.particles[scene.selected].position.x += 0.35;
#endif
#endif
    beginMeasurement(scene);
#if LAB_CHECKPOINT == 3
    accumulateElasticForces(scene.chain, scene.gravity, scene.gravityEnabled);
#endif
}

inline Scene makeScene() {
    Scene scene{};
#if LAB_CHECKPOINT >= 3
    scene.gravityEnabled = true;
#endif
#if LAB_CHECKPOINT >= 5
    scene.dampingEnabled = true;
#endif
    rebuildScene(scene);
    return scene;
}
#if LAB_CHECKPOINT >= 4
// Giới hạn thí nghiệm dừng với thông báo. Không clamp state để che mất ổn định.
inline bool withinExperiment(const SpringChain& chain) {
    if (!validChain(chain)) {
        return false;
    }
    for (const auto& particle : chain.particles) {
        if (std::abs(particle.position.x) > 1000.0 || std::abs(particle.position.y) > 1000.0 || length(particle.velocity) > 10000.0) {
            return false;
        }
    }
    return true;
}

inline bool stepScene(Scene& scene) {
    if (scene.dtIndex < 0 || scene.dtIndex >= 5 || scene.selected == 0 || scene.selected >= scene.chain.particles.size()) {
        stopScene(scene);
        scene.message = "Invalid dt index.";
        return false;
    }
    SpringChain candidate = scene.chain;
    bool accepted = false;
#if LAB_CHECKPOINT >= 6
    // Đặt c=0 ở candidate khi tắt damping; không đổi hệ số được lưu trong Scene.
    if (!scene.dampingEnabled) {
        for (auto& spring : candidate.springs) {
            spring.damping = 0.0;
        }
    }
    accepted = stepDampedChainWithDrag(candidate, kStepOptions[scene.dtIndex], scene.gravity, scene.gravityEnabled, scene.drag);
    for (auto& spring : candidate.springs) {
        spring.damping = scene.damping;
    }
#elif LAB_CHECKPOINT >= 5
    if (scene.dampingEnabled) {
        accepted = stepDampedChain(candidate, kStepOptions[scene.dtIndex], scene.gravity, scene.gravityEnabled);
    } else {
        accepted = stepElasticChain(candidate, kStepOptions[scene.dtIndex], scene.gravity, scene.gravityEnabled);
    }
#else
    accepted = stepElasticChain(candidate, kStepOptions[scene.dtIndex], scene.gravity, scene.gravityEnabled);
#endif
    if (!accepted || !withinExperiment(candidate)) {
        stopScene(scene);
        scene.message = "Experiment stopped: invalid/degenerate state or envelope exceeded. Reset or reduce dt.";
        return false;
    }
    scene.traceBefore = scene.chain.particles[scene.selected];
    scene.traceAfter = candidate.particles[scene.selected];
    scene.hasTrace = true;
    scene.chain = std::move(candidate);
    ++scene.steps;
    ++scene.substeps;
    scene.elapsed = double(scene.steps) * kStepOptions[scene.dtIndex];
    refreshMetrics(scene);
#if LAB_CHECKPOINT >= 8
    recordEnergy(scene);
#endif
    return true;
}

inline void advanceFrame(Scene& scene, double frameSeconds) {
    if (scene.dtIndex < 0 || scene.dtIndex >= 5) {
        stopScene(scene);
        return;
    }
    scene.substeps = 0;
#if LAB_CHECKPOINT >= 8
    if (scene.fastRemaining > 0) {
        const int batch = std::min(32, scene.fastRemaining);
        for (int i = 0; i < batch; ++i) {
            if (!stepScene(scene)) {
                return;
            }
            --scene.fastRemaining;
            if (scene.fastRemaining == 0) {
                recordEnergy(scene, true);
            }
        }
        return;
    }
#endif
    if (scene.paused) {
        return;
    }
    const auto plan = planFixedSteps(scene.accumulator, frameSeconds, kStepOptions[scene.dtIndex], 32, 0.05);
    scene.accumulator = plan.remainder;
    scene.droppedTime += plan.droppedTime;
    for (int i = 0; i < plan.steps; ++i) {
        if (!stepScene(scene)) {
            break;
        }
    }
}
#endif
#if LAB_CHECKPOINT >= 6
inline void cancelGesture(Scene& scene) {
    if (!scene.drag.active) {
        return;
    }
    if (scene.drag.active && scene.drag.particleIndex < scene.chain.particles.size()) {
        scene.chain.particles[scene.drag.particleIndex].velocity = {};
    }
    scene.drag = {};
    beginMeasurement(scene);
}
#endif
#if LAB_CHECKPOINT >= 7
inline void applyPreset(Scene& scene, int preset) {
    scene = makeScene();
    if (preset == 1 || preset == 2) {
        scene.gravityEnabled = false;
        scene.dampingEnabled = preset == 2;
    }
    if (preset == 3) {
        scene.gravityEnabled = false;
        scene.dampingEnabled = false;
        scene.stiffness = 1200.0;
        scene.mass = 0.02;
        scene.dtIndex = 4;
    }
    rebuildScene(scene);
}
#endif
#if LAB_CHECKPOINT >= 8
inline void requestFastRun(Scene& scene) {
    stopScene(scene);
    scene.fastRemaining = static_cast<int>(std::lround(20.0 / kStepOptions[scene.dtIndex]));
}
#endif
} // namespace lab
