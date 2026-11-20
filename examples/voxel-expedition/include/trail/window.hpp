#pragma once
#include "scene.hpp"
#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>
#if LAB_CHECKPOINT >= 5901
#include "field-controls.hpp"
#endif
#if LAB_CHECKPOINT >= 6405
#include "field-walk.hpp"
#endif
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string_view>

namespace trail {
inline void require(bool ok) {
    if (!ok)
        throw std::runtime_error(SDL_GetError());
}

struct Display {
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* texture = nullptr;

    void open(const char* title, const Frame& frame, bool hidden) {
        SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (hidden)
            flags |= SDL_WINDOW_HIDDEN;
        require(SDL_CreateWindowAndRenderer(title, 1120, 630, flags, &window, &renderer));
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, frame.width, frame.height);
        require(texture != nullptr);
        require(SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST));
        require(SDL_SetRenderLogicalPresentation(renderer, frame.width, frame.height, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        SDL_SetRenderVSync(renderer, 1);
    }

    ~Display() {
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
    }
};

// [snippet present-frame]
inline void uploadFrame(Display& display, const Frame& frame) {
    const int pitch = frame.width * static_cast<int>(sizeof(Color));
    require(SDL_UpdateTexture(display.texture, nullptr, frame.pixels.data(), pitch));
    require(SDL_SetRenderDrawColor(display.renderer, 0, 0, 0, 255));
    require(SDL_RenderClear(display.renderer));
    require(SDL_RenderTexture(display.renderer, display.texture, nullptr, nullptr));
}
// [/snippet present-frame]

// Chụp chính bề mặt vừa vẽ, không cần công cụ GUI hoặc thư viện ghi ảnh riêng.
inline void saveFrame(Display& display, const char* file) {
    SDL_Surface* surface = SDL_RenderReadPixels(display.renderer, nullptr);
    require(surface != nullptr);
    const bool saved = SDL_SavePNG(surface, file);
    SDL_DestroySurface(surface);
    require(saved);
}

inline bool hasKey(const bool* keys, SDL_Scancode code) {
    return keys[code];
}

inline int run(const char* title, int argc, char** argv) {
    bool smoke = false;
    [[maybe_unused]] bool routeCheck = false;
    [[maybe_unused]] int surveySeconds = 0;
    const char* capture = nullptr;
    [[maybe_unused]] int landmark = 0;
    [[maybe_unused]] double hour = 9, clock = 0;
    for (int i = 1; i < argc; ++i) {
        const std::string_view argument = argv[i];
        if (argument == "--route-check") {
            routeCheck = true;
            smoke = true;
        } else if (argument == "--survey" && i + 1 < argc) {
#if LAB_CHECKPOINT >= 6405
            surveySeconds = std::clamp(std::atoi(argv[++i]), 1, 605);
#endif
        } else if (argument == "--landmark" && i + 1 < argc)
            landmark = std::clamp(std::atoi(argv[++i]), 0, 4);
        else if (argument == "--hour" && i + 1 < argc)
            hour = std::clamp(std::atof(argv[++i]), 0.0, 24.0);
        else if (argument == "--time" && i + 1 < argc)
            clock = std::clamp(std::atof(argv[++i]), 0.0, 600.0);
        else if (argument == "--smoke")
            smoke = true;
        else if (argument == "--capture" && i + 1 < argc) {
            capture = argv[++i];
            smoke = true;
        }
    }
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    int status = EXIT_SUCCESS;
    try {
        Frame frame;
        Atlas atlas;
        Scene scene;
        Display display;
        display.open(title, frame, smoke || surveySeconds > 0);
#if LAB_CHECKPOINT >= 6301
        scene.landmark = landmark;
        scene.resetPose();
#endif
#if LAB_CHECKPOINT >= 6201
        if (smoke) {
            for (int i = 0; i < 100; ++i)
                scene.update(0);
        }
#endif
#if LAB_CHECKPOINT >= 6401
        if (smoke)
            for (int i = 0; i < 90; ++i)
                scene.update(1.0 / 30);
#endif
#if LAB_CHECKPOINT >= 6402
        scene.startHour = hour;
#endif
        scene.seconds = clock;
        bool running = true, captured = false, dirty = true;
        Uint64 previous = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 6405
        RecordedWalk survey;
        const Uint64 started = previous;
        if (routeCheck) {
            for (int i = 0; i < 18000 && survey.laps < 1; ++i) {
                survey.steer(scene, 1.0 / 30, i / 30.0);
                scene.update(1.0 / 30);
                if (i % 1800 == 0)
                    std::cout << "route simulation t=" << i / 30 << " next=" << survey.waypoint << " at " << scene.camera.eye.x << "," << scene.camera.eye.y << "," << scene.camera.eye.z << std::endl;
            }
            std::cout << "route simulation distance=" << survey.walked << " laps=" << survey.laps << std::endl;
            if (survey.laps < 1)
                throw std::runtime_error("Route obstructed");
        }
#endif
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT)
                    running = false;
                if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_RESIZED)
                    dirty = true;
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                    captured = false;
                    SDL_SetWindowRelativeMouseMode(display.window, false);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    const SDL_Keycode key = event.key.key;
#if LAB_CHECKPOINT >= 5901
                    fieldKey(scene, key);
#endif
                    if (key == SDLK_ESCAPE) {
                        if (captured) {
                            captured = false;
                            SDL_SetWindowRelativeMouseMode(display.window, false);
                        } else
                            running = false;
                    }
                    if (key == SDLK_F1)
                        scene.debug = !scene.debug;
                    if (key == SDLK_R) {
                        scene.resetPose();
                        scene.seconds = 0;
                    }
                    if (key == SDLK_P)
                        scene.paused = !scene.paused;
#if LAB_CHECKPOINT >= 5806
                    // [snippet slice-keys]
                    if (key == SDLK_H)
                        scene.showSlice = !scene.showSlice;
                    if (key == SDLK_PAGEUP)
                        scene.sliceY = std::min(15, scene.sliceY + 1);
                    if (key == SDLK_PAGEDOWN)
                        scene.sliceY = std::max(0, scene.sliceY - 1);
                    // [/snippet slice-keys]
#endif
#if LAB_CHECKPOINT >= 5807
                    // [snippet audit-key]
                    if (key == SDLK_V) {
                        scene.inspectFixtures();
                        scene.debug = true;
                    }
                    // [/snippet audit-key]
#endif
#if LAB_CHECKPOINT >= 5804
                    // [snippet bank-keys]
                    if (key >= SDLK_1 && key <= SDLK_4) {
                        const int choices[]{2, 0, 1, 3};
                        scene.preset = choices[key - SDLK_1];
                        scene.generate();
                    }
                    // [/snippet bank-keys]
#endif
                    dirty = true;
                }
#if LAB_CHECKPOINT >= 5805
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    captured = SDL_SetWindowRelativeMouseMode(display.window, true);
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && captured) {
                    look(scene.camera, event.motion.xrel * 0.0025, event.motion.yrel * 0.0025);
                    dirty = true;
                }
#endif
            }
            const Uint64 now = SDL_GetTicksNS();
            [[maybe_unused]] const double dt = std::clamp(double(now - previous) * 1e-9, 0.0, 0.05);
            previous = now;
#if LAB_CHECKPOINT >= 5805
            const bool* keys = SDL_GetKeyboardState(nullptr);
            if (SDL_GetKeyboardFocus() == display.window) {
                const double forward = int(hasKey(keys, SDL_SCANCODE_W)) - int(hasKey(keys, SDL_SCANCODE_S));
                const double right = int(hasKey(keys, SDL_SCANCODE_D)) - int(hasKey(keys, SDL_SCANCODE_A));
                const double up = int(hasKey(keys, SDL_SCANCODE_E)) - int(hasKey(keys, SDL_SCANCODE_Q));
                // [snippet move-call]
                if (forward || right || up) {
                    travel(scene, forward, right, up, dt);
                    dirty = true;
                }
                // [/snippet move-call]
                const int yaw = int(hasKey(keys, SDL_SCANCODE_RIGHT)) - int(hasKey(keys, SDL_SCANCODE_LEFT));
                const int pitch = int(hasKey(keys, SDL_SCANCODE_DOWN)) - int(hasKey(keys, SDL_SCANCODE_UP));
                if (yaw || pitch) {
                    look(scene.camera, yaw * dt * 1.5, pitch * dt * 1.5);
                    dirty = true;
                }
            }
#endif
#if LAB_CHECKPOINT >= 6405
            const double wall = (now - started) * 1e-9;
            if (surveySeconds > 0) {
                survey.steer(scene, dt, wall);
                dirty = true;
            }
            const Uint64 updateStart = SDL_GetTicksNS();
#endif
            const bool changed = scene.update(dt);
            dirty = dirty || changed;
            if (dirty) {
#if LAB_CHECKPOINT >= 6405
                const Uint64 drawStart = SDL_GetTicksNS();
#endif
                scene.draw(frame, atlas);
#if LAB_CHECKPOINT >= 6405
                const Uint64 uploadStart = SDL_GetTicksNS();
#endif
                uploadFrame(display, frame);
#if LAB_CHECKPOINT >= 6405
                if (surveySeconds > 0)
                    survey.record(scene, wall, (drawStart - updateStart) * 1e-6, (uploadStart - drawStart) * 1e-6, (SDL_GetTicksNS() - uploadStart) * 1e-6);
#endif
#if LAB_CHECKPOINT >= 5806
                if (scene.showSlice) {
                    // [snippet slice-read]
                    for (int z = 0; z < side; ++z) {
                        for (int x = 0; x < side; ++x) {
                            const Block block = scene.inspectedBlock(x, scene.sliceY, z);
                            Color ink{30, 39, 48};
                            if (block != Block::Air)
                                ink = atlas.sample(block, 2, 0.25, 0.5);
                            require(SDL_SetRenderDrawColor(display.renderer, ink.r, ink.g, ink.b, 255));
                            const SDL_FRect cell{float(664 + x * 8), float(24 + z * 8), 8, 8};
                            require(SDL_RenderFillRect(display.renderer, &cell));
                        }
                    }
                    // [/snippet slice-read]
                    require(SDL_SetRenderDrawColor(display.renderer, 255, 255, 255, 255));
                    require(SDL_RenderDebugText(display.renderer, 664, 8, ("section y=" + std::to_string(scene.sliceY)).c_str()));
                }
#endif
                if (scene.debug) {
                    const SDL_FRect banner{8, 8, 575, 49};
                    require(SDL_SetRenderDrawColor(display.renderer, 26, 39, 45, 255));
                    require(SDL_RenderFillRect(display.renderer, &banner));
                    require(SDL_SetRenderDrawColor(display.renderer, 236, 239, 228, 255));
                    const auto info = std::to_string(scene.solidCount()) + " blocks | " + std::to_string(scene.faceCount() * 2) + " triangles | builds " + std::to_string(scene.buildCount());
                    require(SDL_RenderDebugText(display.renderer, 16, 16, info.c_str()));
                    require(SDL_RenderDebugText(display.renderer, 16, 34, "WASD move | click/drag mouse or arrows look | Q/E height | R return"));
#if LAB_CHECKPOINT >= 5807
                    if (!scene.auditResult.empty())
                        require(SDL_RenderDebugText(display.renderer, 16, 64, scene.auditResult.c_str()));
#endif
                }
#if LAB_CHECKPOINT >= 5901
                if (scene.debug) {
                    require(SDL_SetRenderDrawColor(display.renderer, 21, 31, 42, 255));
                    const SDL_FRect panel{0, float(frame.height - 26), float(frame.width), 26};
                    require(SDL_RenderFillRect(display.renderer, &panel));
                    require(SDL_SetRenderDrawColor(display.renderer, 239, 241, 229, 255));
                    require(SDL_RenderDebugText(display.renderer, 8, float(frame.height - 18), scene.readout().c_str()));
                }
#endif
#if LAB_CHECKPOINT >= 6001
                if (scene.showProbe) {
                    const float x = float(frame.width) / 2, y = float(frame.height) / 2;
                    require(SDL_SetRenderDrawColor(display.renderer, 254, 243, 179, 255));
                    SDL_RenderLine(display.renderer, x - 4, y, x + 4, y);
                    SDL_RenderLine(display.renderer, x, y - 4, x, y + 4);
#if LAB_CHECKPOINT >= 6002
                    if (!scene.debug)
                        SDL_RenderDebugText(display.renderer, 8, float(frame.height - 18), scene.probeLabel().c_str());
#endif
                }
#endif
                if (capture != nullptr)
                    saveFrame(display, capture);
                require(SDL_RenderPresent(display.renderer));
                dirty = false;
            }
#if LAB_CHECKPOINT >= 6405
            if (surveySeconds > 0) {
                SDL_Delay(24);
                if (wall >= surveySeconds) {
                    std::cout << "WALK END elapsed=" << wall << " minZ=" << survey.minZ << " maxZ=" << survey.maxZ << " distance=" << survey.walked << " laps=" << survey.laps << std::endl;
                    if (surveySeconds >= 600 && (survey.laps < 1 || survey.walked < 350 || !std::all_of(survey.visited.begin(), survey.visited.end(), [](bool v) { return v; })))
                        throw std::runtime_error("Walking route not covered");
                    running = false;
                }
            }
#endif
            if (smoke)
                running = false;
            if (!dirty)
                SDL_Delay(8);
        }
        if (smoke)
            std::cout << "PASS native frame: " << scene.solidCount() << " blocks, " << scene.faceCount() << " quads\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        status = EXIT_FAILURE;
    }
    SDL_Quit();
    return status;
}
} // namespace trail
