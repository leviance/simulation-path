#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool closeEnough(double actual, double expected, double tolerance = 1e-9) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= tolerance;
}

const lab::OscillatorParameters parameters{1.0, 4.0};
const lab::OscillatorState initial{1.0, 0.0, 0.0};

void analyticAndSteps() {
    check(lab::validParameters(parameters), "positive mass and stiffness");
    check(!lab::validParameters({0.0, 4.0}) && !lab::validParameters({1.0, -1.0}), "invalid physical parameters");
    check(closeEnough(lab::angularFrequency(parameters), 2.0), "omega=sqrt(k/m)");
    const auto quarter = lab::analyticOscillatorState(initial, parameters, lab::kPi / 4.0);
    check(closeEnough(quarter.position, 0.0) && closeEnough(quarter.velocity, -2.0), "independent quarter-period oracle");
    check(closeEnough(lab::oscillatorEnergy(quarter, parameters), 2.0), "exact energy at quarter period");
    const auto arbitrary = lab::analyticOscillatorState({1.5, -0.75, 3.0}, parameters, 0.0);
    check(arbitrary.position == 1.5 && arbitrary.velocity == -0.75 && arbitrary.elapsed == 3.0, "analytic initial condition includes nonzero velocity and start time");
    const auto free = lab::analyticOscillatorState({1.0, 2.0, 0.0}, {1.0, 0.0}, 3.0);
    check(free.position == 7.0 && free.velocity == 2.0, "zero stiffness is free motion, not invalid data");
    const auto euler = lab::explicitEulerStep(initial, parameters, 0.1);
    check(euler.state.position == 1.0 && euler.state.velocity == -0.4 && euler.forceEvaluations == 1, "Euler independent one-step oracle");
    const auto verlet = lab::velocityVerletStep(initial, parameters, 0.1);
    check(closeEnough(verlet.state.position, 0.98) && closeEnough(verlet.state.velocity, -0.396) && verlet.forceEvaluations == 2, "Verlet independent one-step oracle");
    const auto rk4 = lab::rungeKutta4Step(initial, parameters, 0.1);
    check(closeEnough(rk4.state.position, 0.9800666666666667) && closeEnough(rk4.state.velocity, -0.3973333333333333) && rk4.forceEvaluations == 4, "RK4 independent polynomial oracle");
}

void invalidAndAtomic() {
    const double nan = std::numeric_limits<double>::quiet_NaN();
    const double inf = std::numeric_limits<double>::infinity();
    for (const double dt : {0.0, -1.0, nan, inf}) {
        for (const auto kind : lab::kDefaultKinds) {
            const auto result = lab::stepIntegrator(kind, initial, parameters, dt);
            check(result.forceEvaluations == 0 && result.state.position == initial.position, "invalid dt is a no-op");
        }
    }
    for (const auto kind : lab::kDefaultKinds) {
        const auto result = lab::stepIntegrator(kind, {nan, 0.0, 0.0}, parameters, 0.1);
        check(result.forceEvaluations == 0, "nonfinite current state is rejected");
        check(lab::stepIntegrator(kind, initial, {1.0, inf}, 0.1).forceEvaluations == 0, "infinite stiffness rejected");
    }
    auto race = lab::makeIntegratorRace(initial);
    race.lanes[2].state.velocity = nan;
    check(!lab::stepIntegratorRace(race, parameters, 0.1), "invalid lane rejects whole lockstep");
    check(race.lanes[0].state.position == 1.0 && race.lanes[0].state.velocity == 0.0 && race.stepCount == 0, "no partially committed lanes");
    check(std::isnan(lab::integratorMetrics(initial, initial, {1.0, 0.0}).phaseSpaceError), "phase metric undefined for omega=0");
    check(std::isnan(lab::integratorMetrics({}, {}, parameters).relativeEnergyDrift), "relative energy undefined for E0=0, not false zero");
    check(lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, inf, 0.1).steps == 0, "unbounded duration rejected");
    check(lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, 2.0, 1e-300).steps == 0, "unbounded run count rejected before integer cast");
}

void raceAndFrames() {
    auto race = lab::makeIntegratorRace(initial);
    for (int index = 0; index < 120; ++index) {
        check(lab::stepIntegratorRace(race, parameters, 1.0 / 60.0), "valid lockstep");
    }
    for (std::size_t lane = 0; lane < 3; ++lane) {
        check(closeEnough(race.lanes[lane].state.elapsed, 2.0), "all lanes share elapsed");
    }
    check(race.lanes[0].forceEvaluations == 120 && race.lanes[1].forceEvaluations == 240 && race.lanes[2].forceEvaluations == 480, "actual force counts 1/2/4");
    const auto frameRun = [](double frame, int count) {
        auto scene = lab::makeScene();
        scene.dtIndex = 4;
        scene.paused = false;
        for (int index = 0; index < count; ++index) {
            lab::advanceFrame(scene, frame);
        }
        return scene;
    };
    const auto fast = frameRun(1.0 / 120.0, 120);
    const auto slow = frameRun(1.0 / 30.0, 30);
    check(fast.race.stepCount == 60 && slow.race.stepCount == 60, "fixed steps independent of render frames");
    check(fast.race.lanes[0].state.position == slow.race.lanes[0].state.position, "frame partitions preserve actual numerical state");
    check(fast.history.size() == 61 && slow.history.size() == 61, "one history sample per physics state, including t=0");
    const auto guarded = lab::planFixedSteps(0.0, 9.0, 0.01, 4, 0.1);
    check(guarded.steps == 4 && guarded.droppedTime > 8.9 && guarded.remainder < 0.01, "stalled frame work bounded and dropped time counted");
    check(lab::planFixedSteps(0.0, 1.0, 1e-300, 16, 0.1).steps == 0, "tiny dt cannot overflow integer step count");
}

void convergenceAndEnergy() {
    for (std::size_t lane = 0; lane < 3; ++lane) {
        const auto coarse = lab::runIntegrator(lab::kDefaultKinds[lane], initial, parameters, 2.0, 0.05);
        const auto fine = lab::runIntegrator(lab::kDefaultKinds[lane], initial, parameters, 2.0, 0.025);
        const double ratio = lab::integratorMetrics(coarse.state, initial, parameters).phaseSpaceError / lab::integratorMetrics(fine.state, initial, parameters).phaseSpaceError;
        const std::array<double, 3> lower{1.7, 3.5, 12.0};
        const std::array<double, 3> upper{2.5, 4.5, 20.0};
        check(ratio > lower[lane] && ratio < upper[lane], "first/second/fourth-order convergence, not just decreasing error");
    }
    const auto euler = lab::runIntegrator(lab::IntegratorKind::explicitEuler, initial, parameters, 20.0, 0.05);
    const double expectedEnergy = 2.0 * std::pow(1.01, 400.0);
    check(closeEnough(lab::oscillatorEnergy(euler.state, parameters), expectedEnergy, 1e-8), "Euler energy follows independent recurrence E0*(1+omega^2*h^2)^N");
    const auto verlet = lab::runIntegrator(lab::IntegratorKind::velocityVerlet, initial, parameters, 20.0, 0.05);
    check(std::abs(lab::integratorMetrics(verlet.state, initial, parameters).relativeEnergyDrift) < 0.01, "Verlet energy bounded in stable regime");
}

void sceneAndPlot() {
    auto scene = lab::makeScene();
    scene.initial = initial;
    lab::setStepIndex(scene, 1);
    lab::stepScene(scene);
    check(scene.history.size() == 2 && closeEnough(scene.history.back().errors[0], 0.019977787653, 1e-8), "logger uses actual physics time and independent error fixture");
    lab::cycleLane(scene, 1);
    check(scene.race.stepCount == 0 && scene.history.size() == 1 && scene.race.lanes[1].kind == lab::IntegratorKind::rungeKutta4, "runtime solver change restarts every lane");
    lab::setInitialPosition(scene, 9.0);
    check(scene.initial.position == 3.2 && scene.paused, "initial coordinate editing clamps only allowed input");
    const double x = lab::positionToScreen(1.25);
    check(closeEnough(lab::screenToPosition(x), 1.25), "logical coordinate round trip");
    check(lab::hitMass(scene, lab::positionToScreen(3.2), lab::laneY(0)).has_value(), "hit test uses displayed mass");
    check(!lab::hitMass(scene, 100.0, 700.0), "background is not draggable");
    lab::requestFastRun(scene);
    for (int frame = 0; frame < 100 && scene.fastRemaining > 0; ++frame) {
        lab::advanceFrame(scene, 0.0);
    }
    check(scene.fastRemaining == 0 && closeEnough(scene.elapsed, 20.0), "fast job advances same 20 simulation seconds with bounded frame work");
    check(scene.history.size() <= lab::kHistoryLimit && scene.history.back().time == scene.elapsed, "bounded plot keeps final physics sample");
    lab::Framebuffer image;
    scene.debug = false;
    lab::renderScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kColors[1]) > 0, "clean mode keeps physical scene and graph");
    const auto before = image.pixels;
    lab::drawLine(image, NAN, 0.0, 1.0, 1.0, lab::kExact);
    check(image.pixels == before, "nonfinite line rejected before rasterization");
}

void benchmarkWork() {
    const lab::BenchmarkConfig config{parameters, initial, 0.1, 16, 5};
    // M^20 * (1,0), với M là ma trận cập nhật được khai triển độc lập theo h=0.1.
    const std::array<double, 3> expectedChecksums{-12.119629348424475, -7.347583117210789, -7.431796272209890};
    std::size_t lane = 0;
    for (const auto kind : lab::kDefaultKinds) {
        const auto a = lab::runBenchmarkWork(kind, config, 16);
        const auto b = lab::runBenchmarkWork(kind, config, 16);
        check(a.valid && a.steps == 320 && a.checksum == b.checksum, "bounded deterministic work, reset for every trajectory");
        check(closeEnough(a.checksum, expectedChecksums[lane++], 1e-10), "benchmark checksum matches independent update-matrix fixture");
    }
    check(lab::runBenchmarkWork(lab::IntegratorKind::velocityVerlet, config, 16).forceEvaluations == 640, "benchmark records actual evaluation work");
    check(!lab::runBenchmarkWork(lab::IntegratorKind::explicitEuler, config, 100000).valid, "unbounded benchmark repetitions rejected");
    check(lab::median({3.0, 1.0, 2.0}) == 2.0 && lab::median({1.0, 3.0}) == 2.0, "median independent fixtures");
    check(std::isnan(lab::median({NAN})) && std::isnan(lab::median({-1.0})), "median rejects invalid durations");
    auto job = lab::makeBenchmark(config);
    for (int tick = 0; tick < 24 && job.running; ++tick) {
        lab::advanceBenchmark(job);
    }
    check(!job.running && !job.failed && job.rows.size() == 3, "cooperative native runtime benchmark finishes");
    for (const auto& row : job.rows) {
        check(std::isfinite(row.microsecondsPerStep) && row.microsecondsPerStep >= 0.0, "clock measures real nonnegative duration; no hardware-specific ranking assertion");
    }
}
} // namespace

int main() {
    analyticAndSteps();
    invalidAndAtomic();
    raceAndFrames();
    convergenceAndEnergy();
    sceneAndPlot();
    benchmarkWork();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 23: independent math, guards, lockstep, logger, rendering and benchmark passed\n";
    return EXIT_SUCCESS;
}
