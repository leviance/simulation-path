#pragma once
// Camera orbit và free-fly dùng cùng basis/phép chiếu; không xoay dataset.
#include "model/geometry.hpp"

namespace survey {
struct Camera {
    Vec3 target{0, 3, 0};
    Vec3 eye{0, 3, 28};
    double yaw = 0.65;
    double pitch = 0.35;
    double distance = 32;
    double nearPlane = 0.05;
    double farPlane = 1000;
    double fov = 1.0471975511965976;
    bool freeFly{};
};

struct Basis {
    Vec3 eye{};
    Vec3 right{};
    Vec3 up{};
    Vec3 forward{};
};

// [snippet:cameraBasis]
inline Basis cameraBasis(const Camera& camera) {
    const Vec3 outward{std::sin(camera.yaw) * std::cos(camera.pitch), std::sin(camera.pitch), std::cos(camera.yaw) * std::cos(camera.pitch)};
    Vec3 eye = camera.target + outward * camera.distance;
    if (camera.freeFly) {
        eye = camera.eye;
    }
    const Vec3 forward = outward * -1;
    const Vec3 right = unit(cross(forward, {0, 1, 0}));
    return {eye, right, cross(right, forward), forward};
}

// [/snippet:cameraBasis]

inline void switchCameraMode(Camera& camera) {
    const Basis before = cameraBasis(camera);
    camera.freeFly = !camera.freeFly;
    camera.eye = before.eye;
    camera.target = before.eye + before.forward * camera.distance;
}

inline void resetCamera(Camera& camera, Box bounds) {
    camera = Camera{};
    camera.target = (bounds.minimum + bounds.maximum) * 0.5;
    const Vec3 extent = bounds.maximum - bounds.minimum;
    camera.distance = std::max({extent.x, extent.y, extent.z, 2.0}) * 1.6;
    camera.farPlane = std::max(1000.0, camera.distance * 4.0);
    camera.eye = cameraBasis(camera).eye;
}

inline void translateCamera(Camera& camera, Vec3 delta) {
    camera.target = camera.target + delta;
    camera.eye = camera.eye + delta;
}

// [snippet:frustum]
inline Region cameraFrustum(const Camera& camera, double aspect) {
    const Basis basis = cameraBasis(camera);
    const double tangent = std::tan(camera.fov * 0.5);
    Region result{};
    result.shape = Shape::Frustum;
    result.planes[0] = {basis.forward, -dot(basis.forward, basis.eye) - camera.nearPlane};
    result.planes[1] = {basis.forward * -1, dot(basis.forward, basis.eye) + camera.farPlane};
    const std::array<Vec3, 4> normals{
        basis.forward * (tangent * aspect) + basis.right,
        basis.forward * (tangent * aspect) - basis.right,
        basis.forward * tangent + basis.up,
        basis.forward * tangent - basis.up};
    for (std::size_t side = 0; side < 4; ++side) {
        result.planes[side + 2] = {normals[side], -dot(normals[side], basis.eye)};
    }
    return result;
}

// [/snippet:frustum]

struct Projection {
    double x{};
    double y{};
    double depth{};
    bool visible{};
};

struct Lens {
    Basis basis{};
    Region frustum{};
    int width{};
    int height{};
    double scale{};
};

inline Lens makeLens(const Camera& camera, int width, int height) {
    return {cameraBasis(camera), cameraFrustum(camera, double(width) / double(height)), width, height, double(height) / (2 * std::tan(camera.fov * 0.5))};
}

// [snippet:project]
inline Projection project(Vec3 p, const Lens& lens) {
    const Vec3 delta = p - lens.basis.eye;
    const double depth = dot(delta, lens.basis.forward);
    if (!accepts(lens.frustum, p) || depth <= 0) {
        return {};
    }
    return {double(lens.width) * 0.5 + dot(delta, lens.basis.right) * lens.scale / depth, double(lens.height) * 0.5 - dot(delta, lens.basis.up) * lens.scale / depth, depth, true};
}

// [/snippet:project]
} // namespace survey
