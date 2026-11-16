#pragma once
#include "camera.hpp"
#include <algorithm>
#include <array>
#include <cstdint>
#include <vector>

namespace picking {
// Provided presentation scaffold, based on the CPU renderer branch (16–19).
// It rasterizes triangles, NOT analytic ray intersections. Picking stays independent.
struct Color {
    double r;
    double g;
    double b;
};

inline std::uint32_t packed(Color color, double light = 1) {
    const auto red = static_cast<std::uint32_t>(std::clamp(color.r * light, 0.0, 255.0));
    const auto green = static_cast<std::uint32_t>(std::clamp(color.g * light, 0.0, 255.0));
    const auto blue = static_cast<std::uint32_t>(std::clamp(color.b * light, 0.0, 255.0));
    return 0xff000000u | (red << 16) | (green << 8) | blue;
}

struct ScreenVertex {
    double x;
    double y;
    double inverseDepth;
};

struct Raster {
    int width;
    int height;
    std::vector<std::uint32_t> pixels;
    std::vector<double> inverseDepth;
    Camera camera;

    Raster(int w, int h)
        : width(w), height(h), pixels(w * h), inverseDepth(w * h) {}

    void begin(const Camera& value) {
        camera = value;
        std::fill(inverseDepth.begin(), inverseDepth.end(), 0);
        for (int y = 0; y < height; ++y) {
            const double gradient = static_cast<double>(y) / height;
            const auto color = packed({12 + 9 * gradient, 20 + 12 * gradient, 35 + 16 * gradient});
            std::fill(pixels.begin() + y * width, pixels.begin() + (y + 1) * width, color);
        }
    }

    Vec3 toCamera(Vec3 point) const {
        const auto basis = cameraBasis(camera);
        const Vec3 relative = subtract(point, camera.origin);
        return {dot(relative, basis.right), dot(relative, basis.up), dot(relative, basis.forward)};
    }

    ScreenVertex toScreen(Vec3 point) const {
        const double scale = height / (2 * camera.tanHalfFov * point.z);
        return {width * 0.5 + point.x * scale, height * 0.5 - point.y * scale, 1 / point.z};
    }

    static double edge(ScreenVertex a, ScreenVertex b, double x, double y) {
        return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    }

    void rasterTriangle(Vec3 a, Vec3 b, Vec3 c, Color color) {
        const auto p = toScreen(a);
        const auto q = toScreen(b);
        const auto r = toScreen(c);
        const double area = edge(p, q, r.x, r.y);
        if (!std::isfinite(area) || std::abs(area) < 1e-9) {
            return;
        }
        // Clamp in floating point BEFORE conversion to int, even near the camera.
        const int x0 = static_cast<int>(std::clamp(std::floor(std::min({p.x, q.x, r.x})), 0.0, static_cast<double>(width - 1)));
        const int x1 = static_cast<int>(std::clamp(std::ceil(std::max({p.x, q.x, r.x})), 0.0, static_cast<double>(width - 1)));
        const int y0 = static_cast<int>(std::clamp(std::floor(std::min({p.y, q.y, r.y})), 0.0, static_cast<double>(height - 1)));
        const int y1 = static_cast<int>(std::clamp(std::ceil(std::max({p.y, q.y, r.y})), 0.0, static_cast<double>(height - 1)));
        const auto value = packed(color);
        for (int y = y0; y <= y1; ++y) {
            for (int x = x0; x <= x1; ++x) {
                const double wa = edge(q, r, x + 0.5, y + 0.5) / area;
                const double wb = edge(r, p, x + 0.5, y + 0.5) / area;
                const double wc = 1 - wa - wb;
                if (wa < -1e-10 || wb < -1e-10 || wc < -1e-10) {
                    continue;
                }
                const double depth = wa * p.inverseDepth + wb * q.inverseDepth + wc * r.inverseDepth;
                const int index = y * width + x;
                if (depth > inverseDepth[index]) {
                    inverseDepth[index] = depth;
                    pixels[index] = value;
                }
            }
        }
    }

    void triangle(Vec3 a, Vec3 b, Vec3 c, Color color) {
        Vec3 normal = normalize(cross(subtract(b, a), subtract(c, a)));
        const Vec3 center = multiply(add(add(a, b), c), 1.0 / 3);
        if (dot(normal, subtract(camera.origin, center)) < 0) {
            normal = multiply(normal, -1);
        }
        const double light = 0.24 + 0.76 * std::max(0.0, dot(normal, normalize({-0.4, 0.85, -0.35})));
        color = {color.r * light, color.g * light, color.b * light};

        // Clip the polygon against z=near before perspective divide, then triangulate.
        constexpr double nearDepth = 0.06;
        const std::array<Vec3, 3> input{toCamera(a), toCamera(b), toCamera(c)};
        std::array<Vec3, 4> output{};
        int count = 0;
        for (int i = 0; i < 3; ++i) {
            const Vec3 start = input[i];
            const Vec3 end = input[(i + 1) % 3];
            const bool insideStart = start.z >= nearDepth;
            const bool insideEnd = end.z >= nearDepth;
            if (insideStart) {
                output[count++] = start;
            }
            if (insideStart != insideEnd) {
                const double t = (nearDepth - start.z) / (end.z - start.z);
                output[count++] = add(start, multiply(subtract(end, start), t));
            }
        }
        for (int i = 1; i + 1 < count; ++i) {
            rasterTriangle(output[0], output[i], output[i + 1], color);
        }
    }

    void line(Vec3 a, Vec3 b, Color color, bool xray = false, int radius = 0) {
        a = toCamera(a);
        b = toCamera(b);
        constexpr double nearDepth = 0.061;
        if (a.z < nearDepth && b.z < nearDepth) {
            return;
        }
        if (a.z < nearDepth) {
            a = add(a, multiply(subtract(b, a), (nearDepth - a.z) / (b.z - a.z)));
        } else if (b.z < nearDepth) {
            b = add(b, multiply(subtract(a, b), (nearDepth - b.z) / (a.z - b.z)));
        }
        const auto p = toScreen(a);
        const auto q = toScreen(b);
        double lo = 0;
        double hi = 1;
        // Screen clipping also bounds the line loop when an endpoint crosses near.
        const double starts[]{p.x, p.y};
        const double deltas[]{q.x - p.x, q.y - p.y};
        const double bounds[]{static_cast<double>(width - 1), static_cast<double>(height - 1)};
        for (int axis = 0; axis < 2; ++axis) {
            if (deltas[axis] == 0) {
                if (starts[axis] < 0 || starts[axis] > bounds[axis]) {
                    return;
                }
            } else {
                double entry = -starts[axis] / deltas[axis];
                double exit = (bounds[axis] - starts[axis]) / deltas[axis];
                if (entry > exit) {
                    std::swap(entry, exit);
                }
                lo = std::max(lo, entry);
                hi = std::min(hi, exit);
            }
        }
        if (lo > hi) {
            return;
        }
        const double dx = (q.x - p.x) * (hi - lo);
        const double dy = (q.y - p.y) * (hi - lo);
        const int steps = std::max(1, static_cast<int>(std::ceil(std::max(std::abs(dx), std::abs(dy)))));
        for (int i = 0; i <= steps; ++i) {
            const double t = lo + (hi - lo) * i / steps;
            const int x = static_cast<int>(std::round(p.x + (q.x - p.x) * t));
            const int y = static_cast<int>(std::round(p.y + (q.y - p.y) * t));
            const double depth = p.inverseDepth + (q.inverseDepth - p.inverseDepth) * t;
            for (int oy = -radius; oy <= radius; ++oy) {
                for (int ox = -radius; ox <= radius; ++ox) {
                    if (x + ox < 0 || x + ox >= width || y + oy < 0 || y + oy >= height) {
                        continue;
                    }
                    const int index = (y + oy) * width + x + ox;
                    const bool visible = depth >= inverseDepth[index] * 0.998;
                    if (visible) {
                        pixels[index] = packed(color);
                    } else if (xray && i % 10 < 4) {
                        pixels[index] = packed(color, 0.4);
                    }
                }
            }
        }
    }

    void marker(Vec3 point, Color color, int size = 4) {
        const Vec3 p = toCamera(point);
        if (p.z <= 0.061) {
            return;
        }
        const auto pixel = toScreen(p);
        if (pixel.x < -size || pixel.x > width + size || pixel.y < -size || pixel.y > height + size) {
            return;
        }
        const int px = static_cast<int>(std::round(pixel.x));
        const int py = static_cast<int>(std::round(pixel.y));
        for (int y = -size; y <= size; ++y) {
            for (int x = -size; x <= size; ++x) {
                if (x * x + y * y <= size * size && px + x >= 0 && px + x < width && py + y >= 0 && py + y < height) {
                    pixels[(py + y) * width + px + x] = packed(color);
                }
            }
        }
    }
};
} // namespace picking
