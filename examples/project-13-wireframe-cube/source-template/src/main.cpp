#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
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
    SDL_Window* window = SDL_CreateWindow("Project 13 - CPU Wireframe Cube", 1100, 800, flags);
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
    lab::applyPreset(scene, 0);
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int frames = 0;
#if LAB_CHECKPOINT >= 5
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
#if LAB_CHECKPOINT >= 5
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN) {
                dirty = true;
            }
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 5
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
#if LAB_CHECKPOINT >= 5
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
#if LAB_CHECKPOINT >= 3
                const double angleStep = 5.0 * lab::kPi / 180.0;
                if (event.key.key == SDLK_UP) {
                    scene.angles.pitch = lab::wrapAngle(scene.angles.pitch + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_DOWN) {
                    scene.angles.pitch = lab::wrapAngle(scene.angles.pitch - angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_LEFT) {
                    scene.angles.yaw = lab::wrapAngle(scene.angles.yaw - angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_RIGHT) {
                    scene.angles.yaw = lab::wrapAngle(scene.angles.yaw + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_PAGEUP) {
                    scene.angles.roll = lab::wrapAngle(scene.angles.roll + angleStep);
                    scene.paused = true;
                }
                if (event.key.key == SDLK_PAGEDOWN) {
                    scene.angles.roll = lab::wrapAngle(scene.angles.roll - angleStep);
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
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_P && !event.key.repeat) {
                    if (scene.projection == lab::ProjectionMode::Perspective) {
                        scene.projection = lab::ProjectionMode::Orthographic;
                    } else {
                        scene.projection = lab::ProjectionMode::Perspective;
                    }
                    scene.paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_EQUALS || event.key.key == SDLK_PLUS) {
                    lab::zoomScene(scene, 1.0);
                }
                if (event.key.key == SDLK_MINUS) {
                    lab::zoomScene(scene, -1.0);
                }
                if (event.key.key == SDLK_LEFTBRACKET) {
                    scene.sensitivity = std::max(0.002, scene.sensitivity - 0.001);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    scene.sensitivity = std::min(0.02, scene.sensitivity + 0.001);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    scene.paused = !scene.paused;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused) {
                    lab::advanceScene(scene, 0.1);
                }
                if (event.key.key == SDLK_C && !event.key.repeat) {
                    scene.depthCue = !scene.depthCue;
                }
                if (event.key.key == SDLK_F && !event.key.repeat) {
                    scene.debug = !scene.debug;
                }
#endif
            }
#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                cancelDrag();
                double steps = event.wheel.y;
                if (event.wheel.direction == SDL_MOUSEWHEEL_FLIPPED) {
                    steps = -steps;
                }
                lab::zoomScene(scene, steps);
                dirty = true;
            }
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
#if LAB_CHECKPOINT >= 5
        const auto now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        // Input liên tục sau SDL_PollEvent; không phụ thuộc tốc độ key repeat.
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0) {
            const bool* keys = SDL_GetKeyboardState(nullptr);
            lab::Vec3 direction{};
            if (keys[SDL_SCANCODE_A]) {
                direction.x -= 1.0;
            }
            if (keys[SDL_SCANCODE_D]) {
                direction.x += 1.0;
            }
            if (keys[SDL_SCANCODE_Q]) {
                direction.y -= 1.0;
            }
            if (keys[SDL_SCANCODE_E]) {
                direction.y += 1.0;
            }
            if (keys[SDL_SCANCODE_S]) {
                direction.z -= 1.0;
            }
            if (keys[SDL_SCANCODE_W]) {
                direction.z += 1.0;
            }
            if (lab::magnitude(direction) > 0.0) {
                cancelDrag();
                lab::moveModel(scene, direction, deltaTime);
                dirty = true;
            }
        }
#if LAB_CHECKPOINT >= 6
        if (!scene.paused) {
            lab::advanceScene(scene, deltaTime);
            dirty = true;
        }
#endif
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
#if LAB_CHECKPOINT >= 6
            lab::advanceScene(scene, 0.1);
            if (frames == 6) {
                scene.debug = false;
            }
#endif
#if LAB_CHECKPOINT >= 4
            if (frames == 8) {
                scene.projection = lab::ProjectionMode::Orthographic;
            }
#endif
#if LAB_CHECKPOINT >= 5
            lab::zoomScene(scene, 0.1);
            lab::moveModel(scene, {1.0, 0.0, 0.0}, 0.01);
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            const lab::RenderStats stats = lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, stats)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }
    // Giải phóng capture trước, rồi texture, renderer, window theo thứ tự ngược.
#if LAB_CHECKPOINT >= 5
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
