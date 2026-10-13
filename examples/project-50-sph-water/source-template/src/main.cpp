#include "pair-view.hpp"
#include "timing.hpp"
#include "view.hpp"
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>

int main(int, char**) {
    // Khởi tạo SDL, window và renderer; mỗi nhánh lỗi trả EXIT_FAILURE.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("SPH 2D water tank", 800, 660, SDL_WINDOW_RESIZABLE);
    if (window == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (renderer == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_SetRenderLogicalPresentation(renderer, 800, 660, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
    water::State state;
    [[maybe_unused]] water::Preset preset = water::Preset::Dam;
    [[maybe_unused]] water::Settings settings;
    std::size_t selected = 0;
    bool showWalls = false;
    bool densityColor = false;
    water::Vec2 nozzle{0.6, 0.7};
    [[maybe_unused]] bool pairMode = false;
#if LAB_CHECKPOINT >= 1
    state = water::makeState(preset);
    std::cout << "R reset | P preset | I inspect\n";
#endif
#if LAB_CHECKPOINT >= 2
    std::cout << "N: one 0.001s step\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "Click particle or Left/Right to select | support circle is 2h\n";
#endif
#if LAB_CHECKPOINT >= 4
    showWalls = true;
    densityColor = true;
    std::cout << "W wall samples | L density color\n";
#endif
#if LAB_CHECKPOINT >= 5
    water::PairParameters pairParameters;
    std::cout << "C sound speed 8/12/20 | F isolated pair | 1/2 density A/B 900/1100/1200 | I pair forces\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "Q artificial viscosity alpha 0/0.15/0.3 | D approach/separate in pair mode\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "G grid/all-pairs\n";
#endif
#if LAB_CHECKPOINT >= 8
    bool pouring = false;
    std::cout << "Click/drag nozzle; arrows move nozzle | Enter emit once\n";
#endif
#if LAB_CHECKPOINT >= 9
    bool paused = true;
    double accumulator = 0;
    double dropped = 0;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Space run/pause | E continuous pour | at most 64 substeps/frame\n";
#endif
#if LAB_CHECKPOINT >= 10
    std::cout << "V bounded reference checks on independent states\n";
#endif
    while (running && !failed) {
        // Read all input before advancing the simulation; changing presets cancels pouring.
        [[maybe_unused]] bool singleStep = false;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_F) {
                    pairMode = !pairMode;
                    singleStep = false;
                    SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 8
                    pouring = false;
#endif
#if LAB_CHECKPOINT >= 9
                    paused = true;
                    accumulator = 0;
#endif
                }
                if (pairMode && (event.key.key == SDLK_1 || event.key.key == SDLK_2)) {
                    double* density = &pairParameters.densityA;
                    if (event.key.key == SDLK_2) {
                        density = &pairParameters.densityB;
                    }
                    if (*density == 900) {
                        *density = 1100;
                    } else if (*density == 1100) {
                        *density = 1200;
                    } else {
                        *density = 900;
                    }
                }
#endif
                if (event.key.key == SDLK_R || event.key.key == SDLK_P) {
                    if (event.key.key == SDLK_P) {
                        preset = static_cast<water::Preset>((static_cast<int>(preset) + 1) % 4);
                    } else {
                        preset = water::Preset::Dam;
                    }
                    state = water::makeState(preset);
                    selected = 0;
                    settings = water::Settings{};
                    nozzle = {0.6, 0.7};
#if LAB_CHECKPOINT >= 5
                    pairParameters = water::PairParameters{};
                    if (event.key.key == SDLK_P) {
                        pairMode = false;
                    }
#endif
                    SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 8
                    pouring = false;
#endif
#if LAB_CHECKPOINT >= 9
                    paused = true;
                    accumulator = 0;
                    dropped = 0;
#endif
                }
                if (event.key.key == SDLK_I) {
#if LAB_CHECKPOINT >= 5
                    if (pairMode) {
                        water::printPair(water::inspectPair(pairParameters, settings));
                    }
#endif
                    if (!pairMode && selected < state.particles.size()) {
                        const auto& p = state.particles[selected];
                        std::cout << "i=" << selected << " position=" << p.position.x << ',' << p.position.y << " velocity=" << p.velocity.x << ',' << p.velocity.y << " density=" << p.density << " pressure=" << p.pressure << '\n';
                    }
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (!pairMode && event.key.key == SDLK_N) {
                    singleStep = true;
                }
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT < 8
                if (event.key.key == SDLK_RIGHT && !state.particles.empty()) {
                    selected = (selected + 1) % state.particles.size();
                }
                if (event.key.key == SDLK_LEFT && !state.particles.empty()) {
                    selected = (selected + state.particles.size() - 1) % state.particles.size();
                }
#endif
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_W) {
                    showWalls = !showWalls;
                }
                if (event.key.key == SDLK_L) {
                    densityColor = !densityColor;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_C) {
                    if (settings.soundSpeed == 8) {
                        settings.soundSpeed = 12;
                    } else if (settings.soundSpeed == 12) {
                        settings.soundSpeed = 20;
                    } else {
                        settings.soundSpeed = 8;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (pairMode && event.key.key == SDLK_D) {
                    pairParameters.approaching = !pairParameters.approaching;
                }
                if (event.key.key == SDLK_Q) {
                    if (settings.alpha == 0) {
                        settings.alpha = 0.15;
                    } else if (settings.alpha == 0.15) {
                        settings.alpha = 0.3;
                    } else {
                        settings.alpha = 0;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_G) {
                    settings.useGrid = !settings.useGrid;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_LEFT) {
                    nozzle.x = std::max(water::spacing / 2, nozzle.x - water::spacing);
                }
                if (event.key.key == SDLK_RIGHT) {
                    nozzle.x = std::min(1 - water::spacing / 2, nozzle.x + water::spacing);
                }
                if (event.key.key == SDLK_DOWN) {
                    nozzle.y = std::max(water::spacing / 2, nozzle.y - water::spacing);
                }
                if (event.key.key == SDLK_UP) {
                    nozzle.y = std::min(0.8 - water::spacing / 2, nozzle.y + water::spacing);
                }
                if (!pairMode && event.key.key == SDLK_RETURN) {
                    water::pour(state, nozzle);
                }
#endif
#if LAB_CHECKPOINT >= 9
                if (!pairMode && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0;
                }
                if (!pairMode && event.key.key == SDLK_E) {
                    pouring = !pouring;
                }
#endif
#if LAB_CHECKPOINT >= 10
                if (event.key.key == SDLK_V) {
                    for (const auto& check : water::validateWater()) {
                        std::string status = "FAIL ";
                        if (check.pass) {
                            status = "PASS ";
                        }
                        std::cout << status << check.label << " value=" << check.value << '\n';
                    }
                }
#endif
            }
#if LAB_CHECKPOINT >= 3
            if (!pairMode && event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                SDL_ConvertEventToRenderCoordinates(renderer, &event);
                const auto world = water::fromScreen({event.button.x, event.button.y});
                if (world.x >= 0 && world.x <= 1 && world.y >= 0 && world.y <= 0.8) {
                    double best = 1e9;
                    for (std::size_t i = 0; i < state.particles.size(); ++i) {
                        const double distance = water::length(water::subtract(state.particles[i].position, world));
                        if (distance < best) {
                            best = distance;
                            selected = i;
                        }
                    }
#if LAB_CHECKPOINT >= 8
                    nozzle = world;
                    pouring = true;
                    SDL_CaptureMouse(true);
                    water::pour(state, nozzle);
#endif
                }
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (event.type == SDL_EVENT_MOUSE_MOTION && pouring) {
                SDL_ConvertEventToRenderCoordinates(renderer, &event);
                const auto world = water::fromScreen({event.motion.x, event.motion.y});
                if (world.x >= 0 && world.x <= 1 && world.y >= 0 && world.y <= 0.8) {
                    nozzle = world;
                } else {
                    pouring = false;
                    SDL_CaptureMouse(false);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                pouring = false;
                SDL_CaptureMouse(false);
            }
#endif
#if LAB_CHECKPOINT >= 9
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                paused = true;
                accumulator = 0;
            }
#endif
        }
        try {
#if LAB_CHECKPOINT >= 5
            if (pairMode) {
                // A static diagnostic: do not recompute density or integrate this pair.
                const auto pair = water::inspectPair(pairParameters, settings);
                const std::string title = "Isolated pair | rho=" + std::to_string(pairParameters.densityA) + "/" + std::to_string(pairParameters.densityB) + " netFx=" + std::to_string(pair.netForce.x) + " viscosityPower=" + std::to_string(pair.viscosityPower) + " | I: print values";
                if (!SDL_SetWindowTitle(window, title.c_str()) || !water::drawPair(renderer, pair)) {
                    std::cerr << SDL_GetError() << '\n';
                    failed = true;
                }
                SDL_Delay(16);
                continue;
            }
#endif
#if LAB_CHECKPOINT >= 2
            if (singleStep) {
#if LAB_CHECKPOINT >= 9
                paused = true;
                accumulator = 0;
#endif
                water::step(state, settings);
            }
#endif
#if LAB_CHECKPOINT >= 9
            const auto now = SDL_GetTicksNS();
            const double elapsed = static_cast<double>(now - previousTime) / 1e9;
            previousTime = now;
            if (!paused) {
                const auto plan = water::advanceFrame(state, settings, accumulator, elapsed, pouring, nozzle);
                accumulator = plan.remainder;
                dropped += plan.dropped;
            }
#endif
#if LAB_CHECKPOINT >= 4
            // Refresh inspector data at the displayed positions, including after an emission.
            water::computeDensity(state, water::buildNeighbors(state, settings.useGrid));
#endif
#if LAB_CHECKPOINT >= 5
            water::computePressure(state, settings.soundSpeed);
#endif
            const auto measured = water::measure(state);
            std::ostringstream title;
            title << std::fixed << std::setprecision(3) << "SPH | n=" << state.particles.size() << " mass=" << measured.totalMass << " t=" << state.time << " compression=" << measured.maxCompression;
#if LAB_CHECKPOINT >= 9
            title << " dropped=" << dropped << " paused=" << paused;
#endif
            SDL_SetWindowTitle(window, title.str().c_str());
            if (!water::drawScene(renderer, state, selected, showWalls, densityColor, nozzle)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
            }
        } catch (const std::exception& error) {
            std::cerr << error.what() << '\n';
            failed = true;
        }
        SDL_Delay(16);
    }

    // Giải phóng renderer trước window, sau đó đóng SDL.
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
