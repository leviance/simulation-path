#include "raymarch_math.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(double a, double b, double tolerance = 1.0e-8) {
    return std::abs(a - b) <= tolerance;
}

void testCameraRay() {
    const lab::OrbitCamera camera{};
    const lab::Ray center = lab::makeCameraRay(camera, 479.5, 319.5, 960, 640);
    const lab::Vec3 expected = lab::normalize(camera.target - lab::cameraPosition(camera));
    check(lab::finite(center.origin), "camera origin is finite");
    check(lab::finite(center.direction), "camera direction is finite");
    check(near(lab::length(center.direction), 1.0), "camera ray is normalized");
    check(lab::dot(center.direction, expected) > 0.999999, "center ray points at target");

    const lab::Ray left = lab::makeCameraRay(camera, 0.0, 319.5, 960, 640);
    const lab::Ray right = lab::makeCameraRay(camera, 959.0, 319.5, 960, 640);
    check(left.direction.x < right.direction.x, "screen x changes ray direction consistently");
}

void testPrimitiveSignedDistances() {
    const lab::Vec3 sphereCenter{-1.0, -0.18, 0.15};
    check(lab::sdSphere(sphereCenter, sphereCenter, 0.82) < 0.0, "sphere center is inside");
    check(
        near(lab::sdSphere({-0.18, -0.18, 0.15}, sphereCenter, 0.82), 0.0),
        "sphere surface has zero signed distance"
    );
    check(
        near(
            lab::sdBox({1.62, -0.32, 0.1}, {1.0, -0.32, 0.1}, {0.62, 0.68, 0.62}),
            0.0
        ),
        "box face has zero signed distance"
    );
    check(
        near(
            lab::sdTorus({0.99, 0.32, -1.25}, {0.05, 0.32, -1.25}, 0.72, 0.22),
            0.0
        ),
        "torus outer ring has zero signed distance"
    );
}

void testBoundedSphereTracing() {
    const lab::Ray sphereRay{{-1.0, -0.18, 4.0}, {0.0, 0.0, -1.0}};
    const lab::RayMarchResult hit = lab::marchRay(sphereRay);
    check(hit.hit, "sphere tracing detects the sphere");
    check(hit.materialId == 1, "sphere hit keeps material id 1");
    check(hit.steps > 0 && hit.steps <= 96, "sphere hit respects maximum step count");
    check(hit.traveled < 20.0, "sphere hit occurs before maximum distance");

    const lab::Ray missRay{{0.0, 0.0, 4.0}, {0.0, 0.0, 1.0}};
    const lab::RayMarchResult miss = lab::marchRay(missRay, {7, 0.0015, 6.0});
    check(!miss.hit, "ray through open front misses the room");
    check(miss.steps <= 7, "miss path is bounded by maximum steps");
    check(miss.traveled <= 6.0, "miss path is bounded by maximum distance");
}

void testNormalMaterialsAndShadow() {
    const lab::Vec3 sphereSurface{-0.18, -0.18, 0.15};
    const lab::Vec3 normal = lab::estimateNormal(sphereSurface);
    check(near(lab::length(normal), 1.0, 1.0e-5), "estimated normal is normalized");
    check(normal.x > 0.999, "sphere normal points outward");
    check(lab::sampleScene({-1.0, -0.18, 0.15}).materialId == 1, "sphere material id is stable");
    check(lab::sampleScene({1.0, -0.32, 0.1}).materialId == 2, "box material id is stable");
    check(lab::sampleScene({0.77, 0.32, -1.25}).materialId == 3, "torus material id is stable");
    check(lab::sampleScene({0.0, -1.0, 1.0}).materialId == 4, "room material id is stable");

    const double visibility = lab::softShadow(
        {0.0, 0.0, 1.5},
        lab::normalize({-0.5, 0.8, 0.3}),
        8.0
    );
    check(visibility >= 0.0 && visibility <= 1.0, "soft shadow stays in zero-to-one range");
}

} // namespace

int main() {
    // Mỗi nhóm khóa một contract thuần CPU mà không cần mở SDL window.
    testCameraRay();
    testPrimitiveSignedDistances();
    testBoundedSphereTracing();
    testNormalMaterialsAndShadow();
    check(lab::validateRayMarchRoom().allPassed(), "named final validation passes");

    if (failures != 0) {
        std::cerr << failures << " Project 36 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 36 validation passed\n";
    return EXIT_SUCCESS;
}
