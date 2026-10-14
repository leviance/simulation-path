#pragma once
#include "materials.hpp"

namespace xray {
#if LAB_CHECKPOINT >= 4
// Optical depth and detector intensity are separate from byte-level display.
struct Depth {
    double low = 0;
    double high = 0;
    int samples = 0;
};

inline Depth exactDepth(Beam beam, const Scene& scene, double strength) {
    Depth depth;
    for (const auto& material : scene) {
        const double distance = materialLength(beam, material);
        depth.low += strength * material.muLow * distance;
        depth.high += strength * material.muHigh * distance;
    }
    return depth;
}
#endif

#if LAB_CHECKPOINT >= 5
inline Depth midpointDepth(Beam beam, const Scene& scene, double strength, double stepLength) {
    validateBeam(beam);
    if (!std::isfinite(stepLength) || stepLength < 0.05 || stepLength > 0.5) {
        throw std::invalid_argument("Step length must be 0.05..0.5");
    }
    const int count = static_cast<int>(std::ceil(beam.maximum / stepLength));
    if (count > maxSteps) {
        throw std::runtime_error("Sample budget exceeded");
    }
    Depth depth;
    for (int i = 0; i < count; ++i) {
        const double t = i * stepLength;
        const double ds = std::min(stepLength, beam.maximum - t);
        const Point point = at(beam, t + ds / 2);
        for (const auto& material : scene) {
            if (contains(material, point)) {
                depth.low += strength * material.muLow * ds;
                depth.high += strength * material.muHigh * ds;
            }
        }
        ++depth.samples;
    }
    return depth;
}
#endif

#if LAB_CHECKPOINT >= 4
inline double transmission(Depth depth, [[maybe_unused]] Settings settings) {
#if LAB_CHECKPOINT >= 7
    if (settings.spectral) {
        return settings.lowWeight * std::exp(-depth.low) + (1 - settings.lowWeight) * std::exp(-depth.high);
    }
#endif
    return std::exp(-depth.low);
}

struct Measurement {
    Depth depth;
    double ratio = 1;
    double intensity = 0;
    double logProjection = 0;
    bool logClamped = false;
};

inline Measurement measure(Beam beam, const Scene& scene, Settings settings) {
    validate(settings);
    validateScene(scene);
    validateBeam(beam);
    const Beam local = objectBeam(beam, settings.angle);
    Depth depth;
#if LAB_CHECKPOINT >= 5
    if (settings.numeric) {
        depth = midpointDepth(local, scene, settings.strength, settings.stepLength);
    } else {
        depth = exactDepth(local, scene, settings.strength);
    }
#else
    depth = exactDepth(local, scene, settings.strength);
#endif
    const double ratio = transmission(depth, settings);
    double logProjection = 0;
    bool logClamped = false;
#if LAB_CHECKPOINT >= 6
    // Store the actual ratio. The floor applies only to the logarithm.
    const double safeRatio = std::max(ratio, 1e-12);
    logProjection = -std::log(safeRatio);
    logClamped = ratio < 1e-12;
#endif
    return {depth, ratio, settings.exposure * ratio, logProjection, logClamped};
}
#endif
} // namespace xray
