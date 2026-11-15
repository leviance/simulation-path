#pragma once

#include "field.hpp"

namespace heat {

struct Rect {
    float x;
    float y;
    float width;
    float height;
};

inline bool inside(Rect rectangle, float x, float y) {
    return x >= rectangle.x && y >= rectangle.y && x < rectangle.x + rectangle.width && y < rectangle.y + rectangle.height;
}

inline Rect sceneRect(const Field& field, bool showcase) {
    if (showcase) {
        return {0, 0, static_cast<float>(field.width), static_cast<float>(field.height)};
    }
    return {24, 132, 720, 720};
}

// Điểm ngoài viewport bị từ chối, không bị kéo vào ô mép bằng clamp.
// [snippet logical-cell]
inline bool logicalCell(const Field& field, float logicalX, float logicalY, int& x, int& y, bool showcase = false) {
    if (!std::isfinite(logicalX) || !std::isfinite(logicalY)) {
        return false;
    }
    const Rect rectangle = sceneRect(field, showcase);
    if (!inside(rectangle, logicalX, logicalY)) {
        return false;
    }
    x = static_cast<int>(std::floor((logicalX - rectangle.x) * field.width / rectangle.width));
    y = static_cast<int>(std::floor((logicalY - rectangle.y) * field.height / rectangle.height));
    return field.contains(x, y);
}

// [/snippet logical-cell]

} // namespace heat
