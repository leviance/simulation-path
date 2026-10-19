#pragma once
#include "lab.hpp"
#include <algorithm>

namespace lab {
inline constexpr double kPixelsPerUnit = 50.0;
inline constexpr Vec2 kOrigin{450.0, 400.0};

struct Scene {
    TransformParameters parameters{};
    bool paused = true;
#if LAB_CHECKPOINT >= 6
    TransformOrder order = TransformOrder::ScaleShearRotate;
#endif
};

inline Vec2 worldToScreen(Vec2 point) {
    return {kOrigin.x + point.x * kPixelsPerUnit, kOrigin.y - point.y * kPixelsPerUnit};
}

inline Vec2 screenToWorld(Vec2 point) {
    return {(point.x - kOrigin.x) / kPixelsPerUnit, (kOrigin.y - point.y) / kPixelsPerUnit};
}

// Ảnh CPU chỉ vẽ một miền hữu hạn. Đây là giới hạn editor, không phải tính chất ma trận.
inline Vec2 boundedTranslation(Vec2 value) {
    if (!std::isfinite(value.x) || !std::isfinite(value.y)) {
        return {};
    }
    return {std::clamp(value.x, -2.0, 2.0), std::clamp(value.y, -2.0, 2.0)};
}

inline Vec2 directTransform(Vec2 point, const Scene& scene) {
    const auto& p = scene.parameters;
#if LAB_CHECKPOINT >= 6
    if (scene.order == TransformOrder::RotateShearScale) {
        const Vec2 rotated = rotatePoint(point, p.angle);
        const Vec2 sheared = shearPoint(rotated, p.shearX, p.shearY);
        return add(scalePoint(sheared, p.scaleX, p.scaleY), p.translation);
    }
#endif
#if LAB_CHECKPOINT >= 2
    point = scalePoint(point, p.scaleX, p.scaleY);
#endif
#if LAB_CHECKPOINT >= 4
    point = shearPoint(point, p.shearX, p.shearY);
#endif
#if LAB_CHECKPOINT >= 3
    point = rotatePoint(point, p.angle);
#endif
#if LAB_CHECKPOINT >= 5
    point = add(point, p.translation);
#endif
#if LAB_CHECKPOINT < 2
    (void)p;
#endif
    return point;
}

#if LAB_CHECKPOINT >= 4
inline Mat2 sceneLinearMatrix(const Scene& scene) {
    const auto& p = scene.parameters;
    const double c = std::cos(p.angle);
    const double s = std::sin(p.angle);
    const Mat2 scale{{{p.scaleX, 0.0, 0.0, p.scaleY}}};
    const Mat2 shear{{{1.0, p.shearX, p.shearY, 1.0}}};
    const Mat2 rotation{{{c, -s, s, c}}};
#if LAB_CHECKPOINT >= 6
    if (scene.order == TransformOrder::RotateShearScale) {
        return multiply(scale, multiply(shear, rotation));
    }
#endif
    return multiply(rotation, multiply(shear, scale));
}
#endif

#if LAB_CHECKPOINT >= 5
inline Mat3 sceneMatrix(const Scene& scene) {
#if LAB_CHECKPOINT >= 6
    return composeTransform(scene.parameters, scene.order);
#else
    const auto& p = scene.parameters;
    return multiply(translationMatrix(p.translation), multiply(rotationMatrix(p.angle), multiply(shearMatrix(p.shearX, p.shearY), scaleMatrix(p.scaleX, p.scaleY))));
#endif
}
#endif

inline Vec2 worldPoint(Vec2 local, const Scene& scene) {
#if LAB_CHECKPOINT >= 5
    return transformPoint(sceneMatrix(scene), local);
#elif LAB_CHECKPOINT >= 4
    return transformVector(sceneLinearMatrix(scene), local);
#else
    return directTransform(local, scene);
#endif
}

inline Square transformedSquare(const Scene& scene) {
    const Square localSquare = makeSquare(1.0);
    Square worldSquare{};
    for (std::size_t index = 0; index < localSquare.size(); ++index) {
        worldSquare[index] = worldPoint(localSquare[index], scene);
    }
    return worldSquare;
}

inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index == 1) {
        scene.parameters.scaleX = -1.0;
    }
    if (index == 2) {
        scene.parameters.scaleX = 0.0;
    }
    if (index == 3) {
        scene.parameters.shearX = 1.0;
        scene.parameters.shearY = 1.0;
    }
    if (index == 4) {
        scene.parameters = {1.6, 0.6, kPi / 4.0, 0.4, -0.2, {1.0, 0.5}};
    }
}

#if LAB_CHECKPOINT >= 7
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0 || deltaTime > 0.1) {
        return;
    }
    scene.parameters.angle = std::remainder(scene.parameters.angle + 0.45 * deltaTime, 2.0 * kPi);
}
#endif
} // namespace lab
