#pragma once

#include <cmath>
#include <limits>

namespace heat {

enum class Boundary {
    Insulated,
    ColdRim
};

// [snippet settings]
struct Settings {
    double diffusivity = 1.5;
    double dt = 1.0 / 30.0;
    double dx = 0.5;
    double dy = 0.5;
    Boundary boundary = Boundary::Insulated;
    bool experiment = false;
};

// [/snippet settings]

struct Stability {
    bool valid = false;
    bool stable = false;
    double rx = 0;
    double ry = 0;
    double sum = 0;
    double maximumDt = 0;
};

// Điều kiện của FTCS này, không phải điều kiện chung cho mọi heat solver.
// [snippet stability]
inline Stability stability(const Settings& settings, bool twoDimensions = true) {
    Stability result;
    if (!std::isfinite(settings.diffusivity) || !std::isfinite(settings.dt) || !std::isfinite(settings.dx) || !std::isfinite(settings.dy)) {
        return result;
    }
    if (settings.diffusivity < 0 || settings.dt <= 0 || settings.dx <= 0 || settings.dy <= 0) {
        return result;
    }
    if (settings.boundary != Boundary::Insulated && settings.boundary != Boundary::ColdRim) {
        return result;
    }
    const double squareDx = settings.dx * settings.dx;
    const double squareDy = settings.dy * settings.dy;
    if (!std::isfinite(squareDx) || !std::isfinite(squareDy) || squareDx <= 0 || squareDy <= 0) {
        return result;
    }
    result.rx = settings.diffusivity * settings.dt / squareDx;
    if (twoDimensions) {
        result.ry = settings.diffusivity * settings.dt / squareDy;
    }
    result.sum = result.rx + result.ry;
    if (!std::isfinite(result.sum)) {
        return result;
    }
    result.valid = true;
    result.stable = result.sum <= 0.5;
    result.maximumDt = std::numeric_limits<double>::infinity();
    if (result.sum > 0) {
        result.maximumDt = settings.dt * (0.5 / result.sum);
    }
    return result;
}

// [/snippet stability]

} // namespace heat
