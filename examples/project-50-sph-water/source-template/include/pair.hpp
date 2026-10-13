#pragma once
#include "solver.hpp"

namespace water {
// This diagnostic keeps position fixed and prescribes density to isolate pair forces.
#if LAB_CHECKPOINT >= 5
struct PairParameters {
    double densityA = 1100;
    double densityB = 1200;
    bool approaching = true;
};

struct PairReport {
    State state;
    std::vector<Vec2> pressureForce;
    std::vector<Vec2> viscosityForce;
    Vec2 netForce;
    Vec2 grad;
    double pi = 0;
    double viscosityPower = 0;
};

inline PairReport inspectPair(const PairParameters& parameters, Settings settings) {
    validateSettings(settings);
    if (!std::isfinite(parameters.densityA) || !std::isfinite(parameters.densityB) || parameters.densityA < 900 || parameters.densityA > 1200 || parameters.densityB < 900 || parameters.densityB > 1200) {
        throw std::invalid_argument("Pair densities must be in [900, 1200]");
    }
    PairReport report;
    report.state = makeState(Preset::Pair);
    report.state.walls.clear();
    report.state.particles[0].density = parameters.densityA;
    report.state.particles[1].density = parameters.densityB;
    if (!parameters.approaching) {
        for (auto& p : report.state.particles) {
            p.velocity.x *= -1;
            p.velocity.y *= -1;
        }
    }
    settings.gravity = 0;
    computePressure(report.state, settings.soundSpeed);
    const auto neighbors = buildNeighbors(report.state, false);
    const double alpha = settings.alpha;
    settings.alpha = 0;
    const auto pressureAcceleration = accelerations(report.state, neighbors, settings);
    settings.alpha = alpha;
    const auto totalAcceleration = accelerations(report.state, neighbors, settings);
    for (std::size_t i = 0; i < report.state.particles.size(); ++i) {
        const Vec2 pressure{mass * pressureAcceleration[i].x, mass * pressureAcceleration[i].y};
        const Vec2 viscosity{mass * (totalAcceleration[i].x - pressureAcceleration[i].x), mass * (totalAcceleration[i].y - pressureAcceleration[i].y)};
        report.pressureForce.push_back(pressure);
        report.viscosityForce.push_back(viscosity);
        report.netForce.x += mass * totalAcceleration[i].x;
        report.netForce.y += mass * totalAcceleration[i].y;
        report.viscosityPower += dot(report.state.particles[i].velocity, viscosity);
    }
    const auto& a = report.state.particles[0];
    const auto& b = report.state.particles[1];
    const auto displacement = subtract(a.position, b.position);
    report.grad = gradient(displacement);
#if LAB_CHECKPOINT >= 6
    report.pi = artificialViscosity(displacement, subtract(a.velocity, b.velocity), a.density, b.density, settings.soundSpeed, settings.alpha);
#endif
    return report;
}
#endif
} // namespace water
