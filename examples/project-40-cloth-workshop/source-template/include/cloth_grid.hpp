#pragma once
#include "cloth_topology.hpp"

#include <numeric>

namespace cloth {

struct GridPlan {
    float cellSize{};
    std::uint32_t nx{};
    std::uint32_t ny{};
    std::uint32_t nz{};
    std::uint32_t cells{};
    Vec3 minimum{-5.0F, 0.0F, -5.0F};
};

inline GridPlan makeGridPlan(const Settings& settings) {
    GridPlan grid{};
    const float spacing = settings.extent / static_cast<float>(settings.side - 1U);
    grid.cellSize = std::max(4.0F * spacing, 2.0F * settings.thickness);
    grid.nx = static_cast<std::uint32_t>(std::ceil(10.0F / grid.cellSize));
    grid.ny = static_cast<std::uint32_t>(std::ceil(8.0F / grid.cellSize));
    grid.nz = grid.nx;
    const std::uint64_t cells = static_cast<std::uint64_t>(grid.nx) * grid.ny * grid.nz;
    if (cells > 32000000ULL) {
        throw std::length_error("Dense 3D grid exceeds the 32-million-cell safety limit.");
    }
    grid.cells = static_cast<std::uint32_t>(cells);
    return grid;
}

inline std::array<int, 3> cellCoordinate(Vec3 point, const GridPlan& grid) {
    return {
        std::clamp(static_cast<int>(std::floor((point.x - grid.minimum.x) / grid.cellSize)), 0, static_cast<int>(grid.nx) - 1),
        std::clamp(static_cast<int>(std::floor((point.y - grid.minimum.y) / grid.cellSize)), 0, static_cast<int>(grid.ny) - 1),
        std::clamp(static_cast<int>(std::floor((point.z - grid.minimum.z) / grid.cellSize)), 0, static_cast<int>(grid.nz) - 1)
    };
}

inline std::uint32_t cellIndex(int x, int y, int z, const GridPlan& grid) {
    return static_cast<std::uint32_t>(x) + grid.nx * (static_cast<std::uint32_t>(y) + grid.ny * static_cast<std::uint32_t>(z));
}

struct CpuGrid {
    GridPlan plan{};
    std::vector<std::uint32_t> counts{};
    std::vector<std::uint32_t> offsets{};
    std::vector<std::uint32_t> ids{};
    std::vector<std::uint32_t> vertexCells{};
};

inline CpuGrid buildCpuGrid(const std::vector<Vec4>& positions, GridPlan plan) {
    CpuGrid result{};
    result.plan = plan;
    result.counts.resize(plan.cells);
    result.offsets.resize(plan.cells);
    result.ids.resize(positions.size());
    result.vertexCells.resize(positions.size());
    for (std::size_t id = 0U; id < positions.size(); ++id) {
        const auto coordinate = cellCoordinate(xyz(positions[id]), plan);
        const auto cell = cellIndex(coordinate[0], coordinate[1], coordinate[2], plan);
        result.vertexCells[id] = cell;
        ++result.counts[cell];
    }
    std::exclusive_scan(result.counts.begin(), result.counts.end(), result.offsets.begin(), 0U);
    auto cursor = result.offsets;
    for (std::uint32_t id = 0U; id < positions.size(); ++id) {
        result.ids[cursor[result.vertexCells[id]]++] = id;
    }
    return result;
}

inline std::uint64_t plannedMemoryBytes(const Settings& settings) {
    const GridPlan grid = makeGridPlan(settings);
    const std::uint64_t n = static_cast<std::uint64_t>(settings.side) * settings.side;
    const std::uint64_t edges = 2ULL * settings.side * (settings.side - 1ULL)
        + 2ULL * (settings.side - 1ULL) * (settings.side - 1ULL)
        + 2ULL * settings.side * (settings.side - 2ULL);
    const std::uint64_t indices = 6ULL * (settings.side - 1ULL) * (settings.side - 1ULL);
    // Seven vec4 streams: state, previous, velocity, normals, correction, two rollback snapshots.
    // Includes index, constraint/lambda, vertex membership, and all recursive scan scratch.
    return 7ULL * 16ULL * n + 20ULL * edges + 4ULL * indices
        + 8ULL * n + 12ULL * grid.cells + 8ULL * ((grid.cells + 255ULL) / 256ULL + 256ULL) + 4096ULL;
}

inline std::uint64_t plannedHostMemoryBytes(const Settings& settings) {
    const std::uint64_t n = static_cast<std::uint64_t>(settings.side) * settings.side;
    // Authored topology stays available for picking/inspection; temporary color vectors and
    // initialization zero/normal streams also coexist during transactional construction.
    return 256ULL * n + 4096ULL;
}

} // namespace cloth
