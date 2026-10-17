#pragma once
#include "model.hpp"
#include <algorithm>
#include <cmath>
#include <tuple>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

namespace voxel {
constexpr int maxResident = 49;
constexpr double playerLimit = 512;

struct Key {
    int x = 0;
    int z = 0;

    bool operator<(const Key& other) const {
        return std::tie(z, x) < std::tie(other.z, other.x);
    }

    bool operator==(const Key& other) const {
        return x == other.x && z == other.z;
    }
};

struct Player {
    double x = 8;
    double z = 8;
};

inline void validateKey(Key key) {
    if (key.x < -64 || key.x > 64 || key.z < -64 || key.z > 64) {
        throw std::out_of_range("chunk key -64..64");
    }
}
#if LAB_CHECKPOINT >= 2
struct AxisLocation {
    int chunk;
    double local;
    int block;
};

inline int floorDiv(int value) {
    // C++ chia số nguyên về zero; cần lùi thêm một chunk nếu dư âm.
    int quotient = value / side;
    if (value % side < 0) {
        --quotient;
    }
    return quotient;
}

inline AxisLocation splitAxis(double position) {
    if (!std::isfinite(position) || std::abs(position) > playerLimit) {
        throw std::out_of_range("player position -512..512");
    }
    const int chunk = static_cast<int>(std::floor(position / side));
    const double local = position - chunk * side;
    return {chunk, local, static_cast<int>(std::floor(local))};
}
#endif
inline Key centerOf(const Player& player) {
#if LAB_CHECKPOINT >= 2
    return {splitAxis(player.x).chunk, splitAxis(player.z).chunk};
#else
    (void)player;
    return {};
#endif
}

inline int distance(Key a, Key b) {
    return std::max(std::abs(a.x - b.x), std::abs(a.z - b.z));
}
} // namespace voxel
