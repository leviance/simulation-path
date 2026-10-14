#pragma once
#include "projection.hpp"
#include <cstdint>

namespace xray {
#if LAB_CHECKPOINT >= 1
// RGBA32 is four bytes in R/G/B/A order, independent of uint32 packing.
struct Image {
    std::array<std::uint8_t, imageWidth * imageHeight * 4> rgba{};
};
#if LAB_CHECKPOINT >= 3
inline double brightness(int x, int y, const Settings& settings, const Scene& scene) {
#else
inline double brightness(int x, int y, [[maybe_unused]] const Settings& settings) {
#endif
#if LAB_CHECKPOINT == 1
    if (x >= 25 && x < 55 && y >= 18 && y < 42) {
        return 0.35;
    }
    return 1;
#endif
#if LAB_CHECKPOINT == 2
    const auto beam = detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight);
    return std::clamp(0.5 + beam.direction[0], 0.0, 1.0);
#endif
#if LAB_CHECKPOINT == 3
    const auto beam = objectBeam(detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight), settings.angle);
    return std::clamp(materialLength(beam, scene[0]) / 4, 0.0, 1.0);
#endif
#if LAB_CHECKPOINT >= 4
    const auto result = measure(detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight), scene, settings);
    double value = result.ratio;
#if LAB_CHECKPOINT >= 6
    if (settings.logView) {
        value = result.logProjection / settings.logRange;
    }
    value = std::clamp(value, 0.0, 1.0);
    if (settings.invert) {
        value = 1 - value;
    }
#endif
    return value;
#endif
}

inline Image makeImage(Settings settings) {
    validate(settings);
    Image image;
#if LAB_CHECKPOINT >= 3
    const auto scene = makeScene(settings.preset);
#endif
    for (int y = 0; y < imageHeight; ++y) {
        for (int x = 0; x < imageWidth; ++x) {
#if LAB_CHECKPOINT >= 3
            const double value = brightness(x, y, settings, scene);
#else
            const double value = brightness(x, y, settings);
#endif
            const auto gray = static_cast<std::uint8_t>(std::floor(std::clamp(value, 0.0, 1.0) * 255 + 0.5));
            const int offset = 4 * (x + imageWidth * y);
            image.rgba[offset] = gray;
            image.rgba[offset + 1] = gray;
            image.rgba[offset + 2] = gray;
            image.rgba[offset + 3] = 255;
        }
    }
    return image;
}
#endif
} // namespace xray
