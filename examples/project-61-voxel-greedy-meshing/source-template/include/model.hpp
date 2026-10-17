#pragma once
#include <array>
#include <cstdint>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace voxel {
constexpr int side = 16;
constexpr int capacity = side * side * side;

struct Vec3 {
    double x, y, z;
};

struct Color {
    std::uint8_t r, g, b, a;
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
    Stone
};
using Chunk = std::array<Block, capacity>;

inline bool inside(int x, int y, int z) {
    return x >= 0 && x < side && y >= 0 && y < side && z >= 0 && z < side;
}

inline int index(int x, int y, int z) {
    if (!inside(x, y, z)) {
        throw std::out_of_range("chunk coordinate");
    }
    return x + side * (z + side * y);
}

inline Block get(const Chunk& chunk, int x, int y, int z) {
    if (!inside(x, y, z)) {
        return Block::Air;
    }
    return chunk[index(x, y, z)];
}

inline Block activeBlock(const Chunk& chunk, const std::array<int, 3>& p, int slice) {
    if (p[1] > slice) {
        return Block::Air;
    }
    return get(chunk, p[0], p[1], p[2]);
}

inline void set(Chunk& chunk, int x, int y, int z, Block material) {
    chunk[index(x, y, z)] = material;
}

inline Chunk makeChunk(int preset) {
    if (preset < 0 || preset > 8) {
        throw std::out_of_range("preset 0..8");
    }
    Chunk chunk{};
    if (preset == 8) {
        // Mặt +Y có u=Z, v=X; lớp y=15 cho plane=16.
        const int rows[4][4] = {{3, 3, 1, 0}, {3, 3, 1, 0}, {3, 0, 1, 1}, {0, 0, 0, 1}};
        for (int v = 0; v < 4; ++v) {
            for (int u = 0; u < 4; ++u) {
                set(chunk, v, 15, u, static_cast<Block>(rows[v][u]));
            }
        }
        return chunk;
    }
    if (preset == 0 || preset == 1) {
        set(chunk, 7, 7, 7, Block::Stone);
    }
    if (preset == 1) {
        set(chunk, 8, 7, 7, Block::Grass);
    }
    if (preset == 2 || preset == 3) {
        chunk.fill(Block::Stone);
    }
    if (preset == 3) {
        set(chunk, 8, 8, 8, Block::Air);
    }
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
                if (preset == 7 && z == 8) {
                    set(chunk, x, y, z, static_cast<Block>(1 + (x / 4) % 3));
                }
            }
        }
    }
    return chunk;
}

// u/v are cyclic axes: U cross V points toward the positive normal.
struct Rectangle {
    int face, plane, u, v, width, height;
    Block material;
};

inline Color faceColor(Block material, int face) {
    const std::array<Color, 4> palette{{{11, 16, 32, 255}, {100, 190, 90, 255}, {170, 115, 75, 255}, {150, 160, 180, 255}}};
    const std::array<double, 6> shade{{0.85, 0.65, 1.0, 0.5, 0.75, 0.6}};
    const Color c = palette.at(static_cast<std::size_t>(material));
    const double factor = shade.at(face);
    return {static_cast<std::uint8_t>(c.r * factor), static_cast<std::uint8_t>(c.g * factor), static_cast<std::uint8_t>(c.b * factor), 255};
}
} // namespace voxel
