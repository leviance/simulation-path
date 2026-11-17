#include "fluid/reference.hpp"
#include "fluid/statistics.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <numbers>
#include <string_view>

// These checks remain active in Release. No SDL, window or driver is needed.
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        failures++;
        std::cerr << "FAIL: " << message << '\n';
    }
}

template <class Function>
void rejects(Function action, std::string_view message) {
    bool rejected = false;
    try {
        action();
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, message);
}

bool close(double a, double b, double tolerance = 1e-6) {
    return std::isfinite(a) && std::abs(a - b) < tolerance;
}

int main() {
    using namespace water51;
    const auto m = makeModel(48);
    check(m.count == 110592, "required scale");
    check(close(m.count * static_cast<double>(m.mass), 166.375, 1e-3), "3D mass independent of resolution");
    for (int side : {4, 8, 32, 48, 80, 100}) {
        const auto model = makeModel(side);
        check(model.count == static_cast<std::uint32_t>(side * side * side), "N is the actual lattice allocation");
        check(plannedBytes(model) < bufferBudget, "scale ladder has a finite resource plan");
        for (auto preset : {Preset::Dam, Preset::Pool, Preset::Obstacle}) {
            const auto plan = makeModel(side, preset);
            for (std::uint32_t i : {0u, plan.count / 2, plan.count - 1}) {
                const auto p = seedPoint(plan, i);
                check(p.x > 0 && p.y > 0 && p.z > 0 && p.x < tank.x && p.y < tank.y && p.z < tank.z, "seed stays inside six walls");
            }
        }
    }
    rejects([] {
        makeModel(3);
    },
            "reject invalid side");
    rejects([] {
        makeModel(1000);
    },
            "bound large allocation");
    rejects([] {
        makeModel(4, Preset::Dam, 65);
    },
            "reject oversized fixture");
    rejects([] {
        checkedProduct(std::numeric_limits<std::size_t>::max(), 2);
    },
            "allocation overflow");
    Parameters invalid;
    invalid.soundSpeed = std::numeric_limits<float>::quiet_NaN();
    rejects([&] {
        validate(invalid);
    },
            "reject NaN parameters");

    // Integrate in spherical coordinates, not by summing the implementation's own samples.
    const double h = .07, step = 2 * h / 10000;
    double integral = 0;
    for (int i = 0; i <= 10000; i++) {
        const double radius = i * step;
        double weight = 2;
        if (i == 0 || i == 10000)
            weight = 1;
        else if (i % 2 == 1)
            weight = 4;
        integral += weight * 4 * std::numbers::pi * radius * radius * kernel3(radius, h);
    }
    integral *= step / 3;
    check(close(integral, 1, 1e-8), "3D kernel integrates to one");
    check(kernel3(2 * h, h) == 0 && kernel3(3 * h, h) == 0, "compact support");
    check(length(kernelGradient({}, h)) == 0, "zero-distance gradient");
    for (double q : {.2, .7, 1.2, 1.8}) {
        const double r = q * h, epsilon = 1e-7;
        const double derivative = (kernel3(r + epsilon, h) - kernel3(r - epsilon, h)) / (2 * epsilon);
        const double actual = kernelGradient({r, 0, 0}, h).x;
        check(std::abs(derivative - actual) / (1 + std::abs(derivative)) < 1e-7, "analytic gradient versus finite difference");
    }

    auto pairModel = makeModel(8, Preset::Dam, 2);
    pairModel.mass *= 10;
    auto pair = makeReference(pairModel);
    pair.position = {{.79, .41, .55}, {.85, .41, .55}};
    pair.velocity = {{.2, 0, 0}, {-.2, 0, 0}};
    Parameters p;
    p.gravity = 0;
    Body body;
    referenceFields(pairModel, p, body, pair);
    check(pair.pressure[0] > 0, "compressed pair exercises nonzero pressure");
    check(length(add(pair.acceleration[0], pair.acceleration[1])) < 1e-8, "internal force is antisymmetric");
    check(artificialViscosity({-.06, 0, 0}, {.4, 0, 0}, 1000, 1000, pairModel, p) > 0, "approaching pair dissipates");
    check(artificialViscosity({-.06, 0, 0}, {-.4, 0, 0}, 1000, 1000, pairModel, p) == 0, "separating pair has no artificial viscosity");
    const auto visc = artificialViscosity({-.06, 0, 0}, {.4, 0, 0}, 1000, 1000, pairModel, p);
    const auto viscForce = scale(kernelGradient({-.06, 0, 0}, pairModel.h), -pairModel.mass * visc);
    check(dot({.4, 0, 0}, viscForce) <= 0, "viscosity power is nonpositive");
    const auto dt = referenceTimestep(pairModel, p, pair);
    check(dt > 0 && dt <= maximumDt, "adaptive timestep bounds");
    pair.acceleration[0] = {1e8, 0, 0};
    check(referenceTimestep(pairModel, p, pair) < dt, "force limit uses current acceleration");
    pair.velocity[0] = {1e9, 0, 0};
    rejects([&] {
        referenceTimestep(pairModel, p, pair);
    },
            "timestep floor fails safely");

    const auto small = makeModel(8);
    auto state = makeReference(small);
    Parameters parameters;
    for (int tick = 0; tick < 3; tick++) {
        referenceFields(small, parameters, body, state);
        const auto stepDt = referenceTimestep(small, parameters, state);
        referenceIntegrate(small, body, state, stepDt);
        check(state.position.size() == small.count, "integration conserves particle count");
        for (auto point : state.position)
            check(finite(point) && point.x >= 0 && point.y >= 0 && point.z >= 0 && point.x <= tank.x && point.y <= tank.y && point.z <= tank.z, "finite closed-box state");
    }
    Vec3 point{-.1, .2, 1.3}, velocity{-2, 0, 3};
    collide(small, body, point, velocity);
    check(point.x > 0 && point.z < tank.z && velocity.x > 0 && velocity.z < 0, "outward-only plane response");
    body.enabled = true;
    point = body.position;
    velocity = {};
    collide(small, body, point, velocity);
    check(close(length(subtract(point, body.position)), body.radius + .5 * small.spacing), "sphere center degeneracy has a finite normal");
    check(boundarySamples(small, {.82, .40, .55}, Body{}).empty(), "interior has no wall samples");
    check(!boundarySamples(small, {.03, .03, .55}, Body{}).empty(), "corner has wall support");
    const auto median = distribution({8, 1, 7, 2, 6, 3, 5, 4});
    check(median.minimum == 1 && median.median == 4.5 && median.maximum == 8, "benchmark median and extrema");
    rejects([] {
        distribution({});
    },
            "empty benchmark rejected");
    rejects([] {
        distribution({-1});
    },
            "negative timing rejected");
    if (failures != 0)
        return EXIT_FAILURE;
    std::cout << "P51 CPU PASS: units, kernel, gradient, forces, boundaries, dt, count, budgets, statistics\n";
    return EXIT_SUCCESS;
}
