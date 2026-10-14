#pragma once
#include "renderer.hpp"
#include <iostream>

namespace fog {
#if LAB_CHECKPOINT >= 9
// Read only a 16x12 target. Compare linear C/T, not the gamma-encoded screen image.
inline void verifyGpu(GlApi& gl, Renderer& renderer) {
    const auto started = SDL_GetTicks();
    double maximumError = 0;
    int comparisons = 0;
    Volume volume;

    // Each dataset is uploaded once; verify only a few pixel centres per view.
    for (int preset = 0; preset < 3; ++preset) {
        fillVolume(volume, preset);
        renderer.upload(gl, volume);
        for (bool inside : {false, true}) {
            Camera camera;
            camera.inside = inside;
            // Small, explicit cases cover each shader option without growing the target.
            const std::array cases{
                Settings{2, 0.04, true, false},
                Settings{2, 0.17, true, false},
                Settings{0, 0.17, false, false},
                Settings{2, 0.17, false, false},
                Settings{8, 0.04, true, true},
                Settings{8, 0.17, false, true}};
            for (const auto settings : cases) {
                renderer.render(gl, camera, settings);
                gl.BindFramebuffer(GL_FRAMEBUFFER, renderer.framebuffer);
                for (const auto& pixel : {std::array{7, 5}, std::array{0, 0}, std::array{15, 11}, std::array{12, 8}}) {
                    float actual[4]{};
                    gl.ReadPixels(pixel[0], pixel[1], 1, 1, GL_RGBA, GL_FLOAT, actual);

                    // GL y increases upwards, whereas cameraRay accepts top-down v.
                    const auto ray = cameraRay(camera, (pixel[0] + 0.5) / renderer.width, 1 - (pixel[1] + 0.5) / renderer.height, static_cast<double>(renderer.width) / renderer.height);
                    const auto expected = march(ray, volume, settings);
                    const std::array<double, 4> reference{expected.color[0], expected.color[1], expected.color[2], expected.transmittance};
                    for (int component = 0; component < 4; ++component) {
                        const double error = std::abs(actual[component] - reference[component]);
                        if (!std::isfinite(actual[component]) || error > 0.0025) {
                            throw std::runtime_error("GPU C/T differs from CPU oracle");
                        }
                        maximumError = std::max(maximumError, error);
                        ++comparisons;
                    }
                    if (SDL_GetTicks() - started > 10000) {
                        throw std::runtime_error("GPU verify total timeout");
                    }
                }
                gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
            }
        }
    }
    if (gl.GetError() != GL_NO_ERROR) {
        throw std::runtime_error("GPU verify GL error");
    }
    std::cout << "GPU verify PASS components=" << comparisons << " maximum error=" << maximumError << '\n';
}
#endif
} // namespace fog
