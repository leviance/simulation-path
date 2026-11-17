#pragma once
#include "geometry.hpp"
#include "layout.hpp"

namespace slices {
struct SliceCamera {
    double yaw = 0.72;
    double pitch = 0.44;
    double distance = 6.9;
};

struct CameraBasis {
    Point eye;
    Point forward;
    Point right;
    Point up;
};

inline CameraBasis cameraBasis(SliceCamera camera) {
    const Point eye{std::sin(camera.yaw) * std::cos(camera.pitch) * camera.distance, -std::cos(camera.yaw) * std::cos(camera.pitch) * camera.distance, std::sin(camera.pitch) * camera.distance};
    return {eye, multiply(eye, -1 / camera.distance), {std::cos(camera.yaw), std::sin(camera.yaw), 0}, {-std::sin(camera.yaw) * std::sin(camera.pitch), std::cos(camera.yaw) * std::sin(camera.pitch), std::cos(camera.pitch)}};
}

inline void limitCamera(SliceCamera& camera) {
    camera.pitch = std::clamp(camera.pitch, 0.05, 1.35);
    camera.distance = std::clamp(camera.distance, 5.3, 12.0);
    camera.yaw = std::remainder(camera.yaw, 2 * std::numbers::pi);
}
} // namespace slices
