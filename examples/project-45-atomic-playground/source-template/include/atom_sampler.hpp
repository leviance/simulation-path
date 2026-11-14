#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif

#include "atom_catalog.hpp"
#include <span>
#include <vector>

namespace atom {

enum class SamplingMode : std::uint32_t {
    weighted,
    uniformRadius,
    uniformAngle
};

struct SamplingConfig {
    Orbital orbital{Orbital::pz};
    std::uint32_t seed{12345};
#if LAB_CHECKPOINT >= 5
    std::uint32_t count{1000000};
#else
    std::uint32_t count{16384};
#endif
    std::uint32_t radialBins{2048}, muBins{64}, phiBins{128};
    float radius{32};

    void validate() const {
        preset(orbital);
        const bool invalidCount = count < 1 || count > 5000000;
        const bool invalidRadialGrid = radialBins < 32 || radialBins > 8192;
        const bool invalidAngularGrid = muBins < 8 || muBins > 256 || phiBins < 16 || phiBins > 512;
        const bool invalidRadius = !std::isfinite(radius) || radius < 0.25F || radius > 128;
        if (invalidCount || invalidRadialGrid || invalidAngularGrid || invalidRadius)
            throw std::invalid_argument("Sampling configuration exceeds its finite domain or resource limits");
    }
};

struct SamplingTables {
    SamplingConfig config;
    std::vector<float> radialCdf, angularCdf;
    double radialMass{}, angularMass{}, tailMass{}, radialRoundingError{}, angularRoundingError{};
};

#if LAB_CHECKPOINT >= 2
// snippet:atom-table-normalization
inline double normalizedCdf(std::span<const double> weights, std::vector<float>& cdf, double& roundingError) {
    double total = 0;
    for (const double weight : weights) {
        if (!std::isfinite(weight) || weight < 0)
            throw std::invalid_argument("CDF weights must be finite and nonnegative");
        total += weight;
    }
    if (!std::isfinite(total) || total <= 0)
        throw std::invalid_argument("CDF needs a positive finite mass");
    cdf.assign(weights.size() + 1, 0);
    double prefix = 0;
    roundingError = 0;
    for (std::size_t index = 0; index < weights.size(); ++index) {
        prefix += weights[index];
        const double probability = std::clamp(prefix / total, 0.0, 1.0);
        cdf[index + 1] = static_cast<float>(probability);
        roundingError = std::max(roundingError, std::abs(cdf[index + 1] - probability));
    }
    cdf.back() = 1;
    return total;
}

// end-snippet:atom-table-normalization
#else
inline double normalizedCdf(std::span<const double>, std::vector<float>&, double&) {
    throw std::logic_error("CDF normalization is implemented in lesson 2");
}
#endif

#if LAB_CHECKPOINT >= 2
// CPU table work is small and happens only when the density/table configuration
// changes. It does not generate the million output positions.
// snippet:atom-build-tables
inline SamplingTables buildTables(SamplingConfig config) {
    config.validate();
    SamplingTables tables;
    tables.config = config;
    const double dr = static_cast<double>(config.radius) / config.radialBins;
    const double dmu = 2.0 / config.muBins, dphi = 2 * pi / config.phiBins;
    std::vector<double> radial(config.radialBins), angular(checkedProduct(config.muBins, config.phiBins));
    for (std::uint32_t bin = 0; bin < config.radialBins; ++bin) {
        const double r = (bin + 0.5) * dr;
        const double amplitude = radialAmplitude(config.orbital, r);
        radial[bin] = r * r * amplitude * amplitude * dr;
    }
    for (std::uint32_t muBin = 0; muBin < config.muBins; ++muBin) {
        const double mu = -1 + (muBin + 0.5) * dmu;
        const double sine = std::sqrt(std::max(0.0, 1 - mu * mu));
        for (std::uint32_t phiBin = 0; phiBin < config.phiBins; ++phiBin) {
            const double phi = (phiBin + 0.5) * dphi;
            const double amplitude = angularAmplitude(config.orbital, sine * std::cos(phi), sine * std::sin(phi), mu);
            angular[muBin * config.phiBins + phiBin] = amplitude * amplitude * dmu * dphi;
        }
    }
    tables.radialMass = normalizedCdf(radial, tables.radialCdf, tables.radialRoundingError);
    tables.angularMass = normalizedCdf(angular, tables.angularCdf, tables.angularRoundingError);
    if (config.orbital != Orbital::uniformVolume && config.orbital != Orbital::affineMu)
        tables.tailMass = radialTailExact(config.orbital, config.radius);
    return tables;
}

// end-snippet:atom-build-tables
#else
SamplingTables buildTables(SamplingConfig config);
#endif

#if LAB_CHECKPOINT >= 3
// Counter RNG: each point/dimension owns its variate, so batching and Cancel do
// not change already generated samples. Twenty-three bits keep FLOAT outputs open.
// snippet:atom-rng
inline std::uint32_t mix32(std::uint32_t value) {
    value ^= value >> 16;
    value *= 0x7feb352dU;
    value ^= value >> 15;
    value *= 0x846ca68bU;
    value ^= value >> 16;
    return value;
}

inline float randomOpen(std::uint32_t index, std::uint32_t seed, std::uint32_t dimension) {
    const auto input = seed ^ mix32(index + 0x9e3779b9U) ^ (dimension * 0x85ebca6bU);
    return (static_cast<float>(mix32(input) >> 9) + 0.5F) / 8388608.0F;
}

// end-snippet:atom-rng

// Repeated CDF values are legal zero-probability bins. upper_bound skips them.
// snippet:atom-cdf-invert
inline std::uint32_t invertCdf(std::span<const float> cdf, float probability) {
    if (cdf.size() < 2 || cdf.front() != 0 || cdf.back() != 1 || !std::isfinite(probability) || probability <= 0 || probability >= 1)
        throw std::invalid_argument("CDF inversion requires an open unit variate and endpoint masses");
    const auto found = std::upper_bound(cdf.begin(), cdf.end(), probability);
    const auto bin = static_cast<std::size_t>(found - cdf.begin() - 1);
    if (bin + 1 >= cdf.size() || !(cdf[bin + 1] > cdf[bin]))
        throw std::runtime_error("CDF inversion selected an empty or out-of-bounds bin");
    return static_cast<std::uint32_t>(bin);
}

// end-snippet:atom-cdf-invert
#else
inline std::uint32_t mix32(std::uint32_t) {
    throw std::logic_error("The counter RNG is implemented in lesson 3");
}

inline float randomOpen(std::uint32_t, std::uint32_t, std::uint32_t) {
    throw std::logic_error("Open unit random variates are implemented in lesson 3");
}

inline std::uint32_t invertCdf(std::span<const float>, float) {
    throw std::logic_error("CDF inversion is implemented in lesson 3");
}
#endif

#if LAB_CHECKPOINT >= 3
// This is the CPU reference for small experiments; final cloud generation uses
// sample.comp and the same five random dimensions, not this per-point function.
// snippet:atom-cpu-sample
inline PointRecord sampleCpu(const SamplingTables& tables, std::uint32_t index, SamplingMode mode = SamplingMode::weighted) {
    const auto& config = tables.config;
    if (index >= config.count || static_cast<std::uint32_t>(mode) > 2)
        throw std::invalid_argument("Reference sample index or sandbox mode is invalid");
    const auto radialBin = invertCdf(tables.radialCdf, randomOpen(index, config.seed, 0));
    const auto angularBin = invertCdf(tables.angularCdf, randomOpen(index, config.seed, 2));
    float r = (radialBin + randomOpen(index, config.seed, 1)) * (config.radius / config.radialBins);
    float mu = -1 + 2 * (angularBin / config.phiBins + randomOpen(index, config.seed, 3)) / config.muBins;
    float phi = static_cast<float>(2 * pi) * (angularBin % config.phiBins + randomOpen(index, config.seed, 4)) / config.phiBins;
    if (mode == SamplingMode::uniformRadius)
        r = config.radius * randomOpen(index, config.seed, 0);
    if (mode == SamplingMode::uniformAngle) {
        mu = std::cos(static_cast<float>(pi) * randomOpen(index, config.seed, 3));
        phi = static_cast<float>(2 * pi) * randomOpen(index, config.seed, 4);
    }
    const float sine = std::sqrt(std::max(0.0F, 1 - mu * mu));
    const Vec3 point{r * sine * std::cos(phi), r * sine * std::sin(phi), r * mu};
    const auto field = evaluateDensity(config.orbital, point);
    return {{point.x, point.y, point.z, static_cast<float>(field.density)}, {static_cast<float>(field.sign), 0, 0, 0}};
}

// end-snippet:atom-cpu-sample
#else
PointRecord sampleCpu(const SamplingTables& tables, std::uint32_t index, SamplingMode mode);
#endif

inline double referenceRadialProbability(const SamplingConfig& config, double r) {
    config.validate();
    if (!std::isfinite(r))
        throw std::invalid_argument("Region radius must be finite");
    r = std::clamp(r, 0.0, static_cast<double>(config.radius));
    if (config.orbital == Orbital::uniformVolume || config.orbital == Orbital::affineMu)
        return std::pow(r / config.radius, 3);
    const double retained = radialCdfExact(config.orbital, config.radius);
    if (retained <= 0)
        throw std::invalid_argument("Configured domain has no resolvable radial probability");
    return radialCdfExact(config.orbital, r) / retained;
}

} // namespace atom
