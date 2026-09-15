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
constexpr int kGridSpacing = 40;

constexpr std::uint32_t rgba(
    std::uint8_t red,
    std::uint8_t green,
    std::uint8_t blue,
    std::uint8_t alpha = 255
) {
    return (std::uint32_t(red) << 24) |
        (std::uint32_t(green) << 16) |
        (std::uint32_t(blue) << 8) |
        std::uint32_t(alpha);
}

void putPixel(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x,
    int y,
    std::uint32_t color
) {
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

void clearCanvas(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
    const int centerX = width / 2;
    const int centerY = height / 2;
    for (int x = centerX % kGridSpacing; x < width; x += kGridSpacing) {
        drawLine(pixels, width, height, x, 0, x, height - 1, rgba(24, 35, 58));
    }
    for (int y = centerY % kGridSpacing; y < height; y += kGridSpacing) {
        drawLine(pixels, width, height, 0, y, width - 1, y, rgba(24, 35, 58));
    }
    drawLine(pixels, width, height, 0, centerY, width - 1, centerY, rgba(57, 70, 98));
    drawLine(pixels, width, height, centerX, 0, centerX, height - 1, rgba(57, 70, 98));
}

#if LAB_CHECKPOINT >= 1
lab::Vec2 screenCenter(int width, int height) {
    return {width * 0.5, height * 0.5};
}

lab::Vec2 worldToScreen(lab::Vec2 point, int width, int height) {
    const lab::Vec2 center = screenCenter(width, height);
    return {center.x + point.x, center.y - point.y};
}

lab::Vec2 screenToWorld(double x, double y, int width, int height) {
    const lab::Vec2 center = screenCenter(width, height);
    return {x - center.x, center.y - y};
}

void drawWorldLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 start,
    lab::Vec2 end,
    std::uint32_t color
) {
    const lab::Vec2 screenStart = worldToScreen(start, width, height);
    const lab::Vec2 screenEnd = worldToScreen(end, width, height);
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(screenStart.x)),
        int(std::lround(screenStart.y)),
        int(std::lround(screenEnd.x)),
        int(std::lround(screenEnd.y)),
        color
    );
}

void drawSquare(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Square& square,
    std::uint32_t color,
    bool drawVertices
) {
    for (std::size_t index = 0; index < square.size(); ++index) {
        const lab::Vec2 current = square[index];
        const lab::Vec2 next = square[(index + 1) % square.size()];
        drawWorldLine(pixels, width, height, current, next, color);
        if (drawVertices) {
            const lab::Vec2 screenPoint = worldToScreen(current, width, height);
            fillCircle(
                pixels,
                width,
                height,
                int(std::lround(screenPoint.x)),
                int(std::lround(screenPoint.y)),
                4,
                color
            );
        }
    }
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL, cửa sổ, renderer và streaming texture dùng cho mọi checkpoint.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow(
        "Project 09 - Square Transformer",
        width,
        height,
        SDL_WINDOW_RESIZABLE
    );
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

    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
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
    const lab::Square localSquare = lab::makeSquare(72.0);
#endif
#if LAB_CHECKPOINT >= 2
    double scaleX = 1.25;
    double scaleY = 0.8;
#endif
#if LAB_CHECKPOINT >= 3
    double angle = lab::kPi / 6.0;
#endif
#if LAB_CHECKPOINT >= 4
    double shearX = 0.35;
    double shearY = 0.0;
#endif
#if LAB_CHECKPOINT >= 5
    lab::Vec2 translation{35.0, 15.0};
    bool dragging = false;
#endif
#if LAB_CHECKPOINT >= 6
    lab::TransformOrder order = lab::TransformOrder::ScaleShearRotate;
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
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_A) {
                    scaleX = std::max(-2.0, scaleX - 0.1);
                }
                if (event.key.key == SDLK_D) {
                    scaleX = std::min(2.0, scaleX + 0.1);
                }
                if (event.key.key == SDLK_S) {
                    scaleY = std::max(-2.0, scaleY - 0.1);
                }
                if (event.key.key == SDLK_W) {
                    scaleY = std::min(2.0, scaleY + 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_LEFT) {
                    angle += 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_RIGHT) {
                    angle -= 5.0 * lab::kPi / 180.0;
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_J) {
                    shearX = std::max(-1.5, shearX - 0.1);
                }
                if (event.key.key == SDLK_L) {
                    shearX = std::min(1.5, shearX + 0.1);
                }
                if (event.key.key == SDLK_K) {
                    shearY = std::max(-1.5, shearY - 0.1);
                }
                if (event.key.key == SDLK_I) {
                    shearY = std::min(1.5, shearY + 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_O) {
                    if (order == lab::TransformOrder::ScaleShearRotate) {
                        order = lab::TransformOrder::RotateShearScale;
                    } else {
                        order = lab::TransformOrder::ScaleShearRotate;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    scaleX = 1.25;
                    scaleY = 0.8;
#if LAB_CHECKPOINT >= 3
                    angle = lab::kPi / 6.0;
#endif
#if LAB_CHECKPOINT >= 4
                    shearX = 0.35;
                    shearY = 0.0;
#endif
#if LAB_CHECKPOINT >= 5
                    translation = {35.0, 15.0};
#endif
#if LAB_CHECKPOINT >= 6
                    order = lab::TransformOrder::ScaleShearRotate;
#endif
                }
#endif
            }

#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN &&
                event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                translation = screenToWorld(event.button.x, event.button.y, width, height);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP &&
                event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                translation = screenToWorld(event.motion.x, event.motion.y, width, height);
            }
#endif

            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                SDL_Texture* newTexture = SDL_CreateTexture(
                    renderer,
                    SDL_PIXELFORMAT_RGBA8888,
                    SDL_TEXTUREACCESS_STREAMING,
                    newWidth,
                    newHeight
                );
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

        clearCanvas(pixels, width, height);

#if LAB_CHECKPOINT >= 1
        lab::Square transformedSquare = localSquare;
        lab::Square originalAtPosition = localSquare;
#if LAB_CHECKPOINT >= 5
        lab::Mat3 matrix = lab::identityMatrix();
#if LAB_CHECKPOINT >= 6
        const lab::TransformParameters parameters{
            scaleX,
            scaleY,
            angle,
            shearX,
            shearY,
            translation,
        };
        matrix = lab::composeTransform(parameters, order);
#else
        matrix = lab::multiply(
            lab::translationMatrix(translation),
            lab::multiply(
                lab::rotationMatrix(angle),
                lab::multiply(lab::shearMatrix(shearX, shearY), lab::scaleMatrix(scaleX, scaleY))
            )
        );
#endif
        transformedSquare = lab::transformSquare(localSquare, matrix);
        originalAtPosition = lab::transformSquare(localSquare, lab::translationMatrix(translation));
#elif LAB_CHECKPOINT >= 4
        for (std::size_t index = 0; index < transformedSquare.size(); ++index) {
            const lab::Vec2 scaled = lab::scalePoint(localSquare[index], scaleX, scaleY);
            const lab::Vec2 sheared = lab::shearPoint(scaled, shearX, shearY);
            transformedSquare[index] = lab::rotatePoint(sheared, angle);
        }
#elif LAB_CHECKPOINT >= 3
        for (std::size_t index = 0; index < transformedSquare.size(); ++index) {
            const lab::Vec2 scaled = lab::scalePoint(localSquare[index], scaleX, scaleY);
            transformedSquare[index] = lab::rotatePoint(scaled, angle);
        }
#elif LAB_CHECKPOINT >= 2
        for (std::size_t index = 0; index < transformedSquare.size(); ++index) {
            transformedSquare[index] = lab::scalePoint(localSquare[index], scaleX, scaleY);
        }
#endif

        drawSquare(pixels, width, height, originalAtPosition, rgba(83, 97, 125), false);
        drawSquare(pixels, width, height, transformedSquare, rgba(83, 240, 174), true);

#if LAB_CHECKPOINT >= 5
        const lab::Vec2 transformedOrigin = lab::transformPoint(matrix, {0.0, 0.0});
        const lab::Vec2 transformedXAxis = lab::transformPoint(matrix, {92.0, 0.0});
        const lab::Vec2 transformedYAxis = lab::transformPoint(matrix, {0.0, 92.0});
        drawWorldLine(pixels, width, height, transformedOrigin, transformedXAxis, rgba(255, 107, 107));
        drawWorldLine(pixels, width, height, transformedOrigin, transformedYAxis, rgba(132, 169, 255));
        const lab::Vec2 originScreen = worldToScreen(transformedOrigin, width, height);
        fillCircle(
            pixels,
            width,
            height,
            int(std::lround(originScreen.x)),
            int(std::lround(originScreen.y)),
            7,
            rgba(255, 226, 108)
        );
#endif

#if LAB_CHECKPOINT >= 2
        char title[320]{};
#if LAB_CHECKPOINT >= 6
        const double determinant = lab::determinantLinearPart(matrix);
        const double areaRatio = lab::polygonArea(transformedSquare) / lab::polygonArea(localSquare);
        const char* orderLabel = "Scale-Shear-Rotate";
        if (order == lab::TransformOrder::RotateShearScale) {
            orderLabel = "Rotate-Shear-Scale";
        }
        std::snprintf(
            title,
            sizeof(title),
            "scale %.2f %.2f | angle %.1f deg | shear %.2f %.2f | det %.3f | area %.3f | %s | O/R",
            scaleX,
            scaleY,
            angle * 180.0 / lab::kPi,
            shearX,
            shearY,
            determinant,
            areaRatio,
            orderLabel
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "matrix transform | scale %.2f %.2f | angle %.1f deg | shear %.2f %.2f | drag / R",
            scaleX,
            scaleY,
            angle * 180.0 / lab::kPi,
            shearX,
            shearY
        );
#elif LAB_CHECKPOINT >= 4
        std::snprintf(
            title,
            sizeof(title),
            "scale %.2f %.2f | angle %.1f deg | shear %.2f %.2f | J/L I/K",
            scaleX,
            scaleY,
            angle * 180.0 / lab::kPi,
            shearX,
            shearY
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "scale %.2f %.2f | angle %.1f deg | arrows / WASD / R",
            scaleX,
            scaleY,
            angle * 180.0 / lab::kPi
        );
#else
        std::snprintf(
            title,
            sizeof(title),
            "scaleX %.2f | scaleY %.2f | A/D W/S / R",
            scaleX,
            scaleY
        );
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

    // Giải phóng theo thứ tự ngược với lúc tạo tài nguyên.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
