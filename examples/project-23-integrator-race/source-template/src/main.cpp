#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    // Khởi tạo tài nguyên SDL; mỗi nhánh lỗi giải phóng những gì đã tạo được.
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 23 - Integrator Race", lab::Framebuffer::width, lab::Framebuffer::height, flags);
    SDL_Renderer* renderer = nullptr;
    if (window) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    if (!window || !renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetWindowMinimumSize(window, 660, 492);
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, lab::Framebuffer::width, lab::Framebuffer::height);
    if (!texture || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST) || !SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    lab::Framebuffer image;
    lab::Scene scene = lab::makeScene();
    bool running = true;
    bool failed = false;
    bool dirty = true;
    bool dragging = false;
    SDL_MouseID owner{};
    double grabOffset = 0.0;
    int frames = 0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
    const auto cancelDrag = [&]() {
        if (dragging) {
            dragging = false;
            SDL_CaptureMouse(false);
        }
    };
    const auto updateDrag = [&](double mouseX) {
        lab::setInitialPosition(scene, lab::screenToPosition(mouseX - grabOffset));
        dirty = true;
    };

    while (running) {
        const auto now = SDL_GetTicksNS();
        const double frameSeconds = static_cast<double>(now - previousTicks) / 1'000'000'000.0;
        previousTicks = now;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
                lab::stopJobs(scene);
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && (event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) == 0) {
                cancelDrag();
                dirty = true;
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
                if (event.key.key == SDLK_R || event.key.key == SDLK_F1) {
                    scene = lab::makeScene();
                }
                if (event.key.key == SDLK_SPACE) {
                    const bool wasPaused = scene.paused;
                    bool hadJob = scene.fastRemaining > 0;
#if LAB_CHECKPOINT >= 8
                    hadJob = hadJob || scene.benchmark.running;
#endif
                    lab::stopJobs(scene);
                    scene.paused = hadJob || !wasPaused || scene.warning[0] != '\0';
                }
                if (event.key.key == SDLK_N) {
                    lab::stopJobs(scene);
                    scene.substeps = 0;
                    lab::stepScene(scene);
                }
                if (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT) {
                    double delta = 0.1;
                    if (event.key.key == SDLK_LEFT) {
                        delta = -0.1;
                    }
                    lab::setInitialPosition(scene, scene.initial.position + delta);
                }
                if (event.key.key == SDLK_UP || event.key.key == SDLK_DOWN) {
                    double delta = 1.0;
                    if (event.key.key == SDLK_DOWN) {
                        delta = -1.0;
                    }
                    scene.parameters.stiffness = std::clamp(scene.parameters.stiffness + delta, 0.0, 64.0);
                    lab::resetExperiment(scene);
                }
                if (event.key.key == SDLK_U || event.key.key == SDLK_O) {
                    double delta = 0.25;
                    if (event.key.key == SDLK_U) {
                        delta = -0.25;
                    }
                    scene.initial.velocity = std::clamp(scene.initial.velocity + delta, -8.0, 8.0);
                    lab::resetExperiment(scene);
                }
                if (event.key.key == SDLK_M) {
                    scene.parameters.mass *= 2.0;
                    if (scene.parameters.mass > 4.0) {
                        scene.parameters.mass = 0.5;
                    }
                    lab::resetExperiment(scene);
                }
                if (event.key.key == SDLK_F2 || event.key.key == SDLK_F3) {
                    scene = lab::makeScene();
                    scene.dtIndex = 1;
                    scene.initial.position = 1.0;
                    if (event.key.key == SDLK_F3) {
                        scene.dtIndex = 0;
                        scene.parameters.stiffness = 16.0;
                        scene.initial.position = 2.5;
                    }
                    lab::resetExperiment(scene);
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_LEFTBRACKET) {
                    lab::setStepIndex(scene, scene.dtIndex - 1);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    lab::setStepIndex(scene, scene.dtIndex + 1);
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_1) {
                    lab::cycleLane(scene, 0);
                }
                if (event.key.key == SDLK_2) {
                    lab::cycleLane(scene, 1);
                }
                if (event.key.key == SDLK_3) {
                    lab::cycleLane(scene, 2);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_G) {
                    scene.graph = static_cast<lab::Graph>((static_cast<int>(scene.graph) + 1) % 3);
#if LAB_CHECKPOINT >= 8
                    scene.showBenchmark = false;
#endif
                }
                if (event.key.key == SDLK_RETURN) {
                    lab::requestFastRun(scene);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_B) {
                    lab::requestBenchmark(scene);
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_F) {
                    scene.debug = !scene.debug;
                }
#endif
            }
            const bool mouseEvent = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouseEvent && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                running = false;
                failed = true;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                const auto center = lab::hitMass(scene, event.button.x, event.button.y);
                if (center && SDL_CaptureMouse(true)) {
                    owner = event.button.which;
                    grabOffset = event.button.x - *center;
                    dragging = true;
                    updateDrag(event.button.x);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    updateDrag(event.motion.x);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                updateDrag(event.button.x);
                cancelDrag();
            }
        }
        if (!running) {
            break;
        }
        if (smoke) {
            ++frames;
            scene.paused = true;
#if LAB_CHECKPOINT >= 1
            if (frames <= 6) {
                lab::stepScene(scene);
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (frames == 7) {
                lab::requestBenchmark(scene);
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (frames == 30) {
                scene.debug = false;
            }
#endif
            if (frames == 34 && !SDL_SetWindowSize(window, 880, 656)) {
                failed = true;
            }
            if (frames >= 40) {
#if LAB_CHECKPOINT >= 8
                if (scene.benchmark.failed || scene.benchmark.rows.size() != 3) {
                    failed = true;
                }
#endif
                running = false;
            }
            dirty = true;
        }
        bool active = !scene.paused || scene.fastRemaining > 0;
#if LAB_CHECKPOINT >= 8
        active = active || scene.benchmark.running;
#endif
        if (active) {
            lab::advanceFrame(scene, frameSeconds);
            dirty = true;
        }
        if (dirty) {
            lab::renderScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, scene)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }
    // Nhả capture rồi giải phóng texture, renderer và window theo thứ tự ngược.
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
