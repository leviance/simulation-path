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
        // Hai hệ hoàn chỉnh, mỗi hệ có lõi riêng và nửa tổng khối lượng.
        // Xoay cả position lẫn velocity để đĩa thứ hai nghiêng thật trong XYZ.
        bodies.clear();
        for (int galaxy = 0; galaxy < 2; ++galaxy) {
            const std::size_t size = galaxy == 0 ? count / 2 : count - count / 2;
            const auto disk = makeGalaxyBodies(size, galaxySeed ^ (std::uint32_t(galaxy) * 0x9e3779b9U));
            const double side = galaxy == 0 ? -1.0 : 1.0;
            const double tilt = galaxy == 0 ? -0.15 : 0.65;
            for (Body body : disk) {
                const auto rotate = [tilt](Vec3 p) -> Vec3 {
                    return {p.x, p.y * std::cos(tilt) - p.z * std::sin(tilt), p.y * std::sin(tilt) + p.z * std::cos(tilt)};
                };
                body.position = rotate(body.position) * 0.45 + Vec3{side * 0.6, side * 0.08, 0};
                body.velocity = rotate(body.velocity) * std::sqrt(0.5 / 0.45) + Vec3{-side * 0.10, side * 0.06, 0};
                body.mass *= 0.5;
                bodies.push_back(body);
            }
        }
        Vec3 momentum{};
        double mass = 0;
        for (const auto& body : bodies) {
            momentum += body.velocity * body.mass;
            mass += body.mass;
        }
        for (auto& body : bodies) {
            body.velocity = body.velocity - momentum / mass;
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
    // 24 IDs trải đều toàn bộ hệ × 64 snapshot; không chỉ lấy sao ở lõi.
    std::vector<Vec3> trail{};
    for (std::size_t i = 0; i < std::min<std::size_t>(24, simulation.bodies.size()); ++i) {
        const std::size_t index = i * simulation.bodies.size() / std::min<std::size_t>(24, simulation.bodies.size());
        trail.push_back(simulation.bodies[index].position);
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
