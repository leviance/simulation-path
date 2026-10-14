#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace xray {
// All lengths use arbitrary world units; mu is per world unit, not calibrated data.
using Point = std::array<double, 3>;
constexpr double pi = 3.141592653589793;
constexpr int imageWidth = 80;
constexpr int imageHeight = 60;
constexpr int maxSteps = 512;

inline Point add(Point a, Point b) {
    return {a[0] + b[0], a[1] + b[1], a[2] + b[2]};
}

inline Point subtract(Point a, Point b) {
    return {a[0] - b[0], a[1] - b[1], a[2] - b[2]};
}

inline Point multiply(Point a, double s) {
    return {a[0] * s, a[1] * s, a[2] * s};
}

inline double dot(Point a, Point b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

inline double length(Point a) {
    return std::sqrt(dot(a, a));
}

inline Point rotateY(Point p, double angle) {
    const double c = std::cos(angle);
    const double s = std::sin(angle);
    return {c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]};
}

inline double wrapAngle(double angle) {
    return std::remainder(angle, 2 * pi);
}

struct Settings {
    double angle = 0;
    double strength = 1;
    int preset = 1;
    bool numeric = false;
    double stepLength = 0.1;
    bool logView = false;
    bool invert = false;
    double logRange = 4;
    bool spectral = false;
    double lowWeight = 0.6;
    double exposure = 10000;
};

inline void validate(Settings settings) {
    if (!std::isfinite(settings.angle) || std::abs(settings.angle) > pi || !std::isfinite(settings.strength) || settings.strength < 0 || settings.strength > 3 || settings.preset < 0 || settings.preset > 2) {
        throw std::invalid_argument("Invalid angle, strength or preset");
    }
    if (!std::isfinite(settings.stepLength) || settings.stepLength < 0.05 || settings.stepLength > 0.5 || !std::isfinite(settings.logRange) || settings.logRange < 0.5 || settings.logRange > 12) {
        throw std::invalid_argument("Invalid quality or display range");
    }
    if (!std::isfinite(settings.lowWeight) || settings.lowWeight < 0 || settings.lowWeight > 1 || !std::isfinite(settings.exposure) || settings.exposure < 1000 || settings.exposure > 50000) {
        throw std::invalid_argument("Invalid spectrum or exposure");
    }
}
} // namespace xray
