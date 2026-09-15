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
inline constexpr double kIntegratorEpsilon = 1e-12;

struct OscillatorParameters {
    double mass{1.0};
    double stiffness{4.0};
};

struct OscillatorState {
    double position{};
    double velocity{};
    double elapsed{};
};

inline bool validParameters(const OscillatorParameters& parameters) {
    return std::isfinite(parameters.mass) && std::isfinite(parameters.stiffness) && parameters.mass > kIntegratorEpsilon && parameters.stiffness >= 0.0;
}

inline double angularFrequency(const OscillatorParameters& parameters) {
    if (!validParameters(parameters)) {
        return 0.0;
    }
    return std::sqrt(parameters.stiffness / parameters.mass);
}

inline double oscillatorAcceleration(double position, const OscillatorParameters& parameters) {
    if (!std::isfinite(position) || !validParameters(parameters)) {
        return 0.0;
    }
    return -(parameters.stiffness / parameters.mass) * position;
}

inline double oscillatorEnergy(const OscillatorState& state, const OscillatorParameters& parameters) {
    if (!validParameters(parameters)) {
        return 0.0;
    }
    const double kinetic = 0.5 * parameters.mass * state.velocity * state.velocity;
    const double potential = 0.5 * parameters.stiffness * state.position * state.position;
    return kinetic + potential;
}

inline OscillatorState analyticOscillatorState(const OscillatorState& initial, const OscillatorParameters& parameters, double elapsedSeconds) {
    const double time = std::max(0.0, elapsedSeconds);
    const double omega = angularFrequency(parameters);
    if (omega <= kIntegratorEpsilon) {
        return {initial.position + initial.velocity * time, initial.velocity, time};
    }
    const double phase = omega * time;
    const double cosine = std::cos(phase);
    const double sine = std::sin(phase);
    const double position = initial.position * cosine + initial.velocity * sine / omega;
    const double velocity = -initial.position * omega * sine + initial.velocity * cosine;
    return {position, velocity, time};
}

#if LAB_CHECKPOINT >= 2
struct IntegratorStepResult {
    OscillatorState state{};
    int forceEvaluations{};
};

// Explicit Euler samples acceleration once at the state from the start of the step.
inline IntegratorStepResult explicitEulerStep(const OscillatorState& current, const OscillatorParameters& parameters, double deltaSeconds) {
    if (!validParameters(parameters) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return {current, 0};
    }
    const double acceleration = oscillatorAcceleration(current.position, parameters);
    OscillatorState next{};
    next.position = current.position + current.velocity * deltaSeconds;
    next.velocity = current.velocity + acceleration * deltaSeconds;
    next.elapsed = current.elapsed + deltaSeconds;
    return {next, 1};
}
#endif

#if LAB_CHECKPOINT >= 3
inline IntegratorStepResult velocityVerletStep(const OscillatorState& current, const OscillatorParameters& parameters, double deltaSeconds) {
    if (!validParameters(parameters) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return {current, 0};
    }
    const double accelerationStart = oscillatorAcceleration(current.position, parameters);
    const double position = current.position + current.velocity * deltaSeconds + 0.5 * accelerationStart * deltaSeconds * deltaSeconds;
    const double accelerationEnd = oscillatorAcceleration(position, parameters);
    const double velocity = current.velocity + 0.5 * (accelerationStart + accelerationEnd) * deltaSeconds;
    return {{position, velocity, current.elapsed + deltaSeconds}, 2};
}
#endif

#if LAB_CHECKPOINT >= 4
struct PhaseDerivative {
    double positionRate{};
    double velocityRate{};
};

inline PhaseDerivative oscillatorDerivative(const OscillatorState& state, const OscillatorParameters& parameters) {
    return {state.velocity, oscillatorAcceleration(state.position, parameters)};
}

inline OscillatorState offsetState(const OscillatorState& state, const PhaseDerivative& derivative, double amount) {
    return {
        state.position + derivative.positionRate * amount,
        state.velocity + derivative.velocityRate * amount,
        state.elapsed + amount,
    };
}

inline IntegratorStepResult rungeKutta4Step(const OscillatorState& current, const OscillatorParameters& parameters, double deltaSeconds) {
    if (!validParameters(parameters) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return {current, 0};
    }
    const PhaseDerivative k1 = oscillatorDerivative(current, parameters);
    const PhaseDerivative k2 = oscillatorDerivative(offsetState(current, k1, 0.5 * deltaSeconds), parameters);
    const PhaseDerivative k3 = oscillatorDerivative(offsetState(current, k2, 0.5 * deltaSeconds), parameters);
    const PhaseDerivative k4 = oscillatorDerivative(offsetState(current, k3, deltaSeconds), parameters);

    const double positionRate = (k1.positionRate + 2.0 * k2.positionRate + 2.0 * k3.positionRate + k4.positionRate) / 6.0;
    const double velocityRate = (k1.velocityRate + 2.0 * k2.velocityRate + 2.0 * k3.velocityRate + k4.velocityRate) / 6.0;
    return {
        {
            current.position + positionRate * deltaSeconds,
            current.velocity + velocityRate * deltaSeconds,
            current.elapsed + deltaSeconds,
        },
        4,
    };
}
#endif

#if LAB_CHECKPOINT >= 5
enum class IntegratorKind {
    explicitEuler,
    velocityVerlet,
    rungeKutta4,
};

inline IntegratorStepResult stepIntegrator(IntegratorKind kind, const OscillatorState& current, const OscillatorParameters& parameters, double deltaSeconds) {
    switch (kind) {
    case IntegratorKind::explicitEuler:
        return explicitEulerStep(current, parameters, deltaSeconds);
    case IntegratorKind::velocityVerlet:
        return velocityVerletStep(current, parameters, deltaSeconds);
    case IntegratorKind::rungeKutta4:
        return rungeKutta4Step(current, parameters, deltaSeconds);
    }
    return {current, 0};
}

struct IntegratorLane {
    OscillatorState state{};
    std::size_t forceEvaluations{};
};

struct IntegratorRace {
    OscillatorState initial{};
    IntegratorLane euler{};
    IntegratorLane verlet{};
    IntegratorLane rk4{};
    std::size_t stepCount{};
};

inline IntegratorRace makeIntegratorRace(const OscillatorState& initial) {
    return {initial, {initial, 0}, {initial, 0}, {initial, 0}, 0};
}

inline void stepIntegratorRace(IntegratorRace& race, const OscillatorParameters& parameters, double deltaSeconds) {
    const IntegratorStepResult euler = explicitEulerStep(race.euler.state, parameters, deltaSeconds);
    const IntegratorStepResult verlet = velocityVerletStep(race.verlet.state, parameters, deltaSeconds);
    const IntegratorStepResult rk4 = rungeKutta4Step(race.rk4.state, parameters, deltaSeconds);
    if (euler.forceEvaluations == 0 || verlet.forceEvaluations == 0 || rk4.forceEvaluations == 0) {
        return;
    }
    race.euler.state = euler.state;
    race.verlet.state = verlet.state;
    race.rk4.state = rk4.state;
    race.euler.forceEvaluations += std::size_t(euler.forceEvaluations);
    race.verlet.forceEvaluations += std::size_t(verlet.forceEvaluations);
    race.rk4.forceEvaluations += std::size_t(rk4.forceEvaluations);
    ++race.stepCount;
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
    const int availableSteps = int(std::floor((available + kIntegratorEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= double(steps) * fixedDeltaSeconds;
    double droppedTime = std::max(0.0, frameSeconds - acceptedFrame);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        available -= double(discardedSteps) * fixedDeltaSeconds;
        droppedTime += double(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kIntegratorEpsilon) {
        available = 0.0;
    }
    return {steps, available, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 6
struct IntegratorMetrics {
    double positionError{};
    double phaseSpaceError{std::numeric_limits<double>::quiet_NaN()};
    double relativeEnergyDrift{};
};

inline IntegratorMetrics integratorMetrics(const OscillatorState& numerical, const OscillatorState& initial, const OscillatorParameters& parameters) {
    const OscillatorState exact = analyticOscillatorState(initial, parameters, numerical.elapsed);
    const double positionDifference = numerical.position - exact.position;
    const double velocityDifference = numerical.velocity - exact.velocity;
    const double omega = angularFrequency(parameters);
    double phaseSpaceError = std::numeric_limits<double>::quiet_NaN();
    if (omega > kIntegratorEpsilon) {
        const double scaledVelocityDifference = velocityDifference / omega;
        phaseSpaceError = std::hypot(positionDifference, scaledVelocityDifference);
    }
    const double initialEnergy = oscillatorEnergy(initial, parameters);
    double relativeEnergyDrift = 0.0;
    if (initialEnergy > kIntegratorEpsilon) {
        relativeEnergyDrift = (oscillatorEnergy(numerical, parameters) - initialEnergy) / initialEnergy;
    }
    return {std::abs(positionDifference), phaseSpaceError, relativeEnergyDrift};
}
#endif

#if LAB_CHECKPOINT >= 7
struct IntegratorRunResult {
    OscillatorState state{};
    std::size_t steps{};
    std::size_t forceEvaluations{};
};

inline IntegratorRunResult runIntegrator(IntegratorKind kind, const OscillatorState& initial, const OscillatorParameters& parameters, double duration, double deltaSeconds) {
    IntegratorRunResult run{initial, 0, 0};
    if (!std::isfinite(duration) || duration < 0.0 || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return run;
    }
    const std::size_t stepCount = std::size_t(std::floor((duration + kIntegratorEpsilon) / deltaSeconds));
    for (std::size_t index = 0; index < stepCount; ++index) {
        const IntegratorStepResult step = stepIntegrator(kind, run.state, parameters, deltaSeconds);
        if (step.forceEvaluations == 0) {
            break;
        }
        run.state = step.state;
        run.forceEvaluations += std::size_t(step.forceEvaluations);
        ++run.steps;
    }
    return run;
}
#endif

} // namespace lab
#endif
