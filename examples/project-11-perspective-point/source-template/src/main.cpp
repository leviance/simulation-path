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
    SDL_Window* window = SDL_CreateWindow("Project 11 - Perspective Point", 1100, 800, flags);
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
    std::uint64_t previousTicks = SDL_GetTicks();
#if LAB_CHECKPOINT >= 7
    bool dragging = false;
    SDL_MouseID owner{};
    lab::Vec2 grabOffset{};
    double dragDepth = 0.0;
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto updateDrag = [&](lab::Vec2 mouse) {
        const lab::Vec2 target{mouse.x - grabOffset.x, mouse.y - grabOffset.y};
        const auto cameraPoint = lab::screenToCameraAtDepth(target, dragDepth, scene.lens, lab::viewportFor(scene));
        if (cameraPoint) {
            const lab::Vec3 world = lab::cameraToWorld(*cameraPoint, scene.camera);
            scene.point = {std::clamp(world.x, -6.0, 6.0), std::clamp(world.y, -6.0, 6.0), std::clamp(world.z, -2.0, 20.0)};
            dirty = true;
        }
    };
#endif
    while (running) {
        const std::uint64_t now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 7
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
#if LAB_CHECKPOINT >= 7
                // Input đổi scene không được để lại một thao tác kéo dùng camera/depth cũ.
                cancelDrag();
#endif
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (!event.key.repeat && (event.key.key == SDLK_R || (event.key.key >= SDLK_F1 && event.key.key <= SDLK_F6))) {
                    int preset = 0;
                    if (event.key.key != SDLK_R) {
                        preset = static_cast<int>(event.key.key - SDLK_F1);
                    }
                    lab::applyPreset(scene, preset);
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_J) {
                    scene.paused = true;
                    scene.camera.position.x = std::max(-2.0, scene.camera.position.x - 0.1);
                }
                if (event.key.key == SDLK_L) {
                    scene.paused = true;
                    scene.camera.position.x = std::min(2.0, scene.camera.position.x + 0.1);
                }
                if (event.key.key == SDLK_I) {
                    scene.paused = true;
                    scene.camera.position.y = std::min(2.0, scene.camera.position.y + 0.1);
                }
                if (event.key.key == SDLK_K) {
                    scene.paused = true;
                    scene.camera.position.y = std::max(-2.0, scene.camera.position.y - 0.1);
                }
                if (event.key.key == SDLK_U) {
                    scene.paused = true;
                    scene.camera.position.z = std::max(-2.0, scene.camera.position.z - 0.1);
                }
                if (event.key.key == SDLK_O) {
                    scene.paused = true;
                    scene.camera.position.z = std::min(2.0, scene.camera.position.z + 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_EQUALS) {
                    scene.paused = true;
                    scene.lens.verticalFovRadians = std::max(25.0 * lab::kPi / 180.0, scene.lens.verticalFovRadians - lab::kPi / 180.0);
                }
                if (event.key.key == SDLK_MINUS) {
                    scene.paused = true;
                    scene.lens.verticalFovRadians = std::min(110.0 * lab::kPi / 180.0, scene.lens.verticalFovRadians + lab::kPi / 180.0);
                }
                if (event.key.key == SDLK_V && !event.key.repeat) {
                    scene.paused = true;
                    scene.aspect = (scene.aspect + 1) % 3;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_LEFTBRACKET) {
                    scene.paused = true;
                    scene.lens.nearPlane = std::max(0.1, scene.lens.nearPlane - 0.1);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    scene.paused = true;
                    scene.lens.nearPlane = std::min(2.0, scene.lens.nearPlane + 0.1);
                }
                if (event.key.key == SDLK_SEMICOLON) {
                    scene.paused = true;
                    scene.lens.farPlane = std::max(8.0, scene.lens.farPlane - 0.5);
                }
                if (event.key.key == SDLK_APOSTROPHE) {
                    scene.paused = true;
                    scene.lens.farPlane = std::min(24.0, scene.lens.farPlane + 0.5);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    scene.paused = !scene.paused;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused) {
                    lab::advanceScene(scene, 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_F && !event.key.repeat) {
                    scene.debug = !scene.debug;
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                const auto viewport = lab::viewportFor(scene);
                const auto projected = lab::projectPerspective(scene.point, scene.camera, scene.lens, lab::viewportFor(scene));
                const bool insideViewport = event.button.x >= viewport.x && event.button.x <= viewport.x + viewport.width && event.button.y >= viewport.y && event.button.y <= viewport.y + viewport.height;
                if (insideViewport && projected.status == lab::ProjectionStatus::Visible && projected.screen && std::hypot(event.button.x - projected.screen->x, event.button.y - projected.screen->y) <= 24.0) {
                    owner = event.button.which;
                    grabOffset = {event.button.x - projected.screen->x, event.button.y - projected.screen->y};
                    dragDepth = projected.cameraPoint.z;
                    dragging = true;
                    scene.paused = true;
                    dirty = true;
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
#if LAB_CHECKPOINT >= 1
        // Giữ phím dùng delta time, không phụ thuộc tốc độ key-repeat của hệ điều hành.
        const bool* keys = SDL_GetKeyboardState(nullptr);
        lab::Vec3 direction{};
        if (keys[SDL_SCANCODE_A]) {
            direction.x -= 1.0;
        }
        if (keys[SDL_SCANCODE_D]) {
            direction.x += 1.0;
        }
        if (keys[SDL_SCANCODE_W]) {
            direction.y += 1.0;
        }
        if (keys[SDL_SCANCODE_S]) {
            direction.y -= 1.0;
        }
        if (keys[SDL_SCANCODE_Q]) {
            direction.z -= 1.0;
        }
        if (keys[SDL_SCANCODE_E]) {
            direction.z += 1.0;
        }
        const double length = std::hypot(direction.x, direction.y, direction.z);
        if (length > 0.0 && (SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0) {
#if LAB_CHECKPOINT >= 7
            cancelDrag();
#endif
            const double distance = 2.0 * deltaTime / length;
            lab::movePoint(scene, {direction.x * distance, direction.y * distance, direction.z * distance});
            dirty = true;
        }
#else
        (void)deltaTime;
#endif
#if LAB_CHECKPOINT >= 6
        if (!scene.paused) {
            lab::advanceScene(scene, deltaTime);
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
            lab::advanceScene(scene, 0.1);
#endif
#if LAB_CHECKPOINT >= 8
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
#if LAB_CHECKPOINT >= 7
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
