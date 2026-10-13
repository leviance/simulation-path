#pragma once
#include "kernel.hpp"

namespace water3 {
// This bounded oracle never allocates a million particles on the CPU.
inline std::uint32_t cellId(const Plan& plan, Vec3 p) {
    if (!finite(p) || p.x < 0 || p.y < 0 || p.z < 0 || p.x > 1 || p.y > 1 || p.z > 1) {
        throw std::invalid_argument("Particle outside grid");
    }
    const auto x = std::min(plan.cellsAxis - 1, static_cast<std::uint32_t>(std::floor(p.x / plan.support)));
    const auto y = std::min(plan.cellsAxis - 1, static_cast<std::uint32_t>(std::floor(p.y / plan.support)));
    const auto z = std::min(plan.cellsAxis - 1, static_cast<std::uint32_t>(std::floor(p.z / plan.support)));
    return x + plan.cellsAxis * (y + plan.cellsAxis * z);
}

struct Reference {
    std::vector<double> density;
    std::vector<double> pressure;
    std::vector<Vec3> acceleration;
};
#if LAB_CHECKPOINT >= 5
inline Reference evaluate(const Plan& plan, const std::vector<Float4>& positions, const std::vector<Float4>& velocities, const Settings& settings) {
    validateSettings(settings);
    if (positions.size() > 512 || positions.size() != velocities.size()) {
        throw std::invalid_argument("CPU oracle capped at 512");
    }
    Reference report;
    for (const auto v : velocities) {
        if (!finite(xyz(v))) {
            throw std::invalid_argument("Nonfinite velocity");
        }
    }
    for (const auto p : positions) {
        if (!finite(xyz(p))) {
            throw std::invalid_argument("Nonfinite position");
        }
        double rho = 0;
        for (const auto other : positions) {
            rho += plan.mass * kernel(length(subtract(xyz(p), xyz(other))), plan.h);
        }
        report.density.push_back(rho);
        double pressure = 0;
#if LAB_CHECKPOINT >= 6
        pressure = std::max(0.0, settings.soundSpeed * settings.soundSpeed * (rho - restDensity));
#endif
        report.pressure.push_back(pressure);
    }
    for (std::size_t i = 0; i < positions.size(); ++i) {
        Vec3 a;
#if LAB_CHECKPOINT >= 7
        a.y = -settings.gravity;
#endif
#if LAB_CHECKPOINT >= 6
        for (std::size_t j = 0; j < positions.size(); ++j) {
            if (i == j) {
                continue;
            }
            const auto d = subtract(xyz(positions[i]), xyz(positions[j]));
            const auto grad = gradient(d, plan.h);
            const double coefficient = report.pressure[i] / std::pow(report.density[i], 2) + report.pressure[j] / std::pow(report.density[j], 2) + viscosity(d, subtract(xyz(velocities[i]), xyz(velocities[j])), report.density[i], report.density[j], plan.h, settings.soundSpeed, settings.alpha);
            a.x -= plan.mass * coefficient * grad.x;
            a.y -= plan.mass * coefficient * grad.y;
            a.z -= plan.mass * coefficient * grad.z;
        }
#endif
        report.acceleration.push_back(a);
    }
    return report;
}
#endif
#if LAB_CHECKPOINT >= 7
inline void collide(double& position, double& velocity, double radius) {
    if (position < radius) {
        position = radius;
        if (velocity < 0) {
            velocity *= -0.1;
        }
    }
    if (position > 1 - radius) {
        position = 1 - radius;
        if (velocity > 0) {
            velocity *= -0.1;
        }
    }
}

inline void integrate(Vec3& position, Vec3& velocity, Vec3 acceleration, double dt, double radius) {
    velocity.x += dt * acceleration.x;
    velocity.y += dt * acceleration.y;
    velocity.z += dt * acceleration.z;
    position.x += dt * velocity.x;
    position.y += dt * velocity.y;
    position.z += dt * velocity.z;
    collide(position.x, velocity.x, radius);
    collide(position.y, velocity.y, radius);
    collide(position.z, velocity.z, radius);
}
#endif
} // namespace water3
