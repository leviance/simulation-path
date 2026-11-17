#pragma once
#include "camera.hpp"
#include "cutaway-clip.hpp"
#include "display.hpp"
#include "surface.hpp"

namespace slices {
struct SceneFrame {
    static constexpr int width = 650;
    static constexpr int height = 610;
    std::vector<std::uint8_t> rgba = std::vector<std::uint8_t>(width * height * 4);
};

#if LAB_CHECKPOINT >= 3
struct ScreenVertex {
    double x;
    double y;
    double inverseDepth;
    Point normal;
};

// CPU presentation scaffold: rasterized surface + at most three ray/plane cap hits.
// No integration through a volume, MIP, alpha accumulation or hidden ray marching.
inline SceneFrame renderCutaway(const Grid& grid, const Surface& mesh, Point cursor, SliceCamera camera, bool cut, const std::array<const ScalarImage*, 3>& raw, const std::array<const Image*, 3>& images, bool dark) {
    SceneFrame frame;
    std::vector<double> depth(SceneFrame::width * SceneFrame::height);
    const auto basis = cameraBasis(camera);
    const Point low{lower(grid, 0), lower(grid, 1), lower(grid, 2)};
    const Point extent{grid.count[0] * grid.spacing[0], grid.count[1] * grid.spacing[1], grid.count[2] * grid.spacing[2]};
    const Point light = normalize({-0.5, -0.7, 1});
    const Point half = normalize(add(light, multiply(basis.forward, -1)));
    const auto byte = [](double value) {
        return static_cast<std::uint8_t>(std::clamp(std::floor(value + 0.5), 0.0, 255.0));
    };
    const auto project = [&](SurfaceVertex vertex) {
        const Point relative = subtract(vertex.point, basis.eye);
        const double z = dot(relative, basis.forward);
        const double scale = SceneFrame::height / (0.92 * z);
        return ScreenVertex{SceneFrame::width / 2.0 + dot(relative, basis.right) * scale, SceneFrame::height / 2.0 - dot(relative, basis.up) * scale, 1 / z, vertex.normal};
    };
    const auto edge = [](ScreenVertex a, ScreenVertex b, double x, double y) {
        return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    };
    // A reference floor and contact cue establish depth, not a simulated lighting model.
    for (int y = 0; y < SceneFrame::height; ++y) {
        for (int x = 0; x < SceneFrame::width; ++x) {
            const double sx = (2 * (x + 0.5) / SceneFrame::width - 1) * SceneFrame::width / SceneFrame::height * 0.46;
            const double sy = (1 - 2 * (y + 0.5) / SceneFrame::height) * 0.46;
            const Point direction = add(basis.forward, add(multiply(basis.right, sx), multiply(basis.up, sy)));
            Point color{238 - 10.0 * y / SceneFrame::height, 243 - 8.0 * y / SceneFrame::height, 246 - 5.0 * y / SceneFrame::height};
            if (dark) {
                color = {16 + 5.0 * y / SceneFrame::height, 27 + 7.0 * y / SceneFrame::height, 38 + 10.0 * y / SceneFrame::height};
            }
            const double floorT = (low[2] - 0.12 - basis.eye[2]) / direction[2];
            if (floorT > 0 && std::isfinite(floorT)) {
                const Point point = add(basis.eye, multiply(direction, floorT));
                if (std::abs(point[0]) < 5 && std::abs(point[1]) < 5) {
                    const double distance = std::min(std::abs(point[0] * 2 - std::round(point[0] * 2)), std::abs(point[1] * 2 - std::round(point[1] * 2)));
                    const double line = std::max(0.0, 1 - distance / 0.018);
                    const double shadow = 26 * std::exp(-point[0] * point[0] / 2.1 - point[1] * point[1] / 2.8);
                    color = {226 - 18 * line - shadow, 234 - 18 * line - shadow, 239 - 17 * line - shadow};
                    if (dark) {
                        color = {19 + 14 * line - shadow * 0.25, 32 + 21 * line - shadow * 0.25, 45 + 26 * line - shadow * 0.25};
                    }
                }
            }
            const auto index = static_cast<std::size_t>(4 * (x + y * SceneFrame::width));
            for (int channel = 0; channel < 3; ++channel) {
                frame.rgba[index + channel] = byte(color[channel]);
            }
            frame.rgba[index + 3] = 255;
        }
    }

    for (const auto& triangle : mesh) {
        Surface pieces;
        if (cut) {
            pieces = keepOutsideCorner(triangle, cursor);
        } else {
            pieces.push_back(triangle);
        }
        for (const auto& piece : pieces) {
            if (dot(add(add(piece[0].normal, piece[1].normal), piece[2].normal), subtract(basis.eye, piece[0].point)) <= 0) {
                continue;
            }
            const auto a = project(piece[0]);
            const auto b = project(piece[1]);
            const auto c = project(piece[2]);
            if (a.inverseDepth <= 0 || b.inverseDepth <= 0 || c.inverseDepth <= 0) {
                continue;
            }
            const double area = edge(a, b, c.x, c.y);
            if (!std::isfinite(area) || std::abs(area) < 1e-9) {
                continue;
            }
            const int x0 = static_cast<int>(std::clamp(std::floor(std::min({a.x, b.x, c.x})), 0.0, static_cast<double>(SceneFrame::width - 1)));
            const int x1 = static_cast<int>(std::clamp(std::ceil(std::max({a.x, b.x, c.x})), 0.0, static_cast<double>(SceneFrame::width - 1)));
            const int y0 = static_cast<int>(std::clamp(std::floor(std::min({a.y, b.y, c.y})), 0.0, static_cast<double>(SceneFrame::height - 1)));
            const int y1 = static_cast<int>(std::clamp(std::ceil(std::max({a.y, b.y, c.y})), 0.0, static_cast<double>(SceneFrame::height - 1)));
            for (int y = y0; y <= y1; ++y) {
                for (int x = x0; x <= x1; ++x) {
                    const double wa = edge(b, c, x + 0.5, y + 0.5) / area;
                    const double wb = edge(c, a, x + 0.5, y + 0.5) / area;
                    const double wc = 1 - wa - wb;
                    if (wa < 0 || wb < 0 || wc < 0) {
                        continue;
                    }
                    const double inverseDepth = wa * a.inverseDepth + wb * b.inverseDepth + wc * c.inverseDepth;
                    const auto index = static_cast<std::size_t>(x + y * SceneFrame::width);
                    if (inverseDepth <= depth[index]) {
                        continue;
                    }
                    Point normal{};
                    for (int axis = 0; axis < 3; ++axis) {
                        normal[axis] = (wa * a.inverseDepth * a.normal[axis] + wb * b.inverseDepth * b.normal[axis] + wc * c.inverseDepth * c.normal[axis]) / inverseDepth;
                    }
                    normal = normalize(normal);
                    const double diffuse = std::max(0.0, dot(normal, light));
                    const double specular = std::pow(std::max(0.0, dot(normal, half)), 38);
                    const double intensity = 0.42 + 0.55 * diffuse + 0.24 * specular;
                    depth[index] = inverseDepth;
                    frame.rgba[4 * index] = byte(215 * intensity);
                    frame.rgba[4 * index + 1] = byte(225 * intensity);
                    frame.rgba[4 * index + 2] = byte(233 * intensity);
                }
            }
        }
    }
    if (!cut) {
        return frame;
    }
    // Cap pixels read the same cached scalar/RGBA slices as the orthogonal images.
    for (int y = 0; y < SceneFrame::height; ++y) {
        for (int x = 0; x < SceneFrame::width; ++x) {
            const double sx = (2 * (x + 0.5) / SceneFrame::width - 1) * SceneFrame::width / SceneFrame::height * 0.46;
            const double sy = (1 - 2 * (y + 0.5) / SceneFrame::height) * 0.46;
            const Point direction = add(basis.forward, add(multiply(basis.right, sx), multiply(basis.up, sy)));
            for (int view = 0; view < 3; ++view) {
                const int axis = axesFor(view).cut;
                if (std::abs(direction[axis]) < 1e-10) {
                    continue;
                }
                const double t = (cursor[axis] - basis.eye[axis]) / direction[axis];
                const auto index = static_cast<std::size_t>(x + y * SceneFrame::width);
                if (t <= 0 || 1 / t <= depth[index] + 1e-8) {
                    continue;
                }
                const Point point = add(basis.eye, multiply(direction, t));
                if ((axis != 0 && point[0] < cursor[0] - 1e-8) || (axis != 1 && point[1] > cursor[1] + 1e-8) || (axis != 2 && point[2] < cursor[2] - 1e-8)) {
                    continue;
                }
                const auto axes = axesFor(view);
                const double u = (point[axes.horizontal] - low[axes.horizontal]) / extent[axes.horizontal];
                const double v = 1 - (point[axes.vertical] - low[axes.vertical]) / extent[axes.vertical];
                if (u < 0 || u >= 1 || v < 0 || v >= 1) {
                    continue;
                }
                const auto pixel = static_cast<std::size_t>(std::floor(u * Image::side) + Image::side * std::floor(v * Image::side));
                if (raw[view]->at(pixel) < surfaceIso) {
                    continue;
                }
                depth[index] = 1 / t;
                for (int channel = 0; channel < 3; ++channel) {
                    frame.rgba[4 * index + channel] = images[view]->rgba[4 * pixel + channel];
                }
            }
        }
    }
    return frame;
}
#endif
} // namespace slices
