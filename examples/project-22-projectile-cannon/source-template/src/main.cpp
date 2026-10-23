#include "controls.hpp"
#include "scene.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc == 2 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL từng bước; nếu thất bại, dọn các tài nguyên đã tạo trước đó.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 22 - Projectile Cannon", 1000, 650, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // Logical viewport cố định: resize/DPI không đổi mét hoặc tọa độ input.
    if (!SDL_SetRenderLogicalPresentation(renderer, 1000, 650, SDL_LOGICAL_PRESENTATION_LETTERBOX) || !SDL_SetWindowMinimumSize(window, 600, 390)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1000, 560);
    if (!texture || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Experiment experiment{};
    lab::Framebuffer frame{};
    bool running = true;
    bool failed = false;
    bool dirty = true;
    bool dragging = false;
    SDL_MouseID pointerOwner{};
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
#if LAB_CHECKPOINT >= 1
    lab::Vec2 dragMuzzle{};
    const auto updateAim = [&](float x, float y) {
        const auto aim = lab::aimFromScreenDrag(dragMuzzle, {x, y}, 5.0, 4.0, 32.0, 5.0 * lab::kPi / 180.0, 85.0 * lab::kPi / 180.0);
        if (aim.valid) {
            experiment.settings.speed = aim.speed;
            experiment.settings.angle = aim.angleRadians;
            dirty = true;
        }
    };
#endif
    std::uint64_t previous = SDL_GetTicksNS();
    int smokeFrames = 0;
    // Event thay đổi input trước; đồng hồ chỉ chuyển thời gian vào mô phỏng sau đó.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && (event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) == 0) {
                cancelDrag();
                dirty = lab::handleKey(experiment, event.key.key, event.key.repeat) || dirty;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
                experiment.paused = true;
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
#if LAB_CHECKPOINT >= 1
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging && event.button.x >= 0 && event.button.x < 1000 && event.button.y >= 0 && event.button.y < 560) {
                dragging = SDL_CaptureMouse(true);
                pointerOwner = event.button.which;
                if (dragging) {
                    dragMuzzle = lab::worldToScreen({0.0, 1.2}, lab::makeWorldView(experiment));
                    updateAim(event.button.x, event.button.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == pointerOwner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    updateAim(event.motion.x, event.motion.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == pointerOwner) {
                updateAim(event.button.x, event.button.y);
                cancelDrag();
            }
#else
            (void)pointerOwner;
#endif
        }
        if (!running) {
            break;
        }
        const std::uint64_t now = SDL_GetTicksNS();
        const double frameSeconds = double(now - previous) / 1'000'000'000.0;
        previous = now;
#if LAB_CHECKPOINT >= 4
        if (smoke && smokeFrames == 0) {
            lab::fire(experiment);
        }
        if (!experiment.paused && experiment.current.projectile.active) {
            lab::advanceShot(experiment.current, frameSeconds);
            dirty = true;
        }
#else
        (void)frameSeconds;
#endif
        if (dirty || smoke) {
            lab::renderScene(frame, experiment);
            if (!lab::presentScene(renderer, texture, frame, experiment)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        if (smoke && ++smokeFrames >= 8) {
            running = false;
        }
        // Kể cả khi pause, ứng dụng không chạy busy loop chiếm một CPU core.
        SDL_Delay(8);
    }
    // Giải phóng capture trước texture, renderer và window.
    cancelDrag();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
