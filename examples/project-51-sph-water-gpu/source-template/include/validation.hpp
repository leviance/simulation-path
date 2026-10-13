#pragma once
#include "engine.hpp"
#include "reference.hpp"
#include <iostream>

namespace water3 {
// Validate old-state force and the committed new bank independently; never read large systems.
#if LAB_CHECKPOINT >= 12
inline bool closeEnough(double actual, double expected, double absolute = 0.01, double relative = 0.003) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= absolute + relative * std::abs(expected);
}

inline bool validateGpu(lab::GlApi& gl, const Engine& engine, const std::vector<Float4>& oldPosition, const std::vector<Float4>& oldVelocity) {
    auto plan = engine.storage.plan;
    const auto expected = evaluate(engine.storage.plan, oldPosition, oldVelocity, engine.settings);
    const auto density = readVector<Float4>(gl, engine.storage.density, engine.storage.plan.count);
    const auto acceleration = readVector<Float4>(gl, engine.storage.acceleration, engine.storage.plan.count);
    const auto position = readVector<Float4>(gl, engine.storage.positions[engine.current], engine.storage.plan.count);
    const auto velocity = readVector<Float4>(gl, engine.storage.velocities[engine.current], engine.storage.plan.count);
    const auto counts = readVector<std::uint32_t>(gl, engine.storage.counts, engine.storage.plan.cells);
    const auto offsets = readVector<std::uint32_t>(gl, engine.storage.offsets, engine.storage.plan.cells);
    const auto indices = readVector<std::uint32_t>(gl, engine.storage.indices, engine.storage.plan.count);
    std::vector<bool> seen(plan.count, false);
    plan.support = 2.0 * static_cast<float>(plan.h);
    std::uint32_t total = 0;
    for (std::uint32_t cell = 0; cell < plan.cells; ++cell) {
        if (offsets[cell] != total || counts[cell] > plan.count - total) {
            std::cerr << "Invalid CSR range\n";
            return false;
        }
        total += counts[cell];
        for (auto slot = offsets[cell]; slot < total; ++slot) {
            const auto id = indices[slot];
            if (id >= plan.count || seen[id] || cellId(plan, xyz(oldPosition[id])) != cell) {
                std::cerr << "Invalid CSR ownership/permutation\n";
                return false;
            }
            seen[id] = true;
        }
    }
    if (total != plan.count) {
        std::cerr << "Missing CSR particles\n";
        return false;
    }
    for (std::size_t i = 0; i < position.size(); ++i) {
        if (!closeEnough(density[i].x, expected.density[i], 0.001, 0.0001) || density[i].w != 0 || acceleration[i].w != 0 || !closeEnough(density[i].y, expected.pressure[i], 0.2, 0.003) || !closeEnough(acceleration[i].x, expected.acceleration[i].x) || !closeEnough(acceleration[i].y, expected.acceleration[i].y) || !closeEnough(acceleration[i].z, expected.acceleration[i].z)) {
            std::cerr << "Density/pressure/force mismatch at " << i << '\n';
            return false;
        }
        auto p = xyz(oldPosition[i]);
        auto v = xyz(oldVelocity[i]);
        integrate(p, v, expected.acceleration[i], engine.lastDt, engine.storage.plan.spacing / 2);
        if (!closeEnough(position[i].x, p.x, 2e-6, 1e-5) || !closeEnough(position[i].y, p.y, 2e-6, 1e-5) || !closeEnough(position[i].z, p.z, 2e-6, 1e-5) || !closeEnough(velocity[i].x, v.x, 1e-5, 0.004) || !closeEnough(velocity[i].y, v.y, 1e-5, 0.004) || !closeEnough(velocity[i].z, v.z, 1e-5, 0.004)) {
            std::cerr << "Integration mismatch at " << i << '\n';
            return false;
        }
    }
    std::cout << "GPU oracle PASS N=" << position.size() << " step=" << engine.steps << " dt=" << engine.lastDt << " ms=" << engine.queue.milliseconds << '\n';
    return true;
}
#endif
} // namespace water3
