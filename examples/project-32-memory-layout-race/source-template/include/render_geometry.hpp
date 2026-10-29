#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <vector>

namespace lab {
// Camera và phép chiếu chỉ phục vụ ảnh; chúng không đổi state hay layout hạt.
inline constexpr double fountainFocalScale = 1.20710678118; // Vertical FOV: 45 degrees.
inline constexpr double fountainFloorY = 0;

struct Vec3 {
    double x{}, y{}, z{};
};

struct Camera {
    double yaw{0.45}, pitch{-0.38}, distance{14};
    Vec3 target{0, 1.9, 0};
};

struct ViewBasis {
    Vec3 right{}, up{}, forward{}, eye{};
};

inline ViewBasis viewBasis(const Camera& camera) {
    const double cy = std::cos(camera.yaw), sy = std::sin(camera.yaw);
    const double cp = std::cos(camera.pitch), sp = std::sin(camera.pitch);
    ViewBasis basis{{cy, 0, -sy}, {-sp * sy, cp, -sp * cy}, {cp * sy, sp, cp * cy}, {}};
    basis.eye = {camera.target.x - basis.forward.x * camera.distance, camera.target.y - basis.forward.y * camera.distance, camera.target.z - basis.forward.z * camera.distance};
    return basis;
}

inline void panCamera(Camera& camera, double dx, double dy, int viewportHeight) {
    if (!std::isfinite(dx) || !std::isfinite(dy) || viewportHeight <= 0)
        throw std::invalid_argument("Invalid camera pan");
    const double scale = camera.distance / (double(viewportHeight) * fountainFocalScale);
    const ViewBasis basis = viewBasis(camera);
    camera.target.x += scale * (-dx * basis.right.x + dy * basis.up.x);
    camera.target.y += scale * (-dx * basis.right.y + dy * basis.up.y);
    camera.target.z += scale * (-dx * basis.right.z + dy * basis.up.z);
}

struct ProjectedVertex {
    double x{}, y{}, depth{}, scale{};
    bool valid{};
};

inline ProjectedVertex projectVertex(Vec3 point, const ViewBasis& basis, int width, int height) {
    const Vec3 delta{point.x - basis.eye.x, point.y - basis.eye.y, point.z - basis.eye.z};
    const double depth = delta.x * basis.forward.x + delta.y * basis.forward.y + delta.z * basis.forward.z;
    if (!std::isfinite(depth) || depth <= 0.1)
        return {};
    const double scale = double(height) * fountainFocalScale / depth;
    const double viewX = delta.x * basis.right.x + delta.y * basis.right.y + delta.z * basis.right.z;
    const double viewY = delta.x * basis.up.x + delta.y * basis.up.y + delta.z * basis.up.z;
    return {width * 0.5 + viewX * scale, height * 0.5 - viewY * scale, depth, scale, true};
}

inline ProjectedVertex projectVertex(Vec3 point, const Camera& camera, int width, int height) {
    return projectVertex(point, viewBasis(camera), width, height);
}

struct ScreenPoint {
    int x{}, y{};
    bool visible{};
};

inline ScreenPoint projectPoint(Vec3 point, const Camera& camera, int width, int height) {
    const auto projected = projectVertex(point, camera, width, height);
    if (!projected.valid || projected.x < 0 || projected.y < 0 || projected.x >= width || projected.y >= height)
        return {};
    return {int(projected.x), int(projected.y), true};
}

inline std::uint32_t rgbColor(double red, double green, double blue) {
    return std::uint32_t(std::clamp(red, 0.0, 255.0)) << 24U | std::uint32_t(std::clamp(green, 0.0, 255.0)) << 16U | std::uint32_t(std::clamp(blue, 0.0, 255.0)) << 8U | 255U;
}

struct Framebuffer {
    int width{1120}, height{570};
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(1120 * 570);
    std::vector<std::uint32_t> surfacePixels{};
    std::vector<float> surfaceDepth{};
    std::array<double, 9> surfaceKey{};
    bool surfaceReady{};

    void putPixel(int x, int y, std::uint32_t color) {
        if (x >= 0 && y >= 0 && x < width && y < height)
            pixels[std::size_t(y) * width + x] = color;
    }

    bool addLight(int x, int y, double depth, std::uint32_t color, double opacity) {
        if (x < 0 || y < 0 || x >= width || y >= height)
            return false;
        const std::size_t index = std::size_t(y) * width + x;
        if (depth > double(surfaceDepth[index]) + 0.001)
            return false;
        const std::uint32_t previous = pixels[index];
        pixels[index] = rgbColor(double(previous >> 24U) + double(color >> 24U) * opacity, double((previous >> 16U) & 255U) + double((color >> 16U) & 255U) * opacity, double((previous >> 8U) & 255U) + double((color >> 8U) & 255U) * opacity);
        return true;
    }
};

inline void drawLine(Framebuffer& image, ScreenPoint first, ScreenPoint second, std::uint32_t color) {
    if (!first.visible || !second.visible)
        return;
    int x = first.x, y = first.y;
    const int dx = std::abs(second.x - x), dy = -std::abs(second.y - y);
    int sx = -1;
    if (x < second.x) {
        sx = 1;
    }
    int sy = -1;
    if (y < second.y) {
        sy = 1;
    }
    int error = dx + dy;
    for (;;) {
        image.putPixel(x, y, color);
        if (x == second.x && y == second.y)
            break;
        const int twice = 2 * error;
        if (twice >= dy) {
            error += dy;
            x += sx;
        }
        if (twice <= dx) {
            error += dx;
            y += sy;
        }
    }
}
} // namespace lab
