#pragma once
#include "math.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6203
// [snippet cloud-noise]
inline double valueNoise(double x, double z, std::uint32_t seed) {
    const int ix = static_cast<int>(std::floor(x)), iz = static_cast<int>(std::floor(z));
    const double sx = smooth(0, 1, x - ix), sz = smooth(0, 1, z - iz);
    const auto sample = [seed](int a, int b) { return double(hash(a, b, seed) & 65535u) / 65535.0; };
    return std::lerp(std::lerp(sample(ix, iz), sample(ix + 1, iz), sx), std::lerp(sample(ix, iz + 1), sample(ix + 1, iz + 1), sx), sz);
}
// [/snippet cloud-noise]

// [snippet cloud-layer]
inline double cloudCover(Vec3 eye, Vec3 ray, double seconds, Vec3 drift, std::uint32_t seed) {
    if (ray.y <= 0.035)
        return 0;
    const double travel = (96.0 - eye.y) / ray.y;
    if (travel <= 0)
        return 0;
    const Vec3 sample = eye + ray * travel - drift * seconds;
    const double puffs = 0.72 * valueNoise(sample.x / 43, sample.z / 34, seed) + 0.28 * valueNoise(sample.x / 17, sample.z / 14, seed + 7);
    return smooth(0.51, 0.67, puffs) * smooth(0.035, 0.18, ray.y);
}
// [/snippet cloud-layer]
#endif
} // namespace trail
