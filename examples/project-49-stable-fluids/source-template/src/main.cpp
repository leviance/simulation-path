#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <string>

int main(int, char**) {
    // Khởi tạo SDL, window, renderer và hệ tọa độ logical cố định.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Project 49 - Stable Fluids", 850, 850, SDL_WINDOW_RESIZABLE);
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

    if (!SDL_SetRenderLogicalPresentation(renderer, 800, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    fluid::Preset preset = fluid::initialPreset();
    auto grid = fluid::makeGrid(24, preset);
    fluid::Layer layer = fluid::initialLayer();
#endif
#if LAB_CHECKPOINT >= 2
    int radius = 2;
    double brushValue = 1;
    int cursorX = 12;
    int cursorY = 12;
    bool dragging = false;
    bool previousValid = false;
    fluid::Vec2 previous{};
    std::cout << "Mouse / Enter paint | 1 smoke, 2 erase | [ ] radius | R reset | P preset | arrows select cell | I inspect\n";
#endif
#if LAB_CHECKPOINT >= 3
    fluid::Settings settings;
    std::cout << "N: one fixed step (1/60s)\n";
#endif
#if LAB_CHECKPOINT >= 4
    bool arrows = true;
    fluid::computeDivergence(grid);
    std::cout << "O: vectors | L: display layer\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "T: pressure budget 40/80/160 | H: Jacobi 8x8 | J: one Jacobi round | Z: restart pressure\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "Q: viscosity 0/0.0005/0.003\n";
#endif
#if LAB_CHECKPOINT >= 9
    bool stir = true;
    std::cout << "B: buoyancy 0/0.8/1.6 | K: mouse stirring | WASD: impulse at selected cell\n";
#endif
#if LAB_CHECKPOINT >= 10
    bool paused = true;
    double accumulator = 0;
    double dropped = 0;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Space run/pause | G grid 24/32\n";
#endif
#if LAB_CHECKPOINT >= 11
    std::string report = "not run";
    std::cout << "V: bounded reference tests on separate grids\n";
#endif

    while (running && !failed) {
        // Input chỉ thay dữ liệu hoặc yêu cầu bước; physics chạy sau vòng event.
#if LAB_CHECKPOINT >= 3
        bool singleStep = false;
        [[maybe_unused]] bool changedSettings = false;
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
                    radius = std::max(1, radius - 1);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    radius = std::min(6, radius + 1);
                }
                if (event.key.key == SDLK_P || event.key.key == SDLK_R) {
                    dragging = false;
                    previousValid = false;
                    SDL_CaptureMouse(false);
                    if (event.key.key == SDLK_P) {
                        preset = static_cast<fluid::Preset>((static_cast<int>(preset) + 1) % 4);
                    } else {
                        preset = fluid::initialPreset();
                        layer = fluid::initialLayer();
                        radius = 2;
                        brushValue = 1;
#if LAB_CHECKPOINT >= 4
                        arrows = true;
#endif
#if LAB_CHECKPOINT >= 9
                        stir = true;
#endif
#if LAB_CHECKPOINT >= 3
                        settings = fluid::Settings{};
#endif
                    }
                    int resolution = grid.n;
                    if (event.key.key == SDLK_R) {
                        resolution = 24;
                    }
                    grid = fluid::makeGrid(resolution, preset);
                    cursorX = grid.n / 2;
                    cursorY = grid.n / 2;
#if LAB_CHECKPOINT >= 4
                    fluid::computeDivergence(grid);
#endif
#if LAB_CHECKPOINT >= 3
                    changedSettings = true;
#endif
                }
                if (event.key.key == SDLK_LEFT) {
                    cursorX = std::max(0, cursorX - 1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    cursorX = std::min(grid.n - 1, cursorX + 1);
                }
                if (event.key.key == SDLK_UP) {
                    cursorY = std::min(grid.n - 1, cursorY + 1);
                }
                if (event.key.key == SDLK_DOWN) {
                    cursorY = std::max(0, cursorY - 1);
                }
                const fluid::Vec2 cursor{(cursorX + 0.5) * grid.h, (cursorY + 0.5) * grid.h};
                if (event.key.key == SDLK_RETURN) {
                    fluid::paintDisk(grid, cursor, radius, brushValue);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_N) {
                    singleStep = true;
#if LAB_CHECKPOINT >= 10
                    paused = true;
                    accumulator = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_O) {
                    arrows = !arrows;
                }
                if (event.key.key == SDLK_L) {
#if LAB_CHECKPOINT >= 5
                    layer = static_cast<fluid::Layer>((static_cast<int>(layer) + 1) % 3);
#else
                    if (layer == fluid::Layer::Smoke) {
                        layer = fluid::Layer::Divergence;
                    } else {
                        layer = fluid::Layer::Smoke;
                    }
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_H) {
                    dragging = false;
                    previousValid = false;
                    SDL_CaptureMouse(false);
                    preset = fluid::Preset::PressureDipole;
                    grid = fluid::makeGrid(8, preset);
                    fluid::computeDivergence(grid);
                    cursorX = 3;
                    cursorY = 3;
                    layer = fluid::Layer::Pressure;
                    changedSettings = true;
                }
                if (event.key.key == SDLK_Z || event.key.key == SDLK_J) {
                    dragging = false;
                    previousValid = false;
                    SDL_CaptureMouse(false);
                    singleStep = false;
#if LAB_CHECKPOINT >= 10
                    paused = true;
                    accumulator = 0;
#endif
                    if (event.key.key == SDLK_Z || !grid.pressureReady) {
                        fluid::beginPressure(grid);
                    }
                    if (event.key.key == SDLK_J && grid.pressureIterations < 160) {
                        const auto trace = fluid::jacobiIteration(grid, cursorX, cursorY);
                        std::cout << "Jacobi " << trace.iteration << " cell=" << trace.x << ',' << trace.y << " b=" << trace.rhs << " old=" << trace.previous << " neighborSum/count=" << trace.sum << '/' << trace.count << " candidate=" << trace.candidate << " weighted=" << trace.weighted << " gauge=" << trace.gauge << " result=" << trace.result << " residual=" << fluid::pressureResidual(grid) << '\n';
                    }
                }
                if (event.key.key == SDLK_T) {
                    if (settings.iterations == 160) {
                        settings.iterations = 40;
                    } else {
                        settings.iterations *= 2;
                    }
                    changedSettings = true;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_Q) {
                    if (settings.viscosity == 0) {
                        settings.viscosity = 0.0005;
                    } else if (settings.viscosity == 0.0005) {
                        settings.viscosity = 0.003;
                    } else {
                        settings.viscosity = 0;
                    }
                    changedSettings = true;
                }
#endif
#if LAB_CHECKPOINT >= 9
                if (event.key.key == SDLK_B) {
                    settings.buoyancy += 0.8;
                    if (settings.buoyancy > 1.6) {
                        settings.buoyancy = 0;
                    }
                    changedSettings = true;
                }
                if (event.key.key == SDLK_K) {
                    stir = !stir;
                }
                fluid::Vec2 delta;
                if (event.key.key == SDLK_W) {
                    delta.y = 0.05;
                }
                if (event.key.key == SDLK_S) {
                    delta.y = -0.05;
                }
                if (event.key.key == SDLK_A) {
                    delta.x = -0.05;
                }
                if (event.key.key == SDLK_D) {
                    delta.x = 0.05;
                }
                if (delta.x != 0 || delta.y != 0) {
                    fluid::addImpulse(grid, cursor, delta);
                    fluid::computeDivergence(grid);
                }
#endif
#if LAB_CHECKPOINT >= 10
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0;
                }
                if (event.key.key == SDLK_G && preset != fluid::Preset::PressureDipole) {
                    if (grid.n == 24) {
                        grid = fluid::makeGrid(32, preset);
                    } else {
                        grid = fluid::makeGrid(24, preset);
                    }
                    cursorX = grid.n / 2;
                    cursorY = grid.n / 2;
                    fluid::computeDivergence(grid);
                    changedSettings = true;
                }
#endif
#if LAB_CHECKPOINT >= 11
                if (event.key.key == SDLK_V) {
                    paused = true;
                    accumulator = 0;
                    const auto result = fluid::validateFluid();
                    report = "FAIL";
                    if (result.passed) {
                        report = "PASS";
                    }
                    std::cout << report << " | reference N=16, iterations=160 | div " << result.projection.before << " -> " << result.projection.after << " | residual=" << result.projection.residual << " | constant error=" << result.constantError << " | viscosity energy " << result.beforeEnergy << " -> " << result.afterEnergy << '\n';
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_I) {
                    const auto stats = fluid::measure(grid);
                    std::cout << "cell " << cursorX << ',' << cursorY << " d=" << grid.density[cursorY * grid.n + cursorX] << " scalar sum=" << stats.sum << " energy norm=" << stats.energy << " C=" << stats.courant;
#if LAB_CHECKPOINT >= 4
                    const int indexU = cursorY * (grid.n + 1) + cursorX;
                    const int indexV = cursorY * grid.n + cursorX;
                    std::cout << " uL/uR=" << grid.u[indexU] << '/' << grid.u[indexU + 1];
                    std::cout << " vB/vT=" << grid.v[indexV] << '/' << grid.v[indexV + grid.n];
                    std::cout << " | div RMS=" << fluid::computeDivergence(grid);
#endif
#if LAB_CHECKPOINT >= 5
                    std::cout << " pressure residual=" << fluid::pressureResidual(grid);
                    if (grid.pressureReady) {
                        const auto cell = fluid::inspectJacobiCell(grid, cursorX, cursorY);
                        std::cout << " RHS=" << cell.rhs << " neighborSum/count=" << cell.sum << '/' << cell.count << " nextCandidate=" << cell.candidate;
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    if (grid.hasProjection) {
                        std::cout << " last projection " << grid.projection.before << " -> " << grid.projection.after;
                    }
#endif
                    std::cout << '\n';
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                previousValid = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION || (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT)) {
                float mouseX = 0;
                float mouseY = 0;
                SDL_GetMouseState(&mouseX, &mouseY);
                fluid::Vec2 p;
                if (fluid::mouseWorld(renderer, mouseX, mouseY, p)) {
                    cursorX = std::clamp(static_cast<int>(std::floor(p.x * grid.n)), 0, grid.n - 1);
                    cursorY = std::clamp(static_cast<int>(std::floor(p.y * grid.n)), 0, grid.n - 1);
                    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
                        dragging = true;
                        previousValid = false;
                        if (!SDL_CaptureMouse(true)) {
                            std::cerr << "Mouse capture unavailable: " << SDL_GetError() << '\n';
                        }
                    }
                    if (dragging) {
                        if (previousValid) {
                            fluid::paintStroke(grid, previous, p, radius, brushValue);
#if LAB_CHECKPOINT >= 9
                            if (stir) {
                                fluid::addImpulse(grid, p, {p.x - previous.x, p.y - previous.y});
                                fluid::computeDivergence(grid);
                            }
#endif
                        } else {
                            fluid::paintDisk(grid, p, radius, brushValue);
                        }
                        previous = p;
                        previousValid = true;
                    }
                } else {
                    previousValid = false;
                }
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                previousValid = false;
                SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 10
                paused = true;
                accumulator = 0;
#endif
            }
#endif
        }

#if LAB_CHECKPOINT >= 10
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
        if (changedSettings) {
            paused = true;
            accumulator = 0;
            dropped = 0;
            singleStep = false;
        }
        if (!paused) {
            const auto plan = fluid::planSteps(accumulator, elapsed);
            accumulator = plan.remainder;
            dropped += plan.dropped;
            for (int i = 0; i < plan.steps; ++i) {
                if (!fluid::step(grid, settings)) {
                    failed = true;
                }
            }
        }
#endif
#if LAB_CHECKPOINT >= 3
        if (singleStep && !fluid::step(grid, settings)) {
            failed = true;
        }
#endif

        // Render đọc state đã cập nhật, không tự thực hiện một bước solver.
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
            failed = true;
        }
#if LAB_CHECKPOINT >= 1
        if (!fluid::drawGrid(renderer, grid, layer)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 2
        if (!fluid::drawInspector(renderer, grid, cursorX, cursorY)) {
            failed = true;
        }
        std::string title = "P49 | N=" + std::to_string(grid.n) + " preset=" + std::to_string(static_cast<int>(preset)) + " layer=" + std::to_string(static_cast<int>(layer));
#if LAB_CHECKPOINT >= 3
        title += " tick=" + std::to_string(grid.tick);
#endif
#if LAB_CHECKPOINT >= 4
        if (arrows && !fluid::drawArrows(renderer, grid)) {
            failed = true;
        }
#endif
#if LAB_CHECKPOINT >= 5
        title += " iterations=" + std::to_string(settings.iterations);
        title += " Jacobi rounds=" + std::to_string(grid.pressureIterations);
#endif
#if LAB_CHECKPOINT >= 10
        title += " dropped=" + std::to_string(dropped);
        if (paused) {
            title += " PAUSED";
        }
#endif
#if LAB_CHECKPOINT >= 11
        title += " verify=" + report;
#endif
        if (!SDL_SetWindowTitle(window, title.c_str())) {
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
    // Giải phóng renderer trước window, rồi kết thúc SDL.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();

    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
