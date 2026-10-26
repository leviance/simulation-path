#pragma once
// Jobs own a snapshot. Reset/change parameters discards the whole job.
#include "simulation.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 8
// [snippet:SurveyJob]
struct SurveyJob {
    std::vector<Body> snapshot{};
    BarnesHutTree tree{};
    std::vector<Vec3> reference{};
    std::vector<AccuracyRow> rows{};
    std::size_t sample{};
    std::size_t row{};
    double epsilon{0.02};
    double squaredError{};
    double squaredReference{};
    bool active{};
    bool timedOut{};
    double snapshotTime{};
    std::chrono::steady_clock::time_point deadline{};

    void start(const Simulation& simulation) {
        *this = {};
        snapshot = simulation.bodies;
        tree = buildMassOctree(snapshot);
        epsilon = simulation.epsilon;
        snapshotTime = simulation.time;
        reference.resize(std::min<std::size_t>(32, snapshot.size()));
        active = true;
        deadline = std::chrono::steady_clock::now() + std::chrono::seconds(20);
    }

    // One target per unit of work; UI can pause/cancel between ticks.
    void tick() {
        const auto until = std::chrono::steady_clock::now() + std::chrono::milliseconds(6);
        constexpr std::array<double, 4> angles{0.25, 0.5, 0.8, 1.1};
        while (active && std::chrono::steady_clock::now() < until) {
            if (std::chrono::steady_clock::now() > deadline) {
                active = false;
                timedOut = true;
                return;
            }
            const std::size_t target = sample * snapshot.size() / reference.size();
            if (row == 0) {
                reference[sample] = directAcceleration(snapshot, target, gravity, epsilon).acceleration;
            }
            if (rows.size() <= row) {
                rows.push_back({});
                rows.back().theta = angles[row];
            }
            AccuracyRow& result = rows[row];
            const auto approximate = barnesHutAcceleration(tree, snapshot, target, angles[row], gravity, epsilon);
            const double error = length(approximate.acceleration - reference[sample]);
            const double relative = error / std::max(length(reference[sample]), 1e-12);
            result.meanRelativeError += relative;
            result.maximumRelativeError = std::max(result.maximumRelativeError, relative);
            squaredError += error * error;
            squaredReference += lengthSquared(reference[sample]);
            result.metrics.visitedNodes += approximate.metrics.visitedNodes;
            result.metrics.approximatedNodes += approximate.metrics.approximatedNodes;
            result.metrics.exactInteractions += approximate.metrics.exactInteractions;
            ++sample;
            if (sample == reference.size()) {
                result.meanRelativeError /= double(reference.size());
                result.absoluteRmsError = std::sqrt(squaredError / double(reference.size()));
                result.normalizedRmsError = std::sqrt(squaredError / std::max(squaredReference, double(reference.size()) * 1e-24));
                sample = 0;
                squaredError = 0;
                squaredReference = 0;
                ++row;
                active = row < angles.size();
            }
        }
    }
};

// [/snippet:SurveyJob]
#endif

#if LAB_CHECKPOINT >= 10
struct DiagnosticSample {
    double time{};
    SystemDiagnostics values{};
};

// [snippet:EnergyJob]
struct EnergyJob {
    std::vector<Body> snapshot{};
    SystemDiagnostics result{};
    double time{};
    double epsilon{0.02};
    std::size_t first{};
    bool active{};

    void start(const Simulation& simulation) {
        *this = {};
        snapshot = simulation.bodies;
        time = simulation.time;
        epsilon = simulation.epsilon;
        result.centerOfMass = centerOfMass(snapshot);
        result.momentum = totalMomentum(snapshot);
        for (const Body& body : snapshot) {
            result.kineticEnergy += 0.5 * body.mass * lengthSquared(body.velocity);
        }
        active = true;
    }

    // [snippet:energyBatch]
    void tick() {
        const auto until = std::chrono::steady_clock::now() + std::chrono::milliseconds(6);
        while (first < snapshot.size()) {
            for (std::size_t second = first + 1; second < snapshot.size(); ++second) {
                const double r2 = lengthSquared(snapshot[second].position - snapshot[first].position);
                result.potentialEnergy -= gravity * snapshot[first].mass * snapshot[second].mass / std::sqrt(r2 + epsilon * epsilon);
            }
            ++first;
            if (std::chrono::steady_clock::now() >= until) {
                return;
            }
        }
        result.totalEnergy = result.kineticEnergy + result.potentialEnergy;
        active = false;
    }

    // [/snippet:energyBatch]
};

// [/snippet:EnergyJob]

struct TimestepRow {
    double dt{};
    double positionError{};
    double energyDrift{};
};

// [snippet:timestepStudy]
inline std::vector<TimestepRow> timestepStudy() {
    std::vector<TimestepRow> rows{};
    const auto initial = presetBodies(2, 2);
    const double omega = std::abs(initial[0].velocity.y);
    const double initialEnergy = systemDiagnostics(initial, gravity, 0.02).totalEnergy;
    for (const int count : {60, 120, 240}) {
        auto bodies = initial;
        const double dt = 1.0 / double(count);
        for (int step = 0; step < count; ++step) {
            const auto tree = buildMassOctree(bodies);
            const auto acceleration = barnesHutAccelerations(tree, bodies, 0.5, gravity, 0.02);
            integrateSymplecticEuler(bodies, acceleration, dt);
        }
        // Exact softened circular orbit at T=1, independent of both integrators.
        const Vec3 exact{-std::cos(omega), -std::sin(omega), 0};
        const double energy = systemDiagnostics(bodies, gravity, 0.02).totalEnergy;
        rows.push_back({dt, length(bodies[0].position - exact), (energy - initialEnergy) / std::abs(initialEnergy)});
    }
    return rows;
}

// [/snippet:timestepStudy]
#endif
} // namespace lab
