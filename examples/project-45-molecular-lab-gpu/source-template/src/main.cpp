#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include "gpu_engine.hpp"
#include "gpu_validation.hpp"
#include "particle_view.hpp"

#include <SDL3/SDL_main.h>

#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string_view>

int main(int argc, char* argv[]) {
    using namespace molecular;
    bool verify = false;
    std::uint32_t initialCount = 64;
#if LAB_CHECKPOINT >= 10
    bool rebuildCase = false;
    for (int i = 1; i < argc; ++i) {
        const std::string_view argument = argv[i];
        if (argument == "--verify-gpu") {
            verify = true;
        } else if (argument == "--tail-case") {
            initialCount = 257;
        } else if (argument == "--rebuild-case") {
            rebuildCase = true;
        } else {
            std::cerr << "Use --verify-gpu [--tail-case|--rebuild-case]. Large runs are selected interactively.\n";
            return EXIT_FAILURE;
        }
    }
#else
    (void)argc;
    (void)argv;
#endif

    // Khởi tạo SDL và OpenGL 4.3 core; không dùng SDL_Renderer cùng GL context.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (verify) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Molecular Lab GPU — 64 particles", 1100, 760, flags);
    SDL_GLContext context = nullptr;
    if (window) {
        context = SDL_GL_CreateContext(window);
    }
    if (!window || !context) {
        std::cerr << "OpenGL 4.3 required: " << SDL_GetError() << '\n';
        if (window) {
            SDL_DestroyWindow(window);
        }
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::GlApi gl{};
    if (!gl.load()) {
        std::cerr << "Missing GL entry point: " << gl.missingFunction << '\n';
        SDL_GL_DestroyContext(context);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_GL_SetSwapInterval(0);
    std::cout << "GPU: " << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << '\n';
    std::cout << "Space run/pause | N step | C cancel | R reset | Home camera | drag pan | wheel zoom\n";
    std::cout << "1:64 2:100000 3:500000 4:1000000 5:5000000 (from checkpoint 9); B: bounded benchmark (10)\n";
    int exitCode = EXIT_SUCCESS;
    Engine engine{};
    ParticleView view{};
    Features features{};
#if LAB_CHECKPOINT >= 4
    features.force = true;
#endif
#if LAB_CHECKPOINT >= 5
    features.grid = true;
#endif
#if LAB_CHECKPOINT >= 6
    features.integrate = true;
#endif
#if LAB_CHECKPOINT >= 7
    features.cache = true;
#endif
#if LAB_CHECKPOINT >= 8
    features.diagnostics = true;
#endif
    Plan preview = makePlan(initialCount);
    view.camera.reset(preview);
    try {
#if LAB_CHECKPOINT >= 2
        const std::string directory = COURSE_SHADER_DIRECTORY;
        engine.initialize(gl, directory, features);
        engine.reset(gl, initialCount);
#endif
#if LAB_CHECKPOINT >= 3
        view.load(gl, directory);
#endif
        bool running = true;
        bool playing = false;
        bool dragging = false;
        bool measuring = false;
#if LAB_CHECKPOINT >= 10
        std::uint64_t lastMeasuredStep = 0;
        std::uint64_t benchmarkStartStep = 0;
        double measuredGpu = 0;
        double measuredWall = 0;
        auto benchmarkStarted = GpuQueue::Clock::now();
        const auto verificationStarted = GpuQueue::Clock::now();
        std::uint64_t verifiedSteps = 0;
        bool verifiedInitial = false;
        std::vector<Float4> previousPositions{};
        std::vector<Float4> previousVelocities{};
#endif
        Uint64 lastTitle = 0;

        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    if (event.key.key == SDLK_ESCAPE) {
                        running = false;
                    }
                    if (event.key.key == SDLK_SPACE) {
                        playing = !playing;
                    }
                    if (event.key.key == SDLK_N) {
                        engine.step(gl);
                    }
                    if (event.key.key == SDLK_C) {
                        playing = false;
                        measuring = false;
                        engine.cancel();
                    }
                    if (event.key.key == SDLK_HOME) {
                        view.camera.reset(preview);
                    }
#if LAB_CHECKPOINT >= 2
                    if (event.key.key == SDLK_R && !engine.busy()) {
                        playing = false;
                        measuring = false;
                        engine.reset(gl, preview.count);
                    }
#endif
#if LAB_CHECKPOINT >= 9
                    if (!engine.busy() && event.key.key >= SDLK_1 && event.key.key <= SDLK_5) {
                        constexpr std::array counts{64U, 100000U, 500000U, 1000000U, 5000000U};
                        const auto requested = counts.at(event.key.key - SDLK_1);
                        playing = false;
                        measuring = false;
                        try {
                            engine.reset(gl, requested);
                            if (engine.busy()) {
                                preview = engine.storage.plan;
                                view.camera.reset(preview);
                            }
                        } catch (const std::exception& error) {
                            engine.message = error.what();
                        }
                    }
#endif
#if LAB_CHECKPOINT >= 10
                    if (event.key.key == SDLK_B && engine.ready && !engine.busy() && !engine.failed) {
                        playing = false;
                        measuring = true;
                        benchmarkStartStep = engine.steps;
                        lastMeasuredStep = engine.steps;
                        measuredGpu = 0;
                        measuredWall = 0;
                        benchmarkStarted = GpuQueue::Clock::now();
                    }
#endif
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = true;
                    SDL_CaptureMouse(true);
                }
                if ((event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) || event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                    playing = false;
                }
                int logicalWidth = 1;
                int logicalHeight = 1;
                SDL_GetWindowSize(window, &logicalWidth, &logicalHeight);
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    view.camera.pan(event.motion.xrel, event.motion.yrel, logicalHeight);
                }
                if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                    float mouseX = 0;
                    float mouseY = 0;
                    SDL_GetMouseState(&mouseX, &mouseY);
                    view.camera.zoom(mouseX, mouseY, logicalWidth, logicalHeight, event.wheel.y);
                }
            }
            if (!running) {
                break;
            }
            engine.tick(gl);
            if (engine.failed) {
                playing = false;
                measuring = false;
                if (verify) {
                    throw std::runtime_error(engine.message);
                }
            }

#if LAB_CHECKPOINT >= 10
            if (verify) {
                if (GpuQueue::Clock::now() - verificationStarted > std::chrono::seconds(15)) {
                    throw std::runtime_error("GPU verification exceeded 15 seconds.");
                }
                if (engine.ready && !engine.busy()) {
                    if (!verifiedInitial || engine.steps > verifiedSteps) {
                        if (!validateForces(gl, engine) || !validateDiagnostics(gl, engine)) {
                            throw std::runtime_error("GPU force/diagnostic validation failed.");
                        }
                        if (verifiedInitial && !validateStep(gl, engine, previousPositions, previousVelocities)) {
                            throw std::runtime_error("GPU/CPU Verlet trajectory mismatch.");
                        }
                        verifiedInitial = true;
                        verifiedSteps = engine.steps;
                    }
                    if (engine.steps == 3) {
                        if (rebuildCase && engine.rebuilds < 2) {
                            throw std::runtime_error("Half-skin GPU rebuild was not triggered.");
                        }
                        std::cout << "GPU validation passed: initial + 3 steps, CPU oracle and reduction.\n";
                        running = false;
                    } else {
                        const auto& bank = engine.storage.banks.at(engine.current);
                        previousPositions = engine.readParticles(gl, bank.positions);
                        previousVelocities = engine.readParticles(gl, bank.velocities);
                        if (rebuildCase && engine.steps == 0) {
                            // Một hạt đi 0.08 mỗi bước: bước thứ ba bắt buộc vượt skin/2.
                            previousVelocities[0].x = 80.0F;
                            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, bank.velocities);
                            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(previousVelocities.size() * sizeof(Float4)), previousVelocities.data());
                        }
                        engine.step(gl);
                    }
                }
            }
            if (measuring) {
                if (GpuQueue::Clock::now() - benchmarkStarted > std::chrono::seconds(20)) {
                    engine.cancel();
                    measuring = false;
                    engine.message = "Benchmark cancelled after 20 seconds; incomplete samples are not reported.";
                } else if (!engine.busy()) {
                    if (engine.steps > lastMeasuredStep) {
                        lastMeasuredStep = engine.steps;
                        if (engine.steps > benchmarkStartStep + 1) {
                            measuredGpu += engine.gpuMilliseconds;
                            measuredWall += engine.wallMilliseconds;
                        }
                    }
                    if (engine.steps >= benchmarkStartStep + 6) {
                        measuring = false;
                        std::ostringstream result{};
                        result << "5 samples (after 1 warm-up): GPU " << measuredGpu / 5 << " ms/step; wall " << measuredWall / 5 << " ms/step.";
                        engine.message = result.str();
                        std::cout << engine.message << '\n';
                    } else {
                        engine.step(gl);
                    }
                }
            }
#endif
            if (playing && !engine.busy() && !measuring) {
                engine.step(gl);
            }

            int width = 1;
            int height = 1;
            SDL_GetWindowSizeInPixels(window, &width, &height);
            if (!verify && width > 0 && height > 0 && !engine.failed && !engine.busy()) {
                gl.Viewport(0, 0, width, height);
                gl.ClearColor(0.035F, 0.05F, 0.09F, 1.0F);
                gl.Clear(GL_COLOR_BUFFER_BIT);
#if LAB_CHECKPOINT >= 3
                if (engine.ready) {
                    view.draw(gl, engine.storage, engine.current, width, height);
                }
#elif LAB_CHECKPOINT >= 1
                drawCpuPreview(gl, preview, view.camera, width, height);
#endif
                SDL_GL_SwapWindow(window);
            }
            if (!verify && SDL_GetTicks() - lastTitle > 200) {
                std::ostringstream title{};
                title << std::fixed << std::setprecision(3) << "N=" << preview.count << " drawn=" << view.drawn << " step=" << engine.steps << " phase=" << engine.phase();
                title << " E=" << engine.totals.x + engine.totals.y << " P=(" << engine.totals.z << ',' << engine.totals.w << ") rebuilds=" << engine.rebuilds;
                title << " D=" << engine.maximumDisplacement << " occupancy=" << engine.maximumOccupancy << " MiB=" << static_cast<double>(preview.residentBytes) / 1048576.0;
                title << " | " << engine.message;
                SDL_SetWindowTitle(window, title.str().c_str());
                lastTitle = SDL_GetTicks();
            }
            // Nhường CPU; không chờ GPU trong một vòng lặp bận.
            SDL_Delay(1);
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        exitCode = EXIT_FAILURE;
    }

    // Giải phóng GL resources khi context vẫn còn hiện hành.
    view.destroy(gl);
    engine.destroy(gl);
    SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return exitCode;
}
