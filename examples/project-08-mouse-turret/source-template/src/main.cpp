#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL, window và presentation; dữ liệu world không phụ thuộc DPI.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 08 - Mouse Turret", lab::Framebuffer::width, lab::Framebuffer::height, flags);
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
    if (!SDL_SetWindowMinimumSize(window, 660, 456) || !SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
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
    bool paused = false;
    bool dirty = true;
    bool running = true;
    bool failed = false;
    int smokeFrames = 0;
#if LAB_CHECKPOINT >= 5
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 1
    SDL_MouseID owner{};
    const auto cancelDrag = [&]() {
        lab::cancelDrag(scene);
        SDL_CaptureMouse(false);
    };
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 1
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                dirty = true;
#if LAB_CHECKPOINT >= 1
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    paused = !paused;
#if LAB_CHECKPOINT >= 1
                    cancelDrag();
#endif
                }
                if (event.key.key == SDLK_R && !event.key.repeat) {
#if LAB_CHECKPOINT >= 1
                    cancelDrag();
#endif
                    scene = {};
                    paused = true;
#if LAB_CHECKPOINT >= 1
                    scene.followMouse = false;
#endif
                }
#if LAB_CHECKPOINT >= 1
                if (event.key.key == SDLK_F && !event.key.repeat) {
                    cancelDrag();
                    scene.followMouse = !scene.followMouse;
                }
                if (!event.key.repeat && event.key.key >= SDLK_F1 && event.key.key <= SDLK_F7) {
                    cancelDrag();
                    lab::applyPreset(scene, static_cast<int>(event.key.key - SDLK_F1));
                    paused = true;
                }
                lab::Vec2 delta{};
                if (event.key.key == SDLK_LEFT) {
                    delta.x = -0.25;
                }
                if (event.key.key == SDLK_RIGHT) {
                    delta.x = 0.25;
                }
                if (event.key.key == SDLK_UP) {
                    delta.y = 0.25;
                }
                if (event.key.key == SDLK_DOWN) {
                    delta.y = -0.25;
                }
                if (delta.x != 0.0 || delta.y != 0.0) {
                    cancelDrag();
                    scene.followMouse = false;
                    lab::setTarget(scene, lab::add(scene.targetOffset, delta));
                }
                if (event.key.key == SDLK_A || event.key.key == SDLK_D) {
                    double step = 5.0 * lab::kPi / 180.0;
                    if (event.key.key == SDLK_A) {
                        step = -step;
                    }
                    cancelDrag();
                    paused = true;
                    scene.turretAngle = lab::normalizeAngle(scene.turretAngle + step);
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_Q) {
                    scene.turnSpeed = std::max(0.0, scene.turnSpeed - 0.25);
                }
                if (event.key.key == SDLK_E) {
                    scene.turnSpeed = std::min(lab::kTau, scene.turnSpeed + 0.25);
                }
                if (event.key.key == SDLK_S && !event.key.repeat && paused) {
                    lab::advanceScene(scene, 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_LEFTBRACKET) {
                    scene.halfViewAngle = std::max(5.0 * lab::kPi / 180.0, scene.halfViewAngle - lab::kPi / 180.0);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    scene.halfViewAngle = std::min(lab::kPi / 2.0, scene.halfViewAngle + lab::kPi / 180.0);
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !scene.dragging) {
                if (event.button.x >= 0.0f && event.button.x < 1100.0f && event.button.y >= 0.0f && event.button.y < 760.0f) {
                    owner = event.button.which;
                    scene.dragging = true;
                    lab::setTarget(scene, lab::screenToWorld({event.button.x, event.button.y}));
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (scene.dragging && event.motion.which == owner) {
                    if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                        cancelDrag();
                    } else {
                        lab::setTarget(scene, lab::screenToWorld({event.motion.x, event.motion.y}));
                        dirty = true;
                    }
                } else if (!scene.dragging && scene.followMouse && event.motion.state == 0) {
                    if (event.motion.x >= 0.0f && event.motion.x < 1100.0f && event.motion.y >= 0.0f && event.motion.y < 760.0f) {
                        lab::setTarget(scene, lab::screenToWorld({event.motion.x, event.motion.y}));
                        dirty = true;
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && scene.dragging && event.button.which == owner) {
                lab::setTarget(scene, lab::screenToWorld({event.button.x, event.button.y}));
                cancelDrag();
                dirty = true;
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 5
        const std::uint64_t now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        if (!paused) {
            lab::advanceScene(scene, deltaTime);
            dirty = true;
        }
#endif
        if (smoke) {
            dirty = true;
            ++smokeFrames;
#if LAB_CHECKPOINT >= 1
            if (smokeFrames == 2) {
                lab::applyPreset(scene, 4);
            }
#endif
#if LAB_CHECKPOINT >= 5
            lab::advanceScene(scene, 0.1);
#endif
            if (smokeFrames == 4 && !SDL_SetWindowSize(window, 900, 620)) {
                failed = true;
            }
            if (smokeFrames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, paused)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước rồi texture, renderer, window theo thứ tự ngược.
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
