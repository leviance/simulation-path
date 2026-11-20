#pragma once
#include "volume.hpp"

namespace volume54 {
inline double classifiedDensity(double density, double cutoff) {
    return std::clamp((density - cutoff) / (1 - cutoff), 0.0, 1.0);
}

inline Vec3 transferColor(double density, int palette) {
#if LAB_CHECKPOINT >= 7
    // [snippet transfer-color]
    constexpr std::array<Vec3, 5> warm{{{0.38, 0.49, 0.58}, {0.65, 0.72, 0.77}, {0.82, 0.86, 0.89}, {0.95, 0.96, 0.96}, {1, 0.98, 0.94}}};
    constexpr std::array<Vec3, 5> cool{{{0.07, 0.16, 0.24}, {0.08, 0.49, 0.57}, {0.35, 0.78, 0.74}, {1, 0.55, 0.22}, {1, 0.92, 0.72}}};
    if (palette == 2)
        return {1, 1, 1};
    const double position = std::clamp(density, 0.0, 1.0) * 4;
    const int first = std::min(3, static_cast<int>(position));
    const double fraction = position - first;
    const auto* colors = &warm;
    if (palette == 1)
        colors = &cool;
    return (*colors)[first] * (1 - fraction) + (*colors)[first + 1] * fraction;
    // [/snippet transfer-color]
#else
    (void)density;
    (void)palette;
    return {1, 1, 1};
#endif
}

#if LAB_CHECKPOINT >= 7
// Optional local gradient lighting, NOT a scattering/shadow solver.
// [snippet gradient-light]
inline Vec3 litColor(const Volume& volume, Vec3 point, double density, Settings settings) {
    Vec3 color = transferColor(density, settings.palette);
    if (!settings.lighting)
        return color;
    const double h = volume.spacing();
    Vec3 gradient;
    for (int axis = 0; axis < 3; ++axis) {
        Vec3 offset;
        offset[axis] = h;
        gradient[axis] = (sampleDensity(volume, point + offset) - sampleDensity(volume, point - offset)) / (2 * h);
    }
    if (dot(gradient, gradient) < 1e-6)
        return color;
    const Vec3 normal = unit(gradient * -1);
    const Vec3 light = unit({-0.6, 0.8, 0.5});
    const double diffuse = std::max(0.0, dot(normal, light));
    return color * (0.55 + 0.45 * diffuse);
}

// [/snippet gradient-light]
#endif

#if LAB_CHECKPOINT >= 6
// [snippet segment-alpha]
inline double segmentAlpha(double density, double sigma, double ds) {
    if (!std::isfinite(density) || !std::isfinite(sigma) || !std::isfinite(ds) || density < 0 || sigma < 0 || ds <= 0)
        throw std::invalid_argument("Finite nonnegative coefficients and positive segment length required");
    return -std::expm1(-sigma * density * ds);
}

// [/snippet segment-alpha]
#endif

struct Sample {
    double distance = 0;
    double ds = 0;
    double raw = 0;
    double density = 0;
    double transmittance = 1;
    double maximum = 0;
    double mean = 0;
};

struct Result {
    Vec3 color;
    double transmittance = 1;
    double maximum = 0;
    double mean = 0;
    double length = 0;
    int samples = 0;
    std::vector<Sample> profile;
};

#if LAB_CHECKPOINT >= 5
// [snippet integrate-projection]
inline Result integrate(const Ray& ray, const Volume& volume, Settings settings, double stepLength, int budget, bool record) {
    if (!std::isfinite(stepLength) || stepLength <= 0 || budget < 1 || budget > 4096)
        throw std::invalid_argument("Invalid reference integration budget");
    Result result;
    const auto interval = boxInterval(ray);
    if (!interval)
        return result;
    result.length = interval->exit - interval->entry;
    const double required = std::ceil(result.length / stepLength);
    if (!std::isfinite(required) || required < 1 || required > budget)
        throw std::runtime_error("Ray sample budget exceeded; no partial image accepted");
    const int count = static_cast<int>(required);
    double weightedSum = 0;
    double coveredLength = 0;

    // [snippet projection-loop]
    for (int i = 0; i < count; ++i) {
        const double start = interval->entry + i * stepLength;
        const double ds = std::min(stepLength, interval->exit - start);
        const double distance = start + 0.5 * ds;
        const double raw = sampleDensity(volume, rayAt(ray, distance));
        const double density = classifiedDensity(raw, settings.cutoff);
        result.maximum = std::max(result.maximum, density);
        weightedSum += density * ds;
        coveredLength += ds;
        ++result.samples;
        // [/snippet projection-loop]
#if LAB_CHECKPOINT >= 6
        // [snippet alpha-loop]
        if (settings.mode == Mode::Alpha) {
            const double alpha = segmentAlpha(density, settings.sigma, ds);
            Vec3 color = transferColor(density, settings.palette);
#if LAB_CHECKPOINT >= 7
            color = litColor(volume, rayAt(ray, distance), density, settings);
#endif
            result.color = result.color + color * (result.transmittance * alpha);
            result.transmittance *= std::exp(-settings.sigma * density * ds);
        }
        // [/snippet alpha-loop]
#endif
#if LAB_CHECKPOINT >= 8
        if (record)
            result.profile.push_back({distance, ds, raw, density, result.transmittance, result.maximum, weightedSum / coveredLength});
#else
        (void)record;
#endif
#if LAB_CHECKPOINT >= 9
        if (settings.mode == Mode::Alpha && settings.early && result.transmittance <= stopThreshold)
            break;
#endif
    }
    result.mean = weightedSum / result.length;
    return result;
}

// [/snippet integrate-projection]

inline Result march(const Ray& ray, const Volume& volume, Settings settings, bool record = false) {
    validate(settings);
    return integrate(ray, volume, settings, settings.stepLength, maxSteps, record);
}

// Raw projection scalars are NOT optical transmittance. W=1 is unused in these two modes.
inline std::array<double, 4> rawOutput(const Result& result, Mode mode) {
    if (mode == Mode::Mip)
        return {result.maximum, result.maximum, result.maximum, 1};
    if (mode == Mode::Average)
        return {result.mean, result.mean, result.mean, 1};
    return {result.color.x, result.color.y, result.color.z, result.transmittance};
}
#endif
} // namespace volume54
