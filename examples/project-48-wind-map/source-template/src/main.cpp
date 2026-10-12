#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string>

int main(int, char**) {
    // Khởi tạo SDL, window và renderer; dọn tài nguyên nếu một bước thất bại.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 48 - Wind Map", 1000, 750, SDL_WINDOW_RESIZABLE);
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
    if (!SDL_SetRenderLogicalPresentation(renderer, 800, 600, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    wind::Field field;
    wind::Layer layer = wind::initialLayer();
#endif
#if LAB_CHECKPOINT >= 2
    wind::Scene scene = wind::initialScene();
    wind::populate(field, scene);
    int cursorX = 16;
    int cursorY = 12;
    bool dragging = false;
    std::cout << "P: preset | arrows / mouse: probe | I: print values | R: reset\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "H: bowl / hill potential | L: display layer\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "G: 33x25 / 65x49 grid; I prints gradient error when applicable\n";
#endif
#if LAB_CHECKPOINT >= 7
    auto particles = wind::makeParticles();
    bool paused = true;
    double accumulator = 0;
    double dropped = 0;
    std::uint64_t tick = 0;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Space: run/pause | N: one fixed step (1/60s)\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "Mouse drag / Enter: place vortex | B: enable | S: reverse vortex\n";
#endif
#if LAB_CHECKPOINT >= 9
    std::string report = "not run";
    std::cout << "V: bounded reference validation on separate grids\n";
#endif

    while (running && !failed) {
#if LAB_CHECKPOINT >= 2
        bool changed = false;
#endif
#if LAB_CHECKPOINT >= 7
        bool singleStep = false;
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_P) {
#if LAB_CHECKPOINT >= 3
                    const int count = 6;
#else
                    const int count = 5;
#endif
                    scene.preset = static_cast<wind::Preset>((static_cast<int>(scene.preset) + 1) % count);
                    changed = true;
                }
                if (event.key.key == SDLK_R) {
                    scene = wind::initialScene();
                    field = wind::Field();
                    layer = wind::initialLayer();
                    cursorX = 16;
                    cursorY = 12;
                    changed = true;
                }
                if (event.key.key == SDLK_LEFT) {
                    cursorX = std::max(0, cursorX - 1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    cursorX = std::min(field.width - 1, cursorX + 1);
                }
                if (event.key.key == SDLK_UP) {
                    cursorY = std::min(field.height - 1, cursorY + 1);
                }
                if (event.key.key == SDLK_DOWN) {
                    cursorY = std::max(0, cursorY - 1);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_H) {
                    if (scene.potential == wind::Potential::Bowl) {
                        scene.potential = wind::Potential::Hill;
                    } else {
                        scene.potential = wind::Potential::Bowl;
                    }
                    changed = true;
                }
                if (event.key.key == SDLK_L) {
#if LAB_CHECKPOINT >= 5
                    const int maximum = 3;
#elif LAB_CHECKPOINT >= 4
                    const int maximum = 2;
#else
                    const int maximum = 1;
#endif
                    layer = static_cast<wind::Layer>((static_cast<int>(layer) + 1) % (maximum + 1));
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_G) {
                    if (field.width == 33) {
                        field = wind::Field(65, 49);
                    } else {
                        field = wind::Field();
                    }
                    cursorX = (field.width - 1) / 2;
                    cursorY = (field.height - 1) / 2;
                    changed = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0;
                }
                if (event.key.key == SDLK_N) {
                    paused = true;
                    accumulator = 0;
                    singleStep = true;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_B) {
                    scene.vortex = !scene.vortex;
                    changed = true;
                }
                if (event.key.key == SDLK_S) {
                    scene.strength = -scene.strength;
                    changed = true;
                }
                if (event.key.key == SDLK_RETURN) {
                    scene.center = wind::world(field, cursorX, cursorY);
                    scene.vortex = true;
                    changed = true;
                }
#endif
#if LAB_CHECKPOINT >= 9
                if (event.key.key == SDLK_V) {
                    paused = true;
                    accumulator = 0;
                    const auto result = wind::validateMap();
                    report = "FAIL";
                    if (result.passed) {
                        report = "PASS";
                    }
                    std::cout << report << " | derivative error=" << result.derivativeError << " | curl(grad)=" << result.gradientCurl << " | gradient interior " << result.coarse.interior << " -> " << result.refined.interior << " | boundary " << result.coarse.boundary << " -> " << result.refined.boundary << '\n';
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_I) {
                    // In ra console để số đo không bị cắt bởi chiều dài window title.
                    const auto i = field.index(cursorX, cursorY);
                    const auto p = wind::world(field, cursorX, cursorY);
                    std::cout << "node " << cursorX << ',' << cursorY << " world " << p.x << ',' << p.y << " v=" << field.vx[i] << ',' << field.vy[i];
#if LAB_CHECKPOINT >= 3
                    std::cout << " phi=" << field.scalar[i];
#endif
#if LAB_CHECKPOINT >= 4
                    std::cout << " div=" << wind::divergence(field, cursorX, cursorY);
#endif
#if LAB_CHECKPOINT >= 5
                    std::cout << " curl_z=" << wind::curl(field, cursorX, cursorY);
#endif
#if LAB_CHECKPOINT >= 6
                    if (scene.preset == wind::Preset::Gradient && !scene.vortex) {
                        const auto error = wind::gradientError(field, scene.potential);
                        std::cout << " error interior=" << error.interior << " boundary=" << error.boundary;
                    }
#endif
                    std::cout << '\n';
                }
                if (event.type == SDL_EVENT_KEY_DOWN && changed) {
                    wind::populate(field, scene);
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture unavailable: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
                float mouseX = 0;
                float mouseY = 0;
                SDL_GetMouseState(&mouseX, &mouseY);
                wind::Vec2 p;
                if (wind::mouseWorld(renderer, mouseX, mouseY, p)) {
                    cursorX = std::clamp(static_cast<int>(std::lround((p.x + 2) / field.dx)), 0, field.width - 1);
                    cursorY = std::clamp(static_cast<int>(std::lround((p.y + 1.5) / field.dy)), 0, field.height - 1);
#if LAB_CHECKPOINT >= 8
                    if (dragging) {
                        scene.center = p;
                        scene.vortex = true;
                        changed = true;
                    }
#endif
                }
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 7
                paused = true;
                accumulator = 0;
#endif
            }
#endif
        }

#if LAB_CHECKPOINT >= 2
        if (changed) {
            wind::populate(field, scene);
#if LAB_CHECKPOINT >= 7
            particles = wind::makeParticles();
            tick = 0;
            dropped = 0;
            paused = true;
            accumulator = 0;
            singleStep = false;
#endif
#if LAB_CHECKPOINT >= 9
            report = "not run";
#endif
        }
#endif
#if LAB_CHECKPOINT >= 7
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
        if (singleStep) {
            wind::advanceParticles(field, particles);
            ++tick;
        }
        if (!paused) {
            const auto plan = wind::planSteps(accumulator, elapsed);
            accumulator = plan.remainder;
            dropped += plan.dropped;
            for (int step = 0; step < plan.steps; ++step) {
                wind::advanceParticles(field, particles);
                ++tick;
            }
        }
#endif
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
            failed = true;
        }
#if LAB_CHECKPOINT >= 1
        if (!wind::drawField(renderer, field, layer)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 2
        if (!SDL_SetRenderDrawColor(renderer, 120, 255, 180, 255) || !wind::drawArrow(renderer, wind::world(field, cursorX, cursorY), {field.vx[field.index(cursorX, cursorY)], field.vy[field.index(cursorX, cursorY)]})) {
            failed = true;
        }
        std::string title = "P48 | preset=" + std::to_string(static_cast<int>(scene.preset)) + " layer=" + std::to_string(static_cast<int>(layer)) + " grid=" + std::to_string(field.width);
#if LAB_CHECKPOINT >= 7
        title += " tick=" + std::to_string(tick) + " dropped=" + std::to_string(dropped);
        if (paused) {
            title += " PAUSED";
        }
#endif
#if LAB_CHECKPOINT >= 9
        title += " verify=" + report;
#endif
        if (!SDL_SetWindowTitle(window, title.c_str())) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (!wind::drawParticles(renderer, particles)) {
            failed = true;
        }
#endif
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
        }
        SDL_Delay(8);
    }

    if (failed) {
        std::cerr << SDL_GetError() << '\n';
    }
    // Giải phóng renderer trước window; SDL_Quit kết thúc hệ thống SDL sau cùng.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
