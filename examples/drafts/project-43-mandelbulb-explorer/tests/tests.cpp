#define LAB_CHECKPOINT 9
#include "bulb_trace.hpp"
#include "bulb_reference.hpp"
#include "bulb_jobs.hpp"
#include <iostream>
#include <limits>
#include <cstdlib>

namespace {
using namespace bulb;
void check(bool condition, std::string_view message) {
    if (!condition)
        throw std::runtime_error(std::string(message));
}
void near(double actual, double expected, double tolerance) {
    if(!std::isfinite(actual) || std::abs(actual-expected)>tolerance)
        throw std::runtime_error("Numeric fixture actual="+std::to_string(actual)+" expected="+std::to_string(expected)+" tolerance="+std::to_string(tolerance));
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
}
void rayFixtures() {
    Settings s;
    int resolved=0,thinFeatures=0;
    for (Vec3 direction : std::array<Vec3, 5>{{{0, 0, -1}, {0.1, 0, -1}, {0, 0.1, -1}, {-0.1, 0, -1}, {2, 0, 0}}}) {
        direction = unit(direction);
        const Vec3 origin{0, 0, 3.4};
        const auto fast = march(origin, direction, s);
        const auto reference = referenceRay(origin, direction, s, 0.001);
        std::cout<<"RAY fast="<<fast.t<<" state="<<fast.state<<" ref="<<reference.t<<" hit="<<reference.hit<<'\n';
        check((fast.state == hitFlag) == reference.hit, "DE ray classification differs from fixed-step oracle");
        if(reference.hit) {
            // A uniform scan can miss a thinner feature in front. A resolved feature must not be skipped.
            check(fast.t-reference.t<=0.006,"DE overshot a feature resolved by the slow oracle");
            bool confirmed=false;
            for(int probe=0;probe<=16;++probe) {
                const auto independent=referenceOrbit(origin+direction*(fast.t+probe*s.epsilon/8),s);
                if(!independent.invalid&&!independent.escaped) confirmed=true;
            }
            check(confirmed,"Fast hit has no independently bounded orbit in its local tolerance interval");
            if(std::abs(fast.t-reference.t)<=0.006) ++resolved;
            else ++thinFeatures;
        }
    }
    check(march({0, 0, 0}, {1, 0, 0}, s).state == insideFlag, "Bounded camera must not fake a t=0 surface hit");
    check(resolved>=3,"At least three resolved rays must agree in absolute hit distance");
    std::cout<<"REFERENCE resolved="<<resolved<<" thinFeaturesBeforeScan="<<thinFeatures<<" step=0.001 overshootTolerance=0.006 localConfirmation=0.0007\n";
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
    check(!plan.accept(old, preview, {}), "Old preview must not publish under new config");
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
    try {
        orbitFixtures();
        rayFixtures();
        jobFixtures();
        std::cout << "P43 CORE PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception &error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
