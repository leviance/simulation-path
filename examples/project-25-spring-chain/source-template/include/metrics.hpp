#pragma once
#include "lab.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 7
inline double springStabilityIndex(double stiffness, double mass, double deltaSeconds) {
    if (!std::isfinite(stiffness) || stiffness < 0.0 || !std::isfinite(mass) || mass <= 0.0 || !std::isfinite(deltaSeconds) || deltaSeconds < 0.0) {
        return std::numeric_limits<double>::infinity();
    }
    return deltaSeconds * std::sqrt(stiffness / mass);
}

struct ChainMetrics {
    double kineticEnergy{};
    double springEnergy{};
    double gravitationalEnergy{};
    double maximumStretch{};
    double maximumSpeed{};
    double anchorError{};
    bool finite{true};
};

// Energy và stretch được đo độc lập với SDL để stability experiment có số liệu.
inline ChainMetrics measureChain(const SpringChain& chain, Vec2 gravity, bool gravityEnabled) {
    ChainMetrics metrics{};
    if (!validChain(chain) || !finiteVec2(gravity)) {
        metrics.finite = false;
        return metrics;
    }
    for (const Particle& particle : chain.particles) {
        if (!finiteParticle(particle)) {
            metrics.finite = false;
            continue;
        }
        metrics.maximumSpeed = std::max(metrics.maximumSpeed, length(particle.velocity));
        if (particle.inverseMass == 0.0) {
            continue;
        }
        const double mass = 1.0 / particle.inverseMass;
        metrics.kineticEnergy += 0.5 * mass * lengthSquared(particle.velocity);
        if (gravityEnabled) {
            metrics.gravitationalEnergy += -mass * dot(gravity, subtract(particle.position, chain.anchorPosition));
        }
    }
    for (const Spring& spring : chain.springs) {
        const double distance = length(subtract(chain.particles[spring.second].position, chain.particles[spring.first].position));
        const double stretch = distance - spring.restLength;
        metrics.maximumStretch = std::max(metrics.maximumStretch, std::abs(stretch));
        metrics.springEnergy += 0.5 * spring.stiffness * stretch * stretch;
    }
    metrics.anchorError = length(subtract(chain.particles.front().position, chain.anchorPosition));
    metrics.finite = metrics.finite && std::isfinite(metrics.kineticEnergy) && std::isfinite(metrics.springEnergy) && std::isfinite(metrics.gravitationalEnergy) && std::isfinite(metrics.maximumStretch) && std::isfinite(metrics.maximumSpeed) && std::isfinite(metrics.anchorError);
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 8
inline double totalMechanicalEnergy(const ChainMetrics& metrics) {
    return metrics.kineticEnergy + metrics.springEnergy + metrics.gravitationalEnergy;
}

inline bool chainWithinSafetyEnvelope(const SpringChain& chain, const ChainMetrics& metrics, double maximumStretchRatio, double maximumSpeed) {
    if (!metrics.finite || chain.springs.empty() || !std::isfinite(maximumStretchRatio) || maximumStretchRatio < 0.0 || !std::isfinite(maximumSpeed) || maximumSpeed < 0.0) {
        return false;
    }
    double smallestRestLength = std::numeric_limits<double>::infinity();
    for (const Spring& spring : chain.springs) {
        smallestRestLength = std::min(smallestRestLength, spring.restLength);
    }
    return metrics.anchorError <= 1e-9 && metrics.maximumStretch <= maximumStretchRatio * smallestRestLength && metrics.maximumSpeed <= maximumSpeed;
}
#endif

} // namespace lab
