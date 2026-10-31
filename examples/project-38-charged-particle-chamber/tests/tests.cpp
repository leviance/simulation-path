#include "chamber_math.hpp"
#include "chamber_reference.hpp"

#include <cstdlib>
#include <iostream>
#include <string_view>
#include <stdexcept>
#include <string>

namespace {
int assertions = 0;
int failures = 0;

// Explicit checks remain active with NDEBUG; collect failures instead of relying on assert.
void check(bool condition, std::string_view message) {
    ++assertions;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

chamber::Particle fixture(chamber::Vec3 x = {}, chamber::Vec3 v = {1, 0, 0}, float q = 1, float m = 1) {
    return {{x.x, x.y, x.z, q}, {v.x, v.y, v.z, m}};
}

chamber::Particle integrate(chamber::Particle p, const chamber::Fields& fields, float dt, int steps) {
    for (int step = 0; step < steps; ++step)
        check(chamber::stepBoris(p, fields, dt), "Boris step rejected a valid fixture");
    return p;
}

void validateIndependentTrajectories() {
    using namespace chamber;
    const Particle initial = fixture({1, -2, 3}, {1.25F, 0.75F, -0.5F});
    const float dt = 1.0F / 120.0F;
    const int steps = 480;
    const double time = static_cast<double>(dt) * steps;

    // Neither the straight line nor constant-acceleration reference calls the integrator.
    const Fields empty{{}, {}, 1};
    const Particle straight = integrate(initial, empty, dt, steps);
    const auto straightReference = analyticState(initial, empty, time);
    check(positionError(straight, straightReference) < 1.0e-4, "Straight trajectory/time convention");
    check(velocityError(straight, straightReference) < 1.0e-6, "Straight velocity");

    const Fields electric{{0.3F, -0.7F, 0.2F}, {}, 1};
    const Particle accelerated = integrate(initial, electric, dt, steps);
    const auto electricReference = analyticState(initial, electric, time);
    check(positionError(accelerated, electricReference) < 2.0e-4, "Constant E position at full time");
    check(velocityError(accelerated, electricReference) < 5.0e-5, "Constant E velocity at full time");

    const Fields magnetic{{}, {0, 0, 1}, 1};
    const Particle positive = integrate(fixture(), magnetic, 0.01F, 157);
    const Particle negative = integrate(fixture({}, {1, 0, 0}, -1), magnetic, 0.01F, 157);
    check(position(positive).y < -0.9F && position(negative).y > 0.9F, "Charge sign must reverse curvature");
    check(std::abs(position(positive).x - position(negative).x) < 2.0e-5F, "Opposite-charge symmetry");

    const Particle helix = integrate(initial, magnetic, dt, steps);
    const auto helixReference = analyticState(initial, magnetic, time);
    check(positionError(helix, helixReference) < 8.0e-5, "Analytic helix position");
    check(velocityError(helix, helixReference) < 8.0e-5, "Analytic helix phase");
    check(std::abs(length(velocity(helix)) - length(velocity(initial))) < 2.0e-5F, "Magnetic speed conservation");
    check(std::abs(helix.velocityMass.z - initial.velocityMass.z) < 1.0e-6F, "Parallel velocity conservation");

    // A tilted B and E-perpendicular drift catch axis shortcuts in the reference.
    const Fields crossed{{0.2F, -0.1F, 0.3F}, {0.4F, 0.8F, -0.2F}, 0.7F};
    const Particle mixed = integrate(initial, crossed, dt, steps);
    check(positionError(mixed, analyticState(initial, crossed, time)) < 2.0e-4, "General uniform crossed fields");
    const Particle neutral = fixture({}, {1, 2, 3}, 0);
    check(positionError(integrate(neutral, crossed, dt, steps), analyticState(neutral, crossed, time)) < 2.0e-4, "q=0 must not divide by cyclotron frequency");
}

void validateConvergenceAndFailure() {
    using namespace chamber;
    const Particle initial = fixture({}, {1, 0.5F, 0});
    const Fields magnetic{{}, {0, 0, 1.3F}, 1};
    const Particle coarse = integrate(initial, magnetic, 0.08F, 100);
    const Particle fine = integrate(initial, magnetic, 0.04F, 200);
    const auto exact = analyticState(initial, magnetic, 8.0);
    const double coarseError = velocityError(coarse, exact);
    const double fineError = velocityError(fine, exact);
    check(coarseError > 3.8 * fineError && coarseError < 4.2 * fineError, "dt/2 must reduce phase error about fourfold");
    check(positionError(fine, exact) < positionError(coarse, exact), "Position convergence at SAME observation time");

    Particle euler = initial;
    for (int step = 0; step < 200; ++step)
        check(stepEuler(euler, magnetic, 0.04F), "Euler fixture");
    check(length(velocity(euler)) > length(velocity(initial)) * 1.1F, "Intentional Euler magnetic energy error must be observable");

    Particle zeroMass = fixture({}, {}, 1, 0);
    check(!stepBoris(zeroMass, magnetic, 0.01F), "Reject zero mass");
    Particle negativeMass = fixture({}, {}, 1, -1);
    check(!stepBoris(negativeMass, magnetic, 0.01F), "Reject negative mass");
    Particle p = initial;
    Fields bad = magnetic;
    bad.electric.x = std::numeric_limits<float>::quiet_NaN();
    check(!stepBoris(p, bad, 0.01F) && sameParticle(p, initial, 0, 0), "NaN rejection must preserve previous state");
    check(!stepBoris(p, magnetic, std::numeric_limits<float>::infinity()), "Reject infinite dt");
    check(!stepBoris(p, magnetic, 0), "Reject zero dt");
    const Particle resting = fixture({}, {});
    check(sameParticle(integrate(resting, magnetic, 0.01F, 10), resting, 0, 0), "v=0, E=0 remains at rest");

    ValidationReport report{};
    Particle invalid = initial;
    invalid.positionCharge.x = std::numeric_limits<float>::quiet_NaN();
    inspectParticle(report, 17, invalid, initial, analyticState(initial, magnetic, 0));
    check(!report.passed() && !report.allFinite && report.firstMismatch == 17, "Validator must not pass NaN");
}

void validateSeedBudgetAndClock() {
    using namespace chamber;
    Settings settings{};
    const Particle a = initialParticle(7919U, settings);
    check(sameParticle(a, initialParticle(7919U, settings), 0, 0), "Seed repeatability");
    settings.count = 5'000'000U;
    check(sameParticle(a, initialParticle(7919U, settings), 0, 0), "Changing N preserves seeded prefix");
    ++settings.seed;
    check(!sameParticle(a, initialParticle(7919U, settings), 0, 0), "Seed must affect data");
    check(initialParticle(0, settings).positionCharge.w == 1 && initialParticle(1, settings).positionCharge.w == -1, "Both charge signs and stable IDs");

    const ComputeLimits capable{4, 3, 256LL * 1024 * 1024, 65535, 1024, 1024, 8, 8};
    Budget budget{};
    std::string reason{};
    check(makeBudget(settings, capable, budget, reason), "5M optional scale budget");
    check(budget.stateBytes == 160'000'000U && budget.groups == 19532U && budget.tailLanes == 192U, "5M bytes and tail lanes");
    settings.count = 1'000'003U;
    check(makeBudget(settings, capable, budget, reason) && budget.tailLanes == 189U, "Non-divisible dispatch");
    ComputeLimits limited = capable;
    limited.maximumBlockBytes = 16 * 1024 * 1024;
    const Budget previous = budget;
    check(!makeBudget(settings, limited, budget, reason) && budget.stateBytes == previous.stateBytes, "Unsupported allocation preserves last good plan, no silent fallback");
    settings.fields.magnetic.y = std::numeric_limits<float>::infinity();
    check(!makeBudget(settings, capable, budget, reason), "Non-finite field configuration");

    FixedClock clock{};
    const float dt = 1.0F / 240.0F;
    check(clock.advance(10.0, dt, true, false) == 0 && clock.accumulator == 0.0, "Pause never accumulates catch-up");
    check(clock.advance(10.0, dt, true, true) == 1, "Paused single-step advances exactly once");
    const int steps = clock.advance(10.0, dt, false, false);
    check(steps == 8 && clock.discardedSeconds > 9.9, "Catch-up has an explicit finite budget");
    clock.commit(steps, dt);
    check(clock.tick == 8 && std::abs(clock.simulatedSeconds - 8.0 * dt) < 1.0e-12, "Reference uses simulation time, not wall time");
    clock.reset();
    check(clock.tick == 0 && clock.discardedSeconds == 0.0, "Reset time generation");
}

void validatePreparedSnapshot() {
    using namespace chamber;
    Settings settings{};
    settings.phaseSpan = 6;
    check(preparedPhaseSpan(settings) == 6, "Uniform magnetic field permits phase-spread initial conditions");
    check(sameParticle(snapshotParticle(0, settings), initialParticle(0, settings), 0, 0), "ID zero starts at phase zero");
    check(sameParticle(snapshotParticle(1, settings), initialParticle(1, settings), 0, 0), "Opposite-charge pair shares phase zero");
    const Particle spread = snapshotParticle(25, settings);
    check(!sameParticle(spread, initialParticle(25, settings), 0, 0), "Other IDs can start at different phases");
    check(sameParticle(spread, snapshotParticle(25, settings), 0, 0), "Prepared snapshot is reproducible");
    const Particle evolved = integrate(spread, settings.fields, settings.dt, 120);
    const auto exact = analyticState(spread, settings.fields, 120.0 * settings.dt);
    check(positionError(evolved, exact) < 3.0e-4, "Reference starts at the same prepared state as Boris");
    settings.fields.electric.x = 1;
    check(preparedPhaseSpan(settings) == 0, "Mixed E/B preparation is disabled explicitly");
    check(sameParticle(snapshotParticle(25, settings), initialParticle(25, settings), 0, 0), "Disabled preparation preserves base snapshot");
}
} // namespace

int main() {
    try {
        validateIndependentTrajectories();
        validateConvergenceAndFailure();
        validateSeedBudgetAndClock();
        validatePreparedSnapshot();
    } catch (const std::exception& error) {
        std::cerr << "Unexpected exception: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
    if (failures != 0) {
        std::cerr << failures << " Project 38 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "PASS: " << assertions << " checks; independent trajectories, phase convergence, invalid input, seed, budget, clock\n";
    return EXIT_SUCCESS;
}
