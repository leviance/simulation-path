#pragma once
#include "engine.hpp"
#include "oracle-stats.hpp"
#include <iostream>

namespace water3 {
#if LAB_CHECKPOINT >= 12
// This isolated GPU test bypasses the SPH density/force passes deliberately.
// Initialization already supplied rho=1000; acceleration is prescribed test input.
inline void submitForceFixture(lab::GlApi& gl, Engine& engine) {
    std::vector<Float4> acceleration(engine.storage.plan.count, Float4{0, 1e6F, 0, 0});
    engine.queue.begin(gl);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, engine.storage.acceleration);
    gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, acceleration.size() * sizeof(Float4), acceleration.data());
    engine.statsRoot = reduceStats(gl, engine.programs, engine.storage, engine.current, engine.settings);

    use(gl, engine.programs.integrate, engine.storage.plan, engine.settings, false);
    bind(gl, 0, engine.storage.positions[engine.current]);
    bind(gl, 1, engine.storage.velocities[engine.current]);
    bind(gl, 2, engine.storage.acceleration);
    bind(gl, 3, engine.storage.positions[1 - engine.current]);
    bind(gl, 4, engine.storage.velocities[1 - engine.current]);
    bind(gl, 5, engine.statsRoot);
    dispatch(gl, engine.storage.plan.count);
    engine.queue.end(gl);
}

inline bool validateForceFixture(lab::GlApi& gl, const Engine& engine, const std::vector<Float4>& oldPosition, const std::vector<Float4>& oldVelocity) {
    const auto& plan = engine.storage.plan;
    const auto expected = forceTimestepReference(plan.count);
    const auto extrema = oracleStats(oldVelocity, expected);
    const double dtCPU = chooseDt(plan, extrema.speed, extrema.acceleration, engine.settings.soundSpeed);
    const double acoustic = 0.25 * plan.h / (engine.settings.soundSpeed + extrema.speed);
    const auto stats = engine.lastStats;
    if (!(dtCPU < std::min(maxDt, acoustic)) || !matchesOracleStats(stats.x, stats.y, stats.z, stats.w, engine.lastDt, extrema, plan, engine.settings.soundSpeed)) {
        std::cerr << "Prescribed-force reduction/timestep mismatch or inactive bound\n";
        return false;
    }
    const auto positions = readVector<Float4>(gl, engine.storage.positions[engine.current], plan.count);
    const auto velocities = readVector<Float4>(gl, engine.storage.velocities[engine.current], plan.count);
    for (std::size_t i = 0; i < positions.size(); ++i) {
        auto p = xyz(oldPosition[i]);
        auto v = xyz(oldVelocity[i]);
        integrate(p, v, expected.acceleration[i], dtCPU, plan.spacing / 2);
        if (!closeEnough(positions[i].x, p.x, 2e-6, 1e-5) || !closeEnough(positions[i].y, p.y, 2e-6, 1e-5) || !closeEnough(positions[i].z, p.z, 2e-6, 1e-5) || !closeEnough(velocities[i].x, v.x, 1e-5, 1e-5) || !closeEnough(velocities[i].y, v.y, 1e-5, 1e-5) || !closeEnough(velocities[i].z, v.z, 1e-5, 1e-5)) {
            std::cerr << "Prescribed-force integration mismatch\n";
            return false;
        }
    }
    std::cout << "GPU prescribed force-bound PASS N=" << plan.count << " step=" << engine.steps << " dt=" << dtCPU << '\n';
    return true;
}
#endif
} // namespace water3
