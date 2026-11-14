#pragma once

#include "atom_sampler.hpp"
#include <optional>

namespace atom {

struct Interval {
    double estimate{}, low{}, high{}, standardError{};
};

// The denominator is the whole accepted cloud, even when clipping hides points.
// This is sampling uncertainty only, not a bound on table or tail approximation.
// snippet:atom-binomial-interval
inline Interval binomialWilson(std::uint64_t successes, std::uint64_t total, double z = 1.96) {
    if (total == 0 || successes > total || !std::isfinite(z) || z <= 0)
        throw std::invalid_argument("A binomial interval needs valid counts and a positive z score");
    const double n = static_cast<double>(total);
    const double p = static_cast<double>(successes) / n;
    const double denominator = 1 + z * z / n;
    const double center = (p + z * z / (2 * n)) / denominator;
    const double half = z * std::sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator;
    return {p, std::max(0.0, center - half), std::min(1.0, center + half), std::sqrt(p * (1 - p) / n)};
}

// end-snippet:atom-binomial-interval

inline std::array<double, 16> referenceRadialHistogram(const SamplingConfig& config) {
    std::array<double, 16> result{};
    for (std::size_t bin = 0; bin < result.size(); ++bin) {
        const double low = config.radius * static_cast<double>(bin) / result.size();
        const double high = config.radius * static_cast<double>(bin + 1) / result.size();
        result[bin] = referenceRadialProbability(config, high) - referenceRadialProbability(config, low);
    }
    return result;
}

// A translated sphere generally lacks this closed form. Do not relabel an
// origin-centered result as the exact reference for a moved region.
inline std::optional<double> expectedOriginSphere(const SamplingConfig& config, Vec3 center, float radius) {
    if (!finite(center) || !std::isfinite(radius) || radius < 0)
        throw std::invalid_argument("A region needs finite coordinates and a nonnegative radius");
    if (center.x != 0 || center.y != 0 || center.z != 0)
        return {};
    return referenceRadialProbability(config, radius);
}

// A conservative correctness guard for a fixed finite suite; table tolerance is
// supplied separately and must never silently absorb an invalid density model.
inline bool probabilityWithinTolerance(std::uint64_t observed, std::uint64_t total, double expected, double tableTolerance, double z = 5) {
    if (observed > total || total == 0 || !std::isfinite(expected) || expected < 0 || expected > 1 || !std::isfinite(tableTolerance) || tableTolerance < 0 || !std::isfinite(z) || z <= 0)
        throw std::invalid_argument("Invalid probability comparison");
    const double n = static_cast<double>(total);
    const double uncertainty = z * std::sqrt(expected * (1 - expected) / n) + 1 / n;
    return std::abs(static_cast<double>(observed) / n - expected) <= uncertainty + tableTolerance;
}

} // namespace atom
