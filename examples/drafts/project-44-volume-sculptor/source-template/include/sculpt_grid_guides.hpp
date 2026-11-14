#pragma once

#include "sculpt_grid.hpp"
#include "sculpt_ui_geometry.hpp"

namespace sculpt {

// Supplied viewport decoration. X/Z directions are document-relative, not world-origin axes.
inline std::array<LineVertex, 88> gridGuideLines(const GridSpec& grid) {
    grid.validate();
    std::array<LineVertex, 88> result;
    std::size_t cursor = 0;
    const auto line = [&](Vec3 a, Vec3 b, Vec3 color) {
        result[cursor++] = lineVertex(a, color);
        result[cursor++] = lineVertex(b, color);
    };
    const Vec3 center = grid.origin + Vec3{1, 1, 1} * (grid.extent * 0.5F);
    const float floorY = grid.origin.y + grid.extent * (2.0F / 15.0F);
    const float spacing = grid.extent / 20;
    const Vec3 color{0.13F, 0.20F, 0.25F};
    for (int index = -10; index <= 10; ++index) {
        const float x = center.x + index * spacing;
        const float z = center.z + index * spacing;
        line({x, floorY, grid.origin.z}, {x, floorY, grid.origin.z + grid.extent}, color);
        line({grid.origin.x, floorY, z}, {grid.origin.x + grid.extent, floorY, z}, color);
    }
    const Vec3 anchor{center.x, floorY, center.z};
    const float axisLength = grid.extent * (8.0F / 15.0F);
    line(anchor, anchor + Vec3{axisLength, 0, 0}, {0.65F, 0.25F, 0.22F});
    line(anchor, anchor + Vec3{0, 0, axisLength}, {0.22F, 0.42F, 0.7F});
    return result;
}

} // namespace sculpt
