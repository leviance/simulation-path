#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#include "presentation.hpp"
#include "view.hpp"
#if LAB_CHECKPOINT >= 6
#include "benchmark.hpp"
#include <string_view>
#endif
#include <cstdio>
#include <cstdlib>
#include <iostream>

namespace {
#if LAB_CHECKPOINT >= 2
void handleKey(SDL_Keycode key, bool shift, lab::Scene& scene) {
    if (key == SDLK_D) {
        scene.algorithm = lab::Algorithm::Dda;
    }
    if (key == SDLK_B) {
        scene.algorithm = lab::Algorithm::Bresenham;
    }
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_1) {
        scene.tool = lab::Tool::Line;
        scene.inspectedStep = 0;
    }
    if (key == SDLK_O) {
        lab::selectOctant(scene);
    }
    if (key == SDLK_Z) {
        scene.zoom = !scene.zoom;
    }
    if (key == SDLK_LEFT && scene.inspectedStep > 0) {
        --scene.inspectedStep;
    }
    if (key == SDLK_RIGHT) {
        ++scene.inspectedStep;
    }
    if (key == SDLK_HOME) {
        scene.inspectedStep = 0;
    }
    if (key == SDLK_END) {
        scene.inspectedStep = 1'048'576;
    }
    int dx = 0;
    int dy = 0;
    // D dành cho DDA; dùng I/J/K/L để không chồng phím chọn thuật toán.
    if (key == SDLK_J) {
        dx = -1;
    }
    if (key == SDLK_L) {
        dx = 1;
    }
    if (key == SDLK_I) {
        dy = -1;
    }
    if (key == SDLK_K) {
        dy = 1;
    }
    if (dx != 0 || dy != 0) {
        scene.dragged = 1;
        if (shift) {
            scene.dragged = 0;
        }
        lab::Point handle = lab::secondHandle(scene);
        if (shift) {
            handle = scene.a;
        }
        const auto point = lab::imagePoint(handle.x + dx, handle.y + dy);
        if (point) {
            lab::moveHandle(scene, *point);
        }
        lab::cancelDrag(scene);
    }
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_2) {
        scene.tool = lab::Tool::Rectangle;
        scene.inspectedStep = 0;
    }
    if (key == SDLK_F) {
        scene.filled = !scene.filled;
        scene.inspectedStep = 0;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_3) {
        scene.tool = lab::Tool::Circle;
        scene.inspectedStep = 0;
    }
    if (key == SDLK_LEFTBRACKET) {
        scene.radius = std::max(0, scene.radius - 1);
    }
    if (key == SDLK_RIGHTBRACKET) {
        scene.radius = std::min(256, scene.radius + 1);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_4) {
        scene.tool = lab::Tool::Gallery;
    }
#endif
#else
    (void)shift;
#endif
}
#endif

void updateTitle(SDL_Window* window, const lab::Scene& scene, const lab::SceneFrame& frame) {
#if LAB_CHECKPOINT >= 3
    char title[300]{};
    if (scene.tool == lab::Tool::Line && !frame.line.empty()) {
        const auto& step = frame.line[scene.inspectedStep];
        if (scene.algorithm == lab::Algorithm::Dda) {
            std::snprintf(title, sizeof(title), "DDA | step %zu/%zu | pixel (%d,%d) | continuous (%.3f,%.3f) | D/B O Z Left/Right IJKL Shift", scene.inspectedStep + 1, frame.line.size(), step.point.x, step.point.y, step.x, step.y);
        } else {
            std::snprintf(title, sizeof(title), "Bresenham | step %zu/%zu | pixel (%d,%d) | error %d e2 %d | move X=%d Y=%d | D/B O Z Left/Right", scene.inspectedStep + 1, frame.line.size(), step.point.x, step.point.y, step.error, step.doubledError, step.movesX, step.movesY);
        }
    } else {
#if LAB_CHECKPOINT >= 6
        constexpr const char* kTools = "1 line 2 rect 3 circle 4 gallery | F fill Z zoom | T benchmark/cancel";
#elif LAB_CHECKPOINT >= 5
        constexpr const char* kTools = "1 line 2 rect 3 circle | F fill Z zoom | [/] radius";
#elif LAB_CHECKPOINT >= 4
        constexpr const char* kTools = "1 line 2 rect | F fill Z zoom";
#else
        constexpr const char* kTools = "1 line | D/B O Z Left/Right";
#endif
        std::snprintf(title, sizeof(title), "2D Rasterizer | %zu generated pixels | %s", frame.points.size(), kTools);
    }
    SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
    (void)frame;
    if (scene.algorithm == lab::Algorithm::Dda) {
        SDL_SetWindowTitle(window, "DDA | D/B: compare algorithms");
    } else {
        SDL_SetWindowTitle(window, "Bresenham | D/B: compare algorithms");
    }
#elif LAB_CHECKPOINT >= 1
    (void)scene;
    (void)frame;
    SDL_SetWindowTitle(window, "DDA | A(220,270) -> B(740,150)");
#else
    (void)window;
    (void)scene;
    (void)frame;
#endif
}
} // namespace

int main(int argc, char** argv) {
    bool smoke = false;
#if LAB_CHECKPOINT >= 6
    if (argc == 2 && std::string_view(argv[1]) == "--benchmark") {
        lab::Benchmark benchmark;
        lab::beginBenchmark(benchmark);
        while (benchmark.active) {
            lab::advanceBenchmark(benchmark);
        }
        lab::printBenchmark(benchmark);
        if (!benchmark.complete) {
            return EXIT_FAILURE;
        }
        return EXIT_SUCCESS;
    }
    if (argc == 2 && std::string_view(argv[1]) == "--smoke") {
        smoke = true;
    } else if (argc != 1) {
        std::cerr << "Usage: project_4_final [--smoke|--benchmark]\n";
        return EXIT_FAILURE;
    }
#else
    (void)argc;
    (void)argv;
#endif

    // Setup: SDL chỉ hiển thị texture; mọi primitive được rasterize vào ảnh CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 04 - 2D Rasterizer", lab::Framebuffer::width, lab::Framebuffer::height, flags);
    if (!window) {
        std::cerr << "SDL_CreateWindow: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "SDL_CreateRenderer: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture || !SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << "Texture/logical presentation: " << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Framebuffer framebuffer;
    lab::Scene scene;
    lab::SceneFrame frame;
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int smokeFrames = 0;
#if LAB_CHECKPOINT >= 3
    SDL_MouseID owner = 0;
    const auto cancelDrag = [&]() {
        lab::cancelDrag(scene);
        SDL_CaptureMouse(false);
    };
#endif
#if LAB_CHECKPOINT >= 6
    lab::Benchmark benchmark;
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.repeat) {
                    continue;
                }
#if LAB_CHECKPOINT >= 3
                cancelDrag();
#endif
#if LAB_CHECKPOINT >= 2
                handleKey(event.key.key, (event.key.mod & SDL_KMOD_SHIFT) != 0, scene);
                dirty = true;
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_T) {
                    if (benchmark.active) {
                        benchmark.active = false;
                        lab::printBenchmark(benchmark);
                    } else {
                        lab::beginBenchmark(benchmark);
                    }
                }
#endif
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_MOUSE_LEAVE) {
                cancelDrag();
            }
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << "Mouse coordinates: " << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const auto point = lab::imagePoint(event.button.x, event.button.y);
                if (point && lab::beginDrag(scene, *point)) {
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        SDL_Log("Capture unavailable: %s", SDL_GetError());
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && scene.dragged >= 0 && event.motion.which == owner) {
                const auto point = lab::imagePoint(event.motion.x, event.motion.y);
                if (!point || (event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    lab::moveHandle(scene, *point);
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && event.button.which == owner) {
                const auto point = lab::imagePoint(event.button.x, event.button.y);
                if (point) {
                    lab::endDrag(scene, *point);
                    dirty = true;
                }
                cancelDrag();
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 6
        if (benchmark.active) {
            lab::advanceBenchmark(benchmark);
            char title[150]{};
            std::snprintf(title, sizeof(title), "Benchmark | round %d/7 | %zu/%zu lines | T: cancel | Escape: quit", benchmark.round + 1, benchmark.cursor, benchmark.segments.size());
            SDL_SetWindowTitle(window, title);
            if (!benchmark.active) {
                lab::printBenchmark(benchmark);
                dirty = true;
            }
        }
        if (smoke) {
            scene.zoom = true;
            if (smokeFrames == 3) {
                scene.tool = lab::Tool::Rectangle;
                scene.filled = true;
                SDL_SetWindowSize(window, 1200, 650);
            }
            if (smokeFrames == 6) {
                scene.tool = lab::Tool::Circle;
                scene.filled = true;
            }
            if (smokeFrames == 9) {
                scene.tool = lab::Tool::Gallery;
            }
            dirty = true;
        }
#endif
        if (dirty) {
            frame = lab::renderScene(framebuffer, scene);
            if (!lab::uploadFramebuffer(texture, framebuffer)) {
                std::cerr << "SDL_UpdateTexture: " << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            updateTitle(window, scene, frame);
            dirty = false;
        }
        if (!lab::presentFramebuffer(renderer, texture)) {
            std::cerr << "SDL present: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (smoke && ++smokeFrames >= 12) {
            break;
        }
#if LAB_CHECKPOINT >= 6
        if (benchmark.active) {
            SDL_Delay(1);
        } else
#endif
        {
            SDL_Delay(10);
        }
    }

    // Cleanup: không để capture tiếp tục tồn tại sau khi thoát.
#if LAB_CHECKPOINT >= 3
    cancelDrag();
#endif
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
