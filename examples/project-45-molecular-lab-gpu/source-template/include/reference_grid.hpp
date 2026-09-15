#pragma once

#include "molecular_math.hpp"

#include <array>

namespace molecular {

// Mô hình CPU nhỏ để test cách đánh chỉ số của bucket GPU, không dùng cho preset lớn.
struct ReferenceGrid {
    std::vector<std::uint32_t> counts{};
    std::vector<std::uint32_t> indices{};
    bool valid = false;
};

inline std::uint32_t cellId(const Plan& plan, const Float4& position) {
    const auto x = std::min(plan.cellsX - 1, static_cast<std::uint32_t>(position.x / plan.width * static_cast<float>(plan.cellsX)));
    const auto y = std::min(plan.cellsY - 1, static_cast<std::uint32_t>(position.y / plan.height * static_cast<float>(plan.cellsY)));
    return y * plan.cellsX + x;
}

inline ReferenceGrid referenceGrid(const Plan& plan, const std::vector<Float4>& positions) {
    if (plan.count > 1024 || positions.size() != plan.count) {
        throw std::invalid_argument("Reference grid only accepts small complete input.");
    }
    ReferenceGrid grid{};
    grid.counts.resize(plan.cells);
    grid.indices.resize(static_cast<std::size_t>(plan.cells) * cellCapacity);
    grid.valid = true;
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        const auto& position = positions[i];
        if (!std::isfinite(position.x) || !std::isfinite(position.y) || position.x < 0 || position.y < 0 || position.x >= plan.width || position.y >= plan.height) {
            grid.valid = false;
            continue;
        }
        const auto cell = cellId(plan, position);
        const auto slot = grid.counts[cell]++;
        if (slot >= cellCapacity) {
            grid.valid = false;
            continue;
        }
        grid.indices[cell * cellCapacity + slot] = i;
    }
    return grid;
}

inline std::vector<std::uint32_t> neighborCells(const Plan& plan, std::uint32_t origin) {
    std::vector<std::uint32_t> result{};
    const int columns = static_cast<int>(plan.cellsX);
    const int rows = static_cast<int>(plan.cellsY);
    for (int dy = -1; dy <= 1; ++dy) {
        for (int dx = -1; dx <= 1; ++dx) {
            const int x = (static_cast<int>(origin % plan.cellsX) + dx + columns) % columns;
            const int y = (static_cast<int>(origin / plan.cellsX) + dy + rows) % rows;
            const auto cell = static_cast<std::uint32_t>(y * columns + x);
            if (std::find(result.begin(), result.end(), cell) == result.end()) {
                result.push_back(cell);
            }
        }
    }
    return result;
}

inline std::vector<std::uint32_t> candidates(const Plan& plan, const ReferenceGrid& grid, const Float4& referencePosition) {
    if (!grid.valid) {
        throw std::runtime_error("Cannot use an overflowing reference grid.");
    }
    std::vector<std::uint32_t> result{};
    for (const auto cell : neighborCells(plan, cellId(plan, referencePosition))) {
        for (std::uint32_t slot = 0; slot < grid.counts[cell]; ++slot) {
            result.push_back(grid.indices[cell * cellCapacity + slot]);
        }
    }
    return result;
}

} // namespace molecular
