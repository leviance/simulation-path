#pragma once
#include "scan.hpp"

namespace ct {
#if LAB_CHECKPOINT >= 9
// Independent circular phantom oracle: distance from origin to the infinite line.
inline double audit() {
    const Scene disk{{{0, 0}, 1, 0.5}};
    double maximumError = 0;
    for (int row = 0; row < 30; ++row) {
        const double angle = viewAngle(row, 30);
        for (int column = 0; column < detectorCount; ++column) {
            const double s = ((column + 0.5) / detectorCount - 0.5) * detectorWidth;
            const double distance = sourceRadius * std::abs(s) / std::hypot(sourceRadius + detectorRadius, s);
            double expected = 0;
            if (distance < 1) {
                expected = std::sqrt(1 - distance * distance);
            }
            const auto actual = measure(detectorRay(angle, (column + 0.5) / detectorCount), disk, 1);
            maximumError = std::max(maximumError, std::abs(actual.projection - expected));
        }
    }

    // Fail before reporting a successful audit.
    if (maximumError > 1e-10) {
        throw std::runtime_error("Circular phantom oracle failed");
    }

    return maximumError;
}
#endif
} // namespace ct
