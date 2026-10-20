#include "view.hpp"
#include <cstdlib>
#include <iostream>
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
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) < 1e-9;
}

bool same(lab::Vec3 a, lab::Vec3 b) {
    return near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z);
}
} // namespace

int main() {
    const lab::Vec3 local{1.0, 2.0, 3.0};
    const lab::Mat4 translation = lab::translationMatrix({3.0, -2.0, 5.0});
    const lab::Vec4 point = lab::transform(translation, lab::toPoint(local));
    const lab::Vec4 direction = lab::transform(translation, lab::toDirection(local));
    check(same(lab::xyz(point), {4.0, 0.0, 8.0}) && point.w == 1.0, "point translation independent oracle");
    check(same(lab::xyz(direction), local) && direction.w == 0.0, "direction ignores translation");
    check(translation.values[3] == 3.0 && translation.values[7] == -2.0 && translation.values[11] == 5.0, "row-major storage with column vectors");
    const lab::Mat4 scale = lab::scaleMatrix({2.0, 3.0, 4.0});
    check(same(lab::xyz(lab::transform(lab::multiply(translation, scale), lab::toPoint(local))), {5.0, 4.0, 17.0}), "T S independent oracle");
    check(same(lab::xyz(lab::transform(lab::multiply(scale, translation), lab::toPoint(local))), {8.0, 0.0, 32.0}), "S T differs from T S");

    lab::Camera3D turnedCamera{{1.0, 2.0, 3.0}, lab::kPi / 2.0, 0.0};
    check(same(lab::xyz(lab::transform(lab::viewMatrix(turnedCamera), lab::toPoint({4.0, 2.0, 3.0}))), {0.0, 0.0, 3.0}), "view yaw90 independent oracle");
    turnedCamera.yaw = 0.0;
    turnedCamera.pitch = lab::kPi / 2.0;
    check(same(lab::xyz(lab::transform(lab::viewMatrix(turnedCamera), lab::toPoint({1.0, 5.0, 3.0}))), {0.0, 0.0, 3.0}), "view pitch90 independent oracle");
    const lab::PerspectiveLens oracleLens{lab::kPi / 2.0, 1.0, 9.0};
    const auto offCenterNdc = lab::perspectiveDivide(lab::transform(lab::projectionMatrix(oracleLens, 1100.0 / 560.0), {2.0, 1.0, 4.0, 1.0}));
    check(offCenterNdc.has_value(), "off-center divide is defined");
    if (offCenterNdc) {
        const auto offCenterPixel = lab::ndcToScreen(*offCenterNdc, {1100.0, 560.0});
        check(offCenterPixel && near(offCenterPixel->x, 690.0) && near(offCenterPixel->y, 210.0), "off-center focal and aspect independent oracle");
    }

    // Không dùng chính MVP để tạo expected: đáp án tính tay của preset F2.
    lab::Scene scene;
    lab::applyPreset(scene, 1);
    const auto trace = lab::tracePipeline(scene.vertices[0], scene.model, scene.camera, scene.lens, lab::viewportFor(scene));
    check(trace.world && same(lab::xyz(*trace.world), {1.0, 1.0, 4.0}), "hand world oracle");
    check(trace.camera && same(lab::xyz(*trace.camera), {0.0, 1.0, 4.0}), "hand view oracle");
    check(trace.clip && same(lab::xyz(*trace.clip), {0.0, 1.0, 27.0 / 8.0}) && near(trace.clip->w, 4.0), "hand clip oracle and camera depth in w");
    check(trace.ndc && same(*trace.ndc, {0.0, 0.25, 27.0 / 32.0}), "hand NDC oracle");
    check(trace.screen && near(trace.screen->x, 550.0) && near(trace.screen->y, 210.0), "hand screen oracle 1100x560");
    check(trace.status == lab::PipelineStatus::Visible, "hand oracle visible");
    check(lab::inspectScene(scene).rows[5].value.has_value(), "all six rows expose real runtime values");

    for (int i = 0; i < 80; ++i) {
        const lab::Vec3 p{0.2 * i, -0.3, 0.7};
        scene.model.yaw = 0.11 * i;
        scene.model.scale = {-0.8, 1.2, 0.4};
        scene.camera.yaw = -0.17 * i;
        scene.camera.pitch = 0.2;
        const auto world = lab::transform(lab::modelMatrix(scene.model), lab::toPoint(p));
        check(same(lab::xyz(world), lab::modelPointDirect(p, scene.model)), "model agrees with independent scalar path");
        const auto view = lab::transform(lab::viewMatrix(scene.camera), world);
        check(same(lab::xyz(view), lab::worldToCameraDirect(lab::xyz(world), scene.camera)), "view agrees with P14 direct rotation");
        check(lab::pipelineAgreementError(p, scene.model, scene.camera, scene.lens, lab::viewportFor(scene)) < 1e-9, "separate Model View Projection matches composed MVP");
    }

    const std::array<lab::PipelineStatus, 7> expected{{
        lab::PipelineStatus::Visible,
        lab::PipelineStatus::Visible,
        lab::PipelineStatus::BeforeNearPlane,
        lab::PipelineStatus::BehindCamera,
        lab::PipelineStatus::BeyondFarPlane,
        lab::PipelineStatus::OutsideFrustum,
        lab::PipelineStatus::BehindCamera,
    }};
    for (int index = 0; index < 7; ++index) {
        lab::applyPreset(scene, index);
        const auto value = lab::tracePipeline(scene.vertices[scene.selectedVertex], scene.model, scene.camera, scene.lens, lab::viewportFor(scene));
        check(value.status == expected[static_cast<std::size_t>(index)], "preset status oracle");
        if (index == 3 || index == 6) {
            check(!value.ndc && !value.screen, "behind or w zero has no fake NDC/screen");
            const auto rows = lab::inspectScene(scene).rows;
            check(!rows[4].value && !rows[5].value, "inspector shows missing divide explicitly");
        } else {
            check(value.ndc.has_value() && value.screen.has_value(), "finite clipped coordinates retained for inspection");
        }
    }

    lab::applyPreset(scene, 1);
    for (double z : {scene.lens.nearPlane, scene.lens.farPlane}) {
        scene.vertices[0] = {0.0, 0.0, 0.0};
        scene.model = {{1.0, 0.0, z}, {1.0, 1.0, 1.0}, 0.0};
        const auto boundary = lab::tracePipeline(scene.vertices[0], scene.model, scene.camera, scene.lens, lab::viewportFor(scene));
        check(boundary.status == lab::PipelineStatus::Visible && boundary.ndc, "near/far boundaries inclusive despite roundoff");
        if (boundary.ndc) {
            double expectedDepth = 0.0;
            if (z == scene.lens.farPlane) {
                expectedDepth = 1.0;
            }
            check(near(boundary.ndc->z, expectedDepth), "near maps to zero and far maps to one");
        }
    }
    check(!lab::perspectiveDivide({1.0, 2.0, 3.0, 0.0}), "reject zero w before divide");
    check(!lab::perspectiveDivide({1.0, 2.0, 3.0, -1.0}), "behind is not a visible mirrored point");
    check(!lab::perspectiveDivide({1.0, 2.0, 3.0, 1e-12}), "epsilon w policy");
    const double nan = std::numeric_limits<double>::quiet_NaN();
    check(!lab::perspectiveDivide({nan, 0.0, 0.0, 1.0}), "reject nonfinite clip");
    check(!lab::ndcToScreen({}, {0.0, 560.0}), "reject zero viewport width");
    lab::applyPreset(scene, 0);
    scene.lens.farPlane = scene.lens.nearPlane;
    const auto invalid = lab::tracePipeline(scene.vertices[0], scene.model, scene.camera, scene.lens, lab::viewportFor(scene));
    check(invalid.status == lab::PipelineStatus::Invalid && !invalid.clip && !invalid.screen, "invalid lens stops before projection");
    check(!std::isfinite(lab::pipelineAgreementError(scene.vertices[0], scene.model, scene.camera, scene.lens, lab::viewportFor(scene))), "invalid agreement never reports success");

    lab::applyPreset(scene, 0);
    lab::setParameter(scene, lab::Parameter::Near, 1000.0);
    check(scene.lens.nearPlane < scene.lens.farPlane && near(scene.lens.nearPlane, 29.95), "near cannot pass far");
    lab::setParameter(scene, lab::Parameter::Far, -1000.0);
    check(lab::validLens(scene.lens), "far cannot pass near");
    lab::setParameter(scene, lab::Parameter::Fov, nan);
    check(near(scene.lens.verticalFovRadians, lab::kPi / 3.0), "ignore NaN controls");
    lab::setParameter(scene, lab::Parameter::ScaleX, 0.0);
    check(std::isfinite(lab::pipelineAgreementError(scene.vertices[0], scene.model, scene.camera, scene.lens, lab::viewportFor(scene))), "zero scale needs no inverse model");

    for (int fps : {30, 60, 144}) {
        lab::applyPreset(scene, 0);
        scene.paused = false;
        for (int frame = 0; frame < fps; ++frame) {
            lab::advanceScene(scene, 1.0 / fps);
        }
        check(near(scene.model.yaw, 55.0 * lab::kPi / 180.0), "rotation independent of frame count");
    }
    check(near(lab::advanceModelYaw(0.5, 1.0, nan), 0.5), "NaN dt ignored");

    lab::applyPreset(scene, 0);
    const auto cross = [&]() {
        lab::Vec2 a{-100.0, 280.0};
        lab::Vec2 b{1200.0, 280.0};
        return lab::clipScreen(a, b, lab::viewportFor(scene)) && near(a.x, 0.0) && near(b.x, 1099.0);
    };
    check(cross(), "two outside endpoints retain visible crossing");
    lab::Vec3 a{0.0, 0.0, -1.0};
    lab::Vec3 b{0.1, 0.0, 4.0};
    check(lab::clipViewDepth(a, b, scene.lens) && near(a.z, 0.5), "near crossing before divide");
    const auto screen = lab::visibleVertex(scene.vertices[scene.selectedVertex], scene);
    check(screen && lab::pickVertex(*screen, scene) == scene.selectedVertex, "click picks nearest projected vertex");
    check(!lab::pickVertex({20.0, 700.0}, scene), "table click cannot pick vertex");
    scene.debug = false;
    lab::Framebuffer image;
    lab::drawScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kGrid) > 500, "clean mode retains depth grid");
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kGhost) > 100, "clean mode retains 3D mesh");
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kMarker) > 20, "clean mode retains selected vertex");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 15: matrix, hand oracle, trace, controls and CPU renderer passed\n";
    return EXIT_SUCCESS;
}
