#pragma once
#include "gpu/program.hpp"
#include <numbers>

namespace water51 {
struct Camera {
    double yaw = 0.72;
    double pitch = 0.48;
    double distance = 1.95;
    Vec3 target{0.70, 0.22, 0.55};
    Vec3 eye;
    Vec3 forward;
    Vec3 right;
    Vec3 up;
    double focal = 1;

    // [snippet camera-frame]
    void update(int height) {
        pitch = std::clamp(pitch, 0.10, 1.25);
        distance = std::clamp(distance, 1.35, 4.5);
        const double sy = std::sin(yaw), cy = std::cos(yaw), sp = std::sin(pitch), cp = std::cos(pitch);
        eye = add(target, scale({sy * cp, sp, cy * cp}, distance));
        forward = {-sy * cp, -sp, -cy * cp};
        right = {cy, 0, -sy};
        up = {-sy * sp, cp, -cy * sp};
        focal = height / (2 * std::tan(25 * std::numbers::pi / 180));
    }

    // [/snippet camera-frame]

    // [snippet camera-uniforms]
    void uniforms(const Program& program, int width, int height) const {
        program.setVec3("eye", eye);
        program.setVec3("forward", forward);
        program.setVec3("right", right);
        program.setVec3("up", up);
        program.setVec2("viewport", static_cast<float>(width), static_cast<float>(height));
        program.setFloat("focal", static_cast<float>(focal));
    }

    // [/snippet camera-uniforms]

    // [snippet ground-pick]
    Vec3 groundPick(double x, double y, int width, int height) const {
        const auto ray = add(forward, add(scale(right, (x - width / 2.0) / focal), scale(up, (height / 2.0 - y) / focal)));
        if (std::abs(ray.y) < 1e-9)
            throw std::runtime_error("Ray is parallel to the drag plane");
        const double t = (0.22 - eye.y) / ray.y;
        if (t <= 0)
            throw std::runtime_error("Drag plane is behind the camera");
        return add(eye, scale(ray, t));
    }

    // [/snippet ground-pick]
};
} // namespace water51
