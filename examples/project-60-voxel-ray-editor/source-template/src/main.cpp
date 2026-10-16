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
    // Khởi tạo SDL và kiểm tra từng tài nguyên của bộ khung từ Project 59.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Voxel ray editor", 960, 600, flags);
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
        voxel::Controls controls;
        auto& state = controls.editor;
        std::cout << "Esc quit | P preset | R reset | arrows/middle drag orbit\n";
#if LAB_CHECKPOINT >= 1
        std::cout << "Mouse or WASD: aim\n";
#endif
#if LAB_CHECKPOINT >= 3
        std::cout << "[/]: reach 1..64\n";
#endif
#if LAB_CHECKPOINT >= 4
        std::cout << "Space: play/pause DDA preview | N: one cell\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "Left click/Delete: break one block\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "Right click/E: place one block | 1/2/3: material\n";
#endif
#if LAB_CHECKPOINT >= 9
        std::cout << "V: bounded ray audit\n";
#endif
        bool running = true;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    voxel::stop(controls);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    voxel::keyDown(event.key.key, controls);
                }
                voxel::pointerEvent(renderer, event, controls);
            }
#if LAB_CHECKPOINT >= 4
            if (!state.paused && !smoke) {
                state.shown = std::min(static_cast<int>(state.trace.visits.size()), state.shown + 1);
                if (state.shown >= static_cast<int>(state.trace.visits.size())) {
                    state.paused = true;
                }
            }
#endif
            if (voxel::refresh(state)) {
                voxel::upload(texture, state.cache.frame);
            }
            voxel::draw(renderer, texture, state);
            if (smoke) {
                running = false;
            }
            SDL_Delay(16);
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
