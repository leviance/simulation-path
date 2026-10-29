#include "presentation.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    // Khởi tạo SDL trước window; texture chỉ được tạo sau khi đã có renderer.
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow("Project 24 - Collision Tank", 1100, 820, flags);
    SDL_Renderer* renderer = nullptr;
    if (window)
        renderer = SDL_CreateRenderer(window, nullptr);
    SDL_Texture* texture = nullptr;
    if (renderer)
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 820);
    if (!window || !renderer || !texture || !SDL_SetRenderLogicalPresentation(renderer, 1100, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetWindowMinimumSize(window, 660, 492);
    lab::Framebuffer image;
#if LAB_CHECKPOINT >= 10
    lab::DepthBuffer depth;
#endif
    auto scene = lab::makeScene();
    bool running = true, failed = false, dirty = true;
    bool dragging = false;
    SDL_MouseID owner = 0;
    lab::Vec2 start{};
    lab::Vec2 current{};
    lab::CameraSettings cameraStart{};
#if LAB_CHECKPOINT >= 11
    std::size_t selected = 0;
#endif
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto updateDrag = [&](float x, float y) {
        current = {x, y};
        if (scene.spatial) {
            scene.camera.yaw = cameraStart.yaw + (current.x - start.x) * 0.006;
            scene.camera.pitch = std::clamp(cameraStart.pitch + (current.y - start.y) * 0.006, -1.2, 1.2);
        }
        dirty = true;
    };
    std::uint64_t previous = SDL_GetPerformanceCounter();
    const double frequency = static_cast<double>(SDL_GetPerformanceFrequency());
    int frames = 0;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
                lab::stopScene(scene);
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                cancelDrag();
                const auto key = event.key.key;
                if (key == SDLK_ESCAPE)
                    running = false;
                if (key == SDLK_SPACE) {
                    const bool hadJob = scene.fastRemaining > 0;
                    const bool wasPaused = scene.paused;
                    lab::stopScene(scene);
                    scene.paused = hadJob || !wasPaused;
                }
                if (key == SDLK_N) {
                    lab::stopScene(scene);
                    scene.substeps = 0;
                    lab::stepScene(scene);
                }
                if (key == SDLK_R)
                    scene = lab::makeScene();
                if (key == SDLK_F)
                    scene.debug = !scene.debug;
#if LAB_CHECKPOINT >= 2
                if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
                    const double steps[]{1.0 / 60.0, 1.0 / 120.0, 1.0 / 240.0};
                    int index = 2;
                    if (scene.dt == steps[0]) {
                        index = 0;
                    } else if (scene.dt == steps[1]) {
                        index = 1;
                    }
                    int change = 1;
                    if (key == SDLK_LEFTBRACKET) {
                        change = -1;
                    }
                    index = std::clamp(index + change, 0, 2);
                    scene.dt = steps[index];
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (key == SDLK_E) {
                    if (scene.restitution <= 0.01) {
                        scene.restitution = 1.0;
                    } else {
                        scene.restitution = std::max(0.0, scene.restitution - 0.2);
                    }
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_D) {
                    scene.correction = !scene.correction;
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_I) {
                    scene.iterations = scene.iterations % 8 + 1;
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_C) {
                    if (scene.count == 256) {
                        scene.count = 64;
                    } else {
                        scene.count = 256;
                    }
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_H) {
                    scene.elastic = !scene.elastic;
                    scene.restitution = 1.0;
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_RETURN)
                    lab::requestFast(scene);
#endif
#if LAB_CHECKPOINT >= 10
                if (key == SDLK_2 || key == SDLK_3) {
                    scene.spatial = key == SDLK_3;
                    lab::rebuildScene(scene);
                }
                if (scene.spatial && (key == SDLK_LEFT || key == SDLK_RIGHT)) {
                    double yawChange = 0.1;
                    if (key == SDLK_LEFT) {
                        yawChange = -0.1;
                    }
                    scene.camera.yaw += yawChange;
                }
                if (scene.spatial && (key == SDLK_UP || key == SDLK_DOWN)) {
                    double pitchChange = -0.1;
                    if (key == SDLK_UP) {
                        pitchChange = 0.1;
                    }
                    scene.camera.pitch = std::clamp(scene.camera.pitch + pitchChange, -1.2, 1.2);
                }
#endif
#if LAB_CHECKPOINT >= 11
                if (key == SDLK_B)
                    lab::spawnBodies(scene);
#endif
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL && scene.spatial) {
                scene.camera.distance = std::clamp(scene.camera.distance - event.wheel.y, 22.0, 38.0);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                bool allowed = scene.spatial;
#if LAB_CHECKPOINT >= 11
                if (!scene.spatial) {
                    const auto point = lab::screenToWorld({event.button.x, event.button.y});
                    selected = scene.balls.size();
                    for (std::size_t i = 0; i < scene.balls.size(); ++i) {
                        if (lab::lengthSquared(lab::subtract(point, scene.balls[i].position)) <= scene.balls[i].radius * scene.balls[i].radius) {
                            selected = i;
                            break;
                        }
                    }
                    allowed = selected < scene.balls.size();
                }
#endif
                if (allowed && SDL_CaptureMouse(true)) {
                    lab::stopScene(scene);
                    dragging = true;
                    owner = event.button.which;
                    start = current = {event.button.x, event.button.y};
                    cameraStart = scene.camera;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == owner) {
                if (!(event.motion.state & SDL_BUTTON_LMASK))
                    cancelDrag();
                else
                    updateDrag(event.motion.x, event.motion.y);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                updateDrag(event.button.x, event.button.y);
#if LAB_CHECKPOINT >= 11
                if (!scene.spatial) {
                    auto change = lab::scale(lab::subtract(lab::screenToWorld(current), lab::screenToWorld(start)), 2.0);
                    const double speed = lab::length(change);
                    if (speed > 6.0)
                        change = lab::scale(change, 6.0 / speed);
                    lab::applyVelocityKick(scene.balls, selected, change);
                    lab::beginMeasurement(scene);
                }
#endif
                cancelDrag();
            }
            dirty = true;
        }
        if (!running)
            break;
        const auto now = SDL_GetPerformanceCounter();
        const double frameSeconds = static_cast<double>(now - previous) / frequency;
        previous = now;
        if (smoke) {
            ++frames;
            scene.paused = true;
#if LAB_CHECKPOINT >= 2
            if (frames < 7)
                lab::stepScene(scene);
#endif
#if LAB_CHECKPOINT >= 10
            if (frames == 8) {
                scene.spatial = true;
                lab::rebuildScene(scene);
            }
            if (frames > 8 && frames < 15)
                lab::stepScene(scene);
#endif
#if LAB_CHECKPOINT >= 11
            if (frames == 15 && lab::spawnBodies(scene) == 0) {
                failed = true;
                break;
            }
#endif
            if (frames == 20)
                scene.debug = false;
            if (frames == 24 && !SDL_SetWindowSize(window, 880, 656)) {
                failed = true;
                break;
            }
            if (frames >= 32)
                break;
            dirty = true;
        } else if (!scene.paused || scene.fastRemaining > 0) {
            lab::advanceFrame(scene, frameSeconds);
            dirty = true;
        }
        if (dirty) {
#if LAB_CHECKPOINT >= 10
            lab::renderScene(image, scene, depth);
#else
            lab::renderScene(image, scene);
#endif
#if LAB_CHECKPOINT >= 11
            if (dragging && !scene.spatial)
                lab::drawLine(image, start.x, start.y, current.x, current.y, 0xffe26cffU);
#endif
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), 1100 * static_cast<int>(sizeof(std::uint32_t))) || !SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !lab::drawHud(renderer, scene) || !SDL_RenderPresent(renderer)) {
                failed = true;
                std::cerr << SDL_GetError() << '\n';
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước texture; renderer và window được hủy sau cùng.
    cancelDrag();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
