#include <SDL3/SDL.h>

#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
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
    drawLine(pixels, width, height, width / 2, 0, width / 2, height - 1, rgba(57, 70, 98));
    drawLine(pixels, width, height, 0, height / 2, width - 1, height / 2, rgba(57, 70, 98));
}

#if LAB_CHECKPOINT >= 1
void drawVertexMarkers(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::ProjectedCube& cube
) {
    for (std::size_t index = 0; index < cube.vertices.size(); ++index) {
        const lab::ProjectionResult& vertex = cube.vertices[index];
        if (vertex.status != lab::ProjectionStatus::Visible) {
            continue;
        }
        const int x = int(std::lround(vertex.screen.x));
        const int y = int(std::lround(vertex.screen.y));
        std::uint32_t color = rgba(92, 236, 185);
        if (index < 4) {
            color = rgba(255, 190, 92);
        }
        fillCircle(pixels, width, height, x, y, 5, color);
    }
}
#endif

#if LAB_CHECKPOINT >= 2
void drawFlatEdges(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::ProjectedCube& cube
) {
    for (const lab::Edge edge : lab::kCubeEdges) {
        if (!lab::isProjectedEdgeVisible(cube, edge)) {
            continue;
        }
        const lab::Vec2 from = cube.vertices[edge.from].screen;
        const lab::Vec2 to = cube.vertices[edge.to].screen;
        drawLine(
            pixels,
            width,
            height,
            int(std::lround(from.x)),
            int(std::lround(from.y)),
            int(std::lround(to.x)),
            int(std::lround(to.y)),
            rgba(132, 169, 255)
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 3
const char* orderLabel(lab::RotationOrder order) {
    if (order == lab::RotationOrder::Xyz) {
        return "XYZ";
    }
    return "ZYX";
}
#endif

#if LAB_CHECKPOINT >= 4
std::uint8_t lerpByte(std::uint8_t from, std::uint8_t to, double amount) {
    const double clamped = std::clamp(amount, 0.0, 1.0);
    return std::uint8_t(std::lround(double(from) + (double(to) - double(from)) * clamped));
}

std::uint32_t depthColor(double depthFactor, bool depthCue) {
    if (!depthCue) {
        return rgba(132, 169, 255);
    }
    return rgba(
        lerpByte(54, 168, depthFactor),
        lerpByte(72, 236, depthFactor),
        lerpByte(112, 255, depthFactor)
    );
}

void drawDepthEdges(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::ProjectedCube& cube,
    const lab::VisibleEdgeList& visibleEdges,
    bool depthCue
) {
    for (std::size_t itemIndex = 0; itemIndex < visibleEdges.count; ++itemIndex) {
        const lab::VisibleEdge item = visibleEdges.items[itemIndex];
        const lab::Edge edge = lab::kCubeEdges[item.edgeIndex];
        const lab::Vec2 from = cube.vertices[edge.from].screen;
        const lab::Vec2 to = cube.vertices[edge.to].screen;
        drawLine(
            pixels,
            width,
            height,
            int(std::lround(from.x)),
            int(std::lround(from.y)),
            int(std::lround(to.x)),
            int(std::lround(to.y)),
            depthColor(item.depthFactor, depthCue)
        );
    }
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL, cửa sổ và framebuffer CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 13 - Wireframe Cube",
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

    // Camera và model state sống lâu hơn một frame; geometry local luôn được giữ riêng.
    const lab::Camera3D camera{{0.0, 0.0, 0.0}};
    const lab::PerspectiveLens lens{60.0 * lab::kPi / 180.0};
#if LAB_CHECKPOINT >= 1
    constexpr double nearPlane = 0.5;
    constexpr double halfExtent = 1.2;
    lab::Vec3 modelPosition{0.0, 0.0, 6.0};
#endif
#if LAB_CHECKPOINT >= 3
    const lab::CubeVertices localVertices = lab::makeCubeVertices(halfExtent);
    lab::EulerAngles angles{18.0 * lab::kPi / 180.0, 28.0 * lab::kPi / 180.0, 0.0};
    lab::RotationOrder order = lab::RotationOrder::Xyz;
#endif
#if LAB_CHECKPOINT >= 4
    bool depthCue = true;
#endif
#if LAB_CHECKPOINT >= 5
    bool showVertices = true;
    bool dragging = false;
    bool paused = true;
    const lab::EulerAngles angularVelocity{0.28, 0.45, 0.18};
    Uint64 previousTicks = SDL_GetTicksNS();
#endif
    bool running = true;
    bool failed = false;

    // PHẦN 2: Nhận input, cập nhật state rồi dựng một frame mới.
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
                if (event.key.key == SDLK_LEFT) {
                    modelPosition.x -= 0.1;
                }
                if (event.key.key == SDLK_RIGHT) {
                    modelPosition.x += 0.1;
                }
                if (event.key.key == SDLK_DOWN) {
                    modelPosition.y -= 0.1;
                }
                if (event.key.key == SDLK_UP) {
                    modelPosition.y += 0.1;
                }
                if (event.key.key == SDLK_PAGEDOWN) {
                    modelPosition.z -= 0.1;
                }
                if (event.key.key == SDLK_PAGEUP) {
                    modelPosition.z += 0.1;
                }
                if (event.key.key == SDLK_W) {
                    angles.pitch += 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_S) {
                    angles.pitch -= 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_A) {
                    angles.yaw -= 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_D) {
                    angles.yaw += 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_Q) {
                    angles.roll -= 5.0 * lab::kPi / 180.0;
                }
                if (event.key.key == SDLK_E) {
                    angles.roll += 5.0 * lab::kPi / 180.0;
                }
                if (!event.key.repeat && event.key.key == SDLK_O) {
                    if (order == lab::RotationOrder::Xyz) {
                        order = lab::RotationOrder::Zyx;
                    } else {
                        order = lab::RotationOrder::Xyz;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (!event.key.repeat && event.key.key == SDLK_C) {
                    depthCue = !depthCue;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_V) {
                    showVertices = !showVertices;
                }
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_PERIOD && paused) {
                    angles = lab::advanceEulerAngles(angles, angularVelocity, 1.0 / 60.0);
                }
#endif
                if (!event.key.repeat && event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 1
                    modelPosition = {0.0, 0.0, 6.0};
#endif
#if LAB_CHECKPOINT >= 3
                    angles = {18.0 * lab::kPi / 180.0, 28.0 * lab::kPi / 180.0, 0.0};
                    order = lab::RotationOrder::Xyz;
#endif
#if LAB_CHECKPOINT >= 4
                    depthCue = true;
#endif
#if LAB_CHECKPOINT >= 5
                    showVertices = true;
                    paused = true;
#endif
                }
            }

#if LAB_CHECKPOINT >= 5
            // Capture chỉ bật dragging khi thành công và luôn được nhả ở mọi đường kết thúc.
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                } else {
                    dragging = true;
                }
                paused = true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST && dragging) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                angles = lab::applyMouseDrag(angles, event.motion.xrel, event.motion.yrel, 0.008);
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

#if LAB_CHECKPOINT >= 5
        const Uint64 currentTicks = SDL_GetTicksNS();
        const double deltaTime = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
        if (!paused) {
            angles = lab::advanceEulerAngles(angles, angularVelocity, deltaTime);
        }
#endif

        // Pipeline mỗi frame: local vertices -> rotated -> world -> projection cache -> edge list.
        clearCanvas(pixels, width, height);
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 3
        const lab::CubeVertices rotatedLocal = lab::rotateCube(localVertices, angles, order);
        const lab::CubeVertices worldVertices = lab::translateCube(rotatedLocal, modelPosition);
#else
        const lab::CubeVertices worldVertices = lab::makeCubeVertices(halfExtent, modelPosition);
#endif
        const lab::ProjectedCube projected = lab::projectCube(
            worldVertices,
            camera,
            lens,
            nearPlane,
            width,
            height
        );
#if LAB_CHECKPOINT >= 4
        const lab::VisibleEdgeList visibleEdges = lab::visibleEdgesBackToFront(projected);
        drawDepthEdges(pixels, width, height, projected, visibleEdges, depthCue);
#elif LAB_CHECKPOINT >= 2
        drawFlatEdges(pixels, width, height, projected);
#endif
#if LAB_CHECKPOINT >= 5
        if (showVertices) {
            drawVertexMarkers(pixels, width, height, projected);
        }
#else
        drawVertexMarkers(pixels, width, height, projected);
#endif

        char title[512]{};
#if LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P13 | %zu projections | %zu/12 edges | edge err %.2e | round-trip %.2e | %s | mouse Space . C V O R",
            projected.projectionCount,
            visibleEdges.count,
            lab::maximumCubeEdgeLengthError(localVertices, rotatedLocal),
            lab::cubeRotationRoundTripError(localVertices, angles, order),
            orderLabel(order)
        );
#elif LAB_CHECKPOINT >= 4
        const char* depthCueLabel = "off";
        if (depthCue) {
            depthCueLabel = "on";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P13 | %zu visible edges | depth cue %s | %s | C/O/R",
            visibleEdges.count,
            depthCueLabel,
            orderLabel(order)
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P13 | pitch %.1f yaw %.1f roll %.1f | %s | WASD/QE/O/R",
            angles.pitch * 180.0 / lab::kPi,
            angles.yaw * 180.0 / lab::kPi,
            angles.roll * 180.0 / lab::kPi,
            orderLabel(order)
        );
#elif LAB_CHECKPOINT >= 2
        const char* topologyLabel = "invalid";
        if (lab::hasValidCubeTopology()) {
            topologyLabel = "valid";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P13 | 8 cached projections | %zu/12 visible edges | topology %s",
            lab::countVisibleEdges(projected),
            topologyLabel
        );
#else
        std::snprintf(
            title,
            sizeof(title),
            "P13 | %zu/8 visible vertices | %zu projection calls",
            lab::countVisibleVertices(projected),
            projected.projectionCount
        );
#endif
        SDL_SetWindowTitle(window, title);
#endif

        // Upload framebuffer trong RAM lên texture rồi present đúng một lần.
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

    // Giải phóng tài nguyên theo thứ tự ngược lúc tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
