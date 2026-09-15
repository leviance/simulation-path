#include "dynamics.hpp"

#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;

// Không dùng assert: các phép kiểm vẫn phải chạy khi build Release có NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(double a, double b, double tolerance = 1.0e-9) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= tolerance;
}

void testWrap() {
    check(near(pbc::wrapCoordinate(-0.25, 12.0), 11.75), "negative coordinate");
    check(near(pbc::wrapCoordinate(12.0, 12.0), 0.0), "upper endpoint maps to zero");
    check(near(pbc::wrapCoordinate(36.25, 12.0), 0.25), "multiple positive crossings");
    check(near(pbc::wrapCoordinate(-36.25, 12.0), 11.75), "multiple negative crossings");
    check(!std::isfinite(pbc::wrapCoordinate(1.0, 0.0)), "zero box rejected");
    check(!std::isfinite(pbc::wrapCoordinate(std::numeric_limits<double>::infinity(), 12.0)), "infinite input rejected");
    for (int step = -200; step <= 200; ++step) {
        const double x = step * 0.37;
        const double wrapped = pbc::wrapCoordinate(x, 7.3);
        check(wrapped >= 0.0 && wrapped < 7.3, "half-open interval");
        check(near(pbc::wrapCoordinate(wrapped, 7.3), wrapped), "wrap idempotence");
        check(near(pbc::wrapCoordinate(x + 3.0 * 7.3, 7.3), wrapped), "integer box translation");
    }
}

void testMinimumImage() {
    const pbc::Box box{12.0, 8.0};
    const pbc::Vec2 delta = pbc::minimumImage({10.8, -7.5}, box);
    check(near(delta.x, -1.2) && near(delta.y, 0.5), "both axes choose nearest image");
    check(near(pbc::minimumComponent(6.0, 12.0), -6.0), "half-box tie convention");
    check(near(pbc::minimumComponent(-6.0, 12.0), -6.0), "negative half-box tie");
    // Oracle độc lập: thử khoảng cách của chín ảnh, không gọi minimumImage trong oracle.
    for (int ix = -11; ix <= 11; ++ix) {
        for (int iy = -7; iy <= 7; ++iy) {
            const pbc::Vec2 raw{double(ix), double(iy)};
            double nearest = std::numeric_limits<double>::infinity();
            for (int imageY = -1; imageY <= 1; ++imageY) {
                for (int imageX = -1; imageX <= 1; ++imageX) {
                    nearest = std::min(nearest, pbc::length({raw.x + imageX * box.width, raw.y + imageY * box.height}));
                }
            }
            check(near(pbc::length(pbc::minimumImage(raw, box)), nearest), "nine-image oracle");
        }
    }
}

void testForces() {
    pbc::System system = pbc::makePair();
    const pbc::Evaluation reference = pbc::evaluate(system);
    check(reference.valid && reference.evaluatedPairs == 1 && reference.activePairs == 1, "one active pair across seam");
    check(reference.forces[0].x < 0.0, "attraction goes across the seam");
    check(near(pbc::length(pbc::add(reference.forces[0], reference.forces[1])), 0.0), "equal and opposite forces");
    const double h = 1.0e-5;
    pbc::System plus = system;
    pbc::System minus = system;
    plus.particles[0].position.x += h;
    minus.particles[0].position.x -= h;
    const double numericalForce = -(pbc::evaluate(plus).potential - pbc::evaluate(minus).potential) / (2.0 * h);
    check(near(numericalForce, reference.forces[0].x, 1.0e-6), "force is minus position gradient");
    for (pbc::Particle& particle : system.particles) {
        particle.position = pbc::wrapPosition(pbc::add(particle.position, {7.1, -2.3}), system.box);
    }
    const pbc::Evaluation translated = pbc::evaluate(system);
    check(near(translated.potential, reference.potential), "energy invariant under translation and wrap");
    check(near(translated.forces[0].x, reference.forces[0].x), "force invariant under translation and wrap");
    system.parameters.cutoff = 6.0;
    check(!pbc::evaluate(system).valid, "half-box cutoff rejected");
    system.parameters.cutoff = 2.5;
    system.particles[1].position = pbc::add(system.particles[0].position, {12.0, 0.0});
    check(!pbc::evaluate(system).valid, "periodic overlap rejected");
    const pbc::PairSample edge = pbc::shiftedPair(2.5, system.parameters);
    const pbc::PairSample inside = pbc::shiftedPair(2.5 - 1.0e-8, system.parameters);
    check(near(edge.potential, 0.0) && near(edge.slope, 0.0), "cutoff zero value and slope");
    check(std::abs(inside.potential) < 1.0e-8 && std::abs(inside.slope) < 1.0e-8, "continuous cutoff");
}

void testUnwrappedAndTransaction() {
    pbc::System free = pbc::makePair();
    free.particles.resize(1);
    free.particles[0].velocity = {-35000.0, 26000.0};
    const pbc::Vec2 initial = free.particles[0].position;
    const pbc::Vec2 velocity = free.particles[0].velocity;
    for (int step = 0; step < 40; ++step) {
        check(pbc::verletStep(free, 0.001), "free step across several boxes");
        const pbc::Particle& particle = free.particles[0];
        check(near(particle.velocity.x, velocity.x) && near(particle.velocity.y, velocity.y), "no velocity reflection");
        const pbc::Vec2 wrapped = pbc::wrapPosition(particle.unwrapped, free.box);
        check(near(wrapped.x, particle.position.x) && near(wrapped.y, particle.position.y), "wrapped/unwrapped invariant");
    }
    check(near(free.particles[0].unwrapped.x, initial.x + velocity.x * free.elapsed), "unwrapped measures actual displacement");
    pbc::System collision = pbc::makePair();
    collision.particles[0].position = {1.0, 6.0};
    collision.particles[1].position = {4.0, 6.0};
    collision.particles[0].velocity = {1500.0, 0.0};
    collision.particles[1].velocity = {-1500.0, 0.0};
    const pbc::System before = collision;
    check(!pbc::verletStep(collision, 0.001), "new overlap rejects full step");
    check(near(collision.particles[0].position.x, before.particles[0].position.x), "rollback position");
    check(near(collision.particles[0].velocity.x, before.particles[0].velocity.x), "rollback velocity");
    check(near(collision.particles[0].unwrapped.x, before.particles[0].unwrapped.x), "rollback unwrapped");
    check(near(collision.elapsed, 0.0), "rollback time");
    check(!pbc::verletStep(free, 0.0) && !pbc::verletStep(free, 1.0), "invalid dt rejected");
}

void testGasAndSeamCrossing() {
    const pbc::System gas = pbc::makeGas(1000);
    const pbc::Evaluation evaluation = pbc::evaluate(gas);
    check(evaluation.valid && evaluation.evaluatedPairs == 499500, "1000 real particles, not their images");
    check(pbc::length(pbc::momentum(gas)) < 1.0e-9, "initial momentum removed once");
    const pbc::System repeat = pbc::makeGas(1000);
    check(near(gas.particles[12].velocity.x, repeat.particles[12].velocity.x), "deterministic seed");
    check(pbc::imagePositions(gas.particles[0].position, gas.box).size() == 9, "nine display images");
    check(gas.particles.size() == 1000, "images do not append state");
    check(pbc::validateRun().passed, "bounded gas energy and momentum validation");
    pbc::System pair = pbc::makePair();
    for (pbc::Particle& particle : pair.particles) {
        particle.position = pbc::wrapPosition(pbc::add(particle.position, {0.0, -5.9}), pair.box);
        particle.unwrapped = particle.position;
        particle.velocity = {0.0, -1.0};
    }
    const double initialEnergy = pbc::kineticEnergy(pair) + pbc::evaluate(pair).potential;
    const pbc::Vec2 initialMomentum = pbc::momentum(pair);
    bool crossed = false;
    double maximumError = 0.0;
    for (int step = 0; step < 300; ++step) {
        check(pbc::verletStep(pair, 0.001), "interacting pair step");
        crossed = crossed || pair.particles[0].unwrapped.y < 0.0;
        const double energy = pbc::kineticEnergy(pair) + pbc::evaluate(pair).potential;
        maximumError = std::max(maximumError, std::abs(energy - initialEnergy) / std::max(1.0, std::abs(initialEnergy)));
    }
    check(crossed && pair.particles[0].position.y > 11.0, "interacting pair really crosses a seam");
    check(maximumError < 0.01, "energy remains stable during seam crossing");
    check(pbc::length(pbc::subtract(pbc::momentum(pair), initialMomentum)) < 1.0e-9, "momentum conserved through seam");
}

} // namespace

int main() {
    testWrap();
    testMinimumImage();
    testForces();
    testUnwrappedAndTransaction();
    testGasAndSeamCrossing();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "All periodic molecular box tests passed.\n";
    return EXIT_SUCCESS;
}
