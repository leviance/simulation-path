#pragma once

#include "diffusion.hpp"
#include "metrics.hpp"
#include <cmath>
#include <limits>
#include <numbers>

namespace heat {

inline double cosineBasis(int x, int y, int width, int height, int modeX, int modeY) {
    const double angleX = std::numbers::pi * modeX * (static_cast<double>(x) + 0.5) / width;
    const double angleY = std::numbers::pi * modeY * (static_cast<double>(y) + 0.5) / height;
    return std::cos(angleX) * std::cos(angleY);
}

inline Field cosineField(int width, int height, int modeX, int modeY) {
    Field field(width, height);
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            field.current[field.index(x, y)] = 0.5 + 0.25 * cosineBasis(x, y, width, height, modeX, modeY);
        }
    }
    return field;
}

// Nghiệm chính xác của scheme, không phải nghiệm PDE liên tục.
inline double discreteAmplification(const Settings& settings, int width, int height, int modeX, int modeY) {
    const double rx = settings.diffusivity * settings.dt / (settings.dx * settings.dx);
    const double ry = settings.diffusivity * settings.dt / (settings.dy * settings.dy);
    const double sineX = std::sin(std::numbers::pi * modeX / (2.0 * width));
    const double sineY = std::sin(std::numbers::pi * modeY / (2.0 * height));
    return 1 - 4 * rx * sineX * sineX - 4 * ry * sineY * sineY;
}

inline double continuousAmplitude(const Settings& settings, int width, int height, int modeX, int modeY, double time) {
    const double waveX = std::numbers::pi * modeX / (width * settings.dx);
    const double waveY = std::numbers::pi * modeY / (height * settings.dy);
    return 0.25 * std::exp(-settings.diffusivity * (waveX * waveX + waveY * waveY) * time);
}

inline double maximumCosineError(const Field& field, double amplitude, int modeX, int modeY) {
    double maximumError = 0;
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const double expected = 0.5 + amplitude * cosineBasis(x, y, field.width, field.height, modeX, modeY);
            if (!std::isfinite(expected) || !std::isfinite(field.current[field.index(x, y)])) {
                return std::numeric_limits<double>::infinity();
            }
            maximumError = std::max(maximumError, std::abs(field.current[field.index(x, y)] - expected));
        }
    }
    return maximumError;
}

} // namespace heat
