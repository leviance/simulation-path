#pragma once
#include "box.hpp"
#include "sphere.hpp"
#include "triangle.hpp"
#include <array>

namespace picking {
#if LAB_CHECKPOINT >= 3
// Keep all individual hits visible even before nearest-hit selection is taught.
inline std::array<std::optional<Hit>, 4> candidates(const Ray& ray, const Scene& scene) {
    std::array<std::optional<Hit>, 4> hits{};
    hits[0] = intersectPlane(ray, scene.plane);
#if LAB_CHECKPOINT >= 4
    hits[1] = intersectSphere(ray, scene.sphere);
#endif
#if LAB_CHECKPOINT >= 5
    hits[2] = intersectBox(ray, scene.box);
#endif
#if LAB_CHECKPOINT >= 6
    hits[3] = intersectTriangle(ray, scene.triangle);
#endif
    return hits;
}
#endif

#if LAB_CHECKPOINT >= 7
inline std::optional<Hit> nearestHit(const std::array<std::optional<Hit>, 4>& hits) {
    std::optional<Hit> best;
    for (const auto& hit : hits) {
        if (!hit) {
            continue;
        }
        if (!best || hit->t < best->t || (hit->t == best->t && hit->objectId < best->objectId)) {
            best = hit;
        }
    }
    return best;
}

inline Camera presetCamera(int preset, const Scene& scene) {
    Camera camera;
    if (preset == 1) {
        camera.origin = scene.sphere.center;
        camera.target = add(camera.origin, {0, 0, 1});
    }
    if (preset == 2) {
        camera.origin = multiply(add(scene.box.minimum, scene.box.maximum), 0.5);
        camera.target = add(camera.origin, {0, 0, 1});
    }
    if (preset == 3) {
        camera.target = add(camera.origin, {0, 0, -1});
    }
    return camera;
}
#endif
} // namespace picking
