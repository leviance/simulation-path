#include "benchmark.hpp"
#include "view.hpp"
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <set>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    if (failures < 20) {
        std::cerr << "FAILED: " << label << '\n';
    }
    ++failures;
}

std::set<lab::Point> pointSet(const std::vector<lab::Point>& points) {
    return {points.begin(), points.end()};
}

void checkLine(const std::vector<lab::LineStep>& steps, lab::Point start, lab::Point end) {
    check(!steps.empty(), "valid line has pixels");
    if (steps.empty()) {
        return;
    }
    check(steps.front().point == start, "line keeps start");
    check(steps.back().point == end, "line keeps end");
    const int dx = end.x - start.x;
    const int dy = end.y - start.y;
    const int expectedCount = std::max(std::abs(dx), std::abs(dy)) + 1;
    check(steps.size() == static_cast<std::size_t>(expectedCount), "major axis determines count");
    const double length = std::hypot(static_cast<double>(dx), static_cast<double>(dy));
    for (std::size_t index = 0; index < steps.size(); ++index) {
        const lab::Point point = steps[index].point;
        if (length > 0.0) {
            const double cross = static_cast<double>(dy) * (point.x - start.x) - static_cast<double>(dx) * (point.y - start.y);
            check(std::abs(cross) / length <= 0.500001, "pixel stays close to ideal line");
        }
        if (index == 0) {
            continue;
        }
        const lab::Point previous = steps[index - 1].point;
        const int distanceX = std::abs(point.x - previous.x);
        const int distanceY = std::abs(point.y - previous.y);
        check(std::max(distanceX, distanceY) == 1, "neighbor pixels are connected and unique");
    }
}

void testLines() {
    // 2.401 hướng/độ dài, mỗi trường hợp kiểm hai thuật toán và hai chiều.
    for (int y = -24; y <= 24; ++y) {
        for (int x = -24; x <= 24; ++x) {
            const lab::Point start{-3, 5};
            const lab::Point end{start.x + x, start.y + y};
            checkLine(lab::dda(start, end), start, end);
            checkLine(lab::dda(end, start), end, start);
            checkLine(lab::bresenham(start, end), start, end);
            checkLine(lab::bresenham(end, start), end, start);
        }
    }
    const auto trace = lab::bresenham({0, 0}, {7, 3});
    check(trace[0].error == 4 && trace[0].doubledError == 8, "Bresenham error fixture starts at 4/8");
    check(trace[1].point == lab::Point{1, 0} && trace[1].error == 1, "Bresenham first transition fixture");
    check(trace[2].point == lab::Point{2, 1} && trace[2].error == 5, "both branches read original doubled error");
    check(!trace.back().movesX && !trace.back().movesY, "last record does not claim another move");
    const auto negativeTie = lab::dda({0, -1}, {2, 0});
    check(negativeTie[1].point == lab::Point{1, -1}, "negative half rounds away from zero");
    check(lab::bresenham({0, 0}, {2, 1})[1].point == lab::Point{1, 1}, "forward tie fixture");
    check(lab::bresenham({2, 1}, {0, 0})[1].point == lab::Point{1, 0}, "reverse tie need not choose identical set");
    check(lab::dda({-4096, 0}, {4096, 0}).size() == 8193, "largest accepted line stays bounded");
    check(lab::bresenham({0, 0}, {std::numeric_limits<int>::max(), 0}).empty(), "reject huge input before subtracting");
    check(lab::dda({std::numeric_limits<int>::min(), 0}, {1, 1}).empty(), "reject INT_MIN before abs");
}

void testRectangles() {
    // 544 kích thước; đáp án được tạo bằng điều kiện hình chữ nhật, không gọi line.
    for (int height = 1; height <= 17; ++height) {
        for (int width = 1; width <= 32; ++width) {
            const lab::Point first{-4, -3};
            const lab::Point second{first.x + width - 1, first.y + height - 1};
            std::set<lab::Point> expectedFill;
            std::set<lab::Point> expectedOutline;
            for (int y = first.y; y <= second.y; ++y) {
                for (int x = first.x; x <= second.x; ++x) {
                    expectedFill.insert({x, y});
                    if (x == first.x || x == second.x || y == first.y || y == second.y) {
                        expectedOutline.insert({x, y});
                    }
                }
            }
            const auto outline = lab::rectangle(first, second);
            const auto fill = lab::filledRectangle(first, second);
            check(pointSet(outline) == expectedOutline, "rectangle outline agrees with independent boundary oracle");
            check(pointSet(fill) == expectedFill, "rectangle fill agrees with independent area oracle");
            check(outline.size() == expectedOutline.size(), "outline has no duplicate corners");
            check(fill.size() == expectedFill.size(), "fill has no duplicates");
            check(lab::rectangle(second, first) == outline, "reversed corners keep outline");
            check(lab::filledRectangle(second, first) == fill, "reversed corners keep fill");
            check(lab::rectangle({first.x, second.y}, {second.x, first.y}) == outline, "crossed corners keep outline");
        }
    }
    check(lab::filledRectangle({0, 0}, {1024, 0}).empty(), "reject fill wider than 1024");
    check(lab::rectangle({0, 0}, {5000, 1}).empty(), "outline validates coordinates");
}

void testCircles() {
    const lab::Point center{-7, 9};
    for (int radius = 0; radius <= 128; ++radius) {
        const auto outline = lab::circle(center, radius);
        const auto fill = lab::filledCircle(center, radius);
        const auto boundary = pointSet(outline);
        const auto solid = pointSet(fill);
        check(boundary.size() == outline.size(), "circle outline has unique pixels");
        check(solid.size() == fill.size(), "circle fill has unique pixels");
        check(boundary.contains({center.x + radius, center.y}), "right cardinal point");
        check(boundary.contains({center.x - radius, center.y}), "left cardinal point");
        check(boundary.contains({center.x, center.y + radius}), "bottom cardinal point");
        check(boundary.contains({center.x, center.y - radius}), "top cardinal point");
        for (lab::Point point : outline) {
            const int x = point.x - center.x;
            const int y = point.y - center.y;
            check(boundary.contains({center.x - x, center.y + y}), "circle axis symmetry");
            check(boundary.contains({center.x + y, center.y + x}), "circle diagonal symmetry");
            check(solid.contains(point), "fill includes its midpoint boundary");
            check(std::abs(std::hypot(static_cast<double>(x), static_cast<double>(y)) - radius) <= 0.55, "circle radius error bounded");
        }
        for (int y = center.y - radius; y <= center.y + radius; ++y) {
            bool entered = false;
            bool left = false;
            for (int x = center.x - radius; x <= center.x + radius; ++x) {
                if (solid.contains({x, y})) {
                    check(!left, "filled row has no internal holes");
                    entered = true;
                } else if (entered) {
                    left = true;
                }
            }
            check(entered, "every circle row has pixels");
        }
    }
    check(lab::circle({0, 0}, 1).size() == 4, "decision zero chooses inward: radius-one outline has four pixels");
    check(lab::circle({0, 0}, 2).size() == 12, "radius-two midpoint outline has twelve pixels");
    check(lab::filledCircle({0, 0}, 2).size() == 21, "radius-two midpoint fill has twenty-one pixels");
    check(lab::filledCircle({4, 8}, 0) == std::vector<lab::Point>{{4, 8}}, "zero radius is one point");
    check(lab::circle({0, 0}, -1).empty(), "negative radius is rejected, not silently changed");
    check(lab::circle({0, 0}, 257).empty(), "radius budget enforced");
    check(lab::filledCircle({5000, 0}, 10).empty(), "invalid center rejected before allocation");
}

void testDrawingAndInteraction() {
    lab::Framebuffer framebuffer;
    framebuffer.clear(lab::kBackground);
    lab::fillRect(framebuffer, {1, 1}, {4, 3}, lab::kShapeColor);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), lab::kShapeColor) == 12, "fillRect writes actual framebuffer");
    framebuffer.clear(lab::kBackground);
    lab::fillCircle(framebuffer, {0, 0}, 2, lab::kLineColor);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), lab::kLineColor) == 8, "filled circle clips at canvas corner");
    const auto before = framebuffer.pixels;
    framebuffer.putPixel(-1, 0, 0);
    framebuffer.putPixel(960, 0, 0);
    check(framebuffer.pixels == before, "putPixel rejects out-of-bounds writes");

    lab::Scene scene;
    check(lab::imagePoint(959.9, 539.9) == lab::Point{959, 539}, "input floors inside logical canvas");
    check(!lab::imagePoint(960, 0) && !lab::imagePoint(-0.1, 0), "right edge and letterbox rejected");
    check(!lab::imagePoint(std::numeric_limits<double>::infinity(), 0), "nonfinite input rejected before integer conversion");
    check(lab::beginDrag(scene, {220, 270}), "start drag at A");
    check(!lab::beginDrag(scene, {740, 150}), "active drag cannot be stolen");
    lab::endDrag(scene, {240, 290});
    check(scene.a == lab::Point{240, 290} && scene.dragged == -1, "release-only coordinate updates handle and ends drag");
    lab::moveHandle(scene, {250, 300});
    check(scene.a == lab::Point{240, 290}, "hover after release does not move handle");
    lab::beginDrag(scene, scene.a);
    lab::moveHandle(scene, {-1, 0});
    check(scene.dragged == -1, "outside coordinate cancels drag");
    for (int index = 0; index < 8; ++index) {
        lab::selectOctant(scene);
        checkLine(lab::bresenham(scene.a, scene.b), scene.a, scene.b);
    }
    check(scene.octant == 0, "octant presets cycle deterministically");
    scene.tool = lab::Tool::Circle;
    scene.a = {480, 270};
    scene.dragged = 1;
    lab::moveHandle(scene, {900, 500});
    check(scene.radius == 256, "radius handle respects domain");
    scene.tool = lab::Tool::Gallery;
    lab::cancelDrag(scene);
    check(!lab::beginDrag(scene, {300, 300}), "gallery is not an editable phantom shape");

    framebuffer.clear(lab::kBackground);
    framebuffer.putPixel(20, 30, lab::kLineColor);
    lab::drawInspector(framebuffer, {20, 30});
    const std::size_t enlargedCenter = std::size_t(380 + 4 * 16 + 1) * 960 + 800 + 4 * 16 + 1;
    check(framebuffer.pixels[enlargedCenter] == lab::kLineColor, "inspector reads actual CPU pixel color");
}

void testBenchmark() {
    const auto first = lab::benchmarkData(32);
    const auto second = lab::benchmarkData(32);
    for (std::size_t index = 0; index < first.size(); ++index) {
        check(first[index].start == second[index].start && first[index].end == second[index].end, "benchmark dataset reproducible");
    }
    auto trace = lab::dda({0, 0}, {7, 3});
    const auto checksum = lab::consumePixels(trace, 0);
    trace[2].point.y += 1;
    check(lab::consumePixels(trace, 0) != checksum, "checksum observes interior coordinates, not only count");
    lab::Benchmark benchmark;
    lab::beginBenchmark(benchmark, 128);
    int ticks = 0;
    while (benchmark.active && ticks < 16) {
        lab::advanceBenchmark(benchmark);
        ++ticks;
    }
    check(benchmark.complete && benchmark.round == 7, "bounded harness finishes seven rounds");
    check(benchmark.checksums[0] != 0 && benchmark.checksums[1] != 0, "both algorithm results consumed");
    check(lab::median({7, 1, 9, 3, 5, 2, 8}) == 5.0, "median independent fixture");
    lab::beginBenchmark(benchmark, 1);
    benchmark.started -= std::chrono::seconds(31);
    lab::advanceBenchmark(benchmark);
    check(!benchmark.active && !benchmark.complete, "expired benchmark never reports completion");
}
} // namespace

int main() {
    testLines();
    testRectangles();
    testCircles();
    testDrawingAndInteraction();
    testBenchmark();
    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 04 passed: 2401 line cases, 544 rectangle sizes, 129 circle radii, framebuffer, input and bounded benchmark.\n";
    return EXIT_SUCCESS;
}
