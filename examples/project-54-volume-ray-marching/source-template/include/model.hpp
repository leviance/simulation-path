#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <optional>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace fog {
// World units are arbitrary; normalized ray directions make t a world distance.
using Point = std::array<double, 3>;

inline Point add(Point a, Point b) {
    return {a[0] + b[0], a[1] + b[1], a[2] + b[2]};
}

inline Point subtract(Point a, Point b) {
    return {a[0] - b[0], a[1] - b[1], a[2] - b[2]};
}

inline Point multiply(Point a, double scale) {
    return {a[0] * scale, a[1] * scale, a[2] * scale};
}

inline double dot(Point a, Point b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

inline Point cross(Point a, Point b) {
    return {a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]};
}

inline Point normalize(Point p) {
    const double length = std::sqrt(dot(p, p));
    if (!std::isfinite(length) || length == 0) {
        throw std::invalid_argument("Invalid direction");
    }
    return multiply(p, 1 / length);
}

struct Camera {
    double yaw = 0.55;
    double pitch = 0.2;
    double distance = 8.5;
    bool inside = false;
};

struct Basis {
    Point origin;
    Point forward;
    Point right;
    Point up;
};

#if LAB_CHECKPOINT >= 2
inline Basis cameraBasis(Camera camera) {
    Point origin{camera.distance * std::sin(camera.yaw) * std::cos(camera.pitch), camera.distance * std::sin(camera.pitch), -camera.distance * std::cos(camera.yaw) * std::cos(camera.pitch)};
    Point forward = normalize(multiply(origin, -1));
    if (camera.inside) {
        origin = {0, 0, 0};
        forward = {0, 0, 1};
    }
    const Point right = normalize(cross({0, 1, 0}, forward));
    return {origin, forward, right, cross(forward, right)};
}

struct Ray {
    Point origin;
    Point direction;
};

inline Ray cameraRay(Camera camera, double u, double v, double aspect) {
    const auto basis = cameraBasis(camera);
    const double tangent = std::tan(55 * 3.141592653589793 / 360);
    const Point offset = add(multiply(basis.right, (2 * u - 1) * aspect * tangent), multiply(basis.up, (1 - 2 * v) * tangent));
    return {basis.origin, normalize(add(basis.forward, offset))};
}

inline Point at(const Ray& ray, double t) {
    return add(ray.origin, multiply(ray.direction, t));
}
#endif

const Point boxMinimum{-1.6, -1.92, -2.4};
const Point boxMaximum{1.6, 1.92, 2.4};

#if LAB_CHECKPOINT >= 3
struct Interval {
    double entry = 0;
    double exit = 20;
};

inline std::optional<Interval> boxInterval(const Ray& ray, Point minimum = boxMinimum, Point maximum = boxMaximum) {
    if (std::abs(dot(ray.direction, ray.direction) - 1) > 1e-6) {
        throw std::invalid_argument("Marching requires a unit ray");
    }
    Interval interval;
    for (int axis = 0; axis < 3; ++axis) {
        if (!std::isfinite(ray.origin[axis]) || !std::isfinite(ray.direction[axis]) || !std::isfinite(minimum[axis]) || !std::isfinite(maximum[axis]) || minimum[axis] >= maximum[axis]) {
            throw std::invalid_argument("Invalid ray or box");
        }
        if (ray.direction[axis] == 0) {
            if (ray.origin[axis] < minimum[axis] || ray.origin[axis] > maximum[axis]) {
                return std::nullopt;
            }
            continue;
        }
        double entry = (minimum[axis] - ray.origin[axis]) / ray.direction[axis];
        double exit = (maximum[axis] - ray.origin[axis]) / ray.direction[axis];
        if (entry > exit) {
            std::swap(entry, exit);
        }
        interval.entry = std::max(interval.entry, entry);
        interval.exit = std::min(interval.exit, exit);
        if (interval.entry >= interval.exit) {
            return std::nullopt;
        }
    }
    return interval;
}
#endif

struct Settings {
    double sigma = 2;
    double stepLength = 0.08;
    bool warm = true;
    bool early = false;
};

constexpr int maxSteps = 512;
constexpr double stopThreshold = 0.001;

inline void validate(Settings settings) {
    if (!std::isfinite(settings.sigma) || settings.sigma < 0 || settings.sigma > 8 || !std::isfinite(settings.stepLength) || settings.stepLength < 0.02 || settings.stepLength > 0.25) {
        throw std::invalid_argument("sigma 0..8, stepLength 0.02..0.25 required");
    }
}
} // namespace fog
