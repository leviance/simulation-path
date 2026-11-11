#pragma once
#include "morph_math.hpp"
#include <string_view>
#include <vector>

namespace morph {
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
} // namespace morph
