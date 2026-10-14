#pragma once
#include "query.hpp"

namespace picking {
#if LAB_CHECKPOINT >= 8
// This validates reported hits independently, not whether every possible hit was found.
struct ValidationReport {
    int checks = 0;
    int failures = 0;

    void check(bool condition) {
        ++checks;
        if (!condition)
            ++failures;
    }
};

inline ValidationReport validateHits(const Ray& ray, const Scene& scene, const std::array<std::optional<Hit>, 4>& hits) {
    ValidationReport report;
    constexpr double tolerance = 1e-8;
    report.check(valid(ray));
    for (const auto& hit : hits) {
        if (!hit)
            continue;
        report.check(inRange(ray, hit->t));
        report.check(finite(hit->point) && finite(hit->normal));
        report.check(std::abs(length(hit->normal) - 1) <= tolerance);
        report.check(length(subtract(hit->point, at(ray, hit->t))) <= tolerance);
        report.check(hit->frontFace == (dot(ray.direction, hit->normal) < 0));
        if (hit->objectId == 0) {
            report.check(std::abs(dot(subtract(hit->point, scene.plane.point), normalize(scene.plane.normal))) <= tolerance);
        } else if (hit->objectId == 1) {
            report.check(std::abs(length(subtract(hit->point, scene.sphere.center)) - scene.sphere.radius) <= tolerance);
        } else if (hit->objectId == 2) {
            const auto p = hit->point;
            const auto lo = scene.box.minimum;
            const auto hi = scene.box.maximum;
            report.check(p.x >= lo.x - tolerance && p.x <= hi.x + tolerance && p.y >= lo.y - tolerance && p.y <= hi.y + tolerance && p.z >= lo.z - tolerance && p.z <= hi.z + tolerance);
            const double distanceToFace = std::min({std::abs(p.x - lo.x), std::abs(p.x - hi.x), std::abs(p.y - lo.y), std::abs(p.y - hi.y), std::abs(p.z - lo.z), std::abs(p.z - hi.z)});
            report.check(distanceToFace <= tolerance);
        } else if (hit->objectId == 3) {
            const auto reconstructed = add(add(multiply(scene.triangle.a, 1 - hit->u - hit->v), multiply(scene.triangle.b, hit->u)), multiply(scene.triangle.c, hit->v));
            report.check(hit->u >= 0 && hit->v >= 0 && hit->u + hit->v <= 1);
            report.check(length(subtract(reconstructed, hit->point)) <= tolerance);
        } else {
            report.check(false);
        }
    }
    return report;
}
#endif
} // namespace picking
