#pragma once
// World dùng mét: +Y hướng lên, X/Z nằm trên mặt sàn.
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <stdexcept>

namespace survey {
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 a, double scale) {
    return {a.x * scale, a.y * scale, a.z * scale};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool finite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

inline Vec3 unit(Vec3 p) {
    const double length = std::sqrt(dot(p, p));
    if (!std::isfinite(length) || length < 1e-12) {
        throw std::invalid_argument("Cannot normalize zero/non-finite vector");
    }
    return p * (1.0 / length);
}

// [snippet:point]
struct Point {
    std::uint32_t id{};
    Vec3 position{};
};

// [/snippet:point]

struct Box {
    Vec3 minimum{};
    Vec3 maximum{};
};

inline bool valid(Box b) {
    return finite(b.minimum) && finite(b.maximum) && b.minimum.x <= b.maximum.x && b.minimum.y <= b.maximum.y && b.minimum.z <= b.maximum.z;
}

// Nhận cả điểm nằm trên mặt hộp. Query rỗng về diện tích vẫn có thể chứa điểm.
inline bool contains(Box b, Vec3 p) {
    return p.x >= b.minimum.x && p.x <= b.maximum.x && p.y >= b.minimum.y && p.y <= b.maximum.y && p.z >= b.minimum.z && p.z <= b.maximum.z;
}

inline bool overlaps(Box a, Box b) {
    return a.maximum.x >= b.minimum.x && a.minimum.x <= b.maximum.x && a.maximum.y >= b.minimum.y && a.minimum.y <= b.maximum.y && a.maximum.z >= b.minimum.z && a.minimum.z <= b.maximum.z;
}

inline Box around(Vec3 center, Vec3 half) {
    return {center - half, center + half};
}

struct Plane {
    Vec3 normal{};
    double distance{};
};

inline double signedDistance(Plane plane, Vec3 p) {
    return dot(plane.normal, p) + plane.distance;
}

inline double planeTolerance(Plane plane) {
    return 1e-9 * (1.0 + std::abs(plane.distance) + std::abs(plane.normal.x) + std::abs(plane.normal.y) + std::abs(plane.normal.z));
}

enum class Shape {
    Box,
    Sphere,
    Frustum
};

// [snippet:region]
struct Region {
    Shape shape = Shape::Box;
    Vec3 center{0, 2, 0};
    Vec3 half{3, 2, 3};
    double radius = 3;
    double minimumHeight = -10000;
    double maximumHeight = 10000;
    std::array<Plane, 6> planes{};
};

// [/snippet:region]

// [snippet:accepts]
inline bool accepts(const Region& region, Vec3 p) {
    if (p.y < region.minimumHeight || p.y > region.maximumHeight) {
        return false;
    }
    if (region.shape == Shape::Box) {
        return contains(around(region.center, region.half), p);
    }
    if (region.shape == Shape::Sphere) {
        const Vec3 delta = p - region.center;
        return dot(delta, delta) <= region.radius * region.radius;
    }
    for (const Plane& plane : region.planes) {
        if (signedDistance(plane, p) < -planeTolerance(plane)) {
            return false;
        }
    }
    return true;
}

// [/snippet:accepts]

// [snippet:mayOverlap]
inline bool mayOverlap(const Region& region, Box box) {
    if (box.maximum.y < region.minimumHeight || box.minimum.y > region.maximumHeight) {
        return false;
    }
    if (region.shape == Shape::Box) {
        return overlaps(box, around(region.center, region.half));
    }
    if (region.shape == Shape::Sphere) {
        const Vec3 closest{
            std::clamp(region.center.x, box.minimum.x, box.maximum.x),
            std::clamp(region.center.y, box.minimum.y, box.maximum.y),
            std::clamp(region.center.z, box.minimum.z, box.maximum.z)};
        const Vec3 delta = closest - region.center;
        return dot(delta, delta) <= region.radius * region.radius;
    }
    for (const Plane& plane : region.planes) {
        Vec3 positive = box.minimum;
        if (plane.normal.x >= 0) {
            positive.x = box.maximum.x;
        }
        if (plane.normal.y >= 0) {
            positive.y = box.maximum.y;
        }
        if (plane.normal.z >= 0) {
            positive.z = box.maximum.z;
        }
        if (signedDistance(plane, positive) < -planeTolerance(plane)) {
            return false;
        }
    }
    return true;
}

// [/snippet:mayOverlap]
} // namespace survey
