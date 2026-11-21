#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    const char* capturePath = nullptr;
#if LAB_CHECKPOINT >= 8
    bool startWithRuler = false;
    bool midFlight = false;
    bool flightSmoke = false;
#endif
    for (int i = 1; i < argc; ++i) {
        const std::string_view argument = argv[i];
        if (argument == "--smoke") {
            smoke = true;
        } else if (argument == "--capture" && i + 1 < argc) {
            capturePath = argv[++i];
#if LAB_CHECKPOINT >= 8
        } else if (argument == "--ruler") {
            startWithRuler = true;
        } else if (argument == "--in-flight") {
            midFlight = true;
        } else if (argument == "--smoke-flight") {
            flightSmoke = true;
#endif
        } else {
            std::cerr << "Unknown or incomplete option: " << argument << '\n';
            return EXIT_FAILURE;
        }
    }
    // Khởi tạo SDL và bảng logic cố định; resize/HiDPI chỉ đổi presentation.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke || capturePath
#if LAB_CHECKPOINT >= 8
        || flightSmoke
#endif
    ) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Starfield | Perspective Flight - Project 11", 1100, 800, flags);
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
#if LAB_CHECKPOINT >= 8
    scene.measureDepth = startWithRuler;
    scene.debug = startWithRuler;
    if (midFlight) {
        lab::setCameraDepth(scene, 2.0);
    }
#endif
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
#if LAB_CHECKPOINT >= 8
        // Chạy một chuỗi sự kiện thật qua SDL; mỗi nhịp kiểm dùng đúng 0,1 giây.
        if (flightSmoke && frames < 7) {
            SDL_Event input{};
            input.type = SDL_EVENT_KEY_DOWN;
            input.key.key = SDLK_W;
            if (frames == 1 || frames == 4) input.key.key = SDLK_S;
            if (frames == 2 || frames == 3) input.type = SDL_EVENT_KEY_UP;
            if (frames == 2) input.key.key = SDLK_S;
            if (frames == 5) input.type = SDL_EVENT_WINDOW_FOCUS_LOST;
            if (frames == 6) input.key.key = SDLK_N;
            if (!SDL_PushEvent(&input)) { failed = true; break; }
        }
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 6
                lab::stopFlight(scene);
#endif
#if LAB_CHECKPOINT >= 7
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_KEY_UP) {
                if (event.key.key == SDLK_W) scene.forwardHeld = false;
                if (event.key.key == SDLK_S) scene.backwardHeld = false;
                dirty = true;
            }
#endif
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
#if LAB_CHECKPOINT >= 7
                // Input đổi scene không được để lại một thao tác kéo dùng camera/depth cũ.
                cancelDrag();
#endif
#if LAB_CHECKPOINT >= 6
                switch (event.key.key) {
                case SDLK_J: case SDLK_L: case SDLK_EQUALS: case SDLK_MINUS: case SDLK_V:
                case SDLK_LEFTBRACKET: case SDLK_RIGHTBRACKET: case SDLK_SEMICOLON: case SDLK_APOSTROPHE:
                case SDLK_F: case SDLK_M:
                    lab::stopFlight(scene);
                    break;
                default: break;
                }
                // Không để key-repeat bật lại chuyến bay sau khi cửa sổ mất focus.
                if (!event.key.repeat && event.key.key == SDLK_W) {
                    scene.forwardHeld = true;
                    scene.paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_S) {
                    scene.backwardHeld = true;
                    scene.paused = true;
                }
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
                    if (event.key.key != SDLK_R) scene.debug = true;
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_J) {
                    scene.paused = true;
                    lab::setCameraDepth(scene, scene.camera.position.z - 0.1);
                }
                if (event.key.key == SDLK_L) {
                    scene.paused = true;
                    lab::setCameraDepth(scene, scene.camera.position.z + 0.1);
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
                    const bool wasCruising = !scene.paused;
                    lab::stopFlight(scene);
                    scene.paused = wasCruising;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused && !scene.forwardHeld && !scene.backwardHeld) {
                    lab::advanceScene(scene, 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_F && !event.key.repeat) {
                    scene.debug = !scene.debug;
                }
                if (event.key.key == SDLK_M && !event.key.repeat) {
                    scene.measureDepth = !(scene.measureDepth && scene.debug);
                    scene.debug = true;
                    scene.paused = true;
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
                const bool probeVisible = scene.debug;
                if (probeVisible && insideViewport && projected.status == lab::ProjectionStatus::Visible && projected.screen && std::hypot(event.button.x - projected.screen->x, event.button.y - projected.screen->y) <= 24.0) {
                    owner = event.button.which;
                    grabOffset = {event.button.x - projected.screen->x, event.button.y - projected.screen->y};
                    dragDepth = projected.cameraPoint.z;
                    dragging = true;
                    lab::stopFlight(scene);
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
        if (keys[SDL_SCANCODE_LEFT]) {
            direction.x -= 1.0;
        }
        if (keys[SDL_SCANCODE_RIGHT]) {
            direction.x += 1.0;
        }
        if (keys[SDL_SCANCODE_UP]) {
            direction.y += 1.0;
        }
        if (keys[SDL_SCANCODE_DOWN]) {
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
        const double directionZ = lab::flightDirection(scene);
        if (directionZ != 0.0) {
            double frameTime = deltaTime;
#if LAB_CHECKPOINT >= 8
            if (flightSmoke) frameTime = 0.1;
#endif
            lab::advanceScene(scene, frameTime, directionZ);
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
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, capturePath)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
            if (capturePath) {
                running = false;
            }
        }
#if LAB_CHECKPOINT >= 8
        if (flightSmoke) {
            constexpr double expected[] = {0.2, 0.2, 0.4, 0.4, 0.2, 0.2, 0.4, 0.4};
            if (std::abs(scene.camera.position.z - expected[frames]) > 1e-8) {
                std::cerr << "Flight input at frame " << frames << ": expected " << expected[frames] << ", got " << scene.camera.position.z << '\n';
                failed = true;
                break;
            }
            ++frames;
            if (frames == 8) running = false;
        }
#endif
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
#if LAB_CHECKPOINT >= 8
    if (flightSmoke) std::cout << "SDL flight PASS: W/S, opposite keys, release, lost focus and single step\n";
#endif
    if (smoke) {
        std::cout << "SDL smoke PASS: " << frames << " frames\n";
    }
    return EXIT_SUCCESS;
}
