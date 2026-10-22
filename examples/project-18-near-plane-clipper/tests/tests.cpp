#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures{};

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool close(double a, double b, double e = 1e-9) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= e;
}

lab::ClipVertex v(double x, double y, double z, double red = 0.0) {
    return {{x, y, z}, {red, 0, 0}};
}

lab::Vec3 sub(lab::Vec3 a, lab::Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

lab::Vec3 cross(lab::Vec3 a, lab::Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

double dot(lab::Vec3 a, lab::Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

lab::Vec3 normal(const lab::Triangle3& t) {
    return cross(sub(t.b.position, t.a.position), sub(t.c.position, t.a.position));
}

double area(const lab::Triangle3& t) {
    const auto n = normal(t);
    return .5 * std::sqrt(dot(n, n));
}

void safe(const lab::ClippedPolygon& p) {
    check(p.valid && p.count <= 4, "bounded valid clipped polygon");
    for (std::size_t i = 0; i < p.count; ++i) {
        check(lab::isFinite(p.vertices[i]) && p.vertices[i].position.z >= 1.0, "every retained vertex projects safely");
        if (p.count > 1) {
            check(!lab::samePosition(p.vertices[i], p.vertices[(i + 1) % p.count]), "no adjacent or closing duplicate");
        }
    }
}
} // namespace

int main() {
    // Oracle scalar và endpoint: không tạo giao điểm giả cho cạnh song song.
    check(close(lab::signedDistance(v(0, 0, 2), {{0, 0, 1}, -1}), 1), "unit Plane signed distance");
    check(!lab::isInsideNearPlane(v(0, 0, 1.0 - 0.5e-9), 1), "epsilon never expands exact kept half-space");
    check(lab::isInsideNearPlane(v(0, 0, 1), 1), "on-plane endpoint is inside");
    const auto hit = lab::intersectNearPlane(v(-2, 0, .5, 0), v(2, 0, 1.5, 100), 1);
    check(hit && close(hit->position.x, 0) && hit->position.z == 1 && close(hit->color.red, 50), "midpoint intersection and RGB share t");
    const auto reverse = lab::intersectNearPlane(v(2, 0, 1.5, 100), v(-2, 0, .5, 0), 1);
    check(hit && reverse && close(hit->position.x, reverse->position.x) && close(hit->color.red, reverse->color.red), "edge reversal preserves intersection");
    check(!lab::intersectNearPlane(v(0, 0, .5), v(1, 0, .5), 1), "parallel segment has no fabricated intersection");
    check(!lab::intersectNearPlane(v(0, 0, 2), v(1, 0, 3), 1), "infinite-line hit outside segment rejected");
    const double tiny = std::ldexp(1.0, -42);
    const auto tinyHit = lab::intersectNearPlane(v(-2, 0, 1 - tiny, 0), v(2, 0, 1 + tiny, 100), 1);
    check(tinyHit && tinyHit->position.z == 1 && close(tinyHit->position.x, 0) && close(tinyHit->color.red, 50), "tiny real crossing is not treated as parallel");
    check(!lab::intersectNearPlane(v(NAN, 0, 2), v(1, 0, 3), 1), "nonfinite edge rejected");

    const lab::Triangle3 all{v(-1, -1, 2), v(1, -1, 2.5), v(0, 1, 2)};
    const lab::Triangle3 oneOut{v(-1, -1, .5), v(1, -1, 1.5), v(0, 1, 1.5)};
    const lab::Triangle3 twoOut{v(-1, -1, 1.5), v(1, -1, .5), v(0, 1, .5)};
    const lab::Triangle3 none{v(-1, -1, .5), v(1, -1, .5), v(0, 1, .5)};
    const std::array<lab::Triangle3, 4> cases{all, oneOut, twoOut, none};
    const std::array<std::size_t, 4> vertices{3, 4, 3, 0}, triangles{1, 2, 1, 0};
    for (std::size_t i = 0; i < cases.size(); ++i) {
        const auto result = lab::clipForRender(cases[i], 1);
        check(result.polygon.count == vertices[i] && result.batch.count == triangles[i], "all four nondegenerate clipping topologies");
        safe(result.polygon);
        double sumArea = 0;
        for (std::size_t j = 0; j < result.batch.count; ++j) {
            const auto& t = result.batch.triangles[j];
            check(dot(normal(t), normal(cases[i])) > 0, "fan keeps original 3D winding");
            sumArea += area(t);
            const auto again = lab::clipTriangleToNearPlane(t, 1);
            check(again.count == 3, "clipping generated triangles is idempotent");
        }
        if (i == 1) {
            check(close(sumArea, .75 * area(cases[i])), "analytic three-quarter retained area");
        }
        if (i == 2) {
            check(close(sumArea, .25 * area(cases[i])), "analytic one-quarter retained area");
        }
    }
    // Kiểm mọi hoán vị input, không chỉ một winding may mắn.
    const std::array<int, 3> initial{0, 1, 2};
    auto permutation = initial;
    do {
        const lab::Triangle3 t{lab::vertexAt(oneOut, permutation[0]), lab::vertexAt(oneOut, permutation[1]), lab::vertexAt(oneOut, permutation[2])};
        const auto result = lab::clipForRender(t, 1);
        check(result.polygon.count == 4 && result.batch.count == 2, "all six input permutations preserve clipping topology");
        for (std::size_t i = 0; i < result.batch.count; ++i) {
            check(dot(normal(t), normal(result.batch.triangles[i])) > 0, "permuted fan winding preserved");
        }
    } while (std::next_permutation(permutation.begin(), permutation.end()));

    const lab::Triangle3 pointTouch{v(-1, 0, 1), v(1, 0, .5), v(0, 1, .5)};
    const lab::Triangle3 edgeTouch{v(-1, 0, 1), v(1, 0, 1), v(0, 1, .5)};
    const lab::Triangle3 planar{v(-1, -1, 1), v(1, -1, 1), v(0, 1, 1)};
    check(lab::clipForRender(pointTouch, 1).polygon.count == 1 && lab::clipForRender(pointTouch, 1).batch.count == 0, "point contact produces no fake triangle");
    check(lab::clipForRender(edgeTouch, 1).polygon.count == 2 && lab::clipForRender(edgeTouch, 1).batch.count == 0, "edge contact produces no fake triangle");
    check(lab::clipForRender(planar, 1).batch.count == 1, "on-plane nondegenerate triangle retained");
    const lab::Triangle3 line{v(0, 0, 2), v(1, 0, 2), v(2, 0, 2)};
    check(lab::clipForRender(line, 1).batch.count == 0, "collinear polygon has no filled triangle");
    auto malformed = lab::clipTriangleToNearPlane(all, 1);
    malformed.count = 999;
    check(!lab::triangulateFan(malformed).valid, "malformed polygon rejected before array access");
    lab::ClippedPolygon full;
    for (int i = 0; i < 4; ++i) {
        check(lab::appendVertex(full, v(i, 0, 2)), "append within capacity");
    }
    check(!lab::appendVertex(full, v(4, 0, 2)) && !full.valid && full.count == 0, "overflow does not silently truncate geometry");
    lab::ClippedPolygon invalidDuplicate;
    lab::appendVertex(invalidDuplicate, v(0, 0, 2));
    auto badColor = v(0, 0, 2);
    badColor.color.red = NAN;
    check(!lab::appendVertex(invalidDuplicate, badColor) && !invalidDuplicate.valid, "invalid color is rejected before duplicate suppression");
    const lab::Triangle3 invalid{v(NAN, 0, 2), v(1, 0, 2), v(0, 1, 2)};
    check(!lab::clipForRender(invalid, 1).polygon.valid, "nonfinite primitive rejected");
    check(!lab::clipTriangleToNearPlane(all, 0).valid, "nonpositive near rejected");

    const lab::Viewport viewport{0, 0, 80, 60};
    constexpr double fov = 1.0471975511965976;
    check(!lab::projectVertex(v(0, 0, 1 - 0.5e-9), fov, viewport, 1), "projection agrees with exact classification");
    check(!lab::projectVertex(v(0, 0, NAN), fov, viewport, 1), "projection rejects NaN before divide");
    check(!lab::projectVertex(v(0, 0, 2), 0, viewport, 1), "zero FOV rejected");
    auto nearBand = oneOut;
    nearBand.a.position.z = 1 - 0.5e-9;
    const auto nearResult = lab::clipForRender(nearBand, 1);
    check(nearResult.batch.count == 2, "epsilon boundary retains visible remainder");
    for (std::size_t i = 0; i < nearResult.batch.count; ++i) {
        check(lab::projectTriangle(nearResult.batch.triangles[i], fov, viewport, 1).has_value(), "clip output never fails its projection guard");
    }

    // Sweep chỉ quét toán O(1), không render board lớn hàng nghìn lần.
    for (int i = 0; i <= 1000; ++i) {
        const auto t = lab::moveAlongDepth(lab::makeDefaultTriangle(), -4.0 + 7.0 * i / 1000.0);
        const auto r = lab::clipForRender(t, 1);
        safe(r.polygon);
        check(lab::maximumNearPlaneViolation(r.polygon, 1) == 0.0, "sweep stays exactly in kept half-space");
        for (std::size_t j = 0; j < r.batch.count; ++j) {
            check(lab::projectTriangle(r.batch.triangles[j], fov, viewport, 1).has_value(), "near-to-behind-camera sweep has finite projections");
        }
    }
    // Oracle độc lập ray/triangle trên input gốc, không gọi clipper để tạo expected.
    const auto source = lab::makeDefaultTriangle();
    const auto clipped = lab::clipForRender(source, 1);
    std::array<int, 80 * 60> owners{};
    std::size_t callbacks = 0, totalCovered = 0;
    for (std::size_t i = 0; i < clipped.batch.count; ++i) {
        const auto projected = lab::projectTriangle(clipped.batch.triangles[i], fov, viewport, 1);
        if (projected) {
            const auto stats = lab::rasterizeScreenTriangle(*projected, 80, 60, [&](int x, int y, lab::Color color) {
                ++owners[std::size_t(y) * 80 + x];
                ++callbacks;
                check(std::isfinite(color.red) && std::isfinite(color.green) && std::isfinite(color.blue), "raster attributes finite");
            });
            totalCovered += stats.coveredCount;
        }
    }
    check(callbacks == totalCovered && callbacks > 0, "coverage count equals actual callback writes");
    const auto a = source.a.position, e1 = sub(source.b.position, a), e2 = sub(source.c.position, a);
    const double focal = 30.0 / std::tan(fov * .5);
    bool maskAgrees = true;
    std::size_t compared = 0;
    for (int y = 0; y < 60; ++y) {
        for (int x = 0; x < 80; ++x) {
            const lab::Vec3 ray{(x + .5 - 40.0) / focal, (30.0 - y - .5) / focal, 1};
            const auto h = cross(ray, e2);
            const double determinant = dot(e1, h);
            bool expected = false;
            if (std::abs(determinant) > 1e-12) {
                const lab::Vec3 s{-a.x, -a.y, -a.z};
                const auto q = cross(s, e1);
                const double u = dot(s, h) / determinant, w = dot(ray, q) / determinant, z = dot(e2, q) / determinant;
                if (std::min({std::abs(u), std::abs(w), std::abs(1 - u - w), std::abs(z - 1)}) < 1e-10) {
                    continue;
                }
                expected = u >= 0 && w >= 0 && u + w <= 1 && z >= 1;
            }
            ++compared;
            maskAgrees = maskAgrees && ((owners[std::size_t(y) * 80 + x] > 0) == expected);
            check(owners[std::size_t(y) * 80 + x] <= 1, "triangle fan has no shared-edge overdraw");
        }
    }
    check(compared > 4500 && maskAgrees, "raster mask matches independent ray-triangle near oracle");

    lab::Scene scene;
    scene.debug = false;
    lab::Framebuffer image;
    const auto clean = lab::renderScene(image, scene);
    check(clean.covered > 0 && clean.renderedTriangles == 2, "clean 3D scene keeps clipped RGB surface");
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kGrid) > 0, "clean scene retains projected world grid");
    scene.clipping = false;
    const auto discarded = lab::renderScene(image, scene);
    check(discarded.covered == 0 && discarded.discarded, "discard mode demonstrates premature disappearance");
    lab::Scene timeA, timeB;
    for (int i = 0; i < 100; ++i) {
        lab::advanceScene(timeA, .01, 1);
    }
    for (int i = 0; i < 50; ++i) {
        lab::advanceScene(timeB, .02, 1);
    }
    check(close(timeA.depthOffset, timeB.depthOffset), "held input is independent of frame splits");
    lab::DragState drag;
    lab::beginDrag(timeA, 100, drag);
    lab::updateDrag(timeA, drag, 110);
    check(close(timeA.depthOffset, 1.12), "drag uses initial offset plus delta");
    timeA.depthOffset = 3;
    timeA.direction = 1;
    lab::stepSweep(timeA, .08);
    check(timeA.direction == -1 && timeA.depthOffset <= 3, "step reverses at bounded sweep endpoint");

    if (failures != 0) {
        std::cerr << failures << " failed checks\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 18 validation passed\n";
    return EXIT_SUCCESS;
}
