#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace heat {
// Nhiệt độ dư chuẩn hóa: 0 là môi trường, 1 là mức nóng của bút, không phải Kelvin.
struct Field {
    int width;
    int height;
    std::vector<double> current;
    std::vector<double> next;
    std::uint32_t tick = 0;

    Field(int columns = 64, int rows = 48)
        : width(columns), height(rows) {
        if (columns < 3 || rows < 3 || columns > 256 || rows > 256) {
            throw std::invalid_argument("Field dimensions must be in [3, 256]");
        }
        current.assign(static_cast<std::size_t>(width * height), 0.0);
        next = current;
    }

    bool contains(int x, int y) const {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y * width + x);
    }

    bool edge(int x, int y) const {
        return x == 0 || y == 0 || x == width - 1 || y == height - 1;
    }
};

inline Field makeField(int preset = 0) {
    Field field;
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            double value = 0;
            if (preset == 0 && x >= 28 && x < 36 && y >= 20 && y < 28) {
                value = 1;
            }
#if LAB_CHECKPOINT >= 8
            if (preset == 1) {
                value = 0.4;
            }
            if (preset == 2 && x % 2 == y % 2) {
                value = 1;
            }
#endif
            field.current[field.index(x, y)] = value;
        }
    }
    return field;
}

#if LAB_CHECKPOINT >= 2
inline void paintDisk(Field& field, int centerX, int centerY, int radius, double value) {
    if (!field.contains(centerX, centerY) || !std::isfinite(value)) {
        return;
    }
    radius = std::clamp(radius, 0, 8);
    value = std::clamp(value, 0.0, 1.0);
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            const int x = centerX + dx;
            const int y = centerY + dy;
            if (dx * dx + dy * dy <= radius * radius && field.contains(x, y)) {
                field.current[field.index(x, y)] = value;
            }
        }
    }
}

inline void paintStroke(Field& field, int x0, int y0, int x1, int y1, int radius, double value) {
    if (!field.contains(x0, y0) || !field.contains(x1, y1)) {
        return;
    }
    const int dx = x1 - x0;
    const int dy = y1 - y0;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        paintDisk(field, x0, y0, radius, value);
        return;
    }
    for (int i = 0; i <= steps; ++i) {
        const double t = static_cast<double>(i) / steps;
        const int x = static_cast<int>(std::lround(x0 + t * dx));
        const int y = static_cast<int>(std::lround(y0 + t * dy));
        paintDisk(field, x, y, radius, value);
    }
}
#endif
} // namespace heat
