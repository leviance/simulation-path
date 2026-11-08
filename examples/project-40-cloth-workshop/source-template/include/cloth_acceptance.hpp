#pragma once

namespace cloth {

// These checks run in an explicitly requested hidden GL context. They are not CTest window tests.
inline int Application::verify() {
#if LAB_CHECKPOINT >= 13
    std::string report{}, error{};
    if (!runGpuFixtures(gl_, directory_, report, error, 15000)) {
        throw std::runtime_error(error);
    }
    std::cout << report << '\n';

    validation_.begin();
    while (validation_.active()) {
        validation_.poll();
        SDL_PumpEvents();
        SDL_Delay(1U);
    }
    if (!validation_.passed()) {
        throw std::runtime_error(validation_.message());
    }
    std::cout << validation_.message() << '\n';

    // Coverage is checked on the actual large workload, not inferred from a successful allocation.
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(45);
    for (const Preset preset : {Preset::Hanging, Preset::SphereDrape, Preset::DropTable}) {
        Settings settings{};
        settings.side = 321U;
        settings = presetSettings(settings, preset);
        if (!gpu_->reset(settings, error)) {
            throw std::runtime_error(error);
        }
        std::uint64_t contactEvents{};
        while (gpu_->stats().steps < 120U) {
            if (std::chrono::steady_clock::now() >= deadline) {
                throw std::runtime_error("Large cloth verification exceeded its 45-second total deadline");
            }
            if (!gpu_->busy() && !gpu_->step(settings, {}, error)) {
                throw std::runtime_error(error);
            }
            while (gpu_->busy()) {
                if (!gpu_->poll(error)) {
                    throw std::runtime_error(error);
                }
                if (std::chrono::steady_clock::now() >= deadline) {
                    throw std::runtime_error("Large cloth verification timed out waiting for a submitted step");
                }
                SDL_PumpEvents();
                SDL_Delay(1U);
            }
            contactEvents += gpu_->stats().analyticContacts;
        }
        const Stats& stats = gpu_->stats();
        const auto& topology = gpu_->topology();
        const auto vertices = static_cast<std::uint32_t>(topology.positions.size());
        const auto expectedVisits = topology.constraints.size() * settings.substeps * settings.iterations;
        if (stats.dynamic < 100000U || stats.updated != vertices - stats.pinned || stats.normals != vertices || stats.countedVertices != vertices || stats.constraints != expectedVisits || stats.invalid != 0U || stats.overflow != 0U || !std::isfinite(stats.maxStretch) || !std::isfinite(stats.maxResidual) || !std::isfinite(stats.totalMs) || stats.totalMs <= 0.0 || stats.maxPenetration > 0.001F) {
            throw std::runtime_error("Large workload has incomplete coverage, invalid state, or excessive final analytic penetration");
        }
        if (preset != Preset::Hanging && contactEvents == 0ULL) {
            throw std::runtime_error("Drape/drop workload never exercised analytic contact");
        }
        ui_.settings = settings;
        framePreset();
        render();
        std::cout << "SCALE COVERAGE PASS preset=" << static_cast<std::uint32_t>(preset)
                << " vertices=" << vertices << " drawn=" << vertices << " triangles=" << topology.indices.size() / 3U
                << " uniqueConstraints=" << topology.constraints.size() << " GPUbytes=" << gpu_->memoryBytes()
                << " hostBytes=" << gpu_->hostMemoryBytes() << " contactEvents=" << contactEvents << '\n';
        printStats();
        std::cout << "PASSES prediction=" << stats.predictionMs << " solver=" << stats.solverMs
                << " grid=" << stats.gridMs << " contact=" << stats.contactMs << " velocity=" << stats.velocityMs
                << " normals=" << stats.normalsMs << " diagnostics=" << stats.diagnosticsMs << " ms\n";
    }
    Settings million = ui_.settings;
    million.side = 1001U;
    const GLuint lastGood = gpu_->positionBuffer();
    if (!gpu_->reset(million, error)) {
        if (gpu_->positionBuffer() != lastGood) {
            throw std::runtime_error("Million preflight destroyed the last-good cloth");
        }
        std::cout << "MILLION EXTENSION REFUSED (not scale PASS): " << error << '\n';
    } else {
        throw std::runtime_error("Million allocation is available but not yet exercised; this extension requires separate evidence");
    }
    std::cout << "Native image quality and mouse/keyboard checks are separate gates; coverage PASS does not prove either.\n";
    return EXIT_SUCCESS;
#else
    throw std::runtime_error("Run --verify on checkpoint 13 or final; earlier lessons intentionally omit later pipeline stages");
#endif
}

} // namespace cloth
