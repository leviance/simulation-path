#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <vector>

namespace lab {

struct Point {
    int x{};
    int y{};
    friend bool operator==(Point, Point) = default;
#if LAB_CHECKPOINT >= 4
    friend bool operator<(Point first, Point second) {
        if (first.x != second.x) {
            return first.x < second.x;
        }
        return first.y < second.y;
    }
#endif
};

// Hợp đồng hữu hạn bảo vệ phép trừ, abs, error và dung lượng kết quả.
// Đây không phải thuật toán clipping cho tọa độ tùy ý.
inline bool validPoint(Point point) {
    constexpr int kMaximumCoordinate = 4096;
    return point.x >= -kMaximumCoordinate && point.x <= kMaximumCoordinate && point.y >= -kMaximumCoordinate && point.y <= kMaximumCoordinate;
}

struct LineStep {
    Point point{};
    double x{};
    double y{};
#if LAB_CHECKPOINT >= 2
    int error{};
    int doubledError{};
    bool movesX{};
    bool movesY{};
#endif
};

// DDA tính từ vị trí ban đầu ở mỗi bước, tránh cộng dồn sai số số thực.
inline std::vector<LineStep> dda(Point start, Point end) {
    if (!validPoint(start) || !validPoint(end)) {
        return {};
    }
    const int dx = end.x - start.x;
    const int dy = end.y - start.y;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        LineStep step;
        step.point = start;
        step.x = start.x;
        step.y = start.y;
        return {step};
    }

    std::vector<LineStep> output;
    output.reserve(static_cast<std::size_t>(steps) + 1);
    for (int index = 0; index <= steps; ++index) {
        const double t = static_cast<double>(index) / static_cast<double>(steps);
        LineStep step;
        step.x = start.x + static_cast<double>(dx) * t;
        step.y = start.y + static_cast<double>(dy) * t;
        step.point = {static_cast<int>(std::lround(step.x)), static_cast<int>(std::lround(step.y))};
        output.push_back(step);
    }
    return output;
}
#endif

#if LAB_CHECKPOINT >= 2
enum class Algorithm { Dda, Bresenham };

// Dữ liệu inspector và pixel vẽ ra dùng chung một vòng lặp, không có bản trace viết lại.
inline std::vector<LineStep> bresenham(Point start, Point end) {
    if (!validPoint(start) || !validPoint(end)) {
        return {};
    }
    int x = start.x;
    int y = start.y;
    const int dx = std::abs(end.x - start.x);
    const int dy = -std::abs(end.y - start.y);
    int stepX = -1;
    int stepY = -1;
    if (start.x < end.x) {
        stepX = 1;
    }
    if (start.y < end.y) {
        stepY = 1;
    }
    int error = dx + dy;

    std::vector<LineStep> output;
    output.reserve(static_cast<std::size_t>(std::max(dx, -dy)) + 1);
    for (;;) {
        LineStep step;
        step.point = {x, y};
        step.error = error;
        step.doubledError = 2 * error;
        if (x == end.x && y == end.y) {
            output.push_back(step);
            break;
        }

        // Hai quyết định đều đọc error của đầu bước, trước mọi cập nhật.
        step.movesX = step.doubledError >= dy;
        step.movesY = step.doubledError <= dx;
        output.push_back(step);
        if (step.movesX) {
            error += dy;
            x += stepX;
        }
        if (step.movesY) {
            error += dx;
            y += stepY;
        }
    }
    return output;
}

inline std::vector<LineStep> lineSteps(Point start, Point end, Algorithm algorithm) {
    if (algorithm == Algorithm::Dda) {
        return dda(start, end);
    }
    return bresenham(start, end);
}
#endif

#if LAB_CHECKPOINT >= 4
inline void sortUnique(std::vector<Point>& points) {
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
}

inline std::vector<Point> rectangle(Point first, Point second) {
    if (!validPoint(first) || !validPoint(second)) {
        return {};
    }
    const int left = std::min(first.x, second.x);
    const int right = std::max(first.x, second.x);
    const int top = std::min(first.y, second.y);
    const int bottom = std::max(first.y, second.y);
    const Point corners[] = {{left, top}, {right, top}, {right, bottom}, {left, bottom}};
    std::vector<Point> points;
    for (int edge = 0; edge < 4; ++edge) {
        const Point start = corners[edge];
        const Point end = corners[(edge + 1) % 4];
        for (const LineStep& step : bresenham(start, end)) {
            points.push_back(step.point);
        }
    }
    sortUnique(points);
    return points;
}

inline std::vector<Point> filledRectangle(Point first, Point second) {
    if (!validPoint(first) || !validPoint(second)) {
        return {};
    }
    const int left = std::min(first.x, second.x);
    const int right = std::max(first.x, second.x);
    const int top = std::min(first.y, second.y);
    const int bottom = std::max(first.y, second.y);
    const int width = right - left + 1;
    const int height = bottom - top + 1;
    if (width > 1024 || height > 1024) {
        return {};
    }

    std::vector<Point> points;
    points.reserve(static_cast<std::size_t>(width) * height);
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            points.push_back({x, y});
        }
    }
    return points;
}
#endif

#if LAB_CHECKPOINT >= 5
struct CircleStep {
    int x{};
    int y{};
    int decision{};
    std::vector<Point> points;
};

inline std::vector<Point> symmetricCirclePoints(Point center, int x, int y) {
    std::vector<Point> points{
        {center.x + x, center.y + y},
        {center.x + y, center.y + x},
        {center.x - y, center.y + x},
        {center.x - x, center.y + y},
        {center.x - x, center.y - y},
        {center.x - y, center.y - x},
        {center.x + y, center.y - x},
        {center.x + x, center.y - y},
    };
    sortUnique(points);
    return points;
}

inline std::vector<CircleStep> circleSteps(Point center, int radius) {
    if (!validPoint(center) || radius < 0 || radius > 256) {
        return {};
    }
    int x = radius;
    int y = 0;
    int decision = 1 - radius;
    std::vector<CircleStep> steps;
    while (x >= y) {
        steps.push_back({x, y, decision, symmetricCirclePoints(center, x, y)});
        ++y;
        if (decision < 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
    return steps;
}

inline std::vector<Point> circle(Point center, int radius) {
    std::vector<Point> points;
    for (const CircleStep& step : circleSteps(center, radius)) {
        points.insert(points.end(), step.points.begin(), step.points.end());
    }
    sortUnique(points);
    return points;
}

// Tô những hàng ngang nằm giữa hai phía của chính đường viền midpoint.
// Đây khác quy tắc "tâm pixel nằm trong đĩa tròn" của brush Project 03.
inline std::vector<Point> filledCircle(Point center, int radius) {
    const auto outline = circle(center, radius);
    if (outline.empty()) {
        return {};
    }
    std::vector<int> extents(static_cast<std::size_t>(2 * radius + 1), -1);
    for (Point point : outline) {
        const std::size_t row = static_cast<std::size_t>(point.y - center.y + radius);
        extents[row] = std::max(extents[row], std::abs(point.x - center.x));
    }

    std::vector<Point> points;
    for (int row = 0; row <= 2 * radius; ++row) {
        const int extent = extents[static_cast<std::size_t>(row)];
        for (int x = center.x - extent; x <= center.x + extent; ++x) {
            points.push_back({x, center.y - radius + row});
        }
    }
    return points;
}
#endif

#if LAB_CHECKPOINT >= 1
} // namespace lab
#endif
