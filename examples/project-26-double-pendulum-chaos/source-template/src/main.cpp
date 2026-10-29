#include "presentation.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    // Khởi tạo SDL và framebuffer trước khi dựng cặp con lắc cùng dữ liệu đầu.
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 26 - Double Pendulum", 1100, 820, flags);
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* texture = nullptr;
    if (window) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    if (renderer) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 820);
    }
    if (!window || !renderer || !texture || !SDL_SetRenderLogicalPresentation(renderer, 1100, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetWindowMinimumSize(window, 660, 492);
    lab::Framebuffer image{};
    lab::Scene scene = lab::makeScene();
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int frames = 0;
    const double frequency = static_cast<double>(SDL_GetPerformanceFrequency());
    std::uint64_t previous = SDL_GetPerformanceCounter();
#if LAB_CHECKPOINT >= 7
    SDL_MouseID owner = 0;
#endif
    const auto cancelCapture = [&]() {
#if LAB_CHECKPOINT >= 7
        scene.dragging = false;
#endif
        SDL_CaptureMouse(false);
    };
#if LAB_CHECKPOINT >= 7
    const auto updateDrag = [&](float x, float y) {
        const auto view = lab::makeWorldView(scene.parameters, 0);
        lab::moveAngleDrag(scene, lab::screenToWorld({x, y}, view));
        dirty = true;
    };
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelCapture();
                lab::stopScene(scene);
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                const auto key = event.key.key;
                cancelCapture();
                if (key == SDLK_ESCAPE) {
                    running = false;
                }
                if (key == SDLK_R) {
                    lab::resetScene(scene);
                }
                if (key == SDLK_F) {
                    scene.debug = !scene.debug;
                }
#if LAB_CHECKPOINT >= 1
                if (key == SDLK_A || key == SDLK_D || key == SDLK_W || key == SDLK_S) {
                    if (key == SDLK_A) {
                        scene.initial.theta1 -= 0.05;
                    }
                    if (key == SDLK_D) {
                        scene.initial.theta1 += 0.05;
                    }
                    if (key == SDLK_S) {
                        scene.initial.theta2 -= 0.05;
                    }
                    if (key == SDLK_W) {
                        scene.initial.theta2 += 0.05;
                    }
                    scene.initial.theta1 = std::clamp(scene.initial.theta1, -lab::kPi, lab::kPi);
                    scene.initial.theta2 = std::clamp(scene.initial.theta2, -lab::kPi, lab::kPi);
                    lab::resetScene(scene);
                }
#endif
#if LAB_CHECKPOINT == 2
                if (key == SDLK_Q || key == SDLK_E || key == SDLK_Z || key == SDLK_C) {
                    if (key == SDLK_Q) {
                        scene.initial.omega1 -= 0.1;
                    }
                    if (key == SDLK_E) {
                        scene.initial.omega1 += 0.1;
                    }
                    if (key == SDLK_Z) {
                        scene.initial.omega2 -= 0.1;
                    }
                    if (key == SDLK_C) {
                        scene.initial.omega2 += 0.1;
                    }
                    lab::resetScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (key == SDLK_SPACE) {
                    const bool wasPaused = scene.paused;
#if LAB_CHECKPOINT >= 6
                    const bool hadJob = scene.fastRemaining > 0;
#endif
                    lab::stopScene(scene);
                    scene.paused = !wasPaused;
#if LAB_CHECKPOINT >= 6
                    if (hadJob) {
                        scene.paused = true;
                    }
#endif
                }
                if (key == SDLK_N) {
                    lab::singleStep(scene);
                }
                if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
                    int change = -1;
                    if (key == SDLK_LEFTBRACKET) {
                        change = 1;
                    }
                    scene.dtIndex = std::clamp(scene.dtIndex + change, 0, 5);
                    lab::resetScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (key == SDLK_UP || key == SDLK_DOWN || key == SDLK_0) {
                    if (key == SDLK_0) {
                        scene.perturbation = 0.0;
                    }
                    if (key == SDLK_UP) {
                        scene.perturbation = std::min(1e-2, std::max(1e-8, scene.perturbation * 10.0));
                    }
                    if (key == SDLK_DOWN) {
                        if (scene.perturbation <= 1e-8) {
                            scene.perturbation = 0.0;
                        } else {
                            scene.perturbation /= 10.0;
                        }
                    }
                    lab::resetScene(scene);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key >= SDLK_1 && key <= SDLK_3) {
                    lab::choosePreset(scene, static_cast<lab::ChaosPreset>(key - SDLK_1));
                }
                if (key == SDLK_P) {
                    auto preset = lab::ChaosPreset::calm;
                    if (scene.preset == lab::ChaosPreset::calm) {
                        preset = lab::ChaosPreset::chaotic;
                    }
                    if (scene.preset == lab::ChaosPreset::chaotic) {
                        preset = lab::ChaosPreset::nearUpright;
                    }
                    lab::choosePreset(scene, preset);
                }
                if (key == SDLK_RETURN) {
                    lab::requestFast(scene, 30.0);
                }
                if (key == SDLK_BACKSPACE) {
                    lab::stopScene(scene);
                }
#endif
#if LAB_CHECKPOINT == 6
                if (key == SDLK_RETURN) {
                    lab::requestFast(scene, 10.0);
                }
                if (key == SDLK_BACKSPACE) {
                    lab::stopScene(scene);
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            // Một lần đổi từ window coordinates sang logical board; không nhân thêm DPR.
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !scene.dragging && event.button.x >= 40 && event.button.x <= 530 && event.button.y >= 100 && event.button.y <= 530) {
                const auto view = lab::makeWorldView(scene.parameters, 0);
                auto candidate = scene;
                if (lab::beginAngleDrag(candidate, lab::screenToWorld({event.button.x, event.button.y}, view), 14.0 / view.scale) && SDL_CaptureMouse(true)) {
                    scene = std::move(candidate);
                    owner = event.button.which;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && scene.dragging && event.motion.which == owner) {
                if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                    cancelCapture();
                    lab::stopScene(scene);
                } else {
                    updateDrag(event.motion.x, event.motion.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && scene.dragging && event.button.which == owner) {
                updateDrag(event.button.x, event.button.y);
                cancelCapture();
            }
#endif
            dirty = true;
        }
        if (!running) {
            break;
        }
        const auto now = SDL_GetPerformanceCounter();
        const double frameSeconds = static_cast<double>(now - previous) / frequency;
        previous = now;
        if (smoke) {
            ++frames;
#if LAB_CHECKPOINT >= 3
            if (frames < 16) {
                lab::singleStep(scene);
            }
#endif
            if (frames == 20) {
                scene.debug = false;
            }
            if (frames == 24 && !SDL_SetWindowSize(window, 880, 656)) {
                failed = true;
                break;
            }
            if (frames >= 32) {
                break;
            }
            dirty = true;
        } else {
#if LAB_CHECKPOINT >= 3
            bool advancing = !scene.paused;
#if LAB_CHECKPOINT >= 6
            advancing = advancing || scene.fastRemaining > 0;
#endif
            if (advancing) {
                lab::advanceFrame(scene, frameSeconds);
                dirty = true;
            }
#else
            static_cast<void>(frameSeconds);
#endif
        }
        if (dirty) {
            lab::drawScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), 1100 * static_cast<int>(sizeof(std::uint32_t))) || !SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !lab::drawHud(renderer, scene) || !SDL_RenderPresent(renderer)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture rồi hủy các tài nguyên SDL theo thứ tự ngược lúc tạo.
    cancelCapture();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
