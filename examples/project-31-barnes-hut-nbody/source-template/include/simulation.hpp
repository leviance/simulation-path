#pragma once
// Trạng thái ứng dụng và một bước physics. Camera không ghi vào bodies.
#include "analysis.hpp"
#include <deque>
#include <string>

namespace lab {
inline constexpr double gravity = 0.001;
inline constexpr std::uint32_t galaxySeed = 0x31c0ffeeU;

inline std::vector<Body> presetBodies(int preset, std::size_t count) {
    if (preset == 3) {
        count = 256;
    }
    auto bodies = makeGalaxyBodies(count, galaxySeed);
    if (preset == 1) {
        // Hai cụm đối xứng có vận tốc tiến lại gần; không có quỹ đạo định sẵn.
        for (std::size_t i = 0; i < bodies.size(); ++i) {
            double side = 1;
            if (i % 2 == 0) {
                side = -1;
            }
            bodies[i].position.x = bodies[i].position.x * 0.4 + side * 0.55;
            bodies[i].position.y *= 0.4;
            bodies[i].velocity.x -= side * 0.12;
        }
    }
    if (preset == 2) {
        // Reference hai vật bằng nhau quay tròn theo potential có softening.
        const double omega = std::sqrt(2.0 * gravity / std::pow(4.0 + 0.02 * 0.02, 1.5));
        bodies = {{{-1, 0, 0}, {0, -omega, 0}, 1}, {{1, 0, 0}, {0, omega, 0}, 1}};
    }
    if (preset == 4) {
        bodies = {{{-1, 0, 0}, {}, 1}, {{1, 0, 0}, {}, 1}, {{0, 1, 0}, {}, 1}};
    }
    return bodies;
}

struct Simulation {
    std::vector<Body> bodies{};
    OrbitCamera camera{};
    std::size_t selected{1};
    int preset{};
    double theta{0.5};
    double epsilon{0.02};
    double dt{1.0 / 240.0};
    double time{};
    std::size_t steps{};
    bool paused{true};
    bool direct{};
    bool debug{};
    std::string notice{"Ready; Space run, N single step"};
    std::deque<std::vector<Vec3>> trails{};
#if LAB_CHECKPOINT >= 5
    BarnesHutTree tree{};
#endif
#if LAB_CHECKPOINT >= 4
    std::vector<Vec3> pendingAccelerations{};
    std::size_t nextTarget{};
    bool physicsPending{};
#endif

    void rebuild() {
#if LAB_CHECKPOINT >= 5
        tree = buildMassOctree(bodies);
#endif
    }

    void reset(int newPreset = 0) {
        preset = newPreset;
        std::size_t count = 256;
#if LAB_CHECKPOINT >= 6
        count = 4096;
#endif
        bodies = presetBodies(preset, count);
        selected = std::min<std::size_t>(1, bodies.size() - 1);
        time = 0;
        steps = 0;
        paused = true;
        direct = true;
#if LAB_CHECKPOINT >= 6
        direct = false;
#endif
#if LAB_CHECKPOINT >= 5
        debug = true;
#endif
#if LAB_CHECKPOINT >= 10
        debug = false;
#endif
        trails.clear();
#if LAB_CHECKPOINT >= 4
        physicsPending = false;
        pendingAccelerations.clear();
#endif
        rebuild();
    }
};

#if LAB_CHECKPOINT >= 2
// [snippet:pairAccelerationForSelected]
inline Vec3 pairAccelerationForSelected(const Simulation& simulation) {
    const Body& target = simulation.bodies[simulation.selected];
    const Body& source = simulation.bodies[0];
    return softenedAcceleration(target.position, source.position, source.mass, gravity, simulation.epsilon);
}

// [/snippet:pairAccelerationForSelected]
#endif

#if LAB_CHECKPOINT >= 4
// [snippet:beginPhysics]
inline void beginPhysics(Simulation& simulation) {
    // Freeze this snapshot until all accelerations are ready. No in-place update.
    simulation.rebuild();
    simulation.pendingAccelerations.assign(simulation.bodies.size(), {});
    simulation.nextTarget = 0;
    simulation.physicsPending = true;
}

// [/snippet:beginPhysics]

// [snippet:advancePhysics]
inline bool advancePhysics(Simulation& simulation, double budgetMilliseconds = 6) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::duration<double, std::milli>(budgetMilliseconds);
    while (simulation.nextTarget < simulation.bodies.size()) {
        const std::size_t target = simulation.nextTarget;
#if LAB_CHECKPOINT >= 6
        if (!simulation.direct) {
            simulation.pendingAccelerations[target] = barnesHutAcceleration(simulation.tree, simulation.bodies, target, simulation.theta, gravity, simulation.epsilon).acceleration;
        } else {
            simulation.pendingAccelerations[target] = directAcceleration(simulation.bodies, target, gravity, simulation.epsilon).acceleration;
        }
#else
        simulation.pendingAccelerations[target] = directAcceleration(simulation.bodies, target, gravity, simulation.epsilon).acceleration;
#endif
        ++simulation.nextTarget;
        if (std::chrono::steady_clock::now() >= deadline) {
            return false;
        }
    }
    integrateSymplecticEuler(simulation.bodies, simulation.pendingAccelerations, simulation.dt);
    simulation.physicsPending = false;
    simulation.time += simulation.dt;
    ++simulation.steps;
    simulation.rebuild();
    // 24 tracked bodies × 64 snapshots; all N bodies still receive gravity.
    std::vector<Vec3> trail{};
    for (std::size_t i = 0; i < std::min<std::size_t>(24, simulation.bodies.size()); ++i) {
        trail.push_back(simulation.bodies[i].position);
    }
    simulation.trails.push_back(std::move(trail));
    if (simulation.trails.size() > 64) {
        simulation.trails.pop_front();
    }
    return true;
}

// [/snippet:advancePhysics]
#endif
} // namespace lab
