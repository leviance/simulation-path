#include "query.hpp"
#include "validation.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Checks remain active under NDEBUG, so Release runs real tests too.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool closeEnough(double a, double b, double tolerance = 1e-9) {
    return std::isfinite(a) && std::abs(a - b) <= tolerance;
}

void checkHit(const std::optional<picking::Hit>& hit, double t, std::string_view label) {
    check(hit.has_value(), label);
    if (hit) {
        check(closeEnough(hit->t, t), label);
        check(closeEnough(picking::length(hit->normal), 1), "normal has unit length");
        check(picking::finite(hit->point), "finite point");
    }
}
} // namespace

int main() {
    using namespace picking;
    // Projection and unprojection must agree at different aspect ratios.
    const Camera camera;
    for (double aspect : {0.6, 1.0, 1.5, 2.5}) {
        for (double u : {0.0, 0.25, 0.5, 1.0}) {
            for (double v : {0.0, 0.5, 1.0}) {
                const auto ray = cameraRay(camera, u, v, aspect);
                const auto pixel = project(at(ray, 5), camera, 600 * aspect, 600);
                check(closeEnough(length(ray.direction), 1), "camera ray normalized");
                check(pixel.has_value(), "ray sample projects");
                if (pixel) {
                    check(closeEnough(pixel->x, u * 600 * aspect), "projection x round trip");
                    check(closeEnough(pixel->y, v * 600), "projection y round trip");
                }
            }
        }
    }
    const Plane plane{{0, 0, 0}, {0, 2, 0}};
    Ray down{{0, 2, 0}, {0, -1, 0}};
    checkHit(intersectPlane(down, plane), 2, "plane forward");
    check(!intersectPlane({{0, 2, 0}, {1, 0, 0}}, plane), "plane parallel");
    check(!intersectPlane({{0, 0, 0}, {1, 0, 0}}, plane), "plane coplanar");
    check(!intersectPlane({{0, 2, 0}, {1, -1e-12, 0}}, plane), "plane near parallel threshold");
    check(!intersectPlane({{0, 2, 0}, {0, 1, 0}}, plane), "plane behind origin");
    check(!intersectPlane({{0, 2, 0}, {0, -1, 0}, 0, 1}, plane), "plane beyond range");
    const Sphere sphere{{0, 0, 0}, 1};
    checkHit(intersectSphere({{0, 0, -3}, {0, 0, 1}}, sphere), 2, "sphere entry");
    checkHit(intersectSphere({{0, 0, -3}, {0, 0, 2}}, sphere), 1, "nonunit direction");
    checkHit(intersectSphere({{0, 0, 0}, {0, 0, 1}}, sphere), 1, "sphere inside exit");
    checkHit(intersectSphere({{1, 0, -3}, {0, 0, 1}}, sphere), 3, "sphere tangent");
    checkHit(intersectSphere({{1, 0, 0}, {0, 0, 1}, 0, 2}, sphere), 0, "tangent q zero");
    check(!intersectSphere({{1, 0, 0}, {0, 0, 1}}, sphere), "tangent excluded at origin");
    check(!intersectSphere({{1.001, 0, -3}, {0, 0, 1}}, sphere), "sphere miss");
    check(!intersectSphere({{0, 0, -3}, {0, 0, -1}}, sphere), "sphere both roots behind");
    checkHit(intersectSphere({{0, 0, -3}, {0, 0, 1}, 2.5, 4}, sphere), 4, "skip entry choose exit");
    const Box box{{-1, -1, -1}, {1, 1, 1}};
    const auto interval = boxInterval({{0, 0, -3}, {0, 0, 1}}, box);
    check(interval && closeEnough(interval->entry, 2) && closeEnough(interval->exit, 4), "box interval");
    checkHit(intersectBox({{0, 0, -3}, {0, 0, 1}}, box), 2, "box entry");
    checkHit(intersectBox({{0, 0, 0}, {0, 0, 1}}, box), 1, "box inside surface, not tMin");
    check(!intersectBox({{0, 0, 0}, {0, 0, 1}, 0.1, 0.5}, box), "segment inside volume has no surface");
    checkHit(intersectBox({{1, 0, -3}, {0, 0, 1}}, box), 2, "box parallel boundary");
    check(!intersectBox({{1.01, 0, -3}, {0, 0, 1}}, box), "box parallel outside");
    checkHit(intersectBox({{0, 0, 3}, {0, 0, -1}}, box), 2, "box reverse direction");
    check(!intersectBox({{0, 0, 0}, {1, 0, 0}}, {{1, 1, 1}, {-1, -1, -1}}), "invalid box bounds");
    const Triangle triangle{{-1, -1, 0}, {1, -1, 0}, {0, 1, 0}};
    Ray front{{0, 0, -3}, {0, 0, 1}};
    const auto triangleHit = intersectTriangle(front, triangle);
    checkHit(triangleHit, 3, "triangle center");
    if (triangleHit) {
        const double w = 1 - triangleHit->u - triangleHit->v;
        const auto reconstructed = add(add(multiply(triangle.a, w), multiply(triangle.b, triangleHit->u)), multiply(triangle.c, triangleHit->v));
        check(closeEnough(length(subtract(reconstructed, triangleHit->point)), 0), "barycentric reconstruction");
        check(!triangleHit->frontFace, "back side remains selectable");
    }
    checkHit(intersectTriangle({{0, 0, 3}, {0, 0, -1}}, triangle), 3, "triangle opposite side");
    checkHit(intersectTriangle({{-1, -1, -3}, {0, 0, 1}}, triangle), 3, "triangle vertex closed");
    checkHit(intersectTriangle({{0, -1, -3}, {0, 0, 1}}, triangle), 3, "triangle edge closed");
    check(!intersectTriangle({{2, 0, -3}, {0, 0, 1}}, triangle), "triangle outside");
    check(!intersectTriangle(front, {{0, 0, 0}, {1, 0, 0}, {2, 0, 0}}), "degenerate triangle");
    check(!intersectTriangle({{0, 0, -3}, {1, 0, 0}}, triangle), "triangle parallel");
    std::array<std::optional<Hit>, 4> hits{};
    hits[0] = makeHit(front, 4, {0, 0, -1}, 0);
    hits[1] = makeHit(front, 2, {0, 0, -1}, 1);
    hits[2] = makeHit(front, 2, {0, 0, -1}, 2);
    check(nearestHit(hits)->objectId == 1, "nearest tie by stable ID");
    std::reverse(hits.begin(), hits.end());
    check(nearestHit(hits)->objectId == 1, "query order independent");
    check(!nearestHit({}), "empty scene miss");
    // Invalid inputs may not leak NaN or infinity into a Hit record.
    const double nan = std::numeric_limits<double>::quiet_NaN();
    const Ray invalids[]{{{nan, 0, 0}, {0, 0, 1}}, {{0, 0, 0}, {}}, {{0, 0, 0}, {0, 0, 1}, 2, 1}, {{0, 0, 0}, {0, 0, 1}, 0, nan}};
    for (const Ray& ray : invalids) {
        check(!intersectPlane(ray, plane), "invalid plane ray");
        check(!intersectSphere(ray, sphere), "invalid sphere ray");
        check(!intersectBox(ray, box), "invalid box ray");
        check(!intersectTriangle(ray, triangle), "invalid triangle ray");
    }
    check(!intersectSphere(front, {{0, 0, 0}, -1}), "invalid radius");
    check(!intersectPlane(front, {{0, 0, 0}, {}}), "invalid plane normal");
    // Independent surface equations catch a plausible t paired with a wrong point.
    const Scene scene;
    for (int yi = 0; yi <= 12; ++yi) {
        for (int xi = 0; xi <= 16; ++xi) {
            const auto ray = cameraRay(camera, xi / 16.0, yi / 12.0, 1.5);
            const auto all = candidates(ray, scene);
            for (const auto& hit : all) {
                if (!hit)
                    continue;
                check(closeEnough(length(hit->normal), 1), "scene unit normal");
                check(hit->frontFace == (dot(ray.direction, hit->normal) < 0), "scene front face");
                if (hit->objectId == 0)
                    check(closeEnough(dot(subtract(hit->point, scene.plane.point), scene.plane.normal), 0), "plane residual");
                if (hit->objectId == 1)
                    check(closeEnough(length(subtract(hit->point, scene.sphere.center)), scene.sphere.radius), "sphere residual");
                if (hit->objectId == 2) {
                    const auto p = hit->point;
                    const auto lo = scene.box.minimum;
                    const auto hi = scene.box.maximum;
                    check(p.x >= lo.x - 1e-9 && p.x <= hi.x + 1e-9 && p.y >= lo.y - 1e-9 && p.y <= hi.y + 1e-9 && p.z >= lo.z - 1e-9 && p.z <= hi.z + 1e-9, "box point within bounds");
                    check(closeEnough(p.x, lo.x) || closeEnough(p.x, hi.x) || closeEnough(p.y, lo.y) || closeEnough(p.y, hi.y) || closeEnough(p.z, lo.z) || closeEnough(p.z, hi.z), "box point on surface");
                }
                if (hit->objectId == 3) {
                    const auto reconstructed = add(add(multiply(scene.triangle.a, 1 - hit->u - hit->v), multiply(scene.triangle.b, hit->u)), multiply(scene.triangle.c, hit->v));
                    check(closeEnough(length(subtract(reconstructed, hit->point)), 0), "scene triangle residual");
                }
            }
        }
    }
    const auto sceneRay = cameraRay(camera, 0.5, 0.5, 1.5);
    auto sceneHits = candidates(sceneRay, scene);
    check(validateHits(sceneRay, scene, sceneHits).failures == 0, "valid reported hits");
    sceneHits[1] = makeHit(sceneRay, 3, {1, 0, 0}, 1);
    check(validateHits(sceneRay, scene, sceneHits).failures > 0, "validator catches forged sphere point");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Ray intersection tests passed\n";
    return EXIT_SUCCESS;
}
