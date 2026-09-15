#include "lab.hpp"
#include <cmath>
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
} // namespace

int main() {
    // Stroke ngang phải giữ hai endpoint và giới hạn khoảng cách giữa các sample.
    const auto points = lab::sampleStroke({0.0, 0.0}, {100.0, 0.0}, 8.0);
    check(points.front() == lab::Point{0.0, 0.0}, "horizontal stroke keeps its first endpoint");
    check(points.back() == lab::Point{100.0, 0.0}, "horizontal stroke keeps its last endpoint");
    for (std::size_t index = 1; index < points.size(); ++index) {
        check(lab::distance(points[index - 1], points[index]) <= 8.001, "horizontal stroke respects spacing");
    }

    // Cùng invariant phải đúng cho đoạn chéo và đoạn suy biến một điểm.
    const auto diagonal = lab::sampleStroke({-10.0, -10.0}, {10.0, 10.0}, 3.0);
    check(diagonal.front() == lab::Point{-10.0, -10.0}, "diagonal stroke keeps its first endpoint");
    check(diagonal.back() == lab::Point{10.0, 10.0}, "diagonal stroke keeps its last endpoint");
    const auto samePoint = lab::sampleStroke({2.0, 3.0}, {2.0, 3.0}, 8.0);
    check(samePoint.size() == 1, "zero-length stroke emits one point");
    check(samePoint.front() == lab::Point{2.0, 3.0}, "zero-length stroke preserves its point");

    // Spacing lỗi được đưa về mức sàn để tránh chia cho zero hoặc cấp phát quá lớn.
    const auto zeroSpacing = lab::sampleStroke({0.0, 0.0}, {100.0, 0.0}, 0.0);
    check(zeroSpacing.size() == 201, "zero spacing uses the minimum spacing");
    check(zeroSpacing.size() < 1'000, "invalid spacing cannot allocate an excessive sample count");
    const auto negativeSpacing = lab::sampleStroke({0.0, 0.0}, {100.0, 0.0}, -10.0);
    check(negativeSpacing.size() == zeroSpacing.size(), "negative spacing uses the minimum spacing");
    const auto nonFiniteSpacing = lab::sampleStroke({0.0, 0.0}, {100.0, 0.0}, std::numeric_limits<double>::quiet_NaN());
    check(nonFiniteSpacing.size() == zeroSpacing.size(), "NaN spacing uses the minimum spacing");

    // ceil phải tạo đủ segment khi chiều dài không chia hết cho spacing.
    const auto seventeenPixels = lab::sampleStroke({0.0, 0.0}, {17.0, 0.0}, 8.0);
    check(seventeenPixels.size() == 4, "ceil adds enough samples for a partial interval");
    for (std::size_t index = 1; index < seventeenPixels.size(); ++index) {
        check(lab::distance(seventeenPixels[index - 1], seventeenPixels[index]) <= 8.0, "partial interval respects spacing");
    }

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 03 validation checks passed\n";
    return EXIT_SUCCESS;
}
