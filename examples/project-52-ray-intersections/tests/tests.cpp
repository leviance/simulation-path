#include "query.hpp"
#include "raster.hpp"
#include "scan.hpp"
#include "validation.hpp"
#include "workshop.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Checks remain active under NDEBUG, so Release runs real tests too.
// [snippet test-runner]
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

// [/snippet test-runner]

bool closeEnough(double a, double b, double tolerance = 1e-9) {
    return std::isfinite(a) && std::abs(a - b) <= tolerance;
}

void checkHit(const std::optional<picking::Hit>& hit, double t, std::string_view label) {
    check(hit.has_value(), label);
    if (hit) {
        check(closeEnough(hit->t, t), label);
        check(closeEnough(picking::length(hit->normal), 1, 1e-10), "normal has unit length");
        check(picking::finite(hit->point), "finite point");
    }
}
} // namespace

int main() {
    using namespace picking;
    Scan scan;
    const double first = scan.advance(0.05);
    const double heldPhase = scan.phase;
    // Pausing calls no advance; elapsed wall time must not enter the next dt.
    check(closeEnough(first, 0.5 + 0.35 * std::sin(0.04)), "scan follows running time");
    check(closeEnough(scan.advance(0.05), 0.5 + 0.35 * std::sin(heldPhase + 0.04)), "resume preserves phase");
    scan.reset();
    check(scan.phase == 0 && closeEnough(scan.advance(0), 0.5), "scan reset ignores uptime");
    check(closeEnough(scan.advance(10), 0.5 + 0.35 * std::sin(0.08)), "scan clamps a real long frame");
    // Projection and unprojection must agree at different aspect ratios.
    // [snippet camera-roundtrip]
    const Camera camera;
    for (double aspect : {0.6, 1.0, 1.5, 2.5}) {
        for (double u : {0.0, 0.25, 0.5, 1.0}) {
            for (double v : {0.0, 0.5, 1.0}) {
                const auto ray = cameraRay(camera, u, v, aspect);
                const auto pixel = project(at(ray, 5), camera, 600 * aspect, 600);
                check(closeEnough(length(ray.direction), 1, 1e-10), "camera ray normalized");
                check(pixel.has_value(), "ray sample projects");
                if (pixel) {
                    check(closeEnough(pixel->x, u * 600 * aspect, 1e-7), "projection x round trip");
                    check(closeEnough(pixel->y, v * 600, 1e-7), "projection y round trip");
                }
            }
        }
    }
    // [/snippet camera-roundtrip]
    const Plane plane{{0, 0, 0}, {0, 2, 0}};
    Ray down{{0, 2, 0}, {0, -1, 0}};
    checkHit(intersectPlane(down, plane), 2, "plane forward");
    check(!intersectPlane({{0, 2, 0}, {1, 0, 0}}, plane), "plane parallel");
    check(!intersectPlane({{0, 0, 0}, {1, 0, 0}}, plane), "plane coplanar");
    check(!intersectPlane({{0, 2, 0}, {1, -1e-12, 0}}, plane), "plane near parallel threshold");
    check(!intersectPlane({{0, 2, 0}, {0, 1, 0}}, plane), "plane behind origin");
    check(!intersectPlane({{0, 2, 0}, {0, -1, 0}, 0, 1}, plane), "plane beyond range");
    const Sphere sphere{{0, 0, 0}, 1};
    const auto sphereRange = sphereInterval({{0, 0, -3}, {0, 0, 1}}, sphere);
    check(sphereRange && closeEnough(sphereRange->entry, 2) && closeEnough(sphereRange->exit, 4), "sphere geometric interval");
    const auto insideSphere = sphereInterval({{0, 0, 0}, {0, 0, 1}}, sphere);
    check(insideSphere && closeEnough(insideSphere->entry, -1) && closeEnough(insideSphere->exit, 1), "inside sphere keeps negative entry");
    const auto tangentRange = sphereInterval({{1, 0, -3}, {0, 0, 1}}, sphere);
    check(tangentRange && closeEnough(tangentRange->entry, 3) && closeEnough(tangentRange->exit, 3), "tangent is a zero length interval");
    check(!intersectSphere({{0, 0, 0}, {0, 0, 1}, 0.1, 0.5}, sphere), "inside sphere segment may have no surface hit");
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
        // [snippet triangle-reconstruction]
        const double w = 1 - triangleHit->u - triangleHit->v;
        const auto reconstructed = add(add(multiply(triangle.a, w), multiply(triangle.b, triangleHit->u)), multiply(triangle.c, triangleHit->v));
        check(closeEnough(length(subtract(reconstructed, triangleHit->point)), 0), "barycentric reconstruction");
        // [/snippet triangle-reconstruction]
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
    Scene aligned;
    aligned.sphere = sphere;
    aligned.box = {{-0.5, -0.5, 2}, {0.5, 0.5, 4}};
    aligned.triangle = {{-1, -1, 5}, {1, -1, 5}, {0, 1, 5}};
    const auto actualCandidates = candidates(front, aligned);
    checkHit(actualCandidates[1], 2, "aligned sphere analytic t");
    checkHit(actualCandidates[2], 5, "aligned box analytic t");
    checkHit(actualCandidates[3], 8, "aligned triangle analytic t");
    const auto actualNearest = nearestHit(actualCandidates);
    check(actualNearest && actualNearest->objectId == 1 && closeEnough(actualNearest->t, 2), "nearest across real primitive routines");
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
                check(closeEnough(length(hit->normal), 1, 1e-10), "scene unit normal");
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
    const auto sphereProbe = cameraRay(camera, 0.37, 0.5, aimAspect);
    auto alteredNormals = candidates(sphereProbe, scene);
    check(alteredNormals[1].has_value(), "normal tolerance fixture hits sphere");
    if (alteredNormals[1]) {
        alteredNormals[1]->normal = multiply(alteredNormals[1]->normal, 1 + 5e-9);
        check(validateHits(sphereProbe, scene, alteredNormals).failures > 0, "normal tolerance is not a world distance tolerance");
    }

    // View navigation changes only presentation, never the emitter/query.
    Workshop workshop;
    const Ray held = workshop.ray();
    workshop.observer.rotate(100, -30);
    workshop.observer.zoom(3);
    workshop.observer.pan(40, 20);
    check(length(subtract(workshop.ray().origin, held.origin)) == 0, "observer leaves ray origin unchanged");
    check(length(subtract(workshop.ray().direction, held.direction)) == 0, "observer leaves ray direction unchanged");
    const Vec3 beforeExtent = subtract(workshop.scene.box.maximum, workshop.scene.box.minimum);
    translateObject(workshop.scene, 2, {100, 100, 100});
    check(length(subtract(subtract(workshop.scene.box.maximum, workshop.scene.box.minimum), beforeExtent)) < 1e-12, "box translation preserves its dimensions");
    check(objectCenter(workshop.scene, 2).x == 5, "object translation clamps center");
    const Vec3 directionBefore = workshop.ray().direction;
    workshop.moveSource({0.2, 0.3, -0.1});
    check(length(subtract(workshop.ray().direction, directionBefore)) < 1e-12, "source translation preserves its orientation");
    workshop.aimAtSelected();
    const Vec3 expectedDirection = normalize(subtract(objectCenter(workshop.scene, workshop.selected), workshop.emitter.origin));
    check(length(subtract(workshop.ray().direction, expectedDirection)) < 1e-12, "aim selected uses world geometry");
    const auto verticalBasis = cameraBasis({{0, 0, 0}, {0, 1, 0}});
    check(closeEnough(length(verticalBasis.right), 1) && closeEnough(dot(verticalBasis.right, verticalBasis.forward), 0), "vertical camera has an orthonormal fallback");

    // Known camera depths 3 and 4 are an independent oracle for depth ordering.
    Raster raster(64, 64);
    const Camera testCamera{{0, 0, -3}, {0, 0, 0}};
    raster.begin(testCamera);
    raster.triangle({-1, -1, 1}, {1, -1, 1}, {0, 1, 1}, {0, 0, 255});
    raster.triangle({-1, -1, 0}, {1, -1, 0}, {0, 1, 0}, {255, 0, 0});
    const int centerPixel = 32 * 64 + 32;
    check(closeEnough(raster.inverseDepth[centerPixel], 1.0 / 3), "raster stores reciprocal camera depth");
    check((raster.pixels[centerPixel] & 0xff) == 0 && ((raster.pixels[centerPixel] >> 16) & 0xff) > 0, "front red surface occludes back blue surface");
    raster.triangle({-1, -1, 1}, {1, -1, 1}, {0, 1, 1}, {0, 0, 255});
    check((raster.pixels[centerPixel] & 0xff) == 0, "later back draw cannot overwrite nearer pixel");
    raster.triangle({-1, -1, -3.2}, {1, -1, -2}, {0, 1, -2}, {0, 255, 0});
    raster.line({-100, 0, -3.2}, {100, 0, -2}, {255, 255, 255});
    check(std::all_of(raster.inverseDepth.begin(), raster.inverseDepth.end(), [](double d) {
              return std::isfinite(d) && d >= 0;
          }),
          "near clipping leaves only finite depth");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Ray intersection tests passed\n";
    return EXIT_SUCCESS;
}
