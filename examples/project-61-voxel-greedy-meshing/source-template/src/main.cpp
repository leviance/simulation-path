#include "app.hpp"
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
    // Khởi tạo SDL; starter đã có chunk, camera và rasterizer từ Project 59.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Greedy voxel meshing", 960, 600, flags);
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
        voxel::resetPreview(app);
        bool running = true;
        bool dragging = false;
#if LAB_CHECKPOINT >= 7
        std::uint64_t previous = SDL_GetTicks();
#endif
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
                    if (event.key.key == SDLK_R || event.key.key == SDLK_SPACE) {
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
                    if (event.key.key == SDLK_ESCAPE) {
                        running = false;
                    }
                    bool handled = false;
#if LAB_CHECKPOINT >= 7
                    if (event.key.key == SDLK_SPACE) {
                        handled = true;
                        const int total = static_cast<int>(app.preview.size());
                        if (total > 0) {
                            if (app.stepper.count >= total) {
                                app.stepper.count = 0;
                            }
                            app.stepper.paused = !app.stepper.paused;
                        }
                    }
#endif
                    if (!handled) {
                        voxel::keyDown(event.key.key, app);
                    }
#if LAB_CHECKPOINT >= 9
                    if (event.key.key == SDLK_V) {
                        const auto built = voxel::buildGreedy(app.chunk, app.slice);
                        std::cout << "PASS unit faces=" << voxel::verify(app.chunk, built.quads, app.slice) << '\n';
                    }
#endif
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    voxel::stop(app);
                    dragging = true;
                    SDL_CaptureMouse(true);
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    voxel::orbit(app.camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
                    app.cache.frameDirty = true;
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
            }
#if LAB_CHECKPOINT >= 7
            const std::uint64_t now = SDL_GetTicks();
            voxel::tick(app.stepper, static_cast<double>(now - previous) / 1000.0, static_cast<int>(app.preview.size()));
            previous = now;
#endif
            const int before = app.cache.rasterizations;
            voxel::refresh(app.cache, app.chunk, app.slice, app.merge, app.camera);
            if (app.cache.rasterizations != before) {
                voxel::upload(texture, app.cache.frame);
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
