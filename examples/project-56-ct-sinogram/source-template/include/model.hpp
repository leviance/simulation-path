#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <numbers>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
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

struct Disk {
    Point centre;
    double radius;
    double mu;
    bool operator==(const Disk&) const = default;
};

using Scene = std::vector<Disk>;

struct Settings {
    int preset = 2;
    int views = 120;
    double strength = 1;
    bool operator==(const Settings&) const = default;
};

inline void validate(Settings settings) {
    if (settings.preset < 0 || settings.preset > 2 || !std::isfinite(settings.strength) || settings.strength < 0 || settings.strength > 2) {
        throw std::invalid_argument("Invalid phantom or strength");
    }
    if (settings.views != 30 && settings.views != 60 && settings.views != 120) {
        throw std::invalid_argument("Views must be 30, 60 or 120");
    }
}

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
    const Disk background{{0, 0}, 1.1, 0.25};
    const Disk upperInsert{{0.45, 0.25}, 0.32, 0.9};
    const Disk lowerInsert{{-0.5, -0.3}, 0.22, 1.4};
    return {background, upperInsert, lowerInsert};
}

inline void validateScene(const Scene& scene) {
    if (scene.empty() || scene.size() > 3) {
        throw std::invalid_argument("Use one to three additive disks");
    }
    for (const auto& disk : scene) {
        if (!std::isfinite(disk.centre[0]) || !std::isfinite(disk.centre[1]) || !std::isfinite(disk.radius) || !std::isfinite(disk.mu) || disk.radius <= 0 || disk.mu < 0 || disk.mu > 2 || length(disk.centre) + disk.radius > 1.5) {
            throw std::invalid_argument("Disk outside the supported field of view");
        }
    }
}
} // namespace ct
