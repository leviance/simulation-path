#include "diagnostics.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

int failures = 0;

void check(bool condition, std::string_view label) {
    // Kiểm tra vẫn hoạt động khi Release định nghĩa NDEBUG.
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(double actual, double expected, double tolerance = 1e-10) {
    return std::isfinite(actual) && std::abs(actual - expected) < tolerance;
}

void checkWalls(const fluid::Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        check(grid.u[y * (grid.n + 1)] == 0 && grid.u[y * (grid.n + 1) + grid.n] == 0, "u normal wall zero");
    }
    for (int x = 0; x < grid.n; ++x) {
        check(grid.v[x] == 0 && grid.v[grid.n * grid.n + x] == 0, "v normal wall zero");
    }
}

int main() {
    bool rejectedSize = false;
    try {
        fluid::Grid invalid(7);
    } catch (const std::invalid_argument&) {
        rejectedSize = true;
    }
    check(rejectedSize, "invalid dimensions rejected");
    auto grid = fluid::makeGrid(16, fluid::Preset::Empty);
    check(grid.density.size() == 256 && grid.u.size() == 272 && grid.v.size() == 272, "MAC array dimensions");
    fluid::paintStroke(grid, {0, 0.5}, {1, 0.5}, 1, 1);
    for (int x = 0; x < 16; ++x) {
        check(grid.density[7 * 16 + x] == 1, "brush stroke stays connected");
    }

    // Oracle affine dùng vị trí mẫu thật của từng lattice.
    grid = fluid::makeGrid(8, fluid::Preset::Empty);
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            grid.density[y * 8 + x] = 2 * (x + 0.5) * grid.h - 3 * (y + 0.5) * grid.h + 1;
        }
    }
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x <= 8; ++x) {
            grid.u[y * 9 + x] = 2 * x * grid.h - 3 * (y + 0.5) * grid.h + 1;
        }
    }
    for (int y = 0; y <= 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            grid.v[y * 8 + x] = 2 * (x + 0.5) * grid.h - 3 * y * grid.h + 1;
        }
    }
    const fluid::Vec2 probe{0.41, 0.37};
    const double expected = 2 * probe.x - 3 * probe.y + 1;
    check(near(fluid::sample(grid, grid.density, 8, 8, {0.5, 0.5}, probe), expected), "scalar affine sampling");
    check(near(fluid::sample(grid, grid.u, 9, 8, {0, 0.5}, probe), expected), "u affine sampling");
    check(near(fluid::sample(grid, grid.v, 8, 9, {0.5, 0}, probe), expected), "v affine sampling");
    check(near(fluid::sample(grid, grid.density, 8, 8, {0.5, 0.5}, {-1, -1}), grid.density[0]), "constant edge extension");

    grid = fluid::makeGrid(8, fluid::Preset::Empty);
    std::fill(grid.u.begin(), grid.u.end(), 0.2);
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            grid.density[y * 8 + x] = (x + 0.5) / 8.0;
        }
    }
    fluid::advectDensity(grid);
    check(near(grid.density[3 * 8 + 4], 4.5 / 8 - fluid::dt * 0.2), "scalar backtrace sign and world units");
    std::fill(grid.density.begin(), grid.density.end(), 0.4);
    fluid::advectDensity(grid);
    for (const auto value : grid.density) {
        check(near(value, 0.4), "constant scalar invariant");
    }

    // Exact 8x8 teaching fixture: all updates read the previous pressure buffer.
    auto dipole = fluid::makeGrid(8, fluid::Preset::PressureDipole);
    const auto dipoleU = dipole.u;
    const auto dipoleV = dipole.v;
    const auto dipoleDensity = dipole.density;
    fluid::beginPressure(dipole);
    check(near(dipole.rhs[27], 64) && near(dipole.rhs[28], -64), "dipole opposite RHS");
    check(near(fluid::pressureResidual(dipole), std::sqrt(128.0)), "dipole initial residual oracle");
    const auto first = fluid::jacobiIteration(dipole, 3, 3);
    check(first.count == 4 && near(first.sum, 0) && near(first.candidate, 0.25), "first Jacobi stencil");
    check(near(first.gauge, 0) && near(first.result, 0.1875) && near(dipole.pressure[28], -0.1875), "first weighted Jacobi exact values");
    check(near(fluid::pressureResidual(dipole), std::sqrt(14.0)), "one-round residual oracle");
    const auto second = fluid::jacobiIteration(dipole, 3, 3);
    check(near(second.sum, -0.1875) && near(second.candidate, 0.203125) && near(second.result, 0.19921875), "second round reads old neighbors");
    check(fluid::inspectJacobiCell(dipole, 0, 0).count == 2 && fluid::inspectJacobiCell(dipole, 0, 3).count == 3, "Jacobi Neumann edge degrees");
    check(dipole.u == dipoleU && dipole.v == dipoleV && dipole.density == dipoleDensity && dipole.tick == 0, "Jacobi does not advance simulation");
    fluid::beginPressure(dipole);
    check(dipole.pressureIterations == 0 && near(dipole.pressure[27], 0), "restart Jacobi without resetting velocity");

    grid = fluid::makeGrid(16, fluid::Preset::Compressing);
    fluid::computeDivergence(grid);
    double fluxSum = 0;
    for (const auto value : grid.div) {
        fluxSum += value;
    }
    check(near(fluxSum, 0), "closed-box flux telescopes");
    const auto beforeU = grid.u;
    const double lowResidual = fluid::solvePressure(grid, 20);
    const double highResidual = fluid::solvePressure(grid, 160);
    check(highResidual < lowResidual / 20 && grid.u == beforeU, "pressure budget reduces residual without projecting");
    double residualSquared = 0;
    for (int y = 0; y < 16; ++y) {
        for (int x = 0; x < 16; ++x) {
            const int i = y * 16 + x;
            double lap = 0;
            const int neighbours[][2] = {{x - 1, y}, {x + 1, y}, {x, y - 1}, {x, y + 1}};
            for (const auto& point : neighbours) {
                if (point[0] >= 0 && point[0] < 16 && point[1] >= 0 && point[1] < 16) {
                    lap += grid.pressure[point[1] * 16 + point[0]] - grid.pressure[i];
                }
            }
            const double r = -lap / (grid.h * grid.h) - grid.rhs[i];
            residualSquared += r * r;
        }
    }
    check(near(std::sqrt(residualSquared / 256), highResidual), "independent Poisson residual oracle");
    const double beforeEnergy = fluid::measure(grid).energy;
    const auto projection = fluid::project(grid, 160);
    check(projection.after < projection.before * 0.08, "projection reduces divergence in standard fixture");
    check(near(projection.after, fluid::dt * projection.residual), "divergence equals scaled residual");
    check(fluid::measure(grid).energy < beforeEnergy, "projection reduces velocity norm in fixture");
    check(near(projection.before, 1.8728670913548304) && near(projection.after, 0.011600476804628381), "shared C++ and Canvas projection fixture");
    checkWalls(grid);

    auto vortex = fluid::makeGrid(8, fluid::Preset::Vortex);
    check(near(fluid::computeDivergence(vortex), 0), "streamfunction is discretely divergence-free");
    const auto vortexU = vortex.u;
    fluid::project(vortex, 160);
    for (std::size_t i = 0; i < vortexU.size(); ++i) {
        check(near(vortex.u[i], vortexU[i]), "projection preserves divergence-free velocity");
    }

    // Duyệt ngược nhưng cùng đọc state cũ để bắt swap sớm trong advection.
    auto oracleU = vortex.u;
    auto oracleV = vortex.v;
    for (int y = 7; y >= 0; --y) {
        for (int x = 8; x >= 0; --x) {
            const fluid::Vec2 p{x * vortex.h, (y + 0.5) * vortex.h};
            const auto flow = fluid::velocity(vortex, p);
            oracleU[y * 9 + x] = fluid::sample(vortex, vortex.u, 9, 8, {0, 0.5}, {p.x - fluid::dt * flow.x, p.y - fluid::dt * flow.y});
        }
    }
    for (int y = 8; y >= 0; --y) {
        for (int x = 7; x >= 0; --x) {
            const fluid::Vec2 p{(x + 0.5) * vortex.h, y * vortex.h};
            const auto flow = fluid::velocity(vortex, p);
            oracleV[y * 8 + x] = fluid::sample(vortex, vortex.v, 8, 9, {0.5, 0}, {p.x - fluid::dt * flow.x, p.y - fluid::dt * flow.y});
        }
    }
    fluid::advectVelocity(vortex);
    for (int y = 0; y < 8; ++y) {
        for (int x = 1; x < 8; ++x) {
            check(near(vortex.u[y * 9 + x], oracleU[y * 9 + x]), "u advection uses old state");
        }
    }
    for (int y = 1; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            check(near(vortex.v[y * 8 + x], oracleV[y * 8 + x]), "v advection uses old state");
        }
    }
    checkWalls(vortex);

    auto viscous = fluid::makeGrid(16, fluid::Preset::Vortex);
    const auto sourceU = viscous.u;
    const double energy = fluid::measure(viscous).energy;
    fluid::diffuseVelocity(viscous, 0);
    check(viscous.u == sourceU, "zero viscosity leaves velocity unchanged");
    fluid::diffuseVelocity(viscous, 0.003);
    check(fluid::measure(viscous).energy < energy, "viscosity reduces velocity energy");
    const double a = 0.003 * fluid::dt / (viscous.h * viscous.h);
    for (int y = 0; y < 16; ++y) {
        for (int x = 1; x < 16; ++x) {
            const int i = y * 17 + x;
            double lap = viscous.u[i - 1] + viscous.u[i + 1] - 2 * viscous.u[i];
            if (y > 0) {
                lap += viscous.u[i - 17] - viscous.u[i];
            }
            if (y < 15) {
                lap += viscous.u[i + 17] - viscous.u[i];
            }
            check(near(viscous.u[i] - a * lap, sourceU[i]), "implicit viscosity equation oracle");
        }
    }
    checkWalls(viscous);

    auto forced = fluid::makeGrid(8, fluid::Preset::Empty);
    std::fill(forced.density.begin(), forced.density.end(), 1);
    fluid::addBuoyancy(forced, 0.8);
    check(near(forced.v[3 * 8 + 3], fluid::dt * 0.8), "buoyancy includes dt");
    auto one = fluid::makeGrid(8, fluid::Preset::Empty);
    auto two = one;
    fluid::addImpulse(one, {0.5, 0.5}, {0.1, -0.2});
    fluid::addImpulse(two, {0.5, 0.5}, {0.05, -0.1});
    fluid::addImpulse(two, {0.5, 0.5}, {0.05, -0.1});
    check(one.u == two.u && one.v == two.v, "split displacement impulse at fixed center");
    fluid::Settings invalid;
    invalid.viscosity = std::numeric_limits<double>::quiet_NaN();
    const auto previous = one.density;
    check(!fluid::step(one, invalid) && one.tick == 0 && one.density == previous, "invalid settings rejected before mutation");

    fluid::Settings settings;
    settings.iterations = 40;
    settings.buoyancy = 0;
    auto reference = fluid::makeGrid(8, fluid::Preset::Vortex);
    for (int i = 0; i < 60; ++i) {
        fluid::step(reference, settings);
    }
    for (const int fps : {15, 30, 120}) {
        auto candidate = fluid::makeGrid(8, fluid::Preset::Vortex);
        double accumulator = 0;
        for (int frame = 0; frame < fps; ++frame) {
            const auto plan = fluid::planSteps(accumulator, 1.0 / fps);
            accumulator = plan.remainder;
            for (int i = 0; i < plan.steps; ++i) {
                fluid::step(candidate, settings);
            }
        }
        check(candidate.tick == 60 && candidate.density == reference.density && candidate.u == reference.u, "fixed ticks independent of render FPS");
    }
    const auto hitch = fluid::planSteps(0, 10);
    check(hitch.steps == 4 && hitch.dropped > 9.9 && hitch.remainder >= 0 && hitch.remainder < fluid::dt, "stalled frame work bounded");
    check(fluid::validateFluid().passed, "standard validation passes");
    std::cout << "Stable Fluids tests: " << failures << " failure(s)\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
