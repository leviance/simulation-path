#include "terrain-oracle.hpp"
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
    // Khởi tạo SDL; starter đã có streaming, camera và rasterizer từ Project 62.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Procedural terrain - global coordinates", 960, 600, flags);
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
        voxel::require(SDL_SetRenderLogicalPresentation(renderer, 960, 600, SDL_LOGICAL_PRESENTATION_LETTERBOX));
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
                    if (event.key.key == SDLK_R || event.key.key == SDLK_SPACE || event.key.key == SDLK_P || event.key.key == SDLK_C || event.key.key == SDLK_F || event.key.key == SDLK_O) {
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
                    if (event.key.key == SDLK_ESCAPE) {
                        running = false;
                    }
                    bool handled = false;
                    if (event.key.key == SDLK_SPACE) {
                        handled = true;
                        bool canRun = !app.world.pending.empty();
                        canRun = canRun || app.autoTravel;
                        if (canRun) {
                            app.paused = !app.paused;
                        }
                    }
                    if (!handled) {
                        voxel::keyDown(event.key.key, app);
                    }
                    if (event.key.key == SDLK_V) {
                        voxel::verifySchedule(app.world);
#if LAB_CHECKPOINT >= 9
                        voxel::verifyTerrain(app.world);
#endif
                        std::cout << "PASS current schedule state\n";
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                    voxel::require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    voxel::stop(app);
                    const float x = event.button.x;
                    const float y = event.button.y;
                    if (x >= 680 && x < 904 && y >= 100 && y < 324) {
                        app.selected = voxel::mapKey(app, static_cast<int>((x - 680) / 32), static_cast<int>((y - 100) / 32));
                    } else if (x >= 0 && x < 640 && y >= 30 && y < 510) {
                        dragging = true;
                        SDL_CaptureMouse(true);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    voxel::orbit(app.camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
                    app.cameraDirty = true;
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
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
    // Giải phóng theo thứ tự ngược với lúc tạo.
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
