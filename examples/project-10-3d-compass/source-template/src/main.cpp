#include <SDL3/SDL.h>

#include "lab.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <vector>

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;
constexpr double kDiagramScale = 92.0;

std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
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
    const int dx = std::abs(x1 - x0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    const int dy = -std::abs(y1 - y0);
    int stepY = -1;
    if (y0 < y1) {
        stepY = 1;
    }
    int error = dx + dy;

    while (true) {
        putPixel(pixels, width, height, x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int doubledError = error * 2;
        if (doubledError >= dy) {
            error += dy;
            x0 += stepX;
        }
        if (doubledError <= dx) {
            error += dx;
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
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            if (x * x + y * y <= radius * radius) {
                putPixel(pixels, width, height, centerX + x, centerY + y, color);
            }
        }
    }
}

void clearCanvas(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
    for (int x = 0; x < width; x += 40) {
        drawLine(pixels, width, height, x, 0, x, height - 1, rgba(24, 35, 58));
    }
    for (int y = 0; y < height; y += 40) {
        drawLine(pixels, width, height, 0, y, width - 1, y, rgba(24, 35, 58));
    }
}

#if LAB_CHECKPOINT >= 1
lab::Vec2 toScreen(lab::Vec3 point, int width, int height) {
    const lab::Vec2 diagram = lab::projectIsometric(point);
    return {
        width * 0.5 + diagram.x * kDiagramScale,
        height * 0.5 - diagram.y * kDiagramScale,
    };
}

void drawWorldLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec3 start,
    lab::Vec3 end,
    std::uint32_t color
) {
    const lab::Vec2 a = toScreen(start, width, height);
    const lab::Vec2 b = toScreen(end, width, height);
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(a.x)),
        int(std::lround(a.y)),
        int(std::lround(b.x)),
        int(std::lround(b.y)),
        color
    );
}

void drawAxes(std::vector<std::uint32_t>& pixels, int width, int height) {
    const lab::Vec3 origin{};
    drawWorldLine(pixels, width, height, origin, {2.2, 0.0, 0.0}, rgba(255, 107, 107));
    drawWorldLine(pixels, width, height, origin, {0.0, 2.2, 0.0}, rgba(83, 240, 174));
    drawWorldLine(pixels, width, height, origin, {0.0, 0.0, 2.2}, rgba(132, 169, 255));

    const lab::Vec2 screenOrigin = toScreen(origin, width, height);
    fillCircle(
        pixels,
        width,
        height,
        int(std::lround(screenOrigin.x)),
        int(std::lround(screenOrigin.y)),
        5,
        rgba(255, 226, 108)
    );
}
#endif

#if LAB_CHECKPOINT >= 2
lab::Triangle defaultTriangle() {
    return {
        {-1.25, -0.75, 0.25},
        {1.20, -0.45, -0.35},
        {0.10, 1.15, 0.75},
    };
}

lab::Vec3& selectedVertex(lab::Triangle& triangle, int selected) {
    if (selected == 0) {
        return triangle.a;
    }
    if (selected == 1) {
        return triangle.b;
    }
    return triangle.c;
}

const lab::Vec3& vertexAt(const lab::Triangle& triangle, int index) {
    if (index == 0) {
        return triangle.a;
    }
    if (index == 1) {
        return triangle.b;
    }
    return triangle.c;
}

int nearestVertex(const lab::Triangle& triangle, float mouseX, float mouseY, int width, int height) {
    int nearest = -1;
    double nearestSquared = 15.0 * 15.0;
    for (int index = 0; index < 3; ++index) {
        const lab::Vec2 screen = toScreen(vertexAt(triangle, index), width, height);
        const double dx = screen.x - mouseX;
        const double dy = screen.y - mouseY;
        const double distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= nearestSquared) {
            nearest = index;
            nearestSquared = distanceSquared;
        }
    }
    return nearest;
}

void drawTriangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Triangle& triangle,
    int selected
) {
    drawWorldLine(pixels, width, height, triangle.a, triangle.b, rgba(255, 180, 84));
    drawWorldLine(pixels, width, height, triangle.a, triangle.c, rgba(83, 240, 174));
    drawWorldLine(pixels, width, height, triangle.b, triangle.c, rgba(214, 221, 239));

    for (int index = 0; index < 3; ++index) {
        const lab::Vec2 screen = toScreen(vertexAt(triangle, index), width, height);
        int radius = 6;
        std::uint32_t color = rgba(247, 249, 255);
        if (index == selected) {
            radius = 8;
            color = rgba(255, 226, 108);
        }
        fillCircle(
            pixels,
            width,
            height,
            int(std::lround(screen.x)),
            int(std::lround(screen.y)),
            radius,
            color
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 3
void drawNormal(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Triangle& triangle
) {
    const lab::Vec3 centroid = lab::triangleCentroid(triangle);
    const lab::Vec3 rawNormal = lab::triangleRawNormal(triangle);
#if LAB_CHECKPOINT >= 4
    const lab::Vec3 displayNormal = lab::scale(lab::triangleUnitNormal(triangle), 1.35);
#else
    const lab::Vec3 displayNormal = lab::scale(rawNormal, 0.22);
#endif
    const lab::Vec3 endpoint = lab::add(centroid, displayNormal);
    drawWorldLine(pixels, width, height, centroid, endpoint, rgba(196, 132, 255));
    const lab::Vec2 screenEndpoint = toScreen(endpoint, width, height);
    fillCircle(
        pixels,
        width,
        height,
        int(std::lround(screenEndpoint.x)),
        int(std::lround(screenEndpoint.y)),
        6,
        rgba(196, 132, 255)
    );
}
#endif

#if LAB_CHECKPOINT >= 6
lab::Triangle presetTriangle(int preset) {
    if (preset == 1) {
        return {{0.0, 0.0, 0.0}, {3.0, 0.0, 0.0}, {0.0, 2.0, 0.0}};
    }
    if (preset == 2) {
        return {{-1.5, -0.5, 0.0}, {0.0, 0.0, 0.0}, {1.5, 0.5, 0.0}};
    }
    if (preset == 3) {
        return {{-1.5, -0.5, 0.0}, {0.0, 0.0, 0.0}, {1.5, 0.5001, 0.0}};
    }
    return defaultTriangle();
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL và các tài nguyên cần để trình bày framebuffer CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 10 - 3D Compass",
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
        rgba(11, 16, 32)
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

    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 2
    lab::Triangle triangle = defaultTriangle();
    int selected = 0;
    bool dragging = false;
#endif
#if LAB_CHECKPOINT >= 6
    int preset = 0;
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
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3) {
                    selected = int(event.key.key - SDLK_1);
                }
                lab::Vec3& vertex = selectedVertex(triangle, selected);
                if (event.key.key == SDLK_LEFT) {
                    vertex.x -= 0.1;
                }
                if (event.key.key == SDLK_RIGHT) {
                    vertex.x += 0.1;
                }
                if (event.key.key == SDLK_DOWN) {
                    vertex.y -= 0.1;
                }
                if (event.key.key == SDLK_UP) {
                    vertex.y += 0.1;
                }
                if (event.key.key == SDLK_Q) {
                    vertex.z -= 0.1;
                }
                if (event.key.key == SDLK_E) {
                    vertex.z += 0.1;
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    triangle = defaultTriangle();
                    selected = 0;
#if LAB_CHECKPOINT >= 6
                    preset = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_F) {
                    triangle = lab::reverseWinding(triangle);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_P) {
                    preset = (preset + 1) % 4;
                    triangle = presetTriangle(preset);
                    selected = 2;
                }
#endif
            }

#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const int hit = nearestVertex(triangle, event.button.x, event.button.y, width, height);
                if (hit >= 0) {
                    selected = hit;
                    dragging = true;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                lab::Vec3& vertex = selectedVertex(triangle, selected);
                const double deltaX = event.motion.xrel / (kDiagramScale * 0.86602540378443864676);
                vertex.x += deltaX;
                vertex.y -= event.motion.yrel / kDiagramScale + deltaX * 0.5;
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
        drawAxes(pixels, width, height);
#endif
#if LAB_CHECKPOINT >= 2
        drawTriangle(pixels, width, height, triangle, selected);
#endif
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT >= 6
        if (!lab::isDegenerate(triangle)) {
            drawNormal(pixels, width, height, triangle);
        }
#else
        drawNormal(pixels, width, height, triangle);
#endif
#endif

#if LAB_CHECKPOINT >= 1
        char title[384]{};
#if LAB_CHECKPOINT >= 6
        const lab::Vec3 normal = lab::triangleRawNormal(triangle);
        const bool degenerate = lab::isDegenerate(triangle);
        const double facing = lab::facingAmount(triangle, {1.0, -1.0, 1.0});
        const char* validityLabel = "valid";
        if (degenerate) {
            validityLabel = "degenerate";
        }
        const char* facingLabel = "back";
        if (facing >= 0.0) {
            facingLabel = "front";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P10 | N(%.2f, %.2f, %.2f) | area %.3f | ortho err %.2e | %s | %s | 1-3/arrows/QE/F/P/R",
            normal.x,
            normal.y,
            normal.z,
            lab::triangleArea(triangle),
            lab::orthogonalityError(triangle),
            validityLabel,
            facingLabel
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P10 | area %.3f | facing %.3f | F flips winding | 1-3/arrows/QE/R",
            lab::triangleArea(triangle),
            lab::facingAmount(triangle, {1.0, -1.0, 1.0})
        );
#elif LAB_CHECKPOINT >= 4
        const lab::Vec3 normal = lab::triangleUnitNormal(triangle);
        std::snprintf(
            title,
            sizeof(title),
            "P10 | unit N(%.2f, %.2f, %.2f) | area %.3f | 1-3/arrows/QE/R",
            normal.x,
            normal.y,
            normal.z,
            lab::triangleArea(triangle)
        );
#elif LAB_CHECKPOINT >= 3
        const lab::Vec3 normal = lab::triangleRawNormal(triangle);
        std::snprintf(
            title,
            sizeof(title),
            "P10 | raw N(%.2f, %.2f, %.2f) | 1-3/arrows/QE/R",
            normal.x,
            normal.y,
            normal.z
        );
#elif LAB_CHECKPOINT >= 2
        const auto [edgeAB, edgeAC] = lab::triangleEdges(triangle);
        std::snprintf(
            title,
            sizeof(title),
            "P10 | selected %c | AB(%.1f,%.1f,%.1f) | AC(%.1f,%.1f,%.1f) | drag/arrows/QE/R",
            char('A' + selected),
            edgeAB.x,
            edgeAB.y,
            edgeAB.z,
            edgeAC.x,
            edgeAC.y,
            edgeAC.z
        );
#else
        std::snprintf(title, sizeof(title), "Project 10 | X red | Y green | Z blue | Escape quits");
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

    // Giải phóng tài nguyên theo thứ tự ngược với lúc tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
