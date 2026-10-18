#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Giữ kiểm tra trong Release; không dựa vào assert/NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAILED: " << label << '\n';
    }
}

bool near(double a, double b, double epsilon = 1e-9) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) < epsilon;
}

bool near(lab::Vec2 a, lab::Vec2 b) {
    return near(a.x, b.x) && near(a.y, b.y);
}
} // namespace

int main() {
    // Fixtures tính tay, không chỉ gọi ngược cùng một công thức.
    const lab::Vec2 a{3.0, 4.0};
    const lab::Vec2 b{-2.0, 5.0};
    check(a + b == lab::Vec2{1.0, 9.0}, "addition fixture");
    check(a - b == lab::Vec2{5.0, -1.0}, "subtraction fixture");
    check(a * -2.0 == lab::Vec2{-6.0, -8.0} && 2.0 * a == lab::Vec2{6.0, 8.0}, "scalar fixture");
    check(near(lab::lengthSquared(a), 25.0) && near(lab::length(a), 5.0), "3-4-5 length");
    check(near(lab::normalize(a), {0.6, 0.8}), "normalize fixture");
    check(near(lab::distance(a, b), std::sqrt(26.0)), "distance fixture");
    check(near(lab::worldToScreen({3.0, 1.5}), {685.0, 352.5}), "independent world-to-screen fixture");
    check(near(lab::screenToWorld({685.0, 352.5}), {3.0, 1.5}), "independent inverse fixture");

    for (int x = -40; x <= 40; ++x) {
        for (int y = -30; y <= 30; ++y) {
            const lab::Vec2 p{x * 0.1, y * 0.1};
            const lab::Vec2 q{-y * 0.07, x * 0.05};
            const lab::Vec2 sum = p + q;
            check(near(sum - p, q) && near(sum - q, p), "parallelogram two copied edges");
            check(near(q + (p - q), p), "difference is B-to-A displacement");
            check(near(lab::length(p - q), lab::distance(p, q)), "distance is difference magnitude");
            check(near(lab::distance(p, q), lab::distance(q, p)), "distance symmetry");
            check(near(lab::screenToWorld(lab::worldToScreen(p)), p), "coordinate round trip");
            if (x != 0 || y != 0) {
                const lab::Vec2 unit = lab::normalize(p);
                check(near(lab::length(unit), 1.0), "unit norm over signed domain");
                check(near(p.x * unit.y - p.y * unit.x, 0.0), "normalization keeps parallel direction");
                check(p.x * unit.x + p.y * unit.y > 0.0, "normalization keeps orientation");
            }
            for (double t : {0.0, 0.25, 0.5, 1.0}) {
                const lab::Vec2 actual = lab::lerp(p, q, t);
                const lab::Vec2 reference{(1.0 - t) * p.x + t * q.x, (1.0 - t) * p.y + t * q.y};
                check(near(actual, reference), "lerp agrees with independently weighted components");
            }
        }
    }

    // Scale trước normalize bảo vệ cả số subnormal và gần DBL_MAX.
    const double smallest = std::numeric_limits<double>::denorm_min();
    const double largest = std::numeric_limits<double>::max();
    for (lab::Vec2 v : {lab::Vec2{smallest, smallest}, lab::Vec2{1e-300, -1e-300}, lab::Vec2{largest, largest}, lab::Vec2{-largest, 1.0}}) {
        check(near(lab::length(lab::normalize(v)), 1.0), "extreme finite normalization stays unit");
    }
    check(lab::normalize({}) == lab::Vec2{}, "zero has safe fallback, not a unit direction");
    check(lab::normalize({std::numeric_limits<double>::infinity(), 1.0}) == lab::Vec2{}, "infinity rejected");
    check(lab::normalize({std::numeric_limits<double>::quiet_NaN(), 1.0}) == lab::Vec2{}, "NaN rejected");
    check(near(lab::lerp(a, b, -1.0), {8.0, 3.0}) && near(lab::lerp(a, b, 2.0), {-7.0, 6.0}), "math lerp extrapolates without UI clamp");

    const lab::ArrowHead head = lab::arrowHead({0.0, 0.0}, {100.0, 0.0});
    check(head.visible && near(head.leftWing, {86.0, 6.0}) && near(head.rightWing, {86.0, -6.0}), "screen arrow wings fixture");
    check(!lab::arrowHead({}, {}).visible, "zero arrow has no invalid head");
    const lab::ArrowHead shortHead = lab::arrowHead({}, {5.0, 0.0});
    check(shortHead.visible && near(shortHead.leftWing.x, 2.0), "short head does not extend behind tail");

    lab::Scene scene;
    const lab::Vec2 endpoint = lab::worldToScreen(scene.vectorA);
    check(lab::hitTarget(scene, {endpoint.x + 14.0, endpoint.y}) == 0, "hit boundary inclusive");
    check(lab::hitTarget(scene, {endpoint.x + 14.01, endpoint.y}) == -1, "outside hit radius");
    const lab::Vec2 original = scene.vectorA;
    const lab::Vec2 grab{endpoint.x + 8.0, endpoint.y - 3.0};
    check(lab::beginDrag(scene, grab) && scene.vectorA == original, "grabbing off-center never snaps");
    lab::moveEndpoint(scene, {grab.x + 45.0, grab.y + 22.5});
    check(near(scene.vectorA, {4.0, 1.0}), "drag uses world delta and grab offset");
    lab::moveEndpoint(scene, {-1000.0, 9000.0});
    check(near(scene.vectorA, {-4.0, -3.0}), "outside captured pointer clamps to endpoint domain");
    lab::cancelDrag(scene);
    const lab::Vec2 stopped = scene.vectorA;
    lab::moveEndpoint(scene, {});
    check(scene.vectorA == stopped, "cancelled drag ignores later moves");
    check(!lab::beginDrag(scene, {20.0, 20.0}), "empty click never adds a vector");
    lab::applyPreset(scene, 4);
    scene.selected = 1;
    check(lab::beginDrag(scene, lab::worldToScreen({})) && scene.dragged == 1, "coincident endpoints respect selection");
    lab::nudgeEndpoint(scene, {0.1, 0.0});
    check(near(scene.vectorB, {0.1, 0.0}) && scene.dragged == -1, "keyboard nudge cancels stale drag");

    // Ở mọi góc miền endpoint, cả tổng/hiệu/scalar đều nằm trên bảng.
    for (double ax : {-4.0, 4.0}) for (double ay : {-3.0, 3.0}) {
        for (double bx : {-4.0, 4.0}) for (double by : {-3.0, 3.0}) {
            const lab::Vec2 p{ax, ay}, q{bx, by};
            for (lab::Vec2 result : {p + q, p - q, p * 2.0, p * -2.0}) {
                const lab::Vec2 screen = lab::worldToScreen(result);
                check(screen.x >= 0.0 && screen.x < lab::Framebuffer::width && screen.y >= 130.0 && screen.y < 704.0, "required results stay visible");
            }
        }
    }

    // Xác nhận renderer thật có cả hai kết quả, không chỉ model/console.
    scene = {};
    lab::Framebuffer image;
    lab::renderScene(image, scene);
    const auto countColor = [&](std::uint32_t color) {
        return std::count(image.pixels.begin(), image.pixels.end(), color);
    };
    check(countColor(lab::kA) > 10 && countColor(lab::kB) > 10, "two base arrows rasterized");
    check(countColor(lab::kSum) > 10 && countColor(lab::kDifference) > 10, "sum and difference visible together by default");
    for (lab::Scene::ViewMode mode : {lab::Scene::ViewMode::Scalar, lab::Scene::ViewMode::Unit, lab::Scene::ViewMode::Interpolation, lab::Scene::ViewMode::All}) {
        scene.viewMode = mode;
        lab::renderScene(image, scene);
        check(countColor(lab::kSum) > 10 && countColor(lab::kDifference) > 10, "overlays never hide required arithmetic results");
    }
    // Điểm lerp ở đầu đoạn vẫn phải nhìn thấy, không bị endpoint phủ lại.
    scene = {};
    scene.viewMode = lab::Scene::ViewMode::Interpolation;
    for (double t : {0.0, 1.0}) {
        scene.interpolation = t;
        lab::renderScene(image, scene);
        const lab::Vec2 screen = lab::worldToScreen(lab::lerp(scene.vectorA, scene.vectorB, t));
        const int x = static_cast<int>(std::lround(screen.x));
        const int y = static_cast<int>(std::lround(screen.y));
        check(image.pixels[static_cast<std::size_t>(y) * lab::Framebuffer::width + x] == lab::kLerp, "lerp endpoint remains visible at t=0/1");
    }
    scene.vectorA = {};
    scene.vectorB = {};
    lab::renderScene(image, scene);
    check(image.pixels.size() == 1100 * 760, "zero vectors render safely at fixed memory size");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "All Project 06 validation checks passed\n";
    return EXIT_SUCCESS;
}
