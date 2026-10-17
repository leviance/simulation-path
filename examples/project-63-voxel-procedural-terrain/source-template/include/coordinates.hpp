#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include "model.hpp"
#include <algorithm>
#include <cmath>
#include <tuple>

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

struct AxisLocation {
    int chunk;
    double local;
    int block;
};

inline int floorDiv(int value) {
    // Dùng cùng định nghĩa floor với vị trí liên tục, kể cả tại bội âm của 16.
    // Double biểu diễn chính xác miền int32; chia 16 là phép đổi theo lũy thừa hai.
    return static_cast<int>(std::floor(static_cast<double>(value) / side));
}

inline AxisLocation splitAxis(double position) {
    if (!std::isfinite(position) || std::abs(position) > playerLimit) {
        throw std::out_of_range("player position -512..512");
    }
    const int chunk = static_cast<int>(std::floor(position / side));
    const double local = position - chunk * side;
    return {chunk, local, static_cast<int>(std::floor(local))};
}

inline Key centerOf(const Player& player) {
    return {splitAxis(player.x).chunk, splitAxis(player.z).chunk};
}

inline int distance(Key a, Key b) {
    return std::max(std::abs(a.x - b.x), std::abs(a.z - b.z));
}
} // namespace voxel
