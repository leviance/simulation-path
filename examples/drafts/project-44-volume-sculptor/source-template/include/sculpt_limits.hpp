#pragma once

#include "sculpt_grid.hpp"

namespace sculpt {

inline constexpr int chunkSide = 16;
inline constexpr std::size_t cellsPerChunk = chunkSide * chunkSide * chunkSide;
inline constexpr std::size_t maximumChunkVertices = cellsPerChunk * 36;
inline constexpr std::size_t maximumMeshVertices = 4194304;
inline constexpr std::size_t gpuByteBudget = 512 * 1024 * 1024;
inline constexpr std::uint32_t canaryWord = 0x6bd77a51U;
inline constexpr std::size_t guardBytes = 64;

inline int chunksPerAxis(const GridSpec& spec) {
    return (spec.samples - 2) / chunkSide + 1;
}

inline std::size_t chunkCount(const GridSpec& spec) {
    const auto side = static_cast<std::size_t>(chunksPerAxis(spec));
    return checkedProduct(checkedProduct(side, side), side);
}

struct ModelSettings {
    GridSpec grid{128};
    Shape shape{Shape::sphere};
    float isovalue{};

    void validate() const {
        grid.validate();
        const auto maximum = grid.origin + Vec3{grid.extent, grid.extent, grid.extent};
        if (maximum.x > 8 || maximum.y > 8 || maximum.z > 8)
            throw std::invalid_argument("The GPU editing domain must stay inside [-8, 8] on every axis");
        if (grid.samples != 32 && grid.samples != 64 && grid.samples != 128 && grid.samples != 192)
            throw std::invalid_argument("GPU presets support 32/64/128/192 samples, with 128 required for acceptance");
        if (!std::isfinite(isovalue) || std::abs(isovalue) > 0.25F)
            throw std::invalid_argument("Isovalue must stay in [-0.25, 0.25]");
        if (shape != Shape::sphere && shape != Shape::separatedSpheres && shape != Shape::torus)
            throw std::invalid_argument("Unknown field preset");
    }
};

struct ChunkStats {
    std::uint32_t vertices{}, activeCells{}, degenerate{}, invalid{};
    std::uint32_t emitted{}, normalFallbacks{}, generation{}, mismatch{};
};

static_assert(sizeof(ChunkStats) == 32);

struct PassTimes {
    double field{}, upload{}, brush{}, history{}, count{}, scan{}, emit{}, normals{}, draw{};
};

} // namespace sculpt
