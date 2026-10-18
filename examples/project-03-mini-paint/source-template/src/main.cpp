#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#include "presentation.hpp"
#include <SDL3/SDL.h>
#if LAB_CHECKPOINT >= 1
#include "paint.hpp"
#endif
#if LAB_CHECKPOINT >= 3
#include <cstdio>
#endif
#if LAB_CHECKPOINT >= 6
#include <string_view>
#endif
#include <cstdlib>
#include <iostream>

#if LAB_CHECKPOINT >= 6
int main(int argc, char* argv[]) {
    bool smoke = false;
    if (argc == 2 && std::string_view(argv[1]) == "--smoke") {
        smoke = true;
    } else if (argc != 1) {
        std::cerr << "Usage: project_3_final [--smoke]\n";
        return EXIT_FAILURE;
    }
#else
int main() {
#endif
    // Setup: tái sử dụng ảnh logic 960x540 và texture từ Project 02.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
#if LAB_CHECKPOINT >= 6
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const char* windowTitle = "Mini Paint | drag left | 1-4 color | [ ] size | C clear | D sample";
#elif LAB_CHECKPOINT >= 3
    const char* windowTitle = "Mini Paint | drag left | S sampling | D sample";
#elif LAB_CHECKPOINT >= 2
    const char* windowTitle = "Mini Paint | circular brush without interpolation";
#elif LAB_CHECKPOINT >= 1
    const char* windowTitle = "Mini Paint | left click and drag: individual pixels";
#else
    const char* windowTitle = "Mini Paint | starter: persistent framebuffer";
#endif
    SDL_Window* window = SDL_CreateWindow(windowTitle, lab::Framebuffer::width, lab::Framebuffer::height, flags);
    if (!window) {
        std::cerr << "Window failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "Renderer failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << "Logical presentation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture) {
        std::cerr << "Texture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Framebuffer framebuffer;
    framebuffer.clear(lab::kBackground);
    bool running = true;
    bool failed = false;
    bool dirty = true;
#if LAB_CHECKPOINT >= 1
    lab::PaintState state;
    SDL_MouseID strokeMouse = 0;
#endif
#if LAB_CHECKPOINT >= 6
    int smokeFrames = 0;
    if (smoke) {
        lab::drawDemo(framebuffer, state);
    }
#endif

    // Không clear framebuffer mỗi frame: các nét đã vẽ phải được giữ nguyên.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
                running = false;
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_MOUSE_LEAVE) {
                lab::cancelStroke(state);
                SDL_CaptureMouse(false);
            }
#endif
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_D) {
                    SDL_CaptureMouse(false);
                    lab::drawDemo(framebuffer, state);
                    dirty = true;
                }
#if LAB_CHECKPOINT <= 4
                if (event.key.key == SDLK_S) {
                    lab::cancelStroke(state);
                    SDL_CaptureMouse(false);
                    state.sampleEvery *= 2;
                    if (state.sampleEvery > 8) {
                        state.sampleEvery = 1;
                    }
                    dirty = true;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_4) {
                    lab::chooseColor(state, static_cast<int>(event.key.key - SDLK_1));
                    SDL_CaptureMouse(false);
                    dirty = true;
                }
                if (event.key.key == SDLK_LEFTBRACKET) {
                    lab::changeRadius(state, -2);
                    SDL_CaptureMouse(false);
                    dirty = true;
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    lab::changeRadius(state, 2);
                    SDL_CaptureMouse(false);
                    dirty = true;
                }
                if (event.key.key == SDLK_C) {
                    lab::clearPainting(framebuffer, state);
                    SDL_CaptureMouse(false);
                    dirty = true;
                }
#endif
            }
#endif
#if LAB_CHECKPOINT >= 1
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << "Mouse coordinates failed: " << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }

            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::Point point{event.button.x, event.button.y};
                if (lab::beginStroke(framebuffer, state, point)) {
                    strokeMouse = event.button.which;
                    dirty = true;
                    if (!SDL_CaptureMouse(true)) {
                        std::cerr << "Capture unavailable: " << SDL_GetError() << '\n';
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && event.motion.which == strokeMouse && state.drawing) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    lab::cancelStroke(state);
                } else {
                    const lab::Point current{event.motion.x, event.motion.y};
                    if (lab::moveStroke(framebuffer, state, current)) {
                        dirty = true;
                    }
                }
                if (!state.drawing) {
                    SDL_CaptureMouse(false);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && event.button.which == strokeMouse) {
                const lab::Point endpoint{event.button.x, event.button.y};
                if (lab::endStroke(framebuffer, state, endpoint)) {
                    dirty = true;
                }
                SDL_CaptureMouse(false);
            }
#endif
        }
        if (failed || !running) {
            break;
        }
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_MINIMIZED) != 0) {
            SDL_Delay(30);
            continue;
        }
        if (dirty) {
            if (!lab::uploadFramebuffer(texture, framebuffer)) {
                std::cerr << "Upload failed: " << SDL_GetError() << '\n';
                failed = true;
                break;
            }
#if LAB_CHECKPOINT >= 3
            char title[256]{};
#if LAB_CHECKPOINT >= 5
            std::snprintf(title, sizeof(title), "Mini Paint | r=%d | %d kept | %d stamps | input gap %.1fpx | 1-4 color | [ ] size | C clear | D demo", state.radius, state.accepted, state.stamps, state.maximumGap);
#else
            std::snprintf(title, sizeof(title), "Mini Paint | r=%d | 1/%d samples | %d kept | %d stamps | input gap %.1fpx | S sampling | D demo", state.radius, state.sampleEvery, state.accepted, state.stamps, state.maximumGap);
#endif
            if (!SDL_SetWindowTitle(window, title)) {
                std::cerr << "Title failed: " << SDL_GetError() << '\n';
                failed = true;
                break;
            }
#endif
            dirty = false;
        }
        if (!lab::presentFramebuffer(renderer, texture)) {
            std::cerr << "Present failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        // Chỉ nhường CPU; tốc độ lấy mẫu chuột không được suy từ độ trễ này.
        SDL_Delay(10);
#if LAB_CHECKPOINT >= 6
        if (smoke) {
            ++smokeFrames;
            if (!SDL_SetWindowSize(window, 640 + 10 * smokeFrames, 400 + 5 * smokeFrames)) {
                std::cerr << "Smoke resize failed: " << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            if (smokeFrames == 6) {
                lab::chooseColor(state, 2);
                lab::changeRadius(state, -4);
                lab::drawDemo(framebuffer, state);
                dirty = true;
            }
            if (smokeFrames >= 12) {
                std::cout << "P03 hidden smoke: 12 frames, brush, interpolation, palette, resize, upload/present\n";
                running = false;
            }
        }
#endif
    }

    // Cleanup: nhả capture, hủy texture trước renderer, rồi window và SDL.
#if LAB_CHECKPOINT >= 1
    lab::cancelStroke(state);
    SDL_CaptureMouse(false);
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
