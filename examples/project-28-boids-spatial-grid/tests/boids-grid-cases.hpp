#pragma once
#include "grid/benchmark.hpp"
#include "grid/validation.hpp"
#include <iostream>
#include <limits>
#include <set>
#include <string_view>

namespace grid_tests {
extern int checks;
extern int failures;
void check(bool condition, std::string_view message);

inline std::vector<std::uint32_t> oracle(const std::vector<lab::Boid>& flock, std::size_t index, const lab::Params& params) {
    std::vector<std::uint32_t> ids;
    const auto& target = flock.at(index);
    for (const auto& other : flock) {
        if (other.id == target.id) {
            continue;
        }
        double distance = std::numeric_limits<double>::infinity();
        for (double dx : {-params.width, 0.0, params.width}) {
            for (double dy : {-params.height, 0.0, params.height}) {
                distance = std::min(distance, std::hypot(other.position.x + dx - target.position.x, other.position.y + dy - target.position.y));
            }
        }
        if (distance <= params.radius) {
            ids.push_back(other.id);
        }
    }
    std::sort(ids.begin(), ids.end());
    return ids;
}

inline void finish(lab::StepJob& job, std::size_t batch = 10000) {
    for (int tick = 0; tick < 10001; ++tick) {
        if (lab::advanceStep(job, batch, 1000)) {
            return;
        }
    }
    throw std::runtime_error("Step exceeded finite test budget");
}

inline void sameState(const std::vector<lab::Boid>& actual, const std::vector<lab::Boid>& expected) {
    check(actual.size() == expected.size(), "same state count");
    for (std::size_t index = 0; index < std::min(actual.size(), expected.size()); ++index) {
        check(actual[index].id == expected[index].id, "stable IDs");
        check(lab::nearVector(actual[index].position, expected[index].position), "position tolerance 1e-9");
        check(lab::nearVector(actual[index].velocity, expected[index].velocity), "velocity tolerance 1e-9");
    }
}

inline int run() {
    lab::Params params{};
    const auto geometry = lab::gridGeometry(params, 100);
    check(geometry.columns == 10 && geometry.rows == 6, "partial final cell");
    check(lab::gridAddress({-1, -1}, geometry) == 59, "negative address wraps");
    check(lab::gridAddress({960, 600}, geometry) == 0, "upper edge wraps");
    auto tiny = params;
    tiny.width = 1e-320;
    tiny.height = 1e-320;
    tiny.radius = 0;
    const auto tinyGrid = lab::gridGeometry(tiny, 1e6);
    check(tinyGrid.columns == 1 && tinyGrid.rows == 1, "tiny ratio underflow still has one bucket");
    check(lab::axisCells(0, 0, 1e-320, 1e6) == std::vector<std::size_t>{0}, "tiny periodic axis");
    auto cells = lab::axisCells(0, 64, 960, 100);
    std::sort(cells.begin(), cells.end());
    check(cells == std::vector<std::size_t>{0, 8, 9}, "partial final cell across seam");
    bool rejected = false;
    try {
        auto invalid = params;
        invalid.width = 1e6;
        invalid.height = 1e6;
        static_cast<void>(lab::gridGeometry(invalid, 4));
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "allocation budget before creating buckets");
    std::vector<lab::Boid> fixture{{0, {0, 0}, {}}, {1, {959, 599}, {}}, {2, {896, 0}, {}}, {3, {64, 0}, {}}, {4, {0, 0}, {}}, {5, {100, 100}, {}}};
    for (double radius : {0.0, 16.0, 64.0, 100.0, 240.0, 299.0}) {
        params.radius = radius;
        for (double size : {16.0, 64.0, 100.0, 240.0, 1000.0}) {
            const auto grid = lab::buildGrid(fixture, params, size);
            for (std::size_t index = 0; index < fixture.size(); ++index) {
                lab::GridQuery query;
                lab::queryGrid(fixture, index, params, grid, query);
                std::vector<std::uint32_t> ids;
                for (std::size_t neighbor : query.neighbors) {
                    ids.push_back(fixture[neighbor].id);
                }
                std::sort(ids.begin(), ids.end());
                check(ids == oracle(fixture, index, params), "neighbor IDs match nine-image oracle");
                check(std::set<std::size_t>(query.cells.begin(), query.cells.end()).size() == query.cells.size(), "no duplicate cells");
                check(std::set<std::size_t>(query.candidates.begin(), query.candidates.end()).size() == query.candidates.size(), "no duplicate candidates");
            }
        }
    }
    params = {};
    for (auto layout : {lab::Layout::Uniform, lab::Layout::Clustered, lab::Layout::Dense}) {
        const auto flock = lab::makeDataset(256, 123, params, layout);
        auto brute = lab::createStep(flock, params, 64, lab::Method::Brute);
        finish(brute);
        for (double size : {16.0, 64.0, 100.0, 240.0}) {
            const auto grid = lab::buildGrid(flock, params, size);
            std::vector<int> inserted(flock.size());
            for (std::size_t cell = 0; cell < grid.buckets.size(); ++cell) {
                for (std::size_t index : grid.buckets[cell]) {
                    ++inserted.at(index);
                    check(lab::gridAddress(flock[index].position, grid) == cell, "correct bucket address");
                }
            }
            for (int times : inserted) {
                check(times == 1, "insert exactly once");
            }
            auto step = lab::createStep(flock, params, size, lab::Method::Grid);
            finish(step, 7);
            sameState(step.output, brute.output);
            auto validation = lab::createValidation(flock, params, size);
            for (int tick = 0; tick < 1000 && validation.active; ++tick) {
                lab::tickValidation(validation);
            }
            check(!validation.active && validation.checked == flock.size() && validation.failures == 0, "all-agent steering and state validation");
            sameState(step.snapshot, flock);
        }
    }
    const auto large = lab::makeDataset(10000, 1, params, lab::Layout::Uniform);
    auto step = lab::createStep(large, params, 64, lab::Method::Grid);
    finish(step, 128);
    check(step.output.size() == 10000 && step.nextIndex == 10000, "10000 full updates");
    for (std::size_t index = 0; index < large.size(); ++index) {
        check(step.output[index].id == large[index].id && !lab::nearVector(step.output[index].position, large[index].position), "every agent moves");
    }
    auto cancelled = lab::createStep(fixture, params, 64, lab::Method::Grid);
    lab::advanceStep(cancelled, 1);
    lab::cancelStep(cancelled);
    check(!lab::advanceStep(cancelled) && !lab::stepComplete(cancelled) && cancelled.output.empty(), "cancel cannot commit partial result");
    const auto dense = lab::makeDataset(1024, 1, params, lab::Layout::Dense);
    auto denseStep = lab::createStep(dense, params, 64, lab::Method::Grid);
    finish(denseStep);
    check(denseStep.metrics.neighbors == 1024 * 1023, "dense neighbors not capped");
    std::cout << "Boids Grid native: " << checks << " checks, " << failures << " failures\n";
    return failures == 0 ? 0 : 1;
}
} // namespace grid_tests
