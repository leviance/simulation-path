#pragma once
#include "tool.hpp"
#include <cstdlib>

namespace tiny {
// Công cụ con nhận sự kiện đã đổi về không gian logic; vòng lặp không biết grammar của file.
template <class Tool>
int run(int argc, char** argv, const char* title) {
    const char* capture = nullptr;
    bool once = false;
    std::string take;
    std::filesystem::path chosen;
    for (int i = 1; i < argc; ++i) {
        const std::string_view arg = argv[i];
        if (arg == "--smoke")
            once = true;
        else if (arg == "--capture" && i + 1 < argc) {
            capture = argv[++i];
            once = true;
        } else if (arg == "--take" && i + 1 < argc)
            take = argv[++i];
        else if (arg == "--assets" && i + 1 < argc)
            chosen = argv[++i];
        else
            return EXIT_FAILURE;
    }
    if (!SDL_Init(SDL_INIT_VIDEO))
        return EXIT_FAILURE;
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE;
    if (once)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* w = nullptr;
    SDL_Renderer* r = nullptr;
    int result = EXIT_SUCCESS;
    try {
        lab::require(SDL_CreateWindowAndRenderer(title, 960, 540, flags, &w, &r));
        lab::require(SDL_SetRenderLogicalPresentation(r, 960, 540, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        Tool tool;
        if (chosen.empty()) {
            const char* base = SDL_GetBasePath();
            if (!base)
                throw std::runtime_error(SDL_GetError());
            chosen = std::filesystem::path(base) / "assets";
        }
        tool.assets = chosen;
        tool.start();
        tool.choose(take);
        Uint64 previous = SDL_GetTicksNS();
        bool running = true;
        while (running) {
            const auto clock = tool.model.clockRevision;
            SDL_Event e;
            while (SDL_PollEvent(&e)) {
                if (e.type == SDL_EVENT_QUIT) {
                    running = false;
                    break;
                }
                if (e.type == SDL_EVENT_WINDOW_FOCUS_LOST || e.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    lab::cancel(tool.ui);
                    SDL_CaptureMouse(false);
                    lab::setPaused(tool.model, true);
                }
                if (e.type == SDL_EVENT_WINDOW_RESIZED)
                    tool.resize(e.window.data1);
#if LAB_CHECKPOINT >= 7002
                tool.prepare();
#else
                lab::ensureLayout(tool.page.layout, tool.ui);
#endif
                lab::require(SDL_ConvertEventToRenderCoordinates(r, &e));
                if (e.type == SDL_EVENT_MOUSE_BUTTON_DOWN && e.button.button == SDL_BUTTON_LEFT) {
                    tool.down({e.button.x, e.button.y});
                    if (tool.ui.active && !SDL_CaptureMouse(true))
                        lab::cancel(tool.ui);
                }
                if (e.type == SDL_EVENT_MOUSE_MOTION)
                    tool.motion({e.motion.x, e.motion.y});
                if (e.type == SDL_EVENT_MOUSE_BUTTON_UP && e.button.button == SDL_BUTTON_LEFT)
                    tool.up({e.button.x, e.button.y});
                if (e.type == SDL_EVENT_KEY_DOWN)
                    tool.keyboard(e.key.key, (e.key.mod & SDL_KMOD_SHIFT) != 0, e.key.repeat);
                if (!tool.ui.active)
                    SDL_CaptureMouse(false);
            }
            const auto now = SDL_GetTicksNS();
            if (tool.model.clockRevision == clock)
                lab::advance(tool.model, double(now - previous) / 1.0e9);
            previous = now;
            tool.render(r);
            if (capture) {
                SDL_Surface* frame = SDL_RenderReadPixels(r, nullptr);
                const bool saved = frame && SDL_SavePNG(frame, capture);
                SDL_DestroySurface(frame);
                lab::require(saved);
            }
            lab::require(SDL_RenderPresent(r));
            if (once)
                running = false;
            SDL_Delay(8);
        }
    } catch (const std::exception& error) {
        SDL_Log("%s", error.what());
        result = EXIT_FAILURE;
    }
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(r);
    SDL_DestroyWindow(w);
    SDL_Quit();
    return result;
}
} // namespace tiny
