#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>

namespace lab {

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(const Vec3& a, const Vec3& b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(const Vec3& a, const Vec3& b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(const Vec3& vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

inline Vec3 operator/(const Vec3& vector, double scalar) {
    return {vector.x / scalar, vector.y / scalar, vector.z / scalar};
}

inline double dot(const Vec3& a, const Vec3& b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(const Vec3& a, const Vec3& b) {
    return {
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    };
}

inline double length(const Vec3& vector) {
    return std::sqrt(dot(vector, vector));
}

inline Vec3 normalize(const Vec3& vector) {
    const double magnitude = length(vector);
    if (magnitude <= 1.0e-12) {
        return {};
    }
    return vector / magnitude;
}

inline bool finite(const Vec3& vector) {
    return std::isfinite(vector.x) && std::isfinite(vector.y) && std::isfinite(vector.z);
}

struct Ray {
    Vec3 origin{};
    Vec3 direction{0.0, 0.0, -1.0};
};

struct OrbitCamera {
    Vec3 target{0.0, -0.1, -0.25};
    double yaw{};
    double pitch{0.08};
    double distance{4.5};
    double verticalFieldOfViewRadians{1.0471975511965976};
};

inline Vec3 cameraPosition(const OrbitCamera& camera) {
    const double horizontal = std::cos(camera.pitch) * camera.distance;
    const Vec3 offset{
        std::sin(camera.yaw) * horizontal,
        std::sin(camera.pitch) * camera.distance,
        std::cos(camera.yaw) * horizontal,
    };
    return camera.target + offset;
}

inline Ray makeCameraRay(
    const OrbitCamera& camera,
    double pixelX,
    double pixelY,
    int framebufferWidth,
    int framebufferHeight
) {
    const double width = double(std::max(1, framebufferWidth));
    const double height = double(std::max(1, framebufferHeight));
    const Vec3 origin = cameraPosition(camera);
    const Vec3 forward = normalize(camera.target - origin);
    const Vec3 right = normalize(cross(forward, {0.0, 1.0, 0.0}));
    const Vec3 up = normalize(cross(right, forward));
    const double ndcX = 2.0 * ((pixelX + 0.5) / width) - 1.0;
    const double ndcY = 1.0 - 2.0 * ((pixelY + 0.5) / height);
    const double aspect = width / height;
    const double tangent = std::tan(camera.verticalFieldOfViewRadians * 0.5);
    const Vec3 direction = normalize(
        forward + right * (ndcX * aspect * tangent) + up * (ndcY * tangent)
    );
    return {origin, direction};
}

#if LAB_CHECKPOINT >= 3
inline double sdSphere(const Vec3& point, const Vec3& center, double radius) {
    return length(point - center) - radius;
}

struct SceneSample {
    double distance{std::numeric_limits<double>::infinity()};
    int materialId{};
};

inline SceneSample nearer(SceneSample current, SceneSample candidate) {
    if (candidate.distance < current.distance) {
        return candidate;
    }
    return current;
}

#if LAB_CHECKPOINT >= 6
inline Vec3 absolute(const Vec3& vector) {
    return {std::abs(vector.x), std::abs(vector.y), std::abs(vector.z)};
}

inline double sdBox(const Vec3& point, const Vec3& center, const Vec3& halfSize) {
    const Vec3 q = absolute(point - center) - halfSize;
    const Vec3 outside{
        std::max(q.x, 0.0),
        std::max(q.y, 0.0),
        std::max(q.z, 0.0),
    };
    const double inside = std::min(std::max({q.x, q.y, q.z}), 0.0);
    return length(outside) + inside;
}

inline double sdTorus(
    const Vec3& point,
    const Vec3& center,
    double majorRadius,
    double minorRadius
) {
    const Vec3 local = point - center;
    const double ringDistance = std::hypot(local.x, local.z) - majorRadius;
    return std::hypot(ringDistance, local.y) - minorRadius;
}
#endif

inline SceneSample sampleScene(const Vec3& point) {
    SceneSample sample{sdSphere(point, {-1.0, -0.18, 0.15}, 0.82), 1};
#if LAB_CHECKPOINT >= 6
    sample = nearer(sample, {sdBox(point, {1.0, -0.32, 0.1}, {0.62, 0.68, 0.62}), 2});
    sample = nearer(sample, {sdTorus(point, {0.05, 0.32, -1.25}, 0.72, 0.22), 3});
#endif
#if LAB_CHECKPOINT >= 7
    // Năm plane tạo một căn phòng mở phía camera: floor, ceiling, back, left, right.
    sample = nearer(sample, {point.y + 1.0, 4});
    sample = nearer(sample, {2.35 - point.y, 4});
    sample = nearer(sample, {point.z + 3.1, 4});
    sample = nearer(sample, {point.x + 3.5, 4});
    sample = nearer(sample, {3.5 - point.x, 4});
#endif
    return sample;
}
#endif

#if LAB_CHECKPOINT >= 4
struct RayMarchSettings {
    int maximumSteps{96};
    double hitEpsilon{0.0015};
    double maximumDistance{20.0};
};

struct RayMarchResult {
    bool hit{};
    double traveled{};
    int steps{};
    int materialId{};
    Vec3 position{};
};

inline RayMarchResult marchRay(const Ray& ray, const RayMarchSettings& settings = {}) {
    RayMarchResult result{};
    const int maximumSteps = std::max(0, settings.maximumSteps);
    for (int step = 0; step < maximumSteps; ++step) {
        const Vec3 point = ray.origin + ray.direction * result.traveled;
        const SceneSample sample = sampleScene(point);
        result.position = point;
        result.steps = step + 1;
        if (!std::isfinite(sample.distance) || !finite(point)) {
            return result;
        }
        if (sample.distance <= settings.hitEpsilon) {
            result.hit = true;
            result.materialId = sample.materialId;
            return result;
        }
        result.traveled += sample.distance;
        if (result.traveled >= settings.maximumDistance) {
            result.traveled = settings.maximumDistance;
            return result;
        }
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 5
inline Vec3 estimateNormal(const Vec3& point, double epsilon = 0.001) {
    const Vec3 dx{epsilon, 0.0, 0.0};
    const Vec3 dy{0.0, epsilon, 0.0};
    const Vec3 dz{0.0, 0.0, epsilon};
    return normalize({
        sampleScene(point + dx).distance - sampleScene(point - dx).distance,
        sampleScene(point + dy).distance - sampleScene(point - dy).distance,
        sampleScene(point + dz).distance - sampleScene(point - dz).distance,
    });
}
#endif

#if LAB_CHECKPOINT >= 8
inline double softShadow(
    const Vec3& origin,
    const Vec3& direction,
    double maximumDistance,
    int maximumSteps = 48
) {
    double visibility = 1.0;
    double traveled = 0.02;
    for (int step = 0; step < maximumSteps && traveled < maximumDistance; ++step) {
        const double distance = sampleScene(origin + direction * traveled).distance;
        if (distance < 0.001) {
            return 0.0;
        }
        visibility = std::min(visibility, 14.0 * distance / traveled);
        traveled += std::clamp(distance, 0.01, 0.35);
    }
    return std::clamp(visibility, 0.0, 1.0);
}
#endif

#if LAB_CHECKPOINT >= 9
struct RayMarchValidationReport {
    bool centerRayFinite{};
    bool sphereSignCorrect{};
    bool sphereHitDetected{};
    bool missStopsAtGuard{};
    bool normalPointsOutward{};
    bool primitiveSurfacesCorrect{};
    bool materialIdsStable{};
    bool shadowBounded{};

    bool allPassed() const {
        return centerRayFinite && sphereSignCorrect && sphereHitDetected && missStopsAtGuard &&
            normalPointsOutward && primitiveSurfacesCorrect && materialIdsStable && shadowBounded;
    }
};

inline RayMarchValidationReport validateRayMarchRoom() {
    const OrbitCamera camera{};
    const Ray centerRay = makeCameraRay(camera, 479.5, 319.5, 960, 640);
    const Ray sphereRay{{-1.0, -0.18, 4.0}, {0.0, 0.0, -1.0}};
    const Ray missRay{{0.0, 0.0, 4.0}, {0.0, 0.0, 1.0}};
    const RayMarchResult sphereHit = marchRay(sphereRay);
    const RayMarchResult miss = marchRay(missRay, {12, 0.0015, 8.0});
    const Vec3 sphereSurface{-0.18, -0.18, 0.15};
    const Vec3 normal = estimateNormal(sphereSurface);
    const bool primitiveSurfaces =
        std::abs(sdBox({1.62, -0.32, 0.1}, {1.0, -0.32, 0.1}, {0.62, 0.68, 0.62})) <
            1.0e-9 &&
        std::abs(sdTorus({0.99, 0.32, -1.25}, {0.05, 0.32, -1.25}, 0.72, 0.22)) <
            1.0e-9;
    const bool materialIds = sampleScene({-1.0, -0.18, 0.15}).materialId == 1 &&
        sampleScene({1.0, -0.32, 0.1}).materialId == 2 &&
        sampleScene({0.77, 0.32, -1.25}).materialId == 3;
    const double visibility = softShadow({0.0, 0.0, 1.5}, normalize({-0.5, 0.8, 0.3}), 8.0);
    return {
        finite(centerRay.origin) && finite(centerRay.direction) &&
            std::abs(length(centerRay.direction) - 1.0) < 1.0e-9,
        sdSphere({-1.0, -0.18, 0.15}, {-1.0, -0.18, 0.15}, 0.82) < 0.0 &&
            std::abs(sdSphere(sphereSurface, {-1.0, -0.18, 0.15}, 0.82)) < 1.0e-9,
        sphereHit.hit && sphereHit.materialId == 1,
        !miss.hit && miss.steps <= 12 && miss.traveled <= 8.0,
        dot(normal, {1.0, 0.0, 0.0}) > 0.99,
        primitiveSurfaces,
        materialIds,
        visibility >= 0.0 && visibility <= 1.0,
    };
}
#endif

} // namespace lab
