#pragma once

#include "field.hpp"
#include <cmath>
#include <limits>

namespace heat {

struct Stats {
    double minimum = 0;
    double maximum = 0;
    double mean = 0;
    double sum = 0;
    double integral = 0;
    std::size_t activePins = 0;
    bool finite = true;
};

// [snippet measure]
inline Stats measure(const Field& field, const Settings& settings) {
    Stats result;
    result.minimum = field.current.front();
    result.maximum = field.current.front();
    double correction = 0;
    for (std::size_t index = 0; index < field.current.size(); ++index) {
        const double value = field.current[index];
        if (!std::isfinite(value)) {
            result.finite = false;
            continue;
        }
        result.minimum = std::min(result.minimum, value);
        result.maximum = std::max(result.maximum, value);
        // Kahan summation giảm lỗi cộng, không sửa trạng thái của solver.
        const double adjusted = value - correction;
        const double total = result.sum + adjusted;
        correction = (total - result.sum) - adjusted;
        result.sum = total;
#if LAB_CHECKPOINT >= 5
        if (field.pins[index] != Pin::None) {
            ++result.activePins;
        }
#endif
    }
    result.mean = result.sum / static_cast<double>(field.current.size());
    result.integral = result.sum * settings.dx * settings.dy;
    return result;
}

// [/snippet measure]

} // namespace heat
