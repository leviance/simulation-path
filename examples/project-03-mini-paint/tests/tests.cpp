#include "paint.hpp"
#include <algorithm>
#include <array>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

std::uint32_t pixel(const lab::Framebuffer& framebuffer, int x, int y) {
    return framebuffer.pixels[static_cast<std::size_t>(y) * lab::Framebuffer::width + x];
}
} // namespace

int main() {
    // Hình học giữ đáp án cụ thể, kể cả khoảng cuối không chia hết cho spacing.
    const auto points = lab::sampleStroke({0.0, 0.0}, {17.0, 0.0}, 8.0);
    check(points.size() == 4, "17/8 needs three intervals and four points");
    check(points.front() == lab::Point{0.0, 0.0}, "stroke keeps start");
    check(points.back() == lab::Point{17.0, 0.0}, "stroke keeps end");
    check(std::abs(points[1].x - 17.0 / 3.0) < 1e-9, "first interior point uses floating-point division");
    for (std::size_t index = 1; index < points.size(); ++index) {
        check(lab::distance(points[index - 1], points[index]) <= 8.0 + 1e-9, "every interval respects spacing");
    }
    const auto same = lab::sampleStroke({2.0, 3.0}, {2.0, 3.0}, 8.0);
    check(same.size() == 1 && same.front() == lab::Point{2.0, 3.0}, "zero-length segment emits one point");
    for (double invalidSpacing : {0.0, -1.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) {
        check(lab::sampleStroke({0.0, 0.0}, {100.0, 0.0}, invalidSpacing).size() == 201, "invalid spacing uses 0.5 px");
    }
    check(lab::sampleStroke({0.0, 0.0}, {2048.0, 0.0}, 0.0).size() == 4097, "maximum segment stays bounded");
    check(lab::sampleStroke({0.0, 0.0}, {2049.0, 0.0}, 0.5).empty(), "overlong segment is rejected, not coarsened");
    check(lab::sampleStroke({0.0, 0.0}, {std::numeric_limits<double>::infinity(), 1.0}, 1.0).empty(), "nonfinite endpoint is rejected");

    // Tô tròn dùng chính code của app, không chỉ test công thức lerp.
    lab::Framebuffer framebuffer;
    framebuffer.clear(lab::kBackground);
    constexpr std::uint32_t ink = 0x53F0AEFFu;
    lab::stampCircle(framebuffer, {20.0, 20.0}, 2, ink);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), ink) == 13, "radius-two brush contains thirteen pixels");
    check(pixel(framebuffer, 22, 20) == ink && pixel(framebuffer, 20, 18) == ink, "circle includes axial boundary");
    check(pixel(framebuffer, 22, 21) == lab::kBackground, "circle excludes squared distance five");
    framebuffer.clear(lab::kBackground);
    lab::stampCircle(framebuffer, {0.0, 0.0}, 2, ink);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), ink) == 6, "circle clips at corner without writing outside");
    const auto before = framebuffer.pixels;
    lab::stampCircle(framebuffer, {1e300, 0.0}, 12, ink);
    lab::stampCircle(framebuffer, {20.0, 20.0}, 999, ink);
    framebuffer.putPixel(-1, 0, ink);
    framebuffer.putPixel(960, 539, ink);
    check(framebuffer.pixels == before, "invalid center, radius and pixel coordinates do not write");
    framebuffer.clear(lab::kBackground);
    lab::stampCircle(framebuffer, {20.0, 20.0}, 12, ink);
    for (int dy = -12; dy <= 12; ++dy) {
        for (int dx = -12; dx <= 12; ++dx) {
            check(pixel(framebuffer, 20 + dx, 20 + dy) == pixel(framebuffer, 20 - dx, 20 + dy), "brush is horizontally symmetric");
            check(pixel(framebuffer, 20 + dx, 20 + dy) == pixel(framebuffer, 20 + dy, 20 + dx), "brush is symmetric under axis swap");
        }
    }

    // Kiểm begin/move/end thật; nút up phải đưa được điểm cuối chưa có motion.
    framebuffer.clear(lab::kBackground);
    lab::PaintState state;
    state.radius = 2;
    check(!lab::moveStroke(framebuffer, state, {20.0, 20.0}), "hover cannot paint");
    check(!lab::beginStroke(framebuffer, state, {-1.0, 20.0}), "letterbox or outside down cannot start");
    check(lab::beginStroke(framebuffer, state, {20.0, 20.0}), "down starts stroke");
    check(!lab::beginStroke(framebuffer, state, {80.0, 20.0}), "second down cannot replace active stroke");
    check(lab::endStroke(framebuffer, state, {80.0, 20.0}), "up includes final endpoint");
    check(pixel(framebuffer, 80, 20) == ink && pixel(framebuffer, 50, 20) == ink, "release-only segment is connected");
    check(!state.drawing, "up closes stroke");
    lab::beginStroke(framebuffer, state, {150.0, 20.0});
    lab::endStroke(framebuffer, state, {150.0, 20.0});
    check(pixel(framebuffer, 110, 20) == lab::kBackground, "separate strokes never bridge");
    lab::beginStroke(framebuffer, state, {150.0, 40.0});
    lab::moveStroke(framebuffer, state, {960.0, 40.0});
    check(!state.drawing, "leaving logical board cancels stroke");
    check(!lab::moveStroke(framebuffer, state, {150.0, 50.0}), "reentry while held does not silently restart");
    lab::beginStroke(framebuffer, state, {200.0, 60.0});
    lab::cancelStroke(state);
    check(!lab::endStroke(framebuffer, state, {250.0, 60.0}), "cancel cannot draw a final bridge");

    // Endpoint vẫn được giữ khi motion bị cố ý lấy thưa ở thí nghiệm.
    state.sampleEvery = 8;
    lab::beginStroke(framebuffer, state, {300.0, 80.0});
    check(!lab::moveStroke(framebuffer, state, {310.0, 80.0}), "thinning can discard motion");
    lab::endStroke(framebuffer, state, {320.0, 80.0});
    check(pixel(framebuffer, 320, 80) == ink, "up bypasses thinning");
    state.sampleEvery = 0;
    lab::beginStroke(framebuffer, state, {350.0, 80.0});
    check(lab::moveStroke(framebuffer, state, {355.0, 80.0}), "invalid sampling interval cannot divide by zero");
    lab::cancelStroke(state);
    state.sampleEvery = 1;

    // Các hướng khác nhau có đường tâm được phủ kín sau rasterization.
    const std::array<lab::Point, 8> endpoints{{
        {260.0, 200.0}, {260.0, 230.0}, {200.0, 260.0}, {170.0, 260.0},
        {140.0, 200.0}, {140.0, 170.0}, {200.0, 140.0}, {230.0, 140.0},
    }};
    for (lab::Point endpoint : endpoints) {
        framebuffer.clear(lab::kBackground);
        lab::beginStroke(framebuffer, state, {200.0, 200.0});
        lab::endStroke(framebuffer, state, endpoint);
        for (int step = 0; step <= 1000; ++step) {
            const lab::Point probe = lab::lerp({200.0, 200.0}, endpoint, static_cast<double>(step) / 1000.0);
            const int x = static_cast<int>(std::floor(probe.x));
            const int y = static_cast<int>(std::floor(probe.y));
            check(pixel(framebuffer, x, y) == ink, "raster stroke covers sampled centerline in every octant");
        }
    }

    // Đổi công cụ và clear không được nối từ tọa độ trước đó.
    lab::beginStroke(framebuffer, state, {100.0, 100.0});
    lab::chooseColor(state, 2);
    check(!state.drawing && state.color == lab::kPalette[2], "color change ends active stroke");
    lab::changeRadius(state, -1000);
    check(state.radius == 2, "radius respects minimum");
    lab::changeRadius(state, 1000);
    check(state.radius == 64, "radius respects maximum");
    lab::clearPainting(framebuffer, state);
    check(!state.drawing && std::all_of(framebuffer.pixels.begin(), framebuffer.pixels.end(), [](std::uint32_t value) {
        return value == lab::kBackground;
    }), "clear changes CPU image and closes stroke");
    lab::drawDemo(framebuffer, state);
    check(!state.drawing && state.maximumGap == 200.0, "repeatable demo uses real stroke functions");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 03 validation checks passed\n";
    return EXIT_SUCCESS;
}
