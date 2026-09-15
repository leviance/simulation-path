#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif
#include <SDL3/SDL.h>
#if LAB_CHECKPOINT >= 2
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 5
#include <cstdint>
#endif
#if LAB_CHECKPOINT >= 3
#include <cstdio>
#endif
#include <cstdlib>
#include <iostream>

namespace {
constexpr int kWindowWidth = 960;
constexpr int kWindowHeight = 540;
#if LAB_CHECKPOINT >= 1
constexpr float kPlayerSize = 34.0F;
#endif
#if LAB_CHECKPOINT >= 2
constexpr double kPlayerSpeed = 180.0;
#endif
#if LAB_CHECKPOINT >= 1

// Chuyển trạng thái bốn phím thành một vector hướng có độ dài tối đa bằng 1.
lab::Vec2 readDirection() {
    const bool* keyboard = SDL_GetKeyboardState(nullptr);
    lab::Vec2 direction{};
    if (keyboard[SDL_SCANCODE_A]) {
        direction.x -= 1.0;
    }
    if (keyboard[SDL_SCANCODE_D]) {
        direction.x += 1.0;
    }
    if (keyboard[SDL_SCANCODE_W]) {
        direction.y -= 1.0;
    }
    if (keyboard[SDL_SCANCODE_S]) {
        direction.y += 1.0;
    }
    return lab::normalize(direction);
}

// Vẽ một frame hoàn chỉnh và trả false ngay tại thao tác SDL bị lỗi.
bool renderFrame(SDL_Renderer* renderer, const SDL_FRect& player, bool isMoving) {
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255)) {
        return false;
    }
    if (!SDL_RenderClear(renderer)) {
        return false;
    }
    if (isMoving) {
        if (!SDL_SetRenderDrawColor(renderer, 83, 240, 174, 255)) {
            return false;
        }
    } else {
        if (!SDL_SetRenderDrawColor(renderer, 126, 143, 177, 255)) {
            return false;
        }
    }
    if (!SDL_RenderFillRect(renderer, &player)) {
        return false;
    }
    if (!SDL_RenderPresent(renderer)) {
        return false;
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 5
std::uint64_t targetFrameDurationNs(int targetFps) {
    return 1'000'000'000ull / std::uint64_t(targetFps);
}
#endif
} // namespace

int main() {
    // Setup: khởi tạo SDL rồi tạo từng tài nguyên một.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 02 - WASD + FPS Cap", kWindowWidth, kWindowHeight, 0);
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

#if LAB_CHECKPOINT >= 1
    // Toàn bộ state của player tồn tại xuyên suốt game loop.
    lab::Vec2 position{120.0, 220.0};
#endif
#if LAB_CHECKPOINT >= 3
    const lab::Vec2 initialPosition = position;
#endif
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 3
    double previousTime = double(SDL_GetTicksNS()) / 1e9;
    double fpsElapsed = 0.0;
    int fpsFrames = 0;
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT <= 4
    int experimentDelayMs = 16;
    bool experimentRunning = false;
    double experimentElapsed = 0.0;
    double experimentDistance = 0.0;
#endif
#endif
#if LAB_CHECKPOINT >= 5
    double distanceTravelled = 0.0;
#endif
#if LAB_CHECKPOINT >= 5
    bool capped = true;
    int targetFps = 60;
#endif

    // Mỗi frame đi theo thứ tự input -> time -> update -> render -> cap.
    while (running) {
#if LAB_CHECKPOINT >= 5
        const std::uint64_t frameStart = SDL_GetTicksNS();
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
#if LAB_CHECKPOINT <= 4
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                bool restartExperiment = false;
                if (event.key.key == SDLK_R) {
                    restartExperiment = true;
                }
                if (event.key.key == SDLK_1) {
                    experimentDelayMs = 33;
                    restartExperiment = true;
                }
                if (event.key.key == SDLK_2) {
                    experimentDelayMs = 16;
                    restartExperiment = true;
                }
                if (event.key.key == SDLK_3) {
                    experimentDelayMs = 8;
                    restartExperiment = true;
                }
                if (restartExperiment) {
                    position = initialPosition;
                    experimentElapsed = 0.0;
                    experimentDistance = 0.0;
                    experimentRunning = true;
                }
            }
#endif
#endif
#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_F) {
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
                if (event.key.key == SDLK_R) {
                    position = initialPosition;
                    distanceTravelled = 0.0;
                }
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
        const lab::Vec2 direction = readDirection();
#elif LAB_CHECKPOINT <= 4
        lab::Vec2 direction = readDirection();
        if (experimentRunning) {
            direction = {1.0, 0.0};
        }
#else
        const lab::Vec2 direction = readDirection();
#endif
#endif
#if LAB_CHECKPOINT >= 2
        const lab::Vec2 velocity = direction * kPlayerSpeed;
#endif
#if LAB_CHECKPOINT >= 3
        const double now = double(SDL_GetTicksNS()) / 1e9;
        const double dt = now - previousTime;
        previousTime = now;
#endif
#if LAB_CHECKPOINT >= 4
        const lab::Vec2 positionBeforeUpdate = position;
        lab::update(position, velocity, dt);
#elif LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT == 3
        const lab::Vec2 positionBeforeUpdate = position;
#endif
        // Cố ý sai theo frame để bài 03 có một đối chứng quan sát được.
        position += velocity * (1.0 / 60.0);
#endif
#if LAB_CHECKPOINT >= 2
        position.x = std::clamp(position.x, 0.0, double(kWindowWidth) - kPlayerSize);
        position.y = std::clamp(position.y, 0.0, double(kWindowHeight) - kPlayerSize);
#endif
#if LAB_CHECKPOINT >= 5
        distanceTravelled += lab::length({
            position.x - positionBeforeUpdate.x,
            position.y - positionBeforeUpdate.y,
        });
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT <= 4
        if (experimentRunning) {
            experimentDistance += lab::length({
                position.x - positionBeforeUpdate.x,
                position.y - positionBeforeUpdate.y,
            });
            experimentElapsed += dt;
            if (experimentElapsed >= 1.0) {
                experimentRunning = false;
            }
        }
#endif
#endif
#if LAB_CHECKPOINT >= 1
        const SDL_FRect player{
            float(position.x),
            float(position.y),
            kPlayerSize,
            kPlayerSize,
        };
        const bool isMoving = lab::length(direction) > 0.0;
        if (!renderFrame(renderer, player, isMoving)) {
            std::cerr << "Render failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
#else
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) ||
            !SDL_RenderClear(renderer) ||
            !SDL_RenderPresent(renderer)) {
            std::cerr << "Render failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
#endif
#if LAB_CHECKPOINT >= 3
        fpsElapsed += dt;
        ++fpsFrames;
        if (fpsElapsed >= 0.5) {
            char title[160]{};
#if LAB_CHECKPOINT >= 5
            const char* capLabel = "UNCAPPED";
            int displayedTargetFps = 0;
            if (capped) {
                capLabel = "CAP";
                displayedTargetFps = targetFps;
            }
            std::snprintf(title, sizeof(title), "Project 02 | %.1f FPS | %s %d | distance %.1f px", fpsFrames / fpsElapsed, capLabel, displayedTargetFps, distanceTravelled);
#elif LAB_CHECKPOINT >= 4
            const char* experimentState = "PRESS 1/2/3";
            if (experimentRunning) {
                experimentState = "MEASURING";
            }
            std::snprintf(title, sizeof(title), "Project 02 | %.1f FPS | dt DEMO %d ms | %.1f px / 1 s | %s", fpsFrames / fpsElapsed, experimentDelayMs, experimentDistance, experimentState);
#else
            const char* experimentState = "PRESS 1/2/3";
            if (experimentRunning) {
                experimentState = "MEASURING";
            }
            std::snprintf(title, sizeof(title), "Project 02 | %.1f FPS | DEMO %d ms | %.1f px / 1 s | %s", fpsFrames / fpsElapsed, experimentDelayMs, experimentDistance, experimentState);
#endif
            SDL_SetWindowTitle(window, title);
            fpsElapsed = 0.0;
            fpsFrames = 0;
        }
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT <= 4
        SDL_Delay(Uint32(experimentDelayMs));
#endif
#endif
#if LAB_CHECKPOINT >= 5
        if (capped) {
            const std::uint64_t target = targetFrameDurationNs(targetFps);
            const std::uint64_t elapsed = SDL_GetTicksNS() - frameStart;
            if (elapsed < target) {
                SDL_DelayNS(target - elapsed);
            }
        }
#endif
    }

    // Cleanup theo thứ tự ngược với setup.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
