#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

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
    const bool massesValid = std::isfinite(parameters.mass1) && std::isfinite(parameters.mass2) && parameters.mass1 > kChaosEpsilon && parameters.mass2 > kChaosEpsilon;
    const bool lengthsValid = std::isfinite(parameters.length1) && std::isfinite(parameters.length2) && parameters.length1 > kChaosEpsilon && parameters.length2 > kChaosEpsilon;
    const bool gravityValid = std::isfinite(parameters.gravity) && parameters.gravity > kChaosEpsilon;
    return massesValid && lengthsValid && gravityValid;
}

inline bool finiteState(const DoublePendulumState& state) {
    return std::isfinite(state.theta1) && std::isfinite(state.omega1) && std::isfinite(state.theta2) && std::isfinite(state.omega2) && std::isfinite(state.elapsed) && state.elapsed >= 0.0;
}

// Các trajectory phải được so ở cùng thời điểm, không phải cùng render frame.
inline bool sameTime(double first, double second) {
    const double scale = std::max({1.0, std::abs(first), std::abs(second)});
    return std::isfinite(first) && std::isfinite(second) && std::abs(first - second) <= 1e-10 * scale;
}

#if LAB_CHECKPOINT >= 1
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
    const double m1 = parameters.mass1;
    const double m2 = parameters.mass2;
    const double L1 = parameters.length1;
    const double L2 = parameters.length2;
    const double g = parameters.gravity;
    const double delta = state.theta1 - state.theta2;
    const double sine = std::sin(delta);
    const double cosine = std::cos(delta);

    // Hai phương trình tuyến tính theo alpha1/alpha2, tại cùng một state.
    const double a11 = (m1 + m2) * L1;
    const double a12 = m2 * L2 * cosine;
    const double a21 = L1 * cosine;
    const double a22 = L2;
    const double rhs1 = -m2 * L2 * state.omega2 * state.omega2 * sine - (m1 + m2) * g * std::sin(state.theta1);
    const double rhs2 = L1 * state.omega1 * state.omega1 * sine - g * std::sin(state.theta2);
    const double determinant = a11 * a22 - a12 * a21;
    if (!std::isfinite(determinant) || determinant <= kChaosEpsilon) {
        return {};
    }

    DoublePendulumDerivative derivative{};
    derivative.theta1Rate = state.omega1;
    derivative.omega1Rate = (rhs1 * a22 - a12 * rhs2) / determinant;
    derivative.theta2Rate = state.omega2;
    derivative.omega2Rate = (a11 * rhs2 - a21 * rhs1) / determinant;
    derivative.valid = std::isfinite(derivative.omega1Rate) && std::isfinite(derivative.omega2Rate);
    return derivative;
}
#endif

#if LAB_CHECKPOINT >= 3
inline DoublePendulumState addDerivative(const DoublePendulumState& state, const DoublePendulumDerivative& derivative, double factor) {
    DoublePendulumState next = state;
    next.theta1 += derivative.theta1Rate * factor;
    next.omega1 += derivative.omega1Rate * factor;
    next.theta2 += derivative.theta2Rate * factor;
    next.omega2 += derivative.omega2Rate * factor;
    next.elapsed += factor;
    return next;
}

// Classical RK4 lấy bốn derivative sample nhưng chỉ tăng elapsed đúng một dt.
inline DoublePendulumState stepRk4(const DoublePendulumState& state, const DoublePendulumParameters& parameters, double deltaSeconds) {
    if (!finiteState(state) || !validParameters(parameters) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return state;
    }
    const DoublePendulumDerivative k1 = pendulumDerivative(state, parameters);
    if (!k1.valid) {
        return state;
    }
    const DoublePendulumDerivative k2 = pendulumDerivative(addDerivative(state, k1, 0.5 * deltaSeconds), parameters);
    if (!k2.valid) {
        return state;
    }
    const DoublePendulumDerivative k3 = pendulumDerivative(addDerivative(state, k2, 0.5 * deltaSeconds), parameters);
    if (!k3.valid) {
        return state;
    }
    const DoublePendulumDerivative k4 = pendulumDerivative(addDerivative(state, k3, deltaSeconds), parameters);
    if (!k4.valid) {
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
    if (!finiteState(next) || next.elapsed <= state.elapsed) {
        return state;
    }
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
    const double available = accumulator + acceptedFrame;
    const double quotient = std::floor((available + kChaosEpsilon) / fixedDeltaSeconds);
    if (!std::isfinite(available) || !std::isfinite(quotient) || quotient > 9e15) {
        return {};
    }
    const int steps = static_cast<int>(std::min(quotient, static_cast<double>(maximumSteps)));
    const double discarded = std::max(0.0, quotient - steps) * fixedDeltaSeconds;
    const double remainder = std::max(0.0, available - quotient * fixedDeltaSeconds);
    return {steps, remainder, std::max(0.0, frameSeconds - acceptedFrame) + discarded};
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
    TwinPendulums twins{};
    twins.initialPrimary = initial;
    twins.initialPerturbed = perturbed;
    twins.primary = initial;
    twins.perturbed = perturbed;
    return twins;
}

inline bool stepTwinPendulums(TwinPendulums& twins, const DoublePendulumParameters& parameters, double deltaSeconds) {
    if (!sameTime(twins.primary.elapsed, twins.perturbed.elapsed)) {
        return false;
    }
    const DoublePendulumState primary = stepRk4(twins.primary, parameters, deltaSeconds);
    const DoublePendulumState perturbed = stepRk4(twins.perturbed, parameters, deltaSeconds);
    if (primary.elapsed <= twins.primary.elapsed || perturbed.elapsed <= twins.perturbed.elapsed || !sameTime(primary.elapsed, perturbed.elapsed)) {
        return false;
    }
    twins.primary = primary;
    twins.perturbed = perturbed;
    ++twins.stepCount;
    return true;
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
    if (!finiteState(first) || !finiteState(second) || !validParameters(parameters) || !sameTime(first.elapsed, second.elapsed)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    const double timeScale = std::sqrt((0.5 * parameters.length1 + 0.5 * parameters.length2) / parameters.gravity);
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
    double relativeEnergyDrift{std::numeric_limits<double>::quiet_NaN()};
    double perturbedRelativeEnergyDrift{std::numeric_limits<double>::quiet_NaN()};
    double absoluteEnergyDrift{};
    double perturbedAbsoluteEnergyDrift{};
    bool finite{};
};

inline TwinMetrics measureTwins(const TwinPendulums& twins, const DoublePendulumParameters& parameters) {
    TwinMetrics metrics{};
    metrics.phaseSeparation = phaseSpaceSeparation(twins.primary, twins.perturbed, parameters);
    metrics.secondBobDistance = secondBobSeparation(twins.primary, twins.perturbed, parameters);
    const double initialSeparation = phaseSpaceSeparation(twins.initialPrimary, twins.initialPerturbed, parameters);
    const double duration = twins.primary.elapsed - twins.initialPrimary.elapsed;
    if (duration > 0.0 && initialSeparation > 0.0 && metrics.phaseSeparation > 0.0) {
        metrics.finiteTimeExponent = (std::log(metrics.phaseSeparation) - std::log(initialSeparation)) / duration;
    }
    const double initialEnergy = pendulumEnergy(twins.initialPrimary, parameters);
    const double perturbedInitialEnergy = pendulumEnergy(twins.initialPerturbed, parameters);
    metrics.absoluteEnergyDrift = pendulumEnergy(twins.primary, parameters) - initialEnergy;
    metrics.perturbedAbsoluteEnergyDrift = pendulumEnergy(twins.perturbed, parameters) - perturbedInitialEnergy;
    if (std::abs(initialEnergy) > kChaosEpsilon) {
        metrics.relativeEnergyDrift = metrics.absoluteEnergyDrift / std::abs(initialEnergy);
    }
    if (std::abs(perturbedInitialEnergy) > kChaosEpsilon) {
        metrics.perturbedRelativeEnergyDrift = metrics.perturbedAbsoluteEnergyDrift / std::abs(perturbedInitialEnergy);
    }
    metrics.finite = finiteState(twins.primary) && finiteState(twins.perturbed) && std::isfinite(metrics.phaseSeparation) && std::isfinite(metrics.secondBobDistance) && std::isfinite(metrics.absoluteEnergyDrift) && std::isfinite(metrics.perturbedAbsoluteEnergyDrift);
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 6
struct ChaosExperiment {
    TwinPendulums twins{};
    DoublePendulumState halfStepReference{};
};

inline ChaosExperiment makeChaosExperiment(const DoublePendulumState& initial, double perturbationRadians) {
    ChaosExperiment experiment{};
    experiment.twins = makeTwinPendulums(initial, perturbationRadians);
    experiment.halfStepReference = initial;
    return experiment;
}

inline bool stepChaosExperiment(ChaosExperiment& experiment, const DoublePendulumParameters& parameters, double deltaSeconds) {
    if (!sameTime(experiment.twins.primary.elapsed, experiment.halfStepReference.elapsed)) {
        return false;
    }
    ChaosExperiment next = experiment;
    const DoublePendulumState firstHalf = stepRk4(experiment.halfStepReference, parameters, 0.5 * deltaSeconds);
    const DoublePendulumState secondHalf = stepRk4(firstHalf, parameters, 0.5 * deltaSeconds);
    if (firstHalf.elapsed <= experiment.halfStepReference.elapsed || secondHalf.elapsed <= firstHalf.elapsed || !stepTwinPendulums(next.twins, parameters, deltaSeconds)) {
        return false;
    }
    if (!sameTime(next.twins.primary.elapsed, secondHalf.elapsed)) {
        return false;
    }
    next.halfStepReference = secondHalf;
    // Hai half-step đã chạy đủ; chỉ đồng bộ nhãn thời gian để bỏ sai số cộng số thực.
    next.halfStepReference.elapsed = next.twins.primary.elapsed;
    experiment = next;
    return true;
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
    DoublePendulumState state{};
    if (preset == ChaosPreset::calm) {
        state.theta1 = 0.2;
        state.theta2 = 0.3;
    } else if (preset == ChaosPreset::nearUpright) {
        state.theta1 = kPi - 0.08;
        state.theta2 = kPi - 0.16;
    } else {
        state.theta1 = 2.0;
        state.theta2 = 1.1;
    }
    return state;
}

struct ChaosRunResult {
    ChaosExperiment experiment{};
    ChaosMetrics metrics{};
    int steps{};
    bool completed{};
};

inline ChaosRunResult runChaosExperiment(ChaosPreset preset, const DoublePendulumParameters& parameters, double perturbationRadians, double duration, double deltaSeconds) {
    ChaosRunResult result{};
    result.experiment = makeChaosExperiment(presetState(preset), perturbationRadians);
    if (!validParameters(parameters) || !std::isfinite(perturbationRadians) || !std::isfinite(duration) || duration < 0.0 || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return result;
    }
    const double requested = std::floor(duration / deltaSeconds + kChaosEpsilon);
    // API headless cũng có budget; không cast một thương vô hạn sang int.
    if (!std::isfinite(requested) || requested > 120000.0) {
        return result;
    }
    const int plannedSteps = static_cast<int>(requested);
    for (int step = 0; step < plannedSteps; ++step) {
        if (!stepChaosExperiment(result.experiment, parameters, deltaSeconds)) {
            break;
        }
        ++result.steps;
    }
    result.metrics = measureChaos(result.experiment, parameters);
    result.completed = result.steps == plannedSteps && result.metrics.finite;
    return result;
}
#endif

} // namespace lab
