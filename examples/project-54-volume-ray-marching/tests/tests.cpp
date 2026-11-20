#include "reference.hpp"
#include <cstdlib>
#include <iostream>
#include <numeric>
#include <string_view>

using namespace volume54;

namespace {
int checks = 0;
int failures = 0;

// [snippet active-check]
void check(bool condition, std::string_view reason) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << reason << '\n';
    }
}

// [/snippet active-check]
void close(double actual, double expected, double tolerance, const char* reason) {
    check(std::isfinite(actual) && std::abs(actual - expected) <= tolerance, reason);
}

template <class Operation>
void rejects(Operation operation, const char* reason) {
    bool rejected = false;
    try {
        operation();
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, reason);
}
} // namespace

int main() {
    // [snippet box-oracle]
    const Ray front{{0, 0, 3}, {0, 0, -1}};
    const auto hit = boxInterval(front).value();
    close(hit.entry, 2, 0, "front entry");
    close(hit.exit, 4, 0, "front exit");
    close(boxInterval({{0, 0, 0}, {1, 0, 0}})->entry, 0, 0, "camera inside starts at zero");
    close(boxInterval({{0, 0, 0}, {1, 0, 0}})->exit, 1, 0, "inside exit");
    // [/snippet box-oracle]
    check(!boxInterval({{2, 0, 3}, {0, 0, -1}}), "parallel outside slab is miss");
    check(boxInterval({{1, 0, 3}, {0, 0, -1}}).has_value(), "parallel on face is accepted");
    check(!boxInterval({{0, 0, 3}, {0, 0, 1}}), "box behind eye is miss");
    check(!boxInterval({{1, 0, 0}, {1, 0, 0}}), "outward boundary ray has no positive segment");
    close(boxInterval({{1, 0, 0}, {-1, 0, 0}})->exit, 2, 0, "inward boundary ray");
    rejects([] {
        boxInterval({{0, 0, 3}, {0, 0, -2}});
    },
            "reject nonunit ray");
    rejects([] {
        boxInterval({{NAN, 0, 3}, {0, 0, -1}});
    },
            "reject nonfinite ray");
    const auto diagonal = boxInterval({{-3, -3, -3}, unit({1, 1, 1})}).value();
    close(diagonal.exit - diagonal.entry, std::sqrt(12.0), 1e-12, "diagonal length");
    check(std::ceil((diagonal.exit - diagonal.entry) / 0.008) <= maxSteps, "minimum UI step fits complete box diagonal");

    for (double yaw : {-1.3, 0.0, 1.1}) {
        Camera camera;
        camera.yaw = yaw;
        const Basis basis = cameraBasis(camera);
        const Ray centreRay = cameraRay(camera, 0.5, 0.5, 1.7);
        close(dot(centreRay.direction, centreRay.direction), 1, 1e-12, "unit perspective ray");
        close(dot(basis.up, basis.right), 0, 1e-12, "orthogonal basis");
        close(dot(centreRay.direction, basis.forward), 1, 1e-12, "central ray matches forward");
        check(dot(cameraRay(camera, 0.5, 0, 1.7).direction, basis.up) > 0, "CPU v increases downwards");
        camera.inside = true;
        close(dot(cameraBasis(camera).origin, cameraBasis(camera).origin), 0, 0, "inside eye is actual origin");
        close(dot(cameraBasis(camera).forward, basis.forward), 1, 1e-12, "inside still obeys camera yaw/pitch");
    }
    rejects([] {
        cameraRay({}, 0.5, 0.5, 0);
    },
            "reject zero aspect");
    Camera invalidCamera;
    invalidCamera.yaw = NAN;
    rejects([&] {
        cameraBasis(invalidCamera);
    },
            "reject NaN camera");
    rejects([] {
        Volume invalid(0);
    },
            "reject zero allocation");
    rejects([] {
        Volume invalid(129);
    },
            "reject oversized allocation before multiplying");
    rejects([] {
        buildVolume(static_cast<Preset>(99), 64);
    },
            "reject unknown preset");

    Volume fixture(2);
    for (int z = 0; z < 2; ++z)
        for (int y = 0; y < 2; ++y)
            for (int x = 0; x < 2; ++x) {
                const int address = x + 2 * y + 4 * z;
                fixture.set(x, y, z, address / 8.0);
                check(fixture.index(x, y, z) == static_cast<std::size_t>(address), "x-fastest address from independent formula");
                close(sampleDensity(fixture, fixture.centre(x, y, z)), address / 8.0, 0, "exact stored centre");
                close(sampleDensity(fixture, {-1.0 + 2 * x, -1.0 + 2 * y, -1.0 + 2 * z}), address / 8.0, 0, "eight physical corners replicate edge");
            }
    close(sampleDensity(fixture, {0, 0, 0}), 0.4375, 0, "known eight-voxel midpoint");
    close(sampleDensity(fixture, {0.1, -0.2, 0.25}), 0.525, 1e-14, "independent affine interpolation");
    close(sampleDensity(fixture, {-100, -100, -100}), 0, 0, "direct texture sampler clamps outside, ray interval does not");
    rejects([&] {
        fixture.index(-1, 0, 0);
    },
            "negative index rejected before unsigned cast");
    rejects([&] {
        fixture.set(0, 0, 0, 1.1);
    },
            "reject out-of-range density");
    rejects([&] {
        sampleDensity(fixture, {NAN, 0, 0});
    },
            "reject nonfinite texture coordinates");
    for (int side : {64, 128}) {
        const Volume volume = buildVolume(Preset::Cores, side);
        check(volume.values().size() == static_cast<std::size_t>(side) * side * side, "actual full volume allocation");
        check(volume.values().size() * sizeof(float) == static_cast<std::size_t>(side) * side * side * 4, "actual R32F bytes");
        close(volume.spacing() * side, 2, 0, "world extent does not change with N");
        const auto bins = histogram(volume);
        check(std::accumulate(bins.begin(), bins.end(), std::size_t{0}) == volume.values().size(), "histogram covers every stored voxel");
        for (float value : volume.values())
            check(std::isfinite(value) && value >= 0 && value <= 1, "all stored densities finite and bounded");
    }

    const Volume constant = buildVolume(Preset::Constant, 128);
    Settings white;
    white.palette = 2;
    white.lighting = false;
    white.sigma = 2;
    // [snippet constant-oracle]
    for (Mode mode : {Mode::Mip, Mode::Average, Mode::Alpha}) {
        for (double step : {0.008, 0.02, 0.04, 0.13, 0.16}) {
            Settings settings = white;
            settings.mode = mode;
            settings.stepLength = step;
            const Result result = march(front, constant, settings, true);
            close(result.maximum, 0.25, 0, "constant MIP");
            close(result.mean, 0.25, 1e-14, "constant length-weighted average");
            double covered = 0;
            for (const Sample& sample : result.profile)
                covered += sample.ds;
            close(covered, 2, 1e-13, "partial tail preserves full path length");
            if (mode == Mode::Alpha) {
                const double expectedT = std::exp(-2 * 0.25 * 2);
                close(result.transmittance, expectedT, 1e-13, "constant analytic transmittance");
                close(result.color.x, 1 - expectedT, 1e-13, "constant premultiplied emission");
            }
        }
    }
    // [/snippet constant-oracle]
    const Volume slab = buildVolume(Preset::Slab, 128);
    const double rho = static_cast<double>(static_cast<float>(0.65));
    white.stepLength = 1.0 / 64;
    const Result slabResult = march(front, slab, white, true);
    close(slabResult.maximum, rho, 0, "known slab maximum");
    close(slabResult.mean, rho * 0.75 / 2, 1e-13, "known slab length-weighted average");
    close(slabResult.transmittance, std::exp(-2 * rho * 0.75), 1e-13, "analytic integral includes trilinear slab boundary ramps");
    Settings zero = white;
    zero.sigma = 0;
    close(march(front, constant, zero).transmittance, 1, 0, "zero sigma is transparent");
    close(dot(march(front, constant, zero).color, march(front, constant, zero).color), 0, 0, "zero sigma emits no color");
    for (Mode mode : {Mode::Mip, Mode::Average, Mode::Alpha}) {
        Settings settings = white;
        settings.mode = mode;
        const Result miss = march({{2, 0, 3}, {0, 0, -1}}, constant, settings);
        check(miss.samples == 0 && miss.maximum == 0 && miss.mean == 0 && miss.transmittance == 1, "miss samples nothing in every mode");
        const Result empty = march(front, buildVolume(Preset::Empty, 8), settings);
        check(empty.maximum == 0 && empty.mean == 0 && empty.transmittance == 1 && dot(empty.color, empty.color) == 0, "empty volume stays empty in every mode");
    }
    Volume layers(32);
    Volume dense(32);
    for (int z = 0; z < 32; ++z)
        for (int y = 0; y < 32; ++y)
            for (int x = 0; x < 32; ++x) {
                double density = 0.2;
                if (z >= 16)
                    density = 0.8;
                layers.set(x, y, z, density);
                dense.set(x, y, z, 1);
            }
    Settings colored;
    colored.lighting = false;
    const Result forward = march(front, layers, colored);
    const Result backward = march({{0, 0, -3}, {0, 0, 1}}, layers, colored);
    close(forward.transmittance, backward.transmittance, 1e-12, "T does not depend on layer order");
    check(dot(forward.color - backward.color, forward.color - backward.color) > 1e-4, "colored front-to-back emission does depend on layer order");
    Settings full = colored;
    full.sigma = 12;
    const Result all = march(front, dense, full);
    full.early = true;
    const Result early = march(front, dense, full);
    check(early.samples < all.samples, "alpha early termination reduces actual samples");
    check(early.transmittance <= stopThreshold, "early stop obeys threshold");
    for (int channel = 0; channel < 3; ++channel)
        close(early.color[channel], all.color[channel], stopThreshold, "bounded color error from early stop");
    for (Mode mode : {Mode::Mip, Mode::Average}) {
        full.mode = mode;
        check(march(front, dense, full).samples == static_cast<int>(std::ceil(2 / full.stepLength)), "projection modes never apply alpha early stop");
    }
    for (double invalid : std::array<double, 4>{0.0, 0.001, 0.17, std::numeric_limits<double>::quiet_NaN()}) {
        Settings settings;
        settings.stepLength = invalid;
        rejects([&] {
            march(front, constant, settings);
        },
                "invalid step rejected, not silently clamped");
    }
    rejects([&] {
        integrate(front, constant, white, 1e-300, 4096, false);
    },
            "sample budget checked before integer cast");
    rejects([] {
        segmentAlpha(1, 1, 0);
    },
            "zero segment rejected");
    // Cross-language fixtures: these are raw trilinear scalars from the TypeScript reference.
    const Volume cloud = buildVolume(Preset::Cloud, 128);
    close(sampleDensity(cloud, {-0.25, 0.26, 0.12}), 0.7407203266739844, 1e-7, "near tower core matches independent TypeScript implementation");
    close(sampleDensity(cloud, {0.96, 0.55, -0.04}), 0.10357848962932865, 1e-7, "thin downwind anvil tip matches independent TypeScript implementation");
    close(sampleDensity(cloud, {0, 0, 0}), 0, 0, "cloud passage really contains empty scalar data");
    const Ray towerRay = cameraRay({}, 0.5, 0.5, 16.0 / 9);
    check(sampleDensity(cloud, rayAt(towerRay, 2.65)) > 0.45, "central probe crosses the near bank");
    close(sampleDensity(cloud, rayAt(towerRay, 3.00)), 0, 0, "central probe passes through actual air");
    check(sampleDensity(cloud, rayAt(towerRay, 3.36)) > 0.45, "central probe enters a second bank");
    std::cout << "Project 54: " << checks << " checks, " << failures << " failures\n";
    if (failures != 0)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
