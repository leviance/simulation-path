#pragma once
#include "controls.hpp"
#include "presentation.hpp"
#include <cstdlib>
#include <cstring>
#include <iostream>

namespace lab {
struct PointerState {
    bool dragging{};
    SDL_MouseID owner{};
};

// Chỉ nhả capture của thao tác đang sở hữu chuột, rồi xóa toàn bộ state kéo.
inline void releasePointer(PointerState& pointer) {
    if (pointer.dragging && !SDL_CaptureMouse(false)) {
        SDL_Log("Release capture: %s", SDL_GetError());
    }
    pointer = {};
}

inline void destroyResources(SDL_Texture* texture, SDL_Renderer* renderer, SDL_Window* window) {
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
}

inline int runApplication(int argc, char** argv) {
    if (argc > 2) {
        std::cerr << "Pass at most one option\n";
        return EXIT_FAILURE;
    }
    const bool smoke = argc > 1 && std::strcmp(argv[1], "--smoke") == 0;
    const bool largeSmoke = argc > 1 && std::strcmp(argv[1], "--smoke-large") == 0;
    const bool benchmark = argc > 1 && std::strcmp(argv[1], "--benchmark") == 0;
    const bool denseBenchmark = argc > 1 && std::strcmp(argv[1], "--benchmark-cells-dense") == 0;
#if LAB_CHECKPOINT >= 9
    if (benchmark || denseBenchmark) {
        auto job = createGridBenchmark({}, 1U, 64, Layout::Uniform, false);
        if (denseBenchmark) {
            job = createGridBenchmark({}, 1U, 64, Layout::Dense, true);
        }
        const auto start = Clock::now();
        for (int tick = 0; tick < 20000 && job.active; ++tick) {
            if (milliseconds(start, Clock::now()) > 30000) {
                std::cerr << "Benchmark exceeded 30-second CLI budget\n";
                return EXIT_FAILURE;
            }
            tickGridBenchmark(job);
        }
        if (job.active) {
            return EXIT_FAILURE;
        }
        for (const auto& row : job.rows) {
            const char* method = "Grid";
            if (row.config.method == Method::Brute) {
                method = "Brute";
            }
            std::cout << "N=" << row.config.count << " method=" << method << " S=" << row.config.cellSize << " layout=" << layoutName(row.config.layout) << " samples=" << row.samples << " build_ms=" << row.buildMs << " query_ms=" << row.queryMs << " update_ms=" << row.updateMs << " median_ms=" << row.medianMs << " min_ms=" << row.minMs << " max_ms=" << row.maxMs << " candidates=" << row.candidates << " neighbors=" << row.neighbors << " checksum=" << row.checksum << '\n';
        }
        return EXIT_SUCCESS;
    }
#endif
    if (benchmark || denseBenchmark || (argc > 1 && !smoke && !largeSmoke)) {
        std::cerr << "Unknown or unavailable option for this checkpoint\n";
        return EXIT_FAILURE;
    }
#if LAB_CHECKPOINT < 8
    if (largeSmoke) {
        std::cerr << "10000-agent Grid starts at checkpoint 8\n";
        return EXIT_FAILURE;
    }
#endif
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    const bool finiteSmoke = smoke || largeSmoke;
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (finiteSmoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 28 - Boids Spatial Grid", Framebuffer::width, Framebuffer::height, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        destroyResources(nullptr, nullptr, window);
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, Framebuffer::width, Framebuffer::height);
    if (!texture || !SDL_SetRenderLogicalPresentation(renderer, Framebuffer::width, Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        destroyResources(texture, renderer, window);
        return EXIT_FAILURE;
    }
    if (!finiteSmoke && !SDL_SetRenderVSync(renderer, 1)) {
        SDL_Log("VSync unavailable: %s", SDL_GetError());
    }
    bool failed = false;
    PointerState pointer{};
    try {
        GridScene scene{};
        if (largeSmoke) {
            scene.count = 10000;
        }
        resetScene(scene);
        Framebuffer image{};
        bool running = true;
        bool dirty = true;
        auto previous = SDL_GetTicksNS();
        const auto start = Clock::now();
        std::size_t requiredSteps = 6;
        if (largeSmoke) {
            requiredSteps = 1;
        }
        for (int frame = 0; running; ++frame) {
            if (finiteSmoke && (frame >= 2000 || milliseconds(start, Clock::now()) > 10000)) {
                throw std::runtime_error("Finite smoke exceeded its frame/time budget");
            }
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                dirty = true;
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                    releasePointer(pointer);
                    stopScene(scene);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                    releasePointer(pointer);
                    if (event.key.key == SDLK_ESCAPE) {
                        if (scene.step || scene.benchmark.active || scene.validation.active) {
                            stopScene(scene);
                        } else {
                            running = false;
                        }
                    } else {
                        applyKey(scene, event.key.key);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                        throw std::runtime_error(SDL_GetError());
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !pointer.dragging) {
                    const Vec2 point{event.button.x, event.button.y};
                    if (inViewport(point, scene.params)) {
                        scene.selected = nearestBoid(scene, screenToWorld(point));
                        scene.inspectionDirty = true;
                        if (SDL_CaptureMouse(true)) {
                            pointer.dragging = true;
                            pointer.owner = event.button.which;
                        }
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && pointer.dragging && event.motion.which == pointer.owner) {
                    if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                        releasePointer(pointer);
                    } else if (scene.paused && inViewport({event.motion.x, event.motion.y}, scene.params)) {
                        invalidateModel(scene);
                        scene.boids[scene.selected].position = screenToWorld({event.motion.x, event.motion.y});
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && pointer.dragging && event.button.which == pointer.owner) {
                    if (scene.paused && inViewport({event.button.x, event.button.y}, scene.params)) {
                        invalidateModel(scene);
                        scene.boids[scene.selected].position = screenToWorld({event.button.x, event.button.y});
                    }
                    releasePointer(pointer);
                }
            }
            if (!running) {
                break;
            }
            const auto now = SDL_GetTicksNS();
            const double elapsed = static_cast<double>(now - previous) / 1e9;
            previous = now;
            if (finiteSmoke && !scene.step) {
                requestStep(scene);
            }
            const auto previousSteps = scene.steps;
            const bool wasBusy = scene.step.has_value() || scene.benchmark.active || scene.validation.active;
            advanceScene(scene, elapsed);
            dirty = dirty || scene.steps != previousSteps;
            const bool busy = scene.step.has_value() || scene.benchmark.active || scene.validation.active;
            if (dirty) {
                drawScene(image, scene);
            }
            if (dirty || wasBusy || busy || !scene.paused || finiteSmoke) {
                if (!presentFrame(renderer, texture, image, scene, dirty)) {
                    throw std::runtime_error(SDL_GetError());
                }
                dirty = false;
            }
            if (finiteSmoke && scene.steps >= requiredSteps) {
                if (scene.drawn != scene.count) {
                    throw std::runtime_error("Renderer did not draw the full flock");
                }
                std::cout << "N=" << scene.count << " steps=" << scene.steps << " drawn=" << scene.drawn << " neighbors=" << scene.metrics.neighbors << " candidates=" << scene.metrics.candidates << '\n';
                running = false;
            }
            if (scene.paused && !busy) {
                SDL_Delay(8);
            } else {
                SDL_Delay(1);
            }
        }
        stopScene(scene);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }
    releasePointer(pointer);
    destroyResources(texture, renderer, window);
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
} // namespace lab
