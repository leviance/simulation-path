#include "presentation.hpp"
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    // Khởi tạo SDL và các tài nguyên trình bày trước khi tạo state của chuỗi.
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 25 - Spring Chain", 1100, 820, flags);
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* texture = nullptr;
    if (window) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    if (renderer) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 820);
    }
    if (!window || !renderer || !texture || !SDL_SetRenderLogicalPresentation(renderer, 1100, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetWindowMinimumSize(window, 660, 492);
    lab::Framebuffer image{};
    lab::Scene scene = lab::makeScene();
    bool running = true;
    bool failed = false;
    bool dirty = true;
    const double frequency = double(SDL_GetPerformanceFrequency());
    std::uint64_t previous = SDL_GetPerformanceCounter();
#if LAB_CHECKPOINT >= 6
    SDL_MouseID owner = 0;
    std::uint64_t previousDragSample = 0;
#endif
    const auto cancelCapture = [&]() {
#if LAB_CHECKPOINT >= 6
        lab::cancelGesture(scene);
#endif
        SDL_CaptureMouse(false);
    };
#if LAB_CHECKPOINT >= 6
    const auto updateDrag = [&](float x, float y) {
        const auto now = SDL_GetPerformanceCounter();
        const double sampleSeconds = std::max(0.001, double(now - previousDragSample) / frequency);
        previousDragSample = now;
        const auto point = lab::boundedPointer({x, y}, lab::makeWorldView(scene));
        lab::moveDrag(scene.chain, scene.drag, point, sampleSeconds, 6.0);
        lab::refreshMetrics(scene);
        dirty = true;
    };
#endif
    int frames = 0;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelCapture();
                lab::stopScene(scene);
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                const auto key = event.key.key;
                cancelCapture();
                if (key == SDLK_ESCAPE) {
                    running = false;
                }
                if (key == SDLK_R) {
                    scene = lab::makeScene();
                }
                if (key == SDLK_F) {
                    scene.debug = !scene.debug;
                }
#if LAB_CHECKPOINT == 2
                if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    double distanceChange = 0.05;
                    if (key == SDLK_LEFT) {
                        distanceChange = -0.05;
                    }
                    scene.pairDistance = std::clamp(scene.pairDistance + distanceChange, 0.1, 1.8);
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_UP || key == SDLK_DOWN) {
                    double angleChange = -0.1;
                    if (key == SDLK_UP) {
                        angleChange = 0.1;
                    }
                    scene.pairAngle += angleChange;
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (key == SDLK_G) {
                    scene.gravityEnabled = !scene.gravityEnabled;
                    lab::rebuildScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (key == SDLK_SPACE) {
                    const bool wasPaused = scene.paused;
                    const bool hadJob = scene.fastRemaining > 0;
                    lab::stopScene(scene);
                    scene.paused = hadJob || !wasPaused;
                }
                if (key == SDLK_N) {
                    lab::stopScene(scene);
                    scene.substeps = 0;
                    lab::stepScene(scene);
#if LAB_CHECKPOINT >= 8
                    lab::recordEnergy(scene, true);
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (key == SDLK_D) {
                    lab::stopScene(scene);
                    scene.dampingEnabled = !scene.dampingEnabled;
                    lab::beginMeasurement(scene);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN) {
                    auto& particle = scene.chain.particles[scene.selected];
                    if (key == SDLK_LEFT) {
                        particle.position.x -= 0.08;
                    }
                    if (key == SDLK_RIGHT) {
                        particle.position.x += 0.08;
                    }
                    if (key == SDLK_UP) {
                        particle.position.y += 0.08;
                    }
                    if (key == SDLK_DOWN) {
                        particle.position.y -= 0.08;
                    }
                    particle.velocity = {};
                    lab::beginMeasurement(scene);
                    scene.message = "Keyboard move is external work; measurement restarted.";
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_C) {
                    if (scene.count == 20) {
                        scene.count = 32;
                    } else if (scene.count == 32) {
                        scene.count = 64;
                    } else if (scene.count == 64) {
                        scene.count = 100;
                    } else {
                        scene.count = 20;
                    }
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_K) {
                    if (scene.stiffness >= 1200.0) {
                        scene.stiffness = 60.0;
                    } else {
                        scene.stiffness = std::min(1200.0, scene.stiffness * 2.0);
                    }
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_M) {
                    if (scene.mass >= 0.16) {
                        scene.mass = 0.02;
                    } else {
                        scene.mass *= 2.0;
                    }
                    lab::rebuildScene(scene);
                }
                if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
                    int change = 1;
                    if (key == SDLK_LEFTBRACKET) {
                        change = -1;
                    }
                    scene.dtIndex = std::clamp(scene.dtIndex + change, 0, 4);
                    lab::rebuildScene(scene);
                }
                if (key >= SDLK_1 && key <= SDLK_3) {
                    lab::applyPreset(scene, int(key - SDLK_1) + 1);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_RETURN) {
                    lab::requestFastRun(scene);
                }
#endif
            }
#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !scene.drag.active && event.button.x >= 40 && event.button.x <= 690 && event.button.y >= 100 && event.button.y <= 650) {
                const auto view = lab::makeWorldView(scene);
                auto candidate = scene.chain;
                lab::DragConstraint drag{};
                const auto point = lab::screenToWorld({event.button.x, event.button.y}, view);
                if (lab::beginDrag(candidate, drag, point, 9.0 / view.scale) && SDL_CaptureMouse(true)) {
                    scene.chain = std::move(candidate);
                    scene.drag = drag;
                    scene.selected = drag.particleIndex;
                    owner = event.button.which;
                    previousDragSample = SDL_GetPerformanceCounter();
                    lab::beginMeasurement(scene);
                    scene.message = "Dragging: external work; release starts a new energy measurement.";
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && scene.drag.active && event.motion.which == owner) {
                if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                    cancelCapture();
                    lab::stopScene(scene);
                } else {
                    updateDrag(event.motion.x, event.motion.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && scene.drag.active && event.button.which == owner) {
                updateDrag(event.button.x, event.button.y);
                lab::endDrag(scene.chain, scene.drag);
                SDL_CaptureMouse(false);
                lab::beginMeasurement(scene);
                scene.message = "Released: bounded velocity; measurement restarted.";
            }
#endif
            dirty = true;
        }
        if (!running) {
            break;
        }
        const auto now = SDL_GetPerformanceCounter();
        const double frameSeconds = double(now - previous) / frequency;
        previous = now;
        if (smoke) {
            ++frames;
#if LAB_CHECKPOINT >= 4
            if (frames < 16) {
                lab::stepScene(scene);
            }
#endif
#if LAB_CHECKPOINT >= 7
            if (frames == 16) {
                scene.count = 100;
                lab::rebuildScene(scene);
            }
#endif
            if (frames == 20) {
                scene.debug = false;
            }
            if (frames == 24 && !SDL_SetWindowSize(window, 880, 656)) {
                failed = true;
                break;
            }
            if (frames >= 32) {
                break;
            }
            dirty = true;
        } else {
#if LAB_CHECKPOINT >= 4
            if (!scene.paused || scene.fastRemaining > 0) {
                lab::advanceFrame(scene, frameSeconds);
                dirty = true;
            }
#else
            static_cast<void>(frameSeconds);
#endif
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), 1100 * int(sizeof(std::uint32_t))) || !SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !lab::drawHud(renderer, scene) || !SDL_RenderPresent(renderer)) {
                failed = true;
                std::cerr << SDL_GetError() << '\n';
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước khi hủy texture, renderer và window.
    cancelCapture();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
