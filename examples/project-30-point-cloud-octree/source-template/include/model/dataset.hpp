#pragma once
// Recipe sinh bề mặt căn phòng; cùng seed/count/preset tạo cùng dữ liệu.
#include "geometry.hpp"
#include <vector>

namespace survey {
inline constexpr std::size_t maximumPoints = 200000;

struct Random {
    std::uint32_t state = 30;

    double next() {
        state = state * 1664525U + 1013904223U;
        return double(state) / 4294967296.0;
    }
};

// [snippet:makeRoom]
inline std::vector<Point> makeRoom(std::size_t count, std::uint32_t seed = 30, bool uniform = false) {
    if (count > maximumPoints) {
        throw std::invalid_argument("Point budget exceeded");
    }
    std::vector<Point> points;
    points.reserve(count);
    Random random{seed};
    for (std::size_t index = 0; index < count; ++index) {
        const double a = random.next();
        const double b = random.next();
        const double c = random.next();
        Vec3 p{-12 + 24 * a, 8 * b, -9 + 18 * c};
        if (!uniform) {
            const auto surface = index % 10;
            if (surface == 0 || surface == 1) {
                p.y = 0;
            } else if (surface == 2) {
                p.y = 8;
            } else if (surface == 3) {
                p.x = -12;
            } else if (surface == 4) {
                p.x = 12;
            } else if (surface == 5) {
                p.z = -9;
            } else if (surface == 6) {
                p.z = 9;
            } else if (surface == 7 || surface == 8) {
                // Hai dãy kệ; mặt kệ và các tầng tạo ngữ cảnh nhà xưởng.
                p = {-7 + 14 * a, 1.5 + double(index % 4) * 1.3, -4 + double(index % 2) * 8};
            } else {
                const double angle = a * 6.283185307179586;
                p = {3 + std::cos(angle), 4 * b, 2 + std::sin(angle)};
            }
        }
        points.push_back({static_cast<std::uint32_t>(index), p});
    }
    return points;
}

// [/snippet:makeRoom]

inline Box rootFor(const std::vector<Point>& points) {
    if (points.empty()) {
        return {{-1, -1, -1}, {1, 1, 1}};
    }
    Box bounds{points.front().position, points.front().position};
    for (const Point& point : points) {
        const Vec3 p = point.position;
        bounds.minimum = {std::min(bounds.minimum.x, p.x), std::min(bounds.minimum.y, p.y), std::min(bounds.minimum.z, p.z)};
        bounds.maximum = {std::max(bounds.maximum.x, p.x), std::max(bounds.maximum.y, p.y), std::max(bounds.maximum.z, p.z)};
    }
    const Vec3 center = (bounds.minimum + bounds.maximum) * 0.5;
    const Vec3 extent = bounds.maximum - bounds.minimum;
    const double half = std::max({extent.x, extent.y, extent.z, 1.0}) * 0.5 + 1e-6;
    return around(center, {half, half, half});
}
} // namespace survey
