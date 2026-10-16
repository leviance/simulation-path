#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Explicit checks stay active in Release/NDEBUG and never open an SDL window.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool close(double a, double b, double epsilon = 1e-10) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= epsilon;
}

template <typename Action>
void rejects(Action action, std::string_view label) {
    bool rejected = false;
    try {
        action();
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, label);
}
} // namespace

int main() {
    using namespace ct;
    const auto centre = detectorRay(0, 0.5);
    check(centre.origin == Point{4, 0} && centre.direction == Point{-1, 0} && centre.maximum == 8, "centre geometry at zero");
    const auto corner = detectorRay(pi / 2, 1);
    const auto endpoint = at(corner, corner.maximum);
    check(close(endpoint[0], -4) && close(endpoint[1], -4), "detector endpoint at 90 degrees");
    check(close(dot(corner.direction, corner.direction), 1) && close(corner.maximum, std::sqrt(80.0)), "normalized edge ray and true length");
    const Disk disk{{0, 0}, 1, 0.5};
    const Scene scene{disk};
    check(close(chordLength(centre, disk), 2), "diameter chord");
    check(chordLength({{4, 1}, {-1, 0}, 8}, disk) == 0, "tangent has zero path length");
    check(chordLength({{4, 2}, {-1, 0}, 8}, disk) == 0, "miss");
    check(close(chordLength({{0, 0}, {1, 0}, 8}, disk), 1), "source inside disk");
    check(close(chordLength({{4, 0}, {-1, 0}, 3.5}, disk), 0.5), "finite detector clipping");
    check(chordLength({{4, 0}, {-1, 0}, 2}, disk) == 0, "segment ends before disk");
    check(close(chordLength({{4, 0.6}, {-1, 0}, 8}, disk), 1.6), "independent oblique fixture");
    const auto measurement = measure(centre, scene, 1);
    check(close(measurement.tau, 1) && close(measurement.projection, 1) && close(measurement.ratio, std::exp(-1.0)), "analytic mono centre");
    check(measure(centre, scene, 0).ratio == 1, "zero strength is air");
    check(close(measure(centre, {disk, disk}, 1).projection, 2), "overlap adds optical depth");
    auto layers = makeScene(2);
    const auto original = layers;
    const double before = measure(centre, layers, 1).projection;
    std::reverse(layers.begin(), layers.end());
    check(close(measure(centre, layers, 1).projection, before), "order does not replace material");
    check(original == makeScene(2), "scene factory returns independent data");
    check(audit() < 1e-10, "independent circular phantom oracle");

    const auto first = project(0, scene, 1);
    const auto rotated = project(pi / 3, scene, 1);
    for (int column = 0; column < detectorCount; ++column) {
        check(close(first[column].projection, first[detectorCount - 1 - column].projection), "central phantom detector symmetry");
        check(close(rotated[column].projection, first[column].projection), "central phantom rotational symmetry");
    }
    const Point point{0.65, 0.3};
    check(close(pointOffset(0, point), 8 * 0.3 / 3.35), "point trace worked example");
    check(close(pointOffset(pi / 2, point), -8 * 0.65 / 3.7), "point trace at 90 degrees");
    check(!close(pointOffset(pi, point), -pointOffset(0, point)), "fan beam is not a mirrored half turn");
    for (int row = 0; row < 30; ++row) {
        const double angle = viewAngle(row, 30);
        const double s = pointOffset(angle, point);
        const auto beam = detectorRay(angle, s / detectorWidth + 0.5);
        const auto delta = subtract(point, beam.origin);
        const double cross = delta[0] * beam.direction[1] - delta[1] * beam.direction[0];
        check(close(cross, 0) && dot(delta, beam.direction) > 0 && dot(delta, beam.direction) < beam.maximum, "predicted ray crosses point within segment");
        check(close(pointOffset(angle, {0, 0}), 0), "origin point trace");
        check(close(samplingAngle(row), 0), "nested sampling grids share angles");
        const auto coarse = project(viewAngle(row, 30), original, 1);
        const auto fine = project(viewAngle(row * 4, 120), original, 1);
        for (int column = 0; column < detectorCount; ++column) {
            check(close(coarse[column].projection, fine[column].projection), "same angle same projection across resolutions");
        }
    }

    Settings settings;
    // Đĩa lệch tâm: so đúng cùng 60 độ, không dựa vào đối xứng tròn tại gốc.
    const auto samplingScene = makeScene(1);
    const auto coarse60 = project(viewAngle(5, 30), samplingScene, 1);
    const auto fine60 = project(viewAngle(20, 120), samplingScene, 1);
    for (int column = 0; column < detectorCount; ++column) {
        check(close(coarse60[column].projection, fine60[column].projection), "same 60 degree measurement on nested grids");
    }

    settings.views = 30;
    auto scan = makeScan(settings);
    check(scan.values.size() == 3840 && scan.acquired == 0 && std::isnan(scan.values.front()), "scan starts unmeasured");
    settings.strength = 2;
    check(scan.settings.strength == 1, "scan settings are a snapshot");
    check(advance(scan, 0) == 0 && scan.acquired == 0, "zero budget preserves pause");
    check(acquireOne(scan) && scan.acquired == 1 && std::isfinite(scan.values[127]) && std::isnan(scan.values[128]), "one complete row and unmeasured next row");
    const auto expected = project(0, original, 1);
    check(close(scan.values[64], expected[64].projection), "stored row contains p rather than T");
    check(advance(scan, 2) == 2 && scan.acquired == 3, "bounded acquisition");
    for (int batch = 0; batch < 14; ++batch) {
        advance(scan, 2);
    }
    check(scan.acquired == 30, "finish exactly at last view");
    const auto finished = scan.values;
    check(!acquireOne(scan) && advance(scan, 2) == 0 && scan.values == finished, "completed scan is stable");
    auto fresh = makeScan(settings);
    check(fresh.acquired == 0 && std::isnan(fresh.values[64]), "physical parameter change starts fresh data");
    check(close(viewAngle(29, 30), 348 * pi / 180), "half open angular range");

    rejects([&] {
        advance(scan, 3);
    },
            "excessive budget rejected");
    rejects([&] {
        advance(scan, -1);
    },
            "negative budget rejected");
    rejects([] {
        (void)viewAngle(30, 30);
    },
            "duplicate 360 degree row rejected");
    rejects([] {
        (void)makeScan({2, 1000000, 1});
    },
            "huge allocation rejected before construction");
    rejects([] {
        (void)detectorRay(0, -0.01);
    },
            "invalid detector u rejected");
    rejects([] {
        (void)pointOffset(0, {2, 0});
    },
            "trace bounds checked");
    rejects([&] {
        (void)measure({{4, 0}, {-2, 0}, 8}, scene, 1);
    },
            "nonunit direction rejected");
    rejects([&] {
        (void)measure(centre, {{{0, 0}, 2, 0.5}}, 1);
    },
            "unsupported phantom rejected");
    for (double value : {-1.0, 3.0, std::numeric_limits<double>::infinity(), std::numeric_limits<double>::quiet_NaN()}) {
        rejects([&] {
            (void)measure(centre, scene, value);
        },
                "invalid strength rejected");
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "CT sinogram tests passed\n";
    return EXIT_SUCCESS;
}
