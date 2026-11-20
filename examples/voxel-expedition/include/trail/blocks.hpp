#pragma once
#include "math.hpp"
#include <array>
#include <stdexcept>

namespace trail {
inline constexpr int side = 16;
enum class Block : std::uint8_t {
    Air,
    Grass,
    Soil,
    Stone,
    Sand,
    Wood,
    Leaves,
    Water,
    Snow,
    Needles
};
inline constexpr int materialCount = 10;

struct Cell {
    int x = 0, y = 0, z = 0;
    bool operator==(const Cell&) const = default;
};

#if LAB_CHECKPOINT >= 5802
using Section = std::array<Block, side * side * side>;

// [snippet local-index]
inline int localIndex(int x, int y, int z) {
    if (x < 0 || x >= side || y < 0 || y >= side || z < 0 || z >= side) {
        throw std::out_of_range("cell outside section");
    }
    return x + side * (z + side * y);
}
// [/snippet local-index]

// [snippet split-coordinate]
struct Address {
    int chunk, local;
};
inline Address splitCoordinate(int world) {
    const int chunk = static_cast<int>(std::floor(static_cast<double>(world) / side));
    const int local = world - chunk * side;
    return {chunk, local};
}
// [/snippet split-coordinate]
#endif

inline const char* materialName(Block block) {
    constexpr std::array names{"air", "grass", "soil", "stone", "sand", "wood", "leaves", "water", "snow", "pine"};
    return names.at(static_cast<std::size_t>(block));
}
} // namespace trail
