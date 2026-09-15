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
#include <utility>
#include <vector>

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;
constexpr double kPixelsPerUnit = 70.0;

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
        const int doubledError = error * 2;
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
lab::Vec2 worldToScreen(lab::Vec2 world, int width, int height) {
    return {
        width * 0.5 + world.x * kPixelsPerUnit,
        height * 0.5 - world.y * kPixelsPerUnit,
    };
}

lab::Vec2 screenToWorld(lab::Vec2 screen, int width, int height) {
    return {
        (screen.x - width * 0.5) / kPixelsPerUnit,
        (height * 0.5 - screen.y) / kPixelsPerUnit,
    };
}

void drawScreenLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 start,
    lab::Vec2 end,
    std::uint32_t color
) {
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(start.x)),
        int(std::lround(start.y)),
        int(std::lround(end.x)),
        int(std::lround(end.y)),
        color
    );
}
#endif

#if LAB_CHECKPOINT >= 2
void drawArrow(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 start,
    lab::Vec2 end,
    std::uint32_t color
) {
    drawScreenLine(pixels, width, height, start, end, color);

    const lab::Vec2 direction = lab::normalize(end - start);
    if (lab::lengthSquared(direction) == 0.0) {
        fillCircle(pixels, width, height, int(std::lround(end.x)), int(std::lround(end.y)), 4, color);
        return;
    }

    const lab::Vec2 perpendicular{-direction.y, direction.x};
    const lab::Vec2 arrowBase = end - direction * 14.0;
    const lab::Vec2 leftWing = arrowBase + perpendicular * 6.0;
    const lab::Vec2 rightWing = arrowBase - perpendicular * 6.0;
    drawScreenLine(pixels, width, height, end, leftWing, color);
    drawScreenLine(pixels, width, height, end, rightWing, color);
}
#endif

#if LAB_CHECKPOINT >= 6
// Bản final tách các lớp hình để người học có thể quan sát từng ý mà không bị rối.
enum class ViewMode {
    basic,
    addSubtract,
    scalarAndDistance,
    normalizeAndLerp,
    all,
};

const char* viewName(ViewMode mode) {
    switch (mode) {
    case ViewMode::basic:
        return "1 basic";
    case ViewMode::addSubtract:
        return "2 add/subtract";
    case ViewMode::scalarAndDistance:
        return "3 scalar/distance";
    case ViewMode::normalizeAndLerp:
        return "4 normalize/lerp";
    case ViewMode::all:
        return "0 all layers";
    }
    return "unknown";
}
#endif

void drawBoard(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
    const int originX = width / 2;
    const int originY = height / 2;
    const int spacing = int(kPixelsPerUnit);

    for (int x = originX % spacing; x < width; x += spacing) {
        drawLine(pixels, width, height, x, 0, x, height - 1, rgba(29, 41, 67));
    }
    for (int y = originY % spacing; y < height; y += spacing) {
        drawLine(pixels, width, height, 0, y, width - 1, y, rgba(29, 41, 67));
    }
    drawLine(pixels, width, height, 0, originY, width - 1, originY, rgba(99, 112, 141));
    drawLine(pixels, width, height, originX, 0, originX, height - 1, rgba(99, 112, 141));
    fillCircle(pixels, width, height, originX, originY, 4, rgba(255, 255, 255));
}
} // namespace

int main() {
    // Setup: tạo SDL resources và framebuffer trước khi đi vào event loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 06 - Vector Playground", width, height, SDL_WINDOW_RESIZABLE);
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
    lab::Vec2 vectorA{3.0, 1.5};
    lab::Vec2 vectorB{-1.0, 2.5};
#endif
#if LAB_CHECKPOINT >= 3
    enum class DragTarget { none,
                            vectorA,
                            vectorB };
    DragTarget dragTarget = DragTarget::none;
#endif
#if LAB_CHECKPOINT >= 5
    double scalar = 0.5;
#endif
#if LAB_CHECKPOINT >= 6
    double interpolation = 0.5;
    ViewMode viewMode = ViewMode::normalizeAndLerp;
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
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    vectorA = {3.0, 1.5};
                    vectorB = {-1.0, 2.5};
#if LAB_CHECKPOINT >= 5
                    scalar = 0.5;
#endif
#if LAB_CHECKPOINT >= 6
                    interpolation = 0.5;
                    viewMode = ViewMode::normalizeAndLerp;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_UP) {
                    scalar = std::min(2.0, scalar + 0.1);
                }
                if (event.key.key == SDLK_DOWN) {
                    scalar = std::max(-2.0, scalar - 0.1);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_RIGHT) {
                    interpolation = std::min(1.0, interpolation + 0.05);
                }
                if (event.key.key == SDLK_LEFT) {
                    interpolation = std::max(0.0, interpolation - 0.05);
                }
                if (!event.key.repeat && event.key.key == SDLK_1) {
                    viewMode = ViewMode::basic;
                }
                if (!event.key.repeat && event.key.key == SDLK_2) {
                    viewMode = ViewMode::addSubtract;
                }
                if (!event.key.repeat && event.key.key == SDLK_3) {
                    viewMode = ViewMode::scalarAndDistance;
                }
                if (!event.key.repeat && event.key.key == SDLK_4) {
                    viewMode = ViewMode::normalizeAndLerp;
                }
                if (!event.key.repeat && event.key.key == SDLK_0) {
                    viewMode = ViewMode::all;
                }
#endif
            }

            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                std::vector<std::uint32_t> newPixels(
                    std::size_t(newWidth) * std::size_t(newHeight),
                    rgba(11, 16, 32)
                );
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
                pixels = std::move(newPixels);
                SDL_DestroyTexture(texture);
                texture = newTexture;
                width = newWidth;
                height = newHeight;
            }

#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::Vec2 mouseScreen{event.button.x, event.button.y};
                const lab::Vec2 endpointA = worldToScreen(vectorA, width, height);
                const lab::Vec2 endpointB = worldToScreen(vectorB, width, height);
                const double distanceToA = lab::distance(mouseScreen, endpointA);
                const double distanceToB = lab::distance(mouseScreen, endpointB);
                constexpr double handleRadius = 14.0;

                if (distanceToA <= handleRadius || distanceToB <= handleRadius) {
                    dragTarget = DragTarget::vectorB;
                    if (distanceToA <= distanceToB) {
                        dragTarget = DragTarget::vectorA;
                    }
                    if (!SDL_CaptureMouse(true)) {
                        std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragTarget != DragTarget::none) {
                const lab::Vec2 mouseScreen{event.motion.x, event.motion.y};
                const lab::Vec2 mouseWorld = screenToWorld(mouseScreen, width, height);
                if (dragTarget == DragTarget::vectorA) {
                    vectorA = mouseWorld;
                } else {
                    vectorB = mouseWorld;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragTarget = DragTarget::none;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragTarget = DragTarget::none;
                SDL_CaptureMouse(false);
            }
#endif
        }

        if (!running) {
            break;
        }

        drawBoard(pixels, width, height);

#if LAB_CHECKPOINT >= 1
        const lab::Vec2 origin = worldToScreen({}, width, height);
        const lab::Vec2 endpointA = worldToScreen(vectorA, width, height);
        const lab::Vec2 endpointB = worldToScreen(vectorB, width, height);
#if LAB_CHECKPOINT >= 2
        drawArrow(pixels, width, height, origin, endpointA, rgba(83, 240, 174));
        drawArrow(pixels, width, height, origin, endpointB, rgba(132, 169, 255));
#else
        drawScreenLine(pixels, width, height, origin, endpointA, rgba(83, 240, 174));
        drawScreenLine(pixels, width, height, origin, endpointB, rgba(132, 169, 255));
#endif
        fillCircle(pixels, width, height, int(std::lround(endpointA.x)), int(std::lround(endpointA.y)), 6, rgba(83, 240, 174));
        fillCircle(pixels, width, height, int(std::lround(endpointB.x)), int(std::lround(endpointB.y)), 6, rgba(132, 169, 255));

#if LAB_CHECKPOINT >= 4
        // Mọi phép cộng/trừ đều diễn ra trong world space trước khi đổi sang pixel.
        const lab::Vec2 vectorSum = vectorA + vectorB;
        const lab::Vec2 vectorDifference = vectorA - vectorB;
        const lab::Vec2 sumScreen = worldToScreen(vectorSum, width, height);
        const lab::Vec2 differenceScreen = worldToScreen(vectorDifference, width, height);
#if LAB_CHECKPOINT >= 6
        if (viewMode == ViewMode::addSubtract || viewMode == ViewMode::all) {
            drawArrow(pixels, width, height, origin, sumScreen, rgba(255, 180, 84));
            drawArrow(pixels, width, height, origin, differenceScreen, rgba(255, 107, 107));
            drawScreenLine(pixels, width, height, endpointA, sumScreen, rgba(75, 88, 117));
            drawScreenLine(pixels, width, height, endpointB, sumScreen, rgba(75, 88, 117));
            drawArrow(pixels, width, height, endpointB, endpointA, rgba(174, 91, 104));
        }
#else
        drawArrow(pixels, width, height, origin, sumScreen, rgba(255, 180, 84));
        drawArrow(pixels, width, height, origin, differenceScreen, rgba(255, 107, 107));
        drawScreenLine(pixels, width, height, endpointA, sumScreen, rgba(75, 88, 117));
        drawScreenLine(pixels, width, height, endpointB, sumScreen, rgba(75, 88, 117));
        drawArrow(pixels, width, height, endpointB, endpointA, rgba(174, 91, 104));
#endif
#endif

#if LAB_CHECKPOINT >= 5
        // scaledA là vector từ gốc; distanceAB là số đo của đoạn nối hai endpoint.
        const lab::Vec2 scaledA = vectorA * scalar;
        const lab::Vec2 scaledScreen = worldToScreen(scaledA, width, height);
        const double distanceAB = lab::distance(vectorA, vectorB);
#if LAB_CHECKPOINT >= 6
        if (viewMode == ViewMode::scalarAndDistance || viewMode == ViewMode::all) {
            drawScreenLine(pixels, width, height, endpointA, endpointB, rgba(126, 139, 166));
            drawArrow(pixels, width, height, origin, scaledScreen, rgba(198, 120, 255));
        }
#else
        drawScreenLine(pixels, width, height, endpointA, endpointB, rgba(126, 139, 166));
        drawArrow(pixels, width, height, origin, scaledScreen, rgba(198, 120, 255));
#endif
#endif

#if LAB_CHECKPOINT >= 6
        // Vector đơn vị và điểm nội suy được tính lại từ trạng thái hiện tại ở mỗi frame.
        const lab::Vec2 unitA = lab::normalize(vectorA);
        const lab::Vec2 unitScreen = worldToScreen(unitA, width, height);
        const lab::Vec2 interpolated = lab::lerp(vectorA, vectorB, interpolation);
        const lab::Vec2 interpolatedScreen = worldToScreen(interpolated, width, height);
        if (viewMode == ViewMode::normalizeAndLerp || viewMode == ViewMode::all) {
            drawScreenLine(pixels, width, height, endpointA, endpointB, rgba(75, 116, 128));
            drawArrow(pixels, width, height, origin, unitScreen, rgba(255, 255, 255));
            fillCircle(
                pixels,
                width,
                height,
                int(std::lround(interpolatedScreen.x)),
                int(std::lround(interpolatedScreen.y)),
                5,
                rgba(255, 226, 108)
            );
        }
#endif

        char title[260]{};
#if LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "View %s | A green | B blue | d(A,B) %.3f | scalar %.1f | t %.2f | |normalize(A)| %.3f | keys 1-4, 0",
            viewName(viewMode),
            distanceAB,
            scalar,
            interpolation,
            lab::length(unitA)
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "A(%.2f, %.2f) | B(%.2f, %.2f) | |A| %.3f | |B| %.3f | distance(A,B) %.3f | scalar %.1f",
            vectorA.x,
            vectorA.y,
            vectorB.x,
            vectorB.y,
            lab::length(vectorA),
            lab::length(vectorB),
            distanceAB,
            scalar
        );
#elif LAB_CHECKPOINT >= 4
        std::snprintf(
            title,
            sizeof(title),
            "A(%.2f, %.2f) | B(%.2f, %.2f) | A+B(%.2f, %.2f) | A-B(%.2f, %.2f)",
            vectorA.x,
            vectorA.y,
            vectorB.x,
            vectorB.y,
            vectorSum.x,
            vectorSum.y,
            vectorDifference.x,
            vectorDifference.y
        );
#else
        std::snprintf(
            title,
            sizeof(title),
            "A(%.2f, %.2f) | B(%.2f, %.2f)",
            vectorA.x,
            vectorA.y,
            vectorB.x,
            vectorB.y
        );
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

    // Cleanup theo thứ tự ngược với lúc tạo tài nguyên.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();

    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
