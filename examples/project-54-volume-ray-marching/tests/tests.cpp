#include "reference.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Explicit checks are retained in Release/NDEBUG builds.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool closeEnough(double a, double b, double tolerance = 1e-10) {
    return std::isfinite(a) && std::abs(a - b) <= tolerance;
}
} // namespace

int main() {
    using namespace fog;
    const Ray front{{0, 0, -8}, {0, 0, 1}};
    const auto interval = boxInterval(front);
    check(interval && closeEnough(interval->entry, 5.6) && closeEnough(interval->exit, 10.4), "ray box entry/exit");
    const auto inside = boxInterval({{0, 0, 0}, {0, 0, 1}});
    check(inside && inside->entry == 0 && closeEnough(inside->exit, 2.4), "inside starts at origin, not surface exit");
    check(!boxInterval({{2, 0, -8}, {0, 0, 1}}), "parallel outside miss");
    check(boxInterval({{1.6, 0, -8}, {0, 0, 1}}).has_value(), "parallel boundary accepted");
    bool nonunitRejected = false;
    try {
        (void)boxInterval({{0, 0, -8}, {0, 0, 2}});
    } catch (const std::invalid_argument&) {
        nonunitRejected = true;
    }
    check(nonunitRejected, "unit ray required for world step");

    Volume volume;
    fillVolume(volume, 2);
    check(volume.density.size() * sizeof(float) == 480 * 1024, "R32F byte count");
    check(volume.index(63, 47, 39) == volume.density.size() - 1, "x-fast layout");
    check(closeEnough(sampleDensity(volume, boxMinimum), 0.25), "edge clamp matches texture convention");
    check(closeEnough(sampleDensity(volume, boxMaximum), 0.25), "upper edge sample");
    check(closeEnough(segmentAlpha(0.25, 2, 0.1), 1 - std::exp(-0.05)), "Beer Lambert segment");
    for (double step : {0.02, 0.04, 0.08, 0.17, 0.25}) {
        Settings settings;
        settings.stepLength = step;
        settings.early = false;
        const auto result = march(front, volume, settings);
        const double expectedT = std::exp(-2 * 0.25 * 4.8);
        check(closeEnough(result.transmittance, expectedT), "constant medium step invariant");
        check(result.samples == static_cast<int>(std::ceil((interval->exit - interval->entry) / step)), "tail sample included");
        const auto color = transfer(0.25, true);
        for (int axis = 0; axis < 3; ++axis) {
            check(closeEnough(result.color[axis], color[axis] * (1 - expectedT)), "front-to-back analytic color");
        }
    }

    Settings transparent;
    transparent.sigma = 0;
    const auto zero = march(front, volume, transparent);
    check(zero.transmittance == 1 && zero.color == Point{0, 0, 0}, "zero extinction stays transparent");
    const auto miss = march({{2, 0, -8}, {0, 0, 1}}, volume, {});
    check(miss.samples == 0 && miss.transmittance == 1, "miss does not sample");
    volume.density.assign(volume.density.size(), 1);
    Settings dense;
    dense.sigma = 8;
    const auto full = march(front, volume, dense);
    dense.early = true;
    const auto early = march(front, volume, dense);
    check(early.samples < full.samples && early.transmittance <= stopThreshold, "early termination reduces work");
    check(std::abs(early.transmittance - full.transmittance) <= stopThreshold, "early T error bound");
    for (int axis = 0; axis < 3; ++axis) {
        check(std::abs(early.color[axis] - full.color[axis]) <= stopThreshold, "bounded transfer color error");
    }

    for (double sigma : {-1.0, 9.0, std::numeric_limits<double>::quiet_NaN()}) {
        Settings invalid;
        invalid.sigma = sigma;
        bool rejected = false;
        try {
            (void)march(front, volume, invalid);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "invalid sigma rejected");
    }
    Settings invalid;
    invalid.stepLength = 0.001;
    bool rejected = false;
    try {
        (void)march(front, volume, invalid);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "unbounded quality request rejected");

    fillVolume(volume, 1);
    const auto old = volume.density;
    const auto fine = march(front, volume, {2, 0.02, true, false});
    const auto coarse = march(front, volume, {2, 0.16, true, false});
    check(std::abs(fine.transmittance - coarse.transmittance) < 0.001, "ramp step convergence fixture");
    check(volume.density == old, "render never mutates density");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Volume marching tests passed\n";
    return EXIT_SUCCESS;
}
