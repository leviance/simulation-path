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

struct PaintVertex {
    Vec3 point;
    Color color;
};

inline Color colorBetween(Color a, Color b, double t) {
    return {a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t};
}

inline std::uint32_t inkOver(std::uint32_t paper, std::uint32_t ink, int opacity) {
    const auto channel = [paper, ink, opacity](int shift) {
        const int a = (paper >> shift) & 255;
        const int b = (ink >> shift) & 255;
        return static_cast<std::uint32_t>((a * (255 - opacity) + b * opacity) / 255) << shift;
    };
    return 0xff000000u | channel(16) | channel(8) | channel(0);
}

struct Raster {
    int width;
    int height;
    std::vector<std::uint32_t> pixels;
    std::vector<double> inverseDepth;
    Camera camera;
    Basis basis;

    Raster(int w, int h)
        : width(w), height(h), pixels(w * h), inverseDepth(w * h) {}

    void begin(const Camera& value) {
        camera = value;
        basis = cameraBasis(camera);
        std::fill(inverseDepth.begin(), inverseDepth.end(), 0);
        for (int y = 0; y < height; ++y) {
            const double gradient = static_cast<double>(y) / height;
            const double sky = 1 - std::abs(2 * gradient - 0.85);
            const auto color = packed({17 + 12 * sky, 26 + 20 * sky, 36 + 22 * sky});
            std::fill(pixels.begin() + y * width, pixels.begin() + (y + 1) * width, color);
        }
    }

    Vec3 toCamera(Vec3 point) const {
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

    void rasterTriangle(PaintVertex a, PaintVertex b, PaintVertex c, int opacity, bool smooth) {
        const auto p = toScreen(a.point);
        const auto q = toScreen(b.point);
        const auto r = toScreen(c.point);
        const double area = edge(p, q, r.x, r.y);
        if (!std::isfinite(area) || std::abs(area) < 1e-9) {
            return;
        }
        // Clamp in floating point BEFORE conversion to int, even near the camera.
        const int x0 = static_cast<int>(std::clamp(std::floor(std::min({p.x, q.x, r.x})), 0.0, static_cast<double>(width - 1)));
        const int x1 = static_cast<int>(std::clamp(std::ceil(std::max({p.x, q.x, r.x})), 0.0, static_cast<double>(width - 1)));
        const int y0 = static_cast<int>(std::clamp(std::floor(std::min({p.y, q.y, r.y})), 0.0, static_cast<double>(height - 1)));
        const int y1 = static_cast<int>(std::clamp(std::ceil(std::max({p.y, q.y, r.y})), 0.0, static_cast<double>(height - 1)));
        const auto value = packed(a.color);
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
                if (opacity < 255) {
                    // Shadow ink belongs to the table only. No depth here means
                    // the projected silhouette fell outside its finite display patch.
                    if (inverseDepth[index] > 0 && std::abs(depth - inverseDepth[index]) <= depth * 0.0001) {
                        pixels[index] = inkOver(pixels[index], value, opacity);
                    }
                } else if (depth > inverseDepth[index]) {
                    inverseDepth[index] = depth;
                    if (!smooth) {
                        pixels[index] = value;
                    } else {
                        // Perspective-correct highlights stay attached when the
                        // observer zooms in or crosses the mesh's near clip.
                        const double u = wa * p.inverseDepth / depth;
                        const double v = wb * q.inverseDepth / depth;
                        const double w = 1 - u - v;
                        pixels[index] = packed({a.color.r * u + b.color.r * v + c.color.r * w,
                                                a.color.g * u + b.color.g * v + c.color.g * w,
                                                a.color.b * u + b.color.b * v + c.color.b * w});
                    }
                }
            }
        }
    }

    void paint(PaintVertex a, PaintVertex b, PaintVertex c, int opacity, bool smooth) {
        // Clip the polygon against z=near before perspective divide, then triangulate.
        constexpr double nearDepth = 0.06;
        const std::array<PaintVertex, 3> input{{{toCamera(a.point), a.color}, {toCamera(b.point), b.color}, {toCamera(c.point), c.color}}};
        if (input[0].point.z >= nearDepth && input[1].point.z >= nearDepth && input[2].point.z >= nearDepth) {
            rasterTriangle(input[0], input[1], input[2], opacity, smooth);
            return;
        }
        std::array<PaintVertex, 4> output{};
        int count = 0;
        for (int i = 0; i < 3; ++i) {
            const PaintVertex start = input[i];
            const PaintVertex end = input[(i + 1) % 3];
            const bool insideStart = start.point.z >= nearDepth;
            const bool insideEnd = end.point.z >= nearDepth;
            if (insideStart) {
                output[count++] = start;
            }
            if (insideStart != insideEnd) {
                const double t = (nearDepth - start.point.z) / (end.point.z - start.point.z);
                output[count++] = {add(start.point, multiply(subtract(end.point, start.point), t)), colorBetween(start.color, end.color, t)};
            }
        }
        for (int i = 1; i + 1 < count; ++i) {
            rasterTriangle(output[0], output[i], output[i + 1], opacity, smooth);
        }
    }

    void triangle(Vec3 a, Vec3 b, Vec3 c, Color color, int opacity = 255) {
        paint({a, color}, {b, color}, {c, color}, opacity, false);
    }

    void line(Vec3 a, Vec3 b, Color color, bool xray = false, int radius = 0, double hiddenLight = 0.40) {
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
        const auto bright = packed(color);
        const auto hidden = packed(color, hiddenLight);
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
                        pixels[index] = bright;
                    } else if (xray && i % 10 < 4) {
                        pixels[index] = hidden;
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

    void ring(Vec3 point, Color color, int radius, bool diamond = false) {
        const Vec3 p = toCamera(point);
        if (p.z <= 0.061) {
            return;
        }
        const auto pixel = toScreen(p);
        if (pixel.x < -radius || pixel.x > width + radius || pixel.y < -radius || pixel.y > height + radius) {
            return;
        }
        const int cx = static_cast<int>(std::round(pixel.x));
        const int cy = static_cast<int>(std::round(pixel.y));
        for (int y = -radius; y <= radius; ++y) {
            for (int x = -radius; x <= radius; ++x) {
                const int distance2 = x * x + y * y;
                bool onEdge = distance2 <= radius * radius && distance2 > (radius - 1) * (radius - 1);
                if (diamond) {
                    onEdge = std::abs(x) + std::abs(y) == radius;
                }
                if (onEdge && cx + x >= 0 && cx + x < width && cy + y >= 0 && cy + y < height) {
                    pixels[(cy + y) * width + cx + x] = packed(color);
                }
            }
        }
    }
};
} // namespace picking
