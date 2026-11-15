#include "benchmark.hpp"
#include "sph/emitter.hpp"
#include "sph/reference.hpp"
#include "sph/surface.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <set>
#include <string_view>

// require chạy trong cả Debug/Release; không dùng assert bị NDEBUG vô hiệu hóa.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL " << label << '\n';
    }
}

bool close(double a, double b, double tolerance) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= tolerance;
}

template <typename Action>
void rejects(Action action, std::string_view label) {
    bool thrown = false;
    try {
        action();
    } catch (const std::exception&) {
        thrown = true;
    }
    check(thrown, label);
}

// [snippet gradient-check]
void kernelChecks() {
    const auto report = water::reference();
    check(close(report.integral, 1, 1e-6), "independent radial area integral");
    for (const double q : {0.3, 0.8, 1.2, 1.8}) {
        const double x = q * water::h;
        const double epsilon = 1e-6 * water::h;
        const double numerical = (water::kernel(x + epsilon) - water::kernel(x - epsilon)) / (2 * epsilon);
        const double actual = water::gradient(x, 0).x;
        check(close(actual, numerical, 1e-5 * std::max(1.0, std::abs(numerical))), "gradient finite difference");
    }
    check(water::kernel(water::support) == 0, "support endpoint");
    check(water::gradient(0, 0).x == 0 && water::gradient(0, 0).y == 0, "zero displacement");
}

// [/snippet gradient-check]
void pairChecks() {
    water::State state;
    state.particles = {{2, 2, 1, 0}, {2 + water::h, 2, -1, 0}};
    state.particles[0].density = 1100;
    state.particles[1].density = 1200;
    water::Settings settings;
    settings.gravity = 0;
    settings.alpha = 0;
    const auto search = water::buildNeighbors(state, false);
    water::computePressure(state, settings);
    water::computeForces(state, search, settings);
    const double pressureForce = water::mass * state.particles[0].ax;
    check(close(state.particles[0].pressure, 40000, 1e-9) && close(state.particles[1].pressure, 80000, 1e-9), "2D EOS shared fixture");
    check(close(pressureForce, -962.899070255326, 1e-8), "nonzero pair force independent numeric oracle");
    check(close(water::mass * (state.particles[0].ax + state.particles[1].ax), 0, 1e-8), "equal and opposite pressure forces");
    settings.alpha = 0.3;
    water::computeForces(state, search, settings);
    const double viscosityForce = water::mass * state.particles[0].ax - pressureForce;
    check(close(2 * viscosityForce, -224.529475242557, 1e-8), "viscosity negative power");
    const double separate = water::artificialViscosity(-water::h, 0, -2, 0, 1100, 1200, settings);
    check(separate == 0, "separating pair has zero viscosity");
}

void searchChecks() {
    water::State a;
    for (int y = 0; y < 5; ++y) {
        for (int x = 0; x < 8; ++x) {
            a.particles.push_back({0.03 + x * water::spacing, 0.03 + y * water::spacing, 0.1 * std::sin(x + y), 0.1 * std::cos(x - y)});
        }
    }
    a.walls = water::wallSamples();
    auto b = a;
    const auto grid = water::buildNeighbors(a, true);
    const auto all = water::buildNeighbors(b, false);
    check(grid.lists == all.lists, "grid neighbor IDs with negative wall cells");
    check(grid.candidates < all.candidates, "grid reduces candidates on same fixture");
    water::Settings settings;
    water::computeDensity(a, grid);
    water::computeDensity(b, all);
    water::computePressure(a, settings);
    water::computePressure(b, settings);
    water::computeForces(a, grid, settings);
    water::computeForces(b, all, settings);
    for (std::size_t i = 0; i < a.particles.size(); ++i) {
        check(close(a.particles[i].density, b.particles[i].density, 1e-9), "density grid/all-pairs");
        check(close(a.particles[i].pressure, b.particles[i].pressure, 1e-8), "pressure grid/all-pairs");
        check(close(a.particles[i].ax, b.particles[i].ax, 1e-9) && close(a.particles[i].ay, b.particles[i].ay, 1e-9), "force grid/all-pairs");
    }
    for (int k = 0; k < 40; ++k) {
        settings.useGrid = true;
        water::step(a, settings);
        settings.useGrid = false;
        water::step(b, settings);
    }
    for (std::size_t i = 0; i < a.particles.size(); ++i) {
        check(close(a.particles[i].x, b.particles[i].x, 1e-9) && close(a.particles[i].y, b.particles[i].y, 1e-9), "trajectory grid/all-pairs");
    }
    water::State edge;
    edge.particles = {{0.1, 0.1}, {0.1 + water::support, 0.1}, {0.1 + water::support - 1e-8, 0.1}, {-0.03, 0.1}};
    check(water::buildNeighbors(edge, true).lists == water::buildNeighbors(edge, false).lists, "negative cells and exact cutoff");
    water::Grid lookup;
    rejects([&] {
        lookup.cell(1e300, 0);
    },
            "grid rejects before unsafe integer conversion");
}

void scaleChecks() {
    // Kiểm workload thật ngắn trong CTest; render/2200 bước được kiểm ở executable riêng có deadline.
    for (const auto preset : {water::Preset::Dam, water::Preset::Pool}) {
        auto state = water::makeState(preset, 5000);
        const auto initialMass = water::mass * state.particles.size();
        for (int i = 0; i < 16; ++i) {
            water::step(state, {});
        }
        water::inspectCurrent(state, {});
        const auto values = water::measure(state);
        check(state.particles.size() == 5000 && state.updated == 5000, "actual 5000 updated particles");
        check(close(initialMass, water::mass * state.particles.size(), 1e-9) && values.leaked == 0, "mass and boundary containment");
        check(std::isfinite(values.maximum) && values.maximum < 1.5, "short-run compression guard, not physical accuracy proof");
        std::cout << "SCALE 5000 tick=" << state.tick << " rho=" << values.minimum << ',' << values.median << ',' << values.maximum << " dt=" << state.dt << " leakage=" << values.leaked << '\n';
        water::Surface surface;
        water::reconstruct(state, surface);
        water::shade(surface);
        check(surface.drawn == 5000 && surface.rgba.size() == 720 * 432 * 4, "surface consumes all particles");
    }
    rejects([] {
        water::makeState(water::Preset::Dam, 40000);
    },
            "bounded count");
    rejects([] {
        water::buildNeighbors(water::makeState(), false);
    },
            "bounded all-pairs");
}

void inputChecks() {
    auto state = water::makeState(water::Preset::Empty);
    const std::size_t added = water::emitBurst(state, {8.6, 6.5});
    check(added == 7 && state.emitted == 7, "burst has seven new particles");
    check(water::emitBurst(state, {8.6, 6.5}) == 0 && state.rejected == 7, "overlap rejection");
    while (state.particles.size() < water::capacity) {
        state.particles.push_back({1, 1});
    }
    check(water::emitBurst(state, {4, 4}) == 0 && state.particles.size() == water::capacity, "capacity does not delete old particles");
    state = water::makeState(water::Preset::Empty);
    state.paddle.enabled = true;
    const double initialX = state.paddle.x;
    water::targetPaddle(state, initialX + 2, state.paddle.y);
    check(state.paddle.x == initialX, "target does not teleport body");
    water::movePaddle(state, 0.001);
    check(close(state.paddle.x - initialX, 0.003, 1e-12), "kinematic speed bound");
    water::Particle p{state.paddle.x, state.paddle.y};
    water::collide(state, p);
    check(std::hypot(p.x - state.paddle.x, p.y - state.paddle.y) >= state.paddle.radius + water::spacing / 2 - 1e-10, "paddle singular center contact");
    water::Particle inward{-1, 1, 2, 0};
    water::collide(state, inward);
    check(inward.vx == 2, "boundary preserves inward velocity");
}

void robustnessChecks() {
    auto state = water::makeState(water::Preset::Empty);
    state.particles = {{2, 2}};
    water::Settings settings;
    settings.soundSpeed = 40;
    check(close(water::chooseDt(state, settings), 0.25 * water::h / 43, 1e-12), "acoustic timestep oracle");
    state.particles[0].ax = 1e8;
    check(close(water::chooseDt(state, settings), 0.25 * std::sqrt(water::h / 1e8), 1e-12), "force timestep oracle");
    state.particles[0].ax = 1e20;
    rejects([&] {
        water::chooseDt(state, settings);
    },
            "too-small timestep rejected");
    state.particles[0].ax = std::numeric_limits<double>::quiet_NaN();
    rejects([&] {
        water::step(state, settings);
    },
            "NaN rejected");
    settings.soundSpeed = std::numeric_limits<double>::infinity();
    rejects([&] {
        water::validate(settings);
    },
            "invalid parameter rejected");
    std::set<std::pair<double, double>> unique;
    for (const auto& wall : water::wallSamples()) {
        check(wall.x < 0 || wall.x > water::width || wall.y < 0 || wall.y > water::height, "wall outside fluid domain");
        check(unique.insert({wall.x, wall.y}).second, "no corner duplicate");
    }
    const auto report = water::reference();
    check(report.passed && report.equilibriumDrift < 1e-4, "zero-gravity equilibrium and reference");
}

int main(int argc, char** argv) {
    if (argc == 2 && std::string_view(argv[1]) == "--benchmark") {
        return benchmark::run();
    }
    try {
        kernelChecks();
        pairChecks();
        searchChecks();
        scaleChecks();
        inputChecks();
        robustnessChecks();
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "SPH tests PASS\n";
    return EXIT_SUCCESS;
}
