#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace water51 {
struct Distribution {
    double minimum;
    double median;
    double maximum;
};

// [snippet distribution]
inline Distribution distribution(std::vector<double> samples) {
    if (samples.empty())
        throw std::invalid_argument("Benchmark has no samples");
    for (double value : samples)
        if (!std::isfinite(value) || value < 0)
            throw std::invalid_argument("Invalid timing sample");
    std::sort(samples.begin(), samples.end());
    double median = samples[samples.size() / 2];
    if (samples.size() % 2 == 0)
        median = (median + samples[samples.size() / 2 - 1]) * .5;
    return {samples.front(), median, samples.back()};
}

// [/snippet distribution]
} // namespace water51
