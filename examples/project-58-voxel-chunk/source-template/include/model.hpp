#pragma once
#include <array>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace voxel {
// Một block chiếm một đơn vị world; y hướng lên, x/z nằm trên mặt đất.
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

#if LAB_CHECKPOINT >= 2
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
    // x liền nhau trong bộ nhớ, hết hàng đến z, hết lớp đến y.
    return x + side * (z + side * y);
}

inline Block get(const Chunk& chunk, int x, int y, int z) {
    return chunk.at(static_cast<std::size_t>(index(x, y, z)));
}

inline void set(Chunk& chunk, int x, int y, int z, Block block) {
    chunk.at(static_cast<std::size_t>(index(x, y, z))) = block;
}

inline int solidCount(const Chunk& chunk) {
    int count = 0;
    for (Block block : chunk) {
        if (block != Block::Air) {
            ++count;
        }
    }
    return count;
}

inline Chunk makeChunk(int preset) {
    if (preset < 0 || preset > 3) {
        throw std::invalid_argument("preset must be 0..3");
    }
    Chunk chunk{};
    if (preset == 0) {
        set(chunk, 7, 7, 7, Block::Stone);
    }
#if LAB_CHECKPOINT >= 3
    if (preset == 1) {
        chunk.fill(Block::Stone);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (preset == 2) {
        for (int y = 0; y < side; ++y) {
            for (int z = 0; z < side; ++z) {
                for (int x = 0; x < side; ++x) {
                    const int height = 4 + x / 4;
                    if (y < height) {
                        Block block = Block::Stone;
                        if (y >= height - 3) {
                            block = Block::Dirt;
                        }
                        if (y == height - 1) {
                            block = Block::Grass;
                        }
                        set(chunk, x, y, z, block);
                    }
                }
            }
        }
    }
#endif
    // Preset 3 giữ toàn Air, dùng để kiểm trường hợp mesh rỗng.
    return chunk;
}
#endif
} // namespace voxel
