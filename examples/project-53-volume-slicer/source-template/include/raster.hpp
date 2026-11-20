#pragma once
#include "camera.hpp"
#include "context-mesh.hpp"
#include "display.hpp"
#include <limits>

namespace slice53 {
#if LAB_CHECKPOINT >= 6
// Supplied CPU rasterizer: perspective-correct attributes and a real depth buffer.
class Raster {
    int width_;
    int height_;
    std::vector<std::uint32_t> pixels_;
    std::vector<double> depth_;
    int sectionAxis_ = -1;
    double sectionPlane_ = 0;

    static std::size_t pixelCount(int width, int height) {
        if (width < 1 || height < 1 || width > 1280 || height > 1280)
            throw std::invalid_argument("CPU context dimensions must be in [1,1280]");
        return static_cast<std::size_t>(width) * height;
    }

    public:
    Raster(int width, int height) : width_(width), height_(height), pixels_(pixelCount(width, height)), depth_(pixels_.size()) {}
    const std::vector<std::uint32_t>& pixels() const { return pixels_; }
    void setSectionLight(int axis, double plane) { sectionAxis_ = axis; sectionPlane_ = plane; }

    void background(const CameraFrame& frame) {
        std::fill(depth_.begin(), depth_.end(), std::numeric_limits<double>::infinity());
        for (int y = 0; y < height_; ++y) {
            for (int x = 0; x < width_; ++x) {
                Color color = mix({0.055, 0.08, 0.105}, {0.09, 0.14, 0.17}, static_cast<double>(y) / height_);
                const Vec3 ray = cameraRay(frame, x + 0.5, y + 0.5);
                if (ray.y < -1e-8) {
                    const double t = (-113 - frame.eye.y) / ray.y;
                    const Vec3 point = frame.eye + ray * t;
                    if (t > 0 && t < 1300) {
                        const double fade = std::clamp(1 - t / 1300, 0.0, 1.0);
                        const double gx = std::abs(point.x / 20 - std::round(point.x / 20));
                        const double gz = std::abs(point.z / 20 - std::round(point.z / 20));
                        if (std::min(gx, gz) < 0.016) color = mix(color, {0.25, 0.37, 0.40}, fade * 0.38);
                        const double shadow = 0.3 * std::exp(-(point.x * point.x + point.z * point.z) / 10500);
                        color = {color.r * (1 - shadow), color.g * (1 - shadow), color.b * (1 - shadow)};
                    }
                }
                pixels_[x + y * width_] = pack(color);
            }
        }
    }

    void triangle(const CameraFrame& frame, const Triangle& vertices, const Grid& grid, const SliceImage* slice, int view, Window window, bool colored) {
        std::array<Projection, 3> projected;
        for (int i = 0; i < 3; ++i) {
            const auto point = project(frame, vertices[i].point);
            if (!point) return;
            projected[i] = *point;
        }
        const auto edge = [](Projection a, Projection b, double x, double y) { return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x); };
        const double area = edge(projected[0], projected[1], projected[2].x, projected[2].y);
        if (std::abs(area) < 1e-8) return;
        const int left = std::max(0, static_cast<int>(std::floor(std::min({projected[0].x, projected[1].x, projected[2].x}))));
        const int right = std::min(width_ - 1, static_cast<int>(std::ceil(std::max({projected[0].x, projected[1].x, projected[2].x}))));
        const int top = std::max(0, static_cast<int>(std::floor(std::min({projected[0].y, projected[1].y, projected[2].y}))));
        const int bottom = std::min(height_ - 1, static_cast<int>(std::ceil(std::max({projected[0].y, projected[1].y, projected[2].y}))));
        const Axes axes = axesFor(view);
        const Vec3 extent = grid.extent();
        for (int y = top; y <= bottom; ++y) {
            for (int x = left; x <= right; ++x) {
                double a = edge(projected[1], projected[2], x + 0.5, y + 0.5) / area;
                double b = edge(projected[2], projected[0], x + 0.5, y + 0.5) / area;
                double c = 1 - a - b;
                if (std::min({a, b, c}) < -1e-8) continue;
                a /= projected[0].depth;
                b /= projected[1].depth;
                c /= projected[2].depth;
                const double inverseDepth = a + b + c;
                const double depth = 1.0 / inverseDepth;
                const std::size_t pixel = static_cast<std::size_t>(x) + static_cast<std::size_t>(y) * width_;
                if (depth >= depth_[pixel]) continue;
                a *= depth;
                b *= depth;
                c *= depth;
                Color color{0.66, 0.73, 0.73};
                Vec3 normal = unit(vertices[0].normal * a + vertices[1].normal * b + vertices[2].normal * c);
                const double material = vertices[0].material * a + vertices[1].material * b + vertices[2].material * c;
                const Vec3 point = vertices[0].point * a + vertices[1].point * b + vertices[2].point * c;
                if (colored && material >= 0) color = scalarColor(material, window, true);
                if (slice) {
                    const double u = (point[axes.horizontal] - grid.origin[axes.horizontal]) / extent[axes.horizontal];
                    const double v = (point[axes.vertical] - grid.origin[axes.vertical]) / extent[axes.vertical];
                    const int column = std::clamp(static_cast<int>(u * slice->width), 0, slice->width - 1);
                    const int row = std::clamp(static_cast<int>((1 - v) * slice->height), 0, slice->height - 1);
                    const double scalar = slice->scalar[column + row * slice->width];
                    if (scalar < contextIso) continue;
                    color = scalarColor(scalar, window, colored);
                }
                const Vec3 viewDirection = unit(frame.eye - point);
                if (dot(normal, viewDirection) < 0) normal = normal * -1;
                const Vec3 key = unit({-0.4, 0.8, 0.6});
                double light = 0.48 + 0.46 * std::max(0.0, dot(normal, key)) + 0.15 * std::max(0.0, dot(normal, unit({0.8, 0.2, -0.6})));
                double glint = 0;
                if (slice) light = 0.72 + 0.22 * std::max(0.0, dot(normal, key)) + 0.06 * std::max(0.0, dot(normal, viewDirection));
                else if (material > 0.84) {
                    double exposure = 1;
                    if (sectionAxis_ >= 0) {
                        // Crystals deep behind the cut receive less fill light than those at the opening.
                        const double setback = std::clamp((sectionPlane_ - point[sectionAxis_]) / 37, 0.0, 1.0);
                        exposure = 1 - 0.66 * setback;
                    }
                    light *= exposure;
                    glint = 0.24 * exposure * std::pow(std::max(0.0, dot(normal, unit(key + viewDirection))), 18);
                }
                pixels_[pixel] = pack({color.r * light + glint, color.g * light + glint, color.b * light + glint});
                depth_[pixel] = depth;
            }
        }
    }
};

inline void drawContext(Raster& raster, const CameraFrame& frame, const Mesh& mesh, const Grid& grid, Vec3 probe, const std::array<SliceImage, 3>& slices, Window window, bool colored, bool cut, int sectionView = -1) {
    raster.background(frame);
    int sectionAxis = -1;
    if (cut && sectionView >= 0) sectionAxis = axesFor(sectionView).fixed;
    double sectionPlane = 0;
    if (sectionAxis >= 0) sectionPlane = probe[sectionAxis];
    raster.setSectionLight(sectionAxis, sectionPlane);
    for (const Triangle& triangle : mesh) {
        if (!cut) {
            raster.triangle(frame, triangle, grid, nullptr, 0, window, colored);
            continue;
        }
        // [snippet geode-section]
        if (sectionAxis >= 0) {
            // Saw the rock on the same plane as the selected XY, XZ or YZ image.
            const double a = triangle[0].point[sectionAxis], b = triangle[1].point[sectionAxis], c = triangle[2].point[sectionAxis];
            if (std::max({a, b, c}) <= sectionPlane) raster.triangle(frame, triangle, grid, nullptr, 0, window, colored);
            else if (std::min({a, b, c}) < sectionPlane) {
                const std::vector<Vertex> face(triangle.begin(), triangle.end());
                const auto visible = clipPolygon(face, sectionAxis, sectionPlane, true);
                for (std::size_t i = 1; i + 1 < visible.size(); ++i)
                    raster.triangle(frame, {visible[0], visible[i], visible[i + 1]}, grid, nullptr, 0, window, colored);
            }
            continue;
        }
        // [/snippet geode-section]
        bool whollyOutside = false;
        bool whollyInside = true;
        for (int axis = 0; axis < 3; ++axis) {
            if (triangle[0].point[axis] <= probe[axis] && triangle[1].point[axis] <= probe[axis] && triangle[2].point[axis] <= probe[axis]) whollyOutside = true;
            for (const Vertex& vertex : triangle)
                if (vertex.point[axis] < probe[axis]) whollyInside = false;
        }
        if (whollyOutside) {
            raster.triangle(frame, triangle, grid, nullptr, 0, window, colored);
            continue;
        }
        if (whollyInside) continue;
        std::vector<Vertex> remaining(triangle.begin(), triangle.end());
        for (int axis = 0; axis < 3 && !remaining.empty(); ++axis) {
            const auto outside = clipPolygon(remaining, axis, probe[axis], true);
            for (std::size_t i = 1; i + 1 < outside.size(); ++i)
                raster.triangle(frame, {outside[0], outside[i], outside[i + 1]}, grid, nullptr, 0, window, colored);
            remaining = clipPolygon(remaining, axis, probe[axis], false);
        }
    }
    if (!cut) return;
    // [snippet context-caps]
    const Vec3 upper = grid.origin + grid.extent();
    for (int view = 0; view < 3; ++view) {
        if (sectionAxis >= 0 && view != sectionView) continue;
        const Axes axes = axesFor(view);
        Vec3 normal;
        normal[axes.fixed] = 1;
        Vec3 a = probe;
        if (sectionAxis >= 0) {
            a[axes.horizontal] = grid.origin[axes.horizontal];
            a[axes.vertical] = grid.origin[axes.vertical];
        }
        Vec3 b = a;
        Vec3 c = a;
        Vec3 d = a;
        b[axes.horizontal] = upper[axes.horizontal];
        c[axes.horizontal] = upper[axes.horizontal];
        c[axes.vertical] = upper[axes.vertical];
        d[axes.vertical] = upper[axes.vertical];
        raster.triangle(frame, {{{a, normal}, {b, normal}, {c, normal}}}, grid, &slices[view], view, window, colored);
        raster.triangle(frame, {{{a, normal}, {c, normal}, {d, normal}}}, grid, &slices[view], view, window, colored);
    }
    // [/snippet context-caps]
}
#endif
} // namespace slice53
