#include "lab.hpp"
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

bool contains(const std::vector<lab::Point>& points, lab::Point expected) {
    return std::find(points.begin(), points.end(), expected) != points.end();
}

void checkConnectedLine(const std::vector<lab::Point>& points, lab::Point start, lab::Point end) {
    check(!points.empty(), "line contains at least one pixel");
    if (points.empty()) {
        return;
    }
    check(points.front() == start, "line keeps its first endpoint");
    check(points.back() == end, "line keeps its last endpoint");
    check(points.size() == std::size_t(std::max(std::abs(end.x - start.x), std::abs(end.y - start.y))) + 1, "line has the expected number of pixels");
    for (std::size_t index = 1; index < points.size(); ++index) {
        const int stepX = std::abs(points[index].x - points[index - 1].x);
        const int stepY = std::abs(points[index].y - points[index - 1].y);
        check(stepX <= 1, "line advances at most one pixel on X");
        check(stepY <= 1, "line advances at most one pixel on Y");
        check(stepX + stepY > 0, "line never repeats a pixel");
    }
}
} // namespace

int main() {
    // Tám endpoint đại diện kiểm tra đủ dấu và hai loại độ dốc.
    const std::vector<lab::Point> octantEndpoints{
        {9, 2},
        {2, 9},
        {-2, 9},
        {-9, 2},
        {-9, -2},
        {-2, -9},
        {2, -9},
        {9, -2},
    };
    for (lab::Point end : octantEndpoints) {
        const auto ddaForward = lab::dda({0, 0}, end);
        const auto ddaReverse = lab::dda(end, {0, 0});
        const auto forward = lab::bresenham({0, 0}, end);
        const auto reverse = lab::bresenham(end, {0, 0});
        checkConnectedLine(ddaForward, {0, 0}, end);
        checkConnectedLine(ddaReverse, end, {0, 0});
        checkConnectedLine(forward, {0, 0}, end);
        checkConnectedLine(reverse, end, {0, 0});
        const auto trace = lab::traceBresenham({0, 0}, end);
        check(trace.size() == forward.size(), "Bresenham trace has one record per pixel");
        std::vector<lab::Point> tracedPoints;
        for (const auto& step : trace) {
            tracedPoints.push_back(step.point);
        }
        check(tracedPoints == forward, "Bresenham trace matches the drawing algorithm");
    }

    // A line exactly between two candidate pixels may use a different
    // tie-break when its endpoints are reversed. Both results remain valid.
    checkConnectedLine(lab::bresenham({0, 0}, {2, 1}), {0, 0}, {2, 1});
    checkConnectedLine(lab::bresenham({2, 1}, {0, 0}), {2, 1}, {0, 0});

    // Circle phải đối xứng, đi qua bốn điểm ngoài cùng và bám sát bán kính.
    const auto circlePoints = lab::circle({0, 0}, 8);
    check(std::adjacent_find(circlePoints.begin(), circlePoints.end()) == circlePoints.end(), "circle contains no duplicate pixels");
    check(contains(circlePoints, {8, 0}), "circle keeps its right cardinal point");
    check(contains(circlePoints, {-8, 0}), "circle keeps its left cardinal point");
    check(contains(circlePoints, {0, 8}), "circle keeps its bottom cardinal point");
    check(contains(circlePoints, {0, -8}), "circle keeps its top cardinal point");
    for (lab::Point point : circlePoints) {
        check(contains(circlePoints, {-point.x, point.y}), "circle is symmetric across Y");
        check(contains(circlePoints, {point.x, -point.y}), "circle is symmetric across X");
        check(contains(circlePoints, {point.y, point.x}), "circle is symmetric across the diagonal");
        check(contains(circlePoints, {-point.y, -point.x}), "circle keeps opposite diagonal symmetry");
        const double distanceFromCenter = std::hypot(double(point.x), double(point.y));
        check(std::abs(distanceFromCenter - 8.0) <= 0.55, "circle pixels stay close to the requested radius");
    }
    check(lab::circle({7, -3}, 0) == std::vector<lab::Point>{{7, -3}}, "zero-radius circle is one point");
    check(lab::circle({7, -3}, -5) == std::vector<lab::Point>{{7, -3}}, "negative radius is clamped to zero");

    // Primitive suy biến và rectangle đảo endpoint vẫn phải có kết quả xác định.
    check(lab::dda({4, 4}, {4, 4}).size() == 1, "degenerate DDA line is one point");
    check(lab::bresenham({4, 4}, {4, 4}).size() == 1, "degenerate Bresenham line is one point");
    const auto outline = lab::rectangle({4, 3}, {1, 1});
    check(outline.size() == 10, "rectangle outline has a unique inclusive perimeter");
    check(contains(outline, {1, 1}), "rectangle keeps its first corner");
    check(contains(outline, {4, 3}), "rectangle keeps its opposite corner");
    const auto filled = lab::filledRectangle({4, 3}, {1, 1});
    check(filled.size() == 12, "filled rectangle contains width times height pixels");
    check(lab::rectangle({2, 2}, {2, 2}) == std::vector<lab::Point>{{2, 2}}, "one-point outline is not duplicated");
    check(lab::filledRectangle({2, 2}, {2, 2}) == std::vector<lab::Point>{{2, 2}}, "one-point fill contains one pixel");
    check(lab::rectangle({1, 1}, {4, 1}).size() == 4, "horizontal rectangle edge keeps every pixel");
    check(lab::rectangle({1, 1}, {1, 3}).size() == 3, "vertical rectangle edge keeps every pixel");
    check(lab::rectangle({1, 1}, {4, 3}) == lab::rectangle({4, 3}, {1, 1}), "rectangle is independent of corner order");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 04 validation checks passed\n";
    return EXIT_SUCCESS;
}
