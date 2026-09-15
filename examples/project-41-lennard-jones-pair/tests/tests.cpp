#include "lennard_jones.hpp"

#include <array>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    ++failures;
    std::cerr << "FAIL: " << label << '\n';
}

bool nearlyEqual(double first, double second, double tolerance = 1.0e-9) {
    return std::abs(first - second) <= tolerance;
}

void testPairGeometry() {
    const lj::PairState state = lj::makeSymmetricPair(1.5, 2.0);
    check(nearlyEqual(lj::pairDelta(state).x, 1.5), "delta points from atom A to atom B");
    check(nearlyEqual(lj::pairDistance(state), 1.5), "pair distance is the length of delta");
    check(lj::length(lj::centerOfMass(state)) < 1.0e-12, "symmetric pair starts at zero center of mass");
    check(nearlyEqual(lj::totalMass(state), 4.0), "total mass includes both atoms");
}

void testInvalidPairInput() {
    check(!lj::validState(lj::makeSymmetricPair(-1.0)), "negative separation is rejected");
    check(!lj::validState(lj::makeSymmetricPair(1.0, 0.0)), "zero mass is rejected");
    check(
        !lj::validState(lj::makeSymmetricPair(1.0, std::numeric_limits<double>::quiet_NaN())),
        "non-finite mass is rejected"
    );
}

void testPotentialLandmarks() {
    const lj::LennardJonesParameters parameters{};
    const double equilibrium = lj::equilibriumDistance(parameters);
    const lj::PotentialSample atSigma = lj::samplePotential(parameters.sigma, parameters);
    const lj::PotentialSample atEquilibrium = lj::samplePotential(equilibrium, parameters);
    check(atSigma.valid && nearlyEqual(atSigma.potential, 0.0), "U(sigma) is zero");
    check(
        atEquilibrium.valid && nearlyEqual(atEquilibrium.potential, -parameters.epsilon),
        "U at 2^(1/6) sigma is minus epsilon"
    );
    check(
        !lj::samplePotential(0.0, parameters).valid,
        "zero separation is rejected instead of dividing by zero"
    );
}

void testForceMatchesPotentialSlope() {
    const lj::LennardJonesParameters parameters{};
    constexpr double distance = 1.35;
    constexpr double differenceStep = 1.0e-6;
    const lj::PairInteraction interaction = lj::evaluatePair(
        lj::makeSymmetricPair(distance),
        parameters
    );
    const double potentialBefore = lj::samplePotential(distance - differenceStep, parameters).potential;
    const double potentialAfter = lj::samplePotential(distance + differenceStep, parameters).potential;
    const double numericalDerivative =
        (potentialAfter - potentialBefore) / (2.0 * differenceStep);
    check(interaction.valid, "force sample is valid");
    check(
        std::abs(interaction.potentialSlope - numericalDerivative) < 1.0e-7,
        "force on A projected toward B matches dU/dr"
    );

    const lj::PairInteraction repulsive = lj::evaluatePair(
        lj::makeSymmetricPair(0.95),
        parameters
    );
    const lj::PairInteraction attractive = lj::evaluatePair(
        lj::makeSymmetricPair(1.50),
        parameters
    );
    check(repulsive.potentialSlope < 0.0, "r below equilibrium pushes atom A away from B");
    check(attractive.potentialSlope > 0.0, "r above equilibrium pulls atom A toward B");
    check(
        std::abs(lj::evaluatePair(lj::makeSymmetricPair(lj::equilibriumDistance(parameters)), parameters).potentialSlope) < 1.0e-9,
        "force is zero at equilibrium separation"
    );
}

void testNewtonThirdLawAndMomentum() {
    lj::PairState state = lj::makeSymmetricPair(1.4, 1.5);
    state.atomA.velocity = {0.2, -0.1};
    state.atomB.velocity = {-0.2, 0.1};
    const lj::PairInteraction interaction = lj::evaluatePair(state, {});
    check(interaction.valid, "pair interaction is valid");
    check(
        lj::length(lj::add(interaction.forceOnA, interaction.forceOnB)) < 1.0e-12,
        "pair forces are exactly equal and opposite"
    );
    check(lj::length(lj::linearMomentum(state)) < 1.0e-12, "symmetric velocities have zero total momentum");
    check(lj::length(lj::centerOfMassVelocity(state)) < 1.0e-12, "center-of-mass velocity follows momentum");
}

void testVelocityVerletSymmetry() {
    lj::PairState state = lj::makeSymmetricPair(1.45);
    const lj::Vec2 initialCenter = lj::centerOfMass(state);
    check(lj::velocityVerletStep(state, {}, 1.0 / 1000.0), "Velocity Verlet accepts a stable step");
    check(nearlyEqual(state.elapsed, 1.0 / 1000.0), "Velocity Verlet advances elapsed by exactly dt");
    check(lj::length(lj::centerOfMass(state)) < 1.0e-12, "one symmetric step keeps center of mass fixed");
    check(lj::length(lj::linearMomentum(state)) < 1.0e-12, "one symmetric step keeps momentum zero");
    check(
        lj::length(lj::subtract(lj::centerOfMass(state), initialCenter)) < 1.0e-12,
        "center-of-mass drift is zero after one step"
    );
}

void testMovingCenterOfMass() {
    lj::PairState state = lj::makeSymmetricPair(1.45, 1.5);
    state.atomA.velocity = {0.25, -0.10};
    state.atomB.velocity = {0.25, -0.10};
    const lj::Vec2 initialCenter = lj::centerOfMass(state);
    const lj::Vec2 centerVelocity = lj::centerOfMassVelocity(state);
    check(
        lj::runSimulation(state, {}, 1.0, 1.0 / 1000.0, 2'000),
        "moving-center preset completes its bounded run"
    );
    const lj::Vec2 expectedCenter = lj::add(initialCenter, lj::scale(centerVelocity, 1.0));
    check(
        lj::length(lj::subtract(lj::centerOfMass(state), expectedCenter)) < 1.0e-9,
        "center of mass moves at constant velocity when total momentum is non-zero"
    );
}

void testFixedStepGuard() {
    const lj::FixedStepPlan regular = lj::planFixedSteps(0.0, 0.016, 0.001, 32, 0.05);
    check(regular.steps == 16, "16 ms frame schedules sixteen 1 ms steps");
    check(regular.droppedTime == 0.0, "regular frame drops no time");

    const lj::FixedStepPlan guarded = lj::planFixedSteps(0.0, 0.2, 0.001, 32, 0.05);
    check(guarded.steps == 32, "substep guard caps catch-up work");
    check(guarded.droppedTime > 0.16, "frame clamp and substep guard report dropped time");
    check(guarded.remainder < 0.001, "guard leaves less than one fixed step in accumulator");
}

void testBoundedEnergyRun() {
    const lj::LennardJonesParameters parameters{};
    lj::PairState state = lj::makeSymmetricPair(1.45);
    const lj::SystemMetrics initial = lj::measureSystem(state, parameters);
    check(initial.valid, "initial attractive preset has finite metrics");
    check(
        lj::runSimulation(state, parameters, 20.0, 1.0 / 1000.0, 25'000),
        "20-unit stress run finishes within its explicit step budget"
    );
    const lj::SystemMetrics final = lj::measureSystem(state, parameters);
    check(final.valid, "stress run remains finite");
    check(
        std::abs(lj::relativeEnergyDrift(final.totalEnergy, initial.totalEnergy)) < 0.002,
        "Velocity Verlet keeps Lennard-Jones relative energy drift below 0.2 percent"
    );
    check(lj::length(final.momentum) < 1.0e-9, "stress run conserves total momentum");
    check(lj::length(final.center) < 1.0e-9, "stress run keeps center of mass fixed");
}

void testNamedValidationReport() {
    constexpr std::array<double, 3> parameterValues{0.5, 1.0, 2.0};
    for (const double epsilon : parameterValues) {
        for (const double sigma : std::array<double, 3>{0.8, 1.0, 1.2}) {
            for (const double mass : parameterValues) {
                const lj::ValidationReport report = lj::validateModel({epsilon, sigma}, mass);
                check(report.landmarks, "validation: Lennard-Jones landmarks");
                check(report.forceDirections, "validation: attractive and repulsive directions");
                check(report.newtonThirdLaw, "validation: Newton third law");
                check(report.finiteRun, "validation: finite bounded run");
                check(report.momentumConserved, "validation: momentum conserved");
                check(report.centerOfMassStable, "validation: center of mass stable");
                check(report.energyStable, "validation: energy drift bounded");
                check(report.passed(), "validation: complete Project 41 contract");
            }
        }
    }
}

} // namespace

int main() {
    // Một bộ kiểm chuẩn PASS không chứng nhận dt của cấu hình đẩy mạnh.
    const lj::LennardJonesParameters selectedParameters{2.0, 0.8};
    const lj::PairState selected = lj::makeSymmetricPair(0.82 * 0.8, 0.5);
    const lj::ExperimentReport selectedReport = lj::assessExperiment(selected, selectedParameters, 0.004);
    check(lj::validateModel(selectedParameters, 0.5).passed(), "reference model passes with selected parameters");
    check(selectedReport.valid && selectedReport.maximumEnergyDrift > 0.15, "selected dt exposes high maximum drift despite reference PASS");
    check(selectedReport.completedSteps == 1000U, "selected experiment uses a bounded thousand steps");
    check(!lj::assessExperiment(selected, selectedParameters, 0.004, 2001U).valid, "selected experiment refuses excessive budget");
    testPairGeometry();
    testInvalidPairInput();
    testPotentialLandmarks();
    testForceMatchesPotentialSlope();
    testNewtonThirdLawAndMomentum();
    testVelocityVerletSymmetry();
    testMovingCenterOfMass();
    testFixedStepGuard();
    testBoundedEnergyRun();
    testNamedValidationReport();

    if (failures != 0) {
        std::cerr << failures << " Project 41 checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 41 validation passed.\n";
    return EXIT_SUCCESS;
}
