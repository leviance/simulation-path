#pragma once
#include "volume.hpp"

namespace fog {
#if LAB_CHECKPOINT >= 5
// Opacity is attached to a segment length, never to a sample alone.
inline double segmentAlpha(double density, double sigma, double ds) {
    return -std::expm1(-sigma * density * ds);
}
#endif

#if LAB_CHECKPOINT >= 6
struct Result {
    Point color{0, 0, 0};
    double transmittance = 1;
    int samples = 0;
};

inline Point transfer([[maybe_unused]] double density, [[maybe_unused]] bool warm) {
#if LAB_CHECKPOINT >= 7
    if (warm) {
        return {0.2 + 0.8 * density, 0.45 + 0.25 * density, 1 - 0.8 * density};
    }
#endif
    return {0.8, 0.9, 1};
}

inline Result march(const Ray& ray, const Volume& volume, Settings settings) {
    validate(settings);
    Result result;
    const auto interval = boxInterval(ray);
    if (!interval) {
        return result;
    }
    const int count = static_cast<int>(std::ceil((interval->exit - interval->entry) / settings.stepLength));
    if (count > maxSteps) {
        throw std::runtime_error("Step budget exceeded: no partial result accepted");
    }

    for (int i = 0; i < count; ++i) {
        const double t = interval->entry + i * settings.stepLength;
        const double ds = std::min(settings.stepLength, interval->exit - t);
        const double density = sampleDensity(volume, at(ray, t + ds / 2));
        const double alpha = segmentAlpha(density, settings.sigma, ds);
        const Point color = transfer(density, settings.warm);
        // The old transmittance weights this segment; update T only afterwards.
        result.color = add(result.color, multiply(color, result.transmittance * alpha));
        result.transmittance *= std::exp(-settings.sigma * density * ds);
        ++result.samples;
#if LAB_CHECKPOINT >= 8
        if (settings.early && result.transmittance <= stopThreshold) {
            break;
        }
#endif
    }
    return result;
}
#endif
} // namespace fog
