#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Không dùng assert: Release vẫn phải trả mã lỗi khi kiểm tra thất bại.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAILED: " << label << '\n';
        ++failures;
    }
}

bool near(lab::Vec2 a, lab::Vec2 b) {
    return lab::distance(a, b) < 1e-9;
}
} // namespace

int main() {
    lab::Camera2D camera;
    check(near(camera.worldToScreen({2.0, 1.0}), {590.0, 215.0}), "independent forward fixture fixes axis direction and origin");
    check(near(camera.screenToWorld({590.0, 215.0}), {2.0, 1.0}), "independent inverse fixture");

    // Nhiều camera, mức zoom, viewport và điểm âm/dương.
    for (double scale : {5.0, 20.0, 55.0, 160.0, 800.0}) {
        for (lab::Vec2 center : {lab::Vec2{0.0, 0.0}, lab::Vec2{-120.5, 91.25}}) {
            for (lab::Vec2 viewport : {lab::Vec2{320.0, 240.0}, lab::Vec2{1600.0, 900.0}}) {
                camera = {center, scale, viewport};
                for (int x = -20; x <= 20; ++x) {
                    const lab::Vec2 world{x * 3.7, x * -2.3 + 1.0};
                    check(near(camera.screenToWorld(camera.worldToScreen(world)), world), "world round trip");
                    const lab::Vec2 screen{x * 7.5, x * 4.1};
                    check(near(camera.worldToScreen(camera.screenToWorld(screen)), screen), "screen round trip");
                    const lab::Vec2 anchor = camera.screenToWorld(screen);
                    camera.zoomAt(screen, 1.12);
                    check(near(camera.screenToWorld(screen), anchor), "zoom keeps cursor anchor");
                }
            }
        }
        const double spacing = lab::gridSpacing(scale);
        check(spacing * scale >= 40.0 - 1e-9 && spacing * scale <= 100.0 + 1e-9, "adaptive grid spacing stays legible");
    }

    camera = {};
    const lab::Vec2 before = camera.worldToScreen({2.0, 1.0});
    camera.pan({55.0, 27.5});
    check(near(camera.centerWorld, {-1.0, 0.5}), "camera moves opposite horizontal drag");
    const lab::Vec2 after = camera.worldToScreen({2.0, 1.0});
    check(near({after.x - before.x, after.y - before.y}, {55.0, 27.5}), "scene follows pan delta exactly");

    // Bù anchor phải đúng cả lúc chạm giới hạn zoom và khi bỏ input lỗi.
    const lab::Vec2 cursor{805.0, 117.0};
    for (double factor : {1e100, 1e-100, 1.4, 0.8}) {
        const lab::Vec2 anchor = camera.screenToWorld(cursor);
        camera.zoomAt(cursor, factor);
        check(near(camera.screenToWorld(cursor), anchor), "anchor preserved at zoom clamp");
        check(camera.scale() >= 5.0 && camera.scale() <= 800.0, "scale clamp");
    }
    const lab::Camera2D unchanged = camera;
    for (double invalid : {0.0, -1.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) {
        camera.zoomAt(cursor, invalid);
        check(camera.centerWorld == unchanged.centerWorld && camera.pixelsPerUnit == unchanged.pixelsPerUnit, "invalid zoom is a no-op");
    }
    camera.pixelsPerUnit = 0.0;
    check(near(camera.screenToWorld(camera.worldToScreen({3.0, -2.0})), {3.0, -2.0}), "invalid scale uses shared fallback");

    // Hit-test trong screen space và grab offset tránh nhảy khi nắm lệch tâm.
    lab::Scene scene;
    scene.points = {{2.0, 1.0}, {-1.0, -2.0}};
    for (double scale : {5.0, 55.0, 800.0}) {
        scene.camera.pixelsPerUnit = scale;
        const lab::Vec2 pointScreen = scene.camera.worldToScreen(scene.points[0]);
        check(lab::hitPoint(scene, {pointScreen.x + 10.0, pointScreen.y}) == 0, "10 pixel hit boundary at every zoom");
        check(lab::hitPoint(scene, {pointScreen.x + 10.01, pointScreen.y}) == -1, "outside hit radius");
    }
    scene.camera = {};
    const lab::Vec2 pointScreen = scene.camera.worldToScreen(scene.points[0]);
    const lab::Vec2 grab{pointScreen.x + 6.0, pointScreen.y - 3.0};
    const lab::Vec2 original = scene.points[0];
    lab::beginPointDrag(scene, grab);
    check(near(scene.points[0], original), "selection does not snap point to cursor");
    lab::movePoint(scene, {grab.x + 55.0, grab.y + 27.5});
    check(near(scene.points[0], {3.0, 0.5}), "drag changes world position by pixel delta / scale");
    lab::cancelDrag(scene);
    const lab::Vec2 stopped = scene.points[0];
    lab::movePoint(scene, {0.0, 0.0});
    check(near(scene.points[0], stopped), "cancelled drag cannot move point");
    lab::beginPointDrag(scene, {50.0, 50.0});
    check(scene.points.size() == 3 && scene.selected == 2, "empty click adds independent point");
    lab::eraseSelected(scene);
    check(scene.points.size() == 2 && scene.selected == -1, "delete clears selection");

    const auto points = scene.points;
    scene.camera.pan({130.0, -90.0});
    scene.camera.zoomAt(cursor, 1.8);
    scene.camera.viewportPixels = {1280.0, 720.0};
    check(scene.points == points, "pan zoom resize never mutate world points");
    check(near(scene.camera.worldToScreen(scene.camera.centerWorld), {640.0, 360.0}), "resized viewport center");
    scene.points.assign(256, {0.0, 0.0});
    lab::beginPointDrag(scene, {0.0, 0.0});
    check(scene.points.size() == 256 && !scene.draggingPoint, "point cap is bounded");
    scene.points = {{0.0, 0.0}, {0.0, 0.0}};
    check(lab::hitPoint(scene, scene.camera.worldToScreen({0.0, 0.0})) == 1, "topmost point wins overlap");

    // Raster thực phải có trục, điểm, giữ kích thước và chống ghi vượt ảnh.
    lab::Framebuffer image;
    lab::Scene visible;
    lab::renderScene(image, visible);
    check(image.pixels[270 * image.width + 10] == lab::kAxisX, "X axis raster");
    check(image.pixels[10 * image.width + 480] == lab::kAxisY, "Y axis raster");
    check(image.pixels[215 * image.width + 590] == lab::kPoint, "point raster fixture");
    const auto pixelCount = image.pixels.size();
    image.putPixel(-1, 0, 0);
    image.putPixel(image.width, image.height, 0);
    check(image.pixels.size() == pixelCount, "bounds keep framebuffer size");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "All Project 05 validation checks passed\n";
    return EXIT_SUCCESS;
}
