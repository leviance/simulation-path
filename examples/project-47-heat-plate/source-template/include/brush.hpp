#pragma once

#include "field.hpp"
#include <cmath>

namespace heat {

enum class BrushMode {
    Temperature,
    Heater,
    EraseHeater
};

#if LAB_CHECKPOINT >= 2
// Radius tính bằng ô; giới hạn đầu vào của bút không phải clamp nghiệm solver.
// [snippet paint-disk]
inline void paintDisk(Field& field, const Settings& settings, int centerX, int centerY, int radius, double value, BrushMode mode = BrushMode::Temperature) {
    if (!field.contains(centerX, centerY) || !std::isfinite(value)) {
        return;
    }
    radius = std::clamp(radius, 0, 24);
    value = std::clamp(value, 0.0, 1.0);
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY > radius * radius) {
                continue;
            }
            const int x = centerX + offsetX;
            const int y = centerY + offsetY;
            if (!field.contains(x, y)) {
                continue;
            }
            const std::size_t index = field.index(x, y);
#if LAB_CHECKPOINT >= 5
            if (settings.boundary == Boundary::ColdRim && field.edge(x, y)) {
                field.current[index] = 0;
                field.pins[index] = Pin::None;
                continue;
            }
            if (mode == BrushMode::EraseHeater) {
                field.pins[index] = Pin::None;
                continue;
            }
            field.pins[index] = Pin::None;
            if (mode == BrushMode::Heater) {
                field.pins[index] = Pin::Cold;
                if (value >= 0.5) {
                    field.pins[index] = Pin::Hot;
                }
            }
#endif
            field.current[index] = value;
        }
    }
    static_cast<void>(settings);
    static_cast<void>(mode);
}

// [/snippet paint-disk]

// Bù các vị trí thiếu giữa hai event, không nối từ một endpoint ngoài tấm.
// [snippet paint-stroke]
inline void paintStroke(Field& field, const Settings& settings, int x0, int y0, int x1, int y1, int radius, double value, BrushMode mode = BrushMode::Temperature) {
    if (!field.contains(x0, y0) || !field.contains(x1, y1)) {
        return;
    }
    const int dx = x1 - x0;
    const int dy = y1 - y0;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        paintDisk(field, settings, x0, y0, radius, value, mode);
        return;
    }
    for (int step = 0; step <= steps; ++step) {
        const double fraction = static_cast<double>(step) / steps;
        const int x = static_cast<int>(std::lround(x0 + fraction * dx));
        const int y = static_cast<int>(std::lround(y0 + fraction * dy));
        paintDisk(field, settings, x, y, radius, value, mode);
    }
}

// [/snippet paint-stroke]
#endif

} // namespace heat
