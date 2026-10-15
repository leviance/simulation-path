#pragma once
#include "model.hpp"
#include <algorithm>
#include <limits>

namespace voxel {
inline constexpr int imageWidth = 320;
inline constexpr int imageHeight = 240;

struct Camera {
    double yaw = 0.7;
    double pitch = 0.5;
    double zoom = 1;
    double scale = 6;
    double center = 8;
};

struct ScreenPoint {
    double x;
    double y;
    double depth;
};

struct Frame {
    std::vector<Color> pixels = std::vector<Color>(imageWidth * imageHeight);
    std::vector<double> depth = std::vector<double>(imageWidth * imageHeight);
};

static_assert(sizeof(Color) == 4);

inline ScreenPoint project(Vec3 point, const Camera& camera) {
    const double x = point.x - camera.center;
    const double y = point.y - camera.center;
    const double z = point.z - camera.center;
    const double cx = std::cos(camera.yaw) * x - std::sin(camera.yaw) * z;
    const double cz = std::sin(camera.yaw) * x + std::cos(camera.yaw) * z;
    const double cy = std::cos(camera.pitch) * y - std::sin(camera.pitch) * cz;
    const double depth = std::sin(camera.pitch) * y + std::cos(camera.pitch) * cz;
    const double scale = camera.scale * camera.zoom;
    return {imageWidth * 0.5 + cx * scale, imageHeight * 0.5 - cy * scale, depth};
}

inline double edge(ScreenPoint a, ScreenPoint b, double x, double y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline void rasterTriangle(Frame& frame, const Triangle& triangle, const Camera& camera, bool useDepth) {
    const ScreenPoint a = project(triangle.points[0], camera);
    const ScreenPoint b = project(triangle.points[1], camera);
    const ScreenPoint c = project(triangle.points[2], camera);
    const double area = edge(a, b, c.x, c.y);
    if (std::abs(area) < 1e-9) {
        return;
    }
    const int minX = std::max(0, static_cast<int>(std::floor(std::min({a.x, b.x, c.x}))));
    const int maxX = std::min(imageWidth - 1, static_cast<int>(std::ceil(std::max({a.x, b.x, c.x}))));
    const int minY = std::max(0, static_cast<int>(std::floor(std::min({a.y, b.y, c.y}))));
    const int maxY = std::min(imageHeight - 1, static_cast<int>(std::ceil(std::max({a.y, b.y, c.y}))));
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double wa = edge(b, c, x + 0.5, y + 0.5) / area;
            const double wb = edge(c, a, x + 0.5, y + 0.5) / area;
            const double wc = 1 - wa - wb;
            if (wa < -1e-10 || wb < -1e-10 || wc < -1e-10) {
                continue;
            }
            const double depth = wa * a.depth + wb * b.depth + wc * c.depth;
            const auto pixel = static_cast<std::size_t>(y * imageWidth + x);
            // Camera trực giao: depth lớn hơn gần người xem hơn, clear về -infinity.
            if (!useDepth || depth > frame.depth[pixel]) {
                frame.depth[pixel] = depth;
                frame.pixels[pixel] = triangle.color;
            }
        }
    }
}

inline void render(Frame& frame, const Mesh& mesh, const Camera& camera, bool useDepth = true) {
    std::fill(frame.pixels.begin(), frame.pixels.end(), Color{11, 16, 32, 255});
    std::fill(frame.depth.begin(), frame.depth.end(), -std::numeric_limits<double>::infinity());
    // Không back-face culling và không neighbor-face culling trong Project 58.
    for (const Triangle& triangle : mesh) {
        rasterTriangle(frame, triangle, camera, useDepth);
    }
}

#if LAB_CHECKPOINT >= 5
inline void orbit(Camera& camera, double dx, double dy) {
    camera.yaw = std::remainder(camera.yaw + dx * 0.01, 2 * std::acos(-1.0));
    camera.pitch = std::clamp(camera.pitch + dy * 0.01, -1.2, 1.2);
}

inline void zoom(Camera& camera, double amount) {
    camera.zoom = std::clamp(camera.zoom * std::exp(amount * 0.1), 0.5, 1.5);
}
#endif
} // namespace voxel
