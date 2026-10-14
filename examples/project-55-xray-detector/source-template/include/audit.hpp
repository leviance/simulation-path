#pragma once
#include "detector.hpp"

namespace xray {
#if LAB_CHECKPOINT >= 8
// A small independent analytic fixture; not a medical or driver certification.
inline double audit() {
    const Beam beam{{0, 0, -6}, {0, 0, 1}, 12};
    const Scene slab{{{-1, -1, -0.55}, {1, 1, 0.55}, 0.55, 0.18}};
    Settings settings;
    const auto exact = measure(beam, slab, settings);
    if (std::abs(exact.depth.low - 0.605) > 1e-12 || std::abs(exact.ratio - std::exp(-0.605)) > 1e-12) {
        throw std::runtime_error("Independent slab oracle failed");
    }

    double maximumError = 0;
    for (double step : {0.05, 0.11, 0.25}) {
        settings.numeric = true;
        settings.stepLength = step;
        const auto result = measure(beam, slab, settings);
        const double error = std::abs(result.depth.low - 0.605);
        const double bound = 2 * step * 0.55 + 1e-12;
        if (error > bound) {
            throw std::runtime_error("Midpoint boundary bound failed");
        }
        maximumError = std::max(maximumError, error);
    }

    return maximumError;
}
#endif
} // namespace xray
