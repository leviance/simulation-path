#pragma once
#include "geometry.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct RasterSample {
    int x{};
    int y{};
    Barycentric barycentric{};
};

// Dạng Ax + By + C cho giá trị đối dấu chính xác khi đảo chiều cùng cạnh.
inline double edgeFunction(Vec2 a, Vec2 b, Vec2 p) {
    return (a.y - b.y) * p.x + (b.x - a.x) * p.y + (a.x * b.y - a.y * b.x);
}

inline bool isTopLeftEdge(Vec2 a, Vec2 b) {
    const double dy = b.y - a.y;
    return dy < 0 || (dy == 0 && b.x > a.x);
}

inline bool acceptsEdge(double value, bool topLeft) {
    return value > 0 || (value == 0 && topLeft);
}

template <class ShadePixel>
inline void rasterizeTriangle(ScreenTriangle triangle, Viewport viewport, ShadePixel shadePixel) {
    double area = edgeFunction(triangle[0].position, triangle[1].position, triangle[2].position);
    if (!std::isfinite(area) || std::abs(area) < 1e-10 || viewport.width <= 0 || viewport.height <= 0) {
        return;
    }
    if (area < 0) {
        std::swap(triangle[1], triangle[2]);
        area = -area;
    }
    const double minX = std::min({triangle[0].position.x, triangle[1].position.x, triangle[2].position.x});
    const double maxX = std::max({triangle[0].position.x, triangle[1].position.x, triangle[2].position.x});
    const double minY = std::min({triangle[0].position.y, triangle[1].position.y, triangle[2].position.y});
    const double maxY = std::max({triangle[0].position.y, triangle[1].position.y, triangle[2].position.y});
    const double right = double(viewport.left + viewport.width - 1);
    const double bottom = double(viewport.top + viewport.height - 1);
    const int x0 = int(std::clamp(std::floor(minX), double(viewport.left), right));
    const int x1 = int(std::clamp(std::ceil(maxX) - 1, double(viewport.left - 1), right));
    const int y0 = int(std::clamp(std::floor(minY), double(viewport.top), bottom));
    const int y1 = int(std::clamp(std::ceil(maxY) - 1, double(viewport.top - 1), bottom));
    for (int y = y0; y <= y1; ++y) {
        for (int x = x0; x <= x1; ++x) {
            const Vec2 point{x + 0.5, y + 0.5};
            const double a = edgeFunction(triangle[1].position, triangle[2].position, point);
            const double b = edgeFunction(triangle[2].position, triangle[0].position, point);
            const double c = edgeFunction(triangle[0].position, triangle[1].position, point);
            if (!acceptsEdge(a, isTopLeftEdge(triangle[1].position, triangle[2].position)) || !acceptsEdge(b, isTopLeftEdge(triangle[2].position, triangle[0].position)) || !acceptsEdge(c, isTopLeftEdge(triangle[0].position, triangle[1].position))) {
                continue;
            }
            // Trả cả triangle đã chuẩn hóa winding, không chỉ weights đã bị đổi thứ tự.
            shadePixel(triangle, RasterSample{x, y, {a / area, b / area, c / area}});
        }
    }
}
#endif
} // namespace lab
