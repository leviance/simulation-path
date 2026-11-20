#pragma once
#include "math.hpp"
#include <optional>

namespace slice53 {
// Provided viewer scaffold: orbit changes the observer, never the voxel coordinates.
struct Camera {
    double yaw = 0.88;
    double pitch = 0.55;
    double distance = 320;

    void limit() {
        if (!std::isfinite(yaw) || !std::isfinite(pitch) || !std::isfinite(distance))
            throw std::invalid_argument("Camera parameters must be finite");
        pitch = std::clamp(pitch, -1.05, 1.25);
        distance = std::clamp(distance, 280.0, 1000.0);
    }
};

struct CameraFrame {
    Vec3 eye;
    Vec3 right;
    Vec3 up;
    Vec3 forward;
    double focal;
    int width;
    int height;
};

// [snippet camera-frame]
inline CameraFrame cameraFrame(Camera camera, int width, int height) {
    if (width < 1 || height < 1) throw std::invalid_argument("Positive viewport dimensions required");
    camera.limit();
    const Vec3 eye{camera.distance * std::cos(camera.pitch) * std::sin(camera.yaw), camera.distance * std::sin(camera.pitch), camera.distance * std::cos(camera.pitch) * std::cos(camera.yaw)};
    const Vec3 forward = unit(eye * -1);
    const Vec3 right = unit(cross(forward, {0, 1, 0}));
    return {eye, right, cross(right, forward), forward, height / (2 * std::tan(0.48)), width, height};
}
// [/snippet camera-frame]

inline Vec3 cameraRay(const CameraFrame& frame, double x, double y) {
    return frame.forward + frame.right * ((x - frame.width * 0.5) / frame.focal) + frame.up * ((frame.height * 0.5 - y) / frame.focal);
}

struct Projection { double x; double y; double depth; };

inline std::optional<Projection> project(const CameraFrame& frame, Vec3 point) {
    if (!finite(point)) return std::nullopt;
    const Vec3 delta = point - frame.eye;
    const double depth = dot(delta, frame.forward);
    if (depth <= 1) return std::nullopt;
    return Projection{frame.width * 0.5 + frame.focal * dot(delta, frame.right) / depth, frame.height * 0.5 - frame.focal * dot(delta, frame.up) / depth, depth};
}
} // namespace slice53
