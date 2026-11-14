#pragma once
#include "sculpt_math.hpp"
#include <string_view>
#include <vector>

namespace sculpt {
// Logical UI rectangles are separate from the high-DPI drawable and world grid.
// Input routing uses the same panel width as the overlay, not a second hit box.
inline constexpr int nativePanelWidth = 350;

struct UiRect {
    float x{};
    float y{};
    float width{};
    float height{};

    bool contains(float px, float py) const {
        return px >= x && py >= y && px < x + width && py < y + height;
    }
};

struct LineVertex {
    std::array<float, 3> position;
    std::array<float, 3> color;
};

inline std::array<float, 3> colorArray(Vec3 value) {
    return {static_cast<float>(value.x), static_cast<float>(value.y), static_cast<float>(value.z)};
}

inline LineVertex lineVertex(Vec3 position, Vec3 color) {
    return {colorArray(position), colorArray(color)};
}
} // namespace sculpt
