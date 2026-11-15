#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "parameters.hpp"
#include <algorithm>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace heat {

// Chỉ để UI scaffold ẩn chức năng chưa học; snapshot còn đúng một return.
inline constexpr int taughtStage() {
#if LAB_CHECKPOINT >= 9
    return 9;
#elif LAB_CHECKPOINT >= 8
    return 8;
#elif LAB_CHECKPOINT >= 7
    return 7;
#elif LAB_CHECKPOINT >= 6
    return 6;
#elif LAB_CHECKPOINT >= 5
    return 5;
#elif LAB_CHECKPOINT >= 4
    return 4;
#elif LAB_CHECKPOINT >= 3
    return 3;
#elif LAB_CHECKPOINT >= 2
    return 2;
#elif LAB_CHECKPOINT >= 1
    return 1;
#else
    return 0;
#endif
}

enum class Pin : std::int8_t {
    None = -1,
    Cold = 0,
    Hot = 1
};

// Theta chuẩn hóa: không tự gán Kelvin/Celsius hoặc nhiệt lượng Joule.
// [snippet field-storage]
struct Field {
    int width;
    int height;
    std::vector<double> current;
// [/snippet field-storage]
#if LAB_CHECKPOINT >= 3
    std::vector<double> next;
    std::uint64_t tick = 0;
    double time = 0;
#endif
#if LAB_CHECKPOINT >= 5
    std::vector<Pin> pins;
#endif
#if LAB_CHECKPOINT >= 6
    int experimentSteps = 0;
#endif

    Field(int columns = 32, int rows = 32) :
        width(columns),
        height(rows) {
        if (columns < 1 || rows < 1 || columns > 512 || rows > 512) {
            throw std::invalid_argument("Field dimensions must be in [1,512] on each axis");
        }
        const std::size_t size = static_cast<std::size_t>(columns) * static_cast<std::size_t>(rows);
        current.assign(size, 0.0);
#if LAB_CHECKPOINT >= 3
        next.assign(size, 0.0);
#endif
#if LAB_CHECKPOINT >= 5
        pins.assign(size, Pin::None);
#endif
    }

    // [snippet field-index]
    bool contains(int x, int y) const {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    // Kiểm contains trước khi dùng index với dữ liệu từ input.
    std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y) * static_cast<std::size_t>(width) + static_cast<std::size_t>(x);
    }

    // [/snippet field-index]

    bool edge(int x, int y) const {
        return x == 0 || y == 0 || x == width - 1 || y == height - 1;
    }
};

// [snippet sample]
inline double sample(const Field& field, int x, int y) {
    // Cell-centered zero-flux ghost: phản chiếu vào chính ô sát mặt ngoài.
    x = std::clamp(x, 0, field.width - 1);
    y = std::clamp(y, 0, field.height - 1);
    return field.current[field.index(x, y)];
}

// [/snippet sample]

#if LAB_CHECKPOINT >= 5
// [snippet boundary]
inline void applyBoundary(Field& field, const Settings& settings) {
    if (settings.boundary != Boundary::ColdRim) {
        return;
    }
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            if (field.edge(x, y)) {
                field.current[field.index(x, y)] = 0;
#if LAB_CHECKPOINT >= 5
                field.pins[field.index(x, y)] = Pin::None;
#endif
            }
        }
    }
}

// [/snippet boundary]
#endif

} // namespace heat
