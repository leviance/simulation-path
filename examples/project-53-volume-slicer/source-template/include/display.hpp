#pragma once
#include "slice.hpp"
#include <cstdint>
#include <cstring>

namespace slice53 {
struct Color { double r; double g; double b; };
struct Window { double level = 0.5; double width = 1.0; };

inline Color mix(Color a, Color b, double t) {
    return {lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t)};
}

#if LAB_CHECKPOINT >= 5
// [snippet window-level]
inline double windowValue(double scalar, Window window) {
    if (!std::isfinite(scalar) || !std::isfinite(window.level) || !std::isfinite(window.width) || window.width <= 0)
        throw std::invalid_argument("Finite scalar and positive window width required");
    const double low = window.level - window.width * 0.5;
    return std::clamp((scalar - low) / window.width, 0.0, 1.0);
}
// [/snippet window-level]
#endif

// [snippet scalar-palette]
inline Color scalarColor(double scalar, Window window, bool colored) {
    double t = std::clamp(scalar, 0.0, 1.0);
#if LAB_CHECKPOINT >= 5
    t = windowValue(scalar, window);
    if (colored) {
        // The transfer table is display only. Never interpolate these colors as volume data.
        constexpr std::array<Color, 11> stops{{
            {0.018, 0.029, 0.048}, // void
            {0.102, 0.118, 0.141},
            {0.235, 0.165, 0.145}, // rough outer rock
            {0.650, 0.415, 0.260},
            {0.202, 0.193, 0.290},
            {0.105, 0.320, 0.411}, // agate bands
            {0.170, 0.613, 0.646},
            {0.550, 0.810, 0.756},
            {0.960, 0.903, 0.725},
            {0.732, 0.574, 0.842}, // crystals
            {0.987, 0.944, 1.000}
        }};
        const double position = t * 10;
        const int lower = std::min(static_cast<int>(position), 9);
        return mix(stops[lower], stops[lower + 1], position - lower);
    }
#else
    (void)window;
    (void)colored;
#endif
    return {t, t, t};
}
// [/snippet scalar-palette]

inline std::uint32_t pack(Color color) {
    if (!std::isfinite(color.r) || !std::isfinite(color.g) || !std::isfinite(color.b))
        throw std::invalid_argument("Nonfinite display color");
    // SDL_PIXELFORMAT_RGBA32 describes these bytes independently of machine endianness.
    std::array<std::uint8_t, 4> bytes{};
    bytes[0] = static_cast<std::uint8_t>(std::clamp(color.r, 0.0, 1.0) * 255);
    bytes[1] = static_cast<std::uint8_t>(std::clamp(color.g, 0.0, 1.0) * 255);
    bytes[2] = static_cast<std::uint8_t>(std::clamp(color.b, 0.0, 1.0) * 255);
    bytes[3] = 255;
    std::uint32_t result = 0;
    std::memcpy(&result, bytes.data(), 4);
    return result;
}

// [snippet color-image]
inline void colorImage(const SliceImage& image, std::vector<std::uint32_t>& rgba, Window window, bool colored) {
    rgba.resize(image.scalar.size());
    for (std::size_t index = 0; index < image.scalar.size(); ++index) {
        const double scalar = image.scalar[index];
        if (!std::isfinite(scalar)) throw std::invalid_argument("Nonfinite slice sample");
        rgba[index] = pack(scalarColor(scalar, window, colored));
    }
}
// [/snippet color-image]
} // namespace slice53
