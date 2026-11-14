#pragma once

#include "atom_math.hpp"
#include <string_view>

namespace atom {

enum class Orbital : std::uint32_t {
    s1,
    s2,
    px,
    py,
    pz,
    dz2,
    dxy,
    dx2y2,
    fz3,
    fxyz,
    uniformVolume,
    affineMu
};

struct Preset {
    Orbital id;
    const char* name;
    int n, l;
    float rMax;
};

inline constexpr std::array<Preset, 12> presets{{
    {Orbital::s1, "1s", 1, 0, 12},
    {Orbital::s2, "2s", 2, 0, 32},
    {Orbital::px, "2px", 2, 1, 32},
    {Orbital::py, "2py", 2, 1, 32},
    {Orbital::pz, "2pz", 2, 1, 32},
    {Orbital::dz2, "3dz2", 3, 2, 60},
    {Orbital::dxy, "3dxy", 3, 2, 60},
    {Orbital::dx2y2, "3dx2-y2", 3, 2, 60},
    {Orbital::fz3, "4fz3", 4, 3, 96},
    {Orbital::fxyz, "4fxyz", 4, 3, 96},
    {Orbital::uniformVolume, "uniform-volume", 0, 0, 4},
    {Orbital::affineMu, "affine-mu", 0, 0, 4},
}};
inline constexpr std::size_t physicalPresetCount = 10;

inline const auto& catalog() {
    return presets;
}

inline const Preset& preset(Orbital id) {
    const auto index = static_cast<std::uint32_t>(id);
    if (index >= presets.size())
        throw std::invalid_argument("Orbital is outside the supplied catalog");
    return presets[index];
}

inline Orbital parseOrbital(std::string_view name) {
    for (const auto& entry : presets)
        if (name == entry.name)
            return entry.id;
    throw std::invalid_argument("Unknown orbital name");
}

inline float defaultRadius(Orbital id) {
    return preset(id).rMax;
}

// These normalized hydrogen radial functions are supplied input, not a solver.
// Unit: a0=1. Circular states have n=l+1, so their Laguerre factor is one.
// snippet:atom-radial-field
inline double radialAmplitude(Orbital id, double r) {
    if (!std::isfinite(r) || r < 0)
        throw std::invalid_argument("Radial field needs a finite nonnegative radius");
    const auto& entry = preset(id);
    if (id == Orbital::uniformVolume || id == Orbital::affineMu)
        return 1;
    // Beyond this radius the supplied catalog is far below double precision.
    // Early return also prevents an overflow-times-zero expression at huge r.
    if (r > 1000000)
        return 0;
    if (id == Orbital::s2)
        return (2 - r) * std::exp(-r / 2) / (2 * std::sqrt(2.0));
    double factorial = 1;
    for (int factor = 2; factor <= entry.n + entry.l; ++factor)
        factorial *= factor;
    const double scale = std::pow(2.0 / entry.n, entry.l + 1.5) / std::sqrt(2.0 * entry.n * factorial);
    return scale * std::pow(r, entry.l) * std::exp(-r / entry.n);
}

// end-snippet:atom-radial-field

// Supplied real angular basis; x/y/z are direction cosines. All physical
// entries integrate Y^2 dmu dphi to one over the unit sphere.
// snippet:atom-angular-field
inline double angularAmplitude(Orbital id, double x, double y, double z) {
    preset(id);
    if (!std::isfinite(x) || !std::isfinite(y) || !std::isfinite(z))
        throw std::invalid_argument("Angular field needs finite direction cosines");
    switch (id) {
    case Orbital::s1:
    case Orbital::s2:
    case Orbital::uniformVolume:
        return 1 / std::sqrt(4 * pi);
    case Orbital::px:
        return std::sqrt(3 / (4 * pi)) * x;
    case Orbital::py:
        return std::sqrt(3 / (4 * pi)) * y;
    case Orbital::pz:
        return std::sqrt(3 / (4 * pi)) * z;
    case Orbital::dz2:
        return std::sqrt(5 / (16 * pi)) * (3 * z * z - 1);
    case Orbital::dxy:
        return std::sqrt(15 / (4 * pi)) * x * y;
    case Orbital::dx2y2:
        return std::sqrt(15 / (16 * pi)) * (x * x - y * y);
    case Orbital::fz3:
        return std::sqrt(7 / (16 * pi)) * z * (5 * z * z - 3);
    case Orbital::fxyz:
        return std::sqrt(105 / (4 * pi)) * x * y * z;
    case Orbital::affineMu:
        return std::sqrt(std::max(0.0, 1 + 0.6 * z) / (4 * pi));
    }
    throw std::invalid_argument("Missing angular field");
}

// end-snippet:atom-angular-field

struct DensityValue {
    double density{}, sign{};
};

// A point at r=0 has no unique angular direction. For l>0 its radial factor
// vanishes there, so returning zero avoids division without inventing a node.
// snippet:atom-density
inline DensityValue evaluateDensity(Orbital id, Vec3 point) {
    if (!finite(point))
        throw std::invalid_argument("Density position must be finite");
    const auto& entry = preset(id);
    const double r = std::hypot(static_cast<double>(point.x), static_cast<double>(point.y), static_cast<double>(point.z));
    if (r == 0 && entry.l > 0)
        return {};
    double x = 0, y = 0, z = 1;
    if (r > 0) {
        x = point.x / r;
        y = point.y / r;
        z = point.z / r;
    }
    const double amplitude = radialAmplitude(id, r) * angularAmplitude(id, x, y, z);
    double sign = 0;
    if (amplitude > 0)
        sign = 1;
    if (amplitude < 0)
        sign = -1;
    return {amplitude * amplitude, sign};
}

// end-snippet:atom-density

inline double integerGammaSurvival(int shape, double x) {
    if (shape < 1 || shape > 32 || !std::isfinite(x) || x < 0)
        throw std::invalid_argument("Invalid integer gamma tail input");
    if (x > 10000)
        return 0;
    double term = 1, sum = 1;
    for (int order = 1; order < shape; ++order) {
        term *= x / order;
        sum += term;
    }
    return std::exp(-x) * sum;
}

// For small x, subtracting a tail almost equal to one loses the lower mass.
// This convergent positive series evaluates the lower regularized gamma
// directly. It is independent of the sampler's midpoint/CDF discretization.
inline double integerGammaCdf(int shape, double x) {
    if (shape < 1 || shape > 32 || !std::isfinite(x) || x < 0)
        throw std::invalid_argument("Invalid integer gamma CDF input");
    if (x == 0)
        return 0;
    if (x >= shape + 1)
        return std::clamp(1 - integerGammaSurvival(shape, x), 0.0, 1.0);
    double first = std::exp(-x);
    for (int factor = 1; factor <= shape; ++factor)
        first *= x / factor;
    double term = 1, sum = 1;
    for (int order = 1; order <= 256; ++order) {
        term *= x / (shape + order);
        sum += term;
        if (term <= sum * std::numeric_limits<double>::epsilon())
            break;
    }
    return std::clamp(first * sum, 0.0, 1.0);
}

inline double radialTailExact(Orbital id, double r) {
    if (!std::isfinite(r) || r < 0)
        throw std::invalid_argument("Radial tail needs a finite nonnegative radius");
    const auto& entry = preset(id);
    if (id == Orbital::uniformVolume || id == Orbital::affineMu)
        throw std::invalid_argument("Finite test fields have no hydrogen tail");
    if (r > 1000000)
        return 0;
    if (id == Orbital::s2)
        return std::exp(-r) * (1 + r + r * r / 2 + r * r * r * r / 8);
    return integerGammaSurvival(2 * entry.l + 3, 2 * r / entry.n);
}

// Independent closed-form full-space radial probability. The sampler uses
// midpoint weights; this oracle must not invert or sum its table.
inline double radialCdfExact(Orbital id, double r) {
    if (!std::isfinite(r) || r < 0)
        throw std::invalid_argument("Radial CDF needs a finite nonnegative radius");
    const auto& entry = preset(id);
    if (id == Orbital::uniformVolume || id == Orbital::affineMu)
        throw std::invalid_argument("Test fields require a finite-domain volume reference");
    if (id == Orbital::s2) {
        const double probability = integerGammaCdf(3, r) - 3 * integerGammaCdf(4, r) + 3 * integerGammaCdf(5, r);
        return std::clamp(probability, 0.0, 1.0);
    }
    // Avoid overflowing 2*r for callers outside the interactive domain.
    if (r > 1000000)
        return 1;
    return integerGammaCdf(2 * entry.l + 3, 2 * r / entry.n);
}

} // namespace atom
