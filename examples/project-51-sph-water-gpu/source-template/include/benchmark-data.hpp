#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace water3 {
struct Distribution {
    double minimum = 0;
    double median = 0;
    double maximum = 0;
};

inline Distribution distribution(std::vector<double> values) {
    if (values.empty())
        throw std::invalid_argument("Empty benchmark sample set");
    for (double value : values) {
        if (!std::isfinite(value) || value < 0)
            throw std::invalid_argument("Invalid benchmark sample");
    }
    std::sort(values.begin(), values.end());
    const auto middle = values.size() / 2;
    double median = values[middle];
    if (values.size() % 2 == 0)
        median = 0.5 * (values[middle - 1] + values[middle]);
    return {values.front(), median, values.back()};
}
} // namespace water3
