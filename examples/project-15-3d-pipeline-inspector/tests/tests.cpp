#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        std::cout << "PASS: " << label << '\n';
        return;
    }
    std::cerr << "FAIL: " << label << '\n';
    ++failures;
}

bool near(double actual, double expected, double tolerance = 1e-9) {
    return std::abs(actual - expected) <= tolerance;
}

bool nearVec3(lab::Vec3 actual, lab::Vec3 expected, double tolerance = 1e-9) {
    return near(actual.x, expected.x, tolerance) && near(actual.y, expected.y, tolerance) &&
        near(actual.z, expected.z, tolerance);
}

bool nearVec4(lab::Vec4 actual, lab::Vec4 expected, double tolerance = 1e-9) {
    return near(actual.x, expected.x, tolerance) && near(actual.y, expected.y, tolerance) &&
        near(actual.z, expected.z, tolerance) && near(actual.w, expected.w, tolerance);
}
} // namespace

int main() {
    // Vec4 và identity khóa quy ước matrix–column-vector trước khi ghép transform.
    const lab::Vec4 source{2.0, -3.0, 4.0, 1.0};
    check(
        nearVec4(lab::transform(lab::identityMatrix(), source), source),
        "identity matrix preserves every Vec4 component"
    );

    const lab::Mat4 translation = lab::translationMatrix({5.0, -2.0, 7.0});
    check(
        nearVec4(lab::transform(translation, lab::toPoint({1.0, 2.0, 3.0})), {6.0, 0.0, 10.0, 1.0}),
        "translation changes a homogeneous point with w one"
    );
    check(
        nearVec4(lab::transform(translation, lab::toDirection({1.0, 2.0, 3.0})), {1.0, 2.0, 3.0, 0.0}),
        "translation does not change a direction with w zero"
    );

    // Model matrix phải đúng với đường tính thành phần scale → rotate → translate.
    lab::ModelTransform model{};
    model.position = {3.0, -1.0, 8.0};
    model.scale = {2.0, 0.5, 1.5};
    model.yaw = 37.0 * lab::kPi / 180.0;
    const lab::Vec3 localVertex{1.25, -0.5, 2.0};
    const lab::Vec3 modelByMatrix = lab::xyz(
        lab::transform(lab::modelMatrix(model), lab::toPoint(localVertex))
    );
    check(
        nearVec3(modelByMatrix, lab::modelPointDirect(localVertex, model)),
        "model matrix matches scale rotate translate component path"
    );

    const lab::Mat4 translateThenScale = lab::multiply(
        lab::translationMatrix({4.0, 0.0, 0.0}),
        lab::scaleMatrix({2.0, 2.0, 2.0})
    );
    const lab::Mat4 scaleThenTranslate = lab::multiply(
        lab::scaleMatrix({2.0, 2.0, 2.0}),
        lab::translationMatrix({4.0, 0.0, 0.0})
    );
    const lab::Vec4 orderProbe = lab::toPoint({1.0, 0.0, 0.0});
    check(
        !nearVec4(
            lab::transform(translateThenScale, orderProbe),
            lab::transform(scaleThenTranslate, orderProbe)
        ),
        "non commuting transforms expose reversed matrix order"
    );

    // View matrix được đối chiếu với công thức tường minh của Project 14.
    lab::Camera3D camera{};
    camera.position = {1.5, 0.8, -2.0};
    camera.yaw = 31.0 * lab::kPi / 180.0;
    camera.pitch = -17.0 * lab::kPi / 180.0;
    const lab::Vec3 worldPoint{4.0, 2.0, 9.0};
    const lab::Vec3 viewByMatrix = lab::xyz(
        lab::transform(lab::viewMatrix(camera), lab::toPoint(worldPoint))
    );
    check(
        nearVec3(viewByMatrix, lab::worldToCameraDirect(worldPoint, camera)),
        "view matrix matches inverse translation yaw and pitch"
    );

    // Projection giữ depth trong w và ánh xạ near/far vào NDC Z từ 0 tới 1.
    const lab::PerspectiveLens lens{};
    const lab::Mat4 projection = lab::projectionMatrix(lens, 16.0 / 9.0);
    const lab::Vec4 cameraPoint = lab::toPoint({1.0, -0.5, 7.0});
    const lab::Vec4 clipPoint = lab::transform(projection, cameraPoint);
    check(near(clipPoint.w, cameraPoint.z), "projection stores camera depth in clip w");

    const lab::Vec3 nearNdc = lab::perspectiveDivide(
        lab::transform(projection, lab::toPoint({0.0, 0.0, lens.nearPlane}))
    );
    const lab::Vec3 farNdc = lab::perspectiveDivide(
        lab::transform(projection, lab::toPoint({0.0, 0.0, lens.farPlane}))
    );
    check(near(nearNdc.z, 0.0), "near plane maps to NDC depth zero");
    check(near(farNdc.z, 1.0), "far plane maps to NDC depth one");

    // Pipeline chỉ tạo screen coordinate cho vertex thật sự visible.
    lab::ModelTransform centeredModel{};
    centeredModel.position = {0.0, 0.0, 5.0};
    centeredModel.scale = {1.0, 1.0, 1.0};
    centeredModel.yaw = 0.0;
    const lab::Camera3D centeredCamera{};
    const lab::PipelineTrace visible = lab::tracePipeline(
        {0.0, 0.0, 0.0},
        centeredModel,
        centeredCamera,
        lens,
        800,
        600
    );
    check(visible.status == lab::PipelineStatus::Visible, "centered point is visible");
    check(near(visible.screen.x, 400.0) && near(visible.screen.y, 300.0), "centered point reaches viewport center");

    lab::ModelTransform nearModel = centeredModel;
    nearModel.position.z = lens.nearPlane * 0.5;
    check(
        lab::tracePipeline({0.0, 0.0, 0.0}, nearModel, centeredCamera, lens, 800, 600).status ==
            lab::PipelineStatus::BeforeNearPlane,
        "point before near plane is rejected before division"
    );
    lab::ModelTransform behindModel = centeredModel;
    behindModel.position.z = -2.0;
    check(
        lab::tracePipeline({0.0, 0.0, 0.0}, behindModel, centeredCamera, lens, 800, 600).status ==
            lab::PipelineStatus::BehindCamera,
        "point behind camera is rejected before division"
    );
    lab::ModelTransform farModel = centeredModel;
    farModel.position.z = lens.farPlane + 1.0;
    check(
        lab::tracePipeline({0.0, 0.0, 0.0}, farModel, centeredCamera, lens, 800, 600).status ==
            lab::PipelineStatus::BeyondFarPlane,
        "point beyond far plane is rejected"
    );
    lab::ModelTransform outsideModel = centeredModel;
    outsideModel.position = {20.0, 0.0, 5.0};
    check(
        lab::tracePipeline({0.0, 0.0, 0.0}, outsideModel, centeredCamera, lens, 800, 600).status ==
            lab::PipelineStatus::OutsideFrustum,
        "point outside NDC is not clamped into the viewport"
    );

    // Pipeline chạy rời và matrix MVP ghép phải tạo đúng cùng clip point.
    check(
        lab::pipelineAgreementError(localVertex, model, camera, lens, 1280, 720) <= 1e-9,
        "separate Model View Projection matches composed MVP"
    );
    const double advanced = lab::advanceModelYaw(0.0, 2.0, 0.5);
    check(near(advanced, 0.2), "animation clamps an oversized delta time to one tenth second");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 15 validation passed.\n";
    return EXIT_SUCCESS;
}
