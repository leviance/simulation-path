#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <vector>

namespace lab {

inline constexpr double kSpringEpsilon = 1e-12;
inline constexpr std::size_t kNoParticle = std::numeric_limits<std::size_t>::max();

// Các phép toán vector được giữ nhỏ và tường minh để công thức lực bên dưới
// đọc giống hệt phần toán trong bài học.
struct Vec2 {
    double x{};
    double y{};
};

inline Vec2 add(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}

inline Vec2 subtract(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}

inline Vec2 scale(Vec2 value, double factor) {
    return {value.x * factor, value.y * factor};
}

inline double dot(Vec2 left, Vec2 right) {
    return left.x * right.x + left.y * right.y;
}

inline double lengthSquared(Vec2 value) {
    return dot(value, value);
}

inline double length(Vec2 value) {
    return std::sqrt(lengthSquared(value));
}

inline bool finiteVec2(Vec2 value) {
    return std::isfinite(value.x) && std::isfinite(value.y);
}

inline Vec2 normalizedOr(Vec2 value, Vec2 fallback) {
    const double magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude <= kSpringEpsilon) {
        return fallback;
    }
    return scale(value, 1.0 / magnitude);
}

struct Particle {
    Vec2 position{};
    Vec2 velocity{};
    Vec2 force{};
    double inverseMass{1.0};
    double radius{0.1};
};

struct Spring {
    std::size_t first{};
    std::size_t second{};
    double restLength{0.4};
    double stiffness{100.0};
    double damping{1.0};
};

struct SpringChain {
    std::vector<Particle> particles{};
    std::vector<Spring> springs{};
    Vec2 anchorPosition{};
};

inline bool finiteParticle(const Particle& particle) {
    return finiteVec2(particle.position) && finiteVec2(particle.velocity) && finiteVec2(particle.force) && std::isfinite(particle.inverseMass) && std::isfinite(particle.radius) && particle.inverseMass >= 0.0 && particle.radius > 0.0;
}

inline bool validSpring(const Spring& spring, std::size_t particleCount) {
    return spring.first < particleCount && spring.second < particleCount && spring.first != spring.second && std::isfinite(spring.restLength) && spring.restLength > kSpringEpsilon && std::isfinite(spring.stiffness) && spring.stiffness >= 0.0 && std::isfinite(spring.damping) && spring.damping >= 0.0;
}

inline bool validChain(const SpringChain& chain) {
    if (chain.particles.empty() || !finiteVec2(chain.anchorPosition)) {
        return false;
    }
    for (const Particle& particle : chain.particles) {
        if (!finiteParticle(particle)) {
            return false;
        }
    }
    for (const Spring& spring : chain.springs) {
        if (!validSpring(spring, chain.particles.size())) {
            return false;
        }
    }
    return true;
}

// Particle đầu tiên có inverseMass bằng zero nên trở thành điểm neo. Các vị trí
// còn lại cách nhau đúng restLength để initial state dễ kiểm chứng.
inline SpringChain makeVerticalChain(std::size_t particleCount, Vec2 anchorPosition, double restLength, double mass, double radius, double stiffness, double damping) {
    SpringChain chain{};
    chain.anchorPosition = anchorPosition;
    if (particleCount < 2 || !finiteVec2(anchorPosition) || !std::isfinite(restLength) || restLength <= 0.0 || !std::isfinite(mass) || mass <= 0.0 || !std::isfinite(radius) || radius <= 0.0 || !std::isfinite(stiffness) || stiffness < 0.0 || !std::isfinite(damping) || damping < 0.0) {
        return chain;
    }
    chain.particles.reserve(particleCount);
    chain.springs.reserve(particleCount - 1);
    for (std::size_t index = 0; index < particleCount; ++index) {
        Particle particle{};
        particle.position = {anchorPosition.x, anchorPosition.y - double(index) * restLength};
        if (index == 0) {
            particle.inverseMass = 0.0;
        } else {
            particle.inverseMass = 1.0 / mass;
        }
        particle.radius = radius;
        chain.particles.push_back(particle);
        if (index > 0) {
            chain.springs.push_back({index - 1, index, restLength, stiffness, damping});
        }
    }
    return chain;
}
#endif

#if LAB_CHECKPOINT >= 2
struct SpringSample {
    bool valid{};
    Vec2 direction{1.0, 0.0};
    double distance{};
    double stretch{};
    double relativeSpeed{};
    Vec2 forceOnFirst{};
};

// Hooke force kéo hai đầu về rest length. Ở checkpoint này damping chưa được
// cộng vào để người học nhìn riêng tác dụng của độ biến dạng.
inline SpringSample sampleElasticSpring(const SpringChain& chain, const Spring& spring) {
    if (!validSpring(spring, chain.particles.size())) {
        return {};
    }
    const Particle& first = chain.particles[spring.first];
    const Particle& second = chain.particles[spring.second];
    const Vec2 delta = subtract(second.position, first.position);
    const double distance = length(delta);
    if (!std::isfinite(distance) || distance <= kSpringEpsilon) {
        return {};
    }
    const Vec2 direction = scale(delta, 1.0 / distance);
    const double stretch = distance - spring.restLength;
    const Vec2 relativeVelocity = subtract(second.velocity, first.velocity);
    const double relativeSpeed = dot(relativeVelocity, direction);
    const double forceMagnitude = spring.stiffness * stretch;
    return {true, direction, distance, stretch, relativeSpeed, scale(direction, forceMagnitude)};
}
#endif

#if LAB_CHECKPOINT >= 3
inline void clearForces(SpringChain& chain) {
    for (Particle& particle : chain.particles) {
        particle.force = {};
    }
}

inline void addGravity(SpringChain& chain, Vec2 gravity) {
    if (!finiteVec2(gravity)) {
        return;
    }
    for (Particle& particle : chain.particles) {
        if (particle.inverseMass <= kSpringEpsilon) {
            continue;
        }
        const double mass = 1.0 / particle.inverseMass;
        particle.force = add(particle.force, scale(gravity, mass));
    }
}

inline void addElasticSpringForces(SpringChain& chain) {
    for (const Spring& spring : chain.springs) {
        const SpringSample sample = sampleElasticSpring(chain, spring);
        if (!sample.valid) {
            continue;
        }
        Particle& first = chain.particles[spring.first];
        Particle& second = chain.particles[spring.second];
        first.force = add(first.force, sample.forceOnFirst);
        second.force = subtract(second.force, sample.forceOnFirst);
    }
}

inline void accumulateElasticForces(SpringChain& chain, Vec2 gravity, bool gravityEnabled) {
    clearForces(chain);
    if (gravityEnabled) {
        addGravity(chain, gravity);
    }
    addElasticSpringForces(chain);
}
#endif

#if LAB_CHECKPOINT >= 4
inline void integrateParticle(Particle& particle, double deltaSeconds) {
    if (!finiteParticle(particle) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0 || particle.inverseMass <= kSpringEpsilon) {
        return;
    }
    const Vec2 acceleration = scale(particle.force, particle.inverseMass);
    particle.velocity = add(particle.velocity, scale(acceleration, deltaSeconds));
    particle.position = add(particle.position, scale(particle.velocity, deltaSeconds));
}

inline void enforceAnchor(SpringChain& chain) {
    if (chain.particles.empty()) {
        return;
    }
    Particle& anchor = chain.particles.front();
    anchor.position = chain.anchorPosition;
    anchor.velocity = {};
}

// Semi-implicit Euler cập nhật velocity trước position và luôn phục hồi anchor.
inline void stepElasticChain(SpringChain& chain, double deltaSeconds, Vec2 gravity, bool gravityEnabled) {
    if (!validChain(chain) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    accumulateElasticForces(chain, gravity, gravityEnabled);
    for (Particle& particle : chain.particles) {
        integrateParticle(particle, deltaSeconds);
    }
    enforceAnchor(chain);
}

struct FixedStepPlan {
    int steps{};
    double remainder{};
    double droppedTime{};
};

inline FixedStepPlan planFixedSteps(double accumulator, double frameSeconds, double fixedDeltaSeconds, int maximumSteps, double maximumFrameSeconds) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) || frameSeconds < 0.0 || !std::isfinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0.0 || maximumSteps <= 0 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }
    const double acceptedFrame = std::min(frameSeconds, maximumFrameSeconds);
    double available = accumulator + acceptedFrame;
    const int availableSteps = int(std::floor((available + kSpringEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= double(steps) * fixedDeltaSeconds;
    double droppedTime = std::max(0.0, frameSeconds - acceptedFrame);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        available -= double(discardedSteps) * fixedDeltaSeconds;
        droppedTime += double(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kSpringEpsilon) {
        available = 0.0;
    }
    return {steps, available, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 5
// Damping chỉ dùng relative speed dọc trục lò xo; chuyển động tiếp tuyến không
// bị mất năng lượng một cách vô cớ.
inline SpringSample sampleDampedSpring(const SpringChain& chain, const Spring& spring) {
    SpringSample sample = sampleElasticSpring(chain, spring);
    if (!sample.valid) {
        return sample;
    }
    const double forceMagnitude = spring.stiffness * sample.stretch + spring.damping * sample.relativeSpeed;
    sample.forceOnFirst = scale(sample.direction, forceMagnitude);
    return sample;
}

inline void accumulateDampedForces(SpringChain& chain, Vec2 gravity, bool gravityEnabled) {
    clearForces(chain);
    if (gravityEnabled) {
        addGravity(chain, gravity);
    }
    for (const Spring& spring : chain.springs) {
        const SpringSample sample = sampleDampedSpring(chain, spring);
        if (!sample.valid) {
            continue;
        }
        Particle& first = chain.particles[spring.first];
        Particle& second = chain.particles[spring.second];
        first.force = add(first.force, sample.forceOnFirst);
        second.force = subtract(second.force, sample.forceOnFirst);
    }
}

inline void stepDampedChain(SpringChain& chain, double deltaSeconds, Vec2 gravity, bool gravityEnabled) {
    if (!validChain(chain) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    accumulateDampedForces(chain, gravity, gravityEnabled);
    for (Particle& particle : chain.particles) {
        integrateParticle(particle, deltaSeconds);
    }
    enforceAnchor(chain);
}
#endif

#if LAB_CHECKPOINT >= 6
struct DragConstraint {
    bool active{};
    std::size_t particleIndex{kNoParticle};
    Vec2 target{};
    Vec2 releaseVelocity{};
};

inline std::size_t nearestDynamicParticle(const SpringChain& chain, Vec2 point, double maximumDistance) {
    if (!finiteVec2(point) || !std::isfinite(maximumDistance) || maximumDistance < 0.0) {
        return kNoParticle;
    }
    std::size_t nearest = kNoParticle;
    double nearestDistanceSquared = maximumDistance * maximumDistance;
    for (std::size_t index = 0; index < chain.particles.size(); ++index) {
        const Particle& particle = chain.particles[index];
        if (particle.inverseMass <= kSpringEpsilon) {
            continue;
        }
        const double distanceSquared = lengthSquared(subtract(particle.position, point));
        if (distanceSquared <= nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            nearest = index;
        }
    }
    return nearest;
}

inline bool beginDrag(SpringChain& chain, DragConstraint& drag, Vec2 point, double maximumDistance) {
    const std::size_t index = nearestDynamicParticle(chain, point, maximumDistance);
    if (index == kNoParticle) {
        return false;
    }
    drag.active = true;
    drag.particleIndex = index;
    drag.target = point;
    drag.releaseVelocity = {};
    chain.particles[index].velocity = {};
    return true;
}

inline bool moveDrag(SpringChain& chain, DragConstraint& drag, Vec2 target, double sampleSeconds, double maximumReleaseSpeed) {
    if (!drag.active || drag.particleIndex >= chain.particles.size() || !finiteVec2(target) || !std::isfinite(sampleSeconds) || sampleSeconds <= 0.0 || !std::isfinite(maximumReleaseSpeed) || maximumReleaseSpeed < 0.0) {
        return false;
    }
    Particle& particle = chain.particles[drag.particleIndex];
    const Vec2 displacement = subtract(target, drag.target);
    Vec2 sampledVelocity = scale(displacement, 1.0 / sampleSeconds);
    const double sampledSpeed = length(sampledVelocity);
    if (sampledSpeed > maximumReleaseSpeed && sampledSpeed > kSpringEpsilon) {
        sampledVelocity = scale(sampledVelocity, maximumReleaseSpeed / sampledSpeed);
    }
    drag.target = target;
    drag.releaseVelocity = sampledVelocity;
    particle.position = target;
    particle.velocity = {};
    return true;
}

inline bool endDrag(SpringChain& chain, DragConstraint& drag) {
    if (!drag.active || drag.particleIndex >= chain.particles.size()) {
        return false;
    }
    chain.particles[drag.particleIndex].velocity = drag.releaseVelocity;
    drag = {};
    return true;
}

inline void stepDampedChainWithDrag(SpringChain& chain, double deltaSeconds, Vec2 gravity, bool gravityEnabled, const DragConstraint& drag) {
    if (!validChain(chain) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    accumulateDampedForces(chain, gravity, gravityEnabled);
    for (std::size_t index = 0; index < chain.particles.size(); ++index) {
        if (drag.active && index == drag.particleIndex) {
            chain.particles[index].position = drag.target;
            chain.particles[index].velocity = {};
            continue;
        }
        integrateParticle(chain.particles[index], deltaSeconds);
    }
    enforceAnchor(chain);
}
#endif

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
    if (!validChain(chain)) {
        metrics.finite = false;
        return metrics;
    }
    for (const Particle& particle : chain.particles) {
        if (!finiteParticle(particle)) {
            metrics.finite = false;
            continue;
        }
        metrics.maximumSpeed = std::max(metrics.maximumSpeed, length(particle.velocity));
        if (particle.inverseMass <= kSpringEpsilon) {
            continue;
        }
        const double mass = 1.0 / particle.inverseMass;
        metrics.kineticEnergy += 0.5 * mass * lengthSquared(particle.velocity);
        if (gravityEnabled) {
            metrics.gravitationalEnergy += -mass * dot(gravity, particle.position);
        }
    }
    for (const Spring& spring : chain.springs) {
        const SpringSample sample = sampleElasticSpring(chain, spring);
        if (!sample.valid) {
            metrics.finite = false;
            continue;
        }
        metrics.maximumStretch = std::max(metrics.maximumStretch, std::abs(sample.stretch));
        metrics.springEnergy += 0.5 * spring.stiffness * sample.stretch * sample.stretch;
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

#if LAB_CHECKPOINT >= 1
} // namespace lab
#endif
