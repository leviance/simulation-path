#pragma once
#include "renderer.hpp"
#include <iostream>

namespace volume54 {
#if LAB_CHECKPOINT >= 10
// The small oracle target is for correctness only; it is not the final viewport.
// [snippet verify-gpu]
inline void verifyGpu(Renderer& renderer) {
    const Uint64 started = SDL_GetTicks();
    renderer.resize(24, 18);
    double maximumError = 0;
    std::size_t comparisons = 0;
    for (Preset preset : {Preset::Cloud, Preset::Cores, Preset::Slab, Preset::Constant, Preset::Ramp, Preset::Empty}) {
        const Volume volume = buildVolume(preset, 128);
        renderer.upload(volume);
        for (bool inside : {false, true}) {
            Camera camera;
            camera.inside = inside;
            for (Mode mode : {Mode::Mip, Mode::Average, Mode::Alpha}) {
                for (double step : {0.02, 0.13}) {
                    Settings settings;
                    settings.mode = mode;
                    settings.stepLength = step;
                    renderer.render(camera, settings);
                    const auto image = renderer.read();
                    for (const auto& pixel : {std::array{12, 9}, std::array{0, 0}, std::array{23, 17}, std::array{8, 11}, std::array{16, 6}}) {
                        const Ray ray = cameraRay(camera, (pixel[0] + 0.5) / 24, 1 - (pixel[1] + 0.5) / 18, 24.0 / 18);
                        const auto expected = rawOutput(march(ray, volume, settings), mode);
                        const std::size_t address = static_cast<std::size_t>(pixel[0] + pixel[1] * 24) * 4;
                        for (int component = 0; component < 4; ++component) {
                            // [snippet gpu-component]
                            const double actual = image[address + component];
                            const double error = std::abs(actual - expected[component]);
                            if (!std::isfinite(actual) || error > 0.0025)
                                throw std::runtime_error("GPU raw mode result differs from CPU oracle");
                            maximumError = std::max(maximumError, error);
                            ++comparisons;
                            // [/snippet gpu-component]
                        }
                    }
                    if (SDL_GetTicks() - started > 20000)
                        throw std::runtime_error("GPU correctness budget exceeded 20 seconds");
                }
            }
        }
    }
    // Transparent extinction, classification, palette and alpha-only early termination.
    const Volume constant = buildVolume(Preset::Constant, 128);
    renderer.upload(constant);
    for (const Settings settings : {Settings{Mode::Alpha, 0.13, 0, 0, 2, false}, Settings{Mode::Alpha, 0.008, 12, 0, 1, true}, Settings{Mode::Average, 0.13, 6, 0.2, 0, true}}) {
        renderer.render({}, settings);
        const auto image = renderer.read();
        const Ray ray = cameraRay({}, 12.5 / 24, 1 - 9.5 / 18, 24.0 / 18);
        const auto expected = rawOutput(march(ray, constant, settings), settings.mode);
        for (int component = 0; component < 4; ++component) {
            const double error = std::abs(image[(12 + 9 * 24) * 4 + component] - expected[component]);
            if (!std::isfinite(error) || error > 0.0025)
                throw std::runtime_error("GPU option correctness failed");
            maximumError = std::max(maximumError, error);
            ++comparisons;
        }
    }
    std::cout << "GPU VERIFY PASS: N=128^3, comparisons=" << comparisons << " maxRawError=" << maximumError << " seconds=" << (SDL_GetTicks() - started) / 1000.0 << '\n';
}

// [/snippet verify-gpu]
#endif
} // namespace volume54
