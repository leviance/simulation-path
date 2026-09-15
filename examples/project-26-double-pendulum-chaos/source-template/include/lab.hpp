#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>

namespace lab {

inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kChaosEpsilon = 1e-12;

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

inline double length(Vec2 value) {
    return std::hypot(value.x, value.y);
}

struct DoublePendulumParameters {
    double mass1{1.0};
    double mass2{1.0};
    double length1{1.0};
    double length2{1.0};
    double gravity{9.81};
};

// Angle được đo từ phương thẳng đứng hướng xuống. State chỉ giữ generalized
// coordinates; vị trí bob luôn được suy ra để không có hai nguồn sự thật.
struct DoublePendulumState {
    double theta1{};
    double omega1{};
    double theta2{};
    double omega2{};
    double elapsed{};
};

struct DoublePendulumGeometry {
    Vec2 pivot{};
    Vec2 bob1{};
    Vec2 bob2{};
};

inline bool validParameters(const DoublePendulumParameters& parameters) {
    return std::isfinite(parameters.mass1) && std::isfinite(parameters.mass2) && std::isfinite(parameters.length1) && std::isfinite(parameters.length2) && std::isfinite(parameters.gravity) && parameters.mass1 > kChaosEpsilon && parameters.mass2 > kChaosEpsilon && parameters.length1 > kChaosEpsilon && parameters.length2 > kChaosEpsilon && parameters.gravity > kChaosEpsilon;
}

inline bool finiteState(const DoublePendulumState& state) {
    return std::isfinite(state.theta1) && std::isfinite(state.omega1) && std::isfinite(state.theta2) && std::isfinite(state.omega2) && std::isfinite(state.elapsed) && state.elapsed >= 0.0;
}

inline DoublePendulumGeometry pendulumGeometry(const DoublePendulumState& state, const DoublePendulumParameters& parameters) {
    DoublePendulumGeometry geometry{};
    geometry.bob1 = {parameters.length1 * std::sin(state.theta1), -parameters.length1 * std::cos(state.theta1)};
    geometry.bob2 = add(geometry.bob1, {parameters.length2 * std::sin(state.theta2), -parameters.length2 * std::cos(state.theta2)});
    return geometry;
}
#endif

#if LAB_CHECKPOINT >= 2
struct DoublePendulumDerivative {
    double theta1Rate{};
    double omega1Rate{};
    double theta2Rate{};
    double omega2Rate{};
    bool valid{};
};

// Hai angular acceleration phải được tính từ cùng state đầu vào. Không cập
// nhật theta hoặc omega giữa hai công thức vì như vậy sẽ tạo một hệ khác.
inline DoublePendulumDerivative pendulumDerivative(const DoublePendulumState& state, const DoublePendulumParameters& parameters) {
    if (!finiteState(state) || !validParameters(parameters)) {
        return {};
    }
    const double angleDifference = state.theta1 - state.theta2;
    const double sharedDenominator = 2.0 * parameters.mass1 + parameters.mass2 - parameters.mass2 * std::cos(2.0 * state.theta1 - 2.0 * state.theta2);
    const double denominator1 = parameters.length1 * sharedDenominator;
    const double denominator2 = parameters.length2 * sharedDenominator;
    if (std::abs(denominator1) <= kChaosEpsilon || std::abs(denominator2) <= kChaosEpsilon) {
        return {};
    }

    const double sineDifference = std::sin(angleDifference);
    const double cosineDifference = std::cos(angleDifference);
    const double omega1Squared = state.omega1 * state.omega1;
    const double omega2Squared = state.omega2 * state.omega2;

    const double gravityOnFirstRod = -parameters.gravity * (2.0 * parameters.mass1 + parameters.mass2) * std::sin(state.theta1);
    const double gravityFromSecondRod = -parameters.mass2 * parameters.gravity * std::sin(state.theta1 - 2.0 * state.theta2);
    const double velocityCouplingOnFirstRod = -2.0 * sineDifference * parameters.mass2 * (omega2Squared * parameters.length2 + omega1Squared * parameters.length1 * cosineDifference);
    const double acceleration1Numerator = gravityOnFirstRod + gravityFromSecondRod + velocityCouplingOnFirstRod;

    const double firstRodContribution = omega1Squared * parameters.length1 * (parameters.mass1 + parameters.mass2);
    const double gravityContribution = parameters.gravity * (parameters.mass1 + parameters.mass2) * std::cos(state.theta1);
    const double secondRodContribution = omega2Squared * parameters.length2 * parameters.mass2 * cosineDifference;
    const double acceleration2Numerator = 2.0 * sineDifference * (firstRodContribution + gravityContribution + secondRodContribution);

    DoublePendulumDerivative derivative{};
    derivative.theta1Rate = state.omega1;
    derivative.omega1Rate = acceleration1Numerator / denominator1;
    derivative.theta2Rate = state.omega2;
    derivative.omega2Rate = acceleration2Numerator / denominator2;
    derivative.valid = true;
    return derivative;
}
#endif

#if LAB_CHECKPOINT >= 3
inline DoublePendulumState addDerivative(const DoublePendulumState& state, const DoublePendulumDerivative& derivative, double factor) {
    return {state.theta1 + derivative.theta1Rate * factor, state.omega1 + derivative.omega1Rate * factor, state.theta2 + derivative.theta2Rate * factor, state.omega2 + derivative.omega2Rate * factor, state.elapsed + factor};
}

// Classical RK4 lấy bốn derivative sample nhưng chỉ tăng elapsed đúng một dt.
inline DoublePendulumState stepRk4(const DoublePendulumState& state, const DoublePendulumParameters& parameters, double deltaSeconds) {
    if (!finiteState(state) || !validParameters(parameters) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return state;
    }
    const DoublePendulumDerivative k1 = pendulumDerivative(state, parameters);
    const DoublePendulumDerivative k2 = pendulumDerivative(addDerivative(state, k1, 0.5 * deltaSeconds), parameters);
    const DoublePendulumDerivative k3 = pendulumDerivative(addDerivative(state, k2, 0.5 * deltaSeconds), parameters);
    const DoublePendulumDerivative k4 = pendulumDerivative(addDerivative(state, k3, deltaSeconds), parameters);
    if (!k1.valid || !k2.valid || !k3.valid || !k4.valid) {
        return state;
    }
    const auto weighted = [](double first, double second, double third, double fourth) {
        return (first + 2.0 * second + 2.0 * third + fourth) / 6.0;
    };
    DoublePendulumState next = state;
    next.theta1 += deltaSeconds * weighted(k1.theta1Rate, k2.theta1Rate, k3.theta1Rate, k4.theta1Rate);
    next.omega1 += deltaSeconds * weighted(k1.omega1Rate, k2.omega1Rate, k3.omega1Rate, k4.omega1Rate);
    next.theta2 += deltaSeconds * weighted(k1.theta2Rate, k2.theta2Rate, k3.theta2Rate, k4.theta2Rate);
    next.omega2 += deltaSeconds * weighted(k1.omega2Rate, k2.omega2Rate, k3.omega2Rate, k4.omega2Rate);
    next.elapsed += deltaSeconds;
    return next;
}

inline double pendulumEnergy(const DoublePendulumState& state, const DoublePendulumParameters& parameters) {
    if (!finiteState(state) || !validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    const double velocity1Squared = parameters.length1 * parameters.length1 * state.omega1 * state.omega1;
    const double velocity2X = parameters.length1 * state.omega1 * std::cos(state.theta1) + parameters.length2 * state.omega2 * std::cos(state.theta2);
    const double velocity2Y = parameters.length1 * state.omega1 * std::sin(state.theta1) + parameters.length2 * state.omega2 * std::sin(state.theta2);
    const double kinetic = 0.5 * parameters.mass1 * velocity1Squared + 0.5 * parameters.mass2 * (velocity2X * velocity2X + velocity2Y * velocity2Y);
    const double potential = parameters.mass1 * parameters.gravity * parameters.length1 * (1.0 - std::cos(state.theta1)) + parameters.mass2 * parameters.gravity * (parameters.length1 * (1.0 - std::cos(state.theta1)) + parameters.length2 * (1.0 - std::cos(state.theta2)));
    return kinetic + potential;
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
    const int availableSteps = int(std::floor((available + kChaosEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= double(steps) * fixedDeltaSeconds;
    double droppedTime = std::max(0.0, frameSeconds - acceptedFrame);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        available -= double(discardedSteps) * fixedDeltaSeconds;
        droppedTime += double(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kChaosEpsilon) {
        available = 0.0;
    }
    return {steps, available, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 4
struct TwinPendulums {
    DoublePendulumState initialPrimary{};
    DoublePendulumState initialPerturbed{};
    DoublePendulumState primary{};
    DoublePendulumState perturbed{};
    std::size_t stepCount{};
};

inline TwinPendulums makeTwinPendulums(const DoublePendulumState& initial, double perturbationRadians) {
    DoublePendulumState perturbed = initial;
    perturbed.theta2 += perturbationRadians;
    return {initial, perturbed, initial, perturbed, 0};
}

inline void stepTwinPendulums(TwinPendulums& twins, const DoublePendulumParameters& parameters, double deltaSeconds) {
    const DoublePendulumState primary = stepRk4(twins.primary, parameters, deltaSeconds);
    const DoublePendulumState perturbed = stepRk4(twins.perturbed, parameters, deltaSeconds);
    if (primary.elapsed <= twins.primary.elapsed || perturbed.elapsed <= twins.perturbed.elapsed) {
        return;
    }
    twins.primary = primary;
    twins.perturbed = perturbed;
    ++twins.stepCount;
}
#endif

#if LAB_CHECKPOINT >= 5
inline double wrapAngle(double angle) {
    if (!std::isfinite(angle)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    double wrapped = std::fmod(angle + kPi, 2.0 * kPi);
    if (wrapped < 0.0) {
        wrapped += 2.0 * kPi;
    }
    wrapped -= kPi;
    if (wrapped == -kPi && angle > 0.0) {
        wrapped = kPi;
    }
    return wrapped;
}

inline double phaseSpaceSeparation(const DoublePendulumState& first, const DoublePendulumState& second, const DoublePendulumParameters& parameters) {
    if (!finiteState(first) || !finiteState(second) || !validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    const double timeScale = std::sqrt((0.5 * (parameters.length1 + parameters.length2)) / parameters.gravity);
    const double angle1Difference = wrapAngle(second.theta1 - first.theta1);
    const double angle2Difference = wrapAngle(second.theta2 - first.theta2);
    const double omega1Difference = (second.omega1 - first.omega1) * timeScale;
    const double omega2Difference = (second.omega2 - first.omega2) * timeScale;
    return std::hypot(std::hypot(angle1Difference, angle2Difference), std::hypot(omega1Difference, omega2Difference));
}

inline double secondBobSeparation(const DoublePendulumState& first, const DoublePendulumState& second, const DoublePendulumParameters& parameters) {
    const DoublePendulumGeometry firstGeometry = pendulumGeometry(first, parameters);
    const DoublePendulumGeometry secondGeometry = pendulumGeometry(second, parameters);
    return length(subtract(secondGeometry.bob2, firstGeometry.bob2));
}

struct TwinMetrics {
    double phaseSeparation{};
    double secondBobDistance{};
    double finiteTimeExponent{std::numeric_limits<double>::quiet_NaN()};
    double relativeEnergyDrift{};
    bool finite{};
};

inline TwinMetrics measureTwins(const TwinPendulums& twins, const DoublePendulumParameters& parameters) {
    TwinMetrics metrics{};
    metrics.phaseSeparation = phaseSpaceSeparation(twins.primary, twins.perturbed, parameters);
    metrics.secondBobDistance = secondBobSeparation(twins.primary, twins.perturbed, parameters);
    const double initialSeparation = phaseSpaceSeparation(twins.initialPrimary, twins.initialPerturbed, parameters);
    if (twins.primary.elapsed > 0.0 && initialSeparation > kChaosEpsilon && metrics.phaseSeparation > kChaosEpsilon) {
        metrics.finiteTimeExponent = std::log(metrics.phaseSeparation / initialSeparation) / twins.primary.elapsed;
    }
    const double initialEnergy = pendulumEnergy(twins.initialPrimary, parameters);
    const double currentEnergy = pendulumEnergy(twins.primary, parameters);
    if (std::abs(initialEnergy) > kChaosEpsilon) {
        metrics.relativeEnergyDrift = (currentEnergy - initialEnergy) / std::abs(initialEnergy);
    }
    metrics.finite = finiteState(twins.primary) && finiteState(twins.perturbed) && std::isfinite(metrics.phaseSeparation) && std::isfinite(metrics.secondBobDistance) && std::isfinite(metrics.relativeEnergyDrift);
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 6
struct ChaosExperiment {
    TwinPendulums twins{};
    DoublePendulumState halfStepReference{};
};

inline ChaosExperiment makeChaosExperiment(const DoublePendulumState& initial, double perturbationRadians) {
    return {makeTwinPendulums(initial, perturbationRadians), initial};
}

inline void stepChaosExperiment(ChaosExperiment& experiment, const DoublePendulumParameters& parameters, double deltaSeconds) {
    const DoublePendulumState firstHalf = stepRk4(experiment.halfStepReference, parameters, 0.5 * deltaSeconds);
    const DoublePendulumState secondHalf = stepRk4(firstHalf, parameters, 0.5 * deltaSeconds);
    const std::size_t previousStepCount = experiment.twins.stepCount;
    stepTwinPendulums(experiment.twins, parameters, deltaSeconds);
    if (experiment.twins.stepCount > previousStepCount && secondHalf.elapsed > experiment.halfStepReference.elapsed) {
        experiment.halfStepReference = secondHalf;
    }
}

struct ChaosMetrics {
    TwinMetrics twins{};
    double numericalSeparation{};
    bool finite{};
};

inline ChaosMetrics measureChaos(const ChaosExperiment& experiment, const DoublePendulumParameters& parameters) {
    ChaosMetrics metrics{};
    metrics.twins = measureTwins(experiment.twins, parameters);
    metrics.numericalSeparation = phaseSpaceSeparation(experiment.twins.primary, experiment.halfStepReference, parameters);
    metrics.finite = metrics.twins.finite && finiteState(experiment.halfStepReference) && std::isfinite(metrics.numericalSeparation);
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 7
enum class ChaosPreset {
    calm,
    chaotic,
    nearUpright,
};

inline DoublePendulumState presetState(ChaosPreset preset) {
    if (preset == ChaosPreset::calm) {
        return {0.6, 0.0, 0.8, 0.0, 0.0};
    }
    if (preset == ChaosPreset::nearUpright) {
        return {kPi - 0.08, 0.0, kPi - 0.16, 0.0, 0.0};
    }
    return {2.0, 0.0, 1.1, 0.0, 0.0};
}

struct ChaosRunResult {
    ChaosExperiment experiment{};
    ChaosMetrics metrics{};
    int steps{};
};

inline ChaosRunResult runChaosExperiment(ChaosPreset preset, const DoublePendulumParameters& parameters, double perturbationRadians, double duration, double deltaSeconds) {
    ChaosRunResult result{};
    result.experiment = makeChaosExperiment(presetState(preset), perturbationRadians);
    if (!validParameters(parameters) || !std::isfinite(duration) || duration < 0.0 || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        result.metrics = measureChaos(result.experiment, parameters);
        return result;
    }
    const int plannedSteps = int(std::floor(duration / deltaSeconds + kChaosEpsilon));
    for (int step = 0; step < plannedSteps; ++step) {
        stepChaosExperiment(result.experiment, parameters, deltaSeconds);
        ++result.steps;
        if (!measureChaos(result.experiment, parameters).finite) {
            break;
        }
    }
    result.metrics = measureChaos(result.experiment, parameters);
    return result;
}
#endif

#if LAB_CHECKPOINT >= 1
} // namespace lab
#endif
