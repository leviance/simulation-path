#include "fluid/reference.hpp"
#include <cstdlib>
#include <iostream>
#include <stdexcept>

namespace {
void require(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

bool near(double a, double b, double tolerance = 1e-10) {
    return std::abs(a - b) <= tolerance;
}

void samplerAndTransport() {
    fluid::Grid grid(16);
    // Affine oracle: bilinear phải khớp tại cả ba offset, không chỉ tại tâm ô.
    for (const auto offset : {fluid::Vec2{0.5, 0.5}, fluid::Vec2{0, 0.5}, fluid::Vec2{0.5, 0}}) {
        std::vector<double> values(16 * 16);
        for (int y = 0; y < 16; ++y) {
            for (int x = 0; x < 16; ++x) {
                values[y * 16 + x] = 2 * (x + offset.x) * grid.h - 3 * (y + offset.y) * grid.h + 4;
            }
        }
        require(near(fluid::sample(grid, values, 16, 16, offset, {0.37, 0.63}), 2 * 0.37 - 3 * 0.63 + 4), "affine sampler oracle");
    }
    std::fill(grid.u.begin(), grid.u.end(), 0.18);
    const auto origin = fluid::backtrace(grid, {0.5, 0.5}, fluid::fixedDt);
    require(near(origin.x, 0.497) && near(origin.y, 0.5), "backtrace sign and midpoint");
    std::fill(grid.density.begin(), grid.density.end(), 0.4);
    fluid::advectSmoke(grid);
    for (const double value : grid.density) {
        require(near(value, 0.4), "constant scalar advection");
    }
    fluid::advectSmokeDetailed(grid);
    for (const double value : grid.density) {
        require(near(value, 0.4), "constant MacCormack");
    }
    for (int y = 0; y < 16; ++y) {
        for (int x = 0; x < 16; ++x) {
            grid.density[y * 16 + x] = x * grid.h;
        }
    }
    fluid::advectSmoke(grid);
    require(near(grid.density[8 * 16 + 8], 0.5 - 0.18 * fluid::fixedDt), "independent affine translation oracle");
    auto detail = fluid::makeScene(32, fluid::Scene::Vortex);
    double before = 0;
    for (const double value : detail.density) {
        before = std::max(before, value);
    }
    fluid::advectSmokeDetailed(detail);
    for (const double value : detail.density) {
        require(value >= 0 && value <= before + 1e-14, "MacCormack limiter extrema");
    }
    // Hai thành phần phải đọc cùng state cũ, kể cả nếu duyệt theo thứ tự ngược.
    auto flow = fluid::makeScene(16, fluid::Scene::Vortex);
    const auto old = flow;
    fluid::advectVelocity(flow);
    for (int y = 1; y < 16; ++y) {
        for (int x = 0; x < 16; ++x) {
            const fluid::Vec2 p{(x + 0.5) * old.h, y * old.h};
            const double expected = fluid::sample(old, old.v, 16, 17, {0.5, 0}, fluid::backtrace(old, p, fluid::fixedDt));
            require(near(flow.v[y * 16 + x], expected), "velocity reads common old state");
        }
    }
}

void pressureOracles() {
    auto pair = fluid::makeScene(8, fluid::Scene::JacobiPair);
    fluid::preparePressure(pair, true);
    require(near(pair.rhs[27], 64) && near(pair.rhs[28], -64), "Jacobi fixed RHS oracle");
    fluid::jacobiIteration(pair);
    require(near(pair.pressure[27], 0.1875) && near(pair.pressure[28], -0.1875), "Jacobi first round oracle");
    require(near(fluid::pressureResidual(pair), std::sqrt(14.0)), "independent Poisson residual oracle");
    fluid::jacobiIteration(pair);
    require(near(pair.pressure[27], 0.19921875), "Jacobi second round oracle");
    const auto report = fluid::validate();
    require(report.passed, "shared C++ and Canvas projection fixture");
    require(near(report.large.after, 0.00010725079495922615, 1e-10), "cross-language fixture after divergence");
    // [snippet known-pressure]
    // Neumann eigenmode có eigenvalue giải tích; RHS không dùng multiplyPressure để sinh.
    for (const auto method : {fluid::PressureMethod::CG, fluid::PressureMethod::PCG}) {
        fluid::Grid grid(32);
        std::vector<double> exact(grid.density.size());
        const double pi = std::acos(-1.0);
        const double eigenvalue = (4 * std::pow(std::sin(pi / 64), 2) + 4 * std::pow(std::sin(pi / 32), 2)) / (grid.h * grid.h);
        for (int y = 0; y < 32; ++y) {
            for (int x = 0; x < 32; ++x) {
                exact[y * 32 + x] = std::cos(pi * (x + 0.5) / 32) * std::cos(2 * pi * (y + 0.5) / 32);
            }
        }
        for (int y = 0; y < 32; ++y) {
            for (int x = 1; x < 32; ++x) {
                grid.u[y * 33 + x] = fluid::fixedDt * (exact[y * 32 + x] - exact[y * 32 + x - 1]) / grid.h;
            }
        }
        for (int y = 1; y < 32; ++y) {
            for (int x = 0; x < 32; ++x) {
                grid.v[y * 32 + x] = fluid::fixedDt * (exact[y * 32 + x] - exact[(y - 1) * 32 + x]) / grid.h;
            }
        }
        fluid::preparePressure(grid, false);
        for (std::size_t i = 0; i < exact.size(); ++i) {
            require(near(grid.rhs[i], eigenvalue * exact[i], 1e-10), "analytic Neumann RHS");
        }
        fluid::Parameters p;
        p.method = method;
        const auto solved = fluid::project(grid, p);
        double error = 0;
        for (std::size_t i = 0; i < exact.size(); ++i) {
            error = std::max(error, std::abs(grid.pressure[i] - exact[i]));
        }
        require(solved.converged && error < 5e-5, "known-pressure error CG and PCG");
    }
    // [/snippet known-pressure]
    auto vortex = fluid::makeScene(16, fluid::Scene::Vortex);
    require(fluid::divergence(vortex) < 1e-12, "discrete streamfunction div-free");
    const auto before = vortex;
    fluid::project(vortex, fluid::Parameters{});
    for (std::size_t i = 0; i < vortex.u.size(); ++i) {
        require(near(vortex.u[i], before.u[i]), "projection preserves div-free velocity");
    }
}

void forcesAndViscosity() {
    auto grid = fluid::makeScene(16, fluid::Scene::Vortex);
    const auto old = grid;
    fluid::diffuseVelocity(grid, 0);
    require(grid.u == old.u && grid.v == old.v, "nu zero identity");
    fluid::diffuseVelocity(grid, 0.003);
    require(fluid::diagnose(grid).energy < fluid::diagnose(old).energy, "viscosity energy decay");
    const double a = 0.003 * fluid::fixedDt / (grid.h * grid.h);
    for (int y = 1; y < 15; ++y) {
        for (int x = 1; x < 16; ++x) {
            const int i = y * 17 + x;
            const double lhs = (1 + 4 * a) * grid.u[i] - a * (grid.u[i - 1] + grid.u[i + 1] + grid.u[i - 17] + grid.u[i + 17]);
            require(near(lhs, old.u[i]), "implicit viscosity equation oracle");
        }
    }
    const auto viscous = grid;
    fluid::confineVorticity(grid, 0);
    require(grid.u == viscous.u && grid.v == viscous.v, "epsilon zero identity");
    fluid::confineVorticity(grid, 8);
    require(fluid::finiteState(grid) && grid.u != viscous.u, "confinement changes actual velocity");
    for (int y = 0; y < 16; ++y) {
        require(grid.u[y * 17] == 0 && grid.u[y * 17 + 16] == 0, "normal walls");
    }
    auto smoke = fluid::makeScene(32, fluid::Scene::Empty);
    fluid::paintStroke(smoke, {0.2, 0.5}, {0.8, 0.5}, 2, false, fluid::cyan);
    for (int x = 7; x < 25; ++x) {
        require(smoke.density[16 * 32 + x] == 1, "stroke has no gaps");
    }
    const auto painted = smoke.density;
    fluid::paintStroke(smoke, {0.2, 0.5}, {0.8, 0.5}, 2, false, fluid::cyan);
    require(smoke.density == painted, "brush idempotence");
    fluid::impulseAt(smoke, {0.5, 0.5}, {0.05, 0});
    require(!smoke.projection.available && !smoke.pressureReady, "impulse invalidates old report");
}

void limitsAndClock() {
    for (const int fps : {15, 30, 120}) {
        double remainder = 0;
        int ticks = 0;
        for (int i = 0; i < fps; ++i) {
            const auto plan = fluid::planSteps(remainder, 1.0 / fps);
            ticks += plan.steps;
            remainder = plan.remainder;
        }
        require(ticks == 60 && remainder < 1e-9, "fixed timestep schedules");
    }
    const auto stalled = fluid::planSteps(0, 10);
    require(stalled.steps == 4 && stalled.dropped > 9.9, "bounded catch-up");
    fluid::Grid large(256);
    require(large.density.size() == 65536 && large.u.size() + large.v.size() == 131584, "actual 256-square allocation");
    auto invalid = fluid::makeScene(16, fluid::Scene::Vortex);
    const auto initial = invalid.density;
    fluid::Parameters p;
    p.viscosity = std::numeric_limits<double>::quiet_NaN();
    require(!fluid::step(invalid, p, fluid::Scene::Vortex) && invalid.density == initial, "reject parameters before mutation");
    invalid.density[0] = std::numeric_limits<double>::quiet_NaN();
    require(!fluid::finiteState(invalid), "nonfinite state detection");
    invalid.density = initial;
    invalid.pressure[0] = std::numeric_limits<double>::quiet_NaN();
    require(!fluid::finiteState(invalid), "nonfinite warm-start pressure detection");
    fluid::Grid overflow(16);
    std::fill(overflow.u.begin(), overflow.u.end(), 1e308);
    bool rejected = false;
    try {
        fluid::project(overflow, fluid::Parameters{});
    } catch (const std::overflow_error&) {
        rejected = true;
    }
    require(rejected && !overflow.projection.converged, "overflow never reports infinity <= infinity as converged");
}
} // namespace

int main() {
    try {
        samplerAndTransport();
        pressureOracles();
        forcesAndViscosity();
        limitsAndClock();
        std::cout << "Project 49: all independent CPU checks passed\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
