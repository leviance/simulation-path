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
    drawLine(pixels, width, height, width / 2, 0, width / 2, height - 1, rgba(57, 70, 98));
    drawLine(pixels, width, height, 0, height / 2, width - 1, height / 2, rgba(57, 70, 98));
}

#if LAB_CHECKPOINT >= 1
lab::Vec2 previewToScreen(lab::Vec3 point, int width, int height) {
    const lab::Vec2 preview = lab::previewPoint(point, 70.0);
    return {width * 0.5 + preview.x, height * 0.5 - preview.y};
}

void drawPointMarker(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec2 screen,
    int radius
) {
    const int x = int(std::lround(screen.x));
    const int y = int(std::lround(screen.y));
    fillCircle(pixels, width, height, x, y, radius + 4, rgba(255, 180, 84));
    fillCircle(pixels, width, height, x, y, radius, rgba(255, 241, 166));
    drawLine(pixels, width, height, x - radius - 7, y, x + radius + 7, y, rgba(255, 226, 108));
    drawLine(pixels, width, height, x, y - radius - 7, x, y + radius + 7, rgba(255, 226, 108));
}
#endif

#if LAB_CHECKPOINT >= 5
const char* statusLabel(lab::ProjectionStatus status) {
    if (status == lab::ProjectionStatus::Visible) {
        return "visible";
    }
    if (status == lab::ProjectionStatus::BehindCamera) {
        return "behind";
    }
    if (status == lab::ProjectionStatus::BeforeNearPlane) {
        return "before-near";
    }
    return "outside";
}

void applyPreset(
    int preset,
    lab::Vec3& worldPoint,
    const lab::Camera3D& camera,
    double nearPlane
) {
    if (preset == 1) {
        worldPoint = lab::cameraToWorld({0.15, 0.1, nearPlane * 0.5}, camera);
        return;
    }
    if (preset == 2) {
        worldPoint = lab::cameraToWorld({0.0, 0.0, -2.0}, camera);
        return;
    }
    if (preset == 3) {
        worldPoint = lab::cameraToWorld({20.0, 0.0, 5.0}, camera);
        return;
    }
    worldPoint = {1.4, 0.8, 5.0};
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL và framebuffer trước khi đưa projection vào vòng lặp.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 11 - Perspective Point",
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
#if LAB_CHECKPOINT >= 1
    lab::Vec3 worldPoint{1.4, 0.8, 5.0};
#endif
#if LAB_CHECKPOINT >= 2
    lab::Camera3D camera{{0.0, 0.0, 0.0}};
#endif
#if LAB_CHECKPOINT >= 4
    lab::PerspectiveLens lens{60.0 * lab::kPi / 180.0};
#endif
#if LAB_CHECKPOINT >= 5
    double nearPlane = 0.5;
    int preset = 0;
#endif
#if LAB_CHECKPOINT >= 6
    bool paused = false;
    bool dragging = false;
    double elapsed = 0.0;
    Uint64 previousTicks = SDL_GetTicksNS();
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
#if LAB_CHECKPOINT >= 1
                if (event.key.key == SDLK_LEFT) {
                    worldPoint.x -= 0.1;
                }
                if (event.key.key == SDLK_RIGHT) {
                    worldPoint.x += 0.1;
                }
                if (event.key.key == SDLK_DOWN) {
                    worldPoint.y -= 0.1;
                }
                if (event.key.key == SDLK_UP) {
                    worldPoint.y += 0.1;
                }
                if (event.key.key == SDLK_Q) {
                    worldPoint.z -= 0.1;
                }
                if (event.key.key == SDLK_E) {
                    worldPoint.z += 0.1;
                }
#if LAB_CHECKPOINT >= 6
                if (
                    event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT ||
                    event.key.key == SDLK_DOWN || event.key.key == SDLK_UP ||
                    event.key.key == SDLK_Q || event.key.key == SDLK_E
                ) {
                    paused = true;
                }
#endif
#endif
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_A) {
                    camera.position.x -= 0.1;
                }
                if (event.key.key == SDLK_D) {
                    camera.position.x += 0.1;
                }
                if (event.key.key == SDLK_S) {
                    camera.position.y -= 0.1;
                }
                if (event.key.key == SDLK_W) {
                    camera.position.y += 0.1;
                }
                if (event.key.key == SDLK_Z) {
                    camera.position.z -= 0.1;
                }
                if (event.key.key == SDLK_X) {
                    camera.position.z += 0.1;
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_LEFTBRACKET) {
                    lens.verticalFovRadians = std::max(
                        25.0 * lab::kPi / 180.0,
                        lens.verticalFovRadians - 2.0 * lab::kPi / 180.0
                    );
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    lens.verticalFovRadians = std::min(
                        120.0 * lab::kPi / 180.0,
                        lens.verticalFovRadians + 2.0 * lab::kPi / 180.0
                    );
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_N) {
                    nearPlane = std::max(0.1, nearPlane - 0.1);
                }
                if (event.key.key == SDLK_M) {
                    nearPlane = std::min(4.0, nearPlane + 0.1);
                }
                if (!event.key.repeat && event.key.key == SDLK_P) {
                    preset = (preset + 1) % 4;
                    applyPreset(preset, worldPoint, camera, nearPlane);
#if LAB_CHECKPOINT >= 6
                    paused = true;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_PERIOD && paused) {
                    elapsed = lab::advanceFlightTime(elapsed, 1.0 / 60.0);
                    worldPoint = lab::flightPoint(elapsed);
                }
#endif
#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    worldPoint = {1.4, 0.8, 5.0};
#if LAB_CHECKPOINT >= 2
                    camera.position = {};
#endif
#if LAB_CHECKPOINT >= 4
                    lens.verticalFovRadians = 60.0 * lab::kPi / 180.0;
#endif
#if LAB_CHECKPOINT >= 5
                    nearPlane = 0.5;
                    preset = 0;
#endif
#if LAB_CHECKPOINT >= 6
                    elapsed = 0.0;
                    paused = true;
#endif
                }
#endif
            }

#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::ProjectionResult projection = lab::projectPerspective(
                    worldPoint,
                    camera,
                    lens,
                    nearPlane,
                    width,
                    height
                );
                if (projection.status == lab::ProjectionStatus::Visible) {
                    dragging = true;
                    paused = true;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const lab::Vec3 currentCameraPoint = lab::worldToCamera(worldPoint, camera);
                const lab::Vec3 draggedCameraPoint = lab::screenToCameraAtDepth(
                    {event.motion.x, event.motion.y},
                    currentCameraPoint.z,
                    lens,
                    width,
                    height
                );
                worldPoint = lab::cameraToWorld(draggedCameraPoint, camera);
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

#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT < 5
        const double minimumDepth = camera.position.z + 0.1;
        if (worldPoint.z < minimumDepth) {
            worldPoint.z = minimumDepth;
        }
#endif
#endif

#if LAB_CHECKPOINT >= 6
        const Uint64 currentTicks = SDL_GetTicksNS();
        const double deltaTime = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
        if (!paused) {
            elapsed = lab::advanceFlightTime(elapsed, deltaTime);
            worldPoint = lab::flightPoint(elapsed);
        }
#endif

        clearCanvas(pixels, width, height);
#if LAB_CHECKPOINT >= 1
        lab::Vec2 screen = previewToScreen(worldPoint, width, height);
        int markerRadius = 7;
#if LAB_CHECKPOINT >= 2
        const lab::Vec3 cameraPoint = lab::worldToCamera(worldPoint, camera);
        screen = previewToScreen(cameraPoint, width, height);
#endif
#if LAB_CHECKPOINT >= 3
        const lab::Vec2 divided = lab::perspectiveDivide(cameraPoint);
        const double previewFocalLength = std::min(width, height) * 0.38;
        screen = {
            width * 0.5 + divided.x * previewFocalLength,
            height * 0.5 - divided.y * previewFocalLength,
        };
        if (cameraPoint.z > 0.0) {
            markerRadius = std::clamp(int(std::lround(34.0 / cameraPoint.z)), 3, 14);
        }
#endif
#if LAB_CHECKPOINT >= 4
        const lab::Vec2 ndc = lab::cameraToNdc(cameraPoint, lens, double(width) / double(height));
        screen = lab::ndcToScreen(ndc, width, height);
#endif
#if LAB_CHECKPOINT >= 5
        const lab::ProjectionResult projection = lab::projectPerspective(
            worldPoint,
            camera,
            lens,
            nearPlane,
            width,
            height
        );
        if (projection.status == lab::ProjectionStatus::Visible) {
            screen = projection.screen;
            drawPointMarker(pixels, width, height, screen, markerRadius);
        }
#else
        drawPointMarker(pixels, width, height, screen, markerRadius);
#endif

        char title[512]{};
#if LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P11 | world(%.2f %.2f %.2f) | camera(%.2f %.2f %.2f) | ndc(%.3f %.3f) | pixel(%.1f %.1f) | %s | err %.2e | Space/./P/R",
            worldPoint.x,
            worldPoint.y,
            worldPoint.z,
            projection.cameraPoint.x,
            projection.cameraPoint.y,
            projection.cameraPoint.z,
            projection.ndc.x,
            projection.ndc.y,
            projection.screen.x,
            projection.screen.y,
            statusLabel(projection.status),
            lab::projectionRoundTripError(worldPoint, camera, lens, width, height)
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P11 | camera(%.2f %.2f %.2f) | near %.2f | ndc(%.3f %.3f) | %s | N/M/P/R",
            projection.cameraPoint.x,
            projection.cameraPoint.y,
            projection.cameraPoint.z,
            nearPlane,
            projection.ndc.x,
            projection.ndc.y,
            statusLabel(projection.status)
        );
#elif LAB_CHECKPOINT >= 4
        std::snprintf(
            title,
            sizeof(title),
            "P11 | camera(%.2f %.2f %.2f) | FOV %.1f deg | NDC(%.3f %.3f) | pixel(%.1f %.1f) | [/]/R",
            cameraPoint.x,
            cameraPoint.y,
            cameraPoint.z,
            lens.verticalFovRadians * 180.0 / lab::kPi,
            ndc.x,
            ndc.y,
            screen.x,
            screen.y
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P11 | camera(%.2f %.2f %.2f) | divide(%.3f %.3f) | arrows/QE, camera WASD/ZX",
            cameraPoint.x,
            cameraPoint.y,
            cameraPoint.z,
            divided.x,
            divided.y
        );
#elif LAB_CHECKPOINT >= 2
        std::snprintf(
            title,
            sizeof(title),
            "P11 | world(%.2f %.2f %.2f) | camera(%.2f %.2f %.2f) | point arrows/QE, camera WASD/ZX",
            worldPoint.x,
            worldPoint.y,
            worldPoint.z,
            cameraPoint.x,
            cameraPoint.y,
            cameraPoint.z
        );
#else
        std::snprintf(
            title,
            sizeof(title),
            "P11 | world point(%.2f %.2f %.2f) | arrows change XY | Q/E change Z | R reset",
            worldPoint.x,
            worldPoint.y,
            worldPoint.z
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
