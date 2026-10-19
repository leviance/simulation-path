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
    const lab::RoomGeometry room = lab::makeRoomGeometry({}, 2.0);
    check(room.size() == 96, "room has 96 world segments including two box markers");
    check(same(room[0].from, {-6.0, 0.0, 0.0}) && same(room[0].to, {-6.0, 0.0, 22.0}), "floor world oracle");
    check(lab::makeRoomGeometry({}, 0.0).empty(), "reject zero spacing");
    check(lab::makeRoomGeometry({}, std::numeric_limits<double>::quiet_NaN()).empty(), "reject NaN spacing");
    check(lab::makeRoomGeometry({}, 0.00001).empty(), "reject unbounded generation work");

    // Oracle độc lập: camera ở (1,2,3), quay phải 90°, world +X trở thành camera +Z.
    lab::FpsCamera camera;
    camera.position = {1.0, 2.0, 3.0};
    camera.yaw = lab::kPi / 2.0;
    check(same(lab::worldToCameraTranslation({4.0, 2.0, 3.0}, camera), {3.0, 0.0, 0.0}), "translation oracle");
    check(same(lab::worldToCamera({4.0, 2.0, 3.0}, camera), {0.0, 0.0, 3.0}), "yaw 90 independent view oracle");
    check(same(lab::cameraBasis(camera).right, {0.0, 0.0, -1.0}), "yaw 90 right oracle");
    camera.yaw = 0.0;
    camera.pitch = lab::kPi / 2.0;
    check(same(lab::worldToCamera({1.0, 5.0, 3.0}, camera), {0.0, 0.0, 3.0}), "pitch 90 independent view oracle");

    for (int i = 0; i < 60; ++i) {
        camera.yaw = i * 0.31;
        camera.pitch = -1.4 + i * 0.045;
        const lab::Vec3 world{4.0, 2.3, 15.0};
        const lab::Vec3 relative = lab::subtract(world, camera.position);
        const auto basis = lab::cameraBasis(camera);
        const lab::Vec3 byDot{lab::dot(relative, basis.right), lab::dot(relative, basis.up), lab::dot(relative, basis.forward)};
        check(same(lab::worldToCamera(world, camera), byDot), "view equals independent basis dot formula");
        check(lab::basisError(camera) < 1e-12, "basis remains orthonormal");
        check(lab::viewRoundTripError(world, camera) < 1e-9, "world camera world round trip");
    }

    lab::Scene scene;
    scene.lens.verticalFovRadians = lab::kPi / 2.0;
    const lab::Vec3 point = lab::viewPoint({1.0, 2.1, 6.0}, scene);
    const auto projected = lab::projectPerspective(point, lab::Camera3D{}, scene.lens, lab::viewportFor());
    check(projected.screen && near(projected.screen->x, 650.0) && near(projected.screen->y, 350.0), "view to pixel independent oracle");
    const auto crossing = lab::projectRoomSegment({-20.0, 1.6, 6.0}, {20.0, 1.6, 6.0}, scene);
    check(crossing && near((*crossing)[0].x, 0.0) && near((*crossing)[1].x, 1100.0), "two outside endpoints retain crossing segment");
    check(lab::projectRoomSegment({0.0, 1.6, 1.0}, {0.2, 1.6, 4.0}, scene).has_value(), "near crossing survives");
    check(lab::projectRoomSegment({0.0, 1.6, 6.0}, {0.0, 1.6, 50.0}, scene).has_value(), "far crossing survives");
    check(!lab::projectRoomSegment({0.0, 1.6, 0.0}, {1.0, 1.6, 1.0}, scene), "behind segment rejected");

    // Đi bộ: pitch không ảnh hưởng hướng ngang, diagonal và dt không đổi tổng tốc độ.
    for (int fps : {30, 60, 144}) {
        lab::FpsCamera walked;
        for (int frame = 0; frame < fps; ++frame) {
            walked = lab::advanceCamera(walked, {0.0, 1.0, 0.0}, lab::MovementMode::Walk, 3.5, 1.0 / fps);
        }
        check(same(walked.position, {0.0, 1.6, 5.5}), "one second movement independent of frame count");
    }
    lab::FpsCamera start;
    start.pitch = lab::kPi / 4.0;
    const auto walk = lab::advanceCamera(start, {1.0, 1.0, 1.0}, lab::MovementMode::Walk, 3.5, 0.1);
    check(near(walk.position.y, 1.6), "walk ignores pitch and lift");
    check(near(lab::magnitude(lab::subtract(walk.position, start.position)), 0.35), "walk diagonal normalized");
    const auto fly = lab::advanceCamera(start, {0.0, 1.0, 0.0}, lab::MovementMode::Fly, 3.5, 0.1);
    check(near(fly.position.y, 1.6 + 0.35 / std::sqrt(2.0)) && near(fly.position.z, 2.0 + 0.35 / std::sqrt(2.0)), "fly pitch45 independent movement oracle");
    const auto flyLift = lab::advanceCamera(start, {1.0, 1.0, 1.0}, lab::MovementMode::Fly, 3.5, 0.1);
    check(near(lab::magnitude(lab::subtract(flyLift.position, start.position)), 0.35), "fly plus world lift does not increase speed");
    check(same(lab::advanceCamera(start, {1.0, 1.0, 1.0}, lab::MovementMode::Fly, 3.5, -1.0).position, start.position), "negative dt ignored");
    check(same(lab::advanceCamera(start, {1.0, 1.0, 1.0}, lab::MovementMode::Fly, 3.5, std::numeric_limits<double>::quiet_NaN()).position, start.position), "NaN dt ignored");
    const auto opposite = lab::makeMoveInput(true, true, true, true, true, true);
    check(opposite.strafe == 0.0 && opposite.advance == 0.0 && opposite.lift == 0.0, "opposite keys cancel");

    const auto looked = lab::applyMouseLook({}, 20.0, -10.0, 0.0025);
    check(near(looked.yaw, 0.05) && near(looked.pitch, 0.025), "relative delta independent of dt");
    const auto extreme = lab::applyMouseLook({}, 1e5, -1e5, 0.0025);
    check(near(extreme.pitch, 89.0 * lab::kPi / 180.0) && std::abs(extreme.yaw) <= lab::kPi, "pitch clamp and yaw wrap");
    lab::FpsCamera outside;
    outside.position = {100.0, -10.0, -100.0};
    const auto limited = lab::clampCameraToRoom(outside, {}, true, 0.35);
    check(same(limited.position, {5.65, 0.35, 0.35}), "fly six-plane bounds");
    check(near(lab::clampCameraToRoom(outside, {}, false, 0.35).position.y, 1.6), "walk restores eye height");
    lab::Scene paused;
    paused.paused = true;
    lab::advanceScene(paused, {0.0, 1.0, 0.0}, 0.1);
    check(same(paused.camera.position, {0.0, 1.6, 2.0}), "paused update does not move");
    lab::Scene modes;
    modes.fly = true;
    modes.camera.position.y = 3.0;
    lab::changeMode(modes);
    check(!modes.fly && near(modes.camera.position.y, 1.6), "switch to walk restores eye");
    modes.margin = 1.0;
    modes.camera.position.x = 5.65;
    lab::advanceScene(modes, {}, 0.0);
    check(near(modes.camera.position.x, 5.0), "bounds rechecked even without movement");

    // Cảnh chính phải còn khi debug tắt; room world endpoint không thay qua render.
    lab::Framebuffer image;
    for (int preset = 0; preset <= 4; ++preset) {
        lab::applyPreset(scene, preset);
        const auto stats = lab::renderScene(image, scene, room);
        check(stats.visibleSegments > 0, "every preset renders room segments");
    }
    lab::applyPreset(scene, 0);
    scene.debug = false;
    lab::renderScene(image, scene, room);
    check(std::count(image.pixels.begin(), image.pixels.end(), 0x4484AEFFu) > 500, "clean mode retains floor");
    check(std::count(image.pixels.begin(), image.pixels.end(), 0x7DA5EEFFu) > 500, "clean mode retains walls");
    check(same(room[0].from, {-6.0, 0.0, 0.0}) && same(room[0].to, {-6.0, 0.0, 22.0}), "world geometry immutable");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 14: view, basis, movement, clipping and renderer checks passed\n";
    return EXIT_SUCCESS;
}
