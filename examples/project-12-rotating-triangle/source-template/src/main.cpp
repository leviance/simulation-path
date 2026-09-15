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
void drawProjectedTriangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TriangleProjection& projection
) {
    if (!projection.visible) {
        return;
    }

    const int ax = int(std::lround(projection.a.screen.x));
    const int ay = int(std::lround(projection.a.screen.y));
    const int bx = int(std::lround(projection.b.screen.x));
    const int by = int(std::lround(projection.b.screen.y));
    const int cx = int(std::lround(projection.c.screen.x));
    const int cy = int(std::lround(projection.c.screen.y));
    drawLine(pixels, width, height, ax, ay, bx, by, rgba(255, 180, 84));
    drawLine(pixels, width, height, bx, by, cx, cy, rgba(83, 240, 174));
    drawLine(pixels, width, height, cx, cy, ax, ay, rgba(132, 169, 255));
    fillCircle(pixels, width, height, ax, ay, 7, rgba(255, 226, 108));
    fillCircle(pixels, width, height, bx, by, 7, rgba(247, 249, 255));
    fillCircle(pixels, width, height, cx, cy, 7, rgba(196, 132, 255));
}
#endif

#if LAB_CHECKPOINT >= 2
void drawPivot(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::Vec3 modelPosition,
    const lab::Camera3D& camera,
    const lab::PerspectiveLens& lens,
    double nearPlane
) {
    const lab::ProjectionResult pivot = lab::projectPerspective(
        modelPosition,
        camera,
        lens,
        nearPlane,
        width,
        height
    );
    if (pivot.status != lab::ProjectionStatus::Visible) {
        return;
    }
    const int x = int(std::lround(pivot.screen.x));
    const int y = int(std::lround(pivot.screen.y));
    drawLine(pixels, width, height, x - 8, y, x + 8, y, rgba(255, 107, 107));
    drawLine(pixels, width, height, x, y - 8, x, y + 8, rgba(255, 107, 107));
}
#endif

#if LAB_CHECKPOINT >= 4
const char* orderLabel(lab::RotationOrder order) {
    if (order == lab::RotationOrder::Xyz) {
        return "XYZ";
    }
    return "ZYX";
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL, cửa sổ và framebuffer.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 12 - Rotating Triangle",
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

    // Camera, model và trạng thái điều khiển sống lâu hơn một frame.
    const lab::Camera3D camera{{0.0, 0.0, 0.0}};
    const lab::PerspectiveLens lens{60.0 * lab::kPi / 180.0};
#if LAB_CHECKPOINT >= 1
    const double nearPlane = 0.5;
#endif
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 2
    const lab::Triangle3 localTriangle = lab::toLocalTriangle(lab::defaultWorldTriangle());
    lab::Vec3 modelPosition = lab::triangleCentroid(lab::defaultWorldTriangle());
#endif
#if LAB_CHECKPOINT >= 4
    lab::EulerAngles angles{};
    lab::RotationOrder order = lab::RotationOrder::Xyz;
#elif LAB_CHECKPOINT >= 3
    double pitchRadians = 0.0;
#endif
#if LAB_CHECKPOINT >= 5
    bool dragging = false;
#endif
#if LAB_CHECKPOINT >= 6
    bool paused = true;
    const lab::EulerAngles angularVelocity{0.35, 0.55, 0.20};
    Uint64 previousTicks = SDL_GetTicksNS();
#endif

    // PHẦN 2: Nhận input, cập nhật trạng thái và vẽ một frame mới.
    while (running) {
        // Đọc hết event đang chờ trước khi tính frame tiếp theo.
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
#endif
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_W) {
#if LAB_CHECKPOINT >= 4
                    angles.pitch += 5.0 * lab::kPi / 180.0;
#else
                    pitchRadians += 5.0 * lab::kPi / 180.0;
#endif
                }
                if (event.key.key == SDLK_S) {
#if LAB_CHECKPOINT >= 4
                    angles.pitch -= 5.0 * lab::kPi / 180.0;
#else
                    pitchRadians -= 5.0 * lab::kPi / 180.0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 4
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
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_PERIOD && paused) {
                    angles = lab::advanceEulerAngles(angles, angularVelocity, 1.0 / 60.0);
                }
#endif
                if (!event.key.repeat && event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 2
                    modelPosition = lab::triangleCentroid(lab::defaultWorldTriangle());
#endif
#if LAB_CHECKPOINT >= 4
                    angles = {};
                    order = lab::RotationOrder::Xyz;
#elif LAB_CHECKPOINT >= 3
                    pitchRadians = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
                    paused = true;
#endif
                }
            }

#if LAB_CHECKPOINT >= 5
            // Mouse capture giữ cho thao tác kéo còn liền mạch khi pointer ra ngoài cửa sổ.
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                } else {
                    dragging = true;
                }
#if LAB_CHECKPOINT >= 6
                paused = true;
#endif
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
                angles = lab::applyMouseDrag(
                    angles,
                    event.motion.xrel,
                    event.motion.yrel,
                    0.008
                );
            }
#endif

            // Framebuffer phụ thuộc kích thước pixel thật, nên texture cũng phải được tạo lại.
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

#if LAB_CHECKPOINT >= 6
        // SDL_GetTicksNS trả nanosecond; hàm toán của ta nhận deltaTime theo giây.
        const Uint64 currentTicks = SDL_GetTicksNS();
        const double deltaTime = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
        if (!paused) {
            angles = lab::advanceEulerAngles(angles, angularVelocity, deltaTime);
        }
#endif

        // Pipeline mỗi frame: local -> rotated local -> world -> camera/NDC/screen -> pixel.
        clearCanvas(pixels, width, height);
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
        lab::Triangle3 rotatedLocal = localTriangle;
#if LAB_CHECKPOINT >= 4
        rotatedLocal = lab::rotateTriangle(localTriangle, angles, order);
#elif LAB_CHECKPOINT >= 3
        rotatedLocal = lab::rotateTriangleX(localTriangle, pitchRadians);
#endif
        const lab::Triangle3 worldTriangle = lab::translateTriangle(rotatedLocal, modelPosition);
#else
        const lab::Triangle3 worldTriangle = lab::defaultWorldTriangle();
#endif
        const lab::TriangleProjection projection = lab::projectTriangle(
            worldTriangle,
            camera,
            lens,
            nearPlane,
            width,
            height
        );
        drawProjectedTriangle(pixels, width, height, projection);
        const char* visibilityLabel = "hidden";
        if (projection.visible) {
            visibilityLabel = "visible";
        }
#if LAB_CHECKPOINT >= 2
        drawPivot(pixels, width, height, modelPosition, camera, lens, nearPlane);
#endif

        char title[512]{};
#if LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P12 | pitch %.1f yaw %.1f roll %.1f | %s | edge err %.2e | round-trip %.2e | %s | mouse/Space/./O/R",
            angles.pitch * 180.0 / lab::kPi,
            angles.yaw * 180.0 / lab::kPi,
            angles.roll * 180.0 / lab::kPi,
            orderLabel(order),
            lab::maximumEdgeLengthError(localTriangle, rotatedLocal),
            lab::rotationRoundTripError(localTriangle.a, angles, order),
            visibilityLabel
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P12 | mouse drag | pitch %.1f yaw %.1f roll %.1f | %s | %s | O/R",
            angles.pitch * 180.0 / lab::kPi,
            angles.yaw * 180.0 / lab::kPi,
            angles.roll * 180.0 / lab::kPi,
            orderLabel(order),
            visibilityLabel
        );
#elif LAB_CHECKPOINT >= 4
        std::snprintf(
            title,
            sizeof(title),
            "P12 | pitch %.1f yaw %.1f roll %.1f | order %s | WASD/QE/O/R",
            angles.pitch * 180.0 / lab::kPi,
            angles.yaw * 180.0 / lab::kPi,
            angles.roll * 180.0 / lab::kPi,
            orderLabel(order)
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P12 | rotate X %.1f deg | W/S | arrows/PageUp/PageDown/R",
            pitchRadians * 180.0 / lab::kPi
        );
#elif LAB_CHECKPOINT >= 2
        std::snprintf(
            title,
            sizeof(title),
            "P12 | model position (%.2f %.2f %.2f) | arrows/PageUp/PageDown/R",
            modelPosition.x,
            modelPosition.y,
            modelPosition.z
        );
#else
        std::snprintf(title, sizeof(title), "P12 | three projected vertices | triangle visible");
#endif
        SDL_SetWindowTitle(window, title);
#endif

        // Upload framebuffer trong RAM lên texture, vẽ texture rồi mới present ra cửa sổ.
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
