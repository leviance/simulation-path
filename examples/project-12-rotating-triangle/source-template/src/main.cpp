#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL và bảng logic cố định; resize/HiDPI chỉ đổi presentation.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 12 - Rotating Triangle", 1100, 800, flags);
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
    if (!SDL_SetWindowMinimumSize(window, 660, 480) || !SDL_SetRenderLogicalPresentation(renderer, 1100, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
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
    bool dirty = true;
    int frames = 0;
#if LAB_CHECKPOINT >= 6
    bool dragging = false;
    SDL_MouseID owner{};
    lab::Vec2 previousMouse{};
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto updateDrag = [&](lab::Vec2 mouse) {
        scene.angles = lab::applyMouseDrag(scene.angles, mouse.x - previousMouse.x, mouse.y - previousMouse.y, scene.sensitivity);
        previousMouse = mouse;
        dirty = true;
    };
#endif
#if LAB_CHECKPOINT >= 7
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 6
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
#if LAB_CHECKPOINT >= 6
                cancelDrag();
#endif
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (!event.key.repeat && (event.key.key == SDLK_R || (event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5))) {
                    int index = 0;
                    if (event.key.key != SDLK_R) {
                        index = static_cast<int>(event.key.key - SDLK_F1);
                    }
                    lab::applyPreset(scene, index);
                }
#if LAB_CHECKPOINT >= 1
                lab::Vec3 delta{};
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
                if (event.key.key == SDLK_PAGEUP) {
                    delta.z = 0.1;
                }
                if (event.key.key == SDLK_PAGEDOWN) {
                    delta.z = -0.1;
                }
                if (lab::magnitude(delta) > 0.0) {
                    lab::moveModel(scene, delta);
                }
#endif
#if LAB_CHECKPOINT >= 3
                const double angleStep = 5.0 * lab::kPi / 180.0;
                if (event.key.key == SDLK_W) {
                    scene.angles.pitch = lab::wrapAngle(scene.angles.pitch + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_S) {
                    scene.angles.pitch = lab::wrapAngle(scene.angles.pitch - angleStep);
                    scene.paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_A) {
                    scene.angles.yaw = lab::wrapAngle(scene.angles.yaw - angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_D) {
                    scene.angles.yaw = lab::wrapAngle(scene.angles.yaw + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_Q) {
                    scene.angles.roll = lab::wrapAngle(scene.angles.roll - angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_E) {
                    scene.angles.roll = lab::wrapAngle(scene.angles.roll + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_O && !event.key.repeat) {
                    if (scene.order == lab::RotationOrder::Xyz) {
                        scene.order = lab::RotationOrder::Zyx;
                    } else {
                        scene.order = lab::RotationOrder::Xyz;
                    }
                    scene.paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_LEFTBRACKET) {
                    scene.sensitivity = std::max(0.002, scene.sensitivity - 0.001);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    scene.sensitivity = std::min(0.02, scene.sensitivity + 0.001);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    scene.paused = !scene.paused;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused) {
                    lab::advanceScene(scene, 0.1);
                }
                if (event.key.key == SDLK_F && !event.key.repeat) {
                    scene.debug = !scene.debug;
                }
#endif
            }
#if LAB_CHECKPOINT >= 6
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                const auto viewport = lab::viewportFor();
                if (event.button.x >= viewport.x && event.button.x <= viewport.x + viewport.width && event.button.y >= viewport.y && event.button.y <= viewport.y + viewport.height) {
                    owner = event.button.which;
                    previousMouse = {event.button.x, event.button.y};
                    dragging = true;
                    scene.paused = true;
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    updateDrag({event.motion.x, event.motion.y});
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                updateDrag({event.button.x, event.button.y});
                cancelDrag();
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 7
        const auto now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        if (!scene.paused) {
            lab::advanceScene(scene, deltaTime);
            dirty = true;
        }
#endif
        if (smoke) {
            dirty = true;
            ++frames;
            if (frames == 2) {
                lab::applyPreset(scene, 2);
            }
            if (frames == 4 && !SDL_SetWindowSize(window, 880, 640)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 7
            lab::advanceScene(scene, 0.1);
            if (frames == 6) {
                scene.debug = false;
            }
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }
    // Giải phóng capture trước, rồi texture, renderer, window theo thứ tự ngược.
#if LAB_CHECKPOINT >= 6
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
