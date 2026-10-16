#pragma once
#include "mesh.hpp"
#include <optional>
#include <string>

namespace voxel {
// Bảng là công cụ đọc dữ liệu, không ray picking hoặc sửa block.
inline constexpr int panelX = 660;
inline constexpr int panelY = 60;
inline constexpr int cellSize = 16;

#if LAB_CHECKPOINT >= 6
inline std::optional<std::array<int, 3>> pickCell(double x, double y, int selectedY) {
    if (!std::isfinite(x) || !std::isfinite(y) || selectedY < 0 || selectedY >= side) {
        return std::nullopt;
    }
    const double localX = x - panelX;
    const double localZ = y - panelY;
    if (localX < 0 || localZ < 0 || localX >= 256 || localZ >= 256) {
        return std::nullopt;
    }
    return std::array<int, 3>{static_cast<int>(localX / cellSize), selectedY, static_cast<int>(localZ / cellSize)};
}

inline std::string inspectFace(const Chunk& chunk, std::array<int, 3> selected, int face, int slice) {
    const auto [x, y, z] = selected;
    const auto offset = offsets.at(static_cast<std::size_t>(face));
    if (!activeSolid(chunk, x, y, z, slice)) {
        return "No face: source is Air or outside active slice";
    }
    const int nx = x + offset[0];
    const int ny = y + offset[1];
    const int nz = z + offset[2];
    std::string reason = "KEEP: neighbor Air";
    if (!inside(nx, ny, nz)) {
        reason = "KEEP: outside isolated chunk";
    } else if (ny > effectiveSlice(slice)) {
        reason = "KEEP: above display cut";
    } else if (activeSolid(chunk, nx, ny, nz, slice)) {
        reason = "DROP: opaque neighbor";
    }
    return reason + " | n=(" + std::to_string(nx) + "," + std::to_string(ny) + "," + std::to_string(nz) + ")";
}
#endif
} // namespace voxel
