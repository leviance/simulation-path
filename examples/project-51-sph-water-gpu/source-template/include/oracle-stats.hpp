#pragma once
#include "reference.hpp"

namespace water3 {
#if LAB_CHECKPOINT >= 12
struct OracleStats {
    double speed = 0;
    double acceleration = 0;
    double density = 0;
};

enum class VerifyCase {
    lattice,  // Original lattice, including the 257-particle tail case.
    acoustic, // Large finite velocity; keep the particle count small.
    force,    // Prescribed acceleration; isolate reduction and integration.
};

inline void prepareVerifyCase(VerifyCase fixture, std::vector<Float4>& positions, std::vector<Float4>& velocities) {
    for (std::size_t i = 0; i < positions.size(); ++i) {
        if (fixture == VerifyCase::acoustic) {
            // High but finite velocity activates the acoustic bound at only 512 particles.
            velocities[i].x = 500;
        }
    }
}

inline Reference forceTimestepReference(std::size_t count) {
    // A prescribed acceleration checks reduction/integration, not the SPH force law.
    Reference result;
    result.density.assign(count, 1000);
    result.pressure.assign(count, 0);
    result.acceleration.assign(count, Vec3{0, 1e6, 0});
    return result;
}

inline bool closeEnough(double actual, double expected, double absolute = 0.01, double relative = 0.003) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= absolute + relative * std::abs(expected);
}

// Derive extrema from CPU old-state data, never from the GPU reduction being tested.
inline OracleStats oracleStats(const std::vector<Float4>& velocities, const Reference& report) {
    if (velocities.size() != report.acceleration.size() || velocities.size() != report.density.size()) {
        throw std::invalid_argument("Oracle statistics size mismatch");
    }
    OracleStats result;
    for (std::size_t i = 0; i < velocities.size(); ++i) {
        const double speed = length(xyz(velocities[i]));
        const double acceleration = length(report.acceleration[i]);
        const double density = report.density[i];
        if (!std::isfinite(speed) || !std::isfinite(acceleration) || !std::isfinite(density)) {
            throw std::invalid_argument("Nonfinite CPU oracle statistics");
        }
        result.speed = std::max(result.speed, speed);
        result.acceleration = std::max(result.acceleration, acceleration);
        result.density = std::max(result.density, density);
    }
    return result;
}

inline bool matchesOracleStats(double speed, double acceleration, double density, double error, double dt, const OracleStats& expected, const Plan& plan, double soundSpeed) {
    const double dtCPU = chooseDt(plan, expected.speed, expected.acceleration, soundSpeed);
    return error == 0 && closeEnough(speed, expected.speed, 1e-5, 0.0001) && closeEnough(acceleration, expected.acceleration) && closeEnough(density, expected.density, 0.001, 0.0001) && closeEnough(dt, dtCPU, 1e-9, 0.003);
}
#endif
} // namespace water3
