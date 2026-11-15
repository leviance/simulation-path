#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace sand {

enum class Cell : std::uint8_t {
    Empty,
    Wall,
    Sand,
    Water
};

enum class ScanOrder {
    Alternating,
    LeftToRight,
    RightToLeft,
    TopDown
};

struct Grid {
    int width;
    int height;
    std::vector<Cell> cells;
#if LAB_CHECKPOINT >= 3
    std::vector<std::uint8_t> moved;
    std::uint32_t tick = 0;
#endif
#if LAB_CHECKPOINT >= 8
    ScanOrder order = ScanOrder::Alternating;
#endif

    // Kiểm kích thước trước phép nhân/cấp phát; không lấy kích thước window làm stride.
    Grid(int columns = 96, int rows = 64) :
        width(columns),
        height(rows) {
        if (columns < 1 || rows < 1 || columns > 1024 || rows > 768) {
            throw std::invalid_argument("Grid dimensions must be in [1,1024] x [1,768]");
        }
        const std::size_t size = static_cast<std::size_t>(columns) * static_cast<std::size_t>(rows);
        cells.assign(size, Cell::Empty);
#if LAB_CHECKPOINT >= 3
        moved.assign(size, 0);
#endif
    }

    bool contains(int x, int y) const {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    // Caller phải kiểm contains trước khi dùng index để truy cập vector.
    std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y) * static_cast<std::size_t>(width) + static_cast<std::size_t>(x);
    }

    Cell at(int x, int y) const {
        if (!contains(x, y)) {
            return Cell::Wall;
        }
        return cells[index(x, y)];
    }

    void set(int x, int y, Cell material) {
        if (contains(x, y)) {
            cells[index(x, y)] = material;
        }
    }
};

#if LAB_CHECKPOINT >= 1
inline Grid makeScene() {
    Grid grid;
    for (int x = 8; x < 88; ++x) {
        grid.set(x, 50, Cell::Wall);
    }
    for (int y = 8; y < 17; ++y) {
        for (int x = 40; x < 55; ++x) {
            grid.set(x, y, Cell::Sand);
        }
    }
#if LAB_CHECKPOINT >= 5
    for (int y = 38; y < 50; ++y) {
        for (int x = 20; x < 76; ++x) {
            grid.set(x, y, Cell::Water);
        }
    }
#endif
    return grid;
}
#endif

#if LAB_CHECKPOINT >= 2
inline void paintDisk(Grid& grid, int centerX, int centerY, int radius, Cell material) {
    if (!grid.contains(centerX, centerY)) {
        return;
    }
    radius = std::clamp(radius, 0, 24);
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            if (dx * dx + dy * dy <= radius * radius) {
                grid.set(centerX + dx, centerY + dy, material);
            }
        }
    }
}

// Các tâm cách nhau tối đa một ô theo mỗi trục, kể cả khi brush có radius = 0.
inline void paintStroke(Grid& grid, int x0, int y0, int x1, int y1, int radius, Cell material) {
    if (!grid.contains(x0, y0) || !grid.contains(x1, y1)) {
        return;
    }
    const int dx = x1 - x0;
    const int dy = y1 - y0;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        paintDisk(grid, x0, y0, radius, material);
        return;
    }
    for (int i = 0; i <= steps; ++i) {
        const double t = static_cast<double>(i) / steps;
        const int x = static_cast<int>(std::lround(x0 + t * dx));
        const int y = static_cast<int>(std::lround(y0 + t * dy));
        paintDisk(grid, x, y, radius, material);
    }
}
#endif

inline std::array<std::uint32_t, 4> countMaterials(const Grid& grid) {
    std::array<std::uint32_t, 4> counts{};
    for (Cell material : grid.cells) {
        ++counts[static_cast<std::size_t>(material)];
    }
    return counts;
}

inline std::uint32_t checksum(const Grid& grid) {
    std::uint32_t hash = 2166136261U;
    for (Cell material : grid.cells) {
        hash = (hash ^ static_cast<std::uint32_t>(material)) * 16777619U;
    }
    return hash;
}

} // namespace sand
