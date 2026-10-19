#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(double actual, double expected, double tolerance = 1e-9) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= tolerance;
}

bool nearPoint(lab::Vec2 a, lab::Vec2 b) {
    return near(a.x, b.x) && near(a.y, b.y);
}

double angleDistance(double a, double b) {
    return std::abs(std::remainder(a - b, lab::kTau));
}

void checkProjection(lab::Vec2 vector, lab::Vec2 axis) {
    const lab::Vec2 parallel = lab::vectorProjection(vector, axis);
    const lab::Vec2 residual = lab::rejection(vector, axis);
    // Oracle dùng trực tiếp công thức chiếu lên axis chưa normalize.
    const double coefficient = (vector.x * axis.x + vector.y * axis.y) / (axis.x * axis.x + axis.y * axis.y);
    const lab::Vec2 expected{coefficient * axis.x, coefficient * axis.y};
    check(nearPoint(parallel, expected), "projection independent oracle");
    check(nearPoint(lab::add(parallel, residual), vector), "projection plus rejection reconstructs vector");
    check(near(lab::dot(parallel, residual), 0.0), "projection and rejection orthogonal");
}

std::size_t colorCount(const lab::Framebuffer& image, std::uint32_t color) {
    std::size_t result = 0;
    for (std::uint32_t pixel : image.pixels) {
        if (pixel == color) {
            ++result;
        }
    }
    return result;
}
}

int main() {
    // Các fixture có kết quả biết trước, không lấy chính implementation làm expected.
    check(near(lab::dot({2.0, 0.0}, {3.0, 0.0}), 6.0), "raw dot includes magnitude");
    check(near(lab::cosineBetween({2.0, 0.0}, {5.0, 0.0}), 1.0), "aligned cosine");
    check(near(lab::cosineBetween({1.0, 0.0}, {0.0, 1.0}), 0.0), "perpendicular cosine");
    check(near(lab::cosineBetween({1.0, 0.0}, {-1.0, 0.0}), -1.0), "opposite cosine");
    check(near(lab::angleBetween({1.0, 0.0}, {0.0, 1.0}), lab::kPi / 2.0), "unsigned right angle");
    check(near(lab::clampCosine(1.0 + 1e-12), 1.0), "upper acos bound");
    check(near(lab::clampCosine(-1.0 - 1e-12), -1.0), "lower acos bound");
    check(!lab::hasDirection({}), "zero has no direction");
    check(lab::angleBetween({}, {1.0, 0.0}) == 0.0, "zero fallback is not a measured angle");
    check(!lab::hasDirection({std::numeric_limits<double>::infinity(), 0.0}), "invalid direction");
    for (double value : {std::numeric_limits<double>::denorm_min(), 1e-300, 1e300, std::numeric_limits<double>::max()}) {
        check(near(lab::length(lab::normalize({value, value})), 1.0), "normalize extreme finite components");
        check(near(lab::cosineBetween({value, value}, {value, value}), 1.0), "cosine without length-product overflow");
    }
    check(lab::normalizeAngle(-std::numeric_limits<double>::denorm_min()) < lab::kTau, "half-open normalize range");
    check(!std::signbit(lab::normalizeAngle(-0.0)), "canonical zero");

    checkProjection({3.0, 4.0}, {1.0, 0.0});
    checkProjection({-3.0, 4.0}, {2.0, 1.0});
    check(near(lab::scalarProjection({-3.0, 4.0}, {1.0, 0.0}), -3.0), "negative scalar projection");
    check(nearPoint(lab::vectorProjection({3.0, 4.0}, {}), {}), "zero axis projection policy");
    check(nearPoint(lab::rejection({3.0, 4.0}, {}), {3.0, 4.0}), "zero axis residual policy");
    for (int x = -6; x <= 6; ++x) {
        for (int y = -6; y <= 6; ++y) {
            for (double angle : {0.1, 0.8, 1.7, 3.3, 5.9}) {
                checkProjection({static_cast<double>(x), static_cast<double>(y)}, lab::directionFromAngle(angle));
            }
        }
    }

    check(near(lab::signedAngleBetween({1.0, 0.0}, {0.0, 1.0}), lab::kPi / 2.0), "left is positive");
    check(near(lab::signedAngleBetween({1.0, 0.0}, {0.0, -1.0}), -lab::kPi / 2.0), "right is negative");
    check(near(lab::signedAngleBetween({1.0, 0.0}, {-1.0, -0.0}), lab::kPi), "antiparallel tie chooses positive");
    const double degree = lab::kPi / 180.0;
    check(near(lab::signedAngleBetween(lab::directionFromAngle(359.0 * degree), lab::directionFromAngle(degree)), 2.0 * degree), "shortest path across seam");
    check(near(lab::rotateTowards(0.0, lab::directionFromAngle(0.01), 0.2), 0.01), "no overshoot");
    for (int start = -20; start <= 20; ++start) {
        for (int target = -20; target <= 20; ++target) {
            const double current = static_cast<double>(start) * 0.29;
            const double desired = static_cast<double>(target) * 0.31 + 0.007;
            double difference = std::remainder(desired - current, lab::kTau);
            if (difference == -lab::kPi) {
                difference = lab::kPi;
            }
            const double expected = current + std::clamp(difference, -0.13, 0.13);
            const double actual = lab::rotateTowards(current, lab::directionFromAngle(desired), 0.13);
            check(angleDistance(actual, expected) < 1e-9, "steering independent angle oracle");
            check(angleDistance(actual, current) <= 0.13 + 1e-9, "maximum angular step");
        }
    }

    // So FPS chỉ với target đứng yên, cùng điều kiện đầu và cùng tổng thời gian.
    lab::Scene fast;
    lab::Scene slow;
    lab::Scene uneven;
    for (lab::Scene* scene : {&fast, &slow, &uneven}) {
        scene->targetOffset = {0.0, 5.0};
        scene->turnSpeed = 0.5;
    }
    for (int index = 0; index < 120; ++index) {
        lab::advanceScene(fast, 1.0 / 120.0);
    }
    for (int index = 0; index < 10; ++index) {
        lab::advanceScene(slow, 0.1);
        lab::advanceScene(uneven, 0.013);
        lab::advanceScene(uneven, 0.027);
        lab::advanceScene(uneven, 0.06);
    }
    check(near(fast.turretAngle, 0.5) && near(slow.turretAngle, 0.5) && near(uneven.turretAngle, 0.5), "frame-independent steering");
    lab::setTarget(fast, {});
    const double before = fast.turretAngle;
    lab::advanceScene(fast, 0.1);
    check(fast.turretAngle == before, "center target keeps heading");
    lab::setTarget(fast, {0.1, 0.0});
    check(!lab::targetHasDirection(fast), "UI center zone");
    lab::advanceScene(fast, 0.1);
    check(fast.turretAngle == before, "near-center target does not steer");
    lab::setTarget(fast, {4.0, 3.0});
    lab::advanceScene(fast, 1.0);
    check(fast.turretAngle == before, "oversized simulation step rejected");
    lab::setTarget(fast, {1e300, -1e300});
    check(near(lab::length(fast.targetOffset), 6.5), "radial target bound");

    for (double halfAngle : {5.0 * degree, 35.0 * degree, lab::kPi / 2.0}) {
        for (double sign : {-1.0, 1.0}) {
            const lab::Vec2 boundary = lab::directionFromAngle(sign * halfAngle);
            check(lab::isWithinViewCone({1.0, 0.0}, boundary, halfAngle), "inclusive cone edge");
            check(!lab::isWithinViewCone({1.0, 0.0}, lab::directionFromAngle(sign * (halfAngle + 1e-5)), halfAngle), "outside cone edge");
        }
    }
    check(!lab::isWithinViewCone({1.0, 0.0}, {}, 0.5), "zero target is not locked");
    check(!lab::isWithinViewCone({}, {1.0, 0.0}, 0.5), "zero forward is not locked");

    lab::Scene preset;
    lab::applyPreset(preset, 4);
    check(nearPoint(preset.targetOffset, {-5.0, 0.0}), "behind preset");
    check(!preset.followMouse && !preset.dragging, "preset leaves no active input");
    for (int index = 0; index < 7; ++index) {
        lab::applyPreset(preset, index);
        check(lab::length(preset.targetOffset) <= 6.5, "preset stays visible");
    }
    for (double angle = 0.0; angle < lab::kTau; angle += 0.031) {
        const lab::Vec2 target = lab::scale(lab::directionFromAngle(angle), 6.5);
        for (double heading : {0.0, 0.4, 1.3, 3.2, 5.5}) {
            const lab::Vec2 p = lab::vectorProjection(target, lab::directionFromAngle(heading));
            const lab::Vec2 screen = lab::worldToScreen(p);
            check(screen.x >= 290.0 - 1e-9 && screen.x <= 810.0 + 1e-9 && screen.y >= 150.0 - 1e-9 && screen.y <= 670.0 + 1e-9, "projection remains on logical board");
        }
        const lab::Vec2 restored = lab::screenToWorld(lab::worldToScreen(target));
        check(nearPoint(restored, target), "coordinate round trip");
    }

    // Kiểm tra pixel thật: các vector và thân/nòng không chỉ là số trên HUD.
    lab::Framebuffer image;
    lab::Scene visible;
    lab::renderScene(image, visible);
    check(colorCount(image, lab::kNeedle) > 100, "visible forward vector");
    check(colorCount(image, lab::kTarget) > 80, "visible target direction vector");
    check(colorCount(image, lab::kProjection) > 10, "visible projection");
    check(colorCount(image, lab::kRejected) > 80, "visible rejection and target");
    check(colorCount(image, lab::kWhite) > 200, "visible turret body and barrel");
    visible.targetOffset = {5.0, 0.0};
    lab::renderScene(image, visible);
    std::size_t alignedTargetPixels = 0;
    for (int y = 398; y <= 422; ++y) {
        for (int x = 671; x <= 704; ++x) {
            if (image.pixels[static_cast<std::size_t>(y) * lab::Framebuffer::width + x] == lab::kTarget) {
                ++alignedTargetPixels;
            }
        }
    }
    check(alignedTargetPixels > 10, "aligned target arrow stays visible beyond forward");
    check(colorCount(image, lab::kNeedle) > 100, "aligned forward remains visible");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "All Project 08 validation checks passed\n";
    return EXIT_SUCCESS;
}
