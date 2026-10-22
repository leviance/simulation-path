#pragma once
#include "geometry.hpp"

namespace lab {
// Near clip từ Project 18: miền inside chính xác, không nới bằng epsilon.
inline std::optional<Vec3> intersectNearPlane(Vec3 a, Vec3 b, double nearPlane) {
    const double delta = b.z - a.z;
    if (!isFinite(a) || !isFinite(b) || !std::isfinite(nearPlane) || nearPlane <= 0 || delta == 0) {
        return std::nullopt;
    }
    const double t = (nearPlane - a.z) / delta;
    if (!std::isfinite(t) || t < 0 || t > 1) {
        return std::nullopt;
    }
    Vec3 p = add(a, scale(subtract(b, a), t));
    p.z = nearPlane;
    if (!isFinite(p)) {
        return std::nullopt;
    }
    return p;
}

inline std::vector<Vec3> clipNear(const Triangle3& triangle, double nearPlane) {
    std::vector<Vec3> output;
    if (!std::isfinite(nearPlane) || nearPlane <= 0) {
        return output;
    }
    for (Vec3 p : triangle) {
        if (!isFinite(p)) {
            return {};
        }
    }
    Vec3 previous = triangle.back();
    bool previousInside = previous.z >= nearPlane;
    for (Vec3 current : triangle) {
        const bool inside = current.z >= nearPlane;
        if (inside != previousInside) {
            const auto p = intersectNearPlane(previous, current, nearPlane);
            if (!p) {
                return {};
            }
            output.push_back(*p);
        }
        if (inside) {
            output.push_back(current);
        }
        previous = current;
        previousInside = inside;
    }
    return output;
}

struct ScreenVertex {
    double x{};
    double y{};
    double inverseZ{};
};

inline std::optional<ScreenVertex> projectVertex(Vec3 p, int width, int height, double nearPlane = 0.5) {
    if (!isFinite(p) || !std::isfinite(nearPlane) || nearPlane <= 0 || p.z < nearPlane || width <= 0 || height <= 0) {
        return std::nullopt;
    }
    const double focalPixels = double(height) * 0.5 / std::tan(3.141592653589793 / 6.0);
    ScreenVertex result{width * 0.5 + focalPixels * p.x / p.z, height * 0.5 - focalPixels * p.y / p.z, 1.0 / p.z};
    if (!std::isfinite(result.x) || !std::isfinite(result.y) || !std::isfinite(result.inverseZ)) {
        return std::nullopt;
    }
    return result;
}

inline double orient2D(ScreenVertex a, ScreenVertex b, double x, double y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline bool topLeft(ScreenVertex a, ScreenVertex b) {
    const double dy = b.y - a.y;
    const double dx = b.x - a.x;
    return dy < 0.0 || (dy == 0.0 && dx > 0.0);
}

inline bool edgeAccepts(double value, bool included) {
    return value > 0.0 || (value == 0.0 && included);
}

// 1/z biến thiên tuyến tính trên screen triangle; giá trị lớn hơn ở gần camera.
template <class WriteFragment>
inline void rasterizeTriangle(std::array<ScreenVertex, 3> t, int width, int height, WriteFragment write) {
    double area = orient2D(t[0], t[1], t[2].x, t[2].y);
    if (!std::isfinite(area) || std::abs(area) < 1e-10 || width <= 0 || height <= 0) {
        return;
    }
    if (area < 0) {
        std::swap(t[1], t[2]);
        area = -area;
    }
    const double lowX = std::min({t[0].x, t[1].x, t[2].x});
    const double highX = std::max({t[0].x, t[1].x, t[2].x});
    const double lowY = std::min({t[0].y, t[1].y, t[2].y});
    const double highY = std::max({t[0].y, t[1].y, t[2].y});
    if (highX < 0 || highY < 0 || lowX >= width || lowY >= height) {
        return;
    }
    const int minX = int(std::clamp(std::floor(lowX), 0.0, double(width - 1)));
    const int maxX = int(std::clamp(std::ceil(highX) - 1.0, -1.0, double(width - 1)));
    const int minY = int(std::clamp(std::floor(lowY), 0.0, double(height - 1)));
    const int maxY = int(std::clamp(std::ceil(highY) - 1.0, -1.0, double(height - 1)));
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double px = x + 0.5, py = y + 0.5;
            const double a = orient2D(t[1], t[2], px, py);
            const double b = orient2D(t[2], t[0], px, py);
            const double c = orient2D(t[0], t[1], px, py);
            if (!edgeAccepts(a, topLeft(t[1], t[2])) || !edgeAccepts(b, topLeft(t[2], t[0])) || !edgeAccepts(c, topLeft(t[0], t[1]))) {
                continue;
            }
            const double inverseZ = (a * t[0].inverseZ + b * t[1].inverseZ + c * t[2].inverseZ) / area;
            write(x, y, inverseZ);
        }
    }
}
} // namespace lab
