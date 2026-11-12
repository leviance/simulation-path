#pragma once
#include "bulb_math.hpp"
#include <string>

namespace bulb {

struct Settings {
    int power{8};
    int iterations{18};
    double bailout{8.0};
    int raySteps{192};
    double epsilon{0.00035};
    double normalStep{0.0008};
    double safety{0.55};
    double farBound{32.0};
    int palette{};
    int samples{1};
    bool slice{};
    double sliceY{};
};
constexpr int imageWidth = 960;
constexpr int imageHeight = 540;
constexpr int previewWidth = 120;
constexpr int previewHeight = 68;
constexpr int tileWidth = 32;
constexpr int tileHeight = 16;
constexpr std::uint64_t maximumBatchWork = 4000000;

inline void validate(Settings s) {
    if (s.power < 2 || s.power > 12 || s.iterations < 4 || s.iterations > 24 || s.raySteps < 32 || s.raySteps > 256)
        throw std::invalid_argument("Power 2..12, orbit limit 4..24, ray limit 32..256");
    if (!std::isfinite(s.bailout) || s.bailout < 2.0 || s.bailout > 16.0)
        throw std::invalid_argument("Bailout must be finite and in 2..16");
    if (!std::isfinite(s.epsilon) || s.epsilon < 0.00001 || s.epsilon > 0.01 || !std::isfinite(s.normalStep) || s.normalStep < 0.00002 || s.normalStep > 0.02)
        throw std::invalid_argument("Hit epsilon or normal difference step exceeds the precision policy");
    if (!std::isfinite(s.safety) || s.safety < 0.2 || s.safety > 1.0 || !std::isfinite(s.farBound) || s.farBound < 4.0 || s.farBound > 40.0)
        throw std::invalid_argument("Safety 0.2..1, far bound 4..40 world units");
    if (s.palette < 0 || s.palette > 2 || (s.samples != 1 && s.samples != 4) || !std::isfinite(s.sliceY) || std::abs(s.sliceY) > 2.0)
        throw std::invalid_argument("Invalid palette, sample count or slice plane");
}
inline Settings previewSettings(Settings s) {
    s.iterations = std::min(s.iterations, 8);
    s.raySteps = 40;
    s.epsilon = std::max(s.epsilon, 0.003);
    s.normalStep = std::max(s.normalStep, 0.004);
    s.samples = 1;
    return s;
}
inline std::uint64_t batchBound(Settings s, std::uint64_t pixels, bool detailed) {
    validate(s);
    std::uint64_t fieldCalls = static_cast<std::uint64_t>(s.raySteps) + 1 + 8 + 6;
    if (detailed)
        fieldCalls += 32 + 16 + 4;
    const auto bound = pixels * fieldCalls * static_cast<std::uint64_t>(s.iterations);
    if (pixels > 8160 || bound > maximumBatchWork)
        throw std::invalid_argument("Batch exceeds the four-million orbit-body work limit");
    return bound;
}
inline std::uint64_t bufferBytes(int width, int height) {
    if (width < 1 || height < 1 || width > 1280 || height > 960)
        throw std::invalid_argument("Image dimensions exceed the viewer limit");
    return (static_cast<std::uint64_t>(width) * height + 1) * sizeof(Pixel);
}

} // namespace bulb
