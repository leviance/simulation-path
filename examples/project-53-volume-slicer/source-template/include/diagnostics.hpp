#pragma once
#include "display.hpp"
#include <limits>

namespace slices {
#if LAB_CHECKPOINT >= 7
// A linear field is an independent interpolation oracle; the phantom is not a CT scan.
struct Report {
    int checks = 0;
    int failures = 0;
    double residual = 0;
    double minimum = std::numeric_limits<double>::infinity();
    double maximum = -std::numeric_limits<double>::infinity();

    void check(bool condition) {
        ++checks;
        if (!condition)
            ++failures;
    }
};

inline double affine(Point point) {
    return 0.2 + 0.1 * point[0] + 0.2 * point[1] + 0.15 * point[2];
}

inline Report auditVolume(const Volume& volume) {
    Report report;
    for (double value : volume.values) {
        report.check(std::isfinite(value) && value >= 0 && value <= 1);
        report.minimum = std::min(report.minimum, value);
        report.maximum = std::max(report.maximum, value);
    }

    Volume oracle({{4, 3, 5}, {0.2, 0.3, 0.4}});
    for (int z = 0; z < 5; ++z) {
        for (int y = 0; y < 3; ++y) {
            for (int x = 0; x < 4; ++x) {
                const Point point{worldCoordinate(oracle.grid, 0, x), worldCoordinate(oracle.grid, 1, y), worldCoordinate(oracle.grid, 2, z)};
                oracle.values[oracle.index(x, y, z)] = affine(point);
            }
        }
    }
    for (int i = 0; i < 16; ++i) {
        const Point point{worldCoordinate(oracle.grid, 0, 0.2 + 0.15 * i), worldCoordinate(oracle.grid, 1, 0.25 + 0.1 * i), worldCoordinate(oracle.grid, 2, 0.4 + 0.2 * i)};
        const auto sampled = sampleLinear(oracle, point);
        report.check(sampled.has_value());
        if (sampled) {
            const double error = std::abs(*sampled - affine(point));
            report.residual = std::max(report.residual, error);
            report.check(error <= 1e-12);
        }
    }
    return report;
}
#endif
} // namespace slices
