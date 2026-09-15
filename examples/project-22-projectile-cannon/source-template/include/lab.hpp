#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <optional>
#include <vector>

namespace lab {

inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kGravity = -9.81;
inline constexpr double kPhysicsEpsilon = 1e-9;

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

inline Vec2 scale(Vec2 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar};
}

inline Vec2 lerp(Vec2 start, Vec2 end, double amount) {
    return add(start, scale(subtract(end, start), amount));
}

inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

inline double clampValue(double value, double minimum, double maximum) {
    return std::clamp(value, minimum, maximum);
}

struct WorldView {
    Vec2 screenOrigin{};
    double pixelsPerMeter{1.0};
};

inline Vec2 worldToScreen(Vec2 worldPoint, const WorldView& view) {
    return {
        view.screenOrigin.x + worldPoint.x * view.pixelsPerMeter,
        view.screenOrigin.y - worldPoint.y * view.pixelsPerMeter,
    };
}

inline Vec2 screenToWorld(Vec2 screenPoint, const WorldView& view) {
    if (!std::isfinite(view.pixelsPerMeter) || std::abs(view.pixelsPerMeter) <= kPhysicsEpsilon) {
        return {};
    }
    return {
        (screenPoint.x - view.screenOrigin.x) / view.pixelsPerMeter,
        (view.screenOrigin.y - screenPoint.y) / view.pixelsPerMeter,
    };
}

struct AimSelection {
    Vec2 velocity{};
    double speed{};
    double angleRadians{};
    bool valid{};
};

// Pointer delta lives in screen space; velocity lives in world units per second.
inline AimSelection aimFromScreenDrag(
    Vec2 screenOrigin,
    Vec2 screenPointer,
    double pixelsPerSpeed,
    double minimumSpeed,
    double maximumSpeed,
    double minimumAngle,
    double maximumAngle
) {
    if (!std::isfinite(pixelsPerSpeed) || pixelsPerSpeed <= kPhysicsEpsilon) {
        return {};
    }

    const Vec2 screenDelta = subtract(screenPointer, screenOrigin);
    const Vec2 rawVelocity{screenDelta.x / pixelsPerSpeed, -screenDelta.y / pixelsPerSpeed};
    const double rawSpeed = length(rawVelocity);
    if (!std::isfinite(rawSpeed) || rawSpeed <= kPhysicsEpsilon) {
        return {};
    }

    const double safeMinimumSpeed = std::min(minimumSpeed, maximumSpeed);
    const double safeMaximumSpeed = std::max(minimumSpeed, maximumSpeed);
    const double safeMinimumAngle = std::min(minimumAngle, maximumAngle);
    const double safeMaximumAngle = std::max(minimumAngle, maximumAngle);
    const double speed = clampValue(rawSpeed, safeMinimumSpeed, safeMaximumSpeed);
    const double angle = clampValue(std::atan2(rawVelocity.y, rawVelocity.x), safeMinimumAngle, safeMaximumAngle);
    return {{speed * std::cos(angle), speed * std::sin(angle)}, speed, angle, true};
}

#if LAB_CHECKPOINT >= 2
inline Vec2 velocityFromPolar(double speed, double angleRadians) {
    if (!std::isfinite(speed) || !std::isfinite(angleRadians)) {
        return {};
    }
    return {speed * std::cos(angleRadians), speed * std::sin(angleRadians)};
}

inline double speedFromVelocity(Vec2 velocity) {
    return length(velocity);
}

inline double angleFromVelocity(Vec2 velocity) {
    if (length(velocity) <= kPhysicsEpsilon) {
        return 0.0;
    }
    return std::atan2(velocity.y, velocity.x);
}
#endif

#if LAB_CHECKPOINT >= 3
struct BallisticLaunch {
    Vec2 position{};
    Vec2 velocity{};
    Vec2 acceleration{0.0, kGravity};
};

inline Vec2 analyticPosition(const BallisticLaunch& launch, double elapsedSeconds) {
    const double time = std::max(0.0, elapsedSeconds);
    const Vec2 velocityTerm = scale(launch.velocity, time);
    const Vec2 accelerationTerm = scale(launch.acceleration, 0.5 * time * time);
    return add(launch.position, add(velocityTerm, accelerationTerm));
}

inline Vec2 analyticVelocity(const BallisticLaunch& launch, double elapsedSeconds) {
    const double time = std::max(0.0, elapsedSeconds);
    return add(launch.velocity, scale(launch.acceleration, time));
}

inline std::optional<double> timeToApex(const BallisticLaunch& launch) {
    if (!std::isfinite(launch.acceleration.y) || launch.acceleration.y >= -kPhysicsEpsilon) {
        return std::nullopt;
    }
    const double time = -launch.velocity.y / launch.acceleration.y;
    if (!std::isfinite(time) || time < 0.0) {
        return std::nullopt;
    }
    return time;
}

inline std::vector<Vec2> sampleAnalyticTrajectory(const BallisticLaunch& launch, double duration, std::size_t segmentCount) {
    std::vector<Vec2> samples{};
    if (!std::isfinite(duration) || duration < 0.0 || segmentCount == 0) {
        return samples;
    }
    samples.reserve(segmentCount + 1);
    for (std::size_t index = 0; index <= segmentCount; ++index) {
        const double amount = static_cast<double>(index) / static_cast<double>(segmentCount);
        samples.push_back(analyticPosition(launch, duration * amount));
    }
    return samples;
}
#endif

#if LAB_CHECKPOINT >= 4
struct ProjectileState {
    Vec2 position{};
    Vec2 velocity{};
    double elapsed{};
    bool active{};
};

inline ProjectileState launchProjectile(const BallisticLaunch& launch) {
    return {launch.position, launch.velocity, 0.0, true};
}

// Explicit Euler deliberately uses the velocity captured at the start of the step.
inline void explicitEulerStep(ProjectileState& state, Vec2 acceleration, double deltaSeconds) {
    if (!state.active || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    const Vec2 startVelocity = state.velocity;
    state.position = add(state.position, scale(startVelocity, deltaSeconds));
    state.velocity = add(state.velocity, scale(acceleration, deltaSeconds));
    state.elapsed += deltaSeconds;
}
#endif

#if LAB_CHECKPOINT >= 5
struct FixedStepPlan {
    int steps{};
    double remainder{};
    double acceptedFrameTime{};
    double droppedTime{};
};

inline FixedStepPlan planFixedSteps(
    double accumulator,
    double frameSeconds,
    double fixedDeltaSeconds,
    int maximumSteps,
    double maximumFrameSeconds
) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) || frameSeconds < 0.0 || !std::isfinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0.0 || maximumSteps <= 0 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }

    const double acceptedFrameTime = std::min(frameSeconds, maximumFrameSeconds);
    double available = accumulator + acceptedFrameTime;
    const int availableSteps = static_cast<int>(std::floor((available + kPhysicsEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= static_cast<double>(steps) * fixedDeltaSeconds;

    double droppedTime = std::max(0.0, frameSeconds - acceptedFrameTime);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        droppedTime += static_cast<double>(discardedSteps) * fixedDeltaSeconds;
        available -= static_cast<double>(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kPhysicsEpsilon) {
        available = 0.0;
    }
    return {steps, available, acceptedFrameTime, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 6
inline std::optional<double> solveGroundImpactTime(const BallisticLaunch& launch, double groundY) {
    const double a = 0.5 * launch.acceleration.y;
    const double b = launch.velocity.y;
    const double c = launch.position.y - groundY;

    if (!std::isfinite(a) || !std::isfinite(b) || !std::isfinite(c)) {
        return std::nullopt;
    }
    if (std::abs(a) <= kPhysicsEpsilon) {
        if (std::abs(b) <= kPhysicsEpsilon) {
            return std::nullopt;
        }
        const double linearRoot = -c / b;
        if (linearRoot > kPhysicsEpsilon) {
            return linearRoot;
        }
        return std::nullopt;
    }

    const double discriminant = b * b - 4.0 * a * c;
    if (!std::isfinite(discriminant) || discriminant < 0.0) {
        return std::nullopt;
    }
    const double root = std::sqrt(std::max(0.0, discriminant));
    const double first = (-b - root) / (2.0 * a);
    const double second = (-b + root) / (2.0 * a);
    double best = std::numeric_limits<double>::infinity();
    if (first > kPhysicsEpsilon) {
        best = first;
    }
    if (second > kPhysicsEpsilon) {
        best = std::min(best, second);
    }
    if (!std::isfinite(best)) {
        return std::nullopt;
    }
    return best;
}

struct ImpactStepResult {
    bool impacted{};
    double stepFraction{1.0};
    Vec2 uncorrectedPosition{};
};

inline ImpactStepResult explicitEulerStepToGround(ProjectileState& state, Vec2 acceleration, double deltaSeconds, double groundY) {
    if (!state.active || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return {};
    }

    const ProjectileState before = state;
    explicitEulerStep(state, acceleration, deltaSeconds);
    const Vec2 uncorrectedPosition = state.position;
    if (before.position.y < groundY || state.position.y > groundY) {
        return {false, 1.0, uncorrectedPosition};
    }

    const double verticalTravel = before.position.y - state.position.y;
    if (verticalTravel <= kPhysicsEpsilon) {
        return {false, 1.0, uncorrectedPosition};
    }
    const double fraction = clampValue((before.position.y - groundY) / verticalTravel, 0.0, 1.0);
    state.position = lerp(before.position, state.position, fraction);
    state.position.y = groundY;
    state.velocity = lerp(before.velocity, state.velocity, fraction);
    state.elapsed = before.elapsed + deltaSeconds * fraction;
    state.active = false;
    return {true, fraction, uncorrectedPosition};
}
#endif

#if LAB_CHECKPOINT >= 7
inline double positionError(Vec2 numerical, Vec2 analytic) {
    return length(subtract(numerical, analytic));
}

struct TrajectoryComparison {
    Vec2 analytic{};
    Vec2 numerical{};
    double elapsed{};
    double error{};
};

inline TrajectoryComparison compareProjectile(const BallisticLaunch& launch, const ProjectileState& numerical) {
    const Vec2 analytic = analyticPosition(launch, numerical.elapsed);
    return {analytic, numerical.position, numerical.elapsed, positionError(numerical.position, analytic)};
}
#endif

} // namespace lab
#endif
