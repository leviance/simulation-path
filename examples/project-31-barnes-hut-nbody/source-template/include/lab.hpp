#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

namespace lab {

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(const Vec3& a, const Vec3& b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(const Vec3& a, const Vec3& b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(const Vec3& vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

inline Vec3 operator/(const Vec3& vector, double scalar) {
    return {vector.x / scalar, vector.y / scalar, vector.z / scalar};
}

inline Vec3& operator+=(Vec3& destination, const Vec3& source) {
    destination = destination + source;
    return destination;
}

inline double lengthSquared(const Vec3& vector) {
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

inline double length(const Vec3& vector) {
    return std::sqrt(lengthSquared(vector));
}

inline bool finiteVector(const Vec3& vector) {
    return std::isfinite(vector.x) && std::isfinite(vector.y) && std::isfinite(vector.z);
}

// [snippet:Body]
struct Body {
    Vec3 position{};
    Vec3 velocity{};
    double mass{1.0};
};

// [/snippet:Body]

class XorShift32 {
    public:
    explicit XorShift32(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0U) {
            state_ = 0x6d2b79f5U;
        }
    }

    std::uint32_t next() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return state_;
    }

    double unit() {
        return double(next()) / double(std::numeric_limits<std::uint32_t>::max());
    }

    private:
    std::uint32_t state_{};
};

// [snippet:makeGalaxyBodies]
inline std::vector<Body> makeGalaxyBodies(std::size_t count, std::uint32_t seed) {
    if (count > 8192) {
        throw std::invalid_argument("Body budget: 1..8192");
    }
    const std::size_t safeCount = std::max<std::size_t>(1U, count);
    XorShift32 random(seed);
    std::vector<Body> bodies{};
    bodies.reserve(safeCount);
    bodies.push_back({{}, {}, 120.0});

    for (std::size_t index = 1; index < safeCount; ++index) {
        const double radius = 0.08 + std::sqrt(random.unit()) * 0.9;
        const double angle = random.unit() * 6.283185307179586;
        const double thickness = (random.unit() - 0.5) * 0.08 * (1.1 - radius);
        // Reduced units: G=0.001, central mass=120, disk mass approximately 120.
        // Increasing N refines the disk instead of increasing its total mass.
        const double mass = (0.7 + random.unit() * 0.6) * 120.0 / double(safeCount - 1);
        const double enclosedMass = 120.0 + 120.0 * radius * radius;
        const double orbitalSpeed = std::sqrt(0.001 * enclosedMass / radius);
        const double speedJitter = 0.92 + random.unit() * 0.16;
        bodies.push_back({
            {std::cos(angle) * radius, std::sin(angle) * radius, thickness},
            {
                -std::sin(angle) * orbitalSpeed * speedJitter,
                std::cos(angle) * orbitalSpeed * speedJitter,
                (random.unit() - 0.5) * 0.01,
            },
            mass,
        });
    }

    Vec3 momentum{};
    for (const Body& body : bodies) {
        momentum += body.velocity * body.mass;
    }
    double systemMass = 0;
    for (const Body& body : bodies) {
        systemMass += body.mass;
    }
    // A common velocity shift removes bulk drift without kicking the central body.
    const Vec3 bulkVelocity = momentum / systemMass;
    for (Body& body : bodies) {
        body.velocity = body.velocity - bulkVelocity;
    }
    return bodies;
}

// [/snippet:makeGalaxyBodies]

struct OrbitCamera {
    Vec3 target{};
    double yaw{0.45};
    double pitch{-0.52};
    double distance{2.5};
    double fieldOfViewRadians{1.0471975512};
    double aspect{1.0};
    double nearPlane{0.1};
};

struct ProjectedPoint {
    double x{};
    double y{};
    double depth{};
    bool visible{};
};

inline ProjectedPoint projectBodyPoint(const Vec3& point, const OrbitCamera& camera) {
    const Vec3 relative = point - camera.target;
    const double cosineYaw = std::cos(camera.yaw);
    const double sineYaw = std::sin(camera.yaw);
    const double yawX = cosineYaw * relative.x - sineYaw * relative.z;
    const double yawZ = sineYaw * relative.x + cosineYaw * relative.z;
    const double cosinePitch = std::cos(camera.pitch);
    const double sinePitch = std::sin(camera.pitch);
    const double cameraY = cosinePitch * relative.y - sinePitch * yawZ;
    const double rotatedZ = sinePitch * relative.y + cosinePitch * yawZ;
    const double cameraZ = rotatedZ + camera.distance;
    if (cameraZ <= camera.nearPlane) {
        return {0.0, 0.0, cameraZ, false};
    }
    const double focalScale = 1.0 / std::tan(camera.fieldOfViewRadians * 0.5);
    return {
        yawX * focalScale / (cameraZ * std::max(0.0001, camera.aspect)),
        cameraY * focalScale / cameraZ,
        cameraZ,
        true,
    };
}

// Checkpoint 1: đo trạng thái toàn hệ trước khi thêm lực.
#if LAB_CHECKPOINT >= 1
inline double totalMass(std::span<const Body> bodies) {
    double mass = 0.0;
    for (const Body& body : bodies) {
        mass += body.mass;
    }
    return mass;
}

// [snippet:centerOfMass]
inline Vec3 centerOfMass(std::span<const Body> bodies) {
    double mass = 0.0;
    Vec3 weightedPosition{};
    for (const Body& body : bodies) {
        mass += body.mass;
        weightedPosition += body.position * body.mass;
    }
    if (mass <= 0.0) {
        return {};
    }
    return weightedPosition / mass;
}

// [/snippet:centerOfMass]

inline Vec3 totalMomentum(std::span<const Body> bodies) {
    Vec3 momentum{};
    for (const Body& body : bodies) {
        momentum += body.velocity * body.mass;
    }
    return momentum;
}
#endif

// Checkpoint 2: một nguồn khối lượng tạo gia tốc hấp dẫn có softening.
#if LAB_CHECKPOINT >= 2
// [snippet:softenedAcceleration]
inline Vec3 softenedAcceleration(
    const Vec3& targetPosition,
    const Vec3& sourcePosition,
    double sourceMass,
    double gravitationalConstant,
    double softening
) {
    const Vec3 displacement = sourcePosition - targetPosition;
    const double softenedDistanceSquared =
        lengthSquared(displacement) + softening * softening;
    if (softenedDistanceSquared <= 0.0 || sourceMass <= 0.0) {
        return {};
    }
    const double inverseDistanceCubed =
        1.0 / std::pow(softenedDistanceSquared, 1.5);
    return displacement * (gravitationalConstant * sourceMass * inverseDistanceCubed);
}

// [/snippet:softenedAcceleration]
#endif

// Checkpoint 3: oracle O(N^2) cộng từng nguồn thật, bỏ đúng target index.
#if LAB_CHECKPOINT >= 3
struct ForceMetrics {
    std::size_t visitedNodes{};
    std::size_t approximatedNodes{};
    std::size_t exactInteractions{};
};

struct AccelerationResult {
    Vec3 acceleration{};
    ForceMetrics metrics{};
};

// [snippet:directAcceleration]
inline AccelerationResult directAcceleration(
    std::span<const Body> bodies,
    std::size_t targetIndex,
    double gravitationalConstant,
    double softening
) {
    AccelerationResult result{};
    if (targetIndex >= bodies.size()) {
        return result;
    }
    for (std::size_t sourceIndex = 0; sourceIndex < bodies.size(); ++sourceIndex) {
        if (sourceIndex == targetIndex) {
            continue;
        }
        result.acceleration += softenedAcceleration(
            bodies[targetIndex].position,
            bodies[sourceIndex].position,
            bodies[sourceIndex].mass,
            gravitationalConstant,
            softening
        );
        ++result.metrics.exactInteractions;
    }
    return result;
}

// [/snippet:directAcceleration]

// [snippet:directAccelerations]
inline std::vector<Vec3> directAccelerations(
    std::span<const Body> bodies,
    double gravitationalConstant,
    double softening,
    std::size_t* interactionCount = nullptr
) {
    std::vector<Vec3> accelerations(bodies.size());
    std::size_t interactions = 0;
    for (std::size_t targetIndex = 0; targetIndex < bodies.size(); ++targetIndex) {
        const AccelerationResult result = directAcceleration(
            bodies,
            targetIndex,
            gravitationalConstant,
            softening
        );
        accelerations[targetIndex] = result.acceleration;
        interactions += result.metrics.exactInteractions;
    }
    if (interactionCount) {
        *interactionCount = interactions;
    }
    return accelerations;
}

// [/snippet:directAccelerations]
#endif

// Checkpoint 4: accumulator biến frame time thành các fixed physics steps có guard.
#if LAB_CHECKPOINT >= 4
struct FixedStepPlan {
    int steps{};
    double remainingSeconds{};
    bool droppedBacklog{};
};

inline FixedStepPlan planFixedSteps(
    double accumulatorSeconds,
    double frameSeconds,
    double fixedDeltaSeconds,
    int maximumSteps
) {
    if (!std::isfinite(accumulatorSeconds) || !std::isfinite(frameSeconds) ||
        !std::isfinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0 || maximumSteps < 1) {
        throw std::invalid_argument("Invalid fixed-step plan");
    }
    double available = accumulatorSeconds + std::clamp(frameSeconds, 0.0, 0.05);
    int steps = 0;
    while (available >= fixedDeltaSeconds && steps < maximumSteps) {
        available -= fixedDeltaSeconds;
        ++steps;
    }
    const bool droppedBacklog = available >= fixedDeltaSeconds;
    if (droppedBacklog) {
        // Bỏ các full step không thể bù trong frame này, nhưng giữ lại phần lẻ.
        // Nhờ vậy render không làm accumulator giật về đúng 0 một cách không cần thiết.
        available = std::fmod(available, fixedDeltaSeconds);
    }
    return {steps, available, droppedBacklog};
}

// [snippet:integrateSymplecticEuler]
inline void integrateSymplecticEuler(
    std::vector<Body>& bodies,
    std::span<const Vec3> accelerations,
    double deltaSeconds
) {
    if (accelerations.size() != bodies.size() || !std::isfinite(deltaSeconds) || deltaSeconds <= 0) {
        throw std::invalid_argument("Invalid integration input");
    }
    for (std::size_t index = 0; index < bodies.size(); ++index) {
        bodies[index].velocity += accelerations[index] * deltaSeconds;
        bodies[index].position += bodies[index].velocity * deltaSeconds;
    }
}

// [/snippet:integrateSymplecticEuler]
#endif

} // namespace lab
