#include "reference.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

// Tests remain active with NDEBUG; no window/driver or large allocation is required.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL " << label << '\n';
    }
}

bool near(double actual, double expected, double tolerance = 1e-9) {
    return std::isfinite(actual) && std::abs(actual - expected) < tolerance;
}

int main() {
    for (const auto side : {4U, 8U, 32U, 48U, 100U}) {
        const auto plan = water3::makePlan(side);
        check(plan.count == side * side * side, "cubic particle count");
        check(near(plan.mass * plan.count, 64), "mass stays64kg when refining particles");
        check(plan.residentBytes < 192ULL * 1024 * 1024, "resident budget for advertised presets");
        check(plan.levels.back().groups == 1, "scan hierarchy ends in one block");
        const auto stride = std::max(1U, water3::ceilDivide(plan.count, 100000));
        check((water3::ceilDivide(plan.count, stride) - 1) * stride < plan.count, "render stride never fetches outside SSBO");
    }
    const auto plan = water3::makePlan();
    check(sizeof(water3::Float4) == 16 && alignof(water3::Float4) == 16, "std430 record ABI");
    check(water3::cellId(plan, {1, 1, 1}) == plan.cells - 1, "world endpoint clamped to last cell");
    check(water3::kernel(2 * plan.h, plan.h) == 0, "support cutoff");
    double integral = 0;
    const double dr = 2 * plan.h / 10000;
    for (int i = 0; i < 10000; ++i) {
        const double r = (i + 0.5) * dr;
        integral += 4 * std::numbers::pi * r * r * water3::kernel(r, plan.h) * dr;
    }
    check(near(integral, 1, 1e-6), "independent spherical volume normalization");
    check(water3::gradient({}, plan.h).x == 0, "finite gradient at origin");
    const water3::Vec3 d{0.03, 0.02, 0.04};
    const auto g = water3::gradient(d, plan.h);
    const auto opposite = water3::gradient({-d.x, -d.y, -d.z}, plan.h);
    check(near(g.x, -opposite.x) && near(g.y, -opposite.y) && near(g.z, -opposite.z), "odd3Dgradient");
    const double e = 1e-6;
    const double derivative = (water3::kernel(water3::length({d.x + e, d.y, d.z}), plan.h) - water3::kernel(water3::length({d.x - e, d.y, d.z}), plan.h)) / (2 * e);
    check(near(g.x, derivative, 0.001), "analytic gradient matches independent finite difference");
    const double pi = water3::viscosity({-0.06, 0, 0}, {0.6, 0, 0}, 1100, 1200, plan.h, 12, 0.15);
    check(pi > 0 && water3::viscosity({-0.06, 0, 0}, {-0.6, 0, 0}, 1100, 1200, plan.h, 12, 0.15) == 0, "viscosity only approaches");
    const auto grad = water3::gradient({-0.06, 0, 0}, plan.h);
    const double forceA = -plan.mass * plan.mass * pi * grad.x;
    const double forceB = -forceA;
    check(near(forceA + forceB, 0) && 0.3 * forceA - 0.3 * forceB < 0, "opposite viscosity force and dissipative power");
    // A deliberately compressed small fixture makes pressure positive without overriding density.
    std::vector<water3::Float4> compressed;
    for (int i = 0; i < 12; ++i) {
        compressed.push_back({0.4F + i * 0.001F, 0.45F + i * 0.0006F, 0.5F + i * 0.0008F, 1});
    }
    water3::Settings internal;
    internal.gravity = 0;
    internal.alpha = 0;
    const auto pressure = water3::evaluate(plan, compressed, std::vector<water3::Float4>(12), internal);
    water3::Vec3 netForce;
    for (std::size_t i = 0; i < compressed.size(); ++i) {
        check(pressure.pressure[i] > 0, "compressed fixture has positive EOS pressure");
        netForce.x += plan.mass * pressure.acceleration[i].x;
        netForce.y += plan.mass * pressure.acceleration[i].y;
        netForce.z += plan.mass * pressure.acceleration[i].z;
    }
    check(pressure.acceleration.front().x < 0 && pressure.acceleration.back().x > 0, "pressure repels compressed endpoints");
    check(near(netForce.x, 0, 1e-8) && near(netForce.y, 0, 1e-8) && near(netForce.z, 0, 1e-8), "balanced internal pressure force in3D");

    auto position = water3::Vec3{-0.1, 0.5, 0.5};
    auto velocity = water3::Vec3{-2, 3, 4};
    water3::integrate(position, velocity, {}, 0.0005, plan.spacing / 2);
    check(near(position.x, plan.spacing / 2) && near(velocity.x, 0.2) && near(velocity.y, 3) && near(velocity.z, 4), "collision preserves tangents");
    const auto fine = water3::makePlan(100);
    check(near(water3::chooseDt(fine, 0, 0, 20), 0.25 * fine.h / 20), "active acoustic bound");
    check(near(water3::chooseDt(fine, 0, 1e6, 12), 0.25 * std::sqrt(fine.h / 1e6)), "active force bound");
    for (const double force : {1e12, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) {
        bool rejected = false;
        try {
            water3::chooseDt(fine, 0, force, 12);
        } catch (const std::exception&) {
            rejected = true;
        }
        check(rejected, "invalid or too-small timestep fails");
    }
    std::vector<water3::Float4> single{{0.5F, 0.5F, 0.5F, 1}};
    std::vector<water3::Float4> zero(1);
    const auto density = water3::evaluate(plan, single, zero, water3::Settings{});
    check(near(density.density[0], plan.mass * water3::kernel(0, plan.h)), "density includes self");
    single[0].x = std::numeric_limits<float>::quiet_NaN();
    bool rejected = false;
    try {
        water3::evaluate(plan, single, zero, water3::Settings{});
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, "nonfinite oracle input rejected");
    std::cout << "SPH3D tests: " << failures << " failure(s)\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
