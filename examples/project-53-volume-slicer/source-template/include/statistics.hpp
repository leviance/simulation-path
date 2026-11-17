#pragma once
#include "volume.hpp"
#include <cstdint>
#include <limits>

namespace slices {
#if LAB_CHECKPOINT >= 4
// Rebuild this only when the dataset changes, not while a slider moves.
struct Statistics {
    std::array<std::size_t, 64> bins{};
    std::size_t samples = 0;
    double minimum = std::numeric_limits<double>::infinity();
    double maximum = -std::numeric_limits<double>::infinity();
};

// [snippet histogram]
inline Statistics histogram(const Volume& volume) {
    Statistics result;
    for (double value : volume.values) {
        if (!std::isfinite(value)) {
            throw std::invalid_argument("Histogram needs finite scalars");
        }
        const double normalized = std::clamp(value, 0.0, 1.0);
        const auto bin = std::min(static_cast<std::size_t>(normalized * result.bins.size()), result.bins.size() - 1);
        ++result.bins[bin];
        ++result.samples;
        result.minimum = std::min(result.minimum, value);
        result.maximum = std::max(result.maximum, value);
    }
    return result;
}

// [/snippet histogram]
#endif
} // namespace slices
