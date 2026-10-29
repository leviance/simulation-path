#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 10
#define COURSE_HAS_3D_RENDERER 1

struct CameraFrame {
    Vec3 eye{};
    Vec3 right{};
    Vec3 up{};
    Vec3 forward{};
};

inline CameraFrame makeCamera(const CameraSettings& settings) {
    const double pitch = std::clamp(settings.pitch, -1.2, 1.2);
    const double distance = std::clamp(settings.distance, 22.0, 38.0);
    const Vec3 eye{distance * std::cos(pitch) * std::sin(settings.yaw), distance * std::sin(pitch), distance * std::cos(pitch) * std::cos(settings.yaw)};
    const Vec3 forward = unit3(mul3(eye, -1.0));
    const Vec3 right = unit3(cross3(forward, {0.0, 1.0, 0.0}));
    return {eye, right, cross3(right, forward), forward};
}

inline Vec3 toCamera(Vec3 world, const CameraFrame& camera) {
    const Vec3 delta = sub3(world, camera.eye);
    return {dot3(delta, camera.right), dot3(delta, camera.up), dot3(delta, camera.forward)};
}

inline Vec2 projectCamera(Vec3 point) {
    return {550.0 + 620.0 * point.x / point.z, 370.0 - 620.0 * point.y / point.z};
}

// Analytic front-surface ray/sphere hit. t chính là view-space Z vì ray.z=1.
inline double sphereDepth(double rx, double ry, Vec3 center, double radius) {
    if (!std::isfinite(rx) || !std::isfinite(ry) || !finite3(center) || !std::isfinite(radius) || radius <= 0.0) {
        return std::numeric_limits<double>::infinity();
    }
    const double a = rx * rx + ry * ry + 1.0;
    const double halfB = -(rx * center.x + ry * center.y + center.z);
    const double c = dot3(center, center) - radius * radius;
    const double discriminant = halfB * halfB - a * c;
    if (discriminant < 0.0 || !std::isfinite(discriminant)) {
        return std::numeric_limits<double>::infinity();
    }
    const double depth = (-halfB - std::sqrt(discriminant)) / a;
    if (depth >= 0.2 && depth <= 80.0) {
        return depth;
    }
    return std::numeric_limits<double>::infinity();
}

struct DepthBuffer {
    std::vector<double> values = std::vector<double>(Framebuffer::width * Framebuffer::height, std::numeric_limits<double>::infinity());

    void clear() {
        std::fill(values.begin(), values.end(), std::numeric_limits<double>::infinity());
    }
};

inline std::uint32_t shade(std::uint32_t color, double light) {
    const auto channel = [&](int shift) {
        return static_cast<std::uint32_t>(std::clamp(static_cast<double>((color >> shift) & 255U) * light, 0.0, 255.0));
    };
    return (channel(24) << 24) | (channel(16) << 16) | (channel(8) << 8) | 255U;
}

inline void drawSphere(Framebuffer& image, DepthBuffer& depth, const Sphere& body, const CameraFrame& camera) {
    const Vec3 c = toCamera(body.position, camera);
    const double r = body.radius;
    if (!finiteSphere(body) || !finite3(c) || c.z <= r + 0.2)
        return;
    // Biên silhouette chính xác cho từng trục, không dùng r/z sai ở rìa màn hình.
    const double denominator = c.z * c.z - r * r;
    const auto bounds = [&](double axis) {
        const double spread = r * std::sqrt(axis * axis + c.z * c.z - r * r);
        return std::pair<double, double>{620.0 * (axis * c.z - spread) / denominator, 620.0 * (axis * c.z + spread) / denominator};
    };
    const auto bx = bounds(c.x);
    const auto by = bounds(c.y);
    const int left = static_cast<int>(std::floor(std::clamp(550.0 + bx.first, 0.0, 1099.0)));
    const int right = static_cast<int>(std::ceil(std::clamp(550.0 + bx.second, 0.0, 1099.0)));
    const int top = static_cast<int>(std::floor(std::clamp(370.0 - by.second, 85.0, 650.0)));
    const int bottom = static_cast<int>(std::ceil(std::clamp(370.0 - by.first, 85.0, 650.0)));
    const Vec3 light = unit3({-0.4, 0.6, -0.7});
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            const double rx = (static_cast<double>(x) + 0.5 - 550.0) / 620.0;
            const double ry = (370.0 - static_cast<double>(y) - 0.5) / 620.0;
            const double z = sphereDepth(rx, ry, c, r);
            const auto index = static_cast<std::size_t>(y * Framebuffer::width + x);
            if (z < depth.values[index]) {
                const Vec3 normal = mul3(sub3({rx * z, ry * z, z}, c), 1.0 / r);
                const double intensity = 0.25 + 0.75 * std::max(0.0, dot3(normal, light));
                image.pixels[index] = shade(body.color, intensity);
                depth.values[index] = z;
            }
        }
    }
}

inline void line3D(Framebuffer& image, DepthBuffer& depth, Vec3 a, Vec3 b, const CameraFrame& camera, std::uint32_t color) {
    a = toCamera(a, camera);
    b = toCamera(b, camera);
    if (!finite3(a) || !finite3(b) || a.z <= 0.2 || b.z <= 0.2)
        return;
    const Vec2 pa = projectCamera(a);
    const Vec2 pb = projectCamera(b);
    const double span = std::max(std::abs(pa.x - pb.x), std::abs(pa.y - pb.y));
    if (!std::isfinite(span))
        return;
    const int steps = static_cast<int>(std::clamp(std::ceil(span), 1.0, 2200.0));
    for (int i = 0; i <= steps; ++i) {
        const double t = static_cast<double>(i) / steps;
        const double sx = pa.x + (pb.x - pa.x) * t;
        const double sy = pa.y + (pb.y - pa.y) * t;
        if (sx < 0.0 || sx > 1099.0 || sy < 85.0 || sy > 650.0)
            continue;
        const int x = static_cast<int>(std::lround(sx));
        const int y = static_cast<int>(std::lround(sy));
        const double z = 1.0 / ((1.0 - t) / a.z + t / b.z);
        const auto index = static_cast<std::size_t>(y * 1100 + x);
        if (z <= depth.values[index] + 0.02) {
            image.pixels[index] = color;
        }
    }
}

inline void drawTank3D(Framebuffer& image, DepthBuffer& depth, const Scene& scene) {
    depth.clear();
    const auto camera = makeCamera(scene.camera);
    for (const auto& body : scene.spheres)
        drawSphere(image, depth, body, camera);
    const Vec3 corners[8]{{-8, -5, -6}, {8, -5, -6}, {8, 5, -6}, {-8, 5, -6}, {-8, -5, 6}, {8, -5, 6}, {8, 5, 6}, {-8, 5, 6}};
    const int edges[12][2]{{0, 1}, {1, 2}, {2, 3}, {3, 0}, {4, 5}, {5, 6}, {6, 7}, {7, 4}, {0, 4}, {1, 5}, {2, 6}, {3, 7}};
    for (const auto& edge : edges)
        line3D(image, depth, corners[edge[0]], corners[edge[1]], camera, 0x7187b4ffU);
    for (int x = -6; x <= 6; x += 2)
        line3D(image, depth, {static_cast<double>(x), -5, -6}, {static_cast<double>(x), -5, 6}, camera, 0x273d5fffU);
    for (int z = -4; z <= 4; z += 2)
        line3D(image, depth, {-8, -5, static_cast<double>(z)}, {8, -5, static_cast<double>(z)}, camera, 0x273d5fffU);
    if (scene.debug) {
        for (const auto& contact : scene.sphereStats.debugContacts) {
            line3D(image, depth, contact.point, add3(contact.point, mul3(contact.normal, 0.7)), camera, 0xffe26cffU);
            line3D(image, depth, contact.point, add3(contact.point, mul3(contact.normal, std::min(2.0, contact.impulse * 0.2))), camera, 0xff7b72ffU);
        }
    }
}
#endif
} // namespace lab
