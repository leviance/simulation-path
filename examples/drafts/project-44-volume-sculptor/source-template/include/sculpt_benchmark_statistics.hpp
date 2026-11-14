#pragma once

#include "sculpt_limits.hpp"
#include <algorithm>
#include <cmath>
#include <span>
#include <string_view>
#include <vector>

namespace sculpt {

struct TimingDistribution {
    double median{}, minimum{}, maximum{}, mad{};
    std::size_t samples{};
};

// The input is already sorted. Average the two central values for an even sample count.
inline double sortedMedian(std::span<const double> sorted) {
    if (sorted.empty())
        throw std::invalid_argument("A median needs at least one sorted value");
    const auto middle = sorted.size() / 2;
    if (sorted.size() % 2 != 0)
        return sorted[middle];
    return sorted[middle - 1] + (sorted[middle] - sorted[middle - 1]) * 0.5;
}

// snippet:sculpt-benchmark-distribution
inline TimingDistribution summarizeTimings(std::span<const double> values) {
    if (values.empty() || values.size() > 64)
        throw std::invalid_argument("Timing statistics need 1..64 bounded samples");
    std::vector<double> sorted(values.begin(), values.end());
    for (const double value : sorted)
        if (!std::isfinite(value) || value < 0)
            throw std::invalid_argument("A timing sample must be finite and nonnegative");
    std::sort(sorted.begin(), sorted.end());
    const double median = sortedMedian(sorted);
    std::vector<double> deviations;
    deviations.reserve(sorted.size());
    for (const double value : sorted)
        deviations.push_back(std::abs(value - median));
    std::sort(deviations.begin(), deviations.end());
    return {median, sorted.front(), sorted.back(), sortedMedian(deviations), sorted.size()};
}

// end-snippet:sculpt-benchmark-distribution

// Names and values have one explicit order; the CPU fixture checks every column.
inline constexpr std::array<std::string_view, 16> benchmarkMetricNames{
    "initial.field", "initial.count", "initial.scan", "initial.emit", "initial.normals",
    "local.brush", "local.history", "local.count", "local.scan", "local.emit", "local.normals",
    "full.count", "full.scan", "full.emit", "full.normals", "render.draw"};

struct BenchmarkTimings {
    PassTimes initial, local, full;
    double draw{};

    // Never include the lifetime field/history totals in a later remesh row.
    std::array<double, benchmarkMetricNames.size()> values() const {
        return {initial.field, initial.count, initial.scan, initial.emit, initial.normals, local.brush, local.history, local.count, local.scan, local.emit, local.normals, full.count, full.scan, full.emit, full.normals, draw};
    }
};

} // namespace sculpt
