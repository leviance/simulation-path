#pragma once
#include "model.hpp"
#include <optional>

namespace voxel {
// Bảng lớp cắt nằm ở tọa độ logical của SDL, không dùng window pixel trực tiếp.
inline constexpr int panelX = 660;
inline constexpr int panelY = 60;
inline constexpr int cellSize = 16;

#if LAB_CHECKPOINT >= 6
inline std::optional<std::array<int, 3>> pickCell(double x, double y, int slice) {
    if (!std::isfinite(x) || !std::isfinite(y) || slice < 0 || slice >= side) {
        return std::nullopt;
    }
    const double localX = x - panelX;
    const double localZ = y - panelY;
    if (localX < 0 || localZ < 0 || localX >= side * cellSize || localZ >= side * cellSize) {
        return std::nullopt;
    }
    return std::array<int, 3>{static_cast<int>(localX / cellSize), slice, static_cast<int>(localZ / cellSize)};
}
#endif
} // namespace voxel
