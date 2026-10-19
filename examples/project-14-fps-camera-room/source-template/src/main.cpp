#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

#if LAB_CHECKPOINT >= 7
bool setMouseLook(SDL_Window* window, bool enabled, bool& active) {
    const bool success = SDL_SetWindowRelativeMouseMode(window, enabled);
    active = SDL_GetWindowRelativeMouseMode(window);
    if (!success) {
        std::cerr << "Relative mouse mode: " << SDL_GetError() << '\n';
    }
    return success;
}
#endif

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
    SDL_Window* window = SDL_CreateWindow("Project 14 - FPS Camera Room", 1100, 800, flags);
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
    lab::RoomGeometry room;
#if LAB_CHECKPOINT >= 1
    room = lab::makeRoomGeometry(scene.bounds, 2.0);
#endif
    // Geometry được tạo một lần; vòng lặp chỉ đọc const reference ở renderer.
    const lab::RoomGeometry worldRoom = room;
    bool running = true;
    bool failed = false;
    bool dirty = true;
    bool mouseLookActive = false;
#if LAB_CHECKPOINT >= 5
    bool inputArmed = true;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
    const auto stopInput = [&]() {
#if LAB_CHECKPOINT >= 5
        inputArmed = false;
#endif
        scene.demo = false;
#if LAB_CHECKPOINT >= 7
        if ((mouseLookActive || SDL_GetWindowRelativeMouseMode(window)) && !setMouseLook(window, false, mouseLookActive)) {
            failed = true;
            running = false;
        }
#endif
    };
    int frames = 0;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN) {
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                stopInput();
                scene.paused = true;
                dirty = true;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
                if (!event.key.repeat && event.key.key == SDLK_ESCAPE) {
                    if (mouseLookActive) {
                        stopInput();
                        scene.paused = true;
                    } else {
                        running = false;
                    }
                }
                if (!event.key.repeat && (event.key.key == SDLK_R || (event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5))) {
                    stopInput();
                    int index = 0;
                    if (event.key.key != SDLK_R) {
                        index = static_cast<int>(event.key.key - SDLK_F1);
                    }
                    lab::applyPreset(scene, index);
                }
#if LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT < 5
                if (event.key.key == SDLK_LEFT) {
                    scene.camera.position.x -= 0.2;
                }
                if (event.key.key == SDLK_RIGHT) {
                    scene.camera.position.x += 0.2;
                }
                if (event.key.key == SDLK_UP) {
                    scene.camera.position.z += 0.2;
                }
                if (event.key.key == SDLK_DOWN) {
                    scene.camera.position.z -= 0.2;
                }
#endif
#endif
#if LAB_CHECKPOINT >= 3
                const double step = 3.0 * lab::kPi / 180.0;
                if (event.key.key == SDLK_J) {
                    scene.camera = lab::applyKeyboardLook(scene.camera, -step, 0.0);
                }
                if (event.key.key == SDLK_L) {
                    scene.camera = lab::applyKeyboardLook(scene.camera, step, 0.0);
                }
                if (event.key.key == SDLK_I) {
                    scene.camera = lab::applyKeyboardLook(scene.camera, 0.0, step);
                }
                if (event.key.key == SDLK_K) {
                    scene.camera = lab::applyKeyboardLook(scene.camera, 0.0, -step);
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_LEFTBRACKET) {
                    scene.speed = std::max(1.0, scene.speed - 0.5);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    scene.speed = std::min(7.0, scene.speed + 0.5);
                }
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    stopInput();
                    scene.paused = !scene.paused;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_M) {
                    stopInput();
                    lab::changeMode(scene);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_MINUS) {
                    scene.sensitivity = std::max(0.001, scene.sensitivity - 0.0005);
                }
                if (event.key.key == SDLK_PLUS || event.key.key == SDLK_EQUALS) {
                    scene.sensitivity = std::min(0.02, scene.sensitivity + 0.0005);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (!event.key.repeat && event.key.key == SDLK_N && scene.paused) {
                    scene.paused = false;
                    lab::advanceScene(scene, {0.0, 1.0, 0.0}, 0.1);
                    scene.paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_T) {
                    const bool wasDemo = scene.demo;
                    stopInput();
                    scene.demo = !wasDemo;
                    scene.paused = false;
                }
                if (!event.key.repeat && event.key.key == SDLK_F) {
                    scene.debug = !scene.debug;
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !mouseLookActive) {
                // Chỉ absolute click đổi sang logical coordinates; relative xrel/yrel KHÔNG đổi.
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
                if (event.button.x >= 0.0 && event.button.x < 1100.0 && event.button.y >= 0.0 && event.button.y < 800.0) {
                    scene.paused = false;
                    scene.demo = false;
                    setMouseLook(window, true, mouseLookActive);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && mouseLookActive && !scene.paused && (SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0) {
                scene.camera = lab::applyMouseLook(scene.camera, event.motion.xrel, event.motion.yrel, scene.sensitivity);
                dirty = true;
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 5
        const auto now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        lab::MoveInput movement{};
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0) {
            const bool* keys = SDL_GetKeyboardState(nullptr);
            bool down = false;
            bool up = false;
#if LAB_CHECKPOINT >= 6
            down = keys[SDL_SCANCODE_Q];
            up = keys[SDL_SCANCODE_E];
#endif
            const bool held = keys[SDL_SCANCODE_A] || keys[SDL_SCANCODE_D] || keys[SDL_SCANCODE_S] || keys[SDL_SCANCODE_W] || down || up;
            if (!held) {
                inputArmed = true;
            }
            if (inputArmed && !scene.paused) {
                movement = lab::makeMoveInput(keys[SDL_SCANCODE_A], keys[SDL_SCANCODE_D], keys[SDL_SCANCODE_S], keys[SDL_SCANCODE_W], down, up);
                if (held) {
                    scene.demo = false;
                }
            }
        }
#if LAB_CHECKPOINT >= 8
        if (scene.demo && !scene.paused) {
            movement.advance = 1.0;
        }
#endif
        const lab::Vec3 before = scene.camera.position;
        lab::advanceScene(scene, movement, deltaTime);
        if (lab::magnitude(lab::subtract(before, scene.camera.position)) > 0.0) {
            dirty = true;
        }
#endif
        if (smoke) {
            dirty = true;
            ++frames;
            if (frames == 2) {
                lab::applyPreset(scene, 1);
            }
            if (frames == 4 && !SDL_SetWindowSize(window, 880, 640)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 6
            if (frames == 5) {
                lab::applyPreset(scene, 3);
            }
            scene.paused = false;
            lab::advanceScene(scene, {0.0, 1.0, 1.0}, 0.05);
#endif
#if LAB_CHECKPOINT >= 8
            if (frames == 8) {
                scene.debug = false;
            }
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            const lab::RenderStats stats = lab::renderScene(image, scene, worldRoom);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, stats, mouseLookActive)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }
    // Nhả relative mode trước khi hủy window, cả ở đường lỗi.
    stopInput();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
