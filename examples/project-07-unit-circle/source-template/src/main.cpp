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
#if LAB_CHECKPOINT >= 1
#include <cstdio>
#endif
#include <cstdlib>
#include <iostream>
#include <vector>

namespace {
constexpr int kInitialWidth = 1000;
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
void plotCirclePoints(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int x,
    int y,
    std::uint32_t color
) {
    putPixel(pixels, width, height, centerX + x, centerY + y, color);
    putPixel(pixels, width, height, centerX + y, centerY + x, color);
    putPixel(pixels, width, height, centerX - y, centerY + x, color);
    putPixel(pixels, width, height, centerX - x, centerY + y, color);
    putPixel(pixels, width, height, centerX - x, centerY - y, color);
    putPixel(pixels, width, height, centerX - y, centerY - x, color);
    putPixel(pixels, width, height, centerX + y, centerY - x, color);
    putPixel(pixels, width, height, centerX + x, centerY - y, color);
}

void drawCircleOutline(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int radius,
    std::uint32_t color
) {
    int x = std::max(0, radius);
    int y = 0;
    int decision = 1 - x;
    while (x >= y) {
        plotCirclePoints(pixels, width, height, centerX, centerY, x, y, color);
        ++y;
        if (decision <= 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
}

lab::Vec2 screenCenter(int width, int height) {
    return {width * 0.28, height * 0.5};
}

int circleRadius(int width, int height) {
    const int horizontalLimit = int(std::lround(width * 0.20));
    const int verticalLimit = int(std::lround(height * 0.30));
    return std::max(50, std::min(horizontalLimit, verticalLimit));
}
#endif

#if LAB_CHECKPOINT >= 5
void drawWaveGraph(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const std::vector<lab::WaveSample>& samples,
    double visibleDuration
) {
    const int left = width / 2 + 25;
    const int right = width - 25;
    const int centerY = height / 2;
    const int amplitude = std::max(35, int(std::lround(height * 0.28)));
    drawLine(pixels, width, height, left, centerY, right, centerY, rgba(99, 112, 141));
    drawLine(pixels, width, height, left, centerY - amplitude, left, centerY + amplitude, rgba(99, 112, 141));

    if (samples.size() < 2) {
        return;
    }
    const double newestTime = samples.back().time;
    const double oldestVisibleTime = newestTime - visibleDuration;
    for (std::size_t index = 1; index < samples.size(); ++index) {
        if (samples[index].time < oldestVisibleTime) {
            continue;
        }
        const int previousX = int(std::lround(lab::mapSampleTimeToX(samples[index - 1].time, newestTime, visibleDuration, double(left), double(right))));
        const int currentX = int(std::lround(lab::mapSampleTimeToX(samples[index].time, newestTime, visibleDuration, double(left), double(right))));
        const int previousSinY = centerY - int(std::lround(samples[index - 1].sine * amplitude));
        const int currentSinY = centerY - int(std::lround(samples[index].sine * amplitude));
        const int previousCosY = centerY - int(std::lround(samples[index - 1].cosine * amplitude));
        const int currentCosY = centerY - int(std::lround(samples[index].cosine * amplitude));
        drawLine(pixels, width, height, previousX, previousSinY, currentX, currentSinY, rgba(83, 240, 174));
        drawLine(pixels, width, height, previousX, previousCosY, currentX, currentCosY, rgba(132, 169, 255));
    }
}
#endif

void clearCanvas(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
    drawLine(pixels, width, height, 0, height / 2, width - 1, height / 2, rgba(29, 41, 67));
}
} // namespace

int main() {
    // Khởi tạo SDL và framebuffer dùng chung cho toàn bộ project.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 07 - Unit Circle", width, height, SDL_WINDOW_RESIZABLE);
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
#if LAB_CHECKPOINT >= 2
    const double initialAngle = lab::degreesToRadians(35.0);
    double angle = initialAngle;
#endif
#if LAB_CHECKPOINT >= 3
    double angularSpeed = lab::kPi / 2.0;
    bool paused = false;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 5
    double elapsedTime = 0.0;
    double sampleAccumulator = 0.0;
    std::vector<lab::WaveSample> samples;
    constexpr std::size_t kMaximumSamples = 360;
    constexpr double kSampleInterval = 1.0 / 60.0;
    constexpr double kVisibleHistorySeconds = 6.0;
#endif
#if LAB_CHECKPOINT >= 6
    bool draggingPoint = false;
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
#if LAB_CHECKPOINT >= 3
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_UP) {
                    angularSpeed = std::min(2.0 * lab::kPi, angularSpeed + 0.25);
                }
                if (event.key.key == SDLK_DOWN) {
                    angularSpeed = std::max(-2.0 * lab::kPi, angularSpeed - 0.25);
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    angle = initialAngle;
                    angularSpeed = lab::kPi / 2.0;
                    paused = false;
#if LAB_CHECKPOINT >= 5
                    elapsedTime = 0.0;
                    sampleAccumulator = 0.0;
                    samples.clear();
#endif
                }
#endif
            }

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

#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::Vec2 center = screenCenter(width, height);
                const int radius = circleRadius(width, height);
                const lab::Vec2 pointWorld = lab::pointOnCircle({}, double(radius), angle);
                const lab::Vec2 pointScreen{center.x + pointWorld.x, center.y - pointWorld.y};
                const double offsetX = event.button.x - pointScreen.x;
                const double offsetY = event.button.y - pointScreen.y;
                if (offsetX * offsetX + offsetY * offsetY <= 18.0 * 18.0) {
                    draggingPoint = true;
                    paused = true;
                    if (!SDL_CaptureMouse(true)) {
                        std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingPoint) {
                const lab::Vec2 center = screenCenter(width, height);
                const lab::Vec2 direction{
                    event.motion.x - center.x,
                    center.y - event.motion.y,
                };
                angle = lab::angleFromDirection(direction);
                samples.clear();
                elapsedTime = 0.0;
                sampleAccumulator = 0.0;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                draggingPoint = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggingPoint = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 3
        const std::uint64_t currentTicks = SDL_GetTicks();
        double deltaTime = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        deltaTime = std::min(deltaTime, 0.1);
        if (!paused) {
            angle = lab::advanceAngle(angle, angularSpeed, deltaTime);
#if LAB_CHECKPOINT >= 5
            elapsedTime += deltaTime;
            sampleAccumulator += deltaTime;
            if (samples.empty() || sampleAccumulator >= kSampleInterval) {
                lab::appendWaveSample(samples, lab::sampleWave(elapsedTime, angle), kMaximumSamples);
                sampleAccumulator = std::fmod(sampleAccumulator, kSampleInterval);
            }
#endif
        }
#endif

        clearCanvas(pixels, width, height);

#if LAB_CHECKPOINT >= 1
        const lab::Vec2 center = screenCenter(width, height);
        const int radius = circleRadius(width, height);
        const int centerX = int(std::lround(center.x));
        const int centerY = int(std::lround(center.y));
        drawLine(pixels, width, height, centerX - radius - 20, centerY, centerX + radius + 20, centerY, rgba(99, 112, 141));
        drawLine(pixels, width, height, centerX, centerY - radius - 20, centerX, centerY + radius + 20, rgba(99, 112, 141));
        drawCircleOutline(pixels, width, height, centerX, centerY, radius, rgba(126, 139, 166));
#if LAB_CHECKPOINT >= 2
        const lab::Vec2 direction = lab::unitDirection(angle);
        const lab::Vec2 point = lab::pointOnCircle({}, double(radius), angle);
        const int pointX = centerX + int(std::lround(point.x));
        const int pointY = centerY - int(std::lround(point.y));
        drawLine(pixels, width, height, centerX, centerY, pointX, pointY, rgba(255, 226, 108));
        fillCircle(pixels, width, height, pointX, pointY, 7, rgba(255, 226, 108));
#else
        drawLine(pixels, width, height, centerX, centerY, centerX + radius, centerY, rgba(255, 226, 108));
        fillCircle(pixels, width, height, centerX + radius, centerY, 7, rgba(255, 226, 108));
#endif

#if LAB_CHECKPOINT >= 4
        const lab::Vec2 cosineProjection = lab::projectOntoXAxis(point);
        const lab::Vec2 sineProjection = lab::projectOntoYAxis(point);
        const int cosineX = centerX + int(std::lround(cosineProjection.x));
        const int sineY = centerY - int(std::lround(sineProjection.y));
        drawLine(pixels, width, height, pointX, pointY, cosineX, centerY, rgba(70, 83, 110));
        drawLine(pixels, width, height, pointX, pointY, centerX, sineY, rgba(70, 83, 110));
        drawLine(pixels, width, height, centerX, centerY, cosineX, centerY, rgba(132, 169, 255));
        drawLine(pixels, width, height, centerX, centerY, centerX, sineY, rgba(83, 240, 174));
        fillCircle(pixels, width, height, cosineX, centerY, 4, rgba(132, 169, 255));
        fillCircle(pixels, width, height, centerX, sineY, 4, rgba(83, 240, 174));
#endif

#if LAB_CHECKPOINT >= 5
        drawWaveGraph(pixels, width, height, samples, kVisibleHistorySeconds);
#endif

        char title[300]{};
#if LAB_CHECKPOINT >= 6
        const double period = lab::periodFromAngularSpeed(angularSpeed);
        std::snprintf(title, sizeof(title), "angle %.3f rad = %.1f deg | cos %.3f | sin %.3f | speed %.3f rad/s | period %.3f s | drag point / Space / Up Down / R", angle, lab::radiansToDegrees(angle), direction.x, direction.y, angularSpeed, period);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "sin green | cos blue | angle %.3f rad | samples %zu | Space pause | Up/Down speed", angle, samples.size());
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "x = cos(angle) = %.3f | y = sin(angle) = %.3f | angle %.1f deg", direction.x, direction.y, lab::radiansToDegrees(angle));
#elif LAB_CHECKPOINT >= 3
        const double period = lab::periodFromAngularSpeed(angularSpeed);
        std::snprintf(title, sizeof(title), "angle %.3f rad | speed %.3f rad/s | period %.3f s | Space pause | Up/Down speed", angle, angularSpeed, period);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "angle %.3f rad = %.1f deg | endpoint (cos, sin) = (%.3f, %.3f)", angle, lab::radiansToDegrees(angle), direction.x, direction.y);
#else
        std::snprintf(title, sizeof(title), "0 rad = 0 deg | pi rad = 180 deg | 2pi rad = 360 deg");
#endif
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
