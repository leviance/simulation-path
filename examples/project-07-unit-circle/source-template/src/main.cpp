#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL, window và bảng logic trước khi nhận input.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 07 - Unit Circle", lab::Framebuffer::width, lab::Framebuffer::height, flags);
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
    // Một bảng logic cho cả hình học lẫn input; không nhân DPI thêm lần nữa.
    if (!SDL_SetWindowMinimumSize(window, 660, 456) || !SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Framebuffer image;
    lab::Scene scene;
    bool paused = false;
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int smokeFrames = 0;
#if LAB_CHECKPOINT >= 3
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 6
    SDL_MouseID owner{};
    const auto cancelDrag = [&]() {
        lab::cancelDrag(scene);
        SDL_CaptureMouse(false);
    };
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 6
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                dirty = true;
#if LAB_CHECKPOINT >= 6
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    paused = !paused;
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                }
                if (event.key.key == SDLK_R && !event.key.repeat) {
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                    scene = {};
                    paused = true;
                    dirty = true;
                }
#if LAB_CHECKPOINT >= 1
                if (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT) {
                    double step = lab::degreesToRadians(5.0);
                    if (event.key.key == SDLK_LEFT) {
                        step = -step;
                    }
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                    lab::setManualAngle(scene, scene.angle + step);
                    paused = true;
                    dirty = true;
                }
                if (!event.key.repeat && event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5) {
                    const int index = static_cast<int>(event.key.key - SDLK_F1);
                    double angle = static_cast<double>(index) * lab::kPi / 2.0;
                    if (index == 4) {
                        angle = 1.0;
                    }
#if LAB_CHECKPOINT >= 6
                    cancelDrag();
#endif
                    lab::setManualAngle(scene, angle);
                    paused = true;
                    dirty = true;
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_UP) {
                    scene.angularSpeed = std::min(lab::kTau, scene.angularSpeed + 0.25);
                }
                if (event.key.key == SDLK_DOWN) {
                    scene.angularSpeed = std::max(-lab::kTau, scene.angularSpeed - 0.25);
                }
                if (event.key.key == SDLK_S && !event.key.repeat && paused) {
                    lab::advanceScene(scene, 0.1);
                    dirty = true;
                }
#endif
            }
#if LAB_CHECKPOINT >= 6
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !scene.dragging) {
                if (lab::beginDrag(scene, {event.button.x, event.button.y})) {
                    owner = event.button.which;
                    paused = true;
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && scene.dragging && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    dirty = lab::moveNeedle(scene, {event.motion.x, event.motion.y}) || dirty;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && scene.dragging && event.button.which == owner) {
                dirty = lab::moveNeedle(scene, {event.button.x, event.button.y}) || dirty;
                cancelDrag();
            }
#endif
        }
        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 3
        // Chặn hitch ở ranh giới ứng dụng, không che mất lỗi trong hàm toán.
        const std::uint64_t now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previousTicks) / 1000.0);
        previousTicks = now;
        if (!paused) {
            lab::advanceScene(scene, deltaTime);
            dirty = true;
        }
#endif
        if (smoke) {
            dirty = true;
            ++smokeFrames;
#if LAB_CHECKPOINT >= 1
            if (smokeFrames == 1) {
                lab::setManualAngle(scene, lab::kPi / 2.0);
            }
#endif
#if LAB_CHECKPOINT >= 3
            lab::advanceScene(scene, 0.1);
#endif
            if (smokeFrames == 4 && !SDL_SetWindowSize(window, 900, 620)) {
                failed = true;
            }
            if (smokeFrames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene, paused)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture trước, rồi texture/renderer/window theo thứ tự ngược.
#if LAB_CHECKPOINT >= 6
    cancelDrag();
#endif
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
