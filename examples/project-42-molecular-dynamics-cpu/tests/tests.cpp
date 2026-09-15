#include "molecular_dynamics.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        std::cout << "[PASS] " << label << '\n';
        return;
    }
    std::cerr << "[FAIL] " << label << '\n';
    ++failures;
}

bool nearlyEqual(double first, double second, double tolerance = 1.0e-10) {
    return std::abs(first - second) <= tolerance;
}

void testLatticeInitialization() {
    const md::SimulationBox box = md::makeBoxForDensity(1000U, 0.7);
    const std::vector<md::Particle> first = md::createLatticeParticles(1000U, box, 42U);
    const std::vector<md::Particle> second = md::createLatticeParticles(1000U, box, 42U);
    check(first.size() == 1000U, "lattice creates exactly one thousand particles");
    check(md::sameParticles(first, second), "same seed reproduces every particle");
    bool allInside = true;
    for (const md::Particle& particle : first) {
        allInside = allInside && md::particleInsideBox(particle, box);
    }
    check(allInside, "every lattice particle starts inside the box");
}

void testTemperatureInitialization() {
    md::MolecularSystem system = md::makeMolecularSystem(64U, 0.4, 9U, 0.55);
    check(
        md::length(md::linearMomentum(system.particles)) < 1.0e-10,
        "thermal initialization removes center-of-mass momentum"
    );
    check(
        nearlyEqual(md::kineticTemperature(system.particles), 0.4, 1.0e-12),
        "thermal initialization reaches the requested temperature"
    );
}

void testForceShiftedCutoff() {
    const md::MolecularParameters parameters{};
    const md::PairSample justInside = md::sampleForceShiftedPair(
        parameters.cutoff - 1.0e-5,
        parameters
    );
    const md::PairSample atCutoff = md::sampleForceShiftedPair(
        parameters.cutoff,
        parameters
    );
    check(justInside.valid && justInside.active, "pair immediately inside cutoff is active");
    check(std::abs(justInside.potential) < 1.0e-8, "potential approaches zero at cutoff");
    check(std::abs(justInside.potentialSlope) < 1.0e-5, "force approaches zero at cutoff");
    check(
        atCutoff.valid && !atCutoff.active && atCutoff.potential == 0.0 &&
            atCutoff.potentialSlope == 0.0,
        "cutoff sample has exactly zero shifted potential and slope"
    );
}

void testAllPairsAccumulation() {
    md::MolecularSystem system = md::makeMolecularSystem(49U, 0.2, 12U, 0.55);
    const md::ForceEvaluation evaluation = md::accumulatePairForces(
        system.particles,
        system.parameters
    );
    check(evaluation.valid, "all-pairs force evaluation remains finite");
    check(md::unorderedPairCount(1000U) == 499500U, "one thousand particles have 499500 pairs");
    check(
        evaluation.evaluatedPairs == md::unorderedPairCount(system.particles.size()),
        "i less than j loop visits every unordered pair once"
    );
    md::Vec2 totalForce{};
    for (const md::Vec2 force : evaluation.forces) {
        totalForce = md::add(totalForce, force);
    }
    check(md::length(totalForce) < 1.0e-9, "internal pair forces sum to zero");

    system.particles.front().mass = 0.0;
    check(
        !md::accumulatePairForces(system.particles, system.parameters).valid,
        "invalid particle mass is rejected before force accumulation"
    );
}

void testReflectionAndFixedSteps() {
    const md::ReflectionResult left = md::reflectCoordinate(-0.25, -2.0, 10.0);
    const md::ReflectionResult right = md::reflectCoordinate(10.4, 3.0, 10.0);
    check(
        left.valid && left.position == 0.25 && left.velocity == 2.0,
        "left wall mirrors overshoot and normal velocity"
    );
    check(
        right.valid && nearlyEqual(right.position, 9.6) && right.velocity == -3.0,
        "right wall mirrors overshoot and normal velocity"
    );

    const md::FixedStepPlan oneFrame = md::planFixedSteps(0.0, 0.016, 0.002, 16, 0.05);
    const md::FixedStepPlan firstHalf = md::planFixedSteps(0.0, 0.007, 0.002, 16, 0.05);
    const md::FixedStepPlan secondHalf = md::planFixedSteps(
        firstHalf.remainder,
        0.009,
        0.002,
        16,
        0.05
    );
    check(
        oneFrame.steps == firstHalf.steps + secondHalf.steps,
        "render-frame split does not change fixed-step count"
    );
    const md::FixedStepPlan guarded = md::planFixedSteps(0.0, 1.0, 0.002, 8, 0.05);
    check(guarded.steps == 8, "fixed-step planner obeys maximum substeps");
    check(guarded.droppedTime > 0.9, "fixed-step planner reports discarded catch-up time");
}

void testBoundedEnergyRun() {
    md::MolecularSystem system = md::makeMolecularSystem(36U, 0.2, 123U, 0.55);
    const md::SystemMetrics initial = md::measureSystem(system);
    const bool completed = md::runBoundedSimulation(system, 0.4, 0.001, 500U);
    const md::SystemMetrics final = md::measureSystem(system);
    check(completed, "bounded stress run finishes within five hundred steps");
    check(initial.valid && final.valid, "bounded stress run remains finite");
    check(
        std::abs(md::relativeEnergyDrift(final.totalEnergy, initial.totalEnergy)) < 0.01,
        "bounded stress run keeps relative energy drift below one percent"
    );
}

void testNamedValidation() {
    const md::ValidationReport report = md::validateMolecularDynamics();
    check(report.deterministicInitialization, "validation: deterministic initialization");
    check(report.particlesInsideBox, "validation: particles inside box");
    check(report.momentumRemoved, "validation: momentum removed");
    check(report.exactPairCount, "validation: exact pair count");
    check(report.forceSumZero, "validation: internal force sum");
    check(report.cutoffContinuous, "validation: force-shifted cutoff");
    check(report.wallReflection, "validation: reflective boundary");
    check(report.finiteRun, "validation: finite bounded run");
    check(report.energyStable, "validation: energy drift");
    check(report.wallEvents > 0U, "validation: forced wall run includes an actual collision");
    check(report.wallEnergyDrift > 0.0 && report.wallEnergyDrift < 0.01, "validation: wall trajectory maximum drift");
    check(report.passed(), "validation: complete Project 42 contract");
}

void testThermalAndStepDiagnostics() {
    // Khối lượng khác nhau giúp phát hiện nhầm trung bình cộng với vận tốc tâm khối lượng.
    std::vector<md::Particle> particles = md::createLatticeParticles(4U, md::makeBoxForDensity(4U, 0.2), 4U);
    for (std::size_t index = 0; index < particles.size(); ++index) {
        particles[index].mass = double(index + 1U);
    }
    check(md::assignThermalVelocities(particles, 0.4, 9U), "mixed masses initialize successfully");
    check(md::length(md::linearMomentum(particles)) < 1.0e-10, "mixed masses have zero initial momentum");
    check(nearlyEqual(md::kineticTemperature(particles), 0.4), "mixed masses reach target temperature");
    const double initialKinetic = md::kineticEnergy(particles);
    for (md::Particle& particle : particles) {
        particle.velocity = md::add(particle.velocity, {3.0, -2.0});
    }
    check(nearlyEqual(md::kineticTemperature(particles), 0.4), "COM boost does not change thermal temperature");
    check(md::kineticEnergy(particles) > initialKinetic, "total energy still includes COM kinetic energy");

    md::MolecularSystem system = md::makeMolecularSystem(9U, 0.2, 1U, 0.2);
    md::ForceEvaluation completed;
    check(md::velocityVerletStep(system, 0.001, &completed), "step returns its completed force pass");
    const md::SystemMetrics reused = md::measureSystem(system, completed);
    const md::SystemMetrics rescanned = md::measureSystem(system);
    check(reused.valid && nearlyEqual(reused.totalEnergy, rescanned.totalEnergy), "reused force pass measures the same final state");
    check(reused.evaluatedPairs == 36U, "reported pair count belongs to one force pass");
    const md::MolecularSystem before = system;
    check(!md::velocityVerletStep(system, -1.0), "invalid dt rejects a step");
    check(md::sameParticles(system.particles, before.particles) && system.elapsed == before.elapsed, "rejected step preserves state");
    check(!md::measureRun(system, 0.001, 2001U).valid, "measurement refuses an excessive step budget");
    const double oldRoot = std::pow(2.0, 1.0 / 6.0);
    check(md::sampleForceShiftedPair(oldRoot, {}).potentialSlope < 0.0, "force-shifted equilibrium is not the old Lennard-Jones minimum");
}

} // namespace

int main() {
    // Mỗi phép kiểm chạy hữu hạn và không khởi tạo SDL hay mở cửa sổ.
    testLatticeInitialization();
    testTemperatureInitialization();
    testForceShiftedCutoff();
    testAllPairsAccumulation();
    testReflectionAndFixedSteps();
    testBoundedEnergyRun();
    testNamedValidation();
    testThermalAndStepDiagnostics();

    if (failures != 0) {
        std::cerr << failures << " Project 42 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 42 checks passed\n";
    return EXIT_SUCCESS;
}
