#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <vector>
#endif
namespace lab {
#if LAB_CHECKPOINT >= 1

// Mỗi Point dùng tọa độ nguyên vì framebuffer chỉ chứa các vị trí pixel rời rạc.
struct Point {
    int x{};
    int y{};
    friend bool operator==(Point, Point) = default;
#if LAB_CHECKPOINT >= 4
    friend bool operator<(Point left, Point right) {
        if (left.x != right.x) {
            return left.x < right.x;
        }
        return left.y < right.y;
    }
#endif
};
#endif
#if LAB_CHECKPOINT >= 1

// DDA lấy các điểm cách đều trên đoạn thẳng rồi làm tròn về pixel gần nhất.
inline std::vector<Point> dda(Point start, Point end) {
    const int dx = end.x - start.x;
    const int dy = end.y - start.y;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        return {start};
    }
    std::vector<Point> points;
    points.reserve(std::size_t(steps) + 1);
    for (int index = 0; index <= steps; ++index) {
        const double t = double(index) / double(steps);
        points.push_back({
            int(std::lround(start.x + double(dx) * t)),
            int(std::lround(start.y + double(dy) * t)),
        });
    }
    return points;
}
#endif
#if LAB_CHECKPOINT >= 2

// Bresenham dùng một biến sai số nguyên để quyết định pixel tiếp theo.
inline std::vector<Point> bresenham(Point start, Point end) {
    int x = start.x;
    int y = start.y;
    const int dx = std::abs(end.x - start.x);
    int stepX = -1;
    if (x < end.x) {
        stepX = 1;
    }
    const int dy = -std::abs(end.y - start.y);
    int stepY = -1;
    if (y < end.y) {
        stepY = 1;
    }
    int error = dx + dy;
    std::vector<Point> points;
    for (;;) {
        points.push_back({x, y});
        if (x == end.x && y == end.y) {
            break;
        }
        const int doubledError = 2 * error;
        if (doubledError >= dy) {
            error += dy;
            x += stepX;
        }
        if (doubledError <= dx) {
            error += dx;
            y += stepY;
        }
    }
    return points;
}

struct BresenhamStep {
    Point point{};
    int error{};
    int doubledError{};
    bool movesX{};
    bool movesY{};
};

inline std::vector<BresenhamStep> traceBresenham(Point start, Point end) {
    int x = start.x;
    int y = start.y;
    const int dx = std::abs(end.x - start.x);
    int stepX = -1;
    if (x < end.x) {
        stepX = 1;
    }
    const int dy = -std::abs(end.y - start.y);
    int stepY = -1;
    if (y < end.y) {
        stepY = 1;
    }
    int error = dx + dy;
    std::vector<BresenhamStep> trace;
    for (;;) {
        if (x == end.x && y == end.y) {
            trace.push_back({{x, y}, error, 2 * error, false, false});
            break;
        }
        const int doubledError = 2 * error;
        const bool movesX = doubledError >= dy;
        const bool movesY = doubledError <= dx;
        trace.push_back({{x, y}, error, doubledError, movesX, movesY});
        if (movesX) {
            error += dy;
            x += stepX;
        }
        if (movesY) {
            error += dx;
            y += stepY;
        }
    }
    return trace;
}
#endif
#if LAB_CHECKPOINT >= 4

// Đường viền hình chữ nhật được ghép từ bốn đoạn Bresenham.
inline void appendPoints(std::vector<Point>& destination, const std::vector<Point>& source) {
    destination.insert(destination.end(), source.begin(), source.end());
}

inline std::vector<Point> rectangle(Point first, Point second) {
    const int left = std::min(first.x, second.x);
    const int right = std::max(first.x, second.x);
    const int top = std::min(first.y, second.y);
    const int bottom = std::max(first.y, second.y);
    std::vector<Point> points;
    appendPoints(points, bresenham({left, top}, {right, top}));
    appendPoints(points, bresenham({right, top}, {right, bottom}));
    appendPoints(points, bresenham({right, bottom}, {left, bottom}));
    appendPoints(points, bresenham({left, bottom}, {left, top}));
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    return points;
}

inline std::vector<Point> filledRectangle(Point first, Point second) {
    const int left = std::min(first.x, second.x);
    const int right = std::max(first.x, second.x);
    const int top = std::min(first.y, second.y);
    const int bottom = std::max(first.y, second.y);
    std::vector<Point> points;
    points.reserve(std::size_t(right - left + 1) * std::size_t(bottom - top + 1));
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            points.push_back({x, y});
        }
    }
    return points;
}
#endif
#if LAB_CHECKPOINT >= 5

// Một điểm trong phần tám đầu tiên tạo ra tối đa tám điểm đối xứng quanh tâm.
inline void appendSymmetricCirclePoints(std::vector<Point>& points, Point center, int x, int y) {
    points.push_back({center.x + x, center.y + y});
    points.push_back({center.x + y, center.y + x});
    points.push_back({center.x - y, center.y + x});
    points.push_back({center.x - x, center.y + y});
    points.push_back({center.x - x, center.y - y});
    points.push_back({center.x - y, center.y - x});
    points.push_back({center.x + y, center.y - x});
    points.push_back({center.x + x, center.y - y});
}

inline std::vector<Point> circle(Point center, int radius) {
    std::vector<Point> points;
    int x = std::max(0, radius);
    int y = 0;
    int decision = 1 - x;
    while (x >= y) {
        appendSymmetricCirclePoints(points, center, x, y);
        ++y;
        if (decision <= 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    return points;
}
#endif
} // namespace lab
