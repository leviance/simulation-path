#include "lab.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

bool close(double a, double b, double epsilon = 1e-9) {
    return std::abs(a - b) <= epsilon;
}

// Reference độc lập: bắn ray vào AABB local, không dùng triangle raster hoặc clipper.
struct RayHit {
    double distance{};
    lab::Vec3 localNormal{};
};

std::optional<RayHit> rayCube(lab::Vec3 origin, lab::Vec3 direction) {
    double enter = -1e30, leave = 1e30;
    lab::Vec3 enterNormal;
    const std::array<double, 3> o = {origin.x, origin.y, origin.z};
    const std::array<double, 3> d = {direction.x, direction.y, direction.z};
    for (std::size_t axis = 0; axis < 3; ++axis) {
        if (std::abs(d[axis]) < 1e-12) {
            if (o[axis] < -1 || o[axis] > 1) {
                return std::nullopt;
            }
            continue;
        }
        double near = (-1 - o[axis]) / d[axis], far = (1 - o[axis]) / d[axis];
        double sign = -1;
        if (near > far) {
            std::swap(near, far);
            sign = 1;
        }
        if (near > enter) {
            enter = near;
            enterNormal = {};
            if (axis == 0) {
                enterNormal.x = sign;
            }
            if (axis == 1) {
                enterNormal.y = sign;
            }
            if (axis == 2) {
                enterNormal.z = sign;
            }
        }
        leave = std::min(leave, far);
    }
    if (enter > leave || leave <= 0 || enter <= 0) {
        return std::nullopt;
    }
    return RayHit{enter, enterNormal};
}

lab::Vec3 inverseModel(lab::Vec3 p, const lab::Scene& scene) {
    return lab::rotateX(lab::rotateY(p, -scene.yaw), -scene.pitch);
}

void testNormals() {
    const auto cube = lab::makeCube();
    check(cube.vertices.size() == 8 && cube.faces.size() == 12, "cube has eight shared vertices and twelve triangles");
    for (std::size_t i = 0; i < cube.faces.size(); ++i) {
        const auto t = lab::faceVertices(cube, cube.faces[i]);
        const auto n = lab::faceUnitNormal(t);
        check(lab::hasOutwardWinding(t), "outward winding");
        check(close(lab::length(n), 1), "unit normal");
        check(close(lab::dot(n, lab::subtract(t[1], t[0])), 0), "normal perpendicular AB");
        check(close(lab::dot(n, lab::subtract(t[2], t[0])), 0), "normal perpendicular AC");
        if (i % 2 == 1) {
            const auto paired = lab::faceUnitNormal(lab::faceVertices(cube, cube.faces[i - 1]));
            check(close(lab::dot(n, paired), 1), "coplanar pair has one flat normal");
        }
        auto reversed = t;
        std::swap(reversed[1], reversed[2]);
        check(!lab::hasOutwardWinding(reversed), "reversed winding rejected");
    }
    check(lab::length(lab::faceUnitNormal({lab::Vec3{}, lab::Vec3{}, lab::Vec3{}})) == 0, "degenerate normal is zero, not NaN");
    for (int i = 0; i < 90; ++i) {
        const double angle = double(i) * 0.07;
        const auto rotated = lab::transformMesh(cube, angle, -angle * 0.7);
        for (const auto& face : cube.faces) {
            const auto a = lab::faceVertices(cube, face), b = lab::faceVertices(rotated, face);
            check(close(lab::length(lab::subtract(a[1], a[0])), lab::length(lab::subtract(b[1], b[0]))), "rotation preserves edges");
            check(lab::hasOutwardWinding(b), "rotation preserves outward normal");
        }
    }
}

void testLighting() {
    const lab::Vec3 front{0, 0, -1};
    check(close(lab::lambertDiffuse(front, front), 1), "aligned diffuse one");
    check(lab::lambertDiffuse(front, {1, 0, 0}) == 0, "perpendicular diffuse zero");
    check(lab::lambertDiffuse(front, {0, 0, 1}) == 0, "back-facing normal clamps negative diffuse to zero");
    const lab::Material material{{100, 180, 240}, 0.2, 0.8};
    const auto dark = lab::shadeMaterial(front, lab::makeDirectionalLight({0, 0, 1}), material);
    check(close(dark.intensity, 0.2) && close(dark.shadedColor.blue, 48), "unlit side keeps ambient");
    const auto bright = lab::shadeMaterial(front, lab::makeDirectionalLight(front), material);
    check(close(bright.intensity, 1) && close(bright.shadedColor.red, 100), "aligned surface keeps base color");
    const auto saturated = lab::shadeMaterial(front, lab::makeDirectionalLight(front), {{100, 180, 240}, 0.8, 0.9});
    check(saturated.intensity == 1, "intensity clamped");
    for (int i = 0; i < 128; ++i) {
        const auto light = lab::orbitLight(double(i) * 0.05, 0.4);
        check(close(lab::length(light.surfaceToLight), 1), "orbit light is unit length");
        const lab::Vec3 normal = lab::normalize({0.3, 0.8, -0.4});
        const lab::Camera camera{double(i) * 0.03, -0.2, 6.0};
        const auto nView = lab::directionToView(normal, camera);
        const auto lView = lab::directionToView(light.surfaceToLight, camera);
        check(close(lab::dot(normal, light.surfaceToLight), lab::dot(nView, lView)), "camera rotation preserves irradiance");
    }
}

void testClipping() {
    for (const auto depths : {std::array<double, 3>{1, 2, 3}, {0.1, 2, 3}, {0.1, 0.2, 3}, {0.1, 0.2, 0.3}}) {
        const auto polygon = lab::clipNear({lab::Vec3{-1, 0, depths[0]}, lab::Vec3{1, 0, depths[1]}, lab::Vec3{0, 1, depths[2]}}, 0.5);
        check(polygon.size() <= 4, "clip output bounded");
        for (auto p : polygon) {
            check(lab::isFinite(p) && p.z >= 0.5, "clip exact half-space");
        }
    }
    check(!lab::intersectNearPlane({0, 0, 1}, {1, 1, 1}, 0.5), "parallel edge has no fabricated hit");
    check(!lab::projectVertex({0, 0, 0.5 - 1e-12}, 100, 100), "projection rejects even slightly outside near");
}

void testFrameOracle() {
    for (int pose = 0; pose < 4; ++pose) {
        lab::Scene scene;
        scene.debug = false;
        scene.culling = true;
        scene.lighting = true;
        scene.pitch = -0.3 + double(pose) * 0.12;
        scene.yaw = 0.4 + double(pose) * 0.51;
        scene.camera.yaw = double(pose) * -0.3;
        scene.camera.pitch = 0.1;
        scene.lightAzimuth = double(pose) * 1.1;
        lab::Framebuffer image(144, 96), reverse(144, 96), unlit(144, 96), noCull(144, 96);
        image.clear();
        reverse.clear();
        unlit.clear();
        noCull.clear();
        const auto stats = lab::renderCube(image, scene);
        lab::renderCube(reverse, scene, true);
        check(image.pixels == reverse.pixels, "reverse order preserves shaded image");
        const auto originalScene = scene;
        scene.lighting = false;
        lab::renderCube(unlit, scene);
        check(image.owner == unlit.owner && image.inverseDepth == unlit.inverseDepth, "lighting changes color only");
        scene = originalScene;
        scene.culling = false;
        lab::renderCube(noCull, scene);
        check(image.pixels == noCull.pixels, "culling agrees with depth-only rendering");
        check(stats.submitted + stats.culled == 12 && stats.passed > 0, "real fragments rendered");
        const auto light = lab::orbitLight(scene.lightAzimuth, scene.lightElevation);
        const double focal = 48.0 / std::tan(3.141592653589793 / 6.0);
        std::size_t errors = 0, litPixels = 0;
        for (int y = 0; y < 96; ++y) {
            for (int x = 0; x < 144; ++x) {
                const lab::Vec3 rayView{(x + 0.5 - 72) / focal, -(y + 0.5 - 48) / focal, 1};
                const auto rayWorld = lab::rotateY(lab::rotateX(rayView, scene.camera.pitch), scene.camera.yaw);
                const auto hit = rayCube(inverseModel(lab::cameraPosition(scene.camera), scene), inverseModel(rayWorld, scene));
                const std::size_t p = std::size_t(y) * 144 + std::size_t(x);
                if (bool(hit) != (image.owner[p] >= 0)) {
                    ++errors;
                    continue;
                }
                if (!hit) {
                    continue;
                }
                ++litPixels;
                const auto normalWorld = lab::rotateY(lab::rotateX(hit->localNormal, scene.pitch), scene.yaw);
                const double cosine = normalWorld.x * light.surfaceToLight.x + normalWorld.y * light.surfaceToLight.y + normalWorld.z * light.surfaceToLight.z;
                const double intensity = std::min(1.0, scene.ambient + scene.diffuseStrength * std::max(0.0, cosine));
                const auto byte = [&](double base) {
                    return std::uint32_t(std::lround(base * intensity));
                };
                const auto expected = (byte(100) << 24U) | (byte(180) << 16U) | (byte(240) << 8U) | 255U;
                if (image.pixels[p] != expected || !close(image.inverseDepth[p], 1.0 / hit->distance, 1e-8)) {
                    ++errors;
                }
            }
        }
        check(litPixels > 300, "oracle sees substantial shaded cube");
        check(errors == 0, "independent ray/AABB oracle agrees on coverage, depth and Lambert RGB");
    }
}

void testInteraction() {
    lab::Scene scene;
    lab::DragState drag;
    check(lab::beginDrag(scene, drag, {0, 0}), "begin drag");
    check(!lab::beginDrag(scene, drag, {2, 3}), "second pointer cannot steal drag");
    lab::updateDrag(scene, drag, {30, 10});
    check(close(scene.yaw, 0.84) && close(scene.pitch, -0.22), "drag updates model by measured pixels");
    drag = {};
    scene.dragTarget = lab::DragTarget::camera;
    const auto modelYaw = scene.yaw;
    lab::beginDrag(scene, drag, {0, 0});
    lab::updateDrag(scene, drag, {20, 0});
    check(scene.yaw == modelYaw && close(scene.camera.yaw, 0.16), "camera drag does not rotate model");
    scene.paused = false;
    const auto angle = scene.lightAzimuth;
    check(lab::advanceScene(scene, 0.1) && close(scene.lightAzimuth - angle, 0.05 * 0.65), "long frame bounded");
    scene.paused = true;
    check(!lab::advanceScene(scene, 0.02), "pause stops light orbit");
}
} // namespace

int main() {
    testNormals();
    testLighting();
    testClipping();
    testFrameOracle();
    testInteraction();
    if (failures != 0) {
        std::cerr << failures << " checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 19 geometry, Lambert, independent render oracle and controls passed\n";
    return EXIT_SUCCESS;
}
