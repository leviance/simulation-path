#pragma once

#include "sculpt_limits.hpp"
#include "sculpt_ui_geometry.hpp"
#include <optional>
#include <span>

namespace sculpt {

// Supplied inspector decoration: one selected chunk, never a second mesh/extraction path.
inline std::array<LineVertex, 24> chunkBoxLines(const GridSpec& grid, std::uint32_t chunk) {
    grid.validate();
    if (chunk >= chunkCount(grid))
        throw std::out_of_range("Chunk inspector index is outside the grid");
    const auto side = static_cast<std::uint32_t>(chunksPerAxis(grid));
    const Vec3 low{static_cast<float>((chunk % side) * chunkSide), static_cast<float>(((chunk / side) % side) * chunkSide), static_cast<float>((chunk / (side * side)) * chunkSide)};
    const Vec3 high{std::min(low.x + chunkSide, static_cast<float>(grid.samples - 1)), std::min(low.y + chunkSide, static_cast<float>(grid.samples - 1)), std::min(low.z + chunkSide, static_cast<float>(grid.samples - 1))};
    std::array<LineVertex, 24> lines;
    std::size_t cursor = 0;
    for (int axis = 0; axis < 3; ++axis)
        for (int mask = 0; mask < 4; ++mask) {
            std::array<float, 3> a{low.x, low.y, low.z}, b = a;
            const std::array<float, 3> maximum{high.x, high.y, high.z};
            for (int offset = 1; offset <= 2; ++offset)
                if ((mask & (1 << (offset - 1))) != 0)
                    a[(axis + offset) % 3] = b[(axis + offset) % 3] = maximum[(axis + offset) % 3];
            b[axis] = maximum[axis];
            lines[cursor++] = lineVertex(grid.worldFromGrid({a[0], a[1], a[2]}), {1, 0.7F, 0.28F});
            lines[cursor++] = lineVertex(grid.worldFromGrid({b[0], b[1], b[2]}), {1, 0.7F, 0.28F});
        }
    return lines;
}

struct ChunkInspection {
    bool enabled{};
    std::size_t selected{};

    std::optional<std::uint32_t> chunk(std::span<const std::uint32_t> work) const {
        if (!enabled || work.empty())
            return {};
        return work[selected % work.size()];
    }
};

} // namespace sculpt
