#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAILED: " << label << '\n';
    }
}

bool near(double a, double b) {
    return std::abs(a - b) < 1e-9;
}

bool same(lab::Vec3 a, lab::Vec3 b) {
    return lab::magnitude(lab::subtract(a, b)) < 1e-9;
}
} // namespace

int main() {
    // Đáp án không được sinh lại bằng chính hàm đang được kiểm tra.
    const auto local = lab::makeCubeVertices(1.25);
    check(same(local[0], {-1.25, -1.25, -1.25}), "index zero signs");
    check(same(local[6], {1.25, 1.25, 1.25}), "index six signs");
    check(lab::hasValidCubeTopology(), "12 unique edges and degree three");
    check(!lab::isEdgeValid({8, 0}) && !lab::isEdgeValid({1, 1}), "invalid topology bounds");
    for (const auto edge : lab::kCubeEdges) {
        check(near(lab::magnitude(lab::subtract(local[edge.from], local[edge.to])), 2.5), "every edge length is 2h");
    }

    const lab::EulerAngles angles{0.3, 0.5, -0.2};
    for (const auto order : {lab::RotationOrder::Xyz, lab::RotationOrder::Zyx}) {
        const auto rotated = lab::rotateCube(local, angles, order);
        check(lab::maximumCubeEdgeLengthError(local, rotated) < 1e-9, "rotation preserves edge length");
        check(lab::cubeRotationRoundTripError(local, angles, order) < 1e-9, "inverse restores local vertices");
        lab::Vec3 center{};
        for (const auto point : lab::translateCube(rotated, {1.0, 2.0, 6.0})) {
            center = lab::add(center, lab::scale(point, 1.0 / 8.0));
        }
        check(same(center, {1.0, 2.0, 6.0}), "translate after rotation keeps pivot");
    }
    check(same(lab::rotateEuler({1.0, 2.0, 3.0}, {lab::kPi / 2.0, 0.0, 0.0}, lab::RotationOrder::Xyz), {1.0, -3.0, 2.0}), "quarter turn independent oracle");

    // Viewport 1100x800, FOV 90°: f=1, aspect=1.375.
    lab::Scene scene;
    scene.lens.verticalFovRadians = lab::kPi / 2.0;
    const auto p4 = lab::projectVertex({1.0, 0.5, 4.0}, scene);
    const auto p8 = lab::projectVertex({1.0, 0.5, 8.0}, scene);
    check(p4.screen && near(p4.screen->x, 650.0) && near(p4.screen->y, 350.0), "perspective Z4 oracle");
    check(p8.screen && near(p8.screen->x, 600.0) && near(p8.screen->y, 375.0), "perspective Z8 oracle");
    scene.projection = lab::ProjectionMode::Orthographic;
    const auto o4 = lab::projectVertex({1.0, 0.5, 4.0}, scene);
    const auto o8 = lab::projectVertex({1.0, 0.5, 8.0}, scene);
    check(o4.screen && near(o4.screen->x, 616.6666666666666) && near(o4.screen->y, 366.6666666666667), "ortho independent oracle");
    check(o4.screen && o8.screen && near(o4.screen->x, o8.screen->x) && near(o4.screen->y, o8.screen->y), "ortho scale ignores depth");
    scene.projection = lab::ProjectionMode::Perspective;
    const auto p6 = lab::projectVertex({1.0, 0.5, 6.0}, scene);
    check(p6.screen && o4.screen && near(p6.screen->x, o4.screen->x), "matched reference plane Z6");

    for (const auto mode : {lab::ProjectionMode::Perspective, lab::ProjectionMode::Orthographic}) {
        scene.projection = mode;
        check(lab::projectVertex({0.0, 0.0, 0.0}, scene).status == lab::ProjectionStatus::BehindCamera, "no divide at zero");
        check(!lab::projectVertex({0.0, 0.0, 0.2}, scene).screen, "before near no screen");
        check(!lab::projectVertex({0.0, 0.0, 17.0}, scene).screen, "beyond far no screen");
        check(lab::projectVertex({0.0, 0.0, 0.5}, scene).screen.has_value(), "near inclusive");
        check(lab::projectVertex({0.0, 0.0, 16.0}, scene).screen.has_value(), "far inclusive");
        check(lab::projectVertex({std::numeric_limits<double>::quiet_NaN(), 0.0, 4.0}, scene).status == lab::ProjectionStatus::Invalid, "reject NaN");
        check(lab::projectVertex({1e308, 0.0, 4.0}, scene).status == lab::ProjectionStatus::Invalid, "reject projected overflow");
        lab::Scene invalidZoom = scene;
        invalidZoom.zoom = std::numeric_limits<double>::quiet_NaN();
        check(lab::projectVertex({0.0, 0.0, 4.0}, invalidZoom).status == lab::ProjectionStatus::Invalid, "reject invalid zoom");
        std::size_t extra = 0;
        const auto segment = lab::projectSegment(lab::projectVertex({0.0, 0.0, -1.0}, scene), lab::projectVertex({0.2, 0.0, 2.0}, scene), scene, extra);
        check(segment.has_value() && extra == 2, "near crossing retained and counted");
        const auto crossing = lab::projectSegment(lab::projectVertex({-20.0, 0.0, 4.0}, scene), lab::projectVertex({20.0, 0.0, 4.0}, scene), scene, extra);
        check(crossing && near(crossing->from.x, 0.0) && near(crossing->to.x, 1100.0), "both outside endpoints can cross viewport");
    }

    lab::applyPreset(scene, 0);
    const auto projected = lab::projectCube(lab::worldCube(scene), scene);
    const auto edges = lab::buildEdges(projected, scene);
    check(projected.projectionCount == 8 && edges.extraProjections == 0, "eight cached original vertices");
    check(edges.count == 12, "default cube draws twelve edges");
    for (std::size_t i = 1; i < edges.count; ++i) {
        check(edges.edges[i - 1].screen.averageDepth >= edges.edges[i].screen.averageDepth, "far to near ordering");
    }
    for (std::size_t i = 0; i < edges.count; ++i) {
        check(edges.edges[i].depthFactor >= 0.0 && edges.edges[i].depthFactor <= 1.0, "depth factor bounded");
    }

    lab::Scene sixty;
    lab::Scene hundred;
    for (int i = 0; i < 60; ++i) {
        lab::moveModel(sixty, {1.0, 0.0, 0.0}, 1.0 / 60.0);
    }
    for (int i = 0; i < 100; ++i) {
        lab::moveModel(hundred, {1.0, 0.0, 0.0}, 0.01);
    }
    check(near(sixty.position.x, 2.0) && near(hundred.position.x, 2.0), "dt independent movement");
    lab::Scene diagonal;
    lab::moveModel(diagonal, {1.0, 1.0, 1.0}, 0.1);
    check(near(lab::magnitude(lab::subtract(diagonal.position, {0.0, 0.0, 6.0})), 0.2), "diagonal normalized");
    const auto original = scene.position;
    lab::zoomScene(scene, 1.0);
    check(same(scene.position, original), "zoom is not dolly movement");
    lab::zoomScene(scene, 1000.0);
    check(near(scene.zoom, 2.0), "zoom upper bound");
    lab::zoomScene(scene, -1000.0);
    check(near(scene.zoom, 0.5), "zoom lower bound");
    const auto dragged = lab::applyMouseDrag({}, 20.0, -10.0, 0.01);
    check(near(dragged.yaw, 0.2) && near(dragged.pitch, 0.1), "logical delta to angles");
    check(near(lab::applyMouseDrag({}, 0.0, -200.0, 0.01).pitch, 2.0), "object pitch is not FPS clamped");
    lab::Scene time;
    lab::advanceScene(time, 10.0);
    check(near(time.angles.yaw, 0.055), "long dt bounded");
    lab::advanceScene(time, -1.0);
    check(near(time.angles.yaw, 0.055), "negative dt ignored");

    // Kiểm tra chính renderer CPU, không chỉ helper geometry.
    lab::Framebuffer image;
    for (int preset = 0; preset <= 4; ++preset) {
        lab::applyPreset(scene, preset);
        for (const auto mode : {lab::ProjectionMode::Perspective, lab::ProjectionMode::Orthographic}) {
            scene.projection = mode;
            lab::renderScene(image, scene);
        }
    }
    lab::applyPreset(scene, 0);
    scene.debug = false;
    scene.depthCue = false;
    lab::renderScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), 0x84A9FFFFu) > 200, "clean mode retains cube pixels");
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kGrid) > 500, "clean mode retains world floor");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 13: independent geometry, projection, clipping, input and renderer checks passed\n";
    return EXIT_SUCCESS;
}
