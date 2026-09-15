#include "gl_api.hpp"
#include "particle_gpu_engine.hpp"
#include "particle_math.hpp"

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
#include <string>
#include <vector>

namespace {

constexpr int kInitialWidth = 1100;
constexpr int kInitialHeight = 700;
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
constexpr std::size_t kCpuPreviewCount = 2048U;
#endif
#endif
#if LAB_CHECKPOINT >= 3
constexpr std::array<std::size_t, 4> kCountPresets = {
    100'000U,
    500'000U,
    1'000'000U,
    5'000'000U,
};
#endif

bool requestOpenGl43Core() {
    return SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) &&
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1) &&
        SDL_GL_SetAttribute(SDL_GL_ACCELERATED_VISUAL, 1);
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

#if LAB_CHECKPOINT >= 1
void stepCpuPreview(std::vector<lab::Particle>& particles, float dt, std::uint32_t epoch) {
    for (std::size_t index = 0; index < particles.size(); ++index) {
        particles[index] = lab::stepParticleCpu(
            particles[index],
            index,
            dt,
            lab::kGravity,
            epoch
        );
    }
}

void drawCpuPreview(
    lab::GlApi& gl,
    const std::vector<lab::Particle>& particles,
    int width,
    int height
) {
    gl.Viewport(0, 0, width, height);
    gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
    gl.Clear(GL_COLOR_BUFFER_BIT);
    if (particles.empty() || width <= 0 || height <= 0) {
        return;
    }

    float aspect = 1.0F;
    if (height > 0) {
        aspect = static_cast<float>(width) / static_cast<float>(height);
    }
    const float halfHeight = 6.5F;
    const float halfWidth = halfHeight * aspect;

    gl.Enable(GL_SCISSOR_TEST);
    for (const lab::Particle& particle : particles) {
        const float normalizedX = particle.positionAge.x / halfWidth * 0.5F + 0.5F;
        const float normalizedY = particle.positionAge.y / halfHeight * 0.5F + 0.5F;
        const int pixelX = static_cast<int>(normalizedX * static_cast<float>(width));
        const int pixelY = static_cast<int>(normalizedY * static_cast<float>(height));
        if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
            continue;
        }
        gl.Scissor(pixelX, pixelY, 2, 2);
        gl.ClearColor(0.18F, 0.62F, 1.0F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
    }
    gl.Disable(GL_SCISSOR_TEST);
}
#endif

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
        "Project 38 | Five Million Particle Fountain",
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

#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
    std::vector<lab::Particle> cpuPreview = lab::makeInitialParticles(kCpuPreviewCount);
#endif
#endif

#if LAB_CHECKPOINT >= 3
    std::string diagnostics{};
    bool initializationPassed = true;
    std::size_t particleCount = 0U;
    lab::ParticleGpuEngine engine{};
    const lab::ComputeLimits limits = lab::queryComputeLimits(gl);
    const std::vector<std::size_t> presets(kCountPresets.begin(), kCountPresets.end());
    particleCount = lab::chooseLargestSupportedCount(limits, presets);
    if (particleCount == 0U) {
        std::cerr << "No particle preset passes the named capability checks.\n";
        initializationPassed = false;
    }

    std::cout
        << "Compute limits | localSizeX=" << limits.maximumWorkgroupSizeX
        << " | invocations=" << limits.maximumInvocations
        << " | groupCountX=" << limits.maximumWorkgroupCountX
        << " | ssboBytes=" << limits.maximumShaderStorageBlockBytes
        << '\n';
    if (particleCount != kCountPresets.back()) {
        std::cout
            << "5,000,000 particles need "
            << lab::particleStorageBytes(kCountPresets.back())
            << " bytes; using supported fallback "
            << particleCount
            << ".\n";
    }

    if (initializationPassed) {
        try {
            std::vector<lab::Particle> particles = lab::makeInitialParticles(particleCount);
            initializationPassed = engine.initialize(
                gl,
                shaderDirectory(),
                particles,
                diagnostics
            );
        } catch (const std::exception& error) {
            diagnostics = std::string("Particle allocation failed: ") + error.what();
            initializationPassed = false;
        }
    }
    if (!initializationPassed) {
        std::cerr << diagnostics << '\n';
        engine.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
#endif

#if LAB_CHECKPOINT >= 9
    lab::ParticleValidationReport probeValidation = engine.runProbeValidation(gl, diagnostics);
    std::cout << diagnostics << '\n';
#endif
#if LAB_CHECKPOINT >= 10
    std::cout
        << "Controls | 1-4: particle preset | Space: pause | N: single step | "
        << "R: reset | V: validate | Escape: quit\n";
#endif

    bool running = true;
#if LAB_CHECKPOINT >= 7
    bool paused = false;
    bool singleStepRequested = false;
#endif
#if LAB_CHECKPOINT >= 4
#if LAB_CHECKPOINT <= 5
    bool computeCheckpointRan = false;
#endif
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
    std::uint32_t spawnEpoch = 0U;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#elif LAB_CHECKPOINT >= 4
    std::uint32_t spawnEpoch = 0U;
#if LAB_CHECKPOINT >= 6
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#endif
#endif
    std::uint64_t previousTitleTicks = 0U;

#if LAB_CHECKPOINT >= 8
    auto rebuildParticles = [&](std::size_t requestedCount) -> bool {
        const lab::CapabilityReport capability = lab::validateCapabilities(
            limits,
            lab::makeDispatchPlan(requestedCount)
        );
        if (!capability.allPassed()) {
            diagnostics = "Requested preset does not pass capability validation.";
            return false;
        }
        try {
            std::vector<lab::Particle> particles = lab::makeInitialParticles(requestedCount);
            if (!engine.replaceParticles(gl, particles, diagnostics)) {
                return false;
            }
        } catch (const std::exception& error) {
            diagnostics = std::string("Particle allocation failed: ") + error.what();
            return false;
        }
        particleCount = requestedCount;
        spawnEpoch = 0U;
        return true;
    };
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
#if LAB_CHECKPOINT >= 10
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                paused = true;
                singleStepRequested = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_GAINED) {
                previousTicks = SDL_GetTicksNS();
            }
#endif
            if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat) {
                continue;
            }
            const SDL_Keycode key = event.key.key;
            if (key == SDLK_ESCAPE) {
                running = false;
            }
#if LAB_CHECKPOINT >= 7
            if (key == SDLK_SPACE) {
                paused = !paused;
            }
            if (key == SDLK_N) {
                singleStepRequested = true;
            }
            if (key == SDLK_R) {
#if LAB_CHECKPOINT >= 8
                if (!rebuildParticles(particleCount)) {
                    std::cerr << diagnostics << '\n';
                }
#endif
            }
#endif
#if LAB_CHECKPOINT >= 8
            for (std::size_t preset = 0; preset < kCountPresets.size(); ++preset) {
                const SDL_Keycode presetKey = SDLK_1 + static_cast<SDL_Keycode>(preset);
                if (key == presetKey && !rebuildParticles(kCountPresets[preset])) {
                    std::cerr << diagnostics << '\n';
                }
            }
#endif
#if LAB_CHECKPOINT >= 9
            if (key == SDLK_V) {
                probeValidation = engine.runProbeValidation(gl, diagnostics);
                std::cout << diagnostics << '\n';
            }
#endif
        }

        const std::uint64_t nowTicks = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
        const double elapsedNanoseconds = static_cast<double>(nowTicks - previousTicks);
        const float rawDt = static_cast<float>(elapsedNanoseconds / 1'000'000'000.0);
        previousTicks = nowTicks;
        const float simulationDt = std::min(rawDt, lab::kMaximumFrameDt);
#elif LAB_CHECKPOINT >= 6
        const double elapsedNanoseconds = static_cast<double>(nowTicks - previousTicks);
        const float rawDt = static_cast<float>(elapsedNanoseconds / 1'000'000'000.0);
        previousTicks = nowTicks;
#if LAB_CHECKPOINT >= 7
        const float simulationDt = lab::selectSimulationDt(rawDt, paused, singleStepRequested);
        singleStepRequested = false;
#else
        const float simulationDt = std::min(rawDt, lab::kMaximumFrameDt);
#endif
#endif
#endif

#if LAB_CHECKPOINT >= 6
        if (simulationDt > 0.0F) {
            ++spawnEpoch;
            if (!engine.update(gl, simulationDt, lab::kGravity, spawnEpoch, diagnostics)) {
                std::cerr << diagnostics << '\n';
                running = false;
            }
        }
#elif LAB_CHECKPOINT >= 4
        if (!computeCheckpointRan) {
            ++spawnEpoch;
            if (!engine.update(gl, lab::kSingleStepDt, lab::kGravity, spawnEpoch, diagnostics)) {
                std::cerr << diagnostics << '\n';
                running = false;
            }
            computeCheckpointRan = true;
        }
#elif LAB_CHECKPOINT >= 3
#elif LAB_CHECKPOINT >= 1
        if (!cpuPreview.empty() && simulationDt > 0.0F) {
            ++spawnEpoch;
            stepCpuPreview(cpuPreview, simulationDt, spawnEpoch);
        }
#endif

        int framebufferWidth = 0;
        int framebufferHeight = 0;
        if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
            framebufferWidth = kInitialWidth;
            framebufferHeight = kInitialHeight;
        }

#if LAB_CHECKPOINT >= 5
        engine.render(gl, framebufferWidth, framebufferHeight, 1.0F);
#elif LAB_CHECKPOINT >= 3
        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
#elif LAB_CHECKPOINT >= 1
        drawCpuPreview(gl, cpuPreview, framebufferWidth, framebufferHeight);
#else
        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
#endif

#if LAB_CHECKPOINT >= 8
        engine.pollTimers(gl);
#endif
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }

        if (nowTicks - previousTitleTicks >= 250'000'000U) {
            char title[512]{};
#if LAB_CHECKPOINT >= 10
            const char* validationText = "FAIL";
            if (probeValidation.passed()) {
                validationText = "PASS";
            }
            const char* runState = "running";
            if (paused) {
                runState = "paused";
            }
            std::snprintf(
                title,
                sizeof(title),
                "P38 | N=%zu | %.1f MiB | compute %.3f ms | draw %.3f ms | queries %zu | probe %s | %s",
                particleCount,
                static_cast<double>(lab::particleStorageBytes(particleCount)) / (1024.0 * 1024.0),
                engine.computeMedianMilliseconds(),
                engine.drawMedianMilliseconds(),
                engine.pendingTimingQueries(),
                validationText,
                runState
            );
#elif LAB_CHECKPOINT >= 9
            const char* probeText = "FAIL";
            if (probeValidation.passed()) {
                probeText = "PASS";
            }
            std::snprintf(
                title,
                sizeof(title),
                "P38 | validation probe %s | V: run again",
                probeText
            );
#elif LAB_CHECKPOINT >= 8
            std::snprintf(
                title,
                sizeof(title),
                "P38 | N=%zu | compute %.3f ms | draw %.3f ms | queries %zu",
                particleCount,
                engine.computeMedianMilliseconds(),
                engine.drawMedianMilliseconds(),
                engine.pendingTimingQueries()
            );
#elif LAB_CHECKPOINT >= 5
            std::snprintf(title, sizeof(title), "P38 | GPU-resident particles | N=%zu", particleCount);
#elif LAB_CHECKPOINT >= 3
            std::snprintf(title, sizeof(title), "P38 | SSBO ready | N=%zu", particleCount);
#elif LAB_CHECKPOINT >= 2
            std::snprintf(title, sizeof(title), "P38 | deterministic age spreading | CPU preview");
#elif LAB_CHECKPOINT >= 1
            std::snprintf(title, sizeof(title), "P38 | particle contract | CPU preview");
#else
            std::snprintf(title, sizeof(title), "Project 38 starter | OpenGL 4.3 window");
#endif
            SDL_SetWindowTitle(window, title);
            previousTitleTicks = nowTicks;
        }
    }

    // Cleanup GPU resources khi OpenGL context vẫn còn current.
#if LAB_CHECKPOINT >= 3
    engine.destroy(gl);
#endif
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
