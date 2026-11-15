#pragma once

#include "grid.hpp"
#include <cmath>

namespace sand {

struct Rect {
    float x;
    float y;
    float width;
    float height;
};

inline Rect sceneRect(const Grid& grid, bool showcase = false) {
#if LAB_CHECKPOINT >= 7
    if (showcase) {
        return {0, 0, static_cast<float>(grid.width), static_cast<float>(grid.height)};
    }
    // Fit lưới vào vùng scene, không kéo méo ô khi thay kích thước lưới trong test.
    const float scale = std::min(832.0F / grid.width, 520.0F / grid.height);
    const float width = grid.width * scale;
    const float height = grid.height * scale;
    return {24.0F + (832.0F - width) / 2.0F, 112.0F + (520.0F - height) / 2.0F, width, height};
#else
    static_cast<void>(showcase);
    return {0, 0, static_cast<float>(grid.width), static_cast<float>(grid.height)};
#endif
}

inline bool logicalCell(const Grid& grid, float logicalX, float logicalY, int& x, int& y, bool showcase = false) {
    const Rect view = sceneRect(grid, showcase);
    if (!std::isfinite(logicalX) || !std::isfinite(logicalY)) {
        return false;
    }
    const float localX = logicalX - view.x;
    const float localY = logicalY - view.y;
    if (localX < 0 || localY < 0 || localX >= view.width || localY >= view.height) {
        return false;
    }
    x = static_cast<int>(std::floor(localX * grid.width / view.width));
    y = static_cast<int>(std::floor(localY * grid.height / view.height));
    return grid.contains(x, y);
}

} // namespace sand
