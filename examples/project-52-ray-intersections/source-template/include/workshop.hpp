#pragma once
#include "query.hpp"
#include "scan.hpp"
#include <algorithm>

namespace picking {
constexpr double aimAspect = 280.0 / 190.0;

// A view camera is not the ray emitter. Orbiting must never change a held query.
struct Orbit {
    // Frame the three samples and the source in one oblique view. These
    // settings only move the observer; they do not change a single query.
    Vec3 target{0.12, 0.42, -1.82};
    double yaw = -0.24;
    double pitch = 0.35;
    double distance = 8.55;

    Camera camera() const {
        const double horizontal = distance * std::cos(pitch);
        const Vec3 offset{horizontal * std::sin(yaw), distance * std::sin(pitch), -horizontal * std::cos(yaw)};
        return {add(target, offset), target};
    }

    void rotate(double dx, double dy) {
        yaw = std::remainder(yaw + dx * 0.008, 2 * 3.141592653589793);
        pitch = std::clamp(pitch + dy * 0.008, -1.35, 1.35);
    }

    void zoom(double steps) {
        distance = std::clamp(distance * std::exp(-steps * 0.12), 2.0, 28.0);
    }

    void pan(double dx, double dy) {
        const auto basis = cameraBasis(camera());
        const Vec3 offset = add(multiply(basis.right, -dx * distance * 0.0015), multiply(basis.up, dy * distance * 0.0015));
        target = add(target, offset);
        target.x = std::clamp(target.x, -10.0, 10.0);
        target.y = std::clamp(target.y, -10.0, 10.0);
        target.z = std::clamp(target.z, -10.0, 10.0);
    }
};

inline Vec3 objectCenter(const Scene& scene, int objectId) {
    if (objectId == 0) {
        return scene.plane.point;
    }
    if (objectId == 1) {
        return scene.sphere.center;
    }
    if (objectId == 2) {
        return multiply(add(scene.box.minimum, scene.box.maximum), 0.5);
    }
    return multiply(add(add(scene.triangle.a, scene.triangle.b), scene.triangle.c), 1.0 / 3);
}

// [snippet translate-object]
inline void translateObject(Scene& scene, int objectId, Vec3 delta) {
    // Clamp the center, then apply the SAME offset to every vertex/bound.
    const Vec3 center = objectCenter(scene, objectId);
    const Vec3 desired = add(center, delta);
    const Vec3 bounded{std::clamp(desired.x, -5.0, 5.0), std::clamp(desired.y, -3.0, 4.0), std::clamp(desired.z, -4.0, 6.0)};
    delta = subtract(bounded, center);
    if (objectId == 0) {
        scene.plane.point = add(scene.plane.point, delta);
    } else if (objectId == 1) {
        scene.sphere.center = add(scene.sphere.center, delta);
    } else if (objectId == 2) {
        scene.box.minimum = add(scene.box.minimum, delta);
        scene.box.maximum = add(scene.box.maximum, delta);
    } else if (objectId == 3) {
        scene.triangle.a = add(scene.triangle.a, delta);
        scene.triangle.b = add(scene.triangle.b, delta);
        scene.triangle.c = add(scene.triangle.c, delta);
    }
}

// [/snippet translate-object]

struct Workshop {
    Scene scene;
    Orbit observer;
    int selected = 1;
    bool debug = true;
#if LAB_CHECKPOINT >= 2
    Camera emitter;
    double u = 0.37;
    double v = 0.5;
    double tMax = 14;

    Ray ray() const {
        return cameraRay(emitter, u, v, aimAspect, tMax);
    }

    void aimAtSelected() {
        emitter.target = objectCenter(scene, selected);
        u = 0.5;
        v = 0.5;
    }

    void moveSource(Vec3 delta) {
        const Vec3 desired = add(emitter.origin, delta);
        const Vec3 bounded{std::clamp(desired.x, -8.0, 8.0), std::clamp(desired.y, -3.0, 8.0), std::clamp(desired.z, -9.0, 9.0)};
        const Vec3 offset = subtract(bounded, emitter.origin);
        emitter.origin = bounded;
        emitter.target = add(emitter.target, offset);
    }
#endif
#if LAB_CHECKPOINT >= 7
    bool paused = true;
    Scan scan;

    void preset(int index) {
        emitter = presetCamera(index, scene);
        if (index == 1 || index == 2) {
            selected = index;
        }
        u = 0.5;
        v = 0.5;
        paused = true;
        scan.reset();
    }

    void update(double dt) {
        if (!paused) {
            u = scan.advance(dt);
        }
    }
#endif
};
} // namespace picking
