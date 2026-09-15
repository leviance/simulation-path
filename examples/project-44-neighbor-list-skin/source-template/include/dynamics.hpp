#pragma once

#include "periodic.hpp"

#include <algorithm>
#include <cstdint>
#include <utility>

namespace pbc {

// Giữ reduced units và force-shifted Lennard-Jones của Project 42.
struct Parameters {
    double epsilon{1.0};
    double sigma{1.0};
    double cutoff{2.5};
};

struct System {
    Box box;
    Parameters parameters;
    std::vector<Particle> particles;
    double elapsed{};
};

inline System makePair() {
    System system;
    Particle a;
    a.position = {0.6, 6.0};
    a.velocity = {-0.3, 0.12};
    Particle b;
    b.position = {11.4, 6.0};
    b.velocity = {0.3, -0.12};
    a.unwrapped = a.position;
    b.unwrapped = b.position;
    system.particles = {a, b};
    return system;
}

struct PairSample {
    double potential{};
    double slope{};
};

struct Evaluation {
    bool valid{false};
    std::vector<Vec2> forces;
    double potential{};
    std::size_t evaluatedPairs{};
    std::size_t activePairs{};
};

inline bool validParameters(Parameters parameters, Box box) {
    if (!validBox(box)) {
        return false;
    }
    if (!std::isfinite(parameters.epsilon) || !std::isfinite(parameters.sigma) || !std::isfinite(parameters.cutoff)) {
        return false;
    }
    // Dùng dấu < để không có cặp trong cutoff rơi đúng vào trường hợp nửa hộp.
    return parameters.epsilon > 0.0 && parameters.sigma > 0.0 && parameters.cutoff > parameters.sigma && parameters.cutoff < 0.5 * std::min(box.width, box.height);
}

inline PairSample rawPair(double distance, Parameters parameters) {
    const double ratio = parameters.sigma / distance;
    const double ratio6 = std::pow(ratio, 6);
    const double ratio12 = ratio6 * ratio6;
    PairSample sample;
    sample.potential = 4.0 * parameters.epsilon * (ratio12 - ratio6);
    sample.slope = 24.0 * parameters.epsilon * (ratio6 - 2.0 * ratio12) / distance;
    return sample;
}

inline PairSample shiftedPair(double distance, Parameters parameters) {
    if (distance >= parameters.cutoff) {
        return {};
    }
    const PairSample current = rawPair(distance, parameters);
    const PairSample edge = rawPair(parameters.cutoff, parameters);
    PairSample sample;
    sample.potential = current.potential - edge.potential - (distance - parameters.cutoff) * edge.slope;
    sample.slope = current.slope - edge.slope;
    return sample;
}

inline Evaluation evaluate(const System& system) {
    Evaluation result;
    result.forces.resize(system.particles.size());
    if (!validParameters(system.parameters, system.box)) {
        return result;
    }
    for (const Particle& particle : system.particles) {
        if (!finite(particle.position) || !finite(particle.velocity) || !std::isfinite(particle.mass) || particle.mass <= 0.0) {
            return result;
        }
    }
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        for (std::size_t j = i + 1; j < system.particles.size(); ++j) {
            ++result.evaluatedPairs;
            const Vec2 rawDelta = subtract(system.particles[j].position, system.particles[i].position);
            const Vec2 delta = minimumImage(rawDelta, system.box);
            const double distance = length(delta);
            if (!std::isfinite(distance) || distance < 1.0e-6) {
                return result;
            }
            if (distance >= system.parameters.cutoff) {
                continue;
            }
            ++result.activePairs;
            const PairSample sample = shiftedPair(distance, system.parameters);
            // delta hướng i -> j: lực trên i là +U'(r) * delta/r.
            const Vec2 force = scale(delta, sample.slope / distance);
            if (!finite(force) || !std::isfinite(sample.potential)) {
                return result;
            }
            result.forces[i] = add(result.forces[i], force);
            result.forces[j] = subtract(result.forces[j], force);
            result.potential += sample.potential;
        }
    }
    for (const Vec2 force : result.forces) {
        if (!finite(force)) {
            return result;
        }
    }
    result.valid = std::isfinite(result.potential);
    return result;
}

inline System makeGas(int count, std::uint32_t seed = 43) {
    System system;
    count = std::clamp(count, 4, 1000);
    const int columns = int(std::ceil(std::sqrt(double(count))));
    const double side = std::max(12.0, 1.6 * columns);
    system.box = {side, side};
    Vec2 meanVelocity;
    for (int index = 0; index < count; ++index) {
        Particle particle;
        particle.position = {(index % columns + 0.5) * side / columns, (index / columns + 0.5) * side / columns};
        seed = 1664525u * seed + 1013904223u;
        particle.velocity.x = (double(seed) / 4294967296.0 - 0.5) * 0.8;
        seed = 1664525u * seed + 1013904223u;
        particle.velocity.y = (double(seed) / 4294967296.0 - 0.5) * 0.8;
        particle.unwrapped = particle.position;
        meanVelocity = add(meanVelocity, particle.velocity);
        system.particles.push_back(particle);
    }
    meanVelocity = scale(meanVelocity, 1.0 / count);
    for (Particle& particle : system.particles) {
        particle.velocity = subtract(particle.velocity, meanVelocity);
    }
    return system;
}

inline bool verletStep(System& system, double dt) {
    if (!std::isfinite(dt) || dt <= 0.0 || dt > 0.02) {
        return false;
    }
    const Evaluation before = evaluate(system);
    if (!before.valid) {
        return false;
    }
    // Chỉ thay state thật khi cả bước thành công; lỗi không để lại nửa bước drift.
    System candidate = system;
    for (std::size_t i = 0; i < candidate.particles.size(); ++i) {
        Particle& particle = candidate.particles[i];
        particle.velocity = add(particle.velocity, scale(before.forces[i], 0.5 * dt / particle.mass));
        const Vec2 displacement = scale(particle.velocity, dt);
        particle.position = wrapPosition(add(particle.position, displacement), candidate.box);
        particle.unwrapped = add(particle.unwrapped, displacement);
        if (!finite(particle.unwrapped)) {
            return false;
        }
    }
    const Evaluation after = evaluate(candidate);
    if (!after.valid) {
        return false;
    }
    for (std::size_t i = 0; i < candidate.particles.size(); ++i) {
        Particle& particle = candidate.particles[i];
        particle.velocity = add(particle.velocity, scale(after.forces[i], 0.5 * dt / particle.mass));
        if (!finite(particle.velocity)) {
            return false;
        }
    }
    candidate.elapsed += dt;
    if (!std::isfinite(candidate.elapsed)) {
        return false;
    }
    system = std::move(candidate);
    return true;
}

inline double kineticEnergy(const System& system) {
    double energy = 0.0;
    for (const Particle& particle : system.particles) {
        energy += 0.5 * particle.mass * (particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y);
    }
    return energy;
}

inline Vec2 momentum(const System& system) {
    Vec2 total;
    for (const Particle& particle : system.particles) {
        total = add(total, scale(particle.velocity, particle.mass));
    }
    return total;
}

struct ValidationReport {
    bool passed{};
    double maximumEnergyError{};
    double momentumError{};
};

inline ValidationReport validateRun() {
    System system = makeGas(36);
    const double initialEnergy = kineticEnergy(system) + evaluate(system).potential;
    const Vec2 initialMomentum = momentum(system);
    ValidationReport report{true, 0.0, 0.0};
    for (int step = 0; step < 400; ++step) {
        if (!verletStep(system, 0.001)) {
            report.passed = false;
            return report;
        }
        const double energy = kineticEnergy(system) + evaluate(system).potential;
        report.maximumEnergyError = std::max(report.maximumEnergyError, std::abs(energy - initialEnergy) / std::max(1.0, std::abs(initialEnergy)));
        report.momentumError = std::max(report.momentumError, length(subtract(momentum(system), initialMomentum)));
    }
    report.passed = report.maximumEnergyError < 0.01 && report.momentumError < 1.0e-9;
    return report;
}

} // namespace pbc
