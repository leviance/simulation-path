#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#if LAB_CHECKPOINT >= 3
#include "grid.hpp"
#include <utility>

namespace sand {
inline bool tryMove(Grid& grid, int x, int y, int targetX, int targetY) {
    if (!grid.contains(targetX, targetY)) {
        return false;
    }
    const std::size_t source = grid.index(x, y);
    const std::size_t destination = grid.index(targetX, targetY);
    if (grid.moved[source] != 0 || grid.moved[destination] != 0) {
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
    // Swap giữ đủ vật liệu, kể cả khi cát đổi chỗ với nước.
    std::swap(grid.cells[source], grid.cells[destination]);
    grid.moved[source] = 1;
    grid.moved[destination] = 1;
    return true;
}

inline void stepGrid(Grid& grid) {
    std::fill(grid.moved.begin(), grid.moved.end(), std::uint8_t{0});
    // Duyệt từ dưới lên: ô đích phía dưới đã qua lượt xét.
    for (int y = grid.height - 1; y >= 0; --y) {
        for (int column = 0; column < grid.width; ++column) {
            int x = column;
#if LAB_CHECKPOINT >= 4
            if (grid.tick % 2U != 0) {
                x = grid.width - 1 - column;
            }
#endif
            const Cell material = grid.at(x, y);
            bool movable = material == Cell::Sand;
#if LAB_CHECKPOINT >= 5
            movable = movable || material == Cell::Water;
#endif
            if (!movable || grid.moved[grid.index(x, y)] != 0) {
                continue;
            }
            if (tryMove(grid, x, y, x, y + 1)) {
                continue;
            }
#if LAB_CHECKPOINT >= 4
            int direction = -1;
            if ((static_cast<std::uint32_t>(x + y) + grid.tick) % 2U != 0) {
                direction = 1;
            }
            if (tryMove(grid, x, y, x + direction, y + 1)) {
                continue;
            }
            if (tryMove(grid, x, y, x - direction, y + 1)) {
                continue;
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (material == Cell::Water) {
                if (tryMove(grid, x, y, x + direction, y)) {
                    continue;
                }
                tryMove(grid, x, y, x - direction, y);
            }
#endif
        }
    }
    ++grid.tick;
}
} // namespace sand
#endif
