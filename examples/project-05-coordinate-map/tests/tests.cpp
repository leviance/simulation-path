#include "lab.hpp"
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

bool nearlyEqual(lab::Vec2 left, lab::Vec2 right, double epsilon = 1e-9) {
    return lab::distance(left, right) < epsilon;
}

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}
} // namespace

int main() {
    lab::Camera2D camera;

    // Forward rồi inverse phải phục hồi world point ban đầu.
    const std::vector<lab::Vec2> worldPoints{
        {0.0, 0.0},
        {2.0, 1.0},
        {-8.0, 4.0},
        {100.0, -80.0},
    };
    for (lab::Vec2 world : worldPoints) {
        const lab::Vec2 restored = camera.screenToWorld(camera.worldToScreen(world));
        check(nearlyEqual(world, restored), "world-to-screen round trip restores the world point");
    }

    // Inverse rồi forward cũng phải phục hồi screen point ban đầu.
    const std::vector<lab::Vec2> screenPoints{
        {0.0, 0.0},
        {960.0, 540.0},
        {800.0, 120.0},
        {-50.0, 900.0},
    };
    for (lab::Vec2 screen : screenPoints) {
        const lab::Vec2 restored = camera.worldToScreen(camera.screenToWorld(screen));
        check(nearlyEqual(screen, restored), "screen-to-world round trip restores the screen point");
    }

    // Zoom phải giữ nguyên world point nằm dưới cursor.
    const lab::Vec2 cursor{800.0, 120.0};
    const lab::Vec2 worldBeforeZoom = camera.screenToWorld(cursor);
    camera.zoomAt(cursor, 1.4);
    const lab::Vec2 worldAfterZoom = camera.screenToWorld(cursor);
    check(nearlyEqual(worldBeforeZoom, worldAfterZoom), "zoom keeps the world point under the cursor");

    // Pan được kiểm tra riêng theo từng trục để thấy rõ dấu của phép biến đổi.
    const lab::Vec2 centerBeforePan = camera.centerWorld;
    const double expectedShift = 55.0 / camera.pixelsPerUnit;
    camera.pan({55.0, 0.0});
    check(std::abs(camera.centerWorld.x - (centerBeforePan.x - expectedShift)) < 1e-9, "horizontal pan updates world X");
    check(std::abs(camera.centerWorld.y - centerBeforePan.y) < 1e-9, "horizontal pan keeps world Y");
    const lab::Vec2 centerBeforeVerticalPan = camera.centerWorld;
    camera.pan({0.0, 55.0});
    check(std::abs(camera.centerWorld.x - centerBeforeVerticalPan.x) < 1e-9, "vertical pan keeps world X");
    check(std::abs(camera.centerWorld.y - (centerBeforeVerticalPan.y + expectedShift)) < 1e-9, "vertical pan updates world Y");

    // Scale và zoom input không hợp lệ không được làm camera thành NaN.
    camera.pixelsPerUnit = 0.0;
    const lab::Vec2 restored = camera.screenToWorld(camera.worldToScreen({3.0, -2.0}));
    check(nearlyEqual(restored, {3.0, -2.0}), "invalid scale still produces an invertible transform");
    camera.zoomAt(cursor, -1.0);
    check(camera.pixelsPerUnit >= 20.0, "negative zoom factor cannot make scale invalid");
    const lab::Vec2 centerBeforeInvalidZoom = camera.centerWorld;
    const double scaleBeforeInvalidZoom = camera.pixelsPerUnit;
    camera.zoomAt(cursor, std::numeric_limits<double>::quiet_NaN());
    check(nearlyEqual(camera.centerWorld, centerBeforeInvalidZoom), "NaN zoom factor keeps camera center");
    check(camera.pixelsPerUnit == scaleBeforeInvalidZoom, "NaN zoom factor keeps scale");
    camera.zoomAt(cursor, 1e9);
    check(camera.pixelsPerUnit == 160.0, "zoom scale is clamped at the upper bound");
    camera.zoomAt(cursor, 1e-9);
    check(camera.pixelsPerUnit == 20.0, "zoom scale is clamped at the lower bound");

    // Camera center luôn ánh xạ tới chính giữa viewport mới.
    camera.viewportPixels = {1280.0, 720.0};
    const lab::Vec2 screenCenter = camera.worldToScreen(camera.centerWorld);
    check(nearlyEqual(screenCenter, {640.0, 360.0}), "camera center maps to the resized viewport center");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 05 validation checks passed\n";
    return EXIT_SUCCESS;
}
