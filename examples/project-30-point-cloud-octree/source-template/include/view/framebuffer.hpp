#pragma once
// CPU depth buffer cho point cloud; tie theo ID để hai thứ tự traversal cho cùng ảnh.
#include "camera.hpp"
#include "model/dataset.hpp"
#include <limits>
#include <vector>

namespace survey {
struct Framebuffer {
    int width{};
    int height{};
    std::vector<std::uint32_t> pixels;
    std::vector<double> depths;
    std::vector<std::uint32_t> owners;

    Framebuffer(int w, int h)
        : width(w), height(h) {
        if (w < 1 || h < 1 || w > 2048 || h > 1536) {
            throw std::invalid_argument("Framebuffer budget exceeded");
        }
        const auto count = std::size_t(w) * std::size_t(h);
        pixels.resize(count);
        depths.resize(count);
        owners.resize(count);
        clear();
    }

    void clear() {
        std::fill(pixels.begin(), pixels.end(), 0x101923ffU);
        std::fill(depths.begin(), depths.end(), std::numeric_limits<double>::infinity());
        std::fill(owners.begin(), owners.end(), std::numeric_limits<std::uint32_t>::max());
    }

    // [snippet:plot]
    void plot(int x, int y, double depth, std::uint32_t id, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        const auto index = std::size_t(y) * std::size_t(width) + std::size_t(x);
        if (depth < depths[index] || (depth == depths[index] && id < owners[index])) {
            depths[index] = depth;
            owners[index] = id;
            pixels[index] = color;
        }
    }

    // [/snippet:plot]

    void overlay(int x, int y, std::uint32_t color) {
        if (x >= 0 && y >= 0 && x < width && y < height) {
            pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
        }
    }
};

inline void segment(Framebuffer& image, const Lens& lens, Vec3 a, Vec3 b, std::uint32_t color) {
    for (const Plane& plane : lens.frustum.planes) {
        const double first = signedDistance(plane, a);
        const double second = signedDistance(plane, b);
        if (first < 0 && second < 0) {
            return;
        }
        if (first < 0 || second < 0) {
            const Vec3 hit = a + (b - a) * (first / (first - second));
            if (first < 0) {
                a = hit;
            } else {
                b = hit;
            }
        }
    }
    const Projection start = project(a, lens);
    const Projection end = project(b, lens);
    if (!start.visible || !end.visible) {
        return;
    }
    const int steps = std::max(1, int(std::ceil(std::max(std::abs(end.x - start.x), std::abs(end.y - start.y)))));
    for (int step = 0; step <= steps; ++step) {
        const double t = double(step) / double(steps);
        image.overlay(int(std::lround(start.x + (end.x - start.x) * t)), int(std::lround(start.y + (end.y - start.y) * t)), color);
    }
}

inline void wireBox(Framebuffer& image, const Lens& lens, Box box, std::uint32_t color) {
    std::array<Vec3, 8> corners{};
    for (std::size_t i = 0; i < 8; ++i) {
        corners[i] = box.minimum;
        if (i & 1) {
            corners[i].x = box.maximum.x;
        }
        if (i & 2) {
            corners[i].y = box.maximum.y;
        }
        if (i & 4) {
            corners[i].z = box.maximum.z;
        }
    }
    for (std::size_t i = 0; i < 8; ++i) {
        for (std::size_t axis = 1; axis <= 4; axis *= 2) {
            if (!(i & axis)) {
                segment(image, lens, corners[i], corners[i | axis], color);
            }
        }
    }
}
} // namespace survey
