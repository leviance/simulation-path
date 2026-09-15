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

// Không dùng assert để các phép kiểm vẫn chạy khi Release định nghĩa NDEBUG.
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
    const lab::DoublePendulumParameters parameters{};
    const lab::DoublePendulumState down{};

    check(lab::validParameters(parameters), "default double-pendulum parameters are valid");
    check(!lab::validParameters({0.0, 1.0, 1.0, 1.0, 9.81}), "zero mass is rejected");
    check(!lab::validParameters({1.0, 1.0, 0.0, 1.0, 9.81}), "zero rod length is rejected");

    const lab::DoublePendulumGeometry downGeometry = lab::pendulumGeometry(down, parameters);
    check(closeEnough(downGeometry.bob1.x, 0.0) && closeEnough(downGeometry.bob1.y, -1.0), "theta1 zero places the first bob below the pivot");
    check(closeEnough(downGeometry.bob2.x, 0.0) && closeEnough(downGeometry.bob2.y, -2.0), "theta2 zero places the second bob below the first");
    check(closeEnough(lab::pendulumEnergy(down, parameters), 0.0), "downward rest state defines zero potential energy");

    const lab::DoublePendulumDerivative downDerivative = lab::pendulumDerivative(down, parameters);
    check(downDerivative.valid, "downward state has a valid derivative");
    check(closeEnough(downDerivative.omega1Rate, 0.0) && closeEnough(downDerivative.omega2Rate, 0.0), "downward rest state has zero angular acceleration");

    const lab::DoublePendulumState horizontal{0.5 * lab::kPi, 0.0, 0.5 * lab::kPi, 0.0, 0.0};
    const lab::DoublePendulumDerivative horizontalDerivative = lab::pendulumDerivative(horizontal, parameters);
    check(closeEnough(horizontalDerivative.omega1Rate, -parameters.gravity, 1e-12), "parallel horizontal rods give alpha1 equal to negative gravity for unit lengths");
    check(closeEnough(horizontalDerivative.omega2Rate, 0.0, 1e-12), "parallel horizontal rods start with zero alpha2 in the chosen coordinates");

    lab::DoublePendulumState integrated{2.0, 0.0, 1.1, 0.0, 0.0};
    const double initialEnergy = lab::pendulumEnergy(integrated, parameters);
    for (int step = 0; step < 2400; ++step) {
        integrated = lab::stepRk4(integrated, parameters, 1.0 / 480.0);
    }
    const double integratedDrift = std::abs((lab::pendulumEnergy(integrated, parameters) - initialEnergy) / initialEnergy);
    check(closeEnough(integrated.elapsed, 5.0, 1e-12), "RK4 advances elapsed by exactly N times dt");
    check(integratedDrift < 1e-7, "small-step RK4 keeps five-second energy drift bounded");

    int fastSteps = 0;
    double fastRemainder = 0.0;
    for (int frame = 0; frame < 120; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(fastRemainder, 1.0 / 120.0, 1.0 / 240.0, 16, 0.1);
        fastRemainder = plan.remainder;
        fastSteps += plan.steps;
    }
    int slowSteps = 0;
    double slowRemainder = 0.0;
    for (int frame = 0; frame < 30; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(slowRemainder, 1.0 / 30.0, 1.0 / 240.0, 16, 0.1);
        slowRemainder = plan.remainder;
        slowSteps += plan.steps;
    }
    check(fastSteps == 240 && slowSteps == 240, "render-frame splits produce the same fixed-step count");
    check(lab::planFixedSteps(0.0, 1.0, 1.0 / 240.0, 16, 0.1).droppedTime > 0.9, "long frame reports dropped time instead of an unbounded catch-up loop");

    const double degreesToRadians = lab::kPi / 180.0;
    const lab::DoublePendulumState seamFirst{179.0 * degreesToRadians, 0.0, 0.0, 0.0, 0.0};
    const lab::DoublePendulumState seamSecond{-179.0 * degreesToRadians, 0.0, 0.0, 0.0, 0.0};
    check(closeEnough(lab::phaseSpaceSeparation(seamFirst, seamSecond, parameters), 2.0 * degreesToRadians, 1e-12), "phase-space separation wraps the plus-minus pi seam");

    lab::TwinPendulums twins = lab::makeTwinPendulums({2.0, 0.0, 1.1, 0.0, 0.0}, 1e-4);
    for (int step = 0; step < 2400; ++step) {
        lab::stepTwinPendulums(twins, parameters, 1.0 / 240.0);
    }
    const lab::TwinMetrics twinMetrics = lab::measureTwins(twins, parameters);
    check(twins.stepCount == 2400, "both pendulums advance through one shared step count");
    check(closeEnough(twins.primary.elapsed, twins.perturbed.elapsed, 1e-12), "twin elapsed times stay lockstep");
    check(twinMetrics.phaseSeparation > 1e-4, "nearby chaotic states separate beyond their initial perturbation");
    check(std::isfinite(twinMetrics.finiteTimeExponent), "positive separation produces a finite-time exponent");

    lab::ChaosExperiment experiment = lab::makeChaosExperiment({2.0, 0.0, 1.1, 0.0, 0.0}, 1e-4);
    for (int step = 0; step < 2400; ++step) {
        lab::stepChaosExperiment(experiment, parameters, 1.0 / 240.0);
    }
    const lab::ChaosMetrics chaosMetrics = lab::measureChaos(experiment, parameters);
    check(closeEnough(experiment.twins.primary.elapsed, experiment.halfStepReference.elapsed, 1e-10), "full-step and half-step reference are compared at the same elapsed time");
    check(chaosMetrics.numericalSeparation < chaosMetrics.twins.phaseSeparation, "dt versus dt-half error stays below the intentional perturbation in the validation horizon");
    check(chaosMetrics.finite, "chaos experiment remains finite");

    const lab::ChaosRunResult calmRun = lab::runChaosExperiment(lab::ChaosPreset::calm, parameters, 1e-4, 10.0, 1.0 / 240.0);
    const lab::ChaosRunResult chaoticRun = lab::runChaosExperiment(lab::ChaosPreset::chaotic, parameters, 1e-4, 10.0, 1.0 / 240.0);
    check(calmRun.steps == 2400 && chaoticRun.steps == 2400, "bounded stress runs use an explicit finite step count");
    check(calmRun.metrics.finite && chaoticRun.metrics.finite, "calm and chaotic presets remain finite for ten seconds");
    check(std::abs(calmRun.metrics.twins.relativeEnergyDrift) < 1e-5, "calm preset keeps RK4 energy drift bounded");
    check(std::abs(chaoticRun.metrics.twins.relativeEnergyDrift) < 1e-5, "chaotic preset keeps RK4 energy drift bounded");

    if (failures != 0) {
        std::cerr << failures << " Project 26 validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 26 validation passed\n";
    return EXIT_SUCCESS;
}
