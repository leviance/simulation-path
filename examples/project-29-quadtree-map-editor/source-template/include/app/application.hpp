#pragma once
// SDL sở hữu window/input/presentation; các phép query và edit nằm trong editor/.
#include "presentation.hpp"
#include <cstdlib>
#include <cstring>
#include <iostream>

namespace maplab {
struct PointerState {
    bool active{};
    SDL_MouseID owner{};
};

inline void releasePointer(PointerState& pointer) {
    if (pointer.active && !SDL_CaptureMouse(false)) {
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

#if LAB_CHECKPOINT >= 8
inline void requireSameQuery(const Quadtree& tree, const Box& box) {
    auto actual = tree.query(box).ids;
    auto expected = queryBrute(tree, box).ids;
    std::sort(actual.begin(), actual.end());
    std::sort(expected.begin(), expected.end());
    if (actual != expected) {
        throw std::runtime_error("Workflow query differs from brute force");
    }
}

// [snippet:smokeWorkflow]
inline void smokeWorkflow(Scene& scene) {
    if (scene.document.tree.objects.size() != 100000) {
        throw std::runtime_error("Workflow must start with 100000 objects");
    }
    const Box region{-12000, -12000, 1200, 1000};
    scene.document.selectRegion({region.x, region.y}, {right(region), bottom(region)});
    requireSameQuery(scene.document.tree, region);
    const auto selected = scene.document.selection;
    if (selected.empty() || !scene.document.moveSelection({128, 64}) || scene.document.selection != selected) {
        throw std::runtime_error("Group move did not preserve IDs/selection");
    }
    requireSameQuery(scene.document.tree, region);
    if (!scene.document.addObject({-11500, -11500}, Kind::House)) {
        throw std::runtime_error("Workflow insert failed");
    }
    requireSameQuery(scene.document.tree, region);
    scene.document.deleteSelection();
    requireSameQuery(scene.document.tree, region);
    scene.camera = {-11500, -11500, 0.5};
    requireSameQuery(scene.document.tree, viewport(scene.camera, scene.size));
    refreshScene(scene);
}

// [/snippet:smokeWorkflow]
#endif

inline int runApplication(int argc, char** argv) {
    if (argc > 2) {
        std::cerr << "Pass at most one option: --smoke, --smoke-workflow or --benchmark\n";
        return EXIT_FAILURE;
    }
    const bool smoke = argc > 1 && std::strcmp(argv[1], "--smoke") == 0;
    const bool workflow = argc > 1 && std::strcmp(argv[1], "--smoke-workflow") == 0;
    const bool benchmark = argc > 1 && std::strcmp(argv[1], "--benchmark") == 0;
#if LAB_CHECKPOINT >= 10
    if (benchmark) {
        Scene scene{};
        resetScene(scene);
        auto job = createBenchmark(scene.document.tree, viewport(scene.camera, scene.size));
        const auto start = Clock::now();
        for (int tick = 0; tick < 20000 && job.active; ++tick) {
            if (milliseconds(start, Clock::now()) > 30000) {
                std::cerr << "Benchmark exceeded its 30-second CLI limit\n";
                return EXIT_FAILURE;
            }
            tickBenchmark(job);
        }
        if (job.active || job.stale || job.rows.size() != 2 || job.rows[0].checksum != job.rows[1].checksum) {
            return EXIT_FAILURE;
        }
        for (const auto& row : job.rows) {
            const char* method = "Brute";
            if (row.useTree)
                method = "Tree";
            std::cout << "method=" << method << " N=" << row.objects << " queries=" << row.queries << " samples=" << row.samples << " median_ms=" << row.medianMs << " min_ms=" << row.minimumMs << " max_ms=" << row.maximumMs << " candidates=" << row.candidates << " checksum=" << row.checksum << '\n';
        }
        return EXIT_SUCCESS;
    }
#endif
    if (benchmark || (argc > 1 && !smoke && !workflow)) {
        std::cerr << "Unknown or unavailable option for this checkpoint\n";
        return EXIT_FAILURE;
    }
#if LAB_CHECKPOINT < 8
    if (workflow) {
        std::cerr << "Editing workflow requires checkpoint 8 or later\n";
        return EXIT_FAILURE;
    }
#endif
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    const bool finite = smoke || workflow;
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (finite)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow("Project 29 - Quadtree Map Editor", Framebuffer::width, Framebuffer::height, flags);
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
    if (!finite && !SDL_SetRenderVSync(renderer, 1))
        SDL_Log("VSync unavailable: %s", SDL_GetError());
    PointerState pointer{};
    bool failed = false;
    try {
        Scene scene{};
        resetScene(scene);
#if LAB_CHECKPOINT >= 8
        if (workflow)
            smokeWorkflow(scene);
#endif
        Framebuffer image{};
        bool running = true;
        bool dirty = true;
        const auto start = Clock::now();
        int frames = 0;
        for (int tick = 0; running; ++tick) {
            if (finite && (tick >= 2000 || milliseconds(start, Clock::now()) > 10000)) {
                throw std::runtime_error("Smoke exceeded its finite frame/time budget");
            }
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                dirty = true;
                if (event.type == SDL_EVENT_QUIT)
                    running = false;
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                    releasePointer(pointer);
                    stopWork(scene);
                    refreshScene(scene);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                    releasePointer(pointer);
                    if (event.key.key == SDLK_ESCAPE) {
                        if (scene.gesture || workActive(scene)) {
                            stopWork(scene);
                            refreshScene(scene);
                        } else
                            running = false;
                    } else
                        applyKey(scene, event.key.key, (event.key.mod & SDL_KMOD_SHIFT) != 0);
                }
                const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_WHEEL;
                if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    throw std::runtime_error(SDL_GetError());
                }
#if LAB_CHECKPOINT >= 2
                if (event.type == SDL_EVENT_MOUSE_WHEEL && event.wheel.y != 0) {
                    const Point board{event.wheel.mouse_x, event.wheel.mouse_y};
                    if (insideBoard(board, scene)) {
                        releasePointer(pointer);
                        stopWork(scene);
                        double steps = event.wheel.y;
                        if (event.wheel.direction == SDL_MOUSEWHEEL_FLIPPED)
                            steps = -steps;
                        zoomAt(scene.camera, boardToScreen(board), scene.size, scene.camera.zoom * std::pow(1.12, std::clamp(steps, -20.0, 20.0)));
                        refreshScene(scene);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !pointer.active) {
                    const Point board{event.button.x, event.button.y};
                    if (insideBoard(board, scene)) {
                        stopWork(scene);
                        if (SDL_CaptureMouse(true)) {
                            pointer.active = true;
                            pointer.owner = event.button.which;
                            beginGesture(scene, boardToScreen(board), (SDL_GetModState() & SDL_KMOD_SHIFT) != 0);
                        }
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && pointer.active && event.motion.which == pointer.owner) {
                    if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                        releasePointer(pointer);
                        cancelGesture(scene);
                        refreshScene(scene);
                    } else
                        moveGesture(scene, boardToScreen({event.motion.x, event.motion.y}));
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && pointer.active && event.button.which == pointer.owner) {
                    endGesture(scene, boardToScreen({event.button.x, event.button.y}));
                    releasePointer(pointer);
                }
#endif
            }
            if (!running)
                break;
            const bool wasBusy = workActive(scene);
            advanceWork(scene);
            if (dirty)
                drawScene(image, scene);
            if (dirty || wasBusy || workActive(scene) || finite) {
                if (!presentFrame(renderer, texture, image, scene, dirty))
                    throw std::runtime_error(SDL_GetError());
                dirty = false;
                ++frames;
            }
            if (finite && frames >= 6) {
                if (scene.drawn != scene.visible.ids.size())
                    throw std::runtime_error("Visible objects were sampled or skipped");
                if (workflow && scene.document.tree.objects.size() != 100000)
                    throw std::runtime_error("Workflow lost dataset scale");
                std::cout << "N=" << scene.document.tree.objects.size() << " visible=" << scene.visible.ids.size() << " drawn=" << scene.drawn << " selected=" << scene.document.selection.size() << " frames=" << frames << " workflow=" << static_cast<int>(workflow) << '\n';
                running = false;
            }
            Uint32 waitMilliseconds = 8;
            if (workActive(scene)) {
                waitMilliseconds = 1;
            }
            SDL_Delay(waitMilliseconds);
        }
        stopWork(scene);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }
    releasePointer(pointer);
    destroyResources(texture, renderer, window);
    if (failed)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
} // namespace maplab
