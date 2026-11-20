#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <optional>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include "stage.hpp"

namespace volume54 {
// Provided vector scaffold. One world unit is an arbitrary display unit, not mm or HU.
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;

    double& operator[](int axis) {
        if (axis == 0)
            return x;
        if (axis == 1)
            return y;
        return z;
    }

    double operator[](int axis) const {
        if (axis == 0)
            return x;
        if (axis == 1)
            return y;
        return z;
    }
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 a, double s) {
    return {a.x * s, a.y * s, a.z * s};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool finite(Vec3 a) {
    return std::isfinite(a.x) && std::isfinite(a.y) && std::isfinite(a.z);
}

inline Vec3 unit(Vec3 a) {
    const double length = std::sqrt(dot(a, a));
    if (!finite(a) || !std::isfinite(length) || length <= 0)
        throw std::invalid_argument("Finite nonzero direction required");
    return a * (1.0 / length);
}

constexpr Vec3 boxMinimum{-1, -1, -1};
constexpr Vec3 boxMaximum{1, 1, 1};
constexpr int maxSteps = 512;
constexpr double stopThreshold = 0.0005;

struct Ray {
    Vec3 origin;
    Vec3 direction;
};

struct Camera {
    double yaw = 0.35;
    double pitch = 0.16;
    double distance = 3.0;
    bool inside = false;

    void limit() {
        if (!std::isfinite(yaw) || !std::isfinite(pitch) || !std::isfinite(distance))
            throw std::invalid_argument("Nonfinite camera");
        yaw = std::remainder(yaw, 6.283185307179586);
        pitch = std::clamp(pitch, -1.45, 1.45);
        distance = std::clamp(distance, 0.25, 8.0);
    }
};

struct Basis {
    Vec3 origin;
    Vec3 forward;
    Vec3 right;
    Vec3 up;
};

#if LAB_CHECKPOINT >= 2
// [snippet camera-basis]
inline Basis cameraBasis(Camera camera) {
    camera.limit();
    Vec3 origin{camera.distance * std::cos(camera.pitch) * std::sin(camera.yaw), camera.distance * std::sin(camera.pitch), camera.distance * std::cos(camera.pitch) * std::cos(camera.yaw)};
    const Vec3 forward = unit(origin * -1);
    const Vec3 right = unit(cross(forward, {0, 1, 0}));
    if (camera.inside)
        origin = {0, 0, 0};
    return {origin, forward, right, cross(right, forward)};
}

// [/snippet camera-basis]

// [snippet camera-ray]
inline Ray cameraRay(Camera camera, double u, double v, double aspect) {
    if (!std::isfinite(u) || !std::isfinite(v) || !std::isfinite(aspect) || aspect <= 0)
        throw std::invalid_argument("Finite pixel and positive aspect required");
    const Basis basis = cameraBasis(camera);
    const double tangent = std::tan(50.0 * 3.141592653589793 / 360.0);
    const Vec3 horizontal = basis.right * ((2 * u - 1) * aspect * tangent);
    const Vec3 vertical = basis.up * ((1 - 2 * v) * tangent);
    return {basis.origin, unit(basis.forward + horizontal + vertical)};
}

// [/snippet camera-ray]
#endif

inline Vec3 rayAt(const Ray& ray, double distance) {
    return ray.origin + ray.direction * distance;
}

struct Interval {
    double entry = 0;
    double exit = std::numeric_limits<double>::infinity();
};

#if LAB_CHECKPOINT >= 3
// [snippet ray-box]
inline std::optional<Interval> boxInterval(const Ray& ray) {
    if (!finite(ray.origin) || !finite(ray.direction) || std::abs(dot(ray.direction, ray.direction) - 1) > 1e-8)
        throw std::invalid_argument("A finite unit ray is required");
    Interval interval;
    for (int axis = 0; axis < 3; ++axis) {
        if (ray.direction[axis] == 0) {
            if (ray.origin[axis] < -1 || ray.origin[axis] > 1)
                return std::nullopt;
            continue;
        }
        double first = (-1 - ray.origin[axis]) / ray.direction[axis];
        double last = (1 - ray.origin[axis]) / ray.direction[axis];
        if (first > last)
            std::swap(first, last);
        interval.entry = std::max(interval.entry, first);
        interval.exit = std::min(interval.exit, last);
        if (interval.entry >= interval.exit)
            return std::nullopt;
    }
    return interval;
}

// [/snippet ray-box]
#endif

enum class Mode {
    Mip,
    Average,
    Alpha
};

enum class Preset {
    Cloud,
    Cores,
    Slab,
    Constant,
    Ramp,
    Empty
};

inline const char* modeName(Mode mode) {
    if (mode == Mode::Mip)
        return "MIP";
    if (mode == Mode::Average)
        return "AVERAGE";
    return "ALPHA";
}

inline const char* presetName(Preset preset) {
    if (preset == Preset::Cloud)
        return "ANVIL CLOUD / STATIC";
    if (preset == Preset::Cores)
        return "TWIN CORES";
    if (preset == Preset::Slab)
        return "SLAB";
    if (preset == Preset::Constant)
        return "CONSTANT 0.25";
    if (preset == Preset::Ramp)
        return "XYZ RAMP";
    return "EMPTY";
}

struct Settings {
    Mode mode = Mode::Alpha;
    double stepLength = 0.02;
    double sigma = 6;
    double cutoff = 0;
    int palette = 0;
    bool early = false;
    bool lighting = true;
};

inline void validate(Settings settings) {
    const int mode = static_cast<int>(settings.mode);
    if (mode < 0 || mode > 2 || settings.palette < 0 || settings.palette > 2)
        throw std::invalid_argument("Unknown mode or palette");
    if (!std::isfinite(settings.stepLength) || settings.stepLength < 0.008 || settings.stepLength > 0.16)
        throw std::invalid_argument("Step must be 0.008..0.16 world units");
    if (!std::isfinite(settings.sigma) || settings.sigma < 0 || settings.sigma > 12)
        throw std::invalid_argument("Sigma must be 0..12 per world unit");
    if (!std::isfinite(settings.cutoff) || settings.cutoff < 0 || settings.cutoff > 0.8)
        throw std::invalid_argument("Cutoff must be 0..0.8");
}
} // namespace volume54
