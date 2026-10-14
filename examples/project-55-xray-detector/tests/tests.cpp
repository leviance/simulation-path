#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Explicit checks remain active in Release; no assert/NDEBUG shortcut.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool close(double a, double b, double epsilon = 1e-10) {
    return std::isfinite(a) && std::abs(a - b) <= epsilon;
}
} // namespace

int main() {
    using namespace xray;
    const auto centre = detectorRay(0.5, 0.5);
    check(centre.origin == Point{0, 0, -6} && centre.direction == Point{0, 0, 1} && centre.maximum == 12, "source-detector centre");
    const auto corner = detectorRay(1, 0);
    check(close(dot(corner.direction, corner.direction), 1) && close(at(corner, corner.maximum)[0], 3) && close(at(corner, corner.maximum)[1], 2.25), "normalized corner ray");
    const Material slab{{-1, -1, -0.55}, {1, 1, 0.55}, 0.55, 0.18};
    const Scene scene{slab};
    const auto interval = boxInterval(centre, slab.minimum, slab.maximum);
    check(interval && close(interval->exit - interval->entry, 1.1), "centre slab thickness");
    check(close(materialLength({{0, 0, 0}, {0, 0, 1}, 12}, slab), 0.55), "source inside");
    check(close(materialLength({{0, 0, -6}, {0, 0, 1}, 5.7}, slab), 0.25), "detector clips finite segment");
    check(materialLength({{2, 0, -6}, {0, 0, 1}, 12}, slab) == 0, "parallel miss");
    Settings settings;
    auto imageSettings = settings;
    imageSettings.exposure *= 2;
    check(!imageChanged(settings, imageSettings), "exposure does not invalidate normalized image");
    check(!imageChanged(settings, settings), "unchanged settings keep cached image");
    imageSettings.angle = 0.1;
    check(imageChanged(settings, imageSettings), "object angle invalidates image");
    imageSettings = settings;
    imageSettings.numeric = true;
    check(imageChanged(settings, imageSettings), "solver change invalidates image");
    const auto result = measure(centre, scene, settings);
    check(close(result.depth.low, 0.605) && close(result.ratio, std::exp(-0.605)) && close(result.logProjection, 0.605), "independent analytic Beer Lambert");
    settings.exposure = 20000;
    check(close(measure(centre, scene, settings).ratio, result.ratio) && close(measure(centre, scene, settings).intensity, 2 * result.intensity), "flat field exposure invariant");
    settings.strength = 0;
    check(measure(centre, scene, settings).ratio == 1, "zero strength");
    settings = {};
    auto doubled = scene;
    doubled.push_back(slab);
    check(close(measure(centre, doubled, settings).depth.low, 1.21), "overlap is additive");
    const auto layers = makeScene(1);
    auto reversed = layers;
    std::reverse(reversed.begin(), reversed.end());
    check(close(measure(centre, layers, settings).ratio, measure(centre, reversed, settings).ratio), "layer order invariant");
    const auto oblique = detectorRay(0.65, 0.5);
    const double expectedLength = 1.1 / oblique.direction[2];
    check(close(materialLength(oblique, slab), expectedLength), "oblique slab chord");
    const auto old = layers;
    settings.numeric = true;
    settings.stepLength = 0.11;
    const auto numeric = measure(oblique, layers, settings);
    settings.numeric = false;
    double sumMu = 0;
    for (const auto& m : layers) {
        sumMu += m.muLow;
    }
    check(std::abs(numeric.depth.low - measure(oblique, layers, settings).depth.low) <= 2 * 0.11 * sumMu + 1e-12, "midpoint edge error bound");
    check(close(audit(), 0.055), "bounded audit matches independent boundary fixture");
    settings.spectral = true;
    settings.lowWeight = 1;
    check(close(measure(centre, scene, settings).ratio, std::exp(-0.605)), "low spectrum endpoint");
    settings.lowWeight = 0;
    check(close(measure(centre, scene, settings).ratio, std::exp(-0.198)), "high spectrum endpoint");
    settings.lowWeight = 0.6;
    check(close(measure(centre, scene, settings).ratio, 0.6 * std::exp(-0.605) + 0.4 * std::exp(-0.198)), "sum intensities before log");
    const double p1 = measure(centre, scene, settings).logProjection;
    const double p2 = measure(centre, doubled, settings).logProjection;
    check(p2 < 2 * p1, "two-energy log is not linear in thickness");
    settings = {};
    settings.angle = 0.3;
    check(close(length(objectBeam(centre, settings.angle).direction), 1), "rotation preserves ray distance");
    check(layers == old, "measurement does not mutate scene");

    for (double step : {0.0, 0.001, 0.6, std::numeric_limits<double>::quiet_NaN()}) {
        bool rejected = false;
        settings = {};
        settings.numeric = true;
        settings.stepLength = step;
        try {
            (void)measure(centre, scene, settings);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "invalid step rejected");
    }
    bool rejected = false;
    try {
        (void)measure({{0, 0, -6}, {0, 0, 2}, 12}, scene, {});
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "nonunit beam rejected in both paths");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "X-ray detector tests passed\n";
    return EXIT_SUCCESS;
}
