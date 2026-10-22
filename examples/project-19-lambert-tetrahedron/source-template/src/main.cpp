#include "controls.hpp"
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";

    // Khởi tạo SDL và từng tài nguyên; thất bại ở đâu thì dọn những phần đã tạo ở đó.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 19 - CPU Lambert Lighting", 960, 640, flags);
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
    // Board logic cố định nên resize/HiDPI không gây cấp phát lại mỗi frame.
    if (!SDL_SetWindowMinimumSize(window, 720, 480) || !SDL_SetRenderLogicalPresentation(renderer, 960, 640, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 960, 640);
    if (!texture || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    // State độc lập với SDL, nên tests gọi trực tiếp được các phép cập nhật và render.
    lab::Scene scene;
    lab::Framebuffer image;
    lab::DragState drag;
#if LAB_CHECKPOINT >= 1
    SDL_MouseID owner{};
#endif
    const auto cancelDrag = [&]() {
        drag = {};
        SDL_CaptureMouse(false);
    };
    bool running = true, failed = false, dirty = true;
    int frames = 0;
    std::uint64_t previous = SDL_GetTicks();

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                cancelDrag();
                lab::handleKey(scene, event.key.key, event.key.repeat);
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
                scene.paused = true;
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
#if LAB_CHECKPOINT >= 1
            const bool mouse = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouse && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !drag.active) {
                const lab::Vec2 point{event.button.x, event.button.y};
                if (point.x >= 0 && point.x < 960 && point.y >= 0 && point.y < lab::viewportHeight(scene, 640) && lab::beginDrag(scene, drag, point)) {
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    }
                    dirty = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && drag.active && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    dirty = lab::updateDrag(scene, drag, {event.motion.x, event.motion.y}) || dirty;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && drag.active && event.button.which == owner) {
                lab::updateDrag(scene, drag, {event.button.x, event.button.y});
                cancelDrag();
                dirty = true;
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL) {
#if LAB_CHECKPOINT >= 6
                scene.camera.distance = std::clamp(scene.camera.distance - double(event.wheel.y) * 0.25, 3.0, 9.0);
                dirty = true;
#endif
            }
#endif
        }
        if (!running) {
            break;
        }

        // Tách thời gian, input giữ phím và orbit khỏi việc xử lý event một lần.
        const auto now = SDL_GetTicks();
        const double dt = double(now - previous) / 1000.0;
        previous = now;
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0) {
            dirty = lab::heldInput(scene, SDL_GetKeyboardState(nullptr), dt) || dirty;
        }
        dirty = lab::advanceScene(scene, dt) || dirty;
        if (smoke) {
            ++frames;
            dirty = true;
            if (frames == 2) {
                lab::handleKey(scene, SDLK_3, false);
            }
            if (frames == 3 && !SDL_SetWindowSize(window, 800, 540)) {
                failed = true;
            }
            if (frames == 5) {
                lab::handleKey(scene, SDLK_F, false);
            }
            if (frames >= 8) {
                running = false;
            }
        }

        if (dirty) {
            const auto stats = lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), image.width * int(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, stats)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước khi hủy window; mọi lỗi presentation trả exit code khác 0.
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
