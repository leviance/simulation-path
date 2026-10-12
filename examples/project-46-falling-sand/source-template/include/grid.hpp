#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
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

// Mỗi phần tử là một ô vật liệu, không phải một hạt có position/velocity riêng.
struct Grid {
    int width;
    int height;
    std::vector<Cell> cells;
#if LAB_CHECKPOINT >= 3
    std::vector<std::uint8_t> moved;
    std::uint32_t tick = 0;
#endif

    Grid(int columns = 96, int rows = 64)
        : width(columns), height(rows) {
        if (columns < 1 || rows < 1 || columns > 256 || rows > 256) {
            throw std::invalid_argument("Grid dimensions must be in [1, 256]");
        }
        cells.assign(static_cast<std::size_t>(width * height), Cell::Empty);
#if LAB_CHECKPOINT >= 3
        moved.assign(cells.size(), 0);
#endif
    }

    bool contains(int x, int y) const {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y * width + x);
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

#if LAB_CHECKPOINT >= 2
inline void paintDisk(Grid& grid, int centerX, int centerY, int radius, Cell material) {
    if (!grid.contains(centerX, centerY)) {
        return;
    }
    radius = std::clamp(radius, 0, 8);
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            if (dx * dx + dy * dy <= radius * radius) {
                grid.set(centerX + dx, centerY + dy, material);
            }
        }
    }
}

// Đi qua các tâm ô liên tiếp, tránh đứt nét khi chuột gửi ít event.
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

#if LAB_CHECKPOINT >= 7
inline std::array<int, 4> countMaterials(const Grid& grid) {
    std::array<int, 4> counts{};
    for (const Cell material : grid.cells) {
        ++counts[static_cast<std::size_t>(material)];
    }
    return counts;
}

inline std::uint32_t checksum(const Grid& grid) {
    std::uint32_t hash = 2166136261U;
    for (const Cell material : grid.cells) {
        hash = (hash ^ static_cast<std::uint32_t>(material)) * 16777619U;
    }
    return hash;
}

inline Grid makePreset(int preset) {
    if (preset == 0) {
        return makeScene();
    }
    Grid grid;
    if (preset == 1) {
        // Hai vách nghiêng, chừa khe rộng bốn ô ở giữa.
        for (int i = 0; i < 34; ++i) {
            grid.set(12 + i, 18 + i, Cell::Wall);
            grid.set(83 - i, 18 + i, Cell::Wall);
        }
        for (int y = 3; y < 15; ++y) {
            for (int x = 35; x < 61; ++x) {
                grid.set(x, y, Cell::Sand);
            }
        }
    }
    return grid;
}
#endif
} // namespace sand
