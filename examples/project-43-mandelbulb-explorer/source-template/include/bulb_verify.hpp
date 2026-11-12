#pragma once
#include "bulb_app.hpp"
#include "bulb_gpu_probe.hpp"
#include "bulb_reference.hpp"
#include "bulb_trace.hpp"
#include <iostream>
#include <limits>

namespace bulb {

#if LAB_CHECKPOINT >= 6
inline void requireVerification(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error("Verification: " + message);
}

inline void verifyGpuField(GlApi& gl) {
    const float infinity = std::numeric_limits<float>::infinity();
    const std::array<Float4, 19> points{{{0, 0, 0, 0}, {0, 0, 0.25F, 0}, {0, 0, -0.25F, 0}, {1e-8F, 0, 0.25F, 0}, {0, 1e-8F, -0.25F, 0}, {3, 0, 0, 0}, {0, 0, 3, 0}, {0, -3, 0, 0}, {1, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 1, 0}, {0, 0, -1, 0}, {0.1F, 0.1F, 0.1F, 0}, {0.3F, 0.4F, 0.5F, 0}, {-0.25F, 0.1F, 0.2F, 0}, {2, 2, 2, 0}, {-2, 1, 2, 0}, {infinity, 0, 0, 0}, {0, std::numeric_limits<float>::quiet_NaN(), 0, 0}}};
    GpuFieldProbe probe(gl);
    std::size_t tested = 0;
    std::size_t axisMappings = 0;
    for (int power : {2, 6, 8, 10, 12}) {
        for (double bailout : {2.0, 8.0, 16.0}) {
            Settings settings;
            settings.power = power;
            settings.bailout = bailout;
            const auto actual = probe.run(points, settings);
            for (std::size_t index = 0; index < points.size(); ++index) {
                const Vec3 point{points[index].x, points[index].y, points[index].z};
                const auto reference = referenceOrbit(point, settings);
                std::uint32_t expected = 1;
                if (reference.escaped)
                    expected = 0;
                if (reference.invalid)
                    expected = 2;
                const auto context = "power=" + std::to_string(power) + " bailout=" + std::to_string(bailout) + " point=" + std::to_string(index);
                if (finite(point)) {
                    const Vec3 powered{actual[index].surface.x, actual[index].surface.y, actual[index].surface.z};
                    const Vec3 mapping = sphericalPower(point, power);
                    requireVerification(finite(powered) && length(powered - mapping) <= 0.000003 + length(mapping) * 0.00001, "GPU spherical power differs from double mapping: " + context + " actual=" + std::to_string(powered.x) + "," + std::to_string(powered.y) + "," + std::to_string(powered.z) + " expected=" + std::to_string(mapping.x) + "," + std::to_string(mapping.y) + "," + std::to_string(mapping.z));
                }
                // Unit-axis orbits can land exactly on bailout/iteration boundaries.
                // They test the one-step mapping, not numerically unstable long-orbit equality.
                if (index >= 8 && index <= 11) {
                    ++axisMappings;
                    continue;
                }
                requireVerification(actual[index].work.x == expected, "GPU orbit classification differs from independent long-double oracle: " + context + " actual=" + std::to_string(actual[index].work.x) + " expected=" + std::to_string(expected));
                if (reference.invalid)
                    continue;
                requireVerification(actual[index].work.y == static_cast<std::uint32_t>(reference.evaluations), "GPU orbit-body counter differs: " + context);
                const double tolerance = 0.00003 + std::abs(static_cast<double>(reference.distance)) * 0.0002;
                requireVerification(std::isfinite(actual[index].color.x) && std::abs(actual[index].color.x - reference.distance) <= tolerance, "GPU DE outside declared float tolerance: " + context);
                const Vec3 powered{actual[index].surface.x, actual[index].surface.y, actual[index].surface.z};
                const double expectedLength = std::pow(length(point), power);
                requireVerification(finite(powered) && std::abs(length(powered) - expectedLength) <= 0.000003 + expectedLength * 0.00001, "Spherical power failed radial/axis fixture: " + context);
                ++tested;
            }
        }
    }
    std::cout << "GPU FIELD PASS stableOrbits=" << tested << " unitAxisMappings=" << axisMappings << " invalid=30 powers=2,6,8,10,12 bailouts=2,8,16 oddCount=19 canary=ok DEabs=3e-5 DErel=2e-4 longDoubleBits=" << std::numeric_limits<long double>::digits << '\n';
}
#endif

#if LAB_CHECKPOINT >= 9
inline void verifyCompleteImage(App& app) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(10);
    const auto& plan = app.plan();
    requireVerification(app.idle() && plan.active() && plan.complete() && !plan.active()->settings.slice, "Verification requires a complete 960x540 3D image");
    requireVerification(app.gpu().canariesIntact(), "Renderer wrote past a buffer tail");
    const auto snapshot = *plan.active();
    const auto expectedSamples = static_cast<std::uint64_t>(imageWidth) * imageHeight * snapshot.settings.samples;
    std::uint64_t sampleSum = 0, stepSum = 0, orbitSum = 0;
    Counters states;
    for (std::size_t first = 0; first < imageWidth * imageHeight; first += 4096) {
        const auto count = std::min<std::size_t>(4096, imageWidth * imageHeight - first);
        const auto records = app.gpu().readPixels(first, count);
        for (const auto& pixel : records) {
            requireVerification(pixel.work.w == snapshot.generation && pixel.color.w == snapshot.settings.samples, "A pixel is stale, unwritten or has a wrong sample count");
            requireVerification(std::isfinite(pixel.surface.x) && std::isfinite(pixel.surface.y) && std::isfinite(pixel.surface.z) && std::isfinite(pixel.surface.w), "Non-finite surface record");
            const auto maximumPixelWork = static_cast<std::uint64_t>(snapshot.settings.samples) * (snapshot.settings.raySteps + 35) * snapshot.settings.iterations;
            requireVerification(pixel.work.x <= static_cast<std::uint32_t>(snapshot.settings.samples * snapshot.settings.raySteps) && pixel.work.y <= maximumPixelWork, "Pixel exceeded the declared work bounds");
            requireVerification(std::isfinite(pixel.color.x) && std::isfinite(pixel.color.y) && std::isfinite(pixel.color.z) && pixel.color.x >= 0 && pixel.color.y >= 0 && pixel.color.z >= 0, "Non-finite or negative radiance");
            requireVerification(pixel.work.z > 0 && pixel.work.z < 32 && (pixel.work.z & invalidFlag) == 0, "Invalid/unknown stop state in final image");
            sampleSum += static_cast<std::uint64_t>(pixel.color.w);
            stepSum += pixel.work.x;
            orbitSum += pixel.work.y;
            if (snapshot.settings.samples == 1) {
                if (pixel.work.z == hitFlag) {
                    ++states.hits;
                    const double normalLength = length({pixel.surface.y, pixel.surface.z, pixel.surface.w});
                    requireVerification(std::isfinite(pixel.surface.x) && pixel.surface.x >= 0 && std::abs(normalLength - 1) <= 0.001, "Hit lacks finite distance/unit normal");
                } else if (pixel.work.z == missFlag)
                    ++states.misses;
                else if (pixel.work.z == budgetFlag)
                    ++states.budget;
                else if (pixel.work.z == insideFlag)
                    ++states.inside;
                else
                    requireVerification(false, "Single sample has multiple stop reasons");
            }
        }
        requireVerification(std::chrono::steady_clock::now() < deadline, "Image readback exceeded ten-second deadline");
        SDL_Event event;
        while (SDL_PollEvent(&event))
            requireVerification(event.type != SDL_EVENT_QUIT, "Image verification cancelled");
    }
    const auto counters = plan.finalCounters();
    requireVerification(sampleSum == expectedSamples && sampleSum == counters.samples && stepSum == counters.steps && orbitSum == counters.iterations, "Per-pixel work differs from dispatch counters");
    requireVerification(counters.samples == counters.hits + counters.misses + counters.budget + counters.inside + counters.invalid, "Stop counters do not partition actual sample work");
    if (snapshot.settings.samples == 1)
        requireVerification(states.hits == counters.hits && states.misses == counters.misses && states.budget == counters.budget && states.inside == counters.inside, "Pixel stop reasons differ from GPU atomics");
    std::cout << "GPU IMAGE PASS pixels=518400 generation=" << snapshot.generation << " samples=" << sampleSum << " steps=" << stepSum << " orbits=" << orbitSum << " completeReadback=1 canaries=ok\n";
    if (counters.inside > 0) {
        const auto independent = referenceOrbit(snapshot.camera.eye(), snapshot.settings);
        requireVerification(counters.inside == expectedSamples && !independent.invalid && !independent.escaped, "Camera-inside result disagrees with independent capped orbit");
        std::cout << "GPU CAMERA INSIDE PASS: all rays explicitly stopped; this is not a rendered exterior surface.\n";
        return;
    }

    // Slow UNIFORM stepping, independent long-double orbit mapping, no DE-sized jumps.
    // The oracle validates the declared epsilon shell, not infinite fractal membership.
    if (snapshot.settings.samples != 1) {
        std::cout << "RAY ORACLE SKIPPED: use --samples 1 for center-sample ray fixtures; all four-sample pixels/counters were still checked.\n";
        return;
    }
    int compared = 0, hits = 0, misses = 0;
    for (const auto coordinates : std::array<std::array<int, 2>, 9>{{{480, 270}, {400, 260}, {540, 300}, {300, 120}, {680, 400}, {0, 0}, {959, 539}, {480, 90}, {350, 350}}}) {
        const int x = coordinates[0], y = coordinates[1];
        const auto pixel = app.gpu().readPixels(static_cast<std::size_t>(y) * imageWidth + x, 1).front();
        if (pixel.work.z == budgetFlag || pixel.work.z == insideFlag)
            continue;
        const auto ray = snapshot.camera.ray(x + 0.5, y + 0.5, imageWidth, imageHeight);
        const auto reference = referenceRay(snapshot.camera.eye(), ray, snapshot.settings, 0.0005);
        std::cout << "GPU RAY x=" << x << " y=" << y << " state=" << pixel.work.z << " t=" << pixel.surface.x << " reference=" << reference.t << " hit=" << reference.hit << '\n';
        requireVerification((pixel.work.z == hitFlag) == reference.hit, "GPU silhouette differs from uniform epsilon-shell oracle");
        if (reference.hit) {
            requireVerification(std::abs(pixel.surface.x - reference.t) <= 0.006, "GPU ray hit differs by more than 0.006 world units");
            ++hits;
        } else
            ++misses;
        ++compared;
        requireVerification(std::chrono::steady_clock::now() < deadline, "Independent ray fixtures exceeded ten-second deadline");
    }
    requireVerification(compared >= 5, "Too many reference rays exhausted the work budget");
    std::cout << "GPU RAY PASS compared=" << compared << " hits=" << hits << " misses=" << misses << " uniformStep=0.0005 absoluteT=0.006 shellEpsilon=" << snapshot.settings.epsilon << " finiteOrbitLimit=" << snapshot.settings.iterations << '\n';
}
#endif

} // namespace bulb
