#include <SDL3/SDL.h>

#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <vector>

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;

std::uint32_t rgba(
    std::uint8_t red,
    std::uint8_t green,
    std::uint8_t blue,
    std::uint8_t alpha = 255
) {
    return (std::uint32_t(red) << 24U) | (std::uint32_t(green) << 16U) |
        (std::uint32_t(blue) << 8U) | std::uint32_t(alpha);
}

void putPixel(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x,
    int y,
    std::uint32_t color
) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
}

void clearCanvas(std::vector<std::uint32_t>& pixels) {
    std::fill(pixels.begin(), pixels.end(), rgba(8, 13, 25));
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
    int deltaX = std::abs(x1 - x0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    int deltaY = -std::abs(y1 - y0);
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

void drawRectangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int left,
    int top,
    int right,
    int bottom,
    std::uint32_t color
) {
    drawLine(pixels, width, height, left, top, right, top, color);
    drawLine(pixels, width, height, right, top, right, bottom, color);
    drawLine(pixels, width, height, right, bottom, left, bottom, color);
    drawLine(pixels, width, height, left, bottom, left, top, color);
}

void fillSquare(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int radius,
    std::uint32_t color
) {
    for (int y = centerY - radius; y <= centerY + radius; ++y) {
        for (int x = centerX - radius; x <= centerX + radius; ++x) {
            putPixel(pixels, width, height, x, y, color);
        }
    }
}

#if LAB_CHECKPOINT >= 1
void drawTriangleOutline(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Triangle2& triangle,
    std::uint32_t color
) {
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(triangle.a.x)),
        int(std::lround(triangle.a.y)),
        int(std::lround(triangle.b.x)),
        int(std::lround(triangle.b.y)),
        color
    );
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(triangle.b.x)),
        int(std::lround(triangle.b.y)),
        int(std::lround(triangle.c.x)),
        int(std::lround(triangle.c.y)),
        color
    );
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(triangle.c.x)),
        int(std::lround(triangle.c.y)),
        int(std::lround(triangle.a.x)),
        int(std::lround(triangle.a.y)),
        color
    );
}

void drawVertexHandles(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Triangle2& triangle
) {
    const std::uint32_t colors[3] = {
        rgba(255, 105, 112),
        rgba(83, 240, 174),
        rgba(100, 155, 255),
    };
    for (int index = 0; index < 3; ++index) {
        const lab::Vec2 vertex = lab::vertexAt(triangle, index);
        fillSquare(
            pixels,
            width,
            height,
            int(std::lround(vertex.x)),
            int(std::lround(vertex.y)),
            5,
            colors[index]
        );
    }
}

lab::Vec2& editableVertex(lab::Triangle2& triangle, int index) {
    if (index == 0) {
        return triangle.a;
    }
    if (index == 1) {
        return triangle.b;
    }
    return triangle.c;
}

int nearestVertex(const lab::Triangle2& triangle, double x, double y) {
    int nearest = -1;
    double bestDistance = 18.0;
    for (int index = 0; index < 3; ++index) {
        const lab::Vec2 vertex = lab::vertexAt(triangle, index);
        const double distance = std::hypot(vertex.x - x, vertex.y - y);
        if (distance < bestDistance) {
            bestDistance = distance;
            nearest = index;
        }
    }
    return nearest;
}
#endif

#if LAB_CHECKPOINT >= 2
void drawBounds(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::IntRect bounds
) {
    if (lab::isEmpty(bounds)) {
        return;
    }
    drawRectangle(
        pixels,
        width,
        height,
        bounds.minX,
        bounds.minY,
        bounds.maxX,
        bounds.maxY,
        rgba(255, 190, 82)
    );
}
#endif

#if LAB_CHECKPOINT >= 4
void drawSampleMarker(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 position,
    bool inside
) {
    std::uint32_t color = rgba(255, 105, 112);
    if (inside) {
        color = rgba(83, 240, 174);
    }
    const int x = int(std::floor(position.x));
    const int y = int(std::floor(position.y));
    drawRectangle(pixels, width, height, x - 4, y - 4, x + 5, y + 5, color);
    putPixel(pixels, width, height, x, y, rgba(255, 255, 255));
}
#endif

#if LAB_CHECKPOINT >= 6
const char* fillRuleName(lab::FillRule rule) {
    if (rule == lab::FillRule::TopLeft) {
        return "top-left";
    }
    return "inclusive";
}

void applyPreset(
    int preset,
    int width,
    int height,
    lab::Triangle2& first,
    lab::Triangle2& second,
    bool& drawSecond
) {
    first = lab::makeDefaultTriangle(width, height);
    second = {};
    drawSecond = false;

    if (preset == 2) {
        std::swap(first.b, first.c);
    }
    if (preset == 3) {
        first.b = {
            first.a.x + double(width) * 0.22,
            first.a.y + double(height) * 0.18,
        };
        first.c = {
            first.a.x + double(width) * 0.44,
            first.a.y + double(height) * 0.36,
        };
    }
    if (preset == 4) {
        first = {
            {-double(width) * 0.14, double(height) * 0.28},
            {double(width) * 0.72, -double(height) * 0.09},
            {double(width) * 0.54, double(height) * 0.88},
        };
    }
    if (preset == 5) {
        const double left = double(width) * 0.22;
        const double right = double(width) * 0.78;
        const double top = double(height) * 0.2;
        const double bottom = double(height) * 0.82;
        first = {{left, top}, {right, top}, {left, bottom}};
        second = {{right, top}, {right, bottom}, {left, bottom}};
        drawSecond = true;
    }
}
#endif

#if LAB_CHECKPOINT >= 7
std::uint32_t packColor(lab::Color color) {
    return rgba(color.red, color.green, color.blue, color.alpha);
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL, cửa sổ và CPU framebuffer trước khi thêm rasterizer.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 16 - Triangle Rasterizer",
        kInitialWidth,
        kInitialHeight,
        SDL_WINDOW_RESIZABLE
    );
    SDL_Renderer* renderer = nullptr;
    if (window) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    if (!window || !renderer) {
        std::cerr << "Window or renderer creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    std::vector<std::uint32_t> pixels(
        std::size_t(width) * std::size_t(height),
        rgba(8, 13, 25)
    );
    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
    if (!texture) {
        std::cerr << "Texture creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

#if LAB_CHECKPOINT >= 1
    lab::Triangle2 triangle = lab::makeDefaultTriangle(width, height);
    lab::Triangle2 secondTriangle{};
    int draggedVertex = -1;
#endif
#if LAB_CHECKPOINT >= 3
    lab::Vec2 samplePosition{double(width) * 0.5 + 0.5, double(height) * 0.5 + 0.5};
#endif
#if LAB_CHECKPOINT >= 6
    int preset = 1;
    bool drawSecondTriangle = false;
    lab::FillRule fillRule = lab::FillRule::TopLeft;
#endif
#if LAB_CHECKPOINT >= 7
    bool barycentricColor = true;
    bool paused = false;
    std::size_t candidateLimit = std::numeric_limits<std::size_t>::max();
#endif
    bool running = true;
    bool failed = false;

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

#if LAB_CHECKPOINT >= 6
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_5) {
                    preset = int(event.key.key - SDLK_0);
                    applyPreset(
                        preset,
                        width,
                        height,
                        triangle,
                        secondTriangle,
                        drawSecondTriangle
                    );
#if LAB_CHECKPOINT >= 7
                    candidateLimit = std::numeric_limits<std::size_t>::max();
                    paused = false;
#endif
                }
                if (!event.key.repeat && event.key.key == SDLK_T) {
                    if (fillRule == lab::FillRule::TopLeft) {
                        fillRule = lab::FillRule::Inclusive;
                    } else {
                        fillRule = lab::FillRule::TopLeft;
                    }
                }
#endif

#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_C) {
                    barycentricColor = !barycentricColor;
                }
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    if (paused) {
                        candidateLimit = 0;
                    } else {
                        candidateLimit = std::numeric_limits<std::size_t>::max();
                    }
                }
                if (paused && event.key.key == SDLK_N) {
                    ++candidateLimit;
                }
                if (paused && event.key.key == SDLK_UP) {
                    candidateLimit += 100;
                }
                if (paused && event.key.key == SDLK_DOWN) {
                    if (candidateLimit >= 100) {
                        candidateLimit -= 100;
                    } else {
                        candidateLimit = 0;
                    }
                }
#endif

#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 6
                    applyPreset(
                        preset,
                        width,
                        height,
                        triangle,
                        secondTriangle,
                        drawSecondTriangle
                    );
#else
                    triangle = lab::makeDefaultTriangle(width, height);
#endif
#if LAB_CHECKPOINT >= 7
                    candidateLimit = std::numeric_limits<std::size_t>::max();
                    paused = false;
#endif
                }
#endif
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                draggedVertex = nearestVertex(triangle, event.button.x, event.button.y);
                if (draggedVertex >= 0) {
                    SDL_CaptureMouse(true);
                }
#if LAB_CHECKPOINT >= 3
                else {
                    samplePosition = {event.button.x, event.button.y};
                }
#endif
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggedVertex >= 0) {
                lab::Vec2& vertex = editableVertex(triangle, draggedVertex);
                vertex.x = std::clamp(double(event.motion.x), 0.0, double(width - 1));
                vertex.y = std::clamp(double(event.motion.y), 0.0, double(height - 1));
#if LAB_CHECKPOINT >= 6
                preset = 0;
                drawSecondTriangle = false;
#endif
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                draggedVertex = -1;
                SDL_CaptureMouse(false);
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

                pixels.assign(std::size_t(newWidth) * std::size_t(newHeight), rgba(8, 13, 25));
                SDL_DestroyTexture(texture);
                texture = newTexture;
                width = newWidth;
                height = newHeight;
#if LAB_CHECKPOINT >= 6
                int resizedPreset = preset;
                if (resizedPreset == 0) {
                    resizedPreset = 1;
                }
                applyPreset(
                    resizedPreset,
                    width,
                    height,
                    triangle,
                    secondTriangle,
                    drawSecondTriangle
                );
#elif LAB_CHECKPOINT >= 1
                triangle = lab::makeDefaultTriangle(width, height);
#endif
#if LAB_CHECKPOINT >= 3
                samplePosition = {double(width) * 0.5 + 0.5, double(height) * 0.5 + 0.5};
#endif
            }
        }

        if (!running) {
            break;
        }

        clearCanvas(pixels);

#if LAB_CHECKPOINT >= 2
        const lab::IntRect bounds = lab::triangleBounds(triangle, width, height);
#endif

#if LAB_CHECKPOINT >= 5
        std::vector<std::uint8_t> coverage(
            std::size_t(width) * std::size_t(height),
            std::uint8_t(0)
        );
        lab::FillRule activeRule = lab::FillRule::Inclusive;
#if LAB_CHECKPOINT >= 6
        activeRule = fillRule;
#endif
        std::size_t activeLimit = std::numeric_limits<std::size_t>::max();
#if LAB_CHECKPOINT >= 7
        activeLimit = candidateLimit;
#endif

        const lab::RasterStats primaryStats = lab::rasterizeTriangle(
            triangle,
            width,
            height,
            activeRule,
            activeLimit,
            [&](int x, int y, lab::Barycentric weights) {
                const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
                ++coverage[index];
                std::uint32_t color = rgba(93, 132, 214);
#if LAB_CHECKPOINT >= 7
                if (barycentricColor) {
                    const lab::Color vertexA{255, 105, 112, 255};
                    const lab::Color vertexB{83, 240, 174, 255};
                    const lab::Color vertexC{100, 155, 255, 255};
                    color = packColor(lab::interpolateColor(vertexA, vertexB, vertexC, weights));
                }
#else
                static_cast<void>(weights);
#endif
                putPixel(pixels, width, height, x, y, color);
            }
        );

        lab::RasterStats secondaryStats{};
#if LAB_CHECKPOINT >= 6
        if (drawSecondTriangle) {
            secondaryStats = lab::rasterizeTriangle(
                secondTriangle,
                width,
                height,
                activeRule,
                [&](int x, int y, lab::Barycentric weights) {
                    static_cast<void>(weights);
                    const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
                    ++coverage[index];
                    std::uint32_t color = rgba(153, 108, 220);
                    if (coverage[index] > 1) {
                        color = rgba(255, 72, 96);
                    }
                    putPixel(pixels, width, height, x, y, color);
                }
            );
        }
#endif
#endif

#if LAB_CHECKPOINT >= 2
        drawBounds(pixels, width, height, bounds);
#endif
#if LAB_CHECKPOINT >= 1
        drawTriangleOutline(pixels, width, height, triangle, rgba(225, 232, 248));
#if LAB_CHECKPOINT >= 6
        if (drawSecondTriangle) {
            drawTriangleOutline(pixels, width, height, secondTriangle, rgba(194, 174, 240));
        }
#endif
        drawVertexHandles(pixels, width, height, triangle);
#endif

#if LAB_CHECKPOINT >= 4
        const lab::Vec2 center = {
            std::floor(samplePosition.x) + 0.5,
            std::floor(samplePosition.y) + 0.5,
        };
        lab::FillRule sampleRule = lab::FillRule::Inclusive;
#if LAB_CHECKPOINT >= 6
        sampleRule = fillRule;
#endif
        const lab::CoverageSample selectedSample = lab::sampleTriangle(
            triangle,
            center,
            sampleRule
        );
        drawSampleMarker(pixels, width, height, center, selectedSample.inside);
#endif

        char title[768]{};
#if LAB_CHECKPOINT >= 7
        std::size_t overlapCount = 0;
        for (std::uint8_t count : coverage) {
            if (count > 1) {
                ++overlapCount;
            }
        }
        std::snprintf(
            title,
            sizeof(title),
            "P16 | %s | tested %zu/%zu | covered %zu+%zu | overlap %zu | bary sum error %.2e | 1-5 T C Space N Up/Down R",
            fillRuleName(fillRule),
            primaryStats.testedCount,
            primaryStats.candidateCount,
            primaryStats.coveredCount,
            secondaryStats.coveredCount,
            overlapCount,
            lab::barycentricSumError(selectedSample.barycentric)
        );
#elif LAB_CHECKPOINT >= 6
        std::size_t overlapCount = 0;
        for (std::uint8_t count : coverage) {
            if (count > 1) {
                ++overlapCount;
            }
        }
        std::snprintf(
            title,
            sizeof(title),
            "P16 | %s | covered %zu+%zu | overlap %zu | 1-5 preset, T rule, drag A/B/C, R",
            fillRuleName(fillRule),
            primaryStats.coveredCount,
            secondaryStats.coveredCount,
            overlapCount
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P16 | raster loop tested %zu/%zu candidates | covered %zu pixels | drag A/B/C, R",
            primaryStats.testedCount,
            primaryStats.candidateCount,
            primaryStats.coveredCount
        );
#elif LAB_CHECKPOINT >= 4
        const char* sampleStatus = "outside";
        if (selectedSample.inside) {
            sampleStatus = "inside";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P16 | pixel center (%.1f %.1f) | edges %.1f %.1f %.1f | %s",
            center.x,
            center.y,
            selectedSample.edgeAB,
            selectedSample.edgeBC,
            selectedSample.edgeCA,
            sampleStatus
        );
#elif LAB_CHECKPOINT >= 3
        const double edgeAB = lab::orient2D(triangle.a, triangle.b, samplePosition);
        const double edgeBC = lab::orient2D(triangle.b, triangle.c, samplePosition);
        const double edgeCA = lab::orient2D(triangle.c, triangle.a, samplePosition);
        std::snprintf(
            title,
            sizeof(title),
            "P16 | area2 %.1f | edge signs %.1f %.1f %.1f | click sample, drag vertex",
            lab::signedDoubleArea(triangle),
            edgeAB,
            edgeBC,
            edgeCA
        );
#elif LAB_CHECKPOINT >= 2
        std::snprintf(
            title,
            sizeof(title),
            "P16 | bounds [%d,%d]..[%d,%d] | %zu candidate pixels | drag A/B/C",
            bounds.minX,
            bounds.minY,
            bounds.maxX,
            bounds.maxY,
            lab::candidatePixelCount(bounds)
        );
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P16 | three screen vertices + wireframe | drag A/B/C, R");
#else
        std::snprintf(title, sizeof(title), "Project 16 starter | SDL3 CPU framebuffer");
#endif
        SDL_SetWindowTitle(window, title);

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

    // Giải phóng texture trước renderer và window đã tạo ra nó.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
