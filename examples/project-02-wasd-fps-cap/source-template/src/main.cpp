#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#include "presentation.hpp"
#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif
#if LAB_CHECKPOINT >= 3
#include "measurement.hpp"
#include <cstdio>
#endif
#if LAB_CHECKPOINT >= 6
#include <string_view>
#endif
#include <cstdlib>
#include <iostream>

namespace {
#if LAB_CHECKPOINT >= 1
constexpr int kPlayerSize = 34;
#endif
#if LAB_CHECKPOINT >= 2
constexpr double kPlayerSpeed = 180.0;
#endif

#if LAB_CHECKPOINT >= 1
lab::Vec2 readDirection() {
    const bool* keyboard = SDL_GetKeyboardState(nullptr);
    return lab::directionFromKeys(
        keyboard[SDL_SCANCODE_A],
        keyboard[SDL_SCANCODE_D],
        keyboard[SDL_SCANCODE_W],
        keyboard[SDL_SCANCODE_S]
    );
}

bool renderFrame(SDL_Renderer* renderer, SDL_Texture* texture, lab::Framebuffer& framebuffer, lab::Vec2 position, bool isMoving) {
    framebuffer.clear(lab::rgba(11, 16, 32));
    std::uint32_t color = lab::rgba(126, 143, 177);
    if (isMoving) {
        color = lab::rgba(83, 240, 174);
    }

    // Chỉ làm tròn lúc vẽ; position vẫn giữ phần lẻ cho lần cập nhật sau.
    const int left = static_cast<int>(std::floor(position.x));
    const int top = static_cast<int>(std::floor(position.y));
    lab::fillRectangle(framebuffer, left, top, kPlayerSize, kPlayerSize, color);
    return lab::presentFramebuffer(renderer, texture, framebuffer);
}
#endif
} // namespace

#if LAB_CHECKPOINT >= 6
int main(int argc, char* argv[]) {
    bool smoke = false;
    if (argc == 2 && std::string_view(argv[1]) == "--smoke") {
        smoke = true;
    } else if (argc != 1) {
        std::cerr << "Usage: project_2_final [--smoke]\n";
        return EXIT_FAILURE;
    }
#else
int main() {
#endif
    // Setup: dùng lại framebuffer/texture của Project 01.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
#if LAB_CHECKPOINT >= 6
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const char* windowTitle = "Project 02 | WASD | 1/2/3: FPS | 0: off | F1: toggle | B: 5s | R: reset";
#elif LAB_CHECKPOINT >= 3
    const char* windowTitle = "Project 02 | WASD | 1/2/3: delay | B: measure 5s | R: reset";
#elif LAB_CHECKPOINT >= 2
    const char* windowTitle = "Project 02 | WASD movement | temporary frame-based update";
#elif LAB_CHECKPOINT >= 1
    const char* windowTitle = "Project 02 | Hold WASD to change color";
#else
    const char* windowTitle = "Project 02 | Starter: framebuffer background";
#endif
    SDL_Window* window = SDL_CreateWindow(windowTitle, lab::Framebuffer::width, lab::Framebuffer::height, flags);
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "SDL_CreateRenderer failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    // Ảnh logic 960x540: LETTERBOX giữ nguyên tỉ lệ khi resize hoặc dùng HiDPI.
    if (!SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << "Logical presentation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    lab::Framebuffer framebuffer;
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture) {
        std::cerr << "Texture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    lab::Vec2 position{120.0, 220.0};
#endif
#if LAB_CHECKPOINT >= 3
    Uint64 previous = SDL_GetTicksNS();
    bool wasSuspended = true;
    double fpsElapsed = 0.0;
    int fpsFrames = 0;
    double distanceTravelled = 0.0;
    lab::Measurement measurement;
#if LAB_CHECKPOINT <= 4
    int experimentDelayMs = 16;
#endif
#endif
#if LAB_CHECKPOINT >= 5
    bool capped = true;
    int targetFps = 60;
#endif
#if LAB_CHECKPOINT >= 6
    int smokeFrames = 0;
    if (smoke) {
        measurement.start();
    }
#endif

    // Một lần lặp: events -> clock -> WASD -> update -> vẽ -> nghỉ.
    while (running) {
#if LAB_CHECKPOINT >= 5
        const Uint64 frameStart = SDL_GetTicksNS();
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
                running = false;
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_R) {
                    position = {120.0, 220.0};
                    distanceTravelled = 0.0;
                    measurement = {};
                    wasSuspended = true;
                }
                if (event.key.key == SDLK_B) {
                    measurement.start();
                    wasSuspended = true;
                }
#if LAB_CHECKPOINT <= 4
                if (event.key.key == SDLK_1) {
                    experimentDelayMs = 33;
                }
                if (event.key.key == SDLK_2) {
                    experimentDelayMs = 16;
                }
                if (event.key.key == SDLK_3) {
                    experimentDelayMs = 8;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_F1) {
                    capped = !capped;
                }
                if (event.key.key == SDLK_1) {
                    targetFps = 30;
                    capped = true;
                }
                if (event.key.key == SDLK_2) {
                    targetFps = 60;
                    capped = true;
                }
                if (event.key.key == SDLK_3) {
                    targetFps = 120;
                    capped = true;
                }
                if (event.key.key == SDLK_0) {
                    capped = false;
                }
#endif
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 3
        bool suspended = (SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) == 0;
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_MINIMIZED) != 0) {
            suspended = true;
        }
#if LAB_CHECKPOINT >= 6
        if (smoke) {
            suspended = false;
        }
#endif
        if (suspended) {
            wasSuspended = true;
            fpsElapsed = 0.0;
            fpsFrames = 0;
            SDL_Delay(30);
            continue;
        }

        const Uint64 now = SDL_GetTicksNS();
        double rawDt = static_cast<double>(now - previous) / 1'000'000'000.0;
        previous = now;
        if (wasSuspended) {
            rawDt = 0.0;
            wasSuspended = false;
        }
        if (rawDt > 0.0) {
            fpsElapsed += rawDt;
            ++fpsFrames;
        }
        lab::advanceMeasurement(measurement, rawDt);
#endif
#if LAB_CHECKPOINT >= 1
        lab::Vec2 direction = readDirection();
#endif
#if LAB_CHECKPOINT >= 6
        if (smoke) {
            direction = lab::directionFromKeys(false, true, false, true);
        }
#endif
#if LAB_CHECKPOINT >= 2
        const lab::Vec2 velocity = lab::velocityFromDirection(direction, kPlayerSpeed);
#endif
#if LAB_CHECKPOINT >= 3
        const lab::Vec2 positionBeforeUpdate = position;
#endif
#if LAB_CHECKPOINT >= 4
        lab::update(position, velocity, rawDt);
#elif LAB_CHECKPOINT >= 2
        lab::moveFrameBased(position, velocity);
#endif
#if LAB_CHECKPOINT >= 2
        lab::clampPlayer(position, lab::Framebuffer::width, lab::Framebuffer::height, kPlayerSize);
#endif
#if LAB_CHECKPOINT >= 3
        distanceTravelled += lab::length({
            position.x - positionBeforeUpdate.x,
            position.y - positionBeforeUpdate.y,
        });
#endif
#if LAB_CHECKPOINT >= 1
        const bool isMoving = lab::length(direction) > 0.0;
        if (!renderFrame(renderer, texture, framebuffer, position, isMoving)) {
#else
        framebuffer.clear(lab::rgba(11, 16, 32));
        if (!lab::presentFramebuffer(renderer, texture, framebuffer)) {
#endif
            std::cerr << "Render failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
#if LAB_CHECKPOINT >= 3
        if (fpsElapsed >= 0.5) {
            char title[256]{};
            const char* measureLabel = "B: START";
            if (measurement.running) {
                measureLabel = "TEST";
            } else if (measurement.elapsed >= 5.0) {
                measureLabel = "DONE";
            }
#if LAB_CHECKPOINT >= 5
            int displayedCap = 0;
            if (capped) {
                displayedCap = targetFps;
            }
            std::snprintf(title, sizeof(title), "%.1f FPS | cap %d (0=off) | WASD %.1f px | %s %.2fs %.1fpx | dropped %.3fs", fpsFrames / fpsElapsed, displayedCap, distanceTravelled, measureLabel, measurement.elapsed, measurement.distance, measurement.discarded);
#else
            std::snprintf(title, sizeof(title), "%.1f FPS | delay %dms | WASD %.1f px | %s %.2fs %.1fpx | dropped %.3fs", fpsFrames / fpsElapsed, experimentDelayMs, distanceTravelled, measureLabel, measurement.elapsed, measurement.distance, measurement.discarded);
#endif
            if (!SDL_SetWindowTitle(window, title)) {
                std::cerr << "Title failed: " << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            fpsElapsed = 0.0;
            fpsFrames = 0;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (capped) {
            const Uint64 workNs = SDL_GetTicksNS() - frameStart;
            const Uint64 sleepNs = lab::remainingFrameNs(targetFps, workNs);
            SDL_DelayNS(sleepNs);
        }
#elif LAB_CHECKPOINT >= 3
        SDL_Delay(static_cast<Uint32>(experimentDelayMs));
#else
        // Chỉ nhường CPU trong bài đầu, chưa phải bộ giới hạn FPS.
        SDL_Delay(10);
#endif
#if LAB_CHECKPOINT >= 6
        if (smoke) {
            ++smokeFrames;
            if (!SDL_SetWindowSize(window, 640 + smokeFrames * 10, 400 + smokeFrames * 5)) {
                failed = true;
                break;
            }
            if (smokeFrames >= 12) {
                std::cout << "P02 hidden smoke: 12 frames, CPU rectangle, diagonal update, resize, present\n";
                running = false;
            }
        }
#endif
    }

    // Cleanup: texture phụ thuộc renderer nên phải hủy trước renderer.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
