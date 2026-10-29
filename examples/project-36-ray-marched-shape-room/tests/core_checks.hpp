#pragma once
#include "camera.hpp"
#include "raymarch_oracle.hpp"
#include "tracing.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace lab_test {

inline int failures = 0;
inline int checks = 0;

inline void check(bool condition, std::string_view label) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

inline bool near(double a, double b, double tolerance = 1e-9) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= tolerance;
}

inline lab::SceneOptions sphereOnly() {
    lab::SceneOptions scene{};
    scene.includeBox = false;
    scene.includeTorus = false;
    scene.includeRoom = false;
    return scene;
}

inline void cameraChecks() {
    lab::Camera camera{};
    const lab::Ray center = lab::makeCameraRay(camera, 479.5, 319.5, 960, 640);
    check(lab::validRay(center), "center camera ray is a finite unit vector");
    check(lab::dot(center.direction, lab::cameraForward(camera)) > 1.0 - 1e-12, "center ray agrees with the camera basis");
    const lab::Ray left = lab::makeCameraRay(camera, 0, 319.5, 960, 640);
    const lab::Ray right = lab::makeCameraRay(camera, 959, 319.5, 960, 640);
    check(lab::dot(left.direction, lab::cameraRight(camera)) < 0.0, "left image edge points left");
    check(lab::dot(right.direction, lab::cameraRight(camera)) > 0.0, "right image edge points right");
    check(!lab::validRay(lab::makeCameraRay(camera, 0, 0, 0, 640)), "zero framebuffer is rejected, not silently repaired");

    const lab::Vec3 before = camera.position;
    lab::moveCamera(camera, {0.0, 0.0, 1.0});
    check(near(lab::length(camera.position - before), 1.0), "one local forward unit moves one world meter");
    lab::lookCamera(camera, 0.0, 1e9);
    check(near(camera.pitch, -1.45), "look pitch cannot reach a degenerate basis");
    lab::moveCamera(camera, {0.0, 1e9, 0.0});
    check(near(camera.position.y, 40.0), "camera motion has a finite world bound");
}

inline void sdfChecks() {
    check(near(lab::sdSphere({0, 0, 0}, {}, 1.0), -1.0), "sphere center preserves the negative sign");
    check(near(lab::sdSphere({1, 0, 0}, {}, 1.0), 0.0), "sphere surface is zero");
    check(near(lab::sdBox({2, 2, 0}, {}, {1, 1, 1}), std::sqrt(2.0)), "box corner uses Euclidean distance, not max component");
    check(near(lab::sdBox({}, {}, {1, 2, 3}), -1.0), "inside box measures the closest face");
    check(near(lab::sdTorus({0.94, 0, 0}, 0.72, 0.22), 0.0), "torus outer ring has known radius");
    const lab::Vec3 point{0.42, 0.3, -1.0};
    check(near(lab::length(lab::torusLocal(point)), lab::length(point - lab::Vec3{0.05, -0.16, -1.25})), "inverse torus rotation preserves distances");
    check(lab::sampleScene({-1.0, -0.18, 0.15}).materialId == 1, "sphere carries its own material");
    check(lab::sampleScene({1.0, -0.32, 0.1}).materialId == 2, "box carries its own material");
    check(lab::sampleScene({0.0, -1.0, 1.0}).materialId == 4, "floor has room material");
    check(lab::sampleScene({20.0, 0.0, 0.0}).distance > 0.0, "outside room slabs is not classified as inside every wall");
}

inline void marchChecks() {
    const lab::Vec3 center{-1.0, -0.18, 0.15};
    const lab::SceneOptions scene = sphereOnly();
    const lab::Ray axis{{-1.0, -0.18, 4.0}, {0.0, 0.0, -1.0}};
    const auto oracle = lab::intersectSphere(axis, center, scene.sphereRadius);
    const auto hit = lab::marchRay(axis, {}, scene);
    check(oracle.valid && oracle.hit && near(oracle.distance, 3.03), "quadratic sphere oracle has a hand-computed axis answer");
    check(hit.hit && near(hit.traveled, oracle.distance, 1e-9), "axis march agrees with an independent quadratic");

    const lab::Ray inside{center, {1.0, 0.0, 0.0}};
    const auto exit = lab::marchRay(inside, {}, scene);
    check(exit.hit && near(exit.traveled, 0.82), "inside camera finds the exit, not a fake hit at t=0");
    check(near(exit.position.x, -0.18), "exit result position agrees with its traveled distance");

    const lab::Ray miss{{0.0, 0.0, 4.0}, {0.0, 0.0, 1.0}};
    const auto missResult = lab::marchRay(miss, {}, scene);
    check(!missResult.hit && missResult.status == lab::MarchStatus::distanceLimit, "true miss stops at a declared distance guard");
    check(near(lab::length(missResult.position - miss.origin), missResult.traveled), "distance-limit position and t remain consistent");

    lab::RayMarchSettings oneStep{};
    oneStep.maximumSteps = 1;
    const auto incomplete = lab::marchRay(axis, oneStep, scene);
    check(!incomplete.hit && incomplete.steps == 1 && incomplete.status == lab::MarchStatus::stepLimit, "an unqueried endpoint is not called a confirmed hit");

    lab::SceneOptions empty = scene;
    empty.includeSphere = false;
    check(lab::marchRay(axis, {}, empty).status == lab::MarchStatus::emptyScene, "an empty scene is an explicit miss");
    check(lab::marchRay({axis.origin, {0, 0, -2}}, {}, scene).status == lab::MarchStatus::invalidInput, "non-unit directions cannot silently change t units");
    auto invalid = oneStep;
    invalid.maximumSteps = 1000000000;
    check(lab::marchRay(axis, invalid, scene).steps == 0, "oversized step budget is rejected before work");
    invalid = {};
    invalid.hitEpsilon = std::numeric_limits<double>::quiet_NaN();
    check(lab::marchRay(axis, invalid, scene).status == lab::MarchStatus::invalidInput, "NaN settings are not allowed into the loop");

    // Tiếp tuyến: epsilon giới hạn khoảng cách tới mặt, không trực tiếp giới hạn t.
    lab::RayMarchSettings settings{};
    settings.maximumSteps = 256;
    const lab::Ray tangent{{center.x + scene.sphereRadius, center.y, 4.0}, {0, 0, -1}};
    const auto exactTangent = lab::intersectSphere(tangent, center, scene.sphereRadius);
    const auto approximateTangent = lab::marchRay(tangent, settings, scene);
    const double longitudinalBound = std::sqrt(2.0 * scene.sphereRadius * settings.hitEpsilon + settings.hitEpsilon * settings.hitEpsilon);
    check(exactTangent.hit && approximateTangent.hit, "tangent ray reaches the epsilon band within the declared budget");
    check(std::abs(approximateTangent.traveled - exactTangent.distance) <= longitudinalBound + 1e-8, "tangent t error uses the geometric square-root bound");

    for (double offset : {-0.5, -0.2, 0.0, 0.3, 0.6}) {
        const lab::Ray ray{{center.x + offset, center.y, 4.0}, {0, 0, -1}};
        const auto exact = lab::intersectSphere(ray, center, scene.sphereRadius);
        const auto measured = lab::marchRay(ray, settings, scene);
        check(exact.hit && measured.hit && std::abs(exact.distance - measured.traveled) < 0.005, "oblique fixture agrees with the analytic intersection");
    }
    for (double epsilon : {0.0001, 0.0015, 0.01}) {
        settings.hitEpsilon = epsilon;
        const auto measured = lab::marchRay(tangent, settings, scene);
        const double bound = std::sqrt(2.0 * scene.sphereRadius * epsilon + epsilon * epsilon);
        check(measured.hit && std::abs(measured.traveled - exactTangent.distance) <= bound + 1e-8, "CPU tangent obeys the epsilon-dependent geometric t bound");
        const lab::Ray nearMiss{{center.x + scene.sphereRadius + epsilon * 0.5, center.y, center.z}, {1, 0, 0}};
        const auto accepted = lab::marchRay(nearMiss, settings, scene);
        check(!lab::intersectSphere(nearMiss, center, scene.sphereRadius).hit && accepted.hit && accepted.traveled == 0.0, "near-surface acceptance is explicitly an epsilon band, not an exact hit");
    }
    const lab::Ray onSurface{{center.x + scene.sphereRadius, center.y, center.z}, {1, 0, 0}};
    check(lab::marchRay(onSurface, {}, scene).hit && lab::marchRay(onSurface, {}, scene).traveled == 0.0, "an origin already on the surface is a t=0 hit");
    auto clipped = settings;
    clipped.maximumDistance = 2.0;
    const auto tooFar = lab::marchRay(axis, clipped, scene);
    check(!tooFar.hit && tooFar.status == lab::MarchStatus::distanceLimit && tooFar.traveled == 2.0, "distance limit can reject a real sphere farther than the allowed range");
}

inline void normalAndShadowChecks() {
    const auto scene = sphereOnly();
    const lab::Vec3 center{-1.0, -0.18, 0.15};
    const lab::Vec3 expected = lab::normalize({0.3, 0.4, 0.5});
    const lab::Vec3 surface = center + expected * scene.sphereRadius;
    const auto normal = lab::estimateNormal(surface, scene);
    check(near(lab::length(normal), 1.0), "numerical normal is normalized");
    check(lab::dot(normal, expected) > 1.0 - 1e-8, "numerical normal agrees with analytic sphere normal");
    for (double epsilon : {0.00001, 0.0001, 0.001, 0.01, 0.02}) {
        const auto measured = lab::estimateNormal(surface, scene, epsilon);
        const double angle = std::acos(std::clamp(lab::dot(measured, expected), -1.0, 1.0));
        check(lab::finite(measured) && near(lab::length(measured), 1.0) && angle < 0.001, "CPU normal angular error is <0.001 rad across the normal-epsilon sweep");
    }
    check(lab::length(lab::estimateNormal(surface, scene, 0.0)) == 0.0, "invalid normal epsilon is rejected");

    auto empty = scene;
    empty.includeSphere = false;
    const auto visible = lab::traceShadow({0, 0, 2}, {0, 0, 1}, 4.0, empty);
    check(visible.reachedLight && near(visible.visibility, 1.0), "empty scene cannot cast a shadow");
    const auto blocked = lab::traceShadow({-1, -0.18, 4}, {0, 0, -1}, 8.0, scene);
    check(!blocked.reachedLight && blocked.visibility == 0.0, "sphere occludes the light segment");
    const auto unresolved = lab::traceShadow({0, 0, 2}, {0, 0, 1}, 4.0, empty, 1);
    check(!unresolved.reachedLight && unresolved.visibility == 0.0, "exhausted shadow budget is not called fully lit");
}

inline int runCoreChecks() {
    failures = 0;
    checks = 0;
    cameraChecks();
    sdfChecks();
    marchChecks();
    normalAndShadowChecks();
    std::cout << checks << " CPU checks, " << failures << " failures\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}

} // namespace lab_test
