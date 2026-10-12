#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "rules.hpp"
#include "timing.hpp"
#include "validation.hpp"
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string>

int main(int, char**) {
    // Khởi tạo SDL rồi mới tạo window và renderer; mỗi nhánh lỗi dọn đúng tài nguyên đã có.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 46 - Falling Sand", 960, 640, SDL_WINDOW_RESIZABLE);
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
    if (!SDL_SetRenderLogicalPresentation(renderer, 96, 64, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    sand::Grid grid = sand::makeScene();
#endif
#if LAB_CHECKPOINT >= 2
    sand::Cell material = sand::Cell::Sand;
    int radius = 2;
    int cursorX = 48;
    int cursorY = 10;
    bool drawing = false;
    bool previousValid = false;
    int previousX = 0;
    int previousY = 0;
    std::cout << "Mouse: paint | 1 sand, 2 wall, 4 erase | [ ] radius | R reset\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "N: one tick (starts paused)\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "3: water (grid rules, not a physical fluid solver)\n";
#endif
#if LAB_CHECKPOINT >= 6
    bool paused = true;
    double accumulator = 0;
    double droppedSeconds = 0;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Space: run/pause at 30 ticks per second\n";
#endif
#if LAB_CHECKPOINT >= 7
    int preset = 0;
    std::string validation = "not run";
    std::cout << "P: scene/funnel/empty | arrows: cursor | Enter: stamp | V: bounded validation\n";
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
                    material = sand::Cell::Sand;
                }
                if (event.key.key == SDLK_2) {
                    material = sand::Cell::Wall;
                }
                if (event.key.key == SDLK_4) {
                    material = sand::Cell::Empty;
                }
                if (event.key.key == SDLK_LEFTBRACKET) {
                    radius = std::max(0, radius - 1);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    radius = std::min(8, radius + 1);
                }
                if (event.key.key == SDLK_R) {
                    grid = sand::makeScene();
#if LAB_CHECKPOINT >= 7
                    grid = sand::makePreset(preset);
                    validation = "not run";
#endif
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
                if (event.key.key == SDLK_3) {
                    material = sand::Cell::Water;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0;
                    previousTime = SDL_GetTicksNS();
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_P) {
                    preset = (preset + 1) % 3;
                    grid = sand::makePreset(preset);
                    paused = true;
                    accumulator = 0;
                    droppedSeconds = 0;
                    previousValid = false;
                    drawing = false;
                    validation = "not run";
                }
                if (event.key.key == SDLK_LEFT) {
                    cursorX = std::max(0, cursorX - 1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    cursorX = std::min(grid.width - 1, cursorX + 1);
                }
                if (event.key.key == SDLK_UP) {
                    cursorY = std::max(0, cursorY - 1);
                }
                if (event.key.key == SDLK_DOWN) {
                    cursorY = std::min(grid.height - 1, cursorY + 1);
                }
                if (event.key.key == SDLK_RETURN) {
                    sand::paintDisk(grid, cursorX, cursorY, radius, material);
                }
                if (event.key.key == SDLK_V) {
                    paused = true;
                    accumulator = 0;
                    const auto result = sand::validateScene();
                    validation = "FAIL";
                    if (result.conserved && result.deterministic && result.wallsFixed) {
                        validation = "PASS";
                    }
                    std::cout << "120-tick reference scene: " << validation << '\n';
                    std::cout << std::boolalpha;
                    std::cout << "  Material counts unchanged: " << result.conserved << '\n';
                    std::cout << "  Repeated runs match: " << result.deterministic << '\n';
                    std::cout << "  Walls stay in place: " << result.wallsFixed << '\n';
                    // Thời gian kiểm tra không được biến thành bước mô phỏng bù.
                    previousTime = SDL_GetTicksNS();
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                drawing = true;
                previousValid = false;
                if (sand::mouseCell(renderer, grid, event.button.x, event.button.y, cursorX, cursorY)) {
                    sand::paintDisk(grid, cursorX, cursorY, radius, material);
                    previousX = cursorX;
                    previousY = cursorY;
                    previousValid = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                const bool valid = sand::mouseCell(renderer, grid, event.motion.x, event.motion.y, cursorX, cursorY);
                if (drawing && valid) {
                    if (!previousValid) {
                        previousX = cursorX;
                        previousY = cursorY;
                    }
                    sand::paintStroke(grid, previousX, previousY, cursorX, cursorY, radius, material);
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
#if LAB_CHECKPOINT >= 3
        if (singleStep) {
            sand::stepGrid(grid);
        }
#endif
#if LAB_CHECKPOINT >= 6
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
        if (!paused && !singleStep) {
            const auto plan = sand::planSteps(accumulator, elapsed);
            accumulator = plan.remainder;
            droppedSeconds += plan.dropped;
            for (int step = 0; step < plan.steps; ++step) {
                sand::stepGrid(grid);
            }
        }
#endif

        // Render chỉ đọc grid. Resize không tạo lại thế giới hoặc cập nhật vật liệu.
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255)) {
            failed = true;
        }
        if (!SDL_RenderClear(renderer)) {
            failed = true;
        }
#if LAB_CHECKPOINT >= 1
        if (!sand::drawGrid(renderer, grid)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (!SDL_SetRenderDrawColor(renderer, 255, 255, 255, 255)) {
            failed = true;
        }
        const SDL_FRect selection{static_cast<float>(cursorX), static_cast<float>(cursorY), 1.0F, 1.0F};
        if (!SDL_RenderRect(renderer, &selection)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 2
        std::string title = std::string("Project 46 | brush=") + sand::nameFor(material) + " radius=" + std::to_string(radius);
#if LAB_CHECKPOINT >= 3
        title += " tick=" + std::to_string(grid.tick);
#endif
#if LAB_CHECKPOINT >= 6
        title += " dropped=" + std::to_string(droppedSeconds);
        if (paused) {
            title += " PAUSED";
        }
#endif
#if LAB_CHECKPOINT >= 7
        const auto counts = sand::countMaterials(grid);
        title += " sand=" + std::to_string(counts[2]) + " water=" + std::to_string(counts[3]);
        title += " cell=" + std::to_string(cursorX) + "," + std::to_string(cursorY) + " index=" + std::to_string(grid.index(cursorX, cursorY));
        title += std::string(" ") + sand::nameFor(grid.at(cursorX, cursorY));
        title += " checksum=" + std::to_string(sand::checksum(grid)) + " verify=" + validation;
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
        std::cerr << "Render failed: " << SDL_GetError() << '\n';
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
