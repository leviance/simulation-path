#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        ++failures;
    }
}

bool near(double actual, double expected, double tolerance = 1e-9) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= tolerance;
}

bool nearPoint(lab::Vec2 actual, lab::Vec2 expected) {
    return near(actual.x, expected.x) && near(actual.y, expected.y);
}

void checkRoundTrip(double original) {
    const double restored = lab::angleFromDirection(lab::unitDirection(original));
    const double expected = lab::normalizeAngle(original);
    const double difference = std::abs(restored - expected);
    check(std::min(difference, lab::kTau - difference) < 1e-9, "angle round trip across seam");
}

void checkHistory(const lab::Scene& scene, double initialAngle, double speed) {
    check(scene.samples.size() <= lab::kMaximumSamples, "bounded history");
    double previous = -1.0;
    for (const lab::WaveSample& sample : scene.samples) {
        check(sample.time > previous, "strictly increasing sample timestamp");
        check(sample.time <= scene.elapsedTime + 1e-10, "no future samples");
        // Nghiệm giải tích độc lập, không gọi lại advanceScene để tạo expected.
        const double angle = initialAngle + speed * sample.time;
        check(near(sample.sine, std::sin(angle)), "sample sine uses its own timestamp");
        check(near(sample.cosine, std::cos(angle)), "sample cosine uses its own timestamp");
        previous = sample.time;
    }
}

std::size_t countColor(const lab::Framebuffer& image, std::uint32_t color, int left, int right) {
    std::size_t count = 0;
    for (int y = 170; y < 620; ++y) {
        for (int x = left; x < right; ++x) {
            if (image.pixels[static_cast<std::size_t>(y) * lab::Framebuffer::width + x] == color) {
                ++count;
            }
        }
    }
    return count;
}
}

int main() {
    // Những mốc đã biết không phụ thuộc vào implementation đang kiểm thử.
    check(near(lab::degreesToRadians(180.0), lab::kPi), "180 degrees is pi");
    check(near(lab::radiansToDegrees(lab::kTau), 360.0), "tau is one turn");
    check(near(lab::normalizeAngle(-lab::kPi / 2.0), 3.0 * lab::kPi / 2.0), "negative angle");
    check(lab::normalizeAngle(lab::kTau) == 0.0, "tau wraps to zero");
    check(!std::signbit(lab::normalizeAngle(-0.0)), "canonical positive zero");
    for (double value : {-1e-300, -std::numeric_limits<double>::denorm_min(), 1e300, -1e300}) {
        const double angle = lab::normalizeAngle(value);
        check(angle >= 0.0 && angle < lab::kTau, "half-open angle range, including rounding edge");
    }
    check(lab::normalizeAngle(std::numeric_limits<double>::infinity()) == 0.0, "nonfinite policy");
    check(lab::normalizeAngle(std::numeric_limits<double>::quiet_NaN()) == 0.0, "NaN policy");
    check(nearPoint(lab::unitDirection(0.0), {1.0, 0.0}), "zero points right");
    check(nearPoint(lab::unitDirection(lab::kPi / 2.0), {0.0, 1.0}), "pi/2 points up");
    check(nearPoint(lab::unitDirection(lab::kPi), {-1.0, 0.0}), "pi points left");
    check(nearPoint(lab::unitDirection(3.0 * lab::kPi / 2.0), {0.0, -1.0}), "3pi/2 points down");
    check(nearPoint(lab::pointOnCircle({2.0, -1.0}, 3.0, lab::kPi / 2.0), {2.0, 2.0}), "translated/scaled circle");

    for (int index = -2000; index <= 2000; ++index) {
        const double angle = static_cast<double>(index) * 0.019;
        const lab::Vec2 direction = lab::unitDirection(angle);
        check(near(direction.x * direction.x + direction.y * direction.y, 1.0), "unit identity");
        checkRoundTrip(angle);
        check(nearPoint(lab::projectOntoXAxis(direction), {direction.x, 0.0}), "X projection");
        check(nearPoint(lab::projectOntoYAxis(direction), {0.0, direction.y}), "Y projection");
        check(nearPoint(lab::screenToDirection(lab::worldToScreen(direction)), direction), "screen/world round trip");
    }
    check(near(lab::angleFromDirection({-1.0, 1.0}), 3.0 * lab::kPi / 4.0), "atan2 quadrant II");
    check(lab::angleFromDirection({0.0, 0.0}) == 0.0, "math zero fallback");
    check(lab::angleFromDirection({-0.0, -0.0}) == 0.0, "signed-zero direction fallback");
    check(lab::angleFromDirection({0.0, std::numeric_limits<double>::infinity()}) == 0.0, "nonfinite direction");
    check(near(lab::periodFromAngularSpeed(lab::kPi / 2.0), 4.0), "four-second period");
    check(near(lab::periodFromAngularSpeed(-lab::kPi / 2.0), 4.0), "reverse period");
    check(std::isinf(lab::periodFromAngularSpeed(0.0)), "stationary period");

    // Cùng một giây: frame đều, frame chậm và chuỗi không đều phải khớp cả góc lẫn lịch sử.
    lab::Scene fast;
    lab::Scene slow;
    lab::Scene uneven;
    for (int index = 0; index < 120; ++index) {
        lab::advanceScene(fast, 1.0 / 120.0);
    }
    for (int index = 0; index < 10; ++index) {
        lab::advanceScene(slow, 0.1);
        lab::advanceScene(uneven, 0.013);
        lab::advanceScene(uneven, 0.027);
        lab::advanceScene(uneven, 0.06);
    }
    const double initial = lab::degreesToRadians(35.0);
    const double expected = lab::normalizeAngle(initial + lab::kPi / 2.0);
    for (const lab::Scene* scene : {&fast, &slow, &uneven}) {
        check(near(scene->angle, expected), "frame-independent angle");
        check(scene->samples.size() == 61, "60 Hz includes sample at time zero");
        checkHistory(*scene, initial, lab::kPi / 2.0);
    }
    for (std::size_t index = 0; index < fast.samples.size(); ++index) {
        check(near(fast.samples[index].time, slow.samples[index].time), "same sampling grid");
        check(near(fast.samples[index].sine, slow.samples[index].sine), "same sampled sine");
        check(near(fast.samples[index].cosine, uneven.samples[index].cosine), "same sampled cosine");
    }

    lab::Scene longRun;
    longRun.angularSpeed = -lab::kPi / 2.0;
    for (int index = 0; index < 1000; ++index) {
        lab::advanceScene(longRun, 0.1);
    }
    check(longRun.samples.size() == 361, "history capacity after 100 seconds");
    checkHistory(longRun, initial, -lab::kPi / 2.0);
    check(near(longRun.samples.back().time - longRun.samples.front().time, 6.0), "six seconds exactly");
    const double before = longRun.angle;
    for (double invalid : {-1.0, 1.0, std::numeric_limits<double>::quiet_NaN()}) {
        lab::advanceScene(longRun, invalid);
        check(longRun.angle == before, "invalid frame leaves state unchanged");
    }
    check(near(lab::mapSampleTimeToX(7.0, 10.0, 570.0, 1050.0), 810.0), "timestamp determines X");
    check(lab::mapSampleTimeToX(1.0, 10.0, 570.0, 1050.0) == 570.0, "plot left clamp");
    check(lab::mapSampleTimeToX(12.0, 10.0, 570.0, 1050.0) == 1050.0, "plot right clamp");

    // Chỉ đầu kim nhận drag. Kiểm tra cả góc phần tư, vùng tâm và grab offset.
    lab::Scene drag;
    lab::setManualAngle(drag, 0.0);
    check(!lab::beginDrag(drag, {479.0, 390.0}), "outside 18-pixel hit radius");
    check(lab::beginDrag(drag, {478.0, 390.0}), "inclusive hit boundary");
    check(lab::moveNeedle(drag, {275.0, 205.0}), "drag up");
    check(near(drag.angle, lab::kPi / 2.0), "drag uses world Y");
    const double prior = drag.angle;
    check(!lab::moveNeedle(drag, lab::kCenter), "ignore center");
    check(drag.angle == prior, "center does not snap to zero");
    check(lab::moveNeedle(drag, {90.0, 390.0}), "drag left");
    check(near(drag.angle, lab::kPi), "drag quadrant II/III seam");
    lab::cancelDrag(drag);
    check(!drag.dragging, "capture cancellation");
    lab::setManualAngle(drag, 0.0);
    check(lab::beginDrag(drag, {460.0, 400.0}), "offset grab");
    lab::moveNeedle(drag, {460.0, 400.0});
    check(near(drag.angle, 0.0), "no jump on offset grab");
    lab::setManualAngle(drag, lab::kPi);
    check(drag.samples.size() == 1 && drag.elapsedTime == 0.0, "manual angle restarts history");

    // Kiểm tra ảnh CPU thực tế, không chỉ kiểm tra công thức có trả số đúng.
    lab::Framebuffer image;
    lab::Scene visible;
    for (int frame = 0; frame < 60; ++frame) {
        lab::advanceScene(visible, 0.1);
    }
    lab::setManualAngle(visible, lab::kPi / 4.0);
    for (int frame = 0; frame < 60; ++frame) {
        lab::advanceScene(visible, 0.1);
    }
    lab::renderScene(image, visible);
    check(countColor(image, lab::kSine, 60, 500) > 30, "visible sine projection");
    check(countColor(image, lab::kCosine, 60, 500) > 30, "visible cosine projection");
    check(countColor(image, lab::kNeedle, 60, 500) > 100, "visible needle");
    check(countColor(image, lab::kSine, 570, 1051) > 300, "visible real sine graph");
    check(countColor(image, lab::kCosine, 570, 1051) > 300, "visible real cosine graph");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "All Project 07 validation checks passed\n";
    return EXIT_SUCCESS;
}
