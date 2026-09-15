#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>

namespace lj {

#if LAB_CHECKPOINT >= 1
// Dữ liệu hình học của một cặp nguyên tử, hoàn toàn độc lập với SDL và pixel.
constexpr double kDistanceEpsilon = 1.0e-9;

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

inline Vec2 scale(Vec2 value, double scalar) {
    return {value.x * scalar, value.y * scalar};
}

inline double dot(Vec2 left, Vec2 right) {
    return left.x * right.x + left.y * right.y;
}

inline double length(Vec2 value) {
    return std::hypot(value.x, value.y);
}

inline bool finite(Vec2 value) {
    return std::isfinite(value.x) && std::isfinite(value.y);
}

struct Atom {
    Vec2 position{};
    Vec2 velocity{};
    double mass{1.0};
};

struct PairState {
    Atom atomA{};
    Atom atomB{};
    double elapsed{};
};

inline bool validAtom(const Atom& atom) {
    return finite(atom.position) && finite(atom.velocity) && std::isfinite(atom.mass) &&
        atom.mass > kDistanceEpsilon;
}

inline bool validState(const PairState& state) {
    return validAtom(state.atomA) && validAtom(state.atomB) && std::isfinite(state.elapsed) &&
        state.elapsed >= 0.0;
}

inline Vec2 pairDelta(const PairState& state) {
    return subtract(state.atomB.position, state.atomA.position);
}

inline double pairDistance(const PairState& state) {
    return length(pairDelta(state));
}

inline double totalMass(const PairState& state) {
    return state.atomA.mass + state.atomB.mass;
}

inline Vec2 centerOfMass(const PairState& state) {
    const double mass = totalMass(state);
    if (!std::isfinite(mass) || mass <= kDistanceEpsilon) {
        return {};
    }
    const Vec2 weightedA = scale(state.atomA.position, state.atomA.mass);
    const Vec2 weightedB = scale(state.atomB.position, state.atomB.mass);
    return scale(add(weightedA, weightedB), 1.0 / mass);
}

inline PairState makeSymmetricPair(double separation, double mass = 1.0) {
    PairState state{};
    if (!std::isfinite(separation) || separation < 0.0 || !std::isfinite(mass) ||
        mass <= kDistanceEpsilon) {
        state.atomA.mass = 0.0;
        state.atomB.mass = 0.0;
        return state;
    }
    state.atomA.position = {-0.5 * separation, 0.0};
    state.atomB.position = {0.5 * separation, 0.0};
    state.atomA.mass = mass;
    state.atomB.mass = mass;
    return state;
}

#endif

#if LAB_CHECKPOINT >= 2
// Thế năng Lennard-Jones và các mốc đặc trưng trên trục khoảng cách.
struct LennardJonesParameters {
    double epsilon{1.0};
    double sigma{1.0};
};

struct PotentialSample {
    bool valid{};
    double distance{};
    double ratio6{};
    double ratio12{};
    double potential{};
};

inline bool validParameters(const LennardJonesParameters& parameters) {
    return std::isfinite(parameters.epsilon) && std::isfinite(parameters.sigma) &&
        parameters.epsilon > 0.0 && parameters.sigma > kDistanceEpsilon;
}

inline double equilibriumDistance(const LennardJonesParameters& parameters) {
    if (!validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return std::pow(2.0, 1.0 / 6.0) * parameters.sigma;
}

inline PotentialSample samplePotential(
    double distance,
    const LennardJonesParameters& parameters
) {
    PotentialSample sample{};
    sample.distance = distance;
    if (!validParameters(parameters) || !std::isfinite(distance) || distance <= kDistanceEpsilon) {
        return sample;
    }

    const double ratio = parameters.sigma / distance;
    const double ratio2 = ratio * ratio;
    sample.ratio6 = ratio2 * ratio2 * ratio2;
    sample.ratio12 = sample.ratio6 * sample.ratio6;
    sample.potential = 4.0 * parameters.epsilon * (sample.ratio12 - sample.ratio6);
    sample.valid = std::isfinite(sample.potential);
    return sample;
}

#endif

#if LAB_CHECKPOINT >= 3
// Đạo hàm dU/dr được đổi thành hai lực bằng nhau và ngược chiều.
struct PairInteraction {
    bool valid{};
    double distance{};
    double potential{};
    double potentialSlope{};
    Vec2 forceOnA{};
    Vec2 forceOnB{};
};

inline double potentialSlope(
    const PotentialSample& sample,
    const LennardJonesParameters& parameters
) {
    if (!sample.valid || !validParameters(parameters)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return (24.0 * parameters.epsilon / sample.distance) *
        (sample.ratio6 - 2.0 * sample.ratio12);
}

inline PairInteraction evaluatePair(
    const PairState& state,
    const LennardJonesParameters& parameters
) {
    PairInteraction interaction{};
    if (!validState(state)) {
        return interaction;
    }

    const Vec2 delta = pairDelta(state);
    const double distance = length(delta);
    const PotentialSample potential = samplePotential(distance, parameters);
    if (!potential.valid) {
        return interaction;
    }

    // potentialSlope là dU/dr. Vì delta hướng từ A tới B, slope dương hút A về B.
    const double slope = potentialSlope(potential, parameters);
    const Vec2 direction = scale(delta, 1.0 / distance);
    const Vec2 forceOnA = scale(direction, slope);
    if (!std::isfinite(slope) || !finite(forceOnA)) {
        return interaction;
    }

    interaction.valid = true;
    interaction.distance = distance;
    interaction.potential = potential.potential;
    interaction.potentialSlope = slope;
    interaction.forceOnA = forceOnA;
    interaction.forceOnB = scale(forceOnA, -1.0);
    return interaction;
}

#endif

#if LAB_CHECKPOINT >= 4
// Các đại lượng bảo toàn dùng để kiểm tra việc cộng lực theo cặp.
struct PairForces {
    bool valid{};
    Vec2 forceOnA{};
    Vec2 forceOnB{};
};

inline PairForces accumulatePairForces(
    const PairState& state,
    const LennardJonesParameters& parameters
) {
    const PairInteraction interaction = evaluatePair(state, parameters);
    if (!interaction.valid) {
        return {};
    }
    return {true, interaction.forceOnA, interaction.forceOnB};
}

inline Vec2 linearMomentum(const PairState& state) {
    return add(
        scale(state.atomA.velocity, state.atomA.mass),
        scale(state.atomB.velocity, state.atomB.mass)
    );
}

inline Vec2 centerOfMassVelocity(const PairState& state) {
    const double mass = totalMass(state);
    if (!std::isfinite(mass) || mass <= kDistanceEpsilon) {
        return {};
    }
    return scale(linearMomentum(state), 1.0 / mass);
}

inline double kineticEnergy(const PairState& state) {
    return 0.5 * state.atomA.mass * dot(state.atomA.velocity, state.atomA.velocity) +
        0.5 * state.atomB.mass * dot(state.atomB.velocity, state.atomB.velocity);
}

#endif

#if LAB_CHECKPOINT >= 5
// Một bước Velocity Verlet chỉ cập nhật state sau khi candidate đã hợp lệ.
struct FixedStepPlan {
    int steps{};
    double remainder{};
    double droppedTime{};
};

inline bool velocityVerletStep(
    PairState& state,
    const LennardJonesParameters& parameters,
    double deltaSeconds
) {
    if (!validState(state) || !validParameters(parameters) || !std::isfinite(deltaSeconds) ||
        deltaSeconds <= 0.0) {
        return false;
    }

    const PairForces before = accumulatePairForces(state, parameters);
    if (!before.valid) {
        return false;
    }
    const Vec2 accelerationA0 = scale(before.forceOnA, 1.0 / state.atomA.mass);
    const Vec2 accelerationB0 = scale(before.forceOnB, 1.0 / state.atomB.mass);

    PairState candidate = state;
    const double halfDeltaSquared = 0.5 * deltaSeconds * deltaSeconds;
    candidate.atomA.position = add(
        state.atomA.position,
        add(scale(state.atomA.velocity, deltaSeconds), scale(accelerationA0, halfDeltaSquared))
    );
    candidate.atomB.position = add(
        state.atomB.position,
        add(scale(state.atomB.velocity, deltaSeconds), scale(accelerationB0, halfDeltaSquared))
    );

    const PairForces after = accumulatePairForces(candidate, parameters);
    if (!after.valid) {
        return false;
    }
    const Vec2 accelerationA1 = scale(after.forceOnA, 1.0 / candidate.atomA.mass);
    const Vec2 accelerationB1 = scale(after.forceOnB, 1.0 / candidate.atomB.mass);
    candidate.atomA.velocity = add(
        state.atomA.velocity,
        scale(add(accelerationA0, accelerationA1), 0.5 * deltaSeconds)
    );
    candidate.atomB.velocity = add(
        state.atomB.velocity,
        scale(add(accelerationB0, accelerationB1), 0.5 * deltaSeconds)
    );
    candidate.elapsed += deltaSeconds;
    if (!validState(candidate)) {
        return false;
    }

    state = candidate;
    return true;
}

inline FixedStepPlan planFixedSteps(
    double accumulator,
    double frameSeconds,
    double fixedDeltaSeconds,
    int maximumSteps,
    double maximumFrameSeconds
) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) ||
        frameSeconds < 0.0 || !std::isfinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0.0 ||
        maximumSteps <= 0 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }

    const double acceptedFrame = std::min(frameSeconds, maximumFrameSeconds);
    double available = accumulator + acceptedFrame;
    const int availableSteps = int(std::floor((available + kDistanceEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= double(steps) * fixedDeltaSeconds;
    double droppedTime = std::max(0.0, frameSeconds - acceptedFrame);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        available -= double(discardedSteps) * fixedDeltaSeconds;
        droppedTime += double(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kDistanceEpsilon) {
        available = 0.0;
    }
    return {steps, std::max(0.0, available), droppedTime};
}

#endif

#if LAB_CHECKPOINT >= 6
// Đo năng lượng và chạy mô phỏng hữu hạn mà không cần mở cửa sổ SDL.
struct SystemMetrics {
    bool valid{};
    double distance{};
    double potential{};
    double kinetic{};
    double totalEnergy{};
    Vec2 momentum{};
    Vec2 center{};
};

inline SystemMetrics measureSystem(
    const PairState& state,
    const LennardJonesParameters& parameters
) {
    const PairInteraction interaction = evaluatePair(state, parameters);
    if (!interaction.valid) {
        return {};
    }
    const double kinetic = kineticEnergy(state);
    const double totalEnergy = kinetic + interaction.potential;
    if (!std::isfinite(kinetic) || !std::isfinite(totalEnergy)) {
        return {};
    }
    return {
        true,
        interaction.distance,
        interaction.potential,
        kinetic,
        totalEnergy,
        linearMomentum(state),
        centerOfMass(state),
    };
}

inline double relativeEnergyDrift(double currentEnergy, double initialEnergy) {
    const double denominator = std::max(std::abs(initialEnergy), kDistanceEpsilon);
    return (currentEnergy - initialEnergy) / denominator;
}

struct ExperimentReport {
    bool valid{};
    double maximumEnergyDrift{};
    std::size_t completedSteps{};
};

inline ExperimentReport assessExperiment(
    PairState state,
    const LennardJonesParameters& parameters,
    double dt,
    std::size_t steps = 1000U
) {
    ExperimentReport report{};
    const SystemMetrics initial = measureSystem(state, parameters);
    if (!initial.valid || steps == 0U || steps > 2000U) {
        return report;
    }
    for (std::size_t step = 0; step < steps; ++step) {
        if (!velocityVerletStep(state, parameters, dt)) {
            return report;
        }
        const SystemMetrics metrics = measureSystem(state, parameters);
        if (!metrics.valid) {
            return report;
        }
        report.maximumEnergyDrift = std::max(
            report.maximumEnergyDrift,
            std::abs(relativeEnergyDrift(metrics.totalEnergy, initial.totalEnergy))
        );
        ++report.completedSteps;
    }
    report.valid = true;
    return report;
}

inline bool runSimulation(
    PairState& state,
    const LennardJonesParameters& parameters,
    double duration,
    double deltaSeconds,
    std::size_t maximumSteps
) {
    if (!std::isfinite(duration) || duration < 0.0 || !std::isfinite(deltaSeconds) ||
        deltaSeconds <= 0.0) {
        return false;
    }
    const double requested = std::floor((duration + kDistanceEpsilon) / deltaSeconds);
    if (!std::isfinite(requested) || requested > double(maximumSteps)) {
        return false;
    }
    const std::size_t steps = std::size_t(requested);
    for (std::size_t step = 0; step < steps; ++step) {
        if (!velocityVerletStep(state, parameters, deltaSeconds)) {
            return false;
        }
    }
    return true;
}

#endif

#if LAB_CHECKPOINT >= 7
// Báo cáo riêng từng điều kiện để lỗi không bị giấu sau một bool duy nhất.
struct ValidationReport {
    bool landmarks{};
    bool forceDirections{};
    bool newtonThirdLaw{};
    bool finiteRun{};
    bool momentumConserved{};
    bool centerOfMassStable{};
    bool energyStable{};

    bool passed() const {
        return landmarks && forceDirections && newtonThirdLaw && finiteRun && momentumConserved &&
            centerOfMassStable && energyStable;
    }
};

inline ValidationReport validateModel(
    const LennardJonesParameters& parameters,
    double atomMass = 1.0
) {
    ValidationReport report{};
    if (!validParameters(parameters) || !std::isfinite(atomMass) || atomMass <= kDistanceEpsilon) {
        return report;
    }

    const double r0 = equilibriumDistance(parameters);
    const PotentialSample atSigma = samplePotential(parameters.sigma, parameters);
    const PotentialSample atEquilibrium = samplePotential(r0, parameters);
    const PairInteraction repulsive = evaluatePair(
        makeSymmetricPair(0.95 * parameters.sigma, atomMass),
        parameters
    );
    const PairInteraction attractive = evaluatePair(
        makeSymmetricPair(1.50 * parameters.sigma, atomMass),
        parameters
    );
    const PairInteraction equilibrium = evaluatePair(makeSymmetricPair(r0, atomMass), parameters);

    const double energyScale = std::max(1.0, parameters.epsilon);
    const double forceScale = std::max(1.0, parameters.epsilon / parameters.sigma);

    report.landmarks = atSigma.valid && atEquilibrium.valid &&
        std::abs(atSigma.potential) < 1.0e-10 * energyScale &&
        std::abs(atEquilibrium.potential + parameters.epsilon) < 1.0e-9 * energyScale &&
        equilibrium.valid && std::abs(equilibrium.potentialSlope) < 1.0e-9 * forceScale;
    report.forceDirections = repulsive.valid && attractive.valid &&
        repulsive.potentialSlope < 0.0 && attractive.potentialSlope > 0.0;
    report.newtonThirdLaw = attractive.valid &&
        length(add(attractive.forceOnA, attractive.forceOnB)) < 1.0e-12;

    PairState state = makeSymmetricPair(1.45 * parameters.sigma, atomMass);
    const SystemMetrics initial = measureSystem(state, parameters);
    const Vec2 initialCenter = centerOfMass(state);
    const double characteristicTime = parameters.sigma * std::sqrt(atomMass / parameters.epsilon);
    report.finiteRun = initial.valid && runSimulation(state, parameters, 20.0 * characteristicTime, characteristicTime / 1000.0, 25'000);
    const SystemMetrics final = measureSystem(state, parameters);
    if (!report.finiteRun || !final.valid) {
        return report;
    }
    report.momentumConserved = length(final.momentum) < 1.0e-9;
    report.centerOfMassStable =
        length(subtract(final.center, initialCenter)) < 1.0e-9 * parameters.sigma;
    report.energyStable =
        std::abs(relativeEnergyDrift(final.totalEnergy, initial.totalEnergy)) < 0.002;
    return report;
}

#endif

} // namespace lj
