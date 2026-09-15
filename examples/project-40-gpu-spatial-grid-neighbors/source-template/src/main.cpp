#include "gl_api.hpp"
#include "gpu_grid_engine.hpp"
#include "grid_math.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <filesystem>
#include <iostream>
#include <numeric>
#include <string>
#include <utility>
#include <vector>

namespace {

constexpr int kInitialWidth = 1'120;
constexpr int kInitialHeight = 700;
constexpr std::array<std::size_t, 4> kCountPresets = {
    1'024U,
    65'537U,
    262'147U,
    1'000'003U,
};
constexpr std::array<float, 4> kCellSizePresets = {4.0F, 8.0F, 16.0F, 32.0F};
#if LAB_CHECKPOINT >= 8
constexpr std::size_t kBenchmarkSampleCount = 9U;
constexpr std::uint64_t kBenchmarkTimeoutNanoseconds = 10'000'000'000ULL;
#endif

bool requestOpenGl43Core() {
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) {
        return false;
    }
    return SDL_GL_SetAttribute(SDL_GL_ACCELERATED_VISUAL, 1);
}

std::filesystem::path shaderDirectory() {
#ifdef COURSE_SHADER_DIRECTORY
    const std::filesystem::path sourcePath = std::filesystem::path(COURSE_SHADER_DIRECTORY);
    std::error_code error{};
    if (std::filesystem::is_directory(sourcePath, error) && !error) {
        return sourcePath;
    }
#endif
    const char* basePath = SDL_GetBasePath();
    if (basePath) {
        return std::filesystem::path(basePath) / "shaders";
    }
    return std::filesystem::path("shaders");
}

void destroyWindowAndContext(SDL_Window* window, SDL_GLContext context) {
    if (context) {
        SDL_GL_DestroyContext(context);
    }
    SDL_DestroyWindow(window);
    SDL_Quit();
}

void fillRectangle(
    lab::GlApi& gl,
    int x,
    int y,
    int width,
    int height,
    float red,
    float green,
    float blue
) {
    if (width <= 0 || height <= 0) {
        return;
    }
    gl.Scissor(x, y, width, height);
    gl.ClearColor(red, green, blue, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);
}

std::uint32_t maximumCount(const std::vector<std::uint32_t>& counts) {
    std::uint32_t maximum = 0U;
    for (std::uint32_t count : counts) {
        maximum = std::max(maximum, count);
    }
    return maximum;
}

void drawPassTrace(
    lab::GlApi& gl,
    const std::vector<lab::PassRecord>& passes,
    int width,
    int height
) {
    if (passes.empty()) {
        return;
    }
    const int left = 44;
    const int available = std::max(1, width - left * 2);
    const int gap = 5;
    const int boxWidth = std::max(8, (available - gap * static_cast<int>(passes.size() - 1U)) / static_cast<int>(passes.size()));
    for (std::size_t index = 0; index < passes.size(); ++index) {
        float red = 0.38F;
        float green = 0.68F;
        float blue = 0.94F;
        if (passes[index].label == "scatter") {
            red = 0.78F;
            green = 0.47F;
            blue = 0.87F;
        }
        if (passes[index].label == "neighbors") {
            red = 0.56F;
            green = 0.76F;
            blue = 0.36F;
        }
        const int x = left + static_cast<int>(index) * (boxWidth + gap);
        fillRectangle(gl, x, height - 64, boxWidth, 22, red, green, blue);
    }
}

void drawOccupancyHeatmap(
    lab::GlApi& gl,
    const lab::GridSpec& spec,
    const std::vector<std::uint32_t>& counts,
    const std::vector<lab::PassRecord>& passes,
    int width,
    int height
) {
    gl.Viewport(0, 0, width, height);
    gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);
    gl.Enable(GL_SCISSOR_TEST);

    const std::uint32_t drawColumns = std::min(spec.columns, 64U);
    const std::uint32_t drawRows = std::min(spec.rows, 36U);
    const int left = 44;
    const int bottom = 44;
    const int chartWidth = std::max(1, width - left * 2);
    const int chartHeight = std::max(1, height - 150);
    const std::uint32_t maximum = std::max(1U, maximumCount(counts));
    for (std::uint32_t drawRow = 0; drawRow < drawRows; ++drawRow) {
        for (std::uint32_t drawColumn = 0; drawColumn < drawColumns; ++drawColumn) {
            const std::uint32_t sourceColumn = drawColumn * spec.columns / drawColumns;
            const std::uint32_t sourceRow = drawRow * spec.rows / drawRows;
            const std::size_t cell = std::size_t(sourceRow) * spec.columns + sourceColumn;
            std::uint32_t count = 0U;
            if (cell < counts.size()) {
                count = counts[cell];
            }
            const float occupancy = static_cast<float>(count) / static_cast<float>(maximum);
            const int x0 = left + static_cast<int>(drawColumn) * chartWidth / static_cast<int>(drawColumns);
            const int x1 = left + static_cast<int>(drawColumn + 1U) * chartWidth / static_cast<int>(drawColumns);
            const int y0 = bottom + static_cast<int>(drawRow) * chartHeight / static_cast<int>(drawRows);
            const int y1 = bottom + static_cast<int>(drawRow + 1U) * chartHeight / static_cast<int>(drawRows);
            fillRectangle(
                gl,
                x0,
                y0,
                std::max(1, x1 - x0 - 1),
                std::max(1, y1 - y0 - 1),
                0.08F + occupancy * 0.45F,
                0.16F + occupancy * 0.55F,
                0.30F + occupancy * 0.62F
            );
        }
    }
    drawPassTrace(gl, passes, width, height);
    gl.Disable(GL_SCISSOR_TEST);
}

} // namespace

int main() {
    // Setup SDL trước, sau đó tạo OpenGL 4.3 context cần cho compute shader.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    if (!requestOpenGl43Core()) {
        std::cerr << "OpenGL 4.3 attribute request failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_WindowFlags flags = SDL_WINDOW_OPENGL;
    flags |= SDL_WINDOW_RESIZABLE;
    flags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;
    SDL_Window* window = SDL_CreateWindow(
        "Project 40 | GPU Grid Workbench",
        kInitialWidth,
        kInitialHeight,
        flags
    );
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_GLContext context = SDL_GL_CreateContext(window);
    if (!context || !SDL_GL_MakeCurrent(window, context)) {
        std::cerr << "OpenGL 4.3 context creation failed: " << SDL_GetError() << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    lab::GlApi gl{};
    if (!gl.load()) {
        std::cerr << "SDL_GL_GetProcAddress failed for " << gl.missingFunction << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!SDL_GL_SetSwapInterval(1)) {
        std::cerr << "VSync unavailable: " << SDL_GetError() << '\n';
    }

    const char* versionText = reinterpret_cast<const char*>(gl.GetString(GL_VERSION));
    if (versionText) {
        std::cout << "OpenGL: " << versionText << '\n';
    }

    std::size_t particleCount = kCountPresets[2];
    std::size_t cellSizePreset = 1U;
    float radius = 6.0F;
    std::uint32_t seed = 40U;
    lab::GridSpec spec = lab::makeGridSpec(kCellSizePresets[cellSizePreset]);
    std::vector<lab::Vec2> positions{};
    std::string diagnostics{};

#if LAB_CHECKPOINT < 1
    (void)seed;
#endif

#if LAB_CHECKPOINT >= 1
    positions = lab::makeDeterministicPositions(particleCount, seed);
    const lab::NeighborSummary cpuSample = lab::bruteForceNeighbor(positions, 0U, radius);
    std::cout
        << "CPU contract | particles=" << positions.size()
        << " | grid=" << spec.columns << 'x' << spec.rows
        << " | particle[0].cell=" << lab::cellId(spec, positions[0])
        << " | neighbors[0]=" << cpuSample.neighborCount
        << '\n';
#endif

    lab::GpuGridEngine engine{};
#if LAB_CHECKPOINT >= 2
    const lab::ComputeLimits limits = lab::queryComputeLimits(gl);
    const lab::CapabilityReport capability = lab::validateCapabilities(limits, particleCount, spec, radius);
    const lab::WorkloadEstimate initialWork = lab::estimateNeighborWork(particleCount, spec, radius);
    std::cout
        << "Compute limits | localSizeX=" << limits.maximumWorkgroupSizeX
        << " | groupCountX=" << limits.maximumWorkgroupCountX
        << " | bindings=" << limits.maximumStorageBindings
        << " | SSBO bytes=" << limits.maximumShaderStorageBlockBytes
        << " | estimated candidates=" << static_cast<unsigned long long>(initialWork.estimatedCandidateVisits)
        << '\n';
    if (!capability.allPassed()) {
        std::cerr << "The selected workload does not pass named OpenGL capability checks.\n";
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!engine.initializePrograms(gl, shaderDirectory(), diagnostics) ||
        !engine.rebuild(gl, positions, spec, radius, diagnostics) ||
        !engine.run(gl, diagnostics)) {
        std::cerr << diagnostics << '\n';
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    std::cout << diagnostics << '\n';
#if LAB_CHECKPOINT >= 3
    const std::vector<std::uint32_t>& initialOffsets = engine.cellOffsets();
    const std::vector<std::uint32_t>& initialCounts = engine.cellCounts();
    const std::uint32_t initialRangeEnd = initialOffsets.back() + initialCounts.back();
    std::cout << "Scan contract | offset[0]=" << initialOffsets.front() << " | final range end=" << initialRangeEnd << '\n';
#endif
#if LAB_CHECKPOINT >= 4
    const char* cursorContractText = "FAIL";
    if (engine.cursorEndsMatch()) {
        cursorContractText = "PASS";
    }
    std::cout
        << "Scatter contract | cursor ends=" << cursorContractText
        << " | first sorted index=" << engine.sortedPreview().front()
        << '\n';
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "Candidate contract | particle 0 visited=" << engine.sampleSummary().visitedCandidates << '\n';
#endif
#if LAB_CHECKPOINT >= 6
    std::cout
        << "Exact neighbor contract | particle 0 count=" << engine.sampleSummary().neighborCount
        << " | nearest=" << engine.sampleSummary().nearestIndex
        << '\n';
#endif
#endif

#if LAB_CHECKPOINT >= 7
    for (const lab::PassRecord& pass : engine.passTrace()) {
        std::cout
            << pass.label
            << " | writes " << pass.writes
            << " | items=" << pass.itemCount
            << " | " << lab::barrierName(pass.barrierBit)
            << '\n';
    }
#endif

    auto rebuildWorkload = [&](std::size_t requestedCount, std::size_t requestedCellPreset, float requestedRadius, std::uint32_t requestedSeed) -> bool {
#if LAB_CHECKPOINT >= 9
        const lab::GridSpec candidateSpec = lab::makeGridSpec(kCellSizePresets[requestedCellPreset]);
        const lab::CapabilityReport requestedCapability = lab::validateCapabilities(
            limits,
            requestedCount,
            candidateSpec,
            requestedRadius
        );
        if (!requestedCapability.allPassed()) {
            const lab::WorkloadEstimate work = lab::estimateNeighborWork(
                requestedCount,
                candidateSpec,
                requestedRadius
            );
            if (!work.withinBudget()) {
                diagnostics = "Requested workload exceeds the safe candidate-visit budget.";
            } else {
                diagnostics = "Requested workload does not pass OpenGL capability validation.";
            }
            return false;
        }
        std::vector<lab::Vec2> candidatePositions{};
        try {
            candidatePositions = lab::makeDeterministicPositions(requestedCount, requestedSeed);
        } catch (const std::exception& error) {
            diagnostics = std::string("Particle allocation failed: ") + error.what();
            return false;
        }
        if (!engine.rebuild(gl, candidatePositions, candidateSpec, requestedRadius, diagnostics)) {
            return false;
        }
        if (!engine.run(gl, diagnostics)) {
            const std::string candidateFailure = diagnostics;
            std::string rollbackDiagnostics{};
            const bool rollbackPassed =
                engine.rebuild(gl, positions, spec, radius, rollbackDiagnostics) &&
                engine.run(gl, rollbackDiagnostics);
            diagnostics = candidateFailure;
            if (rollbackPassed) {
                diagnostics += " The previous workload was restored.";
            } else {
                diagnostics += " Rollback also failed: " + rollbackDiagnostics;
            }
            return false;
        }
        positions = std::move(candidatePositions);
        particleCount = requestedCount;
        cellSizePreset = requestedCellPreset;
        radius = requestedRadius;
        seed = requestedSeed;
        spec = candidateSpec;
        return true;
#else
        (void)requestedCount;
        (void)requestedCellPreset;
        (void)requestedRadius;
        (void)requestedSeed;
        return true;
#endif
    };

    bool running = true;
    std::uint64_t previousTitleTicks = 0U;
#if LAB_CHECKPOINT >= 8
    bool benchmarkActive = false;
    bool benchmarkPrepared = false;
    std::size_t benchmarkSubmitted = 0U;
    std::uint64_t benchmarkStartedTicks = 0U;
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat) {
                continue;
            }
            const SDL_Keycode key = event.key.key;
            if (key == SDLK_ESCAPE) {
                running = false;
            }
#if LAB_CHECKPOINT >= 8
            if (key == SDLK_B) {
                if (benchmarkActive) {
                    benchmarkActive = false;
                    diagnostics = "Benchmark cancelled by the user.";
                } else {
                    benchmarkActive = true;
                    benchmarkPrepared = false;
                    benchmarkSubmitted = 0U;
                    benchmarkStartedTicks = SDL_GetTicksNS();
                    diagnostics = "Benchmark queued; the event loop remains responsive.";
                }
                std::cout << diagnostics << '\n';
                continue;
            }
            if (benchmarkActive) {
                continue;
            }
#endif
#if LAB_CHECKPOINT >= 9
            for (std::size_t preset = 0; preset < kCountPresets.size(); ++preset) {
                const SDL_Keycode presetKey = SDLK_1 + static_cast<SDL_Keycode>(preset);
                if (key == presetKey && !rebuildWorkload(kCountPresets[preset], cellSizePreset, radius, seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_LEFTBRACKET && cellSizePreset > 0U) {
                if (!rebuildWorkload(particleCount, cellSizePreset - 1U, radius, seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_RIGHTBRACKET && cellSizePreset + 1U < kCellSizePresets.size()) {
                if (!rebuildWorkload(particleCount, cellSizePreset + 1U, radius, seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_MINUS) {
                const float requestedRadius = std::max(1.0F, radius - 1.0F);
                if (!rebuildWorkload(particleCount, cellSizePreset, requestedRadius, seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_EQUALS) {
                const float requestedRadius = std::min(48.0F, radius + 1.0F);
                if (!rebuildWorkload(particleCount, cellSizePreset, requestedRadius, seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_R && !rebuildWorkload(particleCount, 1U, 6.0F, 40U)) {
                std::cerr << diagnostics << '\n';
            }
            if (key == SDLK_S && !rebuildWorkload(particleCount, cellSizePreset, radius, seed + 1U)) {
                std::cerr << diagnostics << '\n';
            }
            if (key == SDLK_V) {
                if (!engine.run(gl, diagnostics)) {
                    std::cerr << diagnostics << '\n';
                } else {
                    std::cout << diagnostics << '\n';
                }
            }
#endif
        }

        engine.pollTiming(gl);
#if LAB_CHECKPOINT >= 8
        if (running && benchmarkActive) {
            const std::uint64_t benchmarkNow = SDL_GetTicksNS();
            if (benchmarkNow - benchmarkStartedTicks > kBenchmarkTimeoutNanoseconds) {
                benchmarkActive = false;
                diagnostics = "Benchmark stopped after the 10-second safety deadline.";
                std::cerr << diagnostics << '\n';
            } else if (!benchmarkPrepared) {
                benchmarkPrepared = engine.clearTimingSamplesWhenIdle();
            } else if (benchmarkSubmitted < kBenchmarkSampleCount) {
                bool timingSubmitted = false;
                if (!engine.run(gl, diagnostics, false, true, &timingSubmitted)) {
                    benchmarkActive = false;
                    std::cerr << diagnostics << '\n';
                } else if (timingSubmitted) {
                    ++benchmarkSubmitted;
                }
            } else if (
                engine.pendingQueries() == 0U &&
                engine.timingSampleCount() == kBenchmarkSampleCount
            ) {
                benchmarkActive = false;
                diagnostics = "Benchmark completed with exactly nine available GPU samples.";
                std::cout << diagnostics << '\n';
            }
        }
#endif
        int framebufferWidth = 0;
        int framebufferHeight = 0;
        if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
            framebufferWidth = kInitialWidth;
            framebufferHeight = kInitialHeight;
        }
        drawOccupancyHeatmap(gl, spec, engine.cellCounts(), engine.passTrace(), framebufferWidth, framebufferHeight);
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }

        const std::uint64_t nowTicks = SDL_GetTicksNS();
        if (nowTicks - previousTitleTicks >= 250'000'000U) {
            const lab::GridValidationReport& report = engine.gridReport();
            const bool validationPassed = report.passed() && engine.neighborMismatchCount() == 0U;
            const char* validationText = "PENDING";
#if LAB_CHECKPOINT >= 8
            if (validationPassed) {
                validationText = "PASS";
            } else {
                validationText = "FAIL";
            }
#else
            (void)validationPassed;
#endif
            const std::uint64_t totalCounts = std::accumulate(
                engine.cellCounts().begin(),
                engine.cellCounts().end(),
                std::uint64_t{0U}
            );
            char title[512]{};
#if LAB_CHECKPOINT >= 8
            const char* benchmarkText = "idle";
            if (benchmarkActive) {
                benchmarkText = "running";
            }
            const std::size_t benchmarkProgress = benchmarkSubmitted;
#else
            const char* benchmarkText = "unavailable";
            const std::size_t benchmarkProgress = 0U;
#endif
            std::snprintf(
                title,
                sizeof(title),
                "P40 | N=%zu | grid=%ux%u | cell=%.0f | r=%.0f | passes=%zu | scattered=%llu | max cell=%u | GPU %.3f ms | %s | bench %s %zu/9",
                particleCount,
                spec.columns,
                spec.rows,
                spec.cellSize,
                radius,
                engine.passTrace().size(),
                static_cast<unsigned long long>(totalCounts),
                maximumCount(engine.cellCounts()),
                engine.medianGpuMilliseconds(),
                validationText,
                benchmarkText,
                benchmarkProgress
            );
            SDL_SetWindowTitle(window, title);
            previousTitleTicks = nowTicks;
        }
    }

    // Cleanup query, scan hierarchy, grid buffers và programs khi OpenGL context vẫn current.
    engine.destroy(gl);
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
