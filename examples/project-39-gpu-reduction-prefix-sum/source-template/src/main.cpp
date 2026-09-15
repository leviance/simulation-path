#include "gl_api.hpp"
#include "reduction_gpu_engine.hpp"
#include "reduction_math.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <filesystem>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

namespace {

constexpr int kInitialWidth = 1100;
constexpr int kInitialHeight = 680;
#if LAB_CHECKPOINT >= 10
constexpr std::array<std::size_t, 4> kCountPresets = {
    8U,
    257U,
    65'537U,
    1'000'003U,
};
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

#if LAB_CHECKPOINT >= 10
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

void drawBars(
    lab::GlApi& gl,
    const std::vector<float>& values,
    int width,
    int height,
    float red,
    float green,
    float blue
) {
    if (values.empty()) {
        return;
    }
    constexpr std::size_t sampleCount = 96U;
    const int chartLeft = 48;
    const int chartBottom = 70;
    const int chartWidth = std::max(1, width - chartLeft * 2);
    const int chartHeight = std::max(1, height - 190);
    float maximum = 0.0F;
    for (std::size_t sample = 0; sample < sampleCount; ++sample) {
        const std::size_t index = sample * (values.size() - 1U) / (sampleCount - 1U);
        maximum = std::max(maximum, std::abs(values[index]));
    }
    if (maximum <= 0.0F) {
        maximum = 1.0F;
    }

    for (std::size_t sample = 0; sample < sampleCount; ++sample) {
        const std::size_t index = sample * (values.size() - 1U) / (sampleCount - 1U);
        const float normalized = std::clamp(std::abs(values[index]) / maximum, 0.0F, 1.0F);
        const int barLeft = chartLeft + static_cast<int>(sample * chartWidth / sampleCount);
        const int barRight = chartLeft + static_cast<int>((sample + 1U) * chartWidth / sampleCount);
        const int barHeight = std::max(1, static_cast<int>(normalized * chartHeight));
        fillRectangle(
            gl,
            barLeft,
            chartBottom,
            std::max(1, barRight - barLeft - 1),
            barHeight,
            red,
            green,
            blue
        );
    }
}

void drawPassGraph(
    lab::GlApi& gl,
    const std::vector<lab::PassRecord>& passes,
    int width,
    int height
) {
    if (passes.empty()) {
        return;
    }
    const int top = height - 78;
    const int availableWidth = std::max(1, width - 96);
    const int gap = 8;
    const int boxWidth = std::max(24, (availableWidth - gap * static_cast<int>(passes.size() - 1U)) / static_cast<int>(passes.size()));
    for (std::size_t index = 0; index < passes.size(); ++index) {
        const int x = 48 + static_cast<int>(index) * (boxWidth + gap);
        float red = 0.38F;
        float green = 0.68F;
        float blue = 0.94F;
        if (passes[index].label == "uniform add") {
            red = 0.78F;
            green = 0.47F;
            blue = 0.87F;
        }
        fillRectangle(gl, x, top, boxWidth, 28, red, green, blue);
    }
}

void drawWorkbench(
    lab::GlApi& gl,
    const std::vector<float>& input,
    const std::vector<float>& scanOutput,
    const std::vector<lab::PassRecord>& passes,
    lab::Operation operation,
    float reductionResult,
    int width,
    int height
) {
    gl.Viewport(0, 0, width, height);
    gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);
    gl.Enable(GL_SCISSOR_TEST);

    if (operation == lab::Operation::exclusiveScan && !scanOutput.empty()) {
        drawBars(gl, scanOutput, width, height, 0.50F, 0.34F, 0.78F);
    } else {
        drawBars(gl, input, width, height, 0.24F, 0.58F, 0.91F);
        const float normalized = std::clamp(reductionResult / 2'000.0F, 0.0F, 1.0F);
        fillRectangle(gl, 48, 38, std::max(2, static_cast<int>(normalized * (width - 96))), 12, 0.56F, 0.76F, 0.36F);
    }
    drawPassGraph(gl, passes, width, height);
    gl.Disable(GL_SCISSOR_TEST);
}
#endif

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
        "Project 39 | Reduction & Scan Workbench",
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

#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
    std::size_t inputCount = 1'000'003U;
#else
    std::size_t inputCount = 8U;
#endif
    std::uint32_t seed = 39U;
    lab::Operation operation = lab::Operation::reduction;
#if LAB_CHECKPOINT >= 5
    operation = lab::Operation::exclusiveScan;
#endif
    std::vector<float> input = lab::makeDeterministicInput(inputCount, seed);
#if LAB_CHECKPOINT >= 5
    std::vector<float> scanOutput{};
#endif
#if LAB_CHECKPOINT >= 6
    std::vector<float> blockSums{};
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT <= 4
    float reductionResult = 0.0F;
#elif LAB_CHECKPOINT >= 7
    float reductionResult = 0.0F;
#endif
    std::string diagnostics{};
#endif

    const double cpuTotal = lab::cpuReduction(input);
    const std::vector<double> cpuScan = lab::cpuExclusiveScan(input);
    std::cout
        << lab::operationName(operation)
        << " | CPU contract | count=" << input.size()
        << " | reduction=" << cpuTotal
        << " | scan[0]=" << cpuScan.front()
        << '\n';
#endif
#if LAB_CHECKPOINT >= 2
    const std::vector<lab::HierarchyLevel> initialHierarchy = lab::makeHierarchy(inputCount);
    std::cout << "Hierarchy";
    for (const lab::HierarchyLevel& level : initialHierarchy) {
        std::cout << " -> " << level.blockCount;
    }
    std::cout
        << " | first padding=" << initialHierarchy.front().zeroPadding
        << " | scan dispatches=" << lab::scanDispatchCount(inputCount)
        << '\n';
#endif

#if LAB_CHECKPOINT >= 3
    lab::ReductionGpuEngine engine{};
    const lab::ComputeLimits limits = lab::queryComputeLimits(gl);
    const lab::CapabilityReport capability = lab::validateCapabilities(limits, inputCount);
    std::cout
        << "Compute limits | localSizeX=" << limits.maximumWorkgroupSizeX
        << " | invocations=" << limits.maximumInvocations
        << " | groupCountX=" << limits.maximumWorkgroupCountX
        << " | sharedBytes=" << limits.maximumSharedMemoryBytes
        << " | ssboBytes=" << limits.maximumShaderStorageBlockBytes
        << '\n';
    if (!capability.allPassed()) {
        std::cerr << "The selected workload does not pass named OpenGL capability checks.\n";
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!engine.initializePrograms(gl, shaderDirectory(), diagnostics) || !engine.uploadInput(gl, input, diagnostics)) {
        std::cerr << diagnostics << '\n';
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
#endif

#if LAB_CHECKPOINT >= 3
    auto runCurrentOperation = [&]() -> bool {
#if LAB_CHECKPOINT >= 7
        if (operation == lab::Operation::exclusiveScan) {
            return engine.runExclusiveScan(gl, scanOutput, diagnostics);
        }
        scanOutput.clear();
        return engine.runReduction(gl, reductionResult, diagnostics);
#elif LAB_CHECKPOINT >= 6
        return engine.runBlockScans(gl, scanOutput, blockSums, diagnostics);
#elif LAB_CHECKPOINT >= 5
        float firstBlockSum = 0.0F;
        return engine.runSingleBlockScan(gl, scanOutput, firstBlockSum, diagnostics);
#elif LAB_CHECKPOINT >= 4
        return engine.runReduction(gl, reductionResult, diagnostics);
#elif LAB_CHECKPOINT >= 3
        return engine.reduceFirstBlock(gl, reductionResult, diagnostics);
#else
        return true;
#endif
    };
#endif

#if LAB_CHECKPOINT >= 3
    if (!runCurrentOperation()) {
        std::cerr << diagnostics << '\n';
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    std::cout << diagnostics << '\n';
#if LAB_CHECKPOINT >= 8
    for (const lab::PassRecord& pass : engine.passTrace()) {
        std::cout
            << pass.label
            << " | " << pass.inputCount << " -> " << pass.outputCount
            << " | " << lab::barrierName(pass.barrierBit)
            << '\n';
    }
#endif
#endif

#if LAB_CHECKPOINT >= 10
    auto rebuildWorkload = [&](std::size_t requestedCount, std::uint32_t requestedSeed) -> bool {
#if LAB_CHECKPOINT >= 10
        const lab::CapabilityReport requestedCapability = lab::validateCapabilities(limits, requestedCount);
        if (!requestedCapability.allPassed()) {
            diagnostics = "Requested count does not pass capability validation.";
            return false;
        }
        std::vector<float> candidateInput{};
        try {
            candidateInput = lab::makeDeterministicInput(requestedCount, requestedSeed);
        } catch (const std::exception& error) {
            diagnostics = std::string("Input allocation failed: ") + error.what();
            return false;
        }
        if (!engine.uploadInput(gl, candidateInput, diagnostics)) {
            return false;
        }
        if (!runCurrentOperation()) {
            const std::string candidateFailure = diagnostics;
            std::string rollbackDiagnostics{};
            bool rollbackPassed = engine.uploadInput(gl, input, rollbackDiagnostics);
            if (rollbackPassed) {
                rollbackPassed = runCurrentOperation();
                rollbackDiagnostics = diagnostics;
            }
            diagnostics = candidateFailure;
            if (rollbackPassed) {
                diagnostics += " The previous workload was restored.";
            } else {
                diagnostics += " Rollback also failed: " + rollbackDiagnostics;
            }
            return false;
        }
        input = std::move(candidateInput);
        inputCount = requestedCount;
        seed = requestedSeed;
        return true;
#else
        (void)requestedCount;
        (void)requestedSeed;
        return true;
#endif
    };
#endif

    bool running = true;
#if LAB_CHECKPOINT >= 9
    std::uint64_t previousTitleTicks = 0U;
#endif
#if LAB_CHECKPOINT >= 10
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
#if LAB_CHECKPOINT >= 10
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
            if (key == SDLK_TAB) {
                if (operation == lab::Operation::reduction) {
                    operation = lab::Operation::exclusiveScan;
                } else {
                    operation = lab::Operation::reduction;
                }
                if (!runCurrentOperation()) {
                    std::cerr << diagnostics << '\n';
                }
            }
            for (std::size_t preset = 0; preset < kCountPresets.size(); ++preset) {
                const SDL_Keycode presetKey = SDLK_1 + static_cast<SDL_Keycode>(preset);
                if (key == presetKey && !rebuildWorkload(kCountPresets[preset], seed)) {
                    std::cerr << diagnostics << '\n';
                }
            }
            if (key == SDLK_R && !rebuildWorkload(inputCount, 39U)) {
                std::cerr << diagnostics << '\n';
            }
            if (key == SDLK_S && !rebuildWorkload(inputCount, seed + 1U)) {
                std::cerr << diagnostics << '\n';
            }
            if (key == SDLK_V) {
                if (!runCurrentOperation()) {
                    std::cerr << diagnostics << '\n';
                } else {
                    std::cout << diagnostics << '\n';
                }
            }
#endif
        }

#if LAB_CHECKPOINT >= 9
        engine.pollTiming(gl);
#endif
#if LAB_CHECKPOINT >= 10
        if (running && benchmarkActive) {
            const std::uint64_t benchmarkNow = SDL_GetTicksNS();
            if (benchmarkNow - benchmarkStartedTicks > kBenchmarkTimeoutNanoseconds) {
                benchmarkActive = false;
                diagnostics = "Benchmark stopped after the 10-second safety deadline.";
                std::cerr << diagnostics << '\n';
            } else if (!benchmarkPrepared) {
                benchmarkPrepared = engine.clearTimingSamplesWhenIdle();
            } else if (benchmarkSubmitted < kBenchmarkSampleCount) {
                if (!runCurrentOperation()) {
                    benchmarkActive = false;
                    std::cerr << diagnostics << '\n';
                } else if (engine.lastTimingSubmitted()) {
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
#if LAB_CHECKPOINT >= 10
        drawWorkbench(
            gl,
            input,
            scanOutput,
            engine.passTrace(),
            operation,
            reductionResult,
            framebufferWidth,
            framebufferHeight
        );
#else
        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
#endif
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }

#if LAB_CHECKPOINT >= 9
        const std::uint64_t nowTicks = SDL_GetTicksNS();
        if (nowTicks - previousTitleTicks >= 250'000'000U) {
            const lab::ValidationReport* report = &engine.scanReport();
            if (operation == lab::Operation::reduction) {
                report = &engine.reductionReport();
            }
            const char* validationText = "PENDING";
            if (report->passed()) {
                validationText = "PASS";
            } else if (report->sameSize) {
                validationText = "FAIL";
            }
            char title[512]{};
#if LAB_CHECKPOINT >= 10
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
                "P39 | %s | N=%zu | passes=%zu | GPU median %.3f ms | max error %.3e | %s | queries=%zu | bench %s %zu/9",
                lab::operationName(operation),
                inputCount,
                engine.passTrace().size(),
                engine.medianGpuMilliseconds(),
                report->maximumAbsoluteError,
                validationText,
                engine.pendingQueries(),
                benchmarkText,
                benchmarkProgress
            );
            SDL_SetWindowTitle(window, title);
            previousTitleTicks = nowTicks;
        }
#endif
    }

#if LAB_CHECKPOINT >= 3
    // Cleanup query, hierarchy buffers và programs khi OpenGL context vẫn còn current.
    engine.destroy(gl);
#endif
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
