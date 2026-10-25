#include "benchmark.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;
int checks = 0;

void check(bool condition, std::string_view message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

bool near(double a, double b, double tolerance = 1e-9) {
    return std::abs(a - b) <= tolerance;
}

bool same(lab::Vec2 a, lab::Vec2 b, double tolerance = 1e-9) {
    return near(a.x, b.x, tolerance) && near(a.y, b.y, tolerance);
}

std::vector<std::uint32_t> oracle(const std::vector<lab::Boid>& boids, std::size_t targetIndex, const lab::Params& params) {
    std::vector<std::uint32_t> result;
    const lab::Boid& target = boids.at(targetIndex);
    for (const lab::Boid& other : boids) {
        if (target.id == other.id) {
            continue;
        }
        double distance = std::numeric_limits<double>::infinity();
        // Oracle độc lập: tìm khoảng cách nhỏ nhất trong chín ảnh, không gọi minimumImage.
        for (double x : {-params.width, 0.0, params.width}) {
            for (double y : {-params.height, 0.0, params.height}) {
                distance = std::min(distance, std::hypot(other.position.x + x - target.position.x, other.position.y + y - target.position.y));
            }
        }
        if (distance <= params.radius) {
            result.push_back(other.id);
        }
    }
    std::sort(result.begin(), result.end());
    return result;
}

void testFixtures() {
    lab::Params params{};
    const auto generated = lab::makeFlock(1024, 1U, params);
    check(near(generated[0].position.x, 270369.0 / 4294967296.0 * 960.0), "known xorshift x");
    check(near(generated[0].position.y, 67634689.0 / 4294967296.0 * 600.0), "known xorshift y");
    check(near(lab::wrap(-1, 960), 959), "negative wrap");
    check(lab::wrap(-1e-20, 960) == 0, "sub-ULP negative wrap stays in domain");
    check(near(lab::minimumImage(958, 960), -2), "periodic displacement");
    check(near(lab::minimumImage(480, 960), 480) && near(lab::minimumImage(-480, 960), -480), "half-period antisymmetry");
    check(near(lab::length(lab::limit({1e-10, 0}, 1e-12)), 1e-12, 1e-20), "tiny vector limit");

    const std::vector<lab::Boid> pair{{0, {100, 100}, {}}, {1, {110, 100}, {0, 20}}};
    const auto steering = lab::computeSteering(pair, 0, {1}, params);
    check(same(steering.separation, {-60, 0}), "separation known direction/magnitude");
    check(same(steering.alignment, {0, 60}), "alignment known direction/magnitude");
    check(same(steering.cohesion, {60, 0}), "cohesion known direction/magnitude");
    check(same(steering.acceleration, lab::multiply({-42, 60}, 60.0 / std::hypot(42.0, 60.0))), "weighted sum capped once");
    check(same(lab::computeSteering(pair, 0, {}, params).acceleration, {}), "no neighbors no artificial braking");
    const std::vector<lab::Boid> overlap{{0, {100, 100}, {}}, {1, {100, 100}, {}}};
    const auto a = lab::computeSteering(overlap, 0, {1}, params);
    const auto b = lab::computeSteering(overlap, 1, {0}, params);
    check(same(a.separation, lab::multiply(b.separation, -1)), "overlap anti-pair by ID");
    check(near(lab::length(a.separation), 60), "overlap finite nonzero repulsion");

    params.radius = 5;
    const std::vector<lab::Boid> boundary{{10, {1, 1}, {}}, {20, {4, 5}, {}}, {30, {959, 1}, {}}};
    std::vector<std::size_t> neighbors;
    lab::findNeighbors(boundary, 0, params, neighbors);
    check(neighbors == std::vector<std::size_t>{1, 2}, "inclusive boundary and periodic seam");
    params.radius = 0;
    lab::findNeighbors(overlap, 0, params, neighbors);
    check(neighbors == std::vector<std::size_t>{1}, "radius zero includes other coincident ID only");
}

void testReference() {
    for (std::uint32_t seed : {1U, 7U, 99U}) {
        lab::Params params{};
        const auto boids = lab::makeFlock(48, seed, params);
        for (double radius : {0.0, 5.0, 64.0, 240.0}) {
            params.radius = radius;
            for (std::size_t index = 0; index < boids.size(); ++index) {
                std::vector<std::size_t> neighbors;
                lab::findNeighbors(boids, index, params, neighbors);
                std::vector<std::uint32_t> ids;
                for (std::size_t other : neighbors) {
                    ids.push_back(boids[other].id);
                }
                std::sort(ids.begin(), ids.end());
                check(ids == oracle(boids, index, params), "neighbor IDs match independent nine-image oracle");
            }
        }
    }
}

void testStep() {
    lab::Params params{};
    const auto source = lab::makeFlock(48, 19, params);
    auto reversed = source;
    std::reverse(reversed.begin(), reversed.end());
    std::vector<lab::Boid> forward;
    std::vector<lab::Boid> reverseResult;
    lab::stepBoids(source, forward, params, lab::fixedDt);
    lab::stepBoids(reversed, reverseResult, params, lab::fixedDt);
    std::reverse(reverseResult.begin(), reverseResult.end());
    for (std::size_t index = 0; index < source.size(); ++index) {
        check(forward[index].id == reverseResult[index].id, "stable ID under permutation");
        check(same(forward[index].position, reverseResult[index].position), "position permutation equivariance");
        check(same(forward[index].velocity, reverseResult[index].velocity), "velocity permutation equivariance");
    }
    const auto again = lab::makeFlock(48, 19, params);
    for (std::size_t index = 0; index < source.size(); ++index) {
        check(same(source[index].position, again[index].position), "snapshot was not mutated");
    }
    for (std::size_t count : {256U, 512U, 1024U}) {
        const auto boids = lab::makeFlock(count, 1U, params);
        std::vector<lab::Boid> output;
        const auto metrics = lab::stepBoids(boids, output, params, lab::fixedDt);
        check(output.size() == count && metrics.comparisons == count * (count - 1), "every boid checks every other boid");
        for (const auto& item : output) {
            check(lab::length(item.velocity) <= params.maxSpeed + 1e-9, "speed bound");
            check(std::isfinite(item.position.x) && std::isfinite(item.position.y), "finite full-preset state");
        }
        check(metrics.totalMs >= 0 && std::isfinite(metrics.totalMs), "measured finite timing");
    }
    params.separationWeight = 0;
    params.alignmentWeight = 0;
    params.cohesionWeight = 0;
    for (int steps : {80, 120, 160}) {
        std::vector<lab::Boid> current{{0, {900, 300}, {40, 10}}};
        std::vector<lab::Boid> next;
        for (int index = 0; index < steps; ++index) {
            lab::stepBoids(current, next, params, 2.0 / steps);
            current.swap(next);
        }
        check(same(current[0].position, {20, 320}, 1e-8), "same physical duration across dt sequences");
    }
    for (int steps : {40, 80}) {
        lab::Boid item{0, {100, 100}, {5, 0}};
        const double dt = 1.0 / steps;
        for (int index = 0; index < steps; ++index) {
            item = lab::integrateBoid(item, {2, 0}, params, dt);
        }
        check(near(std::abs(item.position.x - 106), dt), "semi-implicit position error converges against analytic fixture");
    }
}

void testValidationAndBenchmark() {
    lab::Params params{};
    std::vector<lab::Boid> empty;
    bool rejected = false;
    try {
        lab::stepBoids(empty, empty, params, lab::fixedDt);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "in-place buffers are rejected");
    params.radius = 300;
    check(!lab::validParams(params), "invalid radius rejected");
    params = {};
    auto job = lab::createBenchmark(1U, params);
    for (int tick = 0; tick < 27; ++tick) {
        lab::tickBenchmark(job);
    }
    check(!job.active && job.rows.size() == 3, "benchmark finishes after 27 ticks");
    for (const auto& row : job.rows) {
        check(row.samples == 7, "warm-up excluded");
        check(row.comparisons == row.count * (row.count - 1), "benchmark exact all-pairs work");
        check(row.minMs <= row.medianMs && row.medianMs <= row.maxMs, "measured distribution");
        check(row.checksum != 0U, "benchmark consumes every output");
    }
    auto cancelled = lab::createBenchmark(1U, params);
    cancelled.active = false;
    lab::tickBenchmark(cancelled);
    check(cancelled.warmup == 0 && cancelled.rows.empty(), "cancel stops work before next tick");
}
} // namespace

int main() {
    testFixtures();
    testReference();
    testStep();
    testValidationAndBenchmark();
    if (failures != 0) {
        std::cerr << failures << " failures / " << checks << " checks\n";
        return EXIT_FAILURE;
    }
    std::cout << "Boids: " << checks << " checks passed\n";
    return EXIT_SUCCESS;
}
