#pragma once
#include "model.hpp"
#include <optional>

namespace xray {
#if LAB_CHECKPOINT >= 2
// A finite source-detector segment, not an infinite surface picking ray.
struct Beam {
    Point origin;
    Point direction;
    double maximum = 0;
};

inline void validateBeam(Beam beam) {
    if (!std::isfinite(beam.maximum) || beam.maximum <= 0 || beam.maximum > 20 || std::abs(dot(beam.direction, beam.direction) - 1) > 1e-6) {
        throw std::invalid_argument("Finite unit beam with length <=20 required");
    }
    for (int a = 0; a < 3; ++a) {
        if (!std::isfinite(beam.origin[a]) || !std::isfinite(beam.direction[a])) {
            throw std::invalid_argument("Nonfinite beam");
        }
    }
}

inline Beam detectorRay(double u, double v) {
    if (!std::isfinite(u) || !std::isfinite(v) || u < 0 || u > 1 || v < 0 || v > 1) {
        throw std::invalid_argument("Detector coordinates must be in [0,1]");
    }
    const Point origin{0, 0, -6};
    const Point detector{(u - 0.5) * 6, (0.5 - v) * 4.5, 6};
    const Point delta = subtract(detector, origin);
    const double distance = length(delta);
    return {origin, multiply(delta, 1 / distance), distance};
}

inline Beam objectBeam(Beam beam, double angle) {
    return {rotateY(beam.origin, -angle), rotateY(beam.direction, -angle), beam.maximum};
}

inline Point at(Beam beam, double t) {
    return add(beam.origin, multiply(beam.direction, t));
}
#endif

#if LAB_CHECKPOINT >= 3
struct Interval {
    double entry = 0;
    double exit = 0;
};

inline std::optional<Interval> boxInterval(Beam beam, Point minimum, Point maximum) {
    validateBeam(beam);
    for (int a = 0; a < 3; ++a) {
        if (!std::isfinite(beam.origin[a]) || !std::isfinite(beam.direction[a]) || !std::isfinite(minimum[a]) || !std::isfinite(maximum[a]) || minimum[a] >= maximum[a]) {
            throw std::invalid_argument("Invalid ray or bounds");
        }
    }
    Interval result{0, beam.maximum};
    for (int a = 0; a < 3; ++a) {
        if (beam.direction[a] == 0) {
            if (beam.origin[a] < minimum[a] || beam.origin[a] > maximum[a]) {
                return std::nullopt;
            }
            continue;
        }
        double near = (minimum[a] - beam.origin[a]) / beam.direction[a];
        double far = (maximum[a] - beam.origin[a]) / beam.direction[a];
        if (near > far) {
            std::swap(near, far);
        }
        result.entry = std::max(result.entry, near);
        result.exit = std::min(result.exit, far);
        if (result.entry >= result.exit) {
            return std::nullopt;
        }
    }
    return result;
}
#endif
} // namespace xray
