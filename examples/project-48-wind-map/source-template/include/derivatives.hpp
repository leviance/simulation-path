#pragma once
#include "field.hpp"

namespace wind {
#if LAB_CHECKPOINT >= 3
// [snippet derivative-x]
inline double derivativeX(const Field& field, const std::vector<double>& values, int x, int y) {
    const auto i = field.index(x, y);
    // Mép dùng ba điểm trong miền; không tự giả định trường tuần hoàn.
    // [snippet one-sided-left]
    if (x == 0) {
        return (-3 * values[i] + 4 * values[i + 1] - values[i + 2]) / (2 * field.dx);
    }
    // [/snippet one-sided-left]
    if (x == field.width - 1) {
        return (3 * values[i] - 4 * values[i - 1] + values[i - 2]) / (2 * field.dx);
    }
    // [snippet centered-x]
    return (values[i + 1] - values[i - 1]) / (2 * field.dx);
    // [/snippet centered-x]
}

// [/snippet derivative-x]

// [snippet derivative-y]
inline double derivativeY(const Field& field, const std::vector<double>& values, int x, int y) {
    const auto i = field.index(x, y);
    const auto w = static_cast<std::size_t>(field.width);
    if (y == 0) {
        return (-3 * values[i] + 4 * values[i + w] - values[i + 2 * w]) / (2 * field.dy);
    }
    if (y == field.height - 1) {
        return (3 * values[i] - 4 * values[i - w] + values[i - 2 * w]) / (2 * field.dy);
    }
    return (values[i + w] - values[i - w]) / (2 * field.dy);
}

// [/snippet derivative-y]

// [snippet gradient]
inline void gradient(Field& field) {
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const auto i = field.index(x, y);
            field.vx[i] = derivativeX(field, field.scalar, x, y);
            field.vy[i] = derivativeY(field, field.scalar, x, y);
        }
    }
}

// [/snippet gradient]
#endif

#if LAB_CHECKPOINT >= 4
// [snippet divergence]
inline double divergence(const Field& field, int x, int y) {
    return derivativeX(field, field.vx, x, y) + derivativeY(field, field.vy, x, y);
}

// [/snippet divergence]
#endif

#if LAB_CHECKPOINT >= 5
// [snippet curl]
inline double curl(const Field& field, int x, int y) {
    // Thành phần z của curl trong mặt phẳng world x phải, y lên.
    return derivativeX(field, field.vy, x, y) - derivativeY(field, field.vx, x, y);
}

// [/snippet curl]
#endif
} // namespace wind
