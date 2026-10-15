#pragma once
#include "model.hpp"

namespace ct {
#if LAB_CHECKPOINT >= 2
struct Beam {
    Point origin;
    Point direction;
    double maximum;
};

// u is a continuous detector coordinate, not an array index.
inline Beam detectorRay(double angle, double u) {
    if (!std::isfinite(angle) || !std::isfinite(u) || u < 0 || u > 1) {
        throw std::invalid_argument("Invalid angle or detector coordinate");
    }
    const Point radial{std::cos(angle), std::sin(angle)};
    const Point tangent{-std::sin(angle), std::cos(angle)};
    const Point source = multiply(radial, sourceRadius);
    const Point detectorCentre = multiply(radial, -detectorRadius);
    const double offset = (u - 0.5) * detectorWidth;
    const Point endpoint = add(detectorCentre, multiply(tangent, offset));
    const Point delta = subtract(endpoint, source);
    const double maximum = length(delta);
    return {source, multiply(delta, 1 / maximum), maximum};
}

inline Point at(const Beam& beam, double distance) {
    return add(beam.origin, multiply(beam.direction, distance));
}

#if LAB_CHECKPOINT >= 3
inline void validateBeam(const Beam& beam) {
    if (!std::isfinite(beam.origin[0]) || !std::isfinite(beam.origin[1]) || !std::isfinite(beam.direction[0]) || !std::isfinite(beam.direction[1]) || std::abs(dot(beam.direction, beam.direction) - 1) > 1e-10 || !std::isfinite(beam.maximum) || beam.maximum <= 0 || beam.maximum > 12) {
        throw std::invalid_argument("Expected a finite, normalized beam");
    }
}

// Intersect a disk with the finite source-to-detector segment.
inline double chordLength(const Beam& beam, const Disk& disk) {
    const Point delta = subtract(disk.centre, beam.origin);
    const double along = dot(delta, beam.direction);
    const double perpendicularSquared = std::max(0.0, dot(delta, delta) - along * along);
    const double halfChordSquared = disk.radius * disk.radius - perpendicularSquared;
    if (halfChordSquared <= 0) {
        return 0;
    }
    const double halfChord = std::sqrt(halfChordSquared);
    const double entry = std::max(0.0, along - halfChord);
    const double exit = std::min(beam.maximum, along + halfChord);
    return std::max(0.0, exit - entry);
}
#endif

#if LAB_CHECKPOINT >= 7
// Project a point onto a flat fan detector; this is not a parallel-beam sine.
inline double pointOffset(double angle, Point point) {
    if (!std::isfinite(angle) || !std::isfinite(point[0]) || !std::isfinite(point[1]) || length(point) > 1.5) {
        throw std::invalid_argument("Point outside supported field of view");
    }
    const Point radial{std::cos(angle), std::sin(angle)};
    const Point tangent{-std::sin(angle), std::cos(angle)};
    const double radialDistance = dot(point, radial);
    const double tangentDistance = dot(point, tangent);
    return (sourceRadius + detectorRadius) * tangentDistance / (sourceRadius - radialDistance);
}
#endif
#endif
} // namespace ct
