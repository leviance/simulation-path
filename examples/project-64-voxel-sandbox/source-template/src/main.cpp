#include "oracle.hpp"
#include "view.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string_view(argv[i]) == "--smoke") {
            smoke = true;
        }
    }
    // Khởi tạo SDL; starter đã có terrain và streaming hoàn chỉnh của Project 63.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Minimal voxel sandbox", 960, 700, flags);
    SDL_Renderer* renderer = nullptr;
    if (window != nullptr) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    SDL_Texture* texture = nullptr;
    if (renderer != nullptr) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, voxel::imageWidth, voxel::imageHeight);
    }
    if (texture == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool failed = false;
    try {
        voxel::require(SDL_SetRenderLogicalPresentation(renderer, 960, 700, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        voxel::require(SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST));
        SDL_SetRenderVSync(renderer, 1);
        voxel::App app;
        bool running = true;
        bool dragging = false;
        std::uint64_t previous = SDL_GetTicks();
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    voxel::stop(app);
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                    if (event.key.key == SDLK_ESCAPE) {
                        running = false;
                    }
                    if (event.key.key == SDLK_SPACE) {
                        if (!app.world.pending.empty()) {
                            app.paused = !app.paused;
                        }
                    } else {
                        voxel::keyDown(event.key.key, event.key.mod, app);
                    }
#if LAB_CHECKPOINT >= 10
                    if (event.key.key == SDLK_V) {
                        voxel::flushEdits(app.world);
                        voxel::verifySandbox(app.world);
                        app.auditMessage = "PASS current resident state (not the full test suite)";
                    }
#endif
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                    voxel::require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.x >= 0 && event.button.x < 640 && event.button.y >= 30 && event.button.y < 510) {
                    voxel::stop(app);
                    voxel::aim(app, static_cast<int>(event.button.x / 2), static_cast<int>((event.button.y - 30) / 2));
                    if (event.button.button == SDL_BUTTON_MIDDLE) {
                        dragging = true;
                        SDL_CaptureMouse(true);
                    }
                    if (event.button.button == SDL_BUTTON_LEFT) {
                        voxel::action(app, false);
                    }
                    if (event.button.button == SDL_BUTTON_RIGHT) {
                        voxel::action(app, true);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION) {
                    if (dragging) {
                        voxel::orbit(app.camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
                        app.cameraDirty = true;
                        app.pickDirty = true;
                    } else if (event.motion.x >= 0 && event.motion.x < 640 && event.motion.y >= 30 && event.motion.y < 510) {
                        voxel::aim(app, static_cast<int>(event.motion.x / 2), static_cast<int>((event.motion.y - 30) / 2));
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_MIDDLE) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
            }
            const std::uint64_t now = SDL_GetTicks();
            voxel::tick(app, static_cast<double>(now - previous) / 1000.0);
            previous = now;
            if (voxel::refreshFrame(app)) {
                voxel::upload(texture, app.frame);
            }
            voxel::draw(renderer, texture, app);
            if (smoke) {
                running = false;
            }
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }
    // Giải phóng tài nguyên theo thứ tự ngược; smoke không đọc/ghi clipboard.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
