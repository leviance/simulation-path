#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>

#include "view.hpp"

#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;

    // Khởi tạo SDL theo thứ tự; lỗi ở đâu chỉ dọn những tài nguyên đã tạo tới đó.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 43 - Periodic Molecular Box", 960, 720, SDL_WINDOW_RESIZABLE);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    pbc::System system;
#if LAB_CHECKPOINT >= 1
    system = pbc::makePair();
#endif
    bool running = true;
    bool failed = false;
    bool paused = true;
    bool showImages = false;
    bool dragging = false;
    int width = 960;
    int height = 720;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    double fixedDt = 0.001;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 7
    std::vector<view::TraceSample> trace;
    double nextTraceTime = 0.0;
#endif
    std::cout << "SPACE pause | N one step | R reset | drag atom A | ESC quit\n";
#if LAB_CHECKPOINT >= 5
    std::cout << "1 pair | 2 gas 64 | 3 gas 144 | 4 gas 1000 | B one free particle | D dt\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "G periodic images (display only)\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "Trace: blue = wrapped x, yellow = unwrapped x. Reset/preset clears history.\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "V bounded energy/momentum check (36 particles, 400 steps)\n";
#endif
    while (running) {
        bool singleStep = false;
        bool resetRequested = false;
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const SDL_Keycode key = event.key.key;
                if (key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 2
                if (key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (key == SDLK_N) {
                    paused = true;
                    singleStep = true;
                }
#endif
                if (key == SDLK_R) {
#if LAB_CHECKPOINT >= 1
                    system = pbc::makePair();
#else
                    system = {};
#endif
                    fixedDt = 0.001;
                    resetRequested = true;
                }
#if LAB_CHECKPOINT >= 5
                if (key == SDLK_1) {
                    system = pbc::makePair();
                    resetRequested = true;
                }
                if (key == SDLK_2 || key == SDLK_3 || key == SDLK_4) {
                    int count = 64;
                    if (key == SDLK_3) {
                        count = 144;
                    }
                    if (key == SDLK_4) {
                        count = 1000;
                    }
                    system = pbc::makeGas(count);
                    resetRequested = true;
                }
                if (key == SDLK_B) {
                    system = pbc::makePair();
                    system.particles.resize(1);
                    system.particles[0].velocity = {-8.0, 5.0};
                    resetRequested = true;
                }
                if (key == SDLK_D) {
                    fixedDt *= 2.0;
                    if (fixedDt > 0.008) {
                        fixedDt = 0.001;
                    }
                    resetRequested = true;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_G) {
                    showImages = !showImages;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_V) {
                    paused = true;
                    const pbc::ValidationReport report = pbc::validateRun();
                    std::cout << std::boolalpha << "Validation passed=" << report.passed << " max energy error=" << report.maximumEnergyError << " momentum error=" << report.momentumError << '\n';
                    resetRequested = true;
                }
#endif
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !system.particles.empty()) {
                const view::Viewport viewport = view::makeViewport(width, height);
                const SDL_FPoint a = view::toScreen(system.particles[0].position, system.box, viewport);
                if (std::hypot(event.button.x - a.x, event.button.y - a.y) < 20.0f) {
                    dragging = true;
                    paused = true;
                    if (!SDL_CaptureMouse(true)) {
                        std::cerr << "Mouse capture unavailable: " << SDL_GetError() << '\n';
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const view::Viewport viewport = view::makeViewport(width, height);
                system.particles[0].position = pbc::wrapPosition(view::toWorld(event.motion.x, event.motion.y, system.box, viewport), system.box);
                system.particles[0].velocity = {};
#if LAB_CHECKPOINT >= 7
                system.particles[0].unwrapped = system.particles[0].position;
#endif
                resetRequested = true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                SDL_CaptureMouse(false);
                paused = true;
            }
#endif
        }
        if (resetRequested) {
            paused = true;
            singleStep = false;
            accumulator = 0.0;
            droppedTime = 0.0;
#if LAB_CHECKPOINT >= 7
            trace.clear();
            nextTraceTime = system.elapsed;
#endif
        }
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = double(now - previousTicks) / 1.0e9;
        previousTicks = now;
#if LAB_CHECKPOINT >= 2
        // Playback 0,1 đơn vị mô phỏng/giây thực. Preset lớn chỉ làm một bước/frame.
        int maximumSteps = 8;
        if (system.particles.size() >= 1000) {
            maximumSteps = 1;
        }
        if (!paused) {
            accumulator += std::min(elapsed, 0.1) * 0.1;
            droppedTime += std::max(0.0, elapsed - 0.1) * 0.1;
        } else {
            accumulator = 0.0;
        }
        int steps = 0;
        while ((accumulator >= fixedDt || singleStep) && steps < maximumSteps) {
#if LAB_CHECKPOINT >= 5
            if (!pbc::verletStep(system, fixedDt)) {
                std::cerr << "Step rejected; last valid state retained. Reset or separate overlapping particles.\n";
                paused = true;
                accumulator = 0.0;
                break;
            }
#else
            for (pbc::Particle& particle : system.particles) {
                pbc::ballisticStep(particle, system.box, fixedDt);
            }
            system.elapsed += fixedDt;
#endif
            if (!singleStep) {
                accumulator -= fixedDt;
            }
            singleStep = false;
            ++steps;
#if LAB_CHECKPOINT >= 7
            if (!system.particles.empty() && system.elapsed >= nextTraceTime) {
                view::appendTrace(trace, system.particles[0]);
                nextTraceTime = system.elapsed + 0.01;
            }
#endif
        }
        if (accumulator >= fixedDt) {
            const double remainder = std::fmod(accumulator, fixedDt);
            droppedTime += accumulator - remainder;
            accumulator = remainder;
        }
#else
        (void)elapsed;
        (void)singleStep;
        (void)accumulator;
        (void)droppedTime;
        (void)fixedDt;
#endif
        if (!SDL_GetWindowSize(window, &width, &height)) {
            failed = true;
            break;
        }
        const view::Viewport viewport = view::makeViewport(width, height);
        if (!view::drawScene(renderer, system, viewport, showImages)) {
            failed = true;
            break;
        }
#if LAB_CHECKPOINT >= 7
        if (!view::drawTrace(renderer, trace, width, height, system.box.width)) {
            failed = true;
            break;
        }
#endif
        std::ostringstream title;
        title << std::fixed << std::setprecision(3) << "P43 | SPACE pause, N step, R reset | N=" << system.particles.size() << " t=" << system.elapsed;
#if LAB_CHECKPOINT >= 4
        const pbc::Evaluation evaluation = pbc::evaluate(system);
        title << " pairs=" << evaluation.evaluatedPairs << " active=" << evaluation.activePairs << " valid=" << evaluation.valid;
#endif
#if LAB_CHECKPOINT >= 5
        title << " E=" << pbc::kineticEnergy(system) + evaluation.potential << " |P|=" << pbc::length(pbc::momentum(system)) << " dt=" << fixedDt << " dropped=" << droppedTime;
#endif
        if (!SDL_SetWindowTitle(window, title.str().c_str())) {
            failed = true;
            break;
        }
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
            break;
        }
        SDL_Delay(16);
    }
    if (failed) {
        std::cerr << SDL_GetError() << '\n';
    }
    // Giải phóng renderer trước window, sau đó mới kết thúc SDL.
    (void)paused;
    (void)dragging;
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
