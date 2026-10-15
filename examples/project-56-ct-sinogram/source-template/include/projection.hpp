#pragma once
#include "geometry.hpp"

namespace ct {
#if LAB_CHECKPOINT >= 4
struct Measurement {
    double tau = 0;
    double ratio = 1;
    double projection = 0;
};

using Projection = std::array<Measurement, detectorCount>;

// Pure forward model. Overlapping inserts add mu rather than replace it.
inline Measurement measure(const Beam& beam, const Scene& scene, double strength) {
    validateBeam(beam);
    validateScene(scene);
    if (!std::isfinite(strength) || strength < 0 || strength > 2) {
        throw std::invalid_argument("Invalid strength");
    }
    Measurement result;
    for (const auto& disk : scene) {
        result.tau += strength * disk.mu * chordLength(beam, disk);
    }
    result.ratio = std::exp(-result.tau);
    result.projection = -std::log(result.ratio);
    return result;
}

inline Projection project(double angle, const Scene& scene, double strength) {
    Projection row;
    for (int column = 0; column < detectorCount; ++column) {
        const double u = (column + 0.5) / detectorCount;
        row[column] = measure(detectorRay(angle, u), scene, strength);
    }
    return row;
}
#endif
} // namespace ct
