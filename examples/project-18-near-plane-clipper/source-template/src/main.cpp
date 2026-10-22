#include "controls.hpp"
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL và board CPU cố định; resize chỉ thay presentation.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 18 - Near-plane Clipper", 1100, 800, flags);
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
    if (!SDL_SetWindowMinimumSize(window, 770, 560) || !SDL_SetRenderLogicalPresentation(renderer, 1100, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
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

    lab::Scene scene;
    lab::Framebuffer image;
    lab::HeldInput held;
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int frames = 0;
    std::uint64_t previousTicks = SDL_GetTicks();
#if LAB_CHECKPOINT >= 1
    lab::DragState drag;
    SDL_MouseID owner{};
    const auto cancelDrag = [&]() {
        drag = {};
        SDL_CaptureMouse(false);
    };
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
#if LAB_CHECKPOINT >= 1
                cancelDrag();
#endif
                if (event.key.key == SDLK_A || event.key.key == SDLK_D) {
                    if (event.key.key == SDLK_A) {
                        held.toward = true;
                    } else {
                        held.away = true;
                    }
                    scene.paused = true;
                } else {
                    held = {};
                    lab::handleKey(scene, event.key.key, event.key.repeat);
                }
                dirty = true;
            }
            if (event.type == SDL_EVENT_KEY_UP) {
                if (event.key.key == SDLK_A) {
                    held.toward = false;
                }
                if (event.key.key == SDLK_D) {
                    held.away = false;
                }
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
#if LAB_CHECKPOINT >= 1
                cancelDrag();
#endif
                scene.paused = true;
                held = {};
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
#if LAB_CHECKPOINT >= 1
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !drag.active) {
                const lab::Vec2 mouse{event.button.x, event.button.y};
                if (mouse.x >= 0.0 && mouse.x < 1100.0 && mouse.y >= 0.0 && mouse.y < lab::viewportHeight(scene)) {
                    held = {};
                    lab::beginDrag(scene, mouse.x, drag);
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && drag.active && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    lab::updateDrag(scene, drag, event.motion.x);
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && drag.active && event.button.which == owner) {
                lab::updateDrag(scene, drag, event.button.x);
                cancelDrag();
                dirty = true;
            }
#endif
        }
        if (!running) {
            break;
        }
        const std::uint64_t now = SDL_GetTicks();
        const double deltaSeconds = double(now - previousTicks) / 1000.0;
        previousTicks = now;
        const int axis = static_cast<int>(held.away) - static_cast<int>(held.toward);
        dirty = lab::advanceScene(scene, deltaSeconds, axis) || dirty;
        if (smoke) {
            ++frames;
            dirty = true;
            if (frames == 2) {
                lab::handleKey(scene, SDLK_2, false);
            }
            if (frames == 4 && !SDL_SetWindowSize(window, 900, 640)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 8
            if (frames == 6) {
                lab::handleKey(scene, SDLK_F, false);
            }
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            const lab::FrameStats stats = lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, stats)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước texture, renderer và window.
#if LAB_CHECKPOINT >= 1
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
