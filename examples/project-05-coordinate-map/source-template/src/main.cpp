#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";

    // Setup: tạo window, renderer rồi mới cấp phát ảnh/texture.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 05 - Coordinate Map", 960, 540, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_SetWindowMinimumSize(window, 320, 240)) {
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
    SDL_Texture* texture = nullptr;
    lab::Framebuffer image;
    if (!lab::resizeFramebuffer(window, renderer, texture, image)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Scene scene;
#if LAB_CHECKPOINT >= 1
    scene.camera.viewportPixels = {static_cast<double>(image.width), static_cast<double>(image.height)};
#endif
    bool running = true;
    bool failed = false;
    bool paused = false;
    bool dirty = true;
    int smokeFrames = 0;
#if LAB_CHECKPOINT >= 4
    SDL_MouseID owner{};
    Uint8 ownerButton{};
    const auto cancelDrag = [&]() {
        lab::cancelDrag(scene);
        ownerButton = 0;
        SDL_CaptureMouse(false);
    };
#endif

    // Input sửa scene; chỉ dựng lại framebuffer khi scene thay đổi.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
#if LAB_CHECKPOINT >= 4
                cancelDrag();
#endif
                if (!lab::resizeFramebuffer(window, renderer, texture, image)) {
                    std::cerr << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                    break;
                }
#if LAB_CHECKPOINT >= 1
                scene.camera.viewportPixels = {static_cast<double>(image.width), static_cast<double>(image.height)};
#endif
                dirty = true;
            }
#if LAB_CHECKPOINT >= 4
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                cancelDrag();
            }
#endif
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
#if LAB_CHECKPOINT >= 4
                    cancelDrag();
#endif
                }
#if LAB_CHECKPOINT >= 4
                if (!paused && event.key.key == SDLK_R) {
                    cancelDrag();
                    const lab::Vec2 viewport = scene.camera.viewportPixels;
                    scene.camera = {};
                    scene.camera.viewportPixels = viewport;
                    dirty = true;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (!paused && (event.key.key == SDLK_EQUALS || event.key.key == SDLK_MINUS)) {
                    cancelDrag();
                    double factor = 1.12;
                    if (event.key.key == SDLK_MINUS) {
                        factor = 1.0 / 1.12;
                    }
                    scene.camera.zoomAt(scene.cursorScreen, factor);
                    dirty = true;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!paused && event.key.key == SDLK_TAB && !scene.points.empty()) {
                    cancelDrag();
                    scene.selected = (scene.selected + 1) % static_cast<int>(scene.points.size());
                    dirty = true;
                }
                if (!paused && event.key.key == SDLK_DELETE) {
                    cancelDrag();
                    lab::eraseSelected(scene);
                    dirty = true;
                }
                if (!paused && scene.selected >= 0) {
                    const double step = 1.0 / scene.camera.scale();
                    lab::Vec2& point = scene.points[scene.selected];
                    if (event.key.key == SDLK_LEFT) {
                        point.x -= step;
                    }
                    if (event.key.key == SDLK_RIGHT) {
                        point.x += step;
                    }
                    if (event.key.key == SDLK_UP) {
                        point.y += step;
                    }
                    if (event.key.key == SDLK_DOWN) {
                        point.y -= step;
                    }
                    dirty = true;
                }
#endif
            }
            if (paused) {
                continue;
            }
#if LAB_CHECKPOINT >= 3
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_WHEEL;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                scene.cursorScreen = {event.motion.x, event.motion.y};
#if LAB_CHECKPOINT >= 4
                if (ownerButton != 0 && event.motion.which == owner) {
                    if ((event.motion.state & SDL_BUTTON_MASK(ownerButton)) == 0) {
                        cancelDrag();
                    } else if (scene.panning) {
                        const lab::Vec2 delta{scene.cursorScreen.x - scene.previousScreen.x, scene.cursorScreen.y - scene.previousScreen.y};
                        scene.camera.pan(delta);
                        scene.previousScreen = scene.cursorScreen;
#if LAB_CHECKPOINT >= 6
                    } else {
                        lab::movePoint(scene, scene.cursorScreen);
#endif
                    }
                }
#endif
                dirty = true;
            }
#endif
#if LAB_CHECKPOINT >= 4
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && ownerButton == 0) {
                const lab::Vec2 screen{event.button.x, event.button.y};
                const bool inside = screen.x >= 0.0 && screen.y >= 0.0 && screen.x < image.width && screen.y < image.height;
                if (inside && event.button.button == SDL_BUTTON_RIGHT) {
                    scene.panning = true;
                    scene.previousScreen = screen;
                    ownerButton = SDL_BUTTON_RIGHT;
                }
#if LAB_CHECKPOINT >= 6
                if (inside && event.button.button == SDL_BUTTON_LEFT) {
                    lab::beginPointDrag(scene, screen);
                    if (scene.draggingPoint) {
                        ownerButton = SDL_BUTTON_LEFT;
                    }
                }
#endif
                if (ownerButton != 0) {
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        SDL_Log("Mouse capture unavailable: %s", SDL_GetError());
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.which == owner && event.button.button == ownerButton) {
                const lab::Vec2 screen{event.button.x, event.button.y};
                if (scene.panning) {
                    scene.camera.pan({screen.x - scene.previousScreen.x, screen.y - scene.previousScreen.y});
                }
#if LAB_CHECKPOINT >= 6
                else {
                    lab::movePoint(scene, screen);
                }
#endif
                cancelDrag();
                dirty = true;
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_MOUSE_WHEEL && event.wheel.y != 0.0f) {
                cancelDrag();
                scene.cursorScreen = {event.wheel.mouse_x, event.wheel.mouse_y};
                double steps = event.wheel.y;
                if (event.wheel.direction == SDL_MOUSEWHEEL_FLIPPED) {
                    steps = -steps;
                }
                scene.camera.zoomAt(scene.cursorScreen, std::pow(1.12, std::clamp(steps, -20.0, 20.0)));
                dirty = true;
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 7
        if (smoke) {
            if (smokeFrames == 2) {
                lab::beginPointDrag(scene, {100.0, 120.0});
                lab::movePoint(scene, {180.0, 160.0});
                lab::cancelDrag(scene);
            }
            if (smokeFrames == 4) {
                scene.camera.pan({55.0, -30.0});
                scene.camera.zoomAt({180.0, 160.0}, 2.0);
                SDL_SetWindowSize(window, 1100, 650);
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

    // Cleanup: texture phụ thuộc renderer, renderer phụ thuộc window.
#if LAB_CHECKPOINT >= 4
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
