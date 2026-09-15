#pragma once

#include "neighbor_list.hpp"

namespace neighbors {

// Cả hệ hạt và cache danh sách chỉ được commit sau một bước hợp lệ.
#if LAB_CHECKPOINT >= 6
inline bool cachedVerletStep(System& system, NeighborList& list, double skin, std::uint64_t generation, double dt) {
    if (!std::isfinite(dt) || dt <= 0.0 || dt > 0.01) {
        return false;
    }
    System candidate = system;
    NeighborList candidateList = list;
    if (!ensureList(candidate, skin, generation, candidateList)) {
        return false;
    }
    const pbc::Evaluation before = evaluateListed(candidate, candidateList);
    candidateList.forceChecks += before.evaluatedPairs;
    if (!before.valid) {
        return false;
    }
    for (std::size_t i = 0; i < candidate.particles.size(); ++i) {
        pbc::Particle& particle = candidate.particles[i];
        particle.velocity = pbc::add(particle.velocity, pbc::scale(before.forces[i], 0.5 * dt / particle.mass));
        const Vec2 displacement = pbc::scale(particle.velocity, dt);
        particle.unwrapped = pbc::add(particle.unwrapped, displacement);
        particle.position = pbc::wrapPosition(pbc::add(particle.position, displacement), candidate.box);
    }
    // Drift có thể vượt nửa skin. Không chờ đến đầu bước kế tiếp mới kiểm tra.
    if (!ensureList(candidate, skin, generation, candidateList)) {
        return false;
    }
    const pbc::Evaluation after = evaluateListed(candidate, candidateList);
    candidateList.forceChecks += after.evaluatedPairs;
    if (!after.valid) {
        return false;
    }
    for (std::size_t i = 0; i < candidate.particles.size(); ++i) {
        pbc::Particle& particle = candidate.particles[i];
        particle.velocity = pbc::add(particle.velocity, pbc::scale(after.forces[i], 0.5 * dt / particle.mass));
        if (!pbc::finite(particle.velocity)) {
            return false;
        }
    }
    candidate.elapsed += dt;
    if (!std::isfinite(candidate.elapsed)) {
        return false;
    }
    system = std::move(candidate);
    list = std::move(candidateList);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 7
struct Audit {
    bool passed{};
    std::size_t missingPairs{};
    double forceError{};
    double potentialError{};
};

inline Audit auditForces(const System& system, const NeighborList& list) {
    Audit report;
    const pbc::Evaluation reference = pbc::evaluate(system);
    const pbc::Evaluation listed = evaluateListed(system, list);
    if (!reference.valid || !listed.valid) {
        report.forceError = std::numeric_limits<double>::infinity();
        report.potentialError = std::numeric_limits<double>::infinity();
        return report;
    }
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        report.forceError = std::max(report.forceError, pbc::length(pbc::subtract(reference.forces[i], listed.forces[i])));
        for (std::size_t j = i + 1; j < system.particles.size(); ++j) {
            const Vec2 delta = pbc::minimumImage(pbc::subtract(system.particles[j].position, system.particles[i].position), system.box);
            if (pbc::length(delta) < system.parameters.cutoff && std::find(list.pairs.begin(), list.pairs.end(), PairIndex{i, j}) == list.pairs.end()) {
                ++report.missingPairs;
            }
        }
    }
    report.potentialError = std::abs(reference.potential - listed.potential);
    report.passed = report.missingPairs == 0 && report.forceError < 1.0e-8 && report.potentialError < 1.0e-8;
    return report;
}
#endif

#if LAB_CHECKPOINT >= 8
struct WorkReport {
    bool passed{};
    std::size_t rebuilds{};
    std::size_t buildChecks{};
    std::size_t forceChecks{};
    std::size_t allPairsChecks{};
};

inline WorkReport measureWork(int count, double skin, int steps = 200) {
    WorkReport report;
    if (count < 4 || count > 144 || steps < 1 || steps > 400) {
        return report;
    }
    System system = pbc::makeGas(count, 44);
    NeighborList list;
    for (int step = 0; step < steps; ++step) {
        if (!cachedVerletStep(system, list, skin, 0, 0.002)) {
            return report;
        }
    }
    report.passed = auditForces(system, list).passed;
    report.rebuilds = list.rebuilds;
    report.buildChecks = list.buildChecks;
    report.forceChecks = list.forceChecks;
    report.allPairsChecks = std::size_t(steps) * std::size_t(count) * std::size_t(count - 1);
    return report;
}
#endif

#if LAB_CHECKPOINT >= 9
inline bool validateNeighborList() {
    System fast = pbc::makeGas(36, 44);
    System reference = fast;
    NeighborList list;
    const double initialEnergy = pbc::kineticEnergy(fast) + pbc::evaluate(fast).potential;
    const Vec2 initialMomentum = pbc::momentum(fast);
    double maximumEnergyError = 0.0;
    for (int step = 0; step < 200; ++step) {
        if (!cachedVerletStep(fast, list, 0.4, 0, 0.002) || !pbc::verletStep(reference, 0.002)) {
            return false;
        }
        if (!auditForces(fast, list).passed) {
            return false;
        }
        for (std::size_t i = 0; i < fast.particles.size(); ++i) {
            if (pbc::length(pbc::subtract(fast.particles[i].unwrapped, reference.particles[i].unwrapped)) > 1.0e-8 || pbc::length(pbc::subtract(fast.particles[i].velocity, reference.particles[i].velocity)) > 1.0e-8) {
                return false;
            }
        }
        const double energy = pbc::kineticEnergy(fast) + pbc::evaluate(fast).potential;
        maximumEnergyError = std::max(maximumEnergyError, std::abs(energy - initialEnergy) / std::max(1.0, std::abs(initialEnergy)));
    }
    return maximumEnergyError < 0.01 && pbc::length(pbc::subtract(pbc::momentum(fast), initialMomentum)) < 1.0e-9;
}
#endif

} // namespace neighbors
