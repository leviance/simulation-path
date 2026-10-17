#pragma once
#include "coordinates.hpp"

namespace voxel {
// Hash không giữ state; phép nhân uint32_t tràn theo modulo 2^32.
#if LAB_CHECKPOINT >= 3
inline std::uint32_t latticeHash(int x, int z, std::uint32_t seed) {
    if (x < -4096 || x > 4096 || z < -4096 || z > 4096 || seed > 65535u) {
        throw std::out_of_range("lattice/seed outside teaching domain");
    }
    std::uint32_t hash = static_cast<std::uint32_t>(x) * 0x8da6b343u;
    hash ^= static_cast<std::uint32_t>(z) * 0xd8163841u;
    hash ^= seed;
    hash = (hash ^ (hash >> 16)) * 0x7feb352du;
    hash = (hash ^ (hash >> 15)) * 0x846ca68bu;
    return hash ^ (hash >> 16);
}

inline double latticeValue(int x, int z, std::uint32_t seed) {
    return static_cast<double>(latticeHash(x, z, seed) & 65535u) / 65535.0 * 2.0 - 1.0;
}
#endif

#if LAB_CHECKPOINT >= 4
inline double blend(double a, double b, double t) {
    return a + (b - a) * t;
}

inline double smooth(double t) {
    return t * t * (3.0 - 2.0 * t);
}

// Nội suy giá trị ở bốn nút; đây là value noise, không phải gradient Perlin noise.
inline double valueNoise(double x, double z, std::uint32_t seed) {
    if (!std::isfinite(x) || !std::isfinite(z) || std::abs(x) > 2048 || std::abs(z) > 2048) {
        throw std::out_of_range("noise coordinates -2048..2048");
    }
    const int x0 = static_cast<int>(std::floor(x));
    const int z0 = static_cast<int>(std::floor(z));
    const double tx = smooth(x - x0);
    const double tz = smooth(z - z0);
    const double a = blend(latticeValue(x0, z0, seed), latticeValue(x0 + 1, z0, seed), tx);
    const double b = blend(latticeValue(x0, z0 + 1, seed), latticeValue(x0 + 1, z0 + 1, seed), tx);
    return blend(a, b, tz);
}
#endif
} // namespace voxel
