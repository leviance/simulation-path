#pragma once
#include "lab.hpp"
#include <utility>

namespace lab {
// Camera orbit nhìn về world origin. Camera-space +Z là độ sâu vào cảnh.
inline constexpr double kPi = 3.14159265358979323846;

struct Camera {
    double yaw = 0.7;
    double pitch = 0.4;
    double radius = 9.0;
};

inline Vec3 cameraEye(const Camera& camera) {
    const double horizontal = std::cos(camera.pitch);
    return {camera.radius * horizontal * std::sin(camera.yaw), camera.radius * std::sin(camera.pitch), camera.radius * horizontal * std::cos(camera.yaw)};
}

inline Vec3 worldToCamera(Vec3 point, const Camera& camera) {
    const double sy = std::sin(camera.yaw);
    const double cy = std::cos(camera.yaw);
    const double sp = std::sin(camera.pitch);
    const double cp = std::cos(camera.pitch);
    const Vec3 right{cy, 0.0, -sy};
    const Vec3 up{-sp * sy, cp, -sp * cy};
    const Vec3 back{cp * sy, sp, cp * cy};
    return {dot(point, right), dot(point, up), camera.radius - dot(point, back)};
}

struct ProjectedPoint {
    Vec2 screen{};
    bool visible{};
};

inline ProjectedPoint projectPerspective(Vec3 cameraPoint) {
    if (!std::isfinite(cameraPoint.x) || !std::isfinite(cameraPoint.y) || !std::isfinite(cameraPoint.z) || cameraPoint.z < 0.2 || cameraPoint.z > 30.0) {
        return {};
    }
    return {{550.0 + 420.0 * cameraPoint.x / cameraPoint.z, 410.0 - 420.0 * cameraPoint.y / cameraPoint.z}, true};
}

// Clip đoạn trong camera space trước khi chia cho Z; không bỏ cả đoạn chỉ vì một đầu ngoài.
inline bool clipDepth(Vec3& start, Vec3& end) {
    if (!finite(start) || !finite(end)) {
        return false;
    }
    for (const auto plane : {std::pair<double, double>{0.2, 1.0}, std::pair<double, double>{30.0, -1.0}}) {
        const double distanceStart = (start.z - plane.first) * plane.second;
        const double distanceEnd = (end.z - plane.first) * plane.second;
        if (distanceStart < 0.0 && distanceEnd < 0.0) {
            return false;
        }
        if (distanceStart < 0.0 || distanceEnd < 0.0) {
            const double fraction = distanceStart / (distanceStart - distanceEnd);
            Vec3 hit = add(start, scale(subtract(end, start), fraction));
            hit.z = plane.first;
            if (distanceStart < 0.0) {
                start = hit;
            } else {
                end = hit;
            }
        }
    }
    return true;
}

inline void orbit(Camera& camera, double dx, double dy) {
    if (!std::isfinite(dx) || !std::isfinite(dy)) {
        return;
    }
    camera.yaw = std::remainder(camera.yaw + dx * 0.008, 2.0 * kPi);
    camera.pitch = std::clamp(camera.pitch + dy * 0.008, -1.2, 1.2);
}
} // namespace lab
