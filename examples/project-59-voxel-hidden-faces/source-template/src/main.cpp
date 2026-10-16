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
    // Khởi tạo SDL và kiểm tra từng tài nguyên của bộ khung từ Project 58.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Voxel hidden faces", 960, 600, flags);
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
        voxel::Controls state;
        voxel::reset(state);
        std::cout << "Esc quit | P preset | R reset | arrows/drag orbit | +/- zoom | Space run/pause\n";
#if LAB_CHECKPOINT >= 3
        std::cout << "M: baseline/culled mesh; depth stays on in both modes\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "PageUp/PageDown: display cut\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "U/I x | J/K y | N/O z | F face +X,-X,+Y,-Y,+Z,-Z | grid drag: read cell\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "V: bounded pure audit\n";
#endif
        bool running = true;
        Uint64 previous = SDL_GetTicks();
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    voxel::stop(state);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    voxel::keyDown(event.key.key, state);
                }
                voxel::pointerEvent(renderer, event, state);
            }
            const Uint64 now = SDL_GetTicks();
            const double dt = std::min(0.05, static_cast<double>(now - previous) / 1000.0);
            previous = now;
            if (!state.paused && !smoke) {
                voxel::orbit(state.camera, dt * 20, 0);
                state.cache.frameDirty = true;
            }
            if (voxel::update(state.cache, state.chunk, state.culled, state.slice, state.camera)) {
                voxel::upload(texture, state.cache.frame);
            }
            voxel::draw(renderer, texture, state);
            if (smoke) {
                running = false;
            }
            SDL_Delay(8);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }
    // Giải phóng texture trước renderer, rồi window và SDL.
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
