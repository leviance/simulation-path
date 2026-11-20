#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include "events.hpp"
#include <cstdlib>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    const char* capture = nullptr;
    std::string_view take;
    for (int index = 1; index < argc; ++index) {
        if (std::string_view(argv[index]) == "--smoke")
            smoke = true;
        if (std::string_view(argv[index]) == "--capture" && index + 1 < argc) {
            capture = argv[++index];
            smoke = true;
        }
        if (std::string_view(argv[index]) == "--take" && index + 1 < argc) take = argv[++index];
    }

    // Khởi tạo SDL và từng resource riêng để biết chính xác bước nào thất bại.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        SDL_Log("%s", SDL_GetError());
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE;
    if (smoke)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow("67 / Flock Observatory - Flow layout", 960, 540, flags);
    if (!window) {
        SDL_Log("%s", SDL_GetError());
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        SDL_Log("%s", SDL_GetError());
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    int result = EXIT_SUCCESS;
    try {
        lab::require(SDL_SetRenderLogicalPresentation(renderer, 960, 540, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        lab::App app;
#if LAB_CHECKPOINT >= 2
        if (capture && take == "boxes") app.boxes = true;
#endif
#if LAB_CHECKPOINT >= 6
        if (capture && take == "hidden") lab::toggleReset(app.layout, app.ui);
#endif
#if LAB_CHECKPOINT >= 8
        if (capture && take == "overflow") {
            lab::setWidth(app.layout, app.ui, 220);
            lab::setOverflow(app.layout, app.ui, true);
        }
#endif
        bool running = true;
        Uint64 previous = SDL_GetTicksNS();
        while (running) {
            const auto revision = app.model.clockRevision;
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                if (!lab::handle(renderer, app, event))
                    running = false;
            }
            const Uint64 now = SDL_GetTicksNS();
            double elapsed = static_cast<double>(now - previous) / 1000000000.0;
            previous = now;
            if (revision != app.model.clockRevision)
                elapsed = 0;
            lab::advance(app.model, elapsed);
            lab::draw(renderer, app);
            if (capture) {
                SDL_Surface* frame = SDL_RenderReadPixels(renderer, nullptr);
                const bool ok = frame && SDL_SavePNG(frame, capture);
                SDL_DestroySurface(frame);
                lab::require(ok);
            }
            lab::require(SDL_RenderPresent(renderer));
            if (smoke)
                running = false;
            SDL_Delay(8);
        }
    } catch (const std::exception& error) {
        SDL_Log("%s", error.what());
        result = EXIT_FAILURE;
    }
    // Giải phóng capture trước, rồi renderer và window theo thứ tự ngược khởi tạo.
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
