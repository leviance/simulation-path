#include "diagnostics.hpp"
#include "pair.hpp"
#include "timing.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

// Explicit checks remain enabled when NDEBUG is defined in Release builds.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL " << label << '\n';
    }
}

bool close(double a, double b, double tolerance = 1e-10) {
    return std::abs(a - b) < tolerance;
}

int main() {
    for (const auto& result : water::validateWater()) {
        check(result.pass, result.label);
        std::cout << result.label << " value=" << result.value << '\n';
    }
    check(water::kernel(water::support) == 0, "compact support cutoff");
    check(close(water::kernel(0), 10 / (7 * std::numbers::pi * water::h * water::h)), "independent 2D normalization oracle");
    const auto g = water::gradient({0.03, 0.02});
    const auto opposite = water::gradient({-0.03, -0.02});
    check(close(g.x, -opposite.x) && close(g.y, -opposite.y), "odd kernel gradient");
    check(water::gradient({0, 0}).x == 0, "zero-distance gradient is finite");

    auto state = water::makeState();
    const auto neighbors = water::buildNeighbors(state, false);
    water::computeDensity(state, neighbors);
    // Direct sum over all positions is independent of the neighbor-list filter.
    double densityOracle = 0;
    const auto point = state.particles[35].position;
    for (const auto p : neighbors.positions)
        densityOracle += water::mass * water::kernel(std::hypot(point.x - p.x, point.y - p.y));
    check(close(state.particles[35].density, densityOracle), "direct density oracle");
    const double wallDensity = state.particles[0].density;
    state.walls.clear();
    water::computeDensity(state, water::buildNeighbors(state, false));
    check(wallDensity > state.particles[0].density, "wall samples restore missing support");

    auto pair = water::makeState(water::Preset::Pair);
    pair.walls.clear();
    pair.particles[0].density = 1100;
    pair.particles[1].density = 1200;
    water::computePressure(pair, 12);
    check(close(pair.particles[0].pressure, 14400), "shared C++ and Canvas EOS fixture");
    water::Settings settings;
    settings.gravity = 0;
    settings.alpha = 0;
    const auto pairNeighbors = water::buildNeighbors(pair, false);
    const auto pressure = water::accelerations(pair, pairNeighbors, settings);
    check(pressure[0].x < 0 && pressure[1].x > 0 && close(pressure[0].x + pressure[1].x, 0), "symmetric pressure repels and conserves momentum");
    settings.alpha = 0.15;
    const auto viscous = water::accelerations(pair, pairNeighbors, settings);
    double power = 0;
    for (std::size_t i = 0; i < pair.particles.size(); ++i)
        power += water::mass * water::dot(pair.particles[i].velocity, water::subtract(viscous[i], pressure[i]));
    check(power < 0 && close(viscous[0].x + viscous[1].x, 0), "artificial viscosity dissipative pair power");
    check(water::artificialViscosity({0.1, 0}, {1, 0}, 1000, 1000, 12, 0.15) == 0, "no artificial viscosity for separating pair");
    pair.particles[0].density = 900;
    water::computePressure(pair, 12);
    check(pair.particles[0].pressure == 0, "pressure clamp at free surface");

    // The isolated teaching diagnostic must preserve prescribed densities and time.
    const auto pairReport = water::inspectPair(water::PairParameters{}, water::Settings{});
    check(pairReport.state.walls.empty() && pairReport.state.time == 0, "isolated pair has no external forces or integration");
    check(pairReport.state.particles[0].density == 1100 && pairReport.state.particles[1].density == 1200, "isolated pair preserves prescribed density");
    check(close(pairReport.state.particles[0].pressure, 14400) && close(pairReport.state.particles[1].pressure, 28800), "isolated pair EOS example");
    check(close(pairReport.grad.x, 1617.2744726384344, 1e-9) && close(pairReport.pressureForce[0].x, -211.56105354248845, 1e-9), "shared numerical pair fixture");
    check(close(pairReport.netForce.x, 0) && close(pairReport.netForce.y, 0), "isolated net force zero");
    check(close(pairReport.pi, 0.0009070297226124577) && close(pairReport.viscosityPower, -3.609163493617516, 1e-9), "shared Pi and viscosity power fixture");
    water::PairParameters separating;
    separating.approaching = false;
    const auto separated = water::inspectPair(separating, water::Settings{});
    check(separated.pi == 0 && close(separated.viscosityPower, 0) && close(separated.pressureForce[0].x, pairReport.pressureForce[0].x), "separation disables viscosity but not pressure");

    // Each bound is tested while it is strictly smaller than maxDt.
    auto timed = water::makeState(water::Preset::Pair);
    timed.walls.clear();
    for (auto& p : timed.particles) {
        p.velocity = {0, 0};
    }
    std::vector<water::Vec2> zero(timed.particles.size());
    water::Settings acousticSettings;
    acousticSettings.soundSpeed = 20;
    const double acoustic = water::chooseDt(timed, zero, acousticSettings);
    check(close(acoustic, 0.25 * water::h / 20) && acoustic < water::maxDt, "active acoustic timestep bound");
    const std::vector<water::Vec2> forcing(timed.particles.size(), {1e6, 0});
    const double forceDt = water::chooseDt(timed, forcing, water::Settings{});
    check(close(forceDt, 0.25 * std::sqrt(water::h / 1e6)) && forceDt < acoustic, "active force timestep bound");
    check(close(water::chooseDt(timed, zero, water::Settings{}), water::maxDt), "inactive bounds retain maxDt");
    const double invalidAcceleration[] = {1e12, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()};
    for (const double value : invalidAcceleration) {
        bool rejectedDt = false;
        try {
            water::chooseDt(timed, std::vector<water::Vec2>(timed.particles.size(), {value, 0}), water::Settings{});
        } catch (const std::exception&) {
            rejectedDt = true;
        }
        check(rejectedDt, "too-small or nonfinite force timestep rejected");
    }
    bool incomplete = false;
    try {
        water::chooseDt(timed, {}, water::Settings{});
    } catch (const std::exception&) {
        incomplete = true;
    }
    check(incomplete, "incomplete timestep acceleration rejected");
    timed.particles[0].velocity.x = 1e9;
    bool tooFast = false;
    try {
        water::chooseDt(timed, zero, water::Settings{});
    } catch (const std::exception&) {
        tooFast = true;
    }
    check(tooFast, "too-small acoustic timestep rejected");

    water::Vec2 position{-0.2, 0.4};
    water::Vec2 velocity{-2, 3};
    water::collide(position, velocity);
    check(close(position.x, water::spacing / 2) && close(velocity.x, 0.2) && velocity.y == 3, "collision changes only outward normal");
    auto empty = water::makeState(water::Preset::Empty);
    check(water::pour(empty, {0.5, 0.7}), "emission accepted in empty space");
    check(!water::pour(empty, {0.5, 0.7}), "overlapping emission rejected");
    check(!water::pour(empty, {std::numeric_limits<double>::quiet_NaN(), 0.7}), "nonfinite nozzle rejected");
    check(close(water::measure(empty).totalMass, water::mass), "emission adds exactly one particle mass");
    empty.particles.resize(water::capacity);
    check(!water::pour(empty, {0.8, 0.7}) && empty.particles.size() == water::capacity, "capacity is a hard bound");

    auto grid = water::makeState();
    auto brute = grid;
    settings = water::Settings{};
    for (int i = 0; i < 150; ++i) {
        water::step(grid, settings);
        settings.useGrid = false;
        water::step(brute, settings);
        settings.useGrid = true;
    }
    for (std::size_t i = 0; i < grid.particles.size(); ++i) {
        check(close(grid.particles[i].position.x, brute.particles[i].position.x) && close(grid.particles[i].position.y, brute.particles[i].position.y), "grid trajectory equals all-pairs");
        const auto p = grid.particles[i].position;
        check(p.x >= water::spacing / 2 && p.x <= 1 - water::spacing / 2 && p.y >= water::spacing / 2 && p.y <= 0.8 - water::spacing / 2, "finite dam bounds");
    }
    std::vector<double> schedulePositions;
    for (const int fps : {30, 60, 120}) {
        auto scheduled = water::makeState(water::Preset::Pair);
        scheduled.walls.clear();
        settings.gravity = 0;
        double accumulator = 0;
        for (int frame = 0; frame < fps; ++frame) {
            const auto plan = water::advanceFrame(scheduled, settings, accumulator, 1.0 / fps, false, {0.6, 0.7});
            accumulator = plan.remainder;
            check(plan.dropped == 0, "reference schedule discards no time");
        }
        check(close(scheduled.time, 1, 1e-9), "one second of reference schedule");
        schedulePositions.push_back(scheduled.particles[0].position.x);
    }
    check(close(schedulePositions[0], schedulePositions[1]) && close(schedulePositions[0], schedulePositions[2]), "FPS-independent reference trajectory");
    auto stalled = water::makeState(water::Preset::Pair);
    const auto plan = water::advanceFrame(stalled, settings, 0, 2, false, {0.6, 0.7});
    check(plan.steps <= 64 && plan.dropped >= 1.95, "bounded work after stalled frame");
    bool rejected = false;
    settings.soundSpeed = std::numeric_limits<double>::infinity();
    try {
        water::prepare(stalled, settings);
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, "invalid settings rejected");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
