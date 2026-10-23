#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <limits>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kIntegratorEpsilon = 1e-12;

struct OscillatorParameters {
    double mass = 1.0;
    double stiffness = 4.0;
};

struct OscillatorState {
    double position = 0.0;
    double velocity = 0.0;
    double elapsed = 0.0;
};

// Dữ liệu lỗi không được biến thành một lực bằng 0 có vẻ hợp lệ.
inline bool validParameters(const OscillatorParameters& parameters) {
    return std::isfinite(parameters.mass) && std::isfinite(parameters.stiffness) && parameters.mass > 0.0 && parameters.stiffness >= 0.0 && std::isfinite(parameters.stiffness / parameters.mass);
}

inline bool finiteState(const OscillatorState& state) {
    return std::isfinite(state.position) && std::isfinite(state.velocity) && std::isfinite(state.elapsed) && state.elapsed >= 0.0;
}

inline OscillatorState invalidState() {
    const double undefined = std::numeric_limits<double>::quiet_NaN();
    return {undefined, undefined, undefined};
}

#if LAB_CHECKPOINT >= 1
inline double angularFrequency(const OscillatorParameters& parameters) {
    if (!validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return std::sqrt(parameters.stiffness / parameters.mass);
}

inline double oscillatorAcceleration(double position, const OscillatorParameters& parameters) {
    if (!std::isfinite(position) || !validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return -(parameters.stiffness / parameters.mass) * position;
}

inline double oscillatorEnergy(const OscillatorState& state, const OscillatorParameters& parameters) {
    if (!validParameters(parameters) || !finiteState(state)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    const double kinetic = 0.5 * parameters.mass * state.velocity * state.velocity;
    const double potential = 0.5 * parameters.stiffness * state.position * state.position;
    return kinetic + potential;
}

// time là khoảng thời gian kể từ initial, không phải đồng hồ máy.
inline OscillatorState analyticOscillatorState(const OscillatorState& initial, const OscillatorParameters& parameters, double time) {
    if (!finiteState(initial) || !validParameters(parameters) || !std::isfinite(time) || time < 0.0) {
        return invalidState();
    }
    const double omega = angularFrequency(parameters);
    if (omega == 0.0) {
        return {initial.position + initial.velocity * time, initial.velocity, initial.elapsed + time};
    }
    const double phase = omega * time;
    const double position = initial.position * std::cos(phase) + initial.velocity * std::sin(phase) / omega;
    const double velocity = -initial.position * omega * std::sin(phase) + initial.velocity * std::cos(phase);
    return {position, velocity, initial.elapsed + time};
}
#endif

enum class IntegratorKind { explicitEuler,
                            velocityVerlet,
                            rungeKutta4 };
inline constexpr std::array<IntegratorKind, 3> kDefaultKinds{IntegratorKind::explicitEuler, IntegratorKind::velocityVerlet, IntegratorKind::rungeKutta4};

inline const char* integratorName(IntegratorKind kind) {
    switch (kind) {
    case IntegratorKind::explicitEuler:
        return "Explicit Euler";
    case IntegratorKind::velocityVerlet:
        return "Velocity Verlet";
    case IntegratorKind::rungeKutta4:
        return "RK4";
    }
    return "Invalid";
}

struct IntegratorStepResult {
    OscillatorState state{};
    int forceEvaluations = 0;
};

inline bool validStep(const OscillatorState& current, const OscillatorParameters& parameters, double dt) {
    return finiteState(current) && validParameters(parameters) && std::isfinite(dt) && dt > 0.0;
}

inline IntegratorStepResult checkedStep(const OscillatorState& current, OscillatorState next, int evaluations) {
    if (!finiteState(next)) {
        return {current, 0};
    }
    return {next, evaluations};
}

#if LAB_CHECKPOINT >= 2
inline IntegratorStepResult explicitEulerStep(const OscillatorState& current, const OscillatorParameters& parameters, double dt) {
    if (!validStep(current, parameters, dt)) {
        return {current, 0};
    }
    const double acceleration = oscillatorAcceleration(current.position, parameters);
    OscillatorState next;
    // Cả hai dòng đều đọc trạng thái đầu bước, không đọc next.velocity.
    next.position = current.position + current.velocity * dt;
    next.velocity = current.velocity + acceleration * dt;
    next.elapsed = current.elapsed + dt;
    return checkedStep(current, next, 1);
}
#endif
#if LAB_CHECKPOINT >= 3
inline IntegratorStepResult velocityVerletStep(const OscillatorState& current, const OscillatorParameters& parameters, double dt) {
    if (!validStep(current, parameters, dt)) {
        return {current, 0};
    }
    const double accelerationStart = oscillatorAcceleration(current.position, parameters);
    const double position = current.position + current.velocity * dt + 0.5 * accelerationStart * dt * dt;
    const double accelerationEnd = oscillatorAcceleration(position, parameters);
    const double velocity = current.velocity + 0.5 * (accelerationStart + accelerationEnd) * dt;
    return checkedStep(current, {position, velocity, current.elapsed + dt}, 2);
}
#endif
#if LAB_CHECKPOINT >= 4
struct PhaseDerivative {
    double positionRate = 0.0;
    double velocityRate = 0.0;
};

inline PhaseDerivative oscillatorDerivative(const OscillatorState& state, const OscillatorParameters& parameters) {
    return {state.velocity, oscillatorAcceleration(state.position, parameters)};
}

inline OscillatorState offsetState(const OscillatorState& state, const PhaseDerivative& derivative, double amount) {
    return {state.position + derivative.positionRate * amount, state.velocity + derivative.velocityRate * amount, state.elapsed + amount};
}

inline IntegratorStepResult rungeKutta4Step(const OscillatorState& current, const OscillatorParameters& parameters, double dt) {
    if (!validStep(current, parameters, dt)) {
        return {current, 0};
    }
    const PhaseDerivative k1 = oscillatorDerivative(current, parameters);
    const PhaseDerivative k2 = oscillatorDerivative(offsetState(current, k1, 0.5 * dt), parameters);
    const PhaseDerivative k3 = oscillatorDerivative(offsetState(current, k2, 0.5 * dt), parameters);
    const PhaseDerivative k4 = oscillatorDerivative(offsetState(current, k3, dt), parameters);

    const double positionRate = (k1.positionRate + 2.0 * k2.positionRate + 2.0 * k3.positionRate + k4.positionRate) / 6.0;
    const double velocityRate = (k1.velocityRate + 2.0 * k2.velocityRate + 2.0 * k3.velocityRate + k4.velocityRate) / 6.0;
    const OscillatorState next{current.position + positionRate * dt, current.velocity + velocityRate * dt, current.elapsed + dt};
    return checkedStep(current, next, 4);
}
#endif

#if LAB_CHECKPOINT >= 2
inline IntegratorStepResult stepIntegrator(IntegratorKind kind, const OscillatorState& current, const OscillatorParameters& parameters, double dt) {
    switch (kind) {
#if LAB_CHECKPOINT >= 2
    case IntegratorKind::explicitEuler:
        return explicitEulerStep(current, parameters, dt);
#endif
#if LAB_CHECKPOINT >= 3
    case IntegratorKind::velocityVerlet:
        return velocityVerletStep(current, parameters, dt);
#endif
#if LAB_CHECKPOINT >= 4
    case IntegratorKind::rungeKutta4:
        return rungeKutta4Step(current, parameters, dt);
#endif
    default:
        (void)parameters;
        (void)dt;
        return {current, 0};
    }
}
#endif

struct IntegratorLane {
    IntegratorKind kind = IntegratorKind::explicitEuler;
    OscillatorState state{};
    std::size_t forceEvaluations = 0;
};

struct IntegratorRace {
    OscillatorState initial{};
    std::array<IntegratorLane, 3> lanes{};
    std::size_t stepCount = 0;
};

inline IntegratorRace makeIntegratorRace(const OscillatorState& initial, const std::array<IntegratorKind, 3>& kinds = kDefaultKinds) {
    IntegratorRace race;
    race.initial = initial;
    for (std::size_t index = 0; index < race.lanes.size(); ++index) {
        race.lanes[index] = {kinds[index], initial, 0};
    }
    return race;
}

#if LAB_CHECKPOINT >= 5
inline bool stepIntegratorRace(IntegratorRace& race, const OscillatorParameters& parameters, double dt) {
    std::array<IntegratorStepResult, 3> results{};
    for (std::size_t index = 0; index < race.lanes.size(); ++index) {
        results[index] = stepIntegrator(race.lanes[index].kind, race.lanes[index].state, parameters, dt);
        if (results[index].forceEvaluations == 0) {
            return false;
        }
    }
    // Chỉ commit khi cả ba kết quả hợp lệ: không làn nào được chạy trước.
    for (std::size_t index = 0; index < race.lanes.size(); ++index) {
        race.lanes[index].state = results[index].state;
        race.lanes[index].forceEvaluations += static_cast<std::size_t>(results[index].forceEvaluations);
    }
    ++race.stepCount;
    return true;
}
#endif

// Đã học ở Project 22. Kiểm giới hạn trước khi ép số thực sang int.
struct FixedStepPlan {
    int steps = 0;
    double remainder = 0.0;
    double droppedTime = 0.0;
};

inline FixedStepPlan planFixedSteps(double accumulator, double frameSeconds, double dt, int maximumSteps, double maximumFrameSeconds) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) || frameSeconds < 0.0 || !std::isfinite(dt) || dt < 1e-6 || maximumSteps <= 0 || maximumSteps > 256 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }
    const double acceptedFrame = std::min(frameSeconds, maximumFrameSeconds);
    const double available = accumulator + acceptedFrame;
    const double count = std::floor((available + kIntegratorEpsilon) / dt);
    if (!std::isfinite(available) || !std::isfinite(count)) {
        return {};
    }
    const int steps = static_cast<int>(std::min(count, static_cast<double>(maximumSteps)));
    const double remainder = std::max(0.0, std::fmod(available + kIntegratorEpsilon, dt) - kIntegratorEpsilon);
    const double dropped = std::max(0.0, frameSeconds - acceptedFrame) + std::max(0.0, available - remainder - static_cast<double>(steps) * dt);
    return {steps, remainder, dropped};
}

#if LAB_CHECKPOINT >= 6
struct IntegratorMetrics {
    double positionError = std::numeric_limits<double>::quiet_NaN();
    double phaseSpaceError = std::numeric_limits<double>::quiet_NaN();
    double relativeEnergyDrift = std::numeric_limits<double>::quiet_NaN();
};

inline IntegratorMetrics integratorMetrics(const OscillatorState& numerical, const OscillatorState& initial, const OscillatorParameters& parameters) {
    if (!finiteState(numerical) || !finiteState(initial) || !validParameters(parameters) || numerical.elapsed < initial.elapsed) {
        return {};
    }
    const OscillatorState exact = analyticOscillatorState(initial, parameters, numerical.elapsed - initial.elapsed);
    const double positionDifference = numerical.position - exact.position;
    const double velocityDifference = numerical.velocity - exact.velocity;
    const double omega = angularFrequency(parameters);
    IntegratorMetrics metrics;
    metrics.positionError = std::abs(positionDifference);
    if (omega > 0.0) {
        metrics.phaseSpaceError = std::hypot(positionDifference, velocityDifference / omega);
    }
    const double initialEnergy = oscillatorEnergy(initial, parameters);
    if (initialEnergy > 0.0 && std::isfinite(initialEnergy)) {
        metrics.relativeEnergyDrift = (oscillatorEnergy(numerical, parameters) - initialEnergy) / initialEnergy;
    }
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 7
struct IntegratorRunResult {
    OscillatorState state{};
    std::size_t steps = 0;
    std::size_t forceEvaluations = 0;
};

inline IntegratorRunResult runIntegrator(IntegratorKind kind, const OscillatorState& initial, const OscillatorParameters& parameters, double duration, double dt) {
    IntegratorRunResult run{initial, 0, 0};
    if (!validStep(initial, parameters, dt) || !std::isfinite(duration) || duration < 0.0) {
        return run;
    }
    const double count = std::floor((duration + kIntegratorEpsilon) / dt);
    if (!std::isfinite(count) || count > 10000.0) {
        return run;
    }
    for (std::size_t index = 0; index < static_cast<std::size_t>(count); ++index) {
        const auto result = stepIntegrator(kind, run.state, parameters, dt);
        if (result.forceEvaluations == 0) {
            break;
        }
        run.state = result.state;
        run.forceEvaluations += static_cast<std::size_t>(result.forceEvaluations);
        ++run.steps;
    }
    return run;
}
#endif
} // namespace lab
