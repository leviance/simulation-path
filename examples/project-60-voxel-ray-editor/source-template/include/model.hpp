#pragma once
#include <array>
#include <cmath>
#include <compare>
#include <cstdint>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace voxel {
// Giữ nguyên layout và quy ước world của Project 58.
inline constexpr int side = 16;
inline constexpr int capacity = side * side * side;

struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;
};

struct Color {
    std::uint8_t r = 130;
    std::uint8_t g = 180;
    std::uint8_t b = 230;
    std::uint8_t a = 255;
};

struct Triangle {
    std::array<Vec3, 3> points;
    Color color;
};

using Mesh = std::vector<Triangle>;
enum class Block : std::uint8_t {
    Air,
    Grass,
    Dirt,
    Stone,
};
using Chunk = std::array<Block, capacity>;

inline bool inside(int x, int y, int z) {
    return x >= 0 && x < side && y >= 0 && y < side && z >= 0 && z < side;
}

inline int index(int x, int y, int z) {
    if (!inside(x, y, z)) {
        throw std::out_of_range("block coordinate outside chunk");
    }
    return x + side * (z + side * y);
}

inline Block get(const Chunk& chunk, int x, int y, int z) {
    return chunk.at(static_cast<std::size_t>(index(x, y, z)));
}

inline void set(Chunk& chunk, int x, int y, int z, Block block) {
    chunk.at(static_cast<std::size_t>(index(x, y, z))) = block;
}

inline Chunk makeChunk(int preset) {
    if (preset < 0 || preset > 6) {
        throw std::invalid_argument("preset must be 0..6");
    }
    Chunk chunk{};
    if (preset == 0 || preset == 1) {
        set(chunk, 7, 7, 7, Block::Stone);
    }
    if (preset == 1) {
        set(chunk, 8, 7, 7, Block::Grass);
    }
    if (preset == 2) {
        chunk.fill(Block::Stone);
    }
    if (preset == 3) {
        chunk.fill(Block::Stone);
        set(chunk, 8, 8, 8, Block::Air);
    }
    if (preset == 4 || preset == 6) {
        for (int y = 0; y < side; ++y) {
            for (int z = 0; z < side; ++z) {
                for (int x = 0; x < side; ++x) {
                    if (preset == 4 && (x + y + z) % 2 == 0) {
                        set(chunk, x, y, z, Block::Stone);
                    }
                    const int height = 4 + x / 4;
                    if (preset == 6 && y < height) {
                        Block material = Block::Stone;
                        if (y >= height - 3) {
                            material = Block::Dirt;
                        }
                        if (y == height - 1) {
                            material = Block::Grass;
                        }
                        set(chunk, x, y, z, material);
                    }
                }
            }
        }
    }
    // Preset 5 là Air; không lưu geometry hoặc màu màn hình trong chunk.
    return chunk;
}

inline int effectiveSlice(int slice) {
    if (slice < 0 || slice >= side) {
        throw std::invalid_argument("slice must be 0..15");
    }
    return slice;
}
} // namespace voxel
