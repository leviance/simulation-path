#define LAB_CHECKPOINT 9
#include "bulb_camera.hpp"
#include "bulb_jobs.hpp"
#include "bulb_reference.hpp"
#include "bulb_trace.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
using namespace bulb;

void check(bool condition, std::string_view message) {
    if (!condition)
        throw std::runtime_error(std::string(message));
}

void near(double actual, double expected, double tolerance) {
    if (!std::isfinite(actual) || std::abs(actual - expected) > tolerance)
        throw std::runtime_error("Numeric fixture actual=" + std::to_string(actual) + " expected=" + std::to_string(expected) + " tolerance=" + std::to_string(tolerance));
}

void orbitFixtures() {
    for (int power : {2, 6, 8, 10, 12}) {
        Settings s;
        s.power = power;
        for (Vec3 point : std::array<Vec3, 8>{{{0, 0, 0}, {0, 0, 0.25}, {0, 0, -0.25}, {1e-8, 0, 0.25}, {0, 1e-8, -0.25}, {3, 0, 0}, {0, 0, 3}, {0, -3, 0}}}) {
            const auto actual = evaluate(point, s);
            const auto reference = referenceOrbit(point, s);
            check(actual.state != OrbitState::invalid && !reference.invalid, "Special orbit must remain finite");
            check((actual.state == OrbitState::escaped) == reference.escaped, "Trig mapping disagrees with independent polynomial oracle");
            check(actual.iterations == reference.evaluations, "Orbit body counters differ");
        }
    }
    near(length(sphericalPower({0, 0, 0}, 8)), 0, 0);
    near(length(sphericalPower({1, 0, 0}, 2) - Vec3{0, 0, -1}), 0, 1e-12);
    Settings s;
    check(evaluate({std::numeric_limits<double>::infinity(), 0, 0}, s).state == OrbitState::invalid, "Infinity needs an explicit state");
    check(evaluate({1e308, 1e308, 1e308}, s).state == OrbitState::invalid, "Finite inputs that overflow the radius calculation need an invalid state");
}

void rayFixtures() {
    Settings s;
    int resolved = 0;
    for (Vec3 direction : std::array<Vec3, 5>{{{0, 0, -1}, {0.1, 0, -1}, {0, 0.1, -1}, {-0.1, 0, -1}, {2, 0, 0}}}) {
        direction = unit(direction);
        const Vec3 origin{0, 0, 3.4};
        const auto fast = march(origin, direction, s);
        const auto reference = referenceRay(origin, direction, s, 0.00025);
        std::cout << "RAY fast=" << fast.t << " state=" << fast.state << " ref=" << reference.t << " hit=" << reference.hit << '\n';
        check((fast.state == hitFlag) == reference.hit, "DE ray classification differs from fixed-step oracle");
        if (reference.hit) {
            // Both algorithms target the explicit finite-resolution epsilon shell.
            // This does NOT assert membership in the infinite-iteration set.
            near(fast.t, reference.t, 0.006);
            const auto independent = referenceOrbit(origin + direction * fast.t, s);
            check(referenceContains(independent, s, ReferenceSurface::epsilonShell), "Fast hit lies outside the independently evaluated epsilon shell");
            ++resolved;
        }
    }
    check(march({0, 0, 0}, {1, 0, 0}, s).state == insideFlag, "Bounded camera must not fake a t=0 surface hit");
    check(resolved == 4, "Four fixed rays must agree in absolute hit distance");
    for (Vec3 direction : std::array<Vec3, 3>{{{0, 0, -1}, {0.1, 0, -1}, {0, 0.1, -1}}}) {
        direction = unit(direction);
        const Vec3 origin{0, 0, 3.4};
        const auto fast = march(origin, direction, s);
        const auto finiteSet = referenceRay(origin, direction, s, 0.00025, ReferenceSurface::finiteOrbit);
        check(fast.state == hitFlag && finiteSet.hit, "Resolved finite-orbit geometry fixture must hit");
        near(fast.t, finiteSet.t, 0.006);
    }
    std::cout << "FINITE ORBIT SURFACE PASS resolved=3 uniformStep=0.00025 absoluteT=0.006; sub-step features remain unresolved\n";
    check(march({0, 0, 3.4}, {0, 0, 0}, s).state == invalidFlag, "Zero ray must be rejected before arithmetic");
    std::cout << "REFERENCE resolved=" << resolved << " shellStep=0.00025 absoluteT=0.006 epsilon=" << s.epsilon << " finiteIterations=" << s.iterations << '\n';
}

void cameraFixtures() {
    Camera camera;
    camera.yaw = 0;
    camera.pitch = 0;
    camera.distance = 2;

    // Looking along -X gives right=-Z and up=+Y, so this pan has a known answer.
    camera.pan(10, 20);
    near(camera.target.x, 0, 1e-12);
    near(camera.target.y, 0.048, 1e-12);
    near(camera.target.z, 0.024, 1e-12);
    near(length(camera.eye() - Vec3{2, 0.048, 0.024}), 0, 1e-12);
    near(length(camera.ray(480, 270, 960, 540) - Vec3{-1, 0, 0}), 0, 1e-12);

    camera.dolly(1);
    near(camera.distance, 1.773840873434315, 1e-12);
    camera.orbit(10, -20);
    near(camera.yaw, -0.06, 1e-12);
    near(camera.pitch, -0.12, 1e-12);

    // Extreme finite input must stop at the published bounds instead of breaking the basis.
    camera.pan(1e9, -1e9);
    camera.orbit(1e9, -1e9);
    camera.dolly(1e6);
    near(camera.distance, 0.04, 0);
    validateCamera(camera);
    camera.dolly(-1e6);
    near(camera.distance, 18, 0);
    validateCamera(camera);
    near(length(camera.ray(0, 0, 960, 540)), 1, 1e-12);
    near(dot(camera.right(), camera.forward()), 0, 1e-12);
    std::cout << "CAMERA PASS analyticPan=1 centerRay=1 orbitDollyBounds=1\n";
}

void jobFixtures() {
    Settings s;
    Camera c;
    RenderPlan plan;
    plan.request(s, c);
    const auto old = plan.requested();
    const auto preview = *plan.next();
    s.power = 6;
    plan.request(s, c);
    check(!plan.accept(old, preview, {8160}), "Old preview must not publish under new config");
    const auto current = plan.requested();
    check(plan.accept(current, *plan.next(), {8160}), "Complete current preview must publish");
    const auto active = plan.active()->generation;
    plan.pause(true);
    check(!plan.next(), "Pause stops final batches");
    c.orbit(10, 3);
    plan.request(s, c);
    check(plan.next()->preview, "Pause must not lock camera previews");
    plan.cancel();
    check(plan.active()->generation == active && !plan.next(), "Cancel preserves last-good and stops new work");
    check(batchBound(previewSettings(s), 8160, false) <= maximumBatchWork, "Preview work is bounded");
    check(batchBound(s, 512, true) <= maximumBatchWork, "Full tile work is bounded");
    near(static_cast<double>(bufferBytes(960, 540)), 24883248, 0);
}
} // namespace

int main() {
    int failures = 0;
    try {
        orbitFixtures();
        rayFixtures();
        cameraFixtures();
        jobFixtures();
        std::cout << "P43 CORE PASS\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        ++failures;
    }
    if (failures != 0)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
