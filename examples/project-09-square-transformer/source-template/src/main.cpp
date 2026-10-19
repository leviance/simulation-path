#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL và bảng logic cố định; resize/HiDPI chỉ đổi presentation.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 09 - Square Transformer", 1280, 800, flags);
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
    if (!SDL_SetWindowMinimumSize(window, 768, 480) || !SDL_SetRenderLogicalPresentation(renderer, 1280, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
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
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int selectedSlider = 0;
    int frames = 0;
#if LAB_CHECKPOINT >= 7
    int activeSlider = -1;
    bool draggingObject = false;
    SDL_MouseID owner{};
    lab::Vec2 dragOffset{};
    std::uint64_t previous = SDL_GetTicks();
    const auto cancelDrag = [&]() {
        activeSlider = -1;
        draggingObject = false;
        SDL_CaptureMouse(false);
    };
    const auto updateDrag = [&](lab::Vec2 point) {
        if (activeSlider >= 0) {
            lab::updateSlider(scene, activeSlider, point.x);
        } else if (draggingObject) {
            scene.parameters.translation = lab::boundedTranslation(lab::add(lab::screenToWorld(point), dragOffset));
        }
        dirty = true;
    };
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                scene.paused = true;
                dirty = true;
#if LAB_CHECKPOINT >= 7
                cancelDrag();
#endif
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                dirty = true;
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (!event.key.repeat && (event.key.key == SDLK_R || (event.key.key >= SDLK_F1 && event.key.key <= SDLK_F5))) {
#if LAB_CHECKPOINT >= 7
                    cancelDrag();
#endif
                    int preset = 0;
                    if (event.key.key != SDLK_R) {
                        preset = static_cast<int>(event.key.key - SDLK_F1);
                    }
                    lab::applyPreset(scene, preset);
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_A) {
                    scene.parameters.scaleX = std::max(-2.0, scene.parameters.scaleX - 0.1);
                }
                if (event.key.key == SDLK_D) {
                    scene.parameters.scaleX = std::min(2.0, scene.parameters.scaleX + 0.1);
                }
                if (event.key.key == SDLK_S) {
                    scene.parameters.scaleY = std::max(-2.0, scene.parameters.scaleY - 0.1);
                }
                if (event.key.key == SDLK_W) {
                    scene.parameters.scaleY = std::min(2.0, scene.parameters.scaleY + 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_Q || event.key.key == SDLK_E) {
                    double step = lab::kPi / 36.0;
                    if (event.key.key == SDLK_Q) {
                        step = -step;
                    }
                    scene.parameters.angle = std::remainder(scene.parameters.angle + step, 2.0 * lab::kPi);
                    scene.paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_J) {
                    scene.parameters.shearX = std::max(-1.0, scene.parameters.shearX - 0.1);
                }
                if (event.key.key == SDLK_L) {
                    scene.parameters.shearX = std::min(1.0, scene.parameters.shearX + 0.1);
                }
                if (event.key.key == SDLK_K) {
                    scene.parameters.shearY = std::max(-1.0, scene.parameters.shearY - 0.1);
                }
                if (event.key.key == SDLK_I) {
                    scene.parameters.shearY = std::min(1.0, scene.parameters.shearY + 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_O && !event.key.repeat) {
#if LAB_CHECKPOINT >= 7
                    cancelDrag();
#endif
                    if (scene.order == lab::TransformOrder::ScaleShearRotate) {
                        scene.order = lab::TransformOrder::RotateShearScale;
                    } else {
                        scene.order = lab::TransformOrder::ScaleShearRotate;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_SPACE && !event.key.repeat) {
                    cancelDrag();
                    scene.paused = !scene.paused;
                }
                if (event.key.key == SDLK_N && !event.key.repeat && scene.paused) {
                    lab::advanceScene(scene, 0.1);
                }
                if (event.key.key == SDLK_UP) {
                    selectedSlider = std::max(0, selectedSlider - 1);
                }
                if (event.key.key == SDLK_DOWN) {
                    selectedSlider = std::min(6, selectedSlider + 1);
                }
                if (event.key.key == SDLK_LEFT) {
                    lab::nudgeSlider(scene, selectedSlider, -1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    lab::nudgeSlider(scene, selectedSlider, 1);
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && activeSlider < 0 && !draggingObject) {
                const lab::Vec2 point{event.button.x, event.button.y};
                activeSlider = lab::hitSlider(point);
                if (activeSlider >= 0) {
                    selectedSlider = activeSlider;
                } else if (lab::inViewport(point)) {
                    draggingObject = true;
                    const lab::Vec2 world = lab::screenToWorld(point);
                    dragOffset = {scene.parameters.translation.x - world.x, scene.parameters.translation.y - world.y};
                }
                if (activeSlider >= 0 || draggingObject) {
                    owner = event.button.which;
                    if (!SDL_CaptureMouse(true)) {
                        cancelDrag();
                    } else {
                        updateDrag(point);
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && (activeSlider >= 0 || draggingObject) && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    updateDrag({event.motion.x, event.motion.y});
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && (activeSlider >= 0 || draggingObject) && event.button.which == owner) {
                updateDrag({event.button.x, event.button.y});
                cancelDrag();
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 7
        const std::uint64_t now = SDL_GetTicks();
        const double deltaTime = std::min(0.1, static_cast<double>(now - previous) / 1000.0);
        previous = now;
        if (!scene.paused) {
            lab::advanceScene(scene, deltaTime);
            dirty = true;
        }
#endif
        if (smoke) {
            dirty = true;
            ++frames;
            if (frames == 2) {
                lab::applyPreset(scene, 4);
            }
            if (frames == 4 && !SDL_SetWindowSize(window, 960, 600)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 7
            lab::updateSlider(scene, 0, 1100.0);
            lab::advanceScene(scene, 0.1);
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::renderScene(image, scene, selectedSlider);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }
    // Giải phóng capture trước rồi tài nguyên theo thứ tự ngược.
#if LAB_CHECKPOINT >= 7
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
