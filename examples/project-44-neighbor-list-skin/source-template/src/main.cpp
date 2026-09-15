#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "neighbor_view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;
    // Khởi tạo SDL và xử lý từng nhánh lỗi trước khi bước vào event loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("P44 - Neighbor List with Skin", 960, 760, SDL_WINDOW_RESIZABLE);
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
    system = pbc::makeGas(64, 44);
#endif
    double skin = 0.4;
    bool paused = true;
    bool frozen = false;
    bool showGrid = true;
    bool dragging = false;
    bool running = true;
    bool failed = false;
    std::uint64_t generation = 0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    const double fixedDt = 0.002;
    std::uint64_t previousTicks = SDL_GetTicksNS();
    int width = 960;
    int height = 760;
    std::string message;
    std::cout << "R: reset | 1/2/3: 64/144/1000 particles | P: two particles | arrows/mouse: move A\n";
#if LAB_CHECKPOINT >= 2
    std::cout << "S: skin | B: rebuild (also leaves frozen mode)\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "G: grid\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "Space: run/pause | N: one step\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "F: freeze list for manual editing only | A: compare with all-pairs\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "T: four bounded work comparisons\n";
#endif
#if LAB_CHECKPOINT >= 9
    std::cout << "V: bounded validation\n";
#endif
#if LAB_CHECKPOINT >= 2
    neighbors::NeighborList list;
#endif
    while (running) {
        bool oneStep = false;
        bool edited = false;
        bool rebuild = false;
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
#if LAB_CHECKPOINT >= 1
                if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3 || key == SDLK_P) {
                    if (key == SDLK_R) {
                        skin = 0.4;
                        showGrid = true;
                    }
                    int count = 64;
                    if (key == SDLK_2) {
                        count = 144;
                    }
                    if (key == SDLK_3) {
                        count = 1000;
                    }
                    system = pbc::makeGas(count, 44);
                    if (key == SDLK_P) {
                        system = pbc::makeGas(4, 44);
                        system.particles.resize(2);
                        system.particles[0].position = {3.0, 6.0};
                        system.particles[1].position = {6.2, 6.0};
                        for (pbc::Particle& particle : system.particles) {
                            particle.unwrapped = particle.position;
                            particle.velocity = {};
                        }
                    }
                    ++generation;
                    paused = true;
                    frozen = false;
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    message.clear();
#if LAB_CHECKPOINT >= 2
                    list = {};
#endif
                }
                pbc::Vec2 delta;
                if (key == SDLK_LEFT)
                    delta.x = -0.05;
                if (key == SDLK_RIGHT)
                    delta.x = 0.05;
                if (key == SDLK_UP)
                    delta.y = -0.05;
                if (key == SDLK_DOWN)
                    delta.y = 0.05;
                if (delta.x != 0.0 || delta.y != 0.0) {
                    pbc::Particle& particle = system.particles[0];
                    particle.position = pbc::wrapPosition(pbc::add(particle.position, delta), system.box);
                    particle.unwrapped = pbc::add(particle.unwrapped, delta);
                    particle.velocity = {};
                    edited = true;
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (key == SDLK_S) {
                    skin += 0.4;
                    if (skin > 1.21) {
                        skin = 0.4;
                    }
                    rebuild = true;
                }
                if (key == SDLK_B) {
                    rebuild = true;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (key == SDLK_G)
                    showGrid = !showGrid;
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_SPACE && !frozen)
                    paused = !paused;
                if (key == SDLK_N && !frozen) {
                    paused = true;
                    oneStep = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_F) {
                    frozen = !frozen;
                    paused = true;
                    // Chỉ đóng băng danh sách cho thao tác tay, không chạy solver sai.
                    if (!frozen)
                        rebuild = true;
                }
                if (key == SDLK_A) {
                    paused = true;
                    const neighbors::Audit audit = neighbors::auditForces(system, list);
                    std::cout << "audit=" << audit.passed << " missing=" << audit.missingPairs << " force error=" << audit.forceError << " U error=" << audit.potentialError << '\n';
                    message = "Audit printed to terminal.";
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_T) {
                    paused = true;
                    for (const double testedSkin : {0.2, 0.4, 0.8, 1.2}) {
                        const neighbors::WorkReport report = neighbors::measureWork(64, testedSkin);
                        std::cout << "skin=" << testedSkin << " pass=" << report.passed << " builds=" << report.rebuilds << " build checks=" << report.buildChecks << " force checks=" << report.forceChecks << " all-pairs=" << report.allPairsChecks << '\n';
                    }
                    message = "Four bounded work runs printed to terminal (64 particles x 200 steps).";
                }
#endif
#if LAB_CHECKPOINT >= 9
                if (key == SDLK_V) {
                    paused = true;
                    std::cout << "Validation passed=" << neighbors::validateNeighborList() << '\n';
                    message = "Validation printed to terminal (36 particles x 200 steps).";
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const SDL_FPoint point = view::toScreen(system.particles[0].position, system.box, view::makeViewport(width, height));
                if (std::hypot(event.button.x - point.x, event.button.y - point.y) < 20.0f) {
                    dragging = true;
                    paused = true;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const view::Viewport viewport = view::makeViewport(width, height);
                // Dùng độ dịch chuột, không minimum image của hai position đã wrap.
                const pbc::Vec2 delta{event.motion.xrel / viewport.side * system.box.width, event.motion.yrel / viewport.side * system.box.height};
                pbc::Particle& particle = system.particles[0];
                particle.position = pbc::wrapPosition(pbc::add(particle.position, delta), system.box);
                particle.unwrapped = pbc::add(particle.unwrapped, delta);
                particle.velocity = {};
                edited = true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                paused = true;
                SDL_CaptureMouse(false);
            }
#endif
        }
        if (edited || rebuild) {
            paused = true;
            accumulator = 0.0;
            oneStep = false;
            message.clear();
        }
#if LAB_CHECKPOINT >= 2
        if (rebuild) {
            list.ready = false;
            frozen = false;
        }
#if LAB_CHECKPOINT >= 4
        if (!frozen && !neighbors::ensureList(system, skin, generation, list)) {
            paused = true;
            message = "Invalid list parameters or particle state.";
        }
#else
        if (!list.ready || edited)
            neighbors::rebuildNaive(system, skin, generation, list);
#endif
#endif
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = double(now - previousTicks) / 1.0e9;
        previousTicks = now;
#if LAB_CHECKPOINT >= 6
        if (!paused && !frozen) {
            accumulator += std::min(elapsed, 0.1) * 0.1;
            droppedTime += std::max(0.0, elapsed - 0.1) * 0.1;
        } else {
            accumulator = 0.0;
        }
        int maximumSteps = 8;
        if (system.particles.size() >= 1000)
            maximumSteps = 1;
        int steps = 0;
        while ((accumulator >= fixedDt || oneStep) && steps < maximumSteps) {
            if (!neighbors::cachedVerletStep(system, list, skin, generation, fixedDt)) {
                paused = true;
                accumulator = 0.0;
                message = "Step rejected. System and list retained. Reset or separate particles.";
                break;
            }
            if (!oneStep)
                accumulator -= fixedDt;
            oneStep = false;
            ++steps;
        }
        if (accumulator >= fixedDt) {
            const double remainder = std::fmod(accumulator, fixedDt);
            droppedTime += accumulator - remainder;
            accumulator = remainder;
        }
#endif
        std::ostringstream status;
        const std::size_t count = system.particles.size();
        std::size_t allPairCount = 0;
        if (count > 1) {
            allPairCount = count * (count - 1) / 2;
        }
        status << "P44  N=" << count << "  all-pairs=" << allPairCount << "  t=" << system.elapsed;
#if LAB_CHECKPOINT >= 2
        status << "\nskin=" << skin << " list=" << list.pairs.size() << " rebuilds=" << list.rebuilds << " build checks=" << list.buildChecks;
#endif
#if LAB_CHECKPOINT >= 3
        const pbc::Evaluation evaluation = neighbors::evaluateListed(system, list);
        status << " active=" << evaluation.activePairs << " valid=" << evaluation.valid;
#endif
#if LAB_CHECKPOINT >= 4
        status << "\nDmax=" << neighbors::maximumDisplacement(system, list) << " threshold=" << skin * 0.5;
#endif
#if LAB_CHECKPOINT >= 6
        status << " force checks=" << list.forceChecks << " dropped=" << droppedTime;
#endif
        status.put('\n');
        status << message;
        if (!SDL_GetWindowSize(window, &width, &height)) {
            failed = true;
            break;
        }
        const view::Viewport viewport = view::makeViewport(width, height);
#if LAB_CHECKPOINT >= 2
        const bool drawn = view::draw(renderer, system, viewport, skin, list, showGrid, status.str());
#else
        const bool drawn = view::draw(renderer, system, viewport, skin, showGrid, status.str());
#endif
        if (!drawn || !SDL_RenderPresent(renderer)) {
            failed = true;
            break;
        }
        SDL_Delay(16);
        (void)oneStep;
        (void)elapsed;
    }
    // Giải phóng theo thứ tự ngược với khởi tạo, kể cả khi renderer báo lỗi.
    if (failed)
        std::cerr << SDL_GetError() << '\n';
    (void)paused;
    (void)frozen;
    (void)dragging;
    (void)generation;
    (void)accumulator;
    (void)droppedTime;
    (void)fixedDt;
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
