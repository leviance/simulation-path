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
        constexpr std::array<Color, 6> stops{{
            {0.025, 0.035, 0.055},
            {0.10, 0.27, 0.35},
            {0.24, 0.51, 0.52},
            {0.86, 0.67, 0.42},
            {0.98, 0.42, 0.24},
            {1.0, 0.94, 0.78}
        }};
        const double position = t * 5;
        const int lower = std::min(static_cast<int>(position), 4);
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
