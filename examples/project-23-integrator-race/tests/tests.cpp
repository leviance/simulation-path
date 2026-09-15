#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

bool closeEnough(double actual, double expected, double tolerance = 1e-9) {
    return std::abs(actual - expected) <= tolerance;
}

// Dùng phép kiểm tường minh để validation vẫn chạy khi Release định nghĩa NDEBUG.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

} // namespace

int main() {
    failures = 0;
    const lab::OscillatorParameters parameters{1.0, 4.0};
    const lab::OscillatorState initial{1.0, 0.0, 0.0};

    check(lab::validParameters(parameters), "positive mass and non-negative stiffness are valid");
    check(!lab::validParameters({0.0, 4.0}), "zero mass is rejected");
    check(!lab::validParameters({1.0, -1.0}), "negative stiffness is rejected");
    check(closeEnough(lab::angularFrequency(parameters), 2.0), "omega equals sqrt(k/m)");

    const double quarterPeriod = lab::kPi / 4.0;
    const lab::OscillatorState atQuarterPeriod = lab::analyticOscillatorState(initial, parameters, quarterPeriod);
    check(closeEnough(atQuarterPeriod.position, 0.0, 1e-12), "exact position reaches equilibrium after a quarter period");
    check(closeEnough(atQuarterPeriod.velocity, -2.0, 1e-12), "exact velocity is maximal at equilibrium");
    check(closeEnough(lab::oscillatorEnergy(atQuarterPeriod, parameters), lab::oscillatorEnergy(initial, parameters), 1e-12), "analytic solution conserves total energy");

    const double stepSize = 0.1;
    const lab::IntegratorStepResult eulerStep = lab::explicitEulerStep(initial, parameters, stepSize);
    check(closeEnough(eulerStep.state.position, 1.0), "Euler position uses velocity from the start of the step");
    check(closeEnough(eulerStep.state.velocity, -0.4), "Euler velocity uses acceleration from the start of the step");
    check(eulerStep.forceEvaluations == 1, "Euler evaluates acceleration once");

    const lab::IntegratorStepResult verletStep = lab::velocityVerletStep(initial, parameters, stepSize);
    check(closeEnough(verletStep.state.position, 0.98), "Velocity Verlet predicts the new position with a0");
    check(closeEnough(verletStep.state.velocity, -0.396), "Velocity Verlet completes velocity with the average acceleration");
    check(verletStep.forceEvaluations == 2, "Velocity Verlet evaluates acceleration twice");

    const lab::IntegratorStepResult rk4Step = lab::rungeKutta4Step(initial, parameters, stepSize);
    const lab::OscillatorState exactStep = lab::analyticOscillatorState(initial, parameters, stepSize);
    check(rk4Step.forceEvaluations == 4, "RK4 evaluates the phase derivative four times");
    check(std::abs(rk4Step.state.position - exactStep.position) < std::abs(eulerStep.state.position - exactStep.position), "one RK4 step is closer to the exact position than one Euler step");

    lab::IntegratorRace race = lab::makeIntegratorRace(initial);
    for (int step = 0; step < 120; ++step) {
        lab::stepIntegratorRace(race, parameters, 1.0 / 60.0);
    }
    check(race.stepCount == 120, "all lanes advance through the same number of steps");
    check(closeEnough(race.euler.state.elapsed, 2.0), "Euler elapsed equals N times dt");
    check(closeEnough(race.verlet.state.elapsed, 2.0), "Verlet elapsed equals N times dt");
    check(closeEnough(race.rk4.state.elapsed, 2.0), "RK4 elapsed equals N times dt");
    check(race.euler.forceEvaluations == 120, "Euler race count is one evaluation per step");
    check(race.verlet.forceEvaluations == 240, "Verlet race count is two evaluations per step");
    check(race.rk4.forceEvaluations == 480, "RK4 race count is four evaluations per step");

    int stepsFromFastFrames = 0;
    double fastRemainder = 0.0;
    for (int frame = 0; frame < 120; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(fastRemainder, 1.0 / 120.0, 1.0 / 60.0, 16, 0.25);
        fastRemainder = plan.remainder;
        stepsFromFastFrames += plan.steps;
    }
    int stepsFromSlowFrames = 0;
    double slowRemainder = 0.0;
    for (int frame = 0; frame < 30; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(slowRemainder, 1.0 / 30.0, 1.0 / 60.0, 16, 0.25);
        slowRemainder = plan.remainder;
        stepsFromSlowFrames += plan.steps;
    }
    check(stepsFromFastFrames == 60 && stepsFromSlowFrames == 60, "different frame splits produce the same fixed-step count");

    const lab::OscillatorState phaseOffset{initial.position, 2.0, 0.0};
    const lab::IntegratorMetrics normalized = lab::integratorMetrics(phaseOffset, initial, parameters);
    check(closeEnough(normalized.phaseSpaceError, 1.0), "phase-space error divides velocity difference by omega");
    const lab::IntegratorMetrics noSpringMetrics = lab::integratorMetrics(phaseOffset, initial, {1.0, 0.0});
    check(std::isnan(noSpringMetrics.phaseSpaceError), "phase-space error is not defined when omega is zero");

    const double duration = 2.0;
    const lab::IntegratorRunResult eulerCoarse = lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, duration, 1.0 / 20.0);
    const lab::IntegratorRunResult eulerFine = lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, duration, 1.0 / 40.0);
    const lab::IntegratorRunResult verletCoarse = lab::runIntegrator(lab::IntegratorKind::velocityVerlet, initial, parameters, duration, 1.0 / 20.0);
    const lab::IntegratorRunResult verletFine = lab::runIntegrator(lab::IntegratorKind::velocityVerlet, initial, parameters, duration, 1.0 / 40.0);
    const lab::IntegratorRunResult rk4Coarse = lab::runIntegrator(lab::IntegratorKind::rungeKutta4, initial, parameters, duration, 1.0 / 20.0);
    const lab::IntegratorRunResult rk4Fine = lab::runIntegrator(lab::IntegratorKind::rungeKutta4, initial, parameters, duration, 1.0 / 40.0);
    const double eulerCoarseError = lab::integratorMetrics(eulerCoarse.state, initial, parameters).phaseSpaceError;
    const double eulerFineError = lab::integratorMetrics(eulerFine.state, initial, parameters).phaseSpaceError;
    const double verletCoarseError = lab::integratorMetrics(verletCoarse.state, initial, parameters).phaseSpaceError;
    const double verletFineError = lab::integratorMetrics(verletFine.state, initial, parameters).phaseSpaceError;
    const double rk4CoarseError = lab::integratorMetrics(rk4Coarse.state, initial, parameters).phaseSpaceError;
    const double rk4FineError = lab::integratorMetrics(rk4Fine.state, initial, parameters).phaseSpaceError;
    check(eulerFineError < eulerCoarseError, "Euler error decreases when dt is halved");
    check(verletFineError < verletCoarseError, "Velocity Verlet error decreases when dt is halved");
    check(rk4FineError < rk4CoarseError, "RK4 error decreases when dt is halved");
    check(eulerCoarseError / eulerFineError > 1.7, "Euler shows first-order convergence");
    check(verletCoarseError / verletFineError > 3.5, "Velocity Verlet shows second-order convergence");
    check(rk4CoarseError / rk4FineError > 12.0, "RK4 shows fourth-order convergence");

    const lab::IntegratorRunResult eulerLong = lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, 20.0, 1.0 / 20.0);
    const lab::IntegratorRunResult verletLong = lab::runIntegrator(lab::IntegratorKind::velocityVerlet, initial, parameters, 20.0, 1.0 / 20.0);
    const lab::IntegratorMetrics eulerLongMetrics = lab::integratorMetrics(eulerLong.state, initial, parameters);
    const lab::IntegratorMetrics verletLongMetrics = lab::integratorMetrics(verletLong.state, initial, parameters);
    check(eulerLongMetrics.relativeEnergyDrift > 20.0, "Explicit Euler energy grows strongly in a long oscillator run");
    check(std::abs(verletLongMetrics.relativeEnergyDrift) < 0.01, "Velocity Verlet keeps long-run energy drift bounded");
    check(rk4FineError < verletFineError && verletFineError < eulerFineError, "same-step phase-space error ranks RK4, Verlet, then Euler");

    if (failures != 0) {
        std::cerr << failures << " Project 23 validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 23 validation passed\n";
    return EXIT_SUCCESS;
}
