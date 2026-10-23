#pragma once
#include "raster.hpp"

namespace lab {
// Hai đường nội suy dùng cùng weights; khác biệt chỉ nằm ở việc có chia lại cho 1/z.
#if LAB_CHECKPOINT >= 3
inline Vec2 interpolateAffineUv(const ScreenTriangle& triangle, Barycentric weights) {
    const double u = weights.a * triangle[0].uv.x + weights.b * triangle[1].uv.x + weights.c * triangle[2].uv.x;
    const double v = weights.a * triangle[0].uv.y + weights.b * triangle[1].uv.y + weights.c * triangle[2].uv.y;
    return {u, v};
}
#endif

#if LAB_CHECKPOINT >= 5
inline double reciprocalDepthDenominator(const ScreenTriangle& triangle, Barycentric weights) {
    return weights.a * triangle[0].oneOverZ + weights.b * triangle[1].oneOverZ + weights.c * triangle[2].oneOverZ;
}
#endif

#if LAB_CHECKPOINT >= 6
inline std::optional<Vec2> interpolatePerspectiveUv(const ScreenTriangle& triangle, Barycentric weights) {
    const double denominator = reciprocalDepthDenominator(triangle, weights);
    if (!std::isfinite(denominator) || denominator <= 0) {
        return std::nullopt;
    }
    const double uOverZ = weights.a * triangle[0].uOverZ + weights.b * triangle[1].uOverZ + weights.c * triangle[2].uOverZ;
    const double vOverZ = weights.a * triangle[0].vOverZ + weights.b * triangle[1].vOverZ + weights.c * triangle[2].vOverZ;
    const Vec2 uv{uOverZ / denominator, vOverZ / denominator};
    if (!isFinite(uv)) {
        return std::nullopt;
    }
    return uv;
}
#endif
} // namespace lab
