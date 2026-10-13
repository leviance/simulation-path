#pragma once
#include "solver.hpp"
#include <string>

namespace water {
// Mass changes only through accepted emissions; momentum also changes at walls.
struct Measurement {
    double totalMass = 0;
    double momentumX = 0;
    double momentumY = 0;
    double energy = 0;
    double maxCompression = 0;
};

inline Measurement measure(const State& state) {
    Measurement result;
    result.totalMass = state.particles.size() * mass;
    for (const auto& p : state.particles) {
        result.momentumX += mass * p.velocity.x;
        result.momentumY += mass * p.velocity.y;
        result.energy += 0.5 * mass * dot(p.velocity, p.velocity);
        result.maxCompression = std::max(result.maxCompression, p.density / restDensity - 1);
    }
    return result;
}

#if LAB_CHECKPOINT >= 10
struct Validation {
    std::string label;
    bool pass = false;
    double value = 0;
};

inline std::vector<Validation> validateWater() {
    std::vector<Validation> results;
    double integral = 0;
    constexpr int bins = 2000;
    const double dr = 2 * h / bins;
    for (int k = 0; k < bins; ++k) {
        const double r = (k + 0.5) * dr;
        integral += 2 * std::numbers::pi * r * kernel(r) * dr;
    }
    results.push_back({"Kernel 2D: integral near one", std::abs(integral - 1) < 1e-6, integral});
    const auto state = makeState();
    const auto brute = buildNeighbors(state, false);
    const auto grid = buildNeighbors(state, true);
    results.push_back({"Grid equals all-pairs", grid.lists == brute.lists, static_cast<double>(grid.candidates) / brute.candidates});
    auto pair = makeState(Preset::Pair);
    pair.walls.clear();
    for (auto& p : pair.particles) {
        p.density = 1100;
        p.pressure = 14400;
    }
    Settings settings;
    settings.gravity = 0;
    const auto a = accelerations(pair, buildNeighbors(pair, false), settings);
    const double residual = std::hypot(a[0].x + a[1].x, a[0].y + a[1].y);
    results.push_back({"Internal pair net force near zero", residual < 1e-10, residual});
    auto finite = makeState();
    for (int i = 0; i < 300; ++i) {
        step(finite, Settings{});
    }
    bool bounded = finiteState(finite);
    for (const auto& p : finite.particles) {
        if (p.position.x < spacing / 2 || p.position.x > 1 - spacing / 2 || p.position.y < spacing / 2 || p.position.y > 0.8 - spacing / 2) {
            bounded = false;
        }
    }
    results.push_back({"Dam: 300 finite steps", bounded, measure(finite).maxCompression});
    const Vec2 d{0.03, 0.02};
    const double epsilon = 1e-6;
    const double difference = (kernel(length({d.x + epsilon, d.y})) - kernel(length({d.x - epsilon, d.y}))) / (2 * epsilon);
    const double error = std::abs(difference - gradient(d).x);
    results.push_back({"Gradient finite difference", error < 1e-4, error});
    return results;
}
#endif
} // namespace water
