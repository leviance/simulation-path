#pragma once

#include "field.hpp"
#include <array>

namespace heat {

struct Rgba {
    std::uint8_t r;
    std::uint8_t g;
    std::uint8_t b;
    std::uint8_t a = 255;
};

inline Rgba mixColor(Rgba first, Rgba second, double fraction) {
    fraction = std::clamp(fraction, 0.0, 1.0);
    return {
        static_cast<std::uint8_t>(std::lround(first.r + (second.r - first.r) * fraction)),
        static_cast<std::uint8_t>(std::lround(first.g + (second.g - first.g) * fraction)),
        static_cast<std::uint8_t>(std::lround(first.b + (second.b - first.b) * fraction)),
        255};
}

inline Rgba heatColor(double theta, bool experiment = false) {
    if (!std::isfinite(theta)) {
        return {255, 0, 255, 255};
    }
    if (experiment) {
        // Fixed display range [-1,2], centered at 0.5. Chỉ clamp màu, không clamp theta.
        if (theta < 0.5) {
            return mixColor({34, 106, 214, 255}, {212, 220, 231, 255}, (theta + 1) / 1.5);
        }
        return mixColor({212, 220, 231, 255}, {242, 78, 51, 255}, (theta - 0.5) / 1.5);
    }
    const std::array<Rgba, 6> palette{{{9, 21, 42, 255}, {18, 77, 129, 255}, {22, 155, 177, 255}, {246, 184, 70, 255}, {241, 98, 45, 255}, {255, 245, 205, 255}}};
    const double position = std::clamp(theta, 0.0, 1.0) * 5;
    const int segment = std::min(4, static_cast<int>(position));
    return mixColor(palette[static_cast<std::size_t>(segment)], palette[static_cast<std::size_t>(segment + 1)], position - segment);
}

inline void encodeRow(const Field& field, int y, std::uint8_t* destination, bool experiment, bool showPins) {
    for (int x = 0; x < field.width; ++x) {
        const std::size_t index = field.index(x, y);
        Rgba color = heatColor(field.current[index], experiment);
#if LAB_CHECKPOINT >= 5
        if (showPins && field.pins[index] != Pin::None && (x + y) % 4 == 0) {
            color = {255, 255, 255, 255};
        }
#endif
        const std::size_t offset = static_cast<std::size_t>(x) * 4;
        destination[offset] = color.r;
        destination[offset + 1] = color.g;
        destination[offset + 2] = color.b;
        destination[offset + 3] = color.a;
    }
    static_cast<void>(showPins);
}

} // namespace heat
