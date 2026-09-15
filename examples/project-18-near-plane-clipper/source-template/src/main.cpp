#include <SDL3/SDL.h>

#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <vector>

namespace {
constexpr int kInitialWidth = 1120;
constexpr int kInitialHeight = 680;

#if LAB_CHECKPOINT >= 1
constexpr double kPi = 3.14159265358979323846;
constexpr double kNearPlane = 1.0;
constexpr double kVerticalFov = 60.0 * kPi / 180.0;
#endif

// Framebuffer helpers stay deliberately small so the clipping steps remain visible in main.
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
// The five presets exercise every possible near-plane topology, including a grazing vertex.
lab::Triangle3 presetTriangle(int preset) {
    if (preset == 1) {
        return {
            {{-1.0, -0.8, 2.1}, {255.0, 92.0, 106.0}},
            {{1.1, -0.7, 3.2}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 2.6}, {93.0, 145.0, 255.0}},
        };
    }
    if (preset == 2) {
        return lab::makeDefaultTriangle();
    }
    if (preset == 3) {
        return {
            {{-1.1, -0.8, 0.35}, {255.0, 92.0, 106.0}},
            {{1.1, -0.7, 0.55}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 2.8}, {93.0, 145.0, 255.0}},
        };
    }
    if (preset == 4) {
        return {
            {{-1.0, -0.8, 0.25}, {255.0, 92.0, 106.0}},
            {{1.0, -0.7, 0.45}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 0.65}, {93.0, 145.0, 255.0}},
        };
    }
    return {
        {{-1.0, -0.8, kNearPlane}, {255.0, 92.0, 106.0}},
        {{1.0, -0.7, 2.8}, {78.0, 232.0, 163.0}},
        {{0.0, 1.0, 1.0}, {93.0, 145.0, 255.0}},
    };
}

lab::Vec2 sideViewPoint(const lab::ClipVertex& vertex, int splitX, int height) {
    const double left = 44.0;
    const double right = double(splitX - 24);
    const double top = 64.0;
    const double bottom = double(height - 44);
    const double normalizedDepth = (vertex.position.z + 0.5) / 6.0;
    const double normalizedHorizontal = (vertex.position.x + 1.8) / 3.6;
    return {
        left + normalizedDepth * (right - left),
        bottom - normalizedHorizontal * (bottom - top),
    };
}

std::uint32_t vertexColor(int index) {
    if (index == 0) {
        return rgba(255, 92, 106);
    }
    if (index == 1) {
        return rgba(78, 232, 163);
    }
    return rgba(93, 145, 255);
}

void drawSideTriangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX,
    const lab::Triangle3& triangle
) {
    lab::Vec2 points[3]{};
    for (int index = 0; index < 3; ++index) {
        points[index] = sideViewPoint(lab::vertexAt(triangle, index), splitX, height);
    }

    for (int index = 0; index < 3; ++index) {
        const int next = (index + 1) % 3;
        drawLine(
            pixels,
            width,
            height,
            int(std::lround(points[index].x)),
            int(std::lround(points[index].y)),
            int(std::lround(points[next].x)),
            int(std::lround(points[next].y)),
            rgba(129, 145, 181)
        );
    }

    for (int index = 0; index < 3; ++index) {
        std::uint32_t color = vertexColor(index);
#if LAB_CHECKPOINT >= 2
        if (!lab::isInsideNearPlane(lab::vertexAt(triangle, index), kNearPlane)) {
            color = rgba(255, 177, 76);
        }
#endif
        fillSquare(
            pixels,
            width,
            height,
            int(std::lround(points[index].x)),
            int(std::lround(points[index].y)),
            5,
            color
        );
    }
}

void drawNearPlane(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX
) {
    lab::ClipVertex marker{};
    marker.position.z = kNearPlane;
    const int nearX = int(std::lround(sideViewPoint(marker, splitX, height).x));
    for (int y = 54; y < height - 34; y += 8) {
        drawLine(pixels, width, height, nearX, y, nearX, std::min(y + 4, height - 34), rgba(255, 190, 82));
    }
}
#endif

#if LAB_CHECKPOINT >= 3
void drawIntersections(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX,
    const lab::Triangle3& triangle
) {
    for (int index = 0; index < 3; ++index) {
        const lab::ClipVertex start = lab::vertexAt(triangle, index);
        const lab::ClipVertex end = lab::vertexAt(triangle, (index + 1) % 3);
        const bool startInside = lab::isInsideNearPlane(start, kNearPlane);
        const bool endInside = lab::isInsideNearPlane(end, kNearPlane);
        if (startInside == endInside) {
            continue;
        }
        const lab::ClipVertex intersection = lab::intersectNearPlane(start, end, kNearPlane);
        const lab::Vec2 point = sideViewPoint(intersection, splitX, height);
        fillSquare(
            pixels,
            width,
            height,
            int(std::lround(point.x)),
            int(std::lround(point.y)),
            7,
            rgba(247, 249, 255)
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 4
void drawClippedPolygon(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX,
    const lab::ClippedPolygon& polygon
) {
    if (polygon.count < 2) {
        return;
    }
    for (std::size_t index = 0; index < polygon.count; ++index) {
        const lab::Vec2 start = sideViewPoint(polygon.vertices[index], splitX, height);
        const lab::Vec2 end = sideViewPoint(
            polygon.vertices[(index + 1) % polygon.count],
            splitX,
            height
        );
        drawLine(
            pixels,
            width,
            height,
            int(std::lround(start.x)),
            int(std::lround(start.y)),
            int(std::lround(end.x)),
            int(std::lround(end.y)),
            rgba(83, 240, 174)
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 5
void drawTriangleFan(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX,
    const lab::TriangleBatch& batch
) {
    for (std::size_t triangleIndex = 0; triangleIndex < batch.count; ++triangleIndex) {
        const lab::Triangle3& triangle = batch.triangles[triangleIndex];
        for (int edge = 0; edge < 3; ++edge) {
            const lab::Vec2 start = sideViewPoint(lab::vertexAt(triangle, edge), splitX, height);
            const lab::Vec2 end = sideViewPoint(
                lab::vertexAt(triangle, (edge + 1) % 3),
                splitX,
                height
            );
            drawLine(
                pixels,
                width,
                height,
                int(std::lround(start.x)),
                int(std::lround(start.y)),
                int(std::lround(end.x)),
                int(std::lround(end.y)),
                rgba(147, 108, 220)
            );
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 6
// Each triangle produced by the clipper returns to the Project 16 raster path unchanged.
std::uint8_t toByte(double value) {
    return std::uint8_t(std::lround(std::clamp(value, 0.0, 255.0)));
}

lab::RasterStats drawViewport(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int splitX,
    const lab::TriangleBatch& batch
) {
    const lab::Viewport viewport{splitX + 34, 54, width - splitX - 58, height - 92};
    drawRectangle(
        pixels,
        width,
        height,
        viewport.left,
        viewport.top,
        viewport.left + viewport.width,
        viewport.top + viewport.height,
        rgba(53, 66, 96)
    );

    lab::RasterStats total{};
    for (std::size_t index = 0; index < batch.count; ++index) {
        const auto projected = lab::projectTriangle(
            batch.triangles[index],
            kVerticalFov,
            viewport,
            kNearPlane
        );
        if (!projected) {
            continue;
        }
        const lab::RasterStats stats = lab::rasterizeScreenTriangle(
            *projected,
            width,
            height,
            [&](int x, int y, lab::Color color) {
                putPixel(
                    pixels,
                    width,
                    height,
                    x,
                    y,
                    rgba(toByte(color.red), toByte(color.green), toByte(color.blue))
                );
            }
        );
        total.candidateCount += stats.candidateCount;
        total.coveredCount += stats.coveredCount;
    }
    return total;
}
#endif

SDL_Texture* createTexture(SDL_Renderer* renderer, int width, int height) {
    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
    if (texture) {
        SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST);
    }
    return texture;
}
} // namespace

int main() {
    // Setup creates and validates one SDL resource at a time before entering the frame loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 18 - Near-plane Clipper",
        kInitialWidth,
        kInitialHeight,
        SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY
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

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_GetWindowSizeInPixels(window, &width, &height);
    SDL_Texture* texture = createTexture(renderer, width, height);
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    std::vector<std::uint32_t> pixels(std::size_t(width) * std::size_t(height));
    bool running = true;

#if LAB_CHECKPOINT >= 1
    int preset = 2;
    lab::Triangle3 baseTriangle = presetTriangle(preset);
    double depthOffset = 0.0;
    double sweepDirection = 1.0;
    bool paused = true;
    bool dragging = false;
    bool useClipper = true;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                width = std::max(1, event.window.data1);
                height = std::max(1, event.window.data2);
                SDL_DestroyTexture(texture);
                texture = createTexture(renderer, width, height);
                if (!texture) {
                    std::cerr << "Texture resize failed: " << SDL_GetError() << '\n';
                    running = false;
                    break;
                }
                pixels.assign(std::size_t(width) * std::size_t(height), 0U);
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const SDL_Keycode key = event.key.key;
                if (key >= SDLK_1 && key <= SDLK_5) {
                    preset = int(key - SDLK_0);
                    baseTriangle = presetTriangle(preset);
                    depthOffset = 0.0;
                    paused = true;
                }
                if (key == SDLK_A) {
                    depthOffset -= 0.12;
                    paused = true;
                }
                if (key == SDLK_D) {
                    depthOffset += 0.12;
                    paused = true;
                }
                if (key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (key == SDLK_N && paused) {
                    depthOffset += 0.08 * sweepDirection;
                }
                if (key == SDLK_V) {
                    useClipper = !useClipper;
                }
                if (key == SDLK_R) {
                    baseTriangle = presetTriangle(preset);
                    depthOffset = 0.0;
                    sweepDirection = 1.0;
                    paused = true;
                    useClipper = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const int splitX = width / 2;
                if (event.button.x < float(splitX)) {
                    dragging = true;
                    paused = true;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                depthOffset += double(event.motion.xrel) * 0.012;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

        clearCanvas(pixels);
        const int splitX = width / 2;
        drawLine(pixels, width, height, splitX, 28, splitX, height - 28, rgba(42, 54, 82));

#if LAB_CHECKPOINT >= 1
        const std::uint64_t currentTicks = SDL_GetTicks();
        double deltaTime = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        deltaTime = std::clamp(deltaTime, 0.0, 0.05);
        if (!paused) {
            depthOffset += sweepDirection * deltaTime * 0.75;
            if (depthOffset > 1.7 || depthOffset < -1.2) {
                sweepDirection *= -1.0;
                depthOffset = std::clamp(depthOffset, -1.2, 1.7);
            }
        }

        const lab::Triangle3 triangle = lab::moveAlongDepth(baseTriangle, depthOffset);
        drawNearPlane(pixels, width, height, splitX);
        drawSideTriangle(pixels, width, height, splitX, triangle);
#endif

#if LAB_CHECKPOINT >= 2
        const lab::NearPlaneCounts counts = lab::classifyTriangle(triangle, kNearPlane);
#endif

#if LAB_CHECKPOINT >= 3
        drawIntersections(pixels, width, height, splitX, triangle);
#endif

#if LAB_CHECKPOINT >= 4
        const lab::ClippedPolygon polygon = lab::clipTriangleToNearPlane(triangle, kNearPlane);
        drawClippedPolygon(pixels, width, height, splitX, polygon);
#endif

#if LAB_CHECKPOINT >= 5
        lab::TriangleBatch batch = lab::triangulateFan(polygon);
        drawTriangleFan(pixels, width, height, splitX, batch);
#endif

#if LAB_CHECKPOINT >= 6
        if (!useClipper && counts.outside > 0) {
            batch = {};
        }
        const lab::RasterStats rasterStats = drawViewport(pixels, width, height, splitX, batch);
#endif

#if LAB_CHECKPOINT >= 7
        const double violation = lab::maximumNearPlaneViolation(polygon, kNearPlane);
#endif

#if LAB_CHECKPOINT >= 1
        char title[320]{};
#if LAB_CHECKPOINT >= 7
        const char* policyName = "discard-whole";
        if (useClipper) {
            policyName = "clip";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P18 | preset %d | z offset %.2f | in/out %d/%d | polygon %zu | triangles %zu | pixels %zu | violation %.1e | %s | 1-5 A/D Space N V R",
            preset,
            depthOffset,
            counts.inside,
            counts.outside,
            polygon.count,
            batch.count,
            rasterStats.coveredCount,
            violation,
            policyName
        );
#elif LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P18 checkpoint 6 | polygon %zu | triangles %zu | covered %zu",
            polygon.count,
            batch.count,
            rasterStats.coveredCount
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "P18 checkpoint 5 | fan triangles %zu", batch.count);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P18 checkpoint 4 | clipped vertices %zu", polygon.count);
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "P18 checkpoint 3 | intersection points");
#elif LAB_CHECKPOINT >= 2
        std::snprintf(
            title,
            sizeof(title),
            "P18 checkpoint 2 | inside %d | outside %d | on plane %d",
            counts.inside,
            counts.outside,
            counts.onPlane
        );
#else
        std::snprintf(title, sizeof(title), "P18 checkpoint 1 | triangle and near plane");
#endif
        SDL_SetWindowTitle(window, title);
#endif

        if (!SDL_UpdateTexture(
                texture,
                nullptr,
                pixels.data(),
                width * int(sizeof(std::uint32_t))
            )) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            running = false;
        }
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    // Cleanup runs in reverse ownership order after the event loop finishes.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
