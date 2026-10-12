#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "diagnostics.hpp"
#include "timing.hpp"
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string>

int main(int, char**) {
    // Khởi tạo SDL, window và renderer; dọn đúng tài nguyên khi một bước thất bại.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 47 - Heat Plate", 960, 720, SDL_WINDOW_RESIZABLE);
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
    if (!SDL_SetRenderLogicalPresentation(renderer, 64, 48, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    heat::Field field = heat::makeField();
#endif
#if LAB_CHECKPOINT >= 2
    int radius = 2;
    double brushValue = 1;
    int cursorX = 32;
    int cursorY = 24;
    bool drawing = false;
    bool previousValid = false;
    int previousX = 0;
    int previousY = 0;
    std::cout << "Mouse paint | 1 hot, 2 cold | [ ] radius | R reset | C clear\n";
#endif
#if LAB_CHECKPOINT >= 3
    heat::Settings settings;
    std::cout << "N: one solver step\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "B: insulated / cold edge\n";
#endif
#if LAB_CHECKPOINT >= 6
    bool paused = true;
    double accumulator = 0;
    double droppedSeconds = 0;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Space run/pause | A diffusivity 3/6/12 | T dt 1/30 or 1/60\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "Arrows select cell | Enter stamp | I: print inspector\n";
#endif
#if LAB_CHECKPOINT >= 8
    int preset = 0;
    std::string report = "not run";
    std::cout << "P: hot patch / uniform / checker / empty | V: bounded validation\n";
#endif
    while (running && !failed) {
#if LAB_CHECKPOINT >= 3
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
                if (event.key.key == SDLK_1) {
                    brushValue = 1;
                }
                if (event.key.key == SDLK_2) {
                    brushValue = 0;
                }
                if (event.key.key == SDLK_LEFTBRACKET) {
                    radius = std::max(0, radius - 1);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    radius = std::min(8, radius + 1);
                }
                if (event.key.key == SDLK_R || event.key.key == SDLK_C) {
                    field = heat::makeField();
#if LAB_CHECKPOINT >= 8
                    if (event.key.key == SDLK_R) {
                        field = heat::makeField(preset);
                    }
                    report = "not run";
#endif
                    if (event.key.key == SDLK_C) {
                        field = heat::Field{};
                    }
                    drawing = false;
                    previousValid = false;
#if LAB_CHECKPOINT >= 6
                    paused = true;
                    accumulator = 0;
                    droppedSeconds = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_N) {
                    singleStep = true;
#if LAB_CHECKPOINT >= 6
                    paused = true;
                    accumulator = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_B) {
                    if (settings.boundary == heat::Boundary::Insulated) {
                        settings.boundary = heat::Boundary::Cold;
                    } else {
                        settings.boundary = heat::Boundary::Insulated;
                    }
#if LAB_CHECKPOINT >= 6
                    paused = true;
                    accumulator = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0;
                    previousTime = SDL_GetTicksNS();
                }
                if (event.key.key == SDLK_A) {
                    settings.diffusivity *= 2;
                    if (settings.diffusivity > 12) {
                        settings.diffusivity = 3;
                    }
                    paused = true;
                    accumulator = 0;
                }
                if (event.key.key == SDLK_T) {
                    if (settings.dt == 1.0 / 30.0) {
                        settings.dt = 1.0 / 60.0;
                    } else {
                        settings.dt = 1.0 / 30.0;
                    }
                    paused = true;
                    accumulator = 0;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_LEFT) {
                    cursorX = std::max(0, cursorX - 1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    cursorX = std::min(field.width - 1, cursorX + 1);
                }
                if (event.key.key == SDLK_UP) {
                    cursorY = std::max(0, cursorY - 1);
                }
                if (event.key.key == SDLK_DOWN) {
                    cursorY = std::min(field.height - 1, cursorY + 1);
                }
                if (event.key.key == SDLK_RETURN) {
                    heat::paintDisk(field, cursorX, cursorY, radius, brushValue);
                }
                if (event.key.key == SDLK_I) {
                    heat::applyBoundary(field, settings);
                    const auto stats = heat::measure(field);
                    std::cout << "Cell (" << cursorX << ", " << cursorY << ") theta=" << heat::sample(field, cursorX, cursorY) << '\n';
                    std::cout << "Min=" << stats.minimum << " max=" << stats.maximum << " mean=" << stats.mean << " sum=" << stats.sum << '\n';
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_P) {
                    preset = (preset + 1) % 4;
                    field = heat::makeField(preset);
                    paused = true;
                    accumulator = 0;
                    droppedSeconds = 0;
                    drawing = false;
                    previousValid = false;
                    report = "not run";
                }
                if (event.key.key == SDLK_V) {
                    paused = true;
                    accumulator = 0;
                    const auto result = heat::validatePlate();
                    report = "FAIL";
                    if (result.conserved && result.bounded && result.coldEdges) {
                        report = "PASS";
                    }
                    std::cout << std::boolalpha << "Conserved: " << result.conserved << " | Bounded: " << result.bounded << " | Cold edges: " << result.coldEdges << " | Sum error: " << result.maxSumError << '\n';
                    previousTime = SDL_GetTicksNS();
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                drawing = true;
                previousValid = false;
                if (heat::mouseCell(renderer, field, event.button.x, event.button.y, cursorX, cursorY)) {
                    heat::paintDisk(field, cursorX, cursorY, radius, brushValue);
                    previousX = cursorX;
                    previousY = cursorY;
                    previousValid = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                const bool valid = heat::mouseCell(renderer, field, event.motion.x, event.motion.y, cursorX, cursorY);
                if (drawing && valid) {
                    if (!previousValid) {
                        previousX = cursorX;
                        previousY = cursorY;
                    }
                    heat::paintStroke(field, previousX, previousY, cursorX, cursorY, radius, brushValue);
                    previousX = cursorX;
                    previousY = cursorY;
                }
                previousValid = valid;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                drawing = false;
                previousValid = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                drawing = false;
                previousValid = false;
#if LAB_CHECKPOINT >= 6
                paused = true;
                accumulator = 0;
#endif
            }
#endif
        }
#if LAB_CHECKPOINT >= 5
        heat::applyBoundary(field, settings);
#endif
#if LAB_CHECKPOINT >= 3
        if (singleStep && !heat::diffuse(field, settings)) {
            std::cout << "Step rejected: rx + ry exceeds stability bound, or invalid settings\n";
        }
#endif
#if LAB_CHECKPOINT >= 6
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
        if (!heat::stable(settings)) {
            paused = true;
            accumulator = 0;
        }
        if (!paused && !singleStep) {
            const auto plan = heat::planSteps(accumulator, elapsed, settings.dt);
            accumulator = plan.remainder;
            droppedSeconds += plan.dropped;
            for (int step = 0; step < plan.steps; ++step) {
                heat::diffuse(field, settings);
            }
        }
#endif
        // Vẽ toàn bộ field; màu không được dùng để quyết định kết quả solver.
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
            failed = true;
        }
#if LAB_CHECKPOINT >= 1
        if (!heat::drawField(renderer, field)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 7
        const SDL_FRect selected{static_cast<float>(cursorX), static_cast<float>(cursorY), 1.0F, 1.0F};
        if (!SDL_SetRenderDrawColor(renderer, 255, 255, 255, 255) || !SDL_RenderRect(renderer, &selected)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 2
        std::string title = "P47 | brush=" + std::to_string(brushValue) + " radius=" + std::to_string(radius);
#if LAB_CHECKPOINT >= 3
        title += " tick=" + std::to_string(field.tick);
#endif
#if LAB_CHECKPOINT >= 5
        if (settings.boundary == heat::Boundary::Cold) {
            title += " COLD EDGE";
        } else {
            title += " INSULATED";
        }
#endif
#if LAB_CHECKPOINT >= 6
        title += " alpha=" + std::to_string(settings.diffusivity) + " dt=" + std::to_string(settings.dt);
        title += " r=" + std::to_string(heat::ratioX(settings)) + " dropped=" + std::to_string(droppedSeconds);
        if (!heat::stable(settings)) {
            title += " REJECTED";
        } else if (paused) {
            title += " PAUSED";
        }
#endif
#if LAB_CHECKPOINT >= 7
        const auto stats = heat::measure(field);
        title += " min/max=" + std::to_string(stats.minimum) + "/" + std::to_string(stats.maximum);
        title += " mean=" + std::to_string(stats.mean) + " sum=" + std::to_string(stats.sum);
        title += " cell=" + std::to_string(cursorX) + "," + std::to_string(cursorY) + " theta=" + std::to_string(heat::sample(field, cursorX, cursorY));
#endif
#if LAB_CHECKPOINT >= 8
        title += " verify=" + report;
#endif
        if (!SDL_SetWindowTitle(window, title.c_str())) {
            failed = true;
        }
#endif
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
        }
        SDL_Delay(16);
    }
    if (failed) {
        std::cerr << SDL_GetError() << '\n';
    }
    // Giải phóng renderer trước window, rồi kết thúc SDL.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
