#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "audit.hpp"
#include "view.hpp"
#include <cstdlib>
#include <string_view>

#if LAB_CHECKPOINT >= 5
lab::Key translateKey(SDL_Keycode key) {
    if (key == SDLK_TAB)
        return lab::Key::Tab;
    if (key == SDLK_RETURN)
        return lab::Key::Enter;
    if (key == SDLK_SPACE)
        return lab::Key::Space;
    if (key == SDLK_LEFT)
        return lab::Key::Left;
    if (key == SDLK_RIGHT)
        return lab::Key::Right;
    if (key == SDLK_HOME)
        return lab::Key::Home;
    if (key == SDLK_END)
        return lab::Key::End;
    if (key == SDLK_ESCAPE)
        return lab::Key::Escape;
    return lab::Key::Other;
}
#endif

int main(int argc, char** argv) {
    bool smoke = false;
    const char* capturePath = nullptr;
    std::string_view take;
    for (int index = 1; index < argc; ++index) {
        if (std::string_view(argv[index]) == "--smoke") {
            smoke = true;
        }
        if (std::string_view(argv[index]) == "--capture" && index + 1 < argc) {
            capturePath = argv[++index];
            smoke = true;
        }
        if (std::string_view(argv[index]) == "--take" && index + 1 < argc)
            take = argv[++index];
    }

    // Khởi tạo SDL và từng resource riêng để biết chính xác bước nào thất bại.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        SDL_Log("SDL_Init: %s", SDL_GetError());
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = 0;
#if LAB_CHECKPOINT >= 6
    flags |= SDL_WINDOW_RESIZABLE;
#endif
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("65 / Flock Observatory - Flight desk", 960, 540, flags);
    if (!window) {
        SDL_Log("SDL_CreateWindow: %s", SDL_GetError());
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        SDL_Log("SDL_CreateRenderer: %s", SDL_GetError());
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
#if LAB_CHECKPOINT >= 6
    if (!SDL_SetRenderLogicalPresentation(renderer, 960, 540, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        SDL_Log("Logical presentation: %s", SDL_GetError());
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
#endif

    lab::Model model;
    lab::Ui ui;
#if LAB_CHECKPOINT >= 4
    // Hai ảnh cùng seed, cùng tick; điều khiển qua chính đường input của người học.
    if (capturePath && (take == "near" || take == "wide")) {
        lab::setPaused(model, true);
        double x = lab::radiusSlider.x;
        if (take == "wide") x += lab::radiusSlider.width - 0.001;
        const lab::Point point{x, lab::radiusSlider.y + 15};
        lab::pointerDown(model, ui, point);
        lab::pointerUp(model, ui, point);
    }
#endif
    bool running = true;
    int result = EXIT_SUCCESS;
#if LAB_CHECKPOINT >= 1
    Uint64 previous = SDL_GetTicksNS();
#endif
    while (running) {
#if LAB_CHECKPOINT >= 3
        const auto revision = model.clockRevision;
#endif
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
#if LAB_CHECKPOINT >= 6
            // [snippet event-space]
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_RESIZED) {
                lab::suspend(model, ui);
                SDL_CaptureMouse(false);
            }
            if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                SDL_Log("Event conversion: %s", SDL_GetError());
                continue;
            }
            // [/snippet event-space]
#elif LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                lab::cancelPointer(ui);
                lab::setPaused(model, true);
                SDL_CaptureMouse(false);
            }
#endif

#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                const lab::Point point{event.motion.x, event.motion.y};
#if LAB_CHECKPOINT >= 3
                lab::pointerMove(model, ui, point);
#else
                ui.hot = lab::hitTest(point);
#endif
            }
#endif
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::Point point{event.button.x, event.button.y};
                const bool consumed = lab::pointerDown(model, ui, point);
#if LAB_CHECKPOINT >= 6
                if (!consumed) {
                    lab::scenePointerDown(model, point);
                }
#else
                (void)consumed;
#endif
                if (ui.active != lab::Control::None && !SDL_CaptureMouse(true)) {
                    SDL_Log("Capture unavailable; gesture cancelled: %s", SDL_GetError());
                    lab::cancelPointer(ui);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                lab::pointerUp(model, ui, {event.button.x, event.button.y});
                SDL_CaptureMouse(false);
            }
#endif

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_KEY_DOWN) {
                bool consumed = false;
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_F1 && !event.key.repeat) {
                    SDL_Log("State audit: %d", int(lab::audit(model, ui)));
                }
#endif
#if LAB_CHECKPOINT >= 5
                consumed = lab::keyDown(model, ui, translateKey(event.key.key), (event.key.mod & SDL_KMOD_SHIFT) != 0, event.key.repeat);
                if (!consumed && event.key.key == SDLK_SPACE && !event.key.repeat)
                    lab::setPaused(model, !model.paused);
                if (ui.active == lab::Control::None) {
                    SDL_CaptureMouse(false);
                }
#else
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
#if LAB_CHECKPOINT >= 3
                    lab::setPaused(model, !model.paused);
#else
                    model.paused = !model.paused;
                    model.accumulator = 0.0;
                    previous = SDL_GetTicksNS();
#endif
                }
#endif
                if (!consumed && event.key.key == SDLK_N && !event.key.repeat && model.paused) {
                    lab::stepPhysics(model);
                }
            }
#endif
        }

#if LAB_CHECKPOINT >= 1
        // [snippet frame-loop]
        const Uint64 now = SDL_GetTicksNS();
        double elapsed = double(now - previous) / 1e9;
        previous = now;
#if LAB_CHECKPOINT >= 3
        if (revision != model.clockRevision) {
            elapsed = 0.0;
        }
#endif
        lab::advance(model, elapsed);
        // [/snippet frame-loop]
#endif
        lab::draw(renderer, model, ui);
        if (capturePath != nullptr) {
            SDL_Surface* image = SDL_RenderReadPixels(renderer, nullptr);
            if (!image || !SDL_SavePNG(image, capturePath)) result = EXIT_FAILURE;
            SDL_DestroySurface(image);
        }
        if (!SDL_RenderPresent(renderer)) {
            SDL_Log("SDL_RenderPresent: %s", SDL_GetError());
            result = EXIT_FAILURE;
            running = false;
        }
        if (smoke) {
            running = false;
        }
        SDL_Delay(8);
    }

    // Giải phóng capture trước renderer/window, kể cả khi thoát giữa thao tác kéo.
#if LAB_CHECKPOINT >= 3
    SDL_CaptureMouse(false);
#endif
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
