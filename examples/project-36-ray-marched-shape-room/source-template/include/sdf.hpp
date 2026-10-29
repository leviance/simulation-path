#pragma once
#include "vector.hpp"

namespace lab {

struct SceneOptions {
    bool includeSphere{true};
    bool includeBox{true};
    bool includeTorus{true};
    bool includeRoom{true};
    double sphereRadius{0.82};
    double torusMinorRadius{0.22};
};

inline bool validScene(const SceneOptions& scene) {
    return std::isfinite(scene.sphereRadius) && scene.sphereRadius >= 0.4 && scene.sphereRadius <= 1.1 && std::isfinite(scene.torusMinorRadius) && scene.torusMinorRadius >= 0.12 && scene.torusMinorRadius <= 0.32;
}

#if LAB_CHECKPOINT >= 3
// [snippet:sphere-sdf]
inline double sdSphere(Vec3 point, Vec3 center, double radius) {
    return length(point - center) - radius;
}

// [/snippet:sphere-sdf]

struct SceneSample {
    double distance{1e6};
    int materialId{};
};

inline SceneSample nearer(SceneSample current, SceneSample candidate) {
    if (candidate.distance < current.distance) {
        return candidate;
    }
    return current;
}

#if LAB_CHECKPOINT >= 6
// [snippet:box-sdf]
inline double sdBox(Vec3 point, Vec3 center, Vec3 halfSize) {
    const Vec3 local = point - center;
    const Vec3 q{std::abs(local.x) - halfSize.x, std::abs(local.y) - halfSize.y, std::abs(local.z) - halfSize.z};
    const Vec3 outside{std::max(q.x, 0.0), std::max(q.y, 0.0), std::max(q.z, 0.0)};
    const double inside = std::min(std::max({q.x, q.y, q.z}), 0.0);
    return length(outside) + inside;
}

// [/snippet:box-sdf]

// Torus quanh trục Y trong local space. Phép quay giữ nguyên khoảng cách.
inline double sdTorus(Vec3 local, double majorRadius, double minorRadius) {
    const double ringDistance = std::hypot(local.x, local.z) - majorRadius;
    return std::hypot(ringDistance, local.y) - minorRadius;
}

inline Vec3 torusLocal(Vec3 point) {
    const Vec3 shifted = point - Vec3{0.05, -0.16, -1.25};
    constexpr double cosine = 0.5;
    constexpr double sine = 0.8660254037844386;
    // Inverse rotation: đổi điểm world sang hệ tọa độ của torus nghiêng 60 độ.
    return {shifted.x, cosine * shifted.y + sine * shifted.z, -sine * shifted.y + cosine * shifted.z};
}
#endif

// [snippet:sample-scene]
inline SceneSample sampleScene(Vec3 point, const SceneOptions& scene = {}) {
    if (!finite(point) || !validScene(scene)) {
        return {std::numeric_limits<double>::quiet_NaN(), 0};
    }
    SceneSample sample{};
    if (scene.includeSphere) {
        sample = nearer(sample, {sdSphere(point, {-1.0, -0.18, 0.15}, scene.sphereRadius), 1});
    }
#if LAB_CHECKPOINT >= 6
    if (scene.includeBox) {
        sample = nearer(sample, {sdBox(point, {1.0, -0.32, 0.1}, {0.62, 0.68, 0.62}), 2});
    }
    if (scene.includeTorus) {
        sample = nearer(sample, {sdTorus(torusLocal(point), 0.72, scene.torusMinorRadius), 3});
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (scene.includeRoom) {
        // Năm slab hữu hạn: ra ngoài phòng không có nghĩa là nằm trong vật đặc.
        sample = nearer(sample, {sdBox(point, {0.0, -1.12, 0.0}, {3.6, 0.12, 3.2}), 4});
        sample = nearer(sample, {sdBox(point, {0.0, 0.6, -3.2}, {3.6, 1.6, 0.1}), 4});
        sample = nearer(sample, {sdBox(point, {-3.6, 0.6, 0.0}, {0.1, 1.6, 3.2}), 4});
        sample = nearer(sample, {sdBox(point, {3.6, 0.6, 0.0}, {0.1, 1.6, 3.2}), 4});
        sample = nearer(sample, {sdBox(point, {0.0, 2.3, 0.0}, {3.6, 0.1, 3.2}), 4});
    }
#endif
    return sample;
}

// [/snippet:sample-scene]
#endif

} // namespace lab
