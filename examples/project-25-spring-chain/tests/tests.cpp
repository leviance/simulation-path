#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

// Mỗi check báo một invariant vật lý cụ thể để lỗi CTest dẫn thẳng về công thức.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    ++failures;
    std::cerr << "FAIL: " << label << '\n';
}

bool nearlyEqual(double first, double second, double tolerance = 1e-9) {
    return std::abs(first - second) <= tolerance;
}

void testSceneTopology() {
    const lab::SpringChain chain = lab::makeVerticalChain(18, {0.0, 4.0}, 0.42, 0.25, 0.1, 120.0, 1.6);
    check(lab::validChain(chain), "default chain is valid");
    check(chain.particles.size() == 18, "default chain has 18 particles");
    check(chain.springs.size() == 17, "N particles create N-1 springs");
    check(chain.particles.front().inverseMass == 0.0, "first particle is anchored");
    check(nearlyEqual(chain.particles[1].inverseMass, 4.0), "dynamic particle stores inverse mass");
    for (const lab::Spring& spring : chain.springs) {
        const lab::SpringSample sample = lab::sampleElasticSpring(chain, spring);
        check(sample.valid, "initial spring sample is valid");
        check(nearlyEqual(sample.stretch, 0.0), "initial spring starts at rest length");
    }
}

void testHookeAndDamping() {
    lab::SpringChain chain = lab::makeVerticalChain(2, {0.0, 0.0}, 1.0, 2.0, 0.1, 100.0, 4.0);
    chain.particles[1].position = {1.2, 0.0};
    lab::SpringSample sample = lab::sampleElasticSpring(chain, chain.springs[0]);
    check(sample.valid, "stretched spring sample is valid");
    check(nearlyEqual(sample.stretch, 0.2), "stretch is distance minus rest length");
    check(nearlyEqual(sample.forceOnFirst.x, 20.0), "Hooke force uses stiffness times stretch");

    chain.particles[1].position = {0.8, 0.0};
    sample = lab::sampleElasticSpring(chain, chain.springs[0]);
    check(nearlyEqual(sample.forceOnFirst.x, -20.0), "compressed spring pushes endpoints apart");

    chain.particles[1].position = {1.0, 0.0};
    chain.particles[1].velocity = {2.0, 3.0};
    sample = lab::sampleDampedSpring(chain, chain.springs[0]);
    check(nearlyEqual(sample.relativeSpeed, 2.0), "damping projects relative velocity onto spring axis");
    check(nearlyEqual(sample.forceOnFirst.x, 8.0), "axial damping contributes c times relative speed");
    check(nearlyEqual(sample.forceOnFirst.y, 0.0), "tangent velocity does not create spring damping");
}

void testForcesAndIntegration() {
    lab::SpringChain pair = lab::makeVerticalChain(2, {0.0, 0.0}, 1.0, 2.0, 0.1, 100.0, 0.0);
    pair.particles[0].inverseMass = 0.5;
    pair.particles[1].position = {1.2, 0.0};
    lab::accumulateElasticForces(pair, {0.0, 0.0}, false);
    const lab::Vec2 internalForce = lab::add(pair.particles[0].force, pair.particles[1].force);
    check(nearlyEqual(internalForce.x, 0.0), "spring applies equal and opposite forces");
    check(nearlyEqual(internalForce.y, 0.0), "internal force sum is zero");

    lab::Particle particle{};
    particle.inverseMass = 0.5;
    particle.force = {4.0, 0.0};
    lab::integrateParticle(particle, 0.5);
    check(nearlyEqual(particle.velocity.x, 1.0), "semi-implicit Euler updates velocity first");
    check(nearlyEqual(particle.position.x, 0.5), "semi-implicit Euler advances with new velocity");

    lab::SpringChain chain = lab::makeVerticalChain(4, {0.0, 2.0}, 0.5, 0.25, 0.1, 120.0, 1.6);
    lab::stepDampedChain(chain, 1.0 / 240.0, {0.0, -9.81}, true);
    check(nearlyEqual(chain.particles.front().position.x, 0.0), "anchor x stays fixed");
    check(nearlyEqual(chain.particles.front().position.y, 2.0), "anchor y stays fixed");
    check(nearlyEqual(lab::measureChain(chain, {0.0, -9.81}, true).anchorError, 0.0), "anchor error stays zero");
}

void testFixedStepsAndDrag() {
    auto countSteps = [](const std::vector<double>& frames) {
        double remainder = 0.0;
        int total = 0;
        for (double frame : frames) {
            const lab::FixedStepPlan plan = lab::planFixedSteps(remainder, frame, 1.0 / 120.0, 16, 0.25);
            remainder = plan.remainder;
            total += plan.steps;
        }
        return total;
    };
    check(countSteps(std::vector<double>(120, 1.0 / 120.0)) == 120, "120 small frames create 120 fixed steps");
    check(countSteps(std::vector<double>(30, 1.0 / 30.0)) == 120, "frame split does not change fixed-step count");

    lab::SpringChain chain = lab::makeVerticalChain(5, {0.0, 2.0}, 0.5, 0.25, 0.1, 120.0, 1.6);
    lab::DragConstraint drag{};
    check(lab::beginDrag(chain, drag, chain.particles[3].position, 0.2), "drag picks a dynamic particle");
    check(drag.particleIndex == 3, "drag selects nearest particle");
    check(lab::moveDrag(chain, drag, {4.0, 2.0}, 0.01, 6.0), "drag moves selected particle");
    check(lab::length(drag.releaseVelocity) <= 6.0 + 1e-12, "release speed is clamped");
    check(lab::endDrag(chain, drag), "drag release succeeds");
    check(lab::length(chain.particles[3].velocity) <= 6.0 + 1e-12, "clamped release velocity reaches particle");
    check(!lab::beginDrag(chain, drag, chain.particles.front().position, 0.05), "fixed anchor cannot be dragged");
}

void testStabilityAndStress() {
    check(nearlyEqual(lab::springStabilityIndex(100.0, 4.0, 0.02), 0.1), "stability index is dt times sqrt k over m");
    lab::SpringChain chain = lab::makeVerticalChain(18, {0.0, 4.0}, 0.42, 0.25, 0.1, 120.0, 1.6);
    chain.particles[10].position.x += 1.2;
    for (int step = 0; step < 4800; ++step) {
        lab::stepDampedChain(chain, 1.0 / 240.0, {0.0, -9.81}, true);
    }
    const lab::ChainMetrics metrics = lab::measureChain(chain, {0.0, -9.81}, true);
    check(metrics.finite, "long spring-chain stress state stays finite");
    check(metrics.anchorError <= 1e-12, "stress run preserves anchor exactly");
    check(metrics.maximumStretch < 0.40, "stress run keeps stretch bounded");
    check(metrics.maximumSpeed < 4.0, "damped stress run keeps speed bounded");
    check(lab::chainWithinSafetyEnvelope(chain, metrics, 0.95, 4.0), "stress run stays inside safety envelope");

    const double equilibriumExtension = (0.25 * 9.81) / 120.0;
    check(nearlyEqual(equilibriumExtension, 0.0204375), "single-mass static extension follows mg over k");
}

} // namespace

int main() {
    testSceneTopology();
    testHookeAndDamping();
    testForcesAndIntegration();
    testFixedStepsAndDrag();
    testStabilityAndStress();

    if (failures != 0) {
        std::cerr << failures << " Project 25 validation check(s) failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 25 validation checks passed.\n";
    return EXIT_SUCCESS;
}
