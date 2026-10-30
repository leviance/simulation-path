#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc == 2 && std::string_view(argv[1]) == "--smoke";
    const char* snapshotPath = nullptr;
    if (argc == 3 && std::string_view(argv[1]) == "--snapshot") {
        snapshotPath = argv[2];
    }
    if (argc > 1 && !smoke && !snapshotPath) {
        std::cerr << "Usage: project_10_final [--smoke | --snapshot image.bmp]\n";
        return EXIT_FAILURE;
    }
    // Khởi tạo SDL và bảng logic cố định; resize/HiDPI chỉ đổi presentation.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke || snapshotPath) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 10 - 3D Compass", 1100, 800, flags);
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
    std::uint64_t previousTicks = SDL_GetTicks();
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto updateOrbit = [&](lab::Vec2 point) {
        lab::orbit(scene.camera, point.x - previousMouse.x, point.y - previousMouse.y);
        previousMouse = point;
        dirty = true;
    };
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 6
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if ((event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) != 0) {
                    continue;
                }
                dirty = true;
                if (event.key.key == SDLK_ESCAPE) {
#if LAB_CHECKPOINT >= 6
                    if (dragging) {
                        cancelDrag();
                        scene.paused = true;
                        continue;
                    }
#endif
                    running = false;
                }
#if LAB_CHECKPOINT >= 6
                // A keyboard edit ends an active mouse gesture before changing state.
                cancelDrag();
#endif
                if (!event.key.repeat && (event.key.key == SDLK_R || (event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5))) {
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                    int preset = 0;
                    if (event.key.key != SDLK_R) {
                        preset = static_cast<int>(event.key.key - SDLK_F1);
                    }
                    lab::applyPreset(scene, preset);
                }
                if (event.key.key == SDLK_A) {
                    scene.paused = true;
                    lab::orbit(scene.camera, -6.0, 0.0);
                }
                if (event.key.key == SDLK_D) {
                    scene.paused = true;
                    lab::orbit(scene.camera, 6.0, 0.0);
                }
                if (event.key.key == SDLK_W) {
                    scene.paused = true;
                    lab::orbit(scene.camera, 0.0, 6.0);
                }
                if (event.key.key == SDLK_S) {
                    scene.paused = true;
                    lab::orbit(scene.camera, 0.0, -6.0);
                }
                if (event.key.key == SDLK_EQUALS || event.key.key == SDLK_PLUS || event.key.key == SDLK_KP_PLUS) {
                    scene.paused = true;
                    scene.camera.radius = std::max(7.0, scene.camera.radius - 0.5);
                }
                if (event.key.key == SDLK_MINUS || event.key.key == SDLK_KP_MINUS) {
                    scene.paused = true;
                    scene.camera.radius = std::min(12.0, scene.camera.radius + 0.5);
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3) {
                    scene.selected = static_cast<int>(event.key.key - SDLK_1);
                }
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
                lab::moveVertex(scene, delta);
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_F && !event.key.repeat) {
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                    scene.triangle = lab::reverseWinding(scene.triangle);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    cancelDrag();
                    scene.paused = !scene.paused;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused) {
                    lab::advanceScene(scene, 0.1);
                }
#endif
            }
#if LAB_CHECKPOINT >= 6
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << "SDL_ConvertEventToRenderCoordinates failed: " << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                if (event.button.x >= 20.0f && event.button.x <= 1080.0f && event.button.y >= 140.0f && event.button.y <= 680.0f) {
                    owner = event.button.which;
                    previousMouse = {event.button.x, event.button.y};
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
                    updateOrbit({event.motion.x, event.motion.y});
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                updateOrbit({event.button.x, event.button.y});
                cancelDrag();
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 6
        const std::uint64_t now = SDL_GetTicks();
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
                lab::applyPreset(scene, 1);
            }
            if (frames == 4 && !SDL_SetWindowSize(window, 880, 640)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 6
            lab::advanceScene(scene, 0.1);
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, snapshotPath)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
            if (snapshotPath) {
                running = false;
            }
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
