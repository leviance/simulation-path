#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif

#include <SDL3/SDL.h>
#include <algorithm>
#include <cmath>
#include <cstdint>
#if LAB_CHECKPOINT >= 2
#include <cstdio>
#endif
#include <cstdlib>
#include <iostream>
#include <vector>

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;

constexpr std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
    return (std::uint32_t(red) << 24) |
        (std::uint32_t(green) << 16) |
        (std::uint32_t(blue) << 8) |
        std::uint32_t(alpha);
}

void putPixel(std::vector<std::uint32_t>& pixels, int width, int height, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
    pixels[index] = color;
}

void drawLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x0,
    int y0,
    int x1,
    int y1,
    std::uint32_t color
) {
    const int deltaX = std::abs(x1 - x0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    const int deltaY = -std::abs(y1 - y0);
    int stepY = -1;
    if (y0 < y1) {
        stepY = 1;
    }
    int error = deltaX + deltaY;

    while (true) {
        putPixel(pixels, width, height, x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int doubledError = 2 * error;
        if (doubledError >= deltaY) {
            error += deltaY;
            x0 += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y0 += stepY;
        }
    }
}

void fillCircle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int radius,
    std::uint32_t color
) {
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                putPixel(pixels, width, height, centerX + offsetX, centerY + offsetY, color);
            }
        }
    }
}

#if LAB_CHECKPOINT >= 1
lab::Vec2 screenCenter(int width, int height) {
    return {width * 0.5, height * 0.5};
}

lab::Vec2 worldToScreen(lab::Vec2 point, lab::Vec2 center) {
    return {center.x + point.x, center.y - point.y};
}

void drawArrow(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 start,
    lab::Vec2 end,
    std::uint32_t color
) {
    const int startX = int(std::lround(start.x));
    const int startY = int(std::lround(start.y));
    const int endX = int(std::lround(end.x));
    const int endY = int(std::lround(end.y));
    drawLine(pixels, width, height, startX, startY, endX, endY, color);

    const lab::Vec2 backward = lab::normalize(lab::subtract(start, end));
    const lab::Vec2 perpendicular{-backward.y, backward.x};
    const lab::Vec2 arrowBase = lab::add(end, lab::scale(backward, 14.0));
    const lab::Vec2 firstWing = lab::add(arrowBase, lab::scale(perpendicular, 6.0));
    const lab::Vec2 secondWing = lab::subtract(arrowBase, lab::scale(perpendicular, 6.0));
    drawLine(pixels, width, height, endX, endY, int(std::lround(firstWing.x)), int(std::lround(firstWing.y)), color);
    drawLine(pixels, width, height, endX, endY, int(std::lround(secondWing.x)), int(std::lround(secondWing.y)), color);
}

void drawTarget(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 position,
    std::uint32_t color
) {
    const int x = int(std::lround(position.x));
    const int y = int(std::lround(position.y));
    fillCircle(pixels, width, height, x, y, 8, color);
    drawLine(pixels, width, height, x - 14, y, x + 14, y, rgba(238, 242, 255));
    drawLine(pixels, width, height, x, y - 14, x, y + 14, rgba(238, 242, 255));
}
#endif

void clearCanvas(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
    const int centerX = width / 2;
    const int centerY = height / 2;
    for (int x = centerX % 40; x < width; x += 40) {
        drawLine(pixels, width, height, x, 0, x, height - 1, rgba(24, 35, 58));
    }
    for (int y = centerY % 40; y < height; y += 40) {
        drawLine(pixels, width, height, 0, y, width - 1, y, rgba(24, 35, 58));
    }
    drawLine(pixels, width, height, 0, centerY, width - 1, centerY, rgba(57, 70, 98));
    drawLine(pixels, width, height, centerX, 0, centerX, height - 1, rgba(57, 70, 98));
}
} // namespace

int main() {
    // Khởi tạo SDL và các tài nguyên hiển thị dùng chung cho toàn bộ project.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 08 - Mouse Turret", width, height, SDL_WINDOW_RESIZABLE);
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
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    std::vector<std::uint32_t> pixels(std::size_t(width) * std::size_t(height));
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    const lab::Vec2 initialTargetOffset{220.0, 120.0};
    lab::Vec2 targetOffset = initialTargetOffset;
    const double initialTurretAngle = 0.0;
    double turretAngle = initialTurretAngle;
#endif
#if LAB_CHECKPOINT >= 5
    const double initialTurnSpeed = lab::kPi / 2.0;
    double turnSpeed = initialTurnSpeed;
    bool paused = false;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 6
    const double initialHalfViewAngle = 35.0 * lab::kPi / 180.0;
    double halfViewAngle = initialHalfViewAngle;
#endif

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
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_UP) {
                    turnSpeed = std::min(lab::kTau, turnSpeed + 0.25);
                }
                if (event.key.key == SDLK_DOWN) {
                    turnSpeed = std::max(0.0, turnSpeed - 0.25);
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    targetOffset = initialTargetOffset;
                    turretAngle = initialTurretAngle;
                    turnSpeed = initialTurnSpeed;
                    paused = false;
#if LAB_CHECKPOINT >= 6
                    halfViewAngle = initialHalfViewAngle;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_LEFTBRACKET) {
                    halfViewAngle = std::max(5.0 * lab::kPi / 180.0, halfViewAngle - 5.0 * lab::kPi / 180.0);
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    halfViewAngle = std::min(90.0 * lab::kPi / 180.0, halfViewAngle + 5.0 * lab::kPi / 180.0);
                }
#endif
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                const lab::Vec2 center = screenCenter(width, height);
                targetOffset = {
                    event.motion.x - center.x,
                    center.y - event.motion.y,
                };
            }
#endif

            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                SDL_Texture* newTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
                if (!newTexture) {
                    std::cerr << "Texture resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                    break;
                }
                pixels.assign(std::size_t(newWidth) * std::size_t(newHeight), rgba(11, 16, 32));
                SDL_DestroyTexture(texture);
                texture = newTexture;
                width = newWidth;
                height = newHeight;
            }
        }

        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 5
        const std::uint64_t currentTicks = SDL_GetTicks();
        double deltaTime = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        deltaTime = std::min(deltaTime, 0.1);
        if (!paused) {
            turretAngle = lab::rotateTowards(turretAngle, targetOffset, turnSpeed * deltaTime);
        }
#endif

        clearCanvas(pixels, width, height);

#if LAB_CHECKPOINT >= 1
        const lab::Vec2 center = screenCenter(width, height);
        const lab::Vec2 targetScreen = worldToScreen(targetOffset, center);
        const lab::Vec2 forward = lab::directionFromAngle(turretAngle);
        const lab::Vec2 barrelEnd = worldToScreen(lab::scale(forward, 115.0), center);

#if LAB_CHECKPOINT >= 6
        const bool targetLocked = lab::isWithinViewCone(forward, targetOffset, halfViewAngle);
        const lab::Vec2 lowerBoundary = lab::directionFromAngle(turretAngle - halfViewAngle);
        const lab::Vec2 upperBoundary = lab::directionFromAngle(turretAngle + halfViewAngle);
        drawLine(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), int(std::lround(center.x + lowerBoundary.x * 190.0)), int(std::lround(center.y - lowerBoundary.y * 190.0)), rgba(91, 104, 132));
        drawLine(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), int(std::lround(center.x + upperBoundary.x * 190.0)), int(std::lround(center.y - upperBoundary.y * 190.0)), rgba(91, 104, 132));
#endif

        drawLine(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), int(std::lround(targetScreen.x)), int(std::lround(targetScreen.y)), rgba(66, 79, 105));

#if LAB_CHECKPOINT >= 4
        const lab::Vec2 parallel = lab::vectorProjection(targetOffset, forward);
        const lab::Vec2 projectionScreen = worldToScreen(parallel, center);
        drawArrow(pixels, width, height, center, projectionScreen, rgba(132, 169, 255));
        drawLine(pixels, width, height, int(std::lround(projectionScreen.x)), int(std::lround(projectionScreen.y)), int(std::lround(targetScreen.x)), int(std::lround(targetScreen.y)), rgba(255, 107, 107));
#endif

        fillCircle(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), 27, rgba(44, 55, 82));
        drawArrow(pixels, width, height, center, barrelEnd, rgba(255, 226, 108));
#if LAB_CHECKPOINT >= 6
        std::uint32_t targetColor = rgba(255, 107, 107);
        if (targetLocked) {
            targetColor = rgba(83, 240, 174);
        }
        drawTarget(pixels, width, height, targetScreen, targetColor);
#else
        drawTarget(pixels, width, height, targetScreen, rgba(255, 107, 107));
#endif

#if LAB_CHECKPOINT >= 2
        const lab::Vec2 targetDirection = lab::normalize(targetOffset);
        const double alignment = lab::dot(forward, targetDirection);
        char title[300]{};
#if LAB_CHECKPOINT >= 6
        const double angleError = lab::angleBetween(forward, targetOffset);
        const bool lockedForTitle = lab::isWithinViewCone(forward, targetOffset, halfViewAngle);
        const char* lockLabel = "SEARCHING";
        if (lockedForTitle) {
            lockLabel = "LOCKED";
        }
        std::snprintf(title, sizeof(title), "dot %.3f | angle %.1f deg | turn %.2f rad/s | cone +/- %.1f deg | %s | mouse / Space / Up Down / [ ] / R", alignment, angleError * 180.0 / lab::kPi, turnSpeed, halfViewAngle * 180.0 / lab::kPi, lockLabel);
#elif LAB_CHECKPOINT >= 5
        const double signedError = lab::signedAngleBetween(forward, targetOffset);
        std::snprintf(title, sizeof(title), "dot %.3f | signed error %.1f deg | turn %.2f rad/s | mouse / Space / Up Down / R", alignment, signedError * 180.0 / lab::kPi, turnSpeed);
#elif LAB_CHECKPOINT >= 4
        const double alongBarrel = lab::scalarProjection(targetOffset, forward);
        const double missDistance = lab::length(lab::rejection(targetOffset, forward));
        std::snprintf(title, sizeof(title), "dot %.3f | projection %.1f px | perpendicular miss %.1f px", alignment, alongBarrel, missDistance);
#elif LAB_CHECKPOINT >= 3
        const double angleError = lab::angleBetween(forward, targetOffset);
        std::snprintf(title, sizeof(title), "normalized dot %.3f | unsigned angle %.1f deg", alignment, angleError * 180.0 / lab::kPi);
#else
        const double rawDot = lab::dot(forward, targetOffset);
        std::snprintf(title, sizeof(title), "raw dot %.1f | normalized dot %.3f | move mouse", rawDot, alignment);
#endif
        SDL_SetWindowTitle(window, title);
#endif
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

    // Giải phóng tài nguyên theo thứ tự ngược với lúc khởi tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
