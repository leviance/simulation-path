#pragma once

#include "grid.hpp"
#include <utility>

namespace sand {

struct StepStats {
    std::uint32_t visited = 0;
    std::uint32_t movable = 0;
    std::uint32_t swaps = 0;
};

#if LAB_CHECKPOINT >= 3
inline bool tryMove(Grid& grid, int x, int y, int targetX, int targetY) {
    if (!grid.contains(x, y) || !grid.contains(targetX, targetY)) {
        return false;
    }
    const std::size_t source = grid.index(x, y);
    const std::size_t destination = grid.index(targetX, targetY);
    bool sourceCanMove = grid.cells[source] == Cell::Sand;
#if LAB_CHECKPOINT >= 5
    sourceCanMove = sourceCanMove || grid.cells[source] == Cell::Water;
#endif
    if (!sourceCanMove) {
        return false;
    }
    if (grid.moved[source] != 0) {
        return false;
    }
    // Ô trống không phải một hạt đã di chuyển: vacancy có thể truyền ngược lên cột.
    if (grid.cells[destination] != Cell::Empty && grid.moved[destination] != 0) {
        return false;
    }
    bool allowed = grid.cells[destination] == Cell::Empty;
#if LAB_CHECKPOINT >= 5
    if (grid.cells[source] == Cell::Sand && grid.cells[destination] == Cell::Water) {
        allowed = true;
    }
#endif
    if (!allowed) {
        return false;
    }
    std::swap(grid.cells[source], grid.cells[destination]);
    // Nước bị đẩy về ô nguồn cũng đã tham gia một lần đổi chỗ trong tick này.
    grid.moved[source] = 1;
    grid.moved[destination] = 1;
    return true;
}

inline StepStats stepGrid(Grid& grid) {
    StepStats stats;
    std::fill(grid.moved.begin(), grid.moved.end(), std::uint8_t{0});
#if LAB_CHECKPOINT >= 4
    bool reverseColumns = grid.tick % 2U != 0;
#if LAB_CHECKPOINT >= 8
    if (grid.order == ScanOrder::LeftToRight) {
        reverseColumns = false;
    }
    if (grid.order == ScanOrder::RightToLeft) {
        reverseColumns = true;
    }
    const bool topDown = grid.order == ScanOrder::TopDown;
#endif
#endif
    for (int row = 0; row < grid.height; ++row) {
        int y = grid.height - 1 - row;
#if LAB_CHECKPOINT >= 8
        if (topDown) {
            y = row;
        }
#endif
        for (int column = 0; column < grid.width; ++column) {
            int x = column;
#if LAB_CHECKPOINT >= 4
            if (reverseColumns) {
                x = grid.width - 1 - column;
            }
#endif
            ++stats.visited;
            const Cell material = grid.at(x, y);
            bool movable = material == Cell::Sand;
#if LAB_CHECKPOINT >= 5
            movable = movable || material == Cell::Water;
#endif
            if (!movable || grid.moved[grid.index(x, y)] != 0) {
                continue;
            }
            ++stats.movable;
            bool moved = tryMove(grid, x, y, x, y + 1);
#if LAB_CHECKPOINT >= 4
            int direction = -1;
            if ((static_cast<std::uint32_t>(x + y) + grid.tick) % 2U != 0) {
                direction = 1;
            }
            if (!moved) {
                moved = tryMove(grid, x, y, x + direction, y + 1);
            }
            if (!moved) {
                moved = tryMove(grid, x, y, x - direction, y + 1);
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (!moved && material == Cell::Water) {
                moved = tryMove(grid, x, y, x + direction, y);
                if (!moved) {
                    moved = tryMove(grid, x, y, x - direction, y);
                }
            }
#endif
            if (moved) {
                ++stats.swaps;
            }
        }
    }
    ++grid.tick;
    return stats;
}
#endif

} // namespace sand
