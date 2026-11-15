#pragma once

#include "brush.hpp"
#include <cmath>
#include <numbers>

namespace heat {

enum class Preset {
    Hotspot,
    Uniform,
    Checker,
    Cosine,
    Heaters,
    Empty
};

inline const char* presetName(Preset preset) {
    if (preset == Preset::Uniform) {
        return "UNIFORM 0.4";
    }
    if (preset == Preset::Checker) {
        return "CHECKER: STABILITY EXPERIMENT";
    }
    if (preset == Preset::Cosine) {
        return "COSINE MODE (4,4)";
    }
    if (preset == Preset::Heaters) {
        return "HOT AND COLD THERMOSTATS";
    }
    if (preset == Preset::Empty) {
        return "EMPTY PLATE";
    }
    return "GAUSSIAN HOTSPOT";
}

// [snippet make-field]
inline Field makeField(Preset preset = Preset::Hotspot, int size = 32) {
    Field field(size, size);
#if LAB_CHECKPOINT >= 1
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            double value = 0;
            const double normalizedX = (static_cast<double>(x) + 0.5) / field.width;
            const double normalizedY = (static_cast<double>(y) + 0.5) / field.height;
            if (preset == Preset::Hotspot) {
                const double offsetX = normalizedX - 0.5;
                const double offsetY = normalizedY - 0.5;
                value = std::exp(-72 * (offsetX * offsetX + offsetY * offsetY));
#if LAB_CHECKPOINT == 3
                if (y != field.height / 2) {
                    value = 0;
                }
#endif
            }
#if LAB_CHECKPOINT >= 8
            if (preset == Preset::Uniform) {
                value = 0.4;
            }
#endif
#if LAB_CHECKPOINT >= 6
            if (preset == Preset::Checker) {
                value = 0.25;
                if ((x + y) % 2 != 0) {
                    value = 0.75;
                }
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (preset == Preset::Cosine) {
                value = 0.5 + 0.25 * std::cos(4 * std::numbers::pi * normalizedX) * std::cos(4 * std::numbers::pi * normalizedY);
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (preset == Preset::Heaters) {
                value = 0.15;
            }
#endif
            field.current[field.index(x, y)] = value;
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (preset == Preset::Heaters) {
        const Settings settings;
        const int radius = std::max(1, size / 24);
        paintDisk(field, settings, size / 3, size / 2, radius, 1, BrushMode::Heater);
        paintDisk(field, settings, size * 2 / 3, size / 2, radius, 0, BrushMode::Heater);
    }
#endif
    static_cast<void>(preset);
    return field;
}

// [/snippet make-field]

// Các preset lớn cùng phủ miền cách nhiệt 96×96 đơn vị độ dài.
inline Settings settingsForSize(int size) {
    if (size < 1 || size > 512) {
        throw std::invalid_argument("Unsupported plate size");
    }
    Settings settings;
    settings.dx = 96.0 / size;
    settings.dy = settings.dx;
    return settings;
}

} // namespace heat
