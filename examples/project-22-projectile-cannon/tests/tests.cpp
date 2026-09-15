#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

// Không dùng assert để mọi phép kiểm vẫn chạy trong cấu hình Release có NDEBUG.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    ++failures;
    std::cerr << "FAIL: " << label << '\n';
}

bool nearlyEqual(double left, double right, double tolerance = 1e-9) {
    return std::abs(left - right) <= tolerance;
}

lab::ProjectileState integrateFor(const lab::BallisticLaunch& launch, double duration, double step) {
    lab::ProjectileState state = lab::launchProjectile(launch);
    const int count = int(std::lround(duration / step));
    for (int index = 0; index < count; ++index) {
        lab::explicitEulerStep(state, launch.acceleration, step);
    }
    return state;
}

int countFixedSteps(const std::vector<double>& frameTimes, double fixedStep) {
    double accumulator = 0.0;
    int totalSteps = 0;
    for (const double frameTime : frameTimes) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(accumulator, frameTime, fixedStep, 16, 0.25);
        accumulator = plan.remainder;
        totalSteps += plan.steps;
    }
    return totalSteps;
}

} // namespace

int main() {
    const lab::WorldView view{{80.0, 620.0}, 8.0};
    const lab::Vec2 world{12.5, 7.25};
    const lab::Vec2 screen = lab::worldToScreen(world, view);
    const lab::Vec2 roundTrip = lab::screenToWorld(screen, view);
    check(nearlyEqual(roundTrip.x, world.x) && nearlyEqual(roundTrip.y, world.y), "world-screen round trip preserves a point");

    const lab::AimSelection diagonal = lab::aimFromScreenDrag({100.0, 300.0}, {200.0, 200.0}, 5.0, 4.0, 32.0, 5.0 * lab::kPi / 180.0, 85.0 * lab::kPi / 180.0);
    check(diagonal.valid, "a visible drag creates a valid aim");
    check(nearlyEqual(diagonal.velocity.x, 20.0) && nearlyEqual(diagonal.velocity.y, 20.0), "screen Y is inverted when drag becomes world velocity");
    check(nearlyEqual(diagonal.angleRadians, lab::kPi / 4.0), "diagonal drag creates a 45 degree angle");
    check(!lab::aimFromScreenDrag({1.0, 1.0}, {1.0, 1.0}, 5.0, 4.0, 32.0, 0.0, lab::kPi / 2.0).valid, "zero drag never creates a direction");

    const lab::Vec2 polarVelocity = lab::velocityFromPolar(30.0, lab::kPi / 3.0);
    check(nearlyEqual(lab::speedFromVelocity(polarVelocity), 30.0), "polar components preserve speed");
    check(nearlyEqual(lab::angleFromVelocity(polarVelocity), lab::kPi / 3.0), "atan2 recovers the launch angle");

    const lab::BallisticLaunch launch{{0.0, 1.2}, {10.0, 20.0}, {0.0, lab::kGravity}};
    const lab::Vec2 atTwoSeconds = lab::analyticPosition(launch, 2.0);
    check(nearlyEqual(atTwoSeconds.x, 20.0), "analytic X keeps constant horizontal velocity");
    check(nearlyEqual(atTwoSeconds.y, 21.58), "analytic Y includes the one-half acceleration term");
    check(nearlyEqual(lab::analyticVelocity(launch, 2.0).y, 0.38), "analytic velocity changes by acceleration times time");
    const std::optional<double> apexTime = lab::timeToApex(launch);
    check(apexTime.has_value() && nearlyEqual(*apexTime, 20.0 / 9.81), "apex occurs when vertical velocity reaches zero");
    const std::vector<lab::Vec2> analyticSamples = lab::sampleAnalyticTrajectory(launch, 2.0, 10);
    check(analyticSamples.size() == 11, "ten analytic segments keep both endpoints");
    check(nearlyEqual(analyticSamples.front().y, 1.2) && nearlyEqual(analyticSamples.back().y, 21.58), "analytic samples include t zero and duration");

    lab::ProjectileState oneStep = lab::launchProjectile(launch);
    lab::explicitEulerStep(oneStep, launch.acceleration, 0.1);
    check(nearlyEqual(oneStep.position.x, 1.0) && nearlyEqual(oneStep.position.y, 3.2), "Explicit Euler position uses velocity from the start of the step");
    check(nearlyEqual(oneStep.velocity.y, 19.019), "Explicit Euler velocity receives gravity after position");
    check(nearlyEqual(oneStep.elapsed, 0.1), "one Euler step advances elapsed by dt");

    const std::vector<double> oneHundredTwentyFrames(120, 1.0 / 120.0);
    const std::vector<double> thirtyFrames(30, 1.0 / 30.0);
    check(countFixedSteps(oneHundredTwentyFrames, 1.0 / 60.0) == 60, "120 FPS frame sequence produces 60 fixed steps");
    check(countFixedSteps(thirtyFrames, 1.0 / 60.0) == 60, "30 FPS frame sequence produces the same 60 fixed steps");
    const lab::FixedStepPlan guardedPlan = lab::planFixedSteps(0.0, 1.0, 1.0 / 60.0, 4, 0.1);
    check(guardedPlan.steps == 4, "substep guard caps work per render frame");
    check(guardedPlan.droppedTime > 0.9, "frame clamp and substep cap report dropped time");

    const std::optional<double> impactTime = lab::solveGroundImpactTime(launch, 0.0);
    check(impactTime.has_value() && *impactTime > 4.0, "quadratic solver chooses the future ground root");
    if (impactTime) {
        const lab::Vec2 exactImpact = lab::analyticPosition(launch, *impactTime);
        check(nearlyEqual(exactImpact.y, 0.0, 1e-8), "analytic impact lies on the ground");
        check(nearlyEqual(exactImpact.x, launch.velocity.x * *impactTime), "analytic range uses the same time of flight");
    }

    lab::ProjectileState crossing{{3.0, 0.1}, {1.0, -2.0}, 0.5, true};
    const lab::ImpactStepResult crossingResult = lab::explicitEulerStepToGround(crossing, {0.0, 0.0}, 0.1, 0.0);
    check(crossingResult.impacted, "a step crossing the ground reports impact");
    check(nearlyEqual(crossingResult.stepFraction, 0.5), "impact interpolation finds the halfway crossing");
    check(nearlyEqual(crossing.position.y, 0.0) && nearlyEqual(crossing.position.x, 3.05), "impact state stops on the interpolated ground point");
    check(nearlyEqual(crossing.elapsed, 0.55) && !crossing.active, "impact consumes only the used fraction of the final step");
    check(nearlyEqual(crossingResult.uncorrectedPosition.y, -0.1), "validation keeps the uncorrected below-ground sample");

    const lab::ProjectileState coarse = integrateFor(launch, 1.0, 1.0 / 15.0);
    const lab::ProjectileState medium = integrateFor(launch, 1.0, 1.0 / 60.0);
    const lab::ProjectileState fine = integrateFor(launch, 1.0, 1.0 / 240.0);
    const double coarseError = lab::compareProjectile(launch, coarse).error;
    const double mediumError = lab::compareProjectile(launch, medium).error;
    const double fineError = lab::compareProjectile(launch, fine).error;
    check(coarseError > mediumError && mediumError > fineError, "Explicit Euler position error decreases when fixed dt becomes smaller");
    check(nearlyEqual(coarseError / mediumError, 4.0, 1e-8), "first-order Euler error scales linearly with dt");

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 22 validation passed.\n";
    return EXIT_SUCCESS;
}
