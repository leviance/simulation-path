#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif
#include <SDL3/SDL.h>
#include <algorithm>
#if LAB_CHECKPOINT >= 1
#include <cmath>
#endif
#include <cstdint>
#if LAB_CHECKPOINT >= 3
#include <cstdio>
#endif
#include <cstdlib>
#include <iostream>
#include <utility>
#include <vector>

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 540;

std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
    return (std::uint32_t(red) << 24) | (std::uint32_t(green) << 16) | (std::uint32_t(blue) << 8) | alpha;
}
} // namespace

int main() {
    // Setup: tạo SDL resources trước khi tạo framebuffer và camera state.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 05 - Coordinate Map", width, height, SDL_WINDOW_RESIZABLE);
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
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
    if (!texture) {
        std::cerr << "Texture creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::vector<std::uint32_t> pixels(std::size_t(width) * std::size_t(height));

    // Camera và interaction state tồn tại xuyên suốt event loop.
#if LAB_CHECKPOINT >= 1
    lab::Camera2D camera;
#endif
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 4
    bool panning = false;
#endif
#if LAB_CHECKPOINT >= 3
    bool draggingPoint = false;
    lab::Vec2 cursorScreen{width * 0.5, height * 0.5};
#endif
#if LAB_CHECKPOINT >= 4
    lab::Vec2 previousScreen{};
#endif
#if LAB_CHECKPOINT >= 1
    lab::Vec2 markerWorld{2.0, 1.0};
    const auto putPixel = [&](int x, int y, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
        pixels[index] = color;
    };
#endif

    // Input thay đổi camera/marker; render luôn đọc trạng thái mới nhất.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 4
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    const lab::Vec2 viewport = camera.viewportPixels;
                    camera = {};
                    camera.viewportPixels = viewport;
                }
#endif
            }
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                std::vector<std::uint32_t> newPixels(std::size_t(newWidth) * std::size_t(newHeight), rgba(11, 16, 32));
                SDL_Texture* newTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
                if (!newTexture) {
                    std::cerr << "Texture resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                    break;
                }
                pixels = std::move(newPixels);
                SDL_DestroyTexture(texture);
                texture = newTexture;
                width = newWidth;
                height = newHeight;
#if LAB_CHECKPOINT >= 1
                camera.viewportPixels = {double(width), double(height)};
#endif
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
#if LAB_CHECKPOINT >= 4
                panning = false;
#endif
                draggingPoint = true;
                cursorScreen = {event.button.x, event.button.y};
                markerWorld = camera.screenToWorld(cursorScreen);
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && draggingPoint) {
                draggingPoint = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingPoint) {
                cursorScreen = {event.motion.x, event.motion.y};
                markerWorld = camera.screenToWorld(cursorScreen);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && !draggingPoint) {
                cursorScreen = {event.motion.x, event.motion.y};
            }
#endif
#if LAB_CHECKPOINT >= 4
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_RIGHT) {
                draggingPoint = false;
                panning = true;
                previousScreen = {event.button.x, event.button.y};
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_RIGHT && panning) {
                panning = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && panning) {
                const lab::Vec2 currentScreen{event.motion.x, event.motion.y};
                camera.pan(currentScreen - previousScreen);
                previousScreen = currentScreen;
            }
#endif
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggingPoint = false;
#if LAB_CHECKPOINT >= 4
                panning = false;
#endif
                SDL_CaptureMouse(false);
            }
#endif
#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_MOUSE_WHEEL && event.wheel.y != 0.0f) {
                float mouseX = 0.0f;
                float mouseY = 0.0f;
                SDL_GetMouseState(&mouseX, &mouseY);
                cursorScreen = {mouseX, mouseY};
                double factor = 1.12;
                if (event.wheel.y < 0.0f) {
                    factor = 1.0 / 1.12;
                }
                camera.zoomAt({mouseX, mouseY}, factor);
            }
#endif
        }
        if (!running) {
            break;
        }
        std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
#if LAB_CHECKPOINT >= 4
        const lab::Vec2 worldBottomLeft = camera.screenToWorld({0.0, double(height)});
        const lab::Vec2 worldTopRight = camera.screenToWorld({double(width), 0.0});
        for (int gridX = int(std::floor(worldBottomLeft.x)); gridX <= int(std::ceil(worldTopRight.x)); ++gridX) {
            const int screenX = int(std::lround(camera.worldToScreen({double(gridX), 0.0}).x));
            std::uint32_t color = rgba(29, 41, 67);
            if (gridX == 0) {
                color = rgba(99, 112, 141);
            }
            for (int y = 0; y < height; ++y) {
                putPixel(screenX, y, color);
            }
        }
        for (int gridY = int(std::floor(worldBottomLeft.y)); gridY <= int(std::ceil(worldTopRight.y)); ++gridY) {
            const int screenY = int(std::lround(camera.worldToScreen({0.0, double(gridY)}).y));
            std::uint32_t color = rgba(29, 41, 67);
            if (gridY == 0) {
                color = rgba(99, 112, 141);
            }
            for (int x = 0; x < width; ++x) {
                putPixel(x, screenY, color);
            }
        }
#elif LAB_CHECKPOINT >= 2
        const lab::Vec2 origin = camera.worldToScreen({0.0, 0.0});
        for (int x = 0; x < width; ++x) {
            putPixel(x, int(std::lround(origin.y)), rgba(99, 112, 141));
        }
        for (int y = 0; y < height; ++y) {
            putPixel(int(std::lround(origin.x)), y, rgba(99, 112, 141));
        }
#elif LAB_CHECKPOINT >= 1
        const lab::Vec2 origin{width * 0.5, height * 0.5};
        for (int x = 0; x < width; ++x) {
            putPixel(x, int(std::lround(origin.y)), rgba(99, 112, 141));
        }
        for (int y = 0; y < height; ++y) {
            putPixel(int(std::lround(origin.x)), y, rgba(99, 112, 141));
        }
#endif
#if LAB_CHECKPOINT >= 1
        lab::Vec2 markerScreen{};
#if LAB_CHECKPOINT >= 2
        markerScreen = camera.worldToScreen(markerWorld);
#else
        // Manual placement visualizes the convention before Camera2D owns it.
        markerScreen = {
            width * 0.5 + markerWorld.x * camera.pixelsPerUnit,
            height * 0.5 - markerWorld.y * camera.pixelsPerUnit,
        };
#endif
        for (int offsetY = -5; offsetY <= 5; ++offsetY) {
            for (int offsetX = -5; offsetX <= 5; ++offsetX) {
                if (offsetX * offsetX + offsetY * offsetY <= 25) {
                    putPixel(int(std::lround(markerScreen.x)) + offsetX, int(std::lround(markerScreen.y)) + offsetY, rgba(83, 240, 174));
                }
            }
        }
#endif
#if LAB_CHECKPOINT >= 3
        const lab::Vec2 cursorWorld = camera.screenToWorld(cursorScreen);
        const lab::Vec2 roundTripScreen = camera.worldToScreen(cursorWorld);
        const double roundTripError = std::hypot(roundTripScreen.x - cursorScreen.x, roundTripScreen.y - cursorScreen.y);
        char title[220]{};
        std::snprintf(title, sizeof(title), "screen (%.1f, %.1f) | world (%.4f, %.4f) | round-trip error %.3g px | scale %.1f px/unit", cursorScreen.x, cursorScreen.y, cursorWorld.x, cursorWorld.y, roundTripError, camera.scale());
        SDL_SetWindowTitle(window, title);
#endif
        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderClear(renderer)) {
            std::cerr << "SDL_RenderClear failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            std::cerr << "SDL_RenderTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderPresent(renderer)) {
            std::cerr << "SDL_RenderPresent failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        SDL_Delay(1);
    }

    // Texture phụ thuộc renderer, renderer phụ thuộc window.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
