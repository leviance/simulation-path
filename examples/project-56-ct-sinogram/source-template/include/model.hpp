#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <numbers>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif

namespace ct {
constexpr double pi = std::numbers::pi;
constexpr int detectorCount = 128;
constexpr double sourceRadius = 4;
constexpr double detectorRadius = 4;
constexpr double detectorWidth = 8;
using Point = std::array<double, 2>;

// The scanner rotates in XY; only the display reverses the vertical axis.
inline Point add(Point a, Point b) {
    return {a[0] + b[0], a[1] + b[1]};
}

inline Point subtract(Point a, Point b) {
    return {a[0] - b[0], a[1] - b[1]};
}

inline Point multiply(Point a, double scale) {
    return {a[0] * scale, a[1] * scale};
}

inline double dot(Point a, Point b) {
    return a[0] * b[0] + a[1] * b[1];
}

inline double length(Point a) {
    return std::sqrt(dot(a, a));
}

// [snippet annulus]
struct Disk {
    Point centre;
    double radius;
    double mu;
    double innerRadius = 0;
    bool operator==(const Disk&) const = default;
};
// [/snippet annulus]

using Scene = std::vector<Disk>;

struct Settings {
    int preset = 2;
    int views = 180;
    double strength = 1;
    bool operator==(const Settings&) const = default;
};

inline bool supportedViews(int views) {
    return views == 30 || views == 60 || views == 120 || views == 180;
}

inline void validate(Settings settings) {
    if (settings.preset < 0 || settings.preset > 2 || !std::isfinite(settings.strength) || settings.strength < 0 || settings.strength > 2) {
        throw std::invalid_argument("Invalid phantom or strength");
    }
    if (!supportedViews(settings.views)) {
        throw std::invalid_argument("Choose 30, 60, 120 or 180 views");
    }
}

#if LAB_CHECKPOINT >= 1
inline Scene makeScene(int preset) {
    if (preset == 0) {
        return {{{0, 0}, 1, 0.5}};
    }
    if (preset == 1) {
        return {{{0.65, 0.3}, 0.25, 1.2}};
    }
    if (preset != 2) {
        throw std::invalid_argument("Unknown phantom");
    }
    // Một khoanh gỗ: các vòng có bề dày thật. Lõi rỗng lệch trái, mắt gỗ nằm bên phải.
    const Point heart{-0.17, 0.08};
    return {
        {heart, 1.20, 0.24, 0.34}, {heart, 1.24, 0.95, 1.17},
        {heart, 0.58, 0.21, 0.53}, {heart, 0.78, 0.25, 0.72},
        {heart, 1.00, 0.28, 0.94}, {{0.52, -0.33}, 0.23, 0.96},
        {{0.49, -0.30}, 0.11, 0.45}
    };
}

inline void validateScene(const Scene& scene) {
    if (scene.empty() || scene.size() > 16) {
        throw std::invalid_argument("Expected one to sixteen material regions");
    }
    for (const auto& disk : scene) {
        if (!std::isfinite(disk.centre[0]) || !std::isfinite(disk.centre[1]) || !std::isfinite(disk.radius) || !std::isfinite(disk.mu) || !std::isfinite(disk.innerRadius) || disk.radius <= 0 || disk.innerRadius < 0 || disk.innerRadius >= disk.radius || disk.mu < 0 || disk.mu > 2 || length(disk.centre) + disk.radius > 1.5) {
            throw std::invalid_argument("Disk outside the supported field of view");
        }
    }
}

// Ảnh vật mẫu chỉ dành cho ô đối chiếu. Bộ tái dựng không đọc hàm này.
inline double densityAt(const Scene& scene, Point p) {
    double density = 0;
    for (const Disk& layer : scene) {
        const Point offset = subtract(p, layer.centre);
        const double r2 = dot(offset, offset);
        if (r2 >= layer.innerRadius * layer.innerRadius && r2 <= layer.radius * layer.radius) {
            density += layer.mu;
        }
    }
    return density;
}
#endif
} // namespace ct
