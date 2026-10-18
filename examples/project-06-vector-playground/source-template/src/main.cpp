#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";

    // Setup: bộ khung dùng bảng logic cố định, SDL giữ đúng tỉ lệ khi resize.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 06 - Vector Playground", lab::Framebuffer::width, lab::Framebuffer::height, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_SetWindowMinimumSize(window, 660, 456)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
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
    if (!SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Framebuffer image;
    lab::Scene scene;
    bool running = true;
    bool failed = false;
    bool paused = false;
    bool dirty = true;
    int smokeFrames = 0;
#if LAB_CHECKPOINT >= 3
    SDL_MouseID owner{};
    const auto cancelDrag = [&]() {
        lab::cancelDrag(scene);
        SDL_CaptureMouse(false);
    };
#endif

    // Chỉ endpoint/scalar/t/view mode là state; không lưu riêng A+B hoặc A-B.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
            }
#endif
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    paused = !paused;
#if LAB_CHECKPOINT >= 3
                    cancelDrag();
#endif
                }
                if (!paused && event.key.key == SDLK_R && !event.key.repeat) {
#if LAB_CHECKPOINT >= 3
                    cancelDrag();
#endif
                    scene = {};
                    dirty = true;
                }
#if LAB_CHECKPOINT >= 3
                if (!paused && !event.key.repeat && event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5) {
                    cancelDrag();
                    lab::applyPreset(scene, static_cast<int>(event.key.key - SDLK_F1));
                    dirty = true;
                }
                if (!paused && !event.key.repeat && event.key.key == SDLK_TAB) {
                    cancelDrag();
                    scene.selected = 1 - scene.selected;
                    dirty = true;
                }
                if (!paused) {
                    lab::Vec2 delta{};
                    if (event.key.key == SDLK_LEFT) {
                        delta.x = -0.1;
                    }
                    if (event.key.key == SDLK_RIGHT) {
                        delta.x = 0.1;
                    }
                    if (event.key.key == SDLK_UP) {
                        delta.y = 0.1;
                    }
                    if (event.key.key == SDLK_DOWN) {
                        delta.y = -0.1;
                    }
                    if (delta.x != 0.0 || delta.y != 0.0) {
                        cancelDrag();
                        lab::nudgeEndpoint(scene, delta);
                        dirty = true;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!paused) {
                    if (!event.key.repeat && event.key.key == SDLK_1) {
                        scene.viewMode = lab::Scene::ViewMode::Arithmetic;
                    }
                    if (!event.key.repeat && event.key.key == SDLK_2) {
                        scene.viewMode = lab::Scene::ViewMode::Scalar;
                    }
                    if (event.key.key == SDLK_Q) {
                        scene.scalar = std::max(-2.0, scene.scalar - 0.1);
                    }
                    if (event.key.key == SDLK_E) {
                        scene.scalar = std::min(2.0, scene.scalar + 0.1);
                    }
#if LAB_CHECKPOINT >= 7
                    if (!event.key.repeat && event.key.key == SDLK_3) {
                        scene.viewMode = lab::Scene::ViewMode::Unit;
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    if (!event.key.repeat && event.key.key == SDLK_4) {
                        scene.viewMode = lab::Scene::ViewMode::Interpolation;
                    }
                    if (!event.key.repeat && event.key.key == SDLK_0) {
                        scene.viewMode = lab::Scene::ViewMode::All;
                    }
                    if (event.key.key == SDLK_LEFTBRACKET) {
                        scene.interpolation = std::max(0.0, scene.interpolation - 0.05);
                    }
                    if (event.key.key == SDLK_RIGHTBRACKET) {
                        scene.interpolation = std::min(1.0, scene.interpolation + 0.05);
                    }
#endif
                    dirty = true;
                }
#endif
            }
            if (paused) {
                continue;
            }
#if LAB_CHECKPOINT >= 3
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && scene.dragged < 0) {
                const lab::Vec2 screen{event.button.x, event.button.y};
                const bool inside = screen.x >= 0.0 && screen.y >= 0.0 && screen.x < lab::Framebuffer::width && screen.y < lab::Framebuffer::height;
                if (inside && lab::beginDrag(scene, screen)) {
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        SDL_Log("Mouse capture unavailable: %s", SDL_GetError());
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && scene.dragged >= 0 && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    lab::moveEndpoint(scene, {event.motion.x, event.motion.y});
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && scene.dragged >= 0 && event.button.which == owner) {
                lab::moveEndpoint(scene, {event.button.x, event.button.y});
                cancelDrag();
                dirty = true;
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 8
        if (smoke) {
            if (smokeFrames == 2) {
                lab::beginDrag(scene, lab::worldToScreen(scene.vectorA));
                lab::moveEndpoint(scene, {640.0, 330.0});
                lab::cancelDrag(scene);
            }
            if (smokeFrames == 4) {
                scene.viewMode = lab::Scene::ViewMode::All;
                scene.scalar = -1.5;
                scene.interpolation = 0.25;
                SDL_SetWindowSize(window, 1300, 680);
            }
            dirty = true;
        }
#endif
        if (dirty) {
            lab::renderScene(image, scene);
            if (!lab::uploadFramebuffer(texture, image)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        if (!lab::presentFramebuffer(renderer, texture, scene, paused)) {
            std::cerr << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (smoke && ++smokeFrames >= 12) {
            break;
        }
        SDL_Delay(10);
    }

    // Cleanup: trả capture trước khi hủy texture, renderer và window.
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
