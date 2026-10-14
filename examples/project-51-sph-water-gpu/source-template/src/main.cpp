#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#include "engine.hpp"
#include "force-verification.hpp"
#include "validation.hpp"
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string_view>

int main(int argc, char** argv) {
    using namespace water3;
    bool verify = false, tail = false;
#if LAB_CHECKPOINT >= 12
    VerifyCase verifyCase = VerifyCase::lattice;
#endif
    for (int i = 1; i < argc; ++i) {
#if LAB_CHECKPOINT >= 12
        const std::string_view argument = argv[i];
        if (argument == "--verify-gpu") {
            verify = true;
        } else if (argument == "--tail-case") {
            tail = true;
        } else if (argument == "--verify-acoustic") {
            verify = true;
            verifyCase = VerifyCase::acoustic;
        } else if (argument == "--verify-force") {
            verify = true;
            verifyCase = VerifyCase::force;
        } else {
            std::cerr << "Use --verify-gpu [--tail-case], --verify-acoustic or --verify-force. Large runs require interactive confirmation.\n";
            return EXIT_FAILURE;
        }
#else
        (void)argv;
#endif
    }

    // Khởi tạo SDL và OpenGL, không tạo SDL_Renderer trong cùng cửa sổ.
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
    SDL_Window* window = SDL_CreateWindow("Project51 - SPH3D GPU", 1000, 760, flags);
    SDL_GLContext context = nullptr;
    if (window) {
        context = SDL_GL_CreateContext(window);
    }
    if (!context) {
        std::cerr << "OpenGL4.3 required: " << SDL_GetError() << '\n';
        if (window) {
            SDL_DestroyWindow(window);
        }
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::GlApi gl;
    if (!gl.load()) {
        std::cerr << gl.missingFunction << '\n';
        SDL_GL_DestroyContext(context);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_GL_SetSwapInterval(0);
    std::cout << "GPU: " << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << "\nN compute/step | Space run (10) | C cancel future ticks | R reset | Home camera | drag orbit | wheel zoom\n";

    Engine engine;
    View view;
    Plan plan = makePlan(4);
#if LAB_CHECKPOINT >= 2
    plan = makePlan();
#endif
    if (tail) {
        plan = makePlan(8, 257);
    }
    bool running = true, playing = false, dragging = false, failed = false;
    [[maybe_unused]] bool measuring = false;
    [[maybe_unused]] std::uint64_t measuredSteps = 0;
    [[maybe_unused]] double measuredMs = 0;
    [[maybe_unused]] std::uint32_t armedSide = 0;
#if LAB_CHECKPOINT >= 12
    std::vector<Float4> oldPosition, oldVelocity;
    std::uint64_t checkedSteps = 0;
    const auto verificationStart = std::chrono::steady_clock::now();
#endif

    try {
#if LAB_CHECKPOINT >= 2
        engine.initialize(gl, COURSE_SHADER_DIRECTORY);
        engine.reset(gl, plan);
#endif
#if LAB_CHECKPOINT >= 3
        view.load(gl, COURSE_SHADER_DIRECTORY);
#endif
        while (running && !failed) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    if (event.key.key == SDLK_ESCAPE) {
                        running = false;
                    }
                    if (event.key.key == SDLK_HOME) {
                        view.camera = Camera{};
                    }
                    if (event.key.key == SDLK_LEFT) {
                        view.camera.yaw -= 0.1F;
                    }
                    if (event.key.key == SDLK_RIGHT) {
                        view.camera.yaw += 0.1F;
                    }
                    if (event.key.key == SDLK_UP) {
                        view.camera.pitch = std::clamp(view.camera.pitch + 0.1F, -1.2F, 1.2F);
                    }
                    if (event.key.key == SDLK_DOWN) {
                        view.camera.pitch = std::clamp(view.camera.pitch - 0.1F, -1.2F, 1.2F);
                    }
                    if (event.key.key == SDLK_C) {
                        playing = false;
                        measuring = false;
                        armedSide = 0;
                    }
#if LAB_CHECKPOINT >= 2
                    if (event.key.key == SDLK_R && !engine.queue.pending()) {
                        playing = false;
                        measuring = false;
                        armedSide = 0;
                        engine.reset(gl, plan);
                    }
#endif
#if LAB_CHECKPOINT >= 5
                    if (event.key.key == SDLK_N) {
                        playing = false;
                        engine.submit(gl);
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    if (!engine.queue.pending() && event.key.key == SDLK_Q) {
                        playing = false;
                        engine.settings.alpha += 0.15;
                        if (engine.settings.alpha > 0.3) {
                            engine.settings.alpha = 0;
                        }
                    }
                    if (!engine.queue.pending() && event.key.key == SDLK_F) {
                        playing = false;
                        if (engine.settings.soundSpeed == 8) {
                            engine.settings.soundSpeed = 12;
                        } else if (engine.settings.soundSpeed == 12) {
                            engine.settings.soundSpeed = 20;
                        } else {
                            engine.settings.soundSpeed = 8;
                        }
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    if (event.key.key == SDLK_G && !engine.queue.pending() && plan.count <= 512) {
                        playing = false;
                        engine.grid = !engine.grid;
                    }
#endif
#if LAB_CHECKPOINT >= 10
                    if (event.key.key == SDLK_SPACE) {
                        playing = !playing;
                        armedSide = 0;
                    }
                    if (event.key.key == SDLK_B && !engine.queue.pending()) {
                        playing = false;
                        measuring = true;
                        measuredSteps = 0;
                        measuredMs = 0;
                    }
#endif
#if LAB_CHECKPOINT >= 11
                    if (event.key.key >= SDLK_1 && event.key.key <= SDLK_4) {
                        constexpr std::array sides{8U, 32U, 48U, 100U};
                        armedSide = sides[event.key.key - SDLK_1];
                        playing = false;
                        measuring = false;
                        const auto requested = makePlan(armedSide);
                        std::cout << "Confirm with Enter: N=" << requested.count << " residentMiB=" << requested.residentBytes / (1024.0 * 1024) << ". C cancels.\n";
                    }
                    if (event.key.key == SDLK_RETURN && armedSide && !engine.queue.pending()) {
                        const auto requested = makePlan(armedSide);
                        armedSide = 0;
                        try {
                            engine.reset(gl, requested);
                            plan = requested;
                            engine.grid = true;
                        } catch (const std::exception& error) {
                            std::cerr << error.what() << '\n';
                        }
                    }
#endif
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = true;
                    SDL_CaptureMouse(true);
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    view.camera.yaw += event.motion.xrel * 0.005F;
                    view.camera.pitch = std::clamp(view.camera.pitch - event.motion.yrel * 0.005F, -1.2F, 1.2F);
                }
                if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                    view.camera.zoom = std::clamp(view.camera.zoom * std::exp(event.wheel.y * 0.1F), 0.4F, 3.0F);
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    playing = false;
                    measuring = false;
                    armedSide = 0;
                }
            }
            if (!running) {
                break;
            }
#if LAB_CHECKPOINT >= 2
            const bool completed = engine.poll(gl);
#if LAB_CHECKPOINT >= 10
            if (completed && measuring && engine.steps > 0) {
                ++measuredSteps;
                measuredMs += engine.queue.milliseconds;
                if (measuredSteps == 8) {
                    measuring = false;
                    std::cout << "8 ticks GPU mean ms=" << measuredMs / 8 << " simulated s=" << engine.time << '\n';
                }
            }
#else
            (void)completed;
#endif
#if LAB_CHECKPOINT >= 12
            if (verify) {
                if (std::chrono::steady_clock::now() - verificationStart > std::chrono::seconds(15)) {
                    throw std::runtime_error("GPU verification total timeout");
                }
                if (engine.ready && !engine.queue.pending()) {
                    if (engine.steps > checkedSteps) {
                        bool valid = false;
                        if (verifyCase == VerifyCase::force) {
                            valid = validateForceFixture(gl, engine, oldPosition, oldVelocity);
                        } else {
                            valid = validateGpu(gl, engine, oldPosition, oldVelocity);
                        }
                        if (!valid) {
                            failed = true;
                        }
                        checkedSteps = engine.steps;
                    }
                    if (checkedSteps == 2) {
                        running = false;
                    } else if (!failed) {
                        oldPosition = readVector<Float4>(gl, engine.storage.positions[engine.current], plan.count);
                        oldVelocity = readVector<Float4>(gl, engine.storage.velocities[engine.current], plan.count);
                        if (checkedSteps == 0 && verifyCase == VerifyCase::acoustic) {
                            prepareVerifyCase(verifyCase, oldPosition, oldVelocity);
                            const auto expected = evaluate(plan, oldPosition, oldVelocity, engine.settings);
                            const auto extrema = oracleStats(oldVelocity, expected);
                            const double acoustic = 0.25 * plan.h / (engine.settings.soundSpeed + extrema.speed);
                            const double forceBound = 0.25 * std::sqrt(plan.h / std::max(extrema.acceleration, 1e-12));
                            if (!(acoustic < std::min(maxDt, forceBound))) {
                                throw std::runtime_error("Requested timestep bound is not active in the fixture");
                            }
                            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, engine.storage.positions[engine.current]);
                            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, oldPosition.size() * sizeof(Float4), oldPosition.data());
                            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, engine.storage.velocities[engine.current]);
                            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, oldVelocity.size() * sizeof(Float4), oldVelocity.data());
                            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
                        }
                        if (verifyCase == VerifyCase::force) {
                            submitForceFixture(gl, engine);
                        } else {
                            engine.submit(gl);
                        }
                    }
                }
            }
#endif
            // Do not enqueue rendering behind a pending long GPU batch.
            if (engine.queue.pending()) {
                SDL_Delay(1);
                continue;
            }
#endif
            int width = 1, height = 1;
            SDL_GetWindowSizeInPixels(window, &width, &height);
            gl.Viewport(0, 0, width, height);
            gl.ClearColor(0.04F, 0.06F, 0.12F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
#if LAB_CHECKPOINT >= 3
            view.draw(gl, engine.storage, engine.current, width, height);
#elif LAB_CHECKPOINT >= 1
            view.drawn = 64;
            drawPreview(gl, view.camera, width, height);
#endif
            SDL_GL_SwapWindow(window);
            std::ostringstream title;
            title << "SPH3D | N=" << plan.count << " drawn=" << view.drawn << " ticks=" << engine.steps << " t=" << engine.time << " dt=" << engine.lastDt << " GPUms=" << engine.queue.milliseconds << " rhoMax(before tick)=" << engine.lastStats.z << " paused=" << !playing;
            if (armedSide) {
                title << " CONFIRM ENTER N=" << makePlan(armedSide).count;
            }
            SDL_SetWindowTitle(window, title.str().c_str());
#if LAB_CHECKPOINT >= 10
            if ((playing || measuring) && !verify && !engine.queue.pending()) {
                engine.submit(gl);
            }
#endif
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }

    // Giải phóng mọi GL object trước context, rồi đóng SDL window.
    SDL_CaptureMouse(false);
    view.destroy(gl);
    engine.destroy(gl);
    SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
