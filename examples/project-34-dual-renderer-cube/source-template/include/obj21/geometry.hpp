#pragma once
#include <algorithm>
#include <array>
#include <charconv>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <fstream>
#include <istream>
#include <limits>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>

namespace obj21 {
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 operator-(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 operator*(Vec3 value, double scalar) {
    return {value.x * scalar, value.y * scalar, value.z * scalar};
}

inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline Vec3 cross(Vec3 left, Vec3 right) {
    return {
        left.y * right.z - left.z * right.y,
        left.z * right.x - left.x * right.z,
        left.x * right.y - left.y * right.x,
    };
}

inline double length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline std::optional<Vec3> normalized(Vec3 value, double epsilon = 1e-9) {
    const double magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude <= epsilon) {
        return std::nullopt;
    }
    return value * (1.0 / magnitude);
}

inline Vec3 rotateModelPoint(Vec3 point, double angleX, double angleY) {
    const double cosineY = std::cos(angleY);
    const double sineY = std::sin(angleY);
    const Vec3 afterY{
        point.x * cosineY + point.z * sineY,
        point.y,
        -point.x * sineY + point.z * cosineY,
    };
    const double cosineX = std::cos(angleX);
    const double sineX = std::sin(angleX);
    return {
        afterY.x,
        afterY.y * cosineX - afterY.z * sineX,
        afterY.y * sineX + afterY.z * cosineX,
    };
}

inline Vec3 toCameraPoint(Vec3 point, double angleX, double angleY, double distance) {
    Vec3 cameraPoint = rotateModelPoint(point, angleX, angleY);
    cameraPoint.z += distance;
    return cameraPoint;
}

// Camera orbit di chuyển quanh origin. Model không đổi khi chỉ đổi góc nhìn.
struct OrbitCamera {
    double yaw{};
    double pitch{};
    double distance{4.2};
};

inline Vec3 cameraEye(const OrbitCamera& camera) {
    // Orbit dùng tọa độ cầu: độ cao theo pitch không phụ thuộc yaw.
    const double horizontalRadius = camera.distance * std::cos(camera.pitch);
    return {-horizontalRadius * std::sin(camera.yaw), camera.distance * std::sin(camera.pitch), -horizontalRadius * std::cos(camera.yaw)};
}

inline Vec3 worldToCamera(Vec3 point, const OrbitCamera& camera) {
    const Vec3 eye = cameraEye(camera);
    const Vec3 forward = *normalized(Vec3{} - eye);
    const Vec3 right = *normalized(cross({0.0, 1.0, 0.0}, forward));
    const Vec3 up = cross(forward, right);
    const Vec3 relative = point - eye;
    return {dot(relative, right), dot(relative, up), dot(relative, forward)};
}

struct ScreenVertex {
    double x{};
    double y{};
    double ndcDepth{};
};

inline std::optional<ScreenVertex> projectVertex(
    Vec3 point,
    int width,
    int height,
    double nearPlane = 0.7,
    double farPlane = 20.0
) {
    if (width <= 0 || height <= 0 || !std::isfinite(point.x) || !std::isfinite(point.y) || !std::isfinite(point.z) || nearPlane <= 0.0 || farPlane <= nearPlane || point.z < nearPlane || point.z > farPlane) {
        return std::nullopt;
    }
    const double focalScale = 1.0 / std::tan(3.14159265358979323846 / 6.0);
    const double aspectRatio = double(width) / double(height);
    const double ndcX = point.x * focalScale / (aspectRatio * point.z);
    const double ndcY = point.y * focalScale / point.z;
    const double depthRange = farPlane - nearPlane;
    const double ndcDepth = farPlane / depthRange - nearPlane * farPlane / (depthRange * point.z);
    return ScreenVertex{
        (ndcX * 0.5 + 0.5) * double(width),
        (0.5 - ndcY * 0.5) * double(height),
        ndcDepth,
    };
}

} // namespace obj21
