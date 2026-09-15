#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <numeric>
#include <vector>

namespace md {

constexpr double kMinimumDistance = 1.0e-6;
constexpr double kDefaultDensity = 0.7;

#if LAB_CHECKPOINT >= 1
struct Vec2 {
    double x{};
    double y{};
};

inline Vec2 add(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

inline Vec2 subtract(Vec2 a, Vec2 b) {
    return {a.x - b.x, a.y - b.y};
}

inline Vec2 scale(Vec2 value, double factor) {
    return {value.x * factor, value.y * factor};
}

inline double lengthSquared(Vec2 value) {
    return value.x * value.x + value.y * value.y;
}

inline double length(Vec2 value) {
    return std::sqrt(lengthSquared(value));
}

inline bool finite(Vec2 value) {
    return std::isfinite(value.x) && std::isfinite(value.y);
}

struct Particle {
    Vec2 position{};
    Vec2 velocity{};
    double mass{1.0};
};

struct SimulationBox {
    double width{};
    double height{};
};

struct MolecularParameters {
    double epsilon{1.0};
    double sigma{1.0};
    double cutoff{2.5};
};

struct MolecularSystem {
    std::vector<Particle> particles;
    SimulationBox box{};
    MolecularParameters parameters{};
    double elapsed{};
    std::size_t stepCount{};
    double initialEnergy{};
    std::size_t wallCollisions{};
};

inline SimulationBox makeBoxForDensity(
    std::size_t particleCount,
    double density = kDefaultDensity,
    double aspectRatio = 16.0 / 9.0
) {
    if (particleCount == 0U || !std::isfinite(density) || !std::isfinite(aspectRatio) ||
        density <= 0.0 || aspectRatio <= 0.0) {
        const double invalid = std::numeric_limits<double>::quiet_NaN();
        return {invalid, invalid};
    }

    const double area = double(particleCount) / density;
    const double width = std::sqrt(area * aspectRatio);
    return {width, area / width};
}

class DeterministicRandom {
    public:
    explicit DeterministicRandom(std::uint32_t seed)
        : state_(seed) {}

    double next01() {
        state_ = state_ * 1664525U + 1013904223U;
        return double(state_) / 4294967296.0;
    }

    private:
    std::uint32_t state_{};
};

inline std::vector<Particle> createLatticeParticles(
    std::size_t particleCount,
    SimulationBox box,
    std::uint32_t seed = 42U
) {
    std::vector<Particle> particles;
    if (particleCount == 0U || !std::isfinite(box.width) || !std::isfinite(box.height) ||
        box.width <= 0.0 || box.height <= 0.0) {
        return particles;
    }

    const double suggestedColumns = std::sqrt(double(particleCount) * box.width / box.height);
    const std::size_t columns = std::size_t(std::ceil(suggestedColumns));
    const std::size_t rows = (particleCount + columns - 1U) / columns;
    const double cellWidth = box.width / double(columns);
    const double cellHeight = box.height / double(rows);
    const double jitterLimit = 0.08 * std::min(cellWidth, cellHeight);
    DeterministicRandom random(seed);
    particles.reserve(particleCount);

    for (std::size_t index = 0; index < particleCount; ++index) {
        const std::size_t column = index % columns;
        const std::size_t row = index / columns;
        const double jitterX = (2.0 * random.next01() - 1.0) * jitterLimit;
        const double jitterY = (2.0 * random.next01() - 1.0) * jitterLimit;
        particles.push_back({
            {(double(column) + 0.5) * cellWidth + jitterX,
                (double(row) + 0.5) * cellHeight + jitterY},
            {0.0, 0.0},
            1.0,
        });
    }
    return particles;
}

inline bool particleInsideBox(const Particle& particle, SimulationBox box) {
    return finite(particle.position) && finite(particle.velocity) &&
        std::isfinite(particle.mass) && particle.mass > 0.0 &&
        particle.position.x >= 0.0 && particle.position.x <= box.width &&
        particle.position.y >= 0.0 && particle.position.y <= box.height;
}
#endif

#if LAB_CHECKPOINT >= 2
inline double kineticEnergy(const std::vector<Particle>& particles) {
    double energy = 0.0;
    for (const Particle& particle : particles) {
        energy += 0.5 * particle.mass * lengthSquared(particle.velocity);
    }
    return energy;
}

inline Vec2 linearMomentum(const std::vector<Particle>& particles) {
    Vec2 momentum{};
    for (const Particle& particle : particles) {
        momentum = add(momentum, scale(particle.velocity, particle.mass));
    }
    return momentum;
}

inline double kineticTemperature(const std::vector<Particle>& particles) {
    if (particles.size() < 2U) {
        return 0.0;
    }
    double totalMass = 0.0;
    for (const Particle& particle : particles) {
        totalMass += particle.mass;
    }
    const Vec2 centerVelocity = scale(linearMomentum(particles), 1.0 / totalMass);
    double thermalEnergy = 0.0;
    for (const Particle& particle : particles) {
        const Vec2 relativeVelocity = subtract(particle.velocity, centerVelocity);
        thermalEnergy += 0.5 * particle.mass * lengthSquared(relativeVelocity);
    }
    // Chỉ loại chuyển động khối tâm khi đo; không sửa vận tốc của hạt.
    return 2.0 * thermalEnergy / double(2U * particles.size() - 2U);
}

inline bool assignThermalVelocities(
    std::vector<Particle>& particles,
    double targetTemperature,
    std::uint32_t seed = 7U
) {
    if (particles.size() < 2U || !std::isfinite(targetTemperature) ||
        targetTemperature <= 0.0) {
        return false;
    }

    DeterministicRandom random(seed);
    Vec2 weightedVelocity{};
    double totalMass = 0.0;
    for (Particle& particle : particles) {
        if (!std::isfinite(particle.mass) || particle.mass <= 0.0) {
            return false;
        }
        particle.velocity = {2.0 * random.next01() - 1.0, 2.0 * random.next01() - 1.0};
        weightedVelocity = add(weightedVelocity, scale(particle.velocity, particle.mass));
        totalMass += particle.mass;
    }
    if (!std::isfinite(totalMass) || totalMass <= 0.0) {
        return false;
    }

    const Vec2 centerVelocity = scale(weightedVelocity, 1.0 / totalMass);
    for (Particle& particle : particles) {
        particle.velocity = subtract(particle.velocity, centerVelocity);
    }

    const double currentEnergy = kineticEnergy(particles);
    const std::size_t degreesOfFreedom = 2U * particles.size() - 2U;
    const double targetEnergy = 0.5 * double(degreesOfFreedom) * targetTemperature;
    if (!std::isfinite(currentEnergy) || currentEnergy <= 0.0) {
        return false;
    }
    const double velocityScale = std::sqrt(targetEnergy / currentEnergy);
    for (Particle& particle : particles) {
        particle.velocity = scale(particle.velocity, velocityScale);
    }
    return std::all_of(particles.begin(), particles.end(), [](const Particle& particle) {
        return finite(particle.velocity);
    });
}
#endif

#if LAB_CHECKPOINT >= 3
struct PairSample {
    bool valid{};
    bool active{};
    double potential{};
    double potentialSlope{};
};

inline bool validParameters(const MolecularParameters& parameters) {
    return std::isfinite(parameters.epsilon) && std::isfinite(parameters.sigma) &&
        std::isfinite(parameters.cutoff) && parameters.epsilon > 0.0 &&
        parameters.sigma > kMinimumDistance && parameters.cutoff > parameters.sigma;
}

inline PairSample rawLennardJones(double distance, const MolecularParameters& parameters) {
    const double ratio = parameters.sigma / distance;
    const double ratio2 = ratio * ratio;
    const double ratio6 = ratio2 * ratio2 * ratio2;
    const double ratio12 = ratio6 * ratio6;
    return {
        true,
        true,
        4.0 * parameters.epsilon * (ratio12 - ratio6),
        24.0 * parameters.epsilon * (ratio6 - 2.0 * ratio12) / distance,
    };
}

inline PairSample sampleForceShiftedPair(
    double distance,
    const MolecularParameters& parameters = {}
) {
    if (!validParameters(parameters) || !std::isfinite(distance) ||
        distance <= kMinimumDistance) {
        return {};
    }
    if (distance >= parameters.cutoff) {
        return {true, false, 0.0, 0.0};
    }

    const PairSample sample = rawLennardJones(distance, parameters);
    const PairSample atCutoff = rawLennardJones(parameters.cutoff, parameters);
    return {
        true,
        true,
        sample.potential - atCutoff.potential -
            (distance - parameters.cutoff) * atCutoff.potentialSlope,
        sample.potentialSlope - atCutoff.potentialSlope,
    };
}
#endif

#if LAB_CHECKPOINT >= 4
struct ForceEvaluation {
    bool valid{};
    std::vector<Vec2> forces;
    double potentialEnergy{};
    std::size_t evaluatedPairs{};
    std::size_t activePairs{};
    double minimumDistance{std::numeric_limits<double>::infinity()};
};

inline std::size_t unorderedPairCount(std::size_t particleCount) {
    if (particleCount < 2U) {
        return 0U;
    }
    return particleCount * (particleCount - 1U) / 2U;
}

inline ForceEvaluation accumulatePairForces(
    const std::vector<Particle>& particles,
    const MolecularParameters& parameters = {}
) {
    ForceEvaluation evaluation{};
    evaluation.forces.assign(particles.size(), {});
    const bool validInput = validParameters(parameters) && std::all_of(particles.begin(), particles.end(), [](const Particle& particle) {
                                return finite(particle.position) && finite(particle.velocity) &&
                                    std::isfinite(particle.mass) && particle.mass > 0.0;
                            });
    if (!validInput) {
        return evaluation;
    }

    for (std::size_t first = 0; first < particles.size(); ++first) {
        for (std::size_t second = first + 1U; second < particles.size(); ++second) {
            ++evaluation.evaluatedPairs;
            const Vec2 delta = subtract(
                particles[second].position,
                particles[first].position
            );
            const double distance = length(delta);
            evaluation.minimumDistance = std::min(evaluation.minimumDistance, distance);
            const PairSample sample = sampleForceShiftedPair(distance, parameters);
            if (!sample.valid) {
                return evaluation;
            }
            if (!sample.active) {
                continue;
            }

            ++evaluation.activePairs;
            evaluation.potentialEnergy += sample.potential;
            const Vec2 forceOnFirst = scale(delta, sample.potentialSlope / distance);
            evaluation.forces[first] = add(evaluation.forces[first], forceOnFirst);
            evaluation.forces[second] = subtract(evaluation.forces[second], forceOnFirst);
        }
    }

    evaluation.valid = std::isfinite(evaluation.potentialEnergy) &&
        std::all_of(evaluation.forces.begin(), evaluation.forces.end(), finite);
    return evaluation;
}
#endif

#if LAB_CHECKPOINT >= 5
struct ReflectionResult {
    bool valid{};
    double position{};
    double velocity{};
};

inline ReflectionResult reflectCoordinate(double position, double velocity, double limit) {
    if (!std::isfinite(position) || !std::isfinite(velocity) ||
        !std::isfinite(limit) || limit <= 0.0) {
        return {false, position, velocity};
    }

    double reflectedPosition = position;
    double reflectedVelocity = velocity;
    for (int bounce = 0; bounce < 8; ++bounce) {
        if (reflectedPosition < 0.0) {
            reflectedPosition = -reflectedPosition;
            reflectedVelocity = -reflectedVelocity;
            continue;
        }
        if (reflectedPosition > limit) {
            reflectedPosition = 2.0 * limit - reflectedPosition;
            reflectedVelocity = -reflectedVelocity;
            continue;
        }
        return {true, reflectedPosition, reflectedVelocity};
    }
    return {false, reflectedPosition, reflectedVelocity};
}

inline bool velocityVerletStep(
    MolecularSystem& system,
    double dt,
    ForceEvaluation* completedEvaluation = nullptr
) {
    const bool validBox = std::isfinite(system.box.width) &&
        std::isfinite(system.box.height) && system.box.width > 0.0 &&
        system.box.height > 0.0;
    if (!std::isfinite(dt) || dt <= 0.0 || !validBox || system.particles.empty()) {
        return false;
    }
    const ForceEvaluation firstEvaluation = accumulatePairForces(
        system.particles,
        system.parameters
    );
    if (!firstEvaluation.valid) {
        return false;
    }

    std::vector<Particle> candidate = system.particles;
    std::size_t wallCollisions = 0U;
    for (std::size_t index = 0; index < candidate.size(); ++index) {
        Particle& particle = candidate[index];
        particle.velocity = add(
            particle.velocity,
            scale(firstEvaluation.forces[index], 0.5 * dt / particle.mass)
        );
        particle.position = add(particle.position, scale(particle.velocity, dt));
        if (particle.position.x < 0.0 || particle.position.x > system.box.width) {
            ++wallCollisions;
        }
        if (particle.position.y < 0.0 || particle.position.y > system.box.height) {
            ++wallCollisions;
        }
        const ReflectionResult reflectedX = reflectCoordinate(
            particle.position.x,
            particle.velocity.x,
            system.box.width
        );
        const ReflectionResult reflectedY = reflectCoordinate(
            particle.position.y,
            particle.velocity.y,
            system.box.height
        );
        if (!reflectedX.valid || !reflectedY.valid) {
            return false;
        }
        particle.position = {reflectedX.position, reflectedY.position};
        particle.velocity = {reflectedX.velocity, reflectedY.velocity};
    }

    ForceEvaluation secondEvaluation = accumulatePairForces(candidate, system.parameters);
    if (!secondEvaluation.valid) {
        return false;
    }
    for (std::size_t index = 0; index < candidate.size(); ++index) {
        Particle& particle = candidate[index];
        particle.velocity = add(
            particle.velocity,
            scale(secondEvaluation.forces[index], 0.5 * dt / particle.mass)
        );
        if (!finite(particle.velocity)) {
            return false;
        }
    }

    system.particles = std::move(candidate);
    system.elapsed += dt;
    ++system.stepCount;
    system.wallCollisions += wallCollisions;
    if (completedEvaluation != nullptr) {
        *completedEvaluation = std::move(secondEvaluation);
    }
    return true;
}

struct FixedStepPlan {
    int steps{};
    double remainder{};
    double droppedTime{};
};

inline FixedStepPlan planFixedSteps(
    double accumulator,
    double frameTime,
    double fixedDt,
    int maximumSteps,
    double maximumFrameTime
) {
    if (!std::isfinite(accumulator) || !std::isfinite(frameTime) ||
        !std::isfinite(fixedDt) || !std::isfinite(maximumFrameTime) ||
        accumulator < 0.0 || fixedDt <= 0.0 || maximumSteps < 0 ||
        maximumFrameTime < 0.0) {
        return {};
    }
    const double acceptedFrameTime = std::clamp(frameTime, 0.0, maximumFrameTime);
    const double availableTime = accumulator + acceptedFrameTime;
    const double tolerance = fixedDt * 1.0e-9;
    const int availableSteps = int(std::floor((availableTime + tolerance) / fixedDt));
    const int steps = std::min(availableSteps, maximumSteps);
    double remainder = availableTime - double(steps) * fixedDt;
    if (remainder < 0.0 && remainder > -tolerance) {
        remainder = 0.0;
    }

    double droppedTime = std::max(0.0, frameTime - acceptedFrameTime);
    if (availableSteps > maximumSteps) {
        const int skippedSteps = int(std::floor((remainder + tolerance) / fixedDt));
        droppedTime += double(skippedSteps) * fixedDt;
        remainder -= double(skippedSteps) * fixedDt;
        if (remainder < 0.0 && remainder > -tolerance) {
            remainder = 0.0;
        }
    }
    return {steps, remainder, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 6
struct SystemMetrics {
    bool valid{};
    double kinetic{};
    double potential{};
    double totalEnergy{};
    double temperature{};
    Vec2 momentum{};
    double minimumDistance{};
    std::size_t evaluatedPairs{};
    std::size_t activePairs{};
};

inline SystemMetrics measureSystem(
    const MolecularSystem& system,
    const ForceEvaluation& evaluation
) {
    const double kinetic = kineticEnergy(system.particles);
    const Vec2 momentum = linearMomentum(system.particles);
    const double total = kinetic + evaluation.potentialEnergy;
    return {
        evaluation.valid && std::isfinite(kinetic) && std::isfinite(total) && finite(momentum),
        kinetic,
        evaluation.potentialEnergy,
        total,
        kineticTemperature(system.particles),
        momentum,
        evaluation.minimumDistance,
        evaluation.evaluatedPairs,
        evaluation.activePairs,
    };
}

inline SystemMetrics measureSystem(const MolecularSystem& system) {
    return measureSystem(system, accumulatePairForces(system.particles, system.parameters));
}

inline double relativeEnergyDrift(double currentEnergy, double initialEnergy) {
    return (currentEnergy - initialEnergy) / std::max(std::abs(initialEnergy), 1.0e-12);
}

struct RunReport {
    bool valid{};
    double maximumEnergyDrift{};
};

inline RunReport measureRun(MolecularSystem& system, double dt, std::size_t steps) {
    RunReport report{};
    if (steps == 0U || steps > 2000U || system.particles.size() > 144U) {
        return report;
    }
    const SystemMetrics initial = measureSystem(system);
    if (!initial.valid) {
        return report;
    }
    ForceEvaluation evaluation{};
    for (std::size_t step = 0; step < steps; ++step) {
        if (!velocityVerletStep(system, dt, &evaluation)) {
            return report;
        }
        const SystemMetrics metrics = measureSystem(system, evaluation);
        if (!metrics.valid) {
            return report;
        }
        report.maximumEnergyDrift = std::max(
            report.maximumEnergyDrift,
            std::abs(relativeEnergyDrift(metrics.totalEnergy, initial.totalEnergy))
        );
    }
    report.valid = true;
    return report;
}
#endif

#if LAB_CHECKPOINT >= 7
struct WorkEstimate {
    std::size_t particleCount{};
    std::size_t evaluatedPairs{};
    double relativeToThousand{};
};

inline WorkEstimate estimateAllPairsWork(std::size_t particleCount) {
    const std::size_t pairs = unorderedPairCount(particleCount);
    const double thousandPairs = double(unorderedPairCount(1000U));
    return {particleCount, pairs, double(pairs) / thousandPairs};
}

inline bool runBoundedSimulation(
    MolecularSystem& system,
    double duration,
    double dt,
    std::size_t maximumSteps
) {
    if (!std::isfinite(duration) || !std::isfinite(dt) || duration < 0.0 ||
        dt <= 0.0) {
        return false;
    }
    const double requested = std::ceil(duration / dt);
    if (!std::isfinite(requested) || requested > double(maximumSteps)) {
        return false;
    }
    const std::size_t requestedSteps = std::size_t(requested);
    for (std::size_t step = 0; step < requestedSteps; ++step) {
        if (!velocityVerletStep(system, dt)) {
            return false;
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
inline MolecularSystem makeMolecularSystem(
    std::size_t particleCount,
    double targetTemperature = 0.35,
    std::uint32_t seed = 42U,
    double density = kDefaultDensity
) {
    MolecularSystem system{};
    system.box = makeBoxForDensity(particleCount, density);
    system.particles = createLatticeParticles(particleCount, system.box, seed);
    assignThermalVelocities(system.particles, targetTemperature, seed + 1U);
#if LAB_CHECKPOINT >= 4
    const ForceEvaluation evaluation = accumulatePairForces(system.particles, system.parameters);
    system.initialEnergy = kineticEnergy(system.particles) + evaluation.potentialEnergy;
#endif
    return system;
}
#endif

#if LAB_CHECKPOINT >= 8
struct ValidationReport {
    bool deterministicInitialization{};
    bool particlesInsideBox{};
    bool momentumRemoved{};
    bool exactPairCount{};
    bool forceSumZero{};
    bool cutoffContinuous{};
    bool wallReflection{};
    bool finiteRun{};
    bool energyStable{};
    double maximumEnergyDrift{};
    double wallEnergyDrift{};
    std::size_t wallEvents{};

    bool passed() const {
        return deterministicInitialization && particlesInsideBox && momentumRemoved &&
            exactPairCount && forceSumZero && cutoffContinuous && wallReflection &&
            finiteRun && energyStable;
    }
};

inline bool sameParticles(
    const std::vector<Particle>& first,
    const std::vector<Particle>& second
) {
    if (first.size() != second.size()) {
        return false;
    }
    for (std::size_t index = 0; index < first.size(); ++index) {
        if (first[index].position.x != second[index].position.x ||
            first[index].position.y != second[index].position.y ||
            first[index].velocity.x != second[index].velocity.x ||
            first[index].velocity.y != second[index].velocity.y) {
            return false;
        }
    }
    return true;
}

inline ValidationReport validateMolecularDynamics() {
    MolecularSystem first = makeMolecularSystem(36U, 0.2, 123U, 0.55);
    const MolecularSystem second = makeMolecularSystem(36U, 0.2, 123U, 0.55);
    ValidationReport report{};
    report.deterministicInitialization = sameParticles(first.particles, second.particles);
    report.particlesInsideBox = std::all_of(
        first.particles.begin(),
        first.particles.end(),
        [&first](const Particle& particle) {
            return particleInsideBox(particle, first.box);
        }
    );
    report.momentumRemoved = length(linearMomentum(first.particles)) < 1.0e-10;

    const ForceEvaluation evaluation = accumulatePairForces(first.particles, first.parameters);
    report.exactPairCount = evaluation.evaluatedPairs == unorderedPairCount(first.particles.size());
    const Vec2 forceSum = std::accumulate(
        evaluation.forces.begin(),
        evaluation.forces.end(),
        Vec2{},
        [](Vec2 sum, Vec2 force) {
            return add(sum, force);
        }
    );
    report.forceSumZero = length(forceSum) < 1.0e-9;

    const PairSample atCutoff = sampleForceShiftedPair(
        first.parameters.cutoff,
        first.parameters
    );
    const PairSample inside = sampleForceShiftedPair(first.parameters.cutoff - 1.0e-5);
    report.cutoffContinuous = atCutoff.valid && !atCutoff.active &&
        atCutoff.potential == 0.0 && atCutoff.potentialSlope == 0.0 &&
        inside.valid && std::abs(inside.potential) < 1.0e-8 &&
        std::abs(inside.potentialSlope) < 1.0e-5;
    const ReflectionResult reflected = reflectCoordinate(-0.25, -2.0, 10.0);
    report.wallReflection = reflected.valid && reflected.position == 0.25 &&
        reflected.velocity == 2.0;
    MolecularSystem wall = makeMolecularSystem(2U, 0.2, 42U, 0.02);
    wall.particles[0].position = {0.02, 1.0};
    wall.particles[1].position = {1.52, 1.0};
    wall.particles[0].velocity = {-1.0, 0.0};
    wall.particles[1].velocity = {0.0, 0.0};
    const RunReport wallRun = measureRun(wall, 0.0005, 200U);
    report.wallEvents = wall.wallCollisions;
    report.wallEnergyDrift = wallRun.maximumEnergyDrift;
    report.wallReflection = report.wallReflection && wallRun.valid && report.wallEvents > 0U &&
        report.wallEnergyDrift < 0.01;

    const RunReport run = measureRun(first, 0.001, 400U);
    report.finiteRun = run.valid;
    report.maximumEnergyDrift = run.maximumEnergyDrift;
    report.energyStable = report.finiteRun && report.maximumEnergyDrift < 0.01;
    return report;
}
#endif

} // namespace md
