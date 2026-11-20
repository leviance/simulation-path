#pragma once
#include "sampling.hpp"
#include <array>
#include <string>

namespace slice53 {
#if LAB_CHECKPOINT >= 2
struct Statistics {
    std::array<std::size_t, 64> bins{};
    double minimum = 0;
    double maximum = 0;
    double mean = 0;
    std::size_t count = 0;
};

// [snippet histogram]
inline Statistics measure(const Volume& volume) {
    Statistics result;
    result.count = volume.values().size();
    if (result.count != volume.grid().count() || result.count == 0)
        throw std::invalid_argument("Storage does not match grid");
    result.minimum = volume.values().front();
    result.maximum = volume.values().front();
    double sum = 0;
    for (float scalar : volume.values()) {
        if (!std::isfinite(scalar)) throw std::invalid_argument("Volume contains nonfinite scalar");
        result.minimum = std::min(result.minimum, static_cast<double>(scalar));
        result.maximum = std::max(result.maximum, static_cast<double>(scalar));
        sum += scalar;
        const int bin = std::clamp(static_cast<int>(std::floor(std::clamp(static_cast<double>(scalar), 0.0, 1.0) * 64)), 0, 63);
        ++result.bins[bin];
    }
    result.mean = sum / static_cast<double>(result.count);
    return result;
}
// [/snippet histogram]
#endif

#if LAB_CHECKPOINT >= 9
struct Audit { int checks = 0; int failures = 0; double residual = 0; };

// Runtime audit checks actual storage as well as a separately constructed affine fixture.
// A passing audit is not a claim of medical validity or native input verification.
inline Audit audit(const Volume& volume) {
    Audit report;
    measure(volume);
    ++report.checks;
    Grid grid;
    grid.size = {3, 2, 4};
    grid.origin = {-1, -2, -3};
    grid.spacing = {2, 4, 6};
    Volume fixture(grid);
    for (int z = 0; z < 4; ++z)
        for (int y = 0; y < 2; ++y)
            for (int x = 0; x < 3; ++x) fixture.set(x, y, z, x + 10 * y + 100 * z);
    // [snippet affine-oracle]
    for (int trial = 0; trial < 12; ++trial) {
        const double x = 0.1 + trial * 0.15;
        const double y = 0.05 + trial * 0.08;
        const double z = 0.2 + trial * 0.21;
        const Vec3 point{grid.origin.x + (x + 0.5) * grid.spacing.x, grid.origin.y + (y + 0.5) * grid.spacing.y, grid.origin.z + (z + 0.5) * grid.spacing.z};
        const double expected = x + 10 * y + 100 * z;
        const double error = std::abs(sampleLinear(fixture, point).value() - expected);
        report.residual = std::max(report.residual, error);
        ++report.checks;
        if (error > 1e-10) ++report.failures;
    }
    // [/snippet affine-oracle]
    return report;
}
#endif
} // namespace slice53
