#include "gl_api.hpp"
#include "vector_compute_engine.hpp"
#include "vector_compute_math.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

namespace {

constexpr int kInitialWidth = 980;
constexpr int kInitialHeight = 600;
constexpr std::uint32_t kLocalSize = 256U;
#if LAB_CHECKPOINT >= 8
constexpr std::size_t kBenchmarkSampleCount = 9U;
constexpr std::uint64_t kBenchmarkTimeoutNanoseconds = 10'000'000'000ULL;
#endif

bool requestOpenGl43Core() {
    return SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) &&
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1) &&
        SDL_GL_SetAttribute(SDL_GL_ACCELERATED_VISUAL, 1);
}

std::filesystem::path shaderPath() {
#ifdef COURSE_SHADER_DIRECTORY
    const std::filesystem::path sourcePath =
        std::filesystem::path(COURSE_SHADER_DIRECTORY) / "vector_ops.comp";
    std::error_code error{};
    if (std::filesystem::is_regular_file(sourcePath, error) && !error) {
        return sourcePath;
    }
#endif
    const char* basePath = SDL_GetBasePath();
    if (basePath) {
        return std::filesystem::path(basePath) / "shaders" / "vector_ops.comp";
    }
    return std::filesystem::path("shaders") / "vector_ops.comp";
}

void destroyWindowAndContext(SDL_Window* window, SDL_GLContext context) {
    if (context) {
        SDL_GL_DestroyContext(context);
    }
    SDL_DestroyWindow(window);
    SDL_Quit();
}

void drawOutputBars(
    lab::GlApi& gl,
    const std::vector<lab::Vec4>& output,
    int width,
    int height
) {
    gl.Viewport(0, 0, width, height);
    gl.ClearColor(0.035F, 0.055F, 0.10F, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);
    if (output.empty()) {
        return;
    }

    constexpr int barCount = 64;
    const int margin = std::max(24, width / 24);
    const int chartWidth = std::max(1, width - margin * 2);
    const int chartHeight = std::max(1, height - margin * 2);
    const int baseline = margin + chartHeight / 2;
    const int barWidth = std::max(2, chartWidth / barCount);

    gl.Enable(GL_SCISSOR_TEST);
    gl.Scissor(margin, baseline - 1, chartWidth, 2);
    gl.ClearColor(0.32F, 0.38F, 0.50F, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);

    for (int bar = 0; bar < barCount; ++bar) {
        const std::size_t index = std::min(
            output.size() - 1U,
            (std::size_t(bar) * output.size()) / std::size_t(barCount)
        );
        const float value = output[index].x;
        const float normalized = std::tanh(std::abs(value) * 0.8F);
        const int barHeight = std::max(2, int(normalized * float(chartHeight / 2 - 6)));
        const int x = margin + bar * barWidth;
        int y = baseline - barHeight;
        if (value >= 0.0F) {
            y = baseline;
        }
        gl.Scissor(x + 1, y, std::max(1, barWidth - 2), barHeight);
        if (value >= 0.0F) {
            gl.ClearColor(0.38F, 0.69F, 0.94F, 1.0F);
        } else {
            gl.ClearColor(0.88F, 0.42F, 0.46F, 1.0F);
        }
        gl.Clear(GL_COLOR_BUFFER_BIT);
    }
    gl.Disable(GL_SCISSOR_TEST);
}

} // namespace

int main() {
    // Setup SDL trước, sau đó mới tạo window và OpenGL context cần cho mọi GPU resource.
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
        "Project 37 | Million Vector GPU",
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
    } else {
        std::cout << "OpenGL: unknown\n";
    }

    lab::VectorComputeEngine engine{};
    std::string diagnostics{};
    std::size_t elementCount = 256U;
#if LAB_CHECKPOINT >= 1
    elementCount = 1'000'003U;
#endif
    lab::VectorOperation operation = lab::VectorOperation::add;
    float scalar = 1.25F;
    std::vector<lab::Vec4> cpuOutput{};
    std::vector<lab::Vec4> gpuOutput{};
    std::vector<lab::Vec4> visibleOutput{};
    lab::VectorInputs inputs{};
    double gpuMilliseconds = 0.0;
    double benchmarkMedian = 0.0;
    bool timingAvailable = false;
#if LAB_CHECKPOINT >= 7
    lab::OutputValidationReport validation{};
#endif

#if LAB_CHECKPOINT >= 2
    const lab::ComputeLimits limits = lab::queryComputeLimits(gl);
#if LAB_CHECKPOINT >= 5
    const lab::DispatchPlan initialPlan = lab::makeDispatchPlan(elementCount, kLocalSize);
    const lab::CapabilityReport capability = lab::validateCapabilities(limits, initialPlan);
#else
    const bool versionSupported =
        limits.majorVersion > 4 ||
        (limits.majorVersion == 4 && limits.minorVersion >= 3);
    const bool capabilityPassed = versionSupported &&
        limits.maximumWorkgroupSize[0] >= int(kLocalSize) &&
        limits.maximumInvocations >= int(kLocalSize) &&
        (1U + (elementCount - 1U) / kLocalSize) <=
            std::size_t(limits.maximumWorkgroupCount[0]) &&
        limits.maximumShaderStorageBlockBytes >=
            static_cast<std::int64_t>(elementCount * sizeof(lab::Vec4));
#endif
    std::cout
        << "Compute limits | localSizeX=" << limits.maximumWorkgroupSize[0]
        << " | invocations=" << limits.maximumInvocations
        << " | groupCountX=" << limits.maximumWorkgroupCount[0]
        << " | ssboBytes=" << limits.maximumShaderStorageBlockBytes
        << '\n';
#if LAB_CHECKPOINT >= 5
    if (!capability.allPassed()) {
#else
    if (!capabilityPassed) {
#endif
        std::cerr << "Named capability validation failed for the selected workload.\n";
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
#endif

#if LAB_CHECKPOINT >= 4
    const std::filesystem::path computeShader = shaderPath();
    if (!engine.loadProgram(gl, computeShader.string(), diagnostics)) {
        std::cerr << diagnostics << '\n';
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    std::cout << diagnostics << " Shader: " << computeShader.string() << '\n';
#endif

    auto rebuildDataset = [&]() -> bool {
#if LAB_CHECKPOINT >= 1
        inputs = lab::makeVectorInputs(elementCount);
        cpuOutput = lab::computeCpu(inputs, operation, scalar);
        visibleOutput = cpuOutput;
#endif
#if LAB_CHECKPOINT >= 3
        if (!engine.uploadInputs(gl, inputs, diagnostics)) {
            std::cerr << diagnostics << '\n';
            return false;
        }
#endif
        return true;
    };

    auto runCalculation = [&]() -> bool {
#if LAB_CHECKPOINT >= 1
        cpuOutput = lab::computeCpu(inputs, operation, scalar);
        visibleOutput = cpuOutput;
#endif
#if LAB_CHECKPOINT >= 4
#if LAB_CHECKPOINT >= 5
        const std::size_t dispatchCount = elementCount;
#else
        const std::size_t dispatchCount = 256U;
#endif
        if (!engine.execute(
                gl,
                dispatchCount,
                operation,
                scalar,
                gpuOutput,
                gpuMilliseconds,
                diagnostics,
                &timingAvailable
            )) {
            std::cerr << diagnostics << '\n';
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 6
        visibleOutput = gpuOutput;
#endif
#if LAB_CHECKPOINT >= 7
        validation = lab::validateOutput(cpuOutput, gpuOutput);
#endif
        return true;
    };

    if (!rebuildDataset() || !runCalculation()) {
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    constexpr std::array<std::size_t, 3> countPresets{
        256U,
        65'537U,
        1'000'003U,
    };
    int countPreset = 2;
#if LAB_CHECKPOINT < 1
    countPreset = 0;
#endif

    bool running = true;
#if LAB_CHECKPOINT >= 8
    bool benchmarkActive = false;
    std::uint64_t benchmarkStartedTicks = 0U;
    std::vector<double> benchmarkSamples{};
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                bool datasetChanged = false;
                bool calculationChanged = false;
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
#if LAB_CHECKPOINT >= 8
                } else if (event.key.key == SDLK_B) {
                    if (benchmarkActive) {
                        benchmarkActive = false;
                        diagnostics = "Benchmark cancelled by the user.";
                    } else {
                        benchmarkActive = true;
                        benchmarkStartedTicks = SDL_GetTicksNS();
                        benchmarkSamples.clear();
                        diagnostics = "Benchmark queued; one sample will run per frame.";
                    }
                    std::cout << diagnostics << '\n';
#endif
#if LAB_CHECKPOINT >= 9
                } else if (event.key.key == SDLK_1) {
                    operation = lab::VectorOperation::add;
                    calculationChanged = true;
                } else if (event.key.key == SDLK_2) {
                    operation = lab::VectorOperation::axpy;
                    calculationChanged = true;
                } else if (event.key.key == SDLK_3) {
                    operation = lab::VectorOperation::difference;
                    calculationChanged = true;
                } else if (event.key.key == SDLK_LEFTBRACKET) {
                    countPreset = std::max(0, countPreset - 1);
                    elementCount = countPresets[std::size_t(countPreset)];
                    datasetChanged = true;
                } else if (event.key.key == SDLK_RIGHTBRACKET) {
                    countPreset = std::min(int(countPresets.size()) - 1, countPreset + 1);
                    elementCount = countPresets[std::size_t(countPreset)];
                    datasetChanged = true;
                } else if (event.key.key == SDLK_MINUS) {
                    scalar = std::max(-4.0F, scalar - 0.25F);
                    calculationChanged = true;
                } else if (event.key.key == SDLK_EQUALS) {
                    scalar = std::min(4.0F, scalar + 0.25F);
                    calculationChanged = true;
                } else if (event.key.key == SDLK_R) {
                    countPreset = 2;
                    elementCount = countPresets[2];
                    operation = lab::VectorOperation::add;
                    scalar = 1.25F;
                    benchmarkMedian = 0.0;
                    datasetChanged = true;
#endif
                }
                if (datasetChanged && (!rebuildDataset() || !runCalculation())) {
                    running = false;
                } else if (calculationChanged && !runCalculation()) {
                    running = false;
                }
            }
        }

#if LAB_CHECKPOINT >= 8
        if (running && benchmarkActive) {
            const std::uint64_t now = SDL_GetTicksNS();
            if (now - benchmarkStartedTicks > kBenchmarkTimeoutNanoseconds) {
                benchmarkActive = false;
                diagnostics = "Benchmark stopped after the 10-second safety deadline.";
                std::cerr << diagnostics << '\n';
            } else if (!runCalculation()) {
                benchmarkActive = false;
                std::cerr << diagnostics << '\n';
            } else if (timingAvailable) {
                benchmarkSamples.push_back(gpuMilliseconds);
                if (benchmarkSamples.size() == kBenchmarkSampleCount) {
                    benchmarkMedian = lab::medianMilliseconds(benchmarkSamples);
                    benchmarkActive = false;
                    diagnostics = "Benchmark completed with exactly nine available GPU samples.";
                    std::cout << diagnostics << '\n';
                }
            }
        }
#endif

        int framebufferWidth = 1;
        int framebufferHeight = 1;
        if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
            std::cerr << "SDL_GetWindowSizeInPixels failed: " << SDL_GetError() << '\n';
            running = false;
            continue;
        }
        framebufferWidth = std::max(1, framebufferWidth);
        framebufferHeight = std::max(1, framebufferHeight);
        drawOutputBars(gl, visibleOutput, framebufferWidth, framebufferHeight);

        char title[640]{};
#if LAB_CHECKPOINT >= 9
        const lab::DispatchPlan plan = lab::makeDispatchPlan(elementCount, kLocalSize);
        const char* validationText = "FAIL";
        if (validation.allPassed()) {
            validationText = "PASS";
        }
        const char* benchmarkText = "idle";
        if (benchmarkActive) {
            benchmarkText = "running";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P37 | %s | N %llu | groups %u | scalar %.2f | GPU %.4f ms | median %.4f | error %.3g | %s | bench %s %zu/9",
            lab::operationName(operation),
            static_cast<unsigned long long>(elementCount),
            plan.workgroupCount,
            double(scalar),
            gpuMilliseconds,
            benchmarkMedian,
            double(validation.maximumAbsoluteError),
            validationText,
            benchmarkText,
            benchmarkSamples.size()
        );
#elif LAB_CHECKPOINT >= 8
        std::snprintf(title, sizeof(title), "P37 | GPU timer query %.4f ms | B: benchmark", gpuMilliseconds);
#elif LAB_CHECKPOINT >= 7
        std::snprintf(title, sizeof(title), "P37 | CPU-GPU mismatches %llu | max error %.3g", static_cast<unsigned long long>(validation.mismatchCount), double(validation.maximumAbsoluteError));
#elif LAB_CHECKPOINT >= 6
        SDL_strlcpy(title, "P37 | barrier + GPU output readback", sizeof(title));
#elif LAB_CHECKPOINT >= 5
        const lab::DispatchPlan plan = lab::makeDispatchPlan(elementCount, kLocalSize);
        std::snprintf(title, sizeof(title), "P37 | N %llu | groups %u | tail lanes %llu", static_cast<unsigned long long>(elementCount), plan.workgroupCount, static_cast<unsigned long long>(plan.unusedInvocations));
#elif LAB_CHECKPOINT >= 4
        SDL_strlcpy(title, "P37 | one workgroup | 256 GPU vector additions", sizeof(title));
#elif LAB_CHECKPOINT >= 3
        SDL_strlcpy(title, "P37 | three SSBOs | bindings 0 / 1 / 2", sizeof(title));
#elif LAB_CHECKPOINT >= 2
        SDL_strlcpy(title, "P37 | OpenGL 4.3 compute capability passed", sizeof(title));
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P37 | CPU oracle | N %llu | checksum %.6f", static_cast<unsigned long long>(elementCount), lab::checksum(cpuOutput));
#else
        SDL_strlcpy(title, "Project 37 starter | OpenGL 4.3 window", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }
    }

    // Cleanup GPU resources trong lúc OpenGL context vẫn còn current.
    engine.destroy(gl);
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
