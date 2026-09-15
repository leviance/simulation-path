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

void clearCanvas(std::vector<std::uint32_t>& pixels) {
    std::fill(pixels.begin(), pixels.end(), rgba(8, 13, 25));
}

void drawCrosshair(std::vector<std::uint32_t>& pixels, int width, int height) {
    const int centerX = width / 2;
    const int centerY = height / 2;
    drawLine(pixels, width, height, centerX - 8, centerY, centerX + 8, centerY, rgba(244, 247, 255));
    drawLine(pixels, width, height, centerX, centerY - 8, centerX, centerY + 8, rgba(244, 247, 255));
}

#if LAB_CHECKPOINT >= 1
std::uint32_t segmentColor(lab::SegmentKind kind) {
    if (kind == lab::SegmentKind::Floor) {
        return rgba(68, 132, 174);
    }
    if (kind == lab::SegmentKind::Ceiling) {
        return rgba(117, 112, 190);
    }
    return rgba(125, 165, 238);
}

#if LAB_CHECKPOINT >= 2
lab::ProjectionResult projectWorldPoint(
    lab::Vec3 worldPoint,
    const lab::FpsCamera& camera,
    const lab::PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
#if LAB_CHECKPOINT >= 3
    const lab::Vec3 cameraPoint = lab::worldToCamera(worldPoint, camera);
#else
    const lab::Vec3 cameraPoint = lab::worldToCameraTranslation(worldPoint, camera);
#endif
    return lab::projectCameraPoint(cameraPoint, lens, nearPlane, width, height);
}
#endif

std::size_t drawRoom(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::RoomGeometry& room,
#if LAB_CHECKPOINT >= 2
    const lab::FpsCamera& camera,
#endif
    const lab::PerspectiveLens& lens,
    double nearPlane
) {
    std::size_t visibleSegments = 0;
    for (const lab::Segment3& segment : room) {
#if LAB_CHECKPOINT >= 2
        const lab::ProjectionResult from = projectWorldPoint(segment.from, camera, lens, nearPlane, width, height);
        const lab::ProjectionResult to = projectWorldPoint(segment.to, camera, lens, nearPlane, width, height);
#else
        const lab::ProjectionResult from = lab::projectCameraPoint(segment.from, lens, nearPlane, width, height);
        const lab::ProjectionResult to = lab::projectCameraPoint(segment.to, lens, nearPlane, width, height);
#endif
        if (from.status != lab::ProjectionStatus::Visible || to.status != lab::ProjectionStatus::Visible) {
            continue;
        }
        drawLine(
            pixels,
            width,
            height,
            int(std::lround(from.screen.x)),
            int(std::lround(from.screen.y)),
            int(std::lround(to.screen.x)),
            int(std::lround(to.screen.y)),
            segmentColor(segment.kind)
        );
        ++visibleSegments;
    }
    return visibleSegments;
}
#endif

#if LAB_CHECKPOINT >= 6
bool setMouseLook(SDL_Window* window, bool enabled, bool& mouseLookActive) {
    if (!SDL_SetWindowRelativeMouseMode(window, enabled)) {
        std::cerr << "Relative mouse mode failed: " << SDL_GetError() << '\n';
        return false;
    }
    mouseLookActive = enabled;
    return true;
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
        "Project 14 - FPS Camera Room",
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
    const lab::PerspectiveLens lens{60.0 * lab::kPi / 180.0};
    constexpr double nearPlane = 0.35;
    const lab::RoomBounds roomBounds{};
    const lab::RoomGeometry room = lab::makeRoomGeometry(roomBounds, 2.0);
#endif
#if LAB_CHECKPOINT >= 2
    const lab::FpsCamera initialCamera{};
    lab::FpsCamera camera = initialCamera;
#endif
#if LAB_CHECKPOINT >= 5
    Uint64 previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 6
    bool mouseLookActive = false;
#endif
#if LAB_CHECKPOINT >= 7
    bool paused = false;
#endif
    bool running = true;
    bool failed = false;

    // Nhận event rời rạc trước, sau đó đọc keyboard state và cập nhật camera một lần mỗi frame.
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
#if LAB_CHECKPOINT >= 6
                    if (mouseLookActive) {
                        setMouseLook(window, false, mouseLookActive);
                    } else {
                        running = false;
                    }
#else
                    running = false;
#endif
                }

#if LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT < 5
                if (event.key.key == SDLK_LEFT) {
                    camera = lab::moveCameraWorld(camera, -0.2, 0.0);
                }
                if (event.key.key == SDLK_RIGHT) {
                    camera = lab::moveCameraWorld(camera, 0.2, 0.0);
                }
                if (event.key.key == SDLK_UP) {
                    camera = lab::moveCameraWorld(camera, 0.0, 0.2);
                }
                if (event.key.key == SDLK_DOWN) {
                    camera = lab::moveCameraWorld(camera, 0.0, -0.2);
                }
#endif
#endif

#if LAB_CHECKPOINT >= 3
                constexpr double lookStep = 3.0 * lab::kPi / 180.0;
                if (event.key.key == SDLK_J) {
                    camera = lab::applyKeyboardLook(camera, -lookStep, 0.0);
                }
                if (event.key.key == SDLK_L) {
                    camera = lab::applyKeyboardLook(camera, lookStep, 0.0);
                }
                if (event.key.key == SDLK_I) {
                    camera = lab::applyKeyboardLook(camera, 0.0, lookStep);
                }
                if (event.key.key == SDLK_K) {
                    camera = lab::applyKeyboardLook(camera, 0.0, -lookStep);
                }
#endif

#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
#endif

#if LAB_CHECKPOINT >= 2
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    camera = initialCamera;
#if LAB_CHECKPOINT >= 7
                    paused = false;
#endif
                }
#endif
            }

#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                setMouseLook(window, true, mouseLookActive);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && mouseLookActive) {
                camera = lab::applyMouseLook(camera, event.motion.xrel, event.motion.yrel, 0.0025);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST && mouseLookActive) {
                setMouseLook(window, false, mouseLookActive);
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
            }
        }

        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 5
        const Uint64 currentTicks = SDL_GetTicksNS();
        const double deltaTime = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
        const bool* keyboard = SDL_GetKeyboardState(nullptr);
        const lab::MoveInput movement = lab::makeMoveInput(
            keyboard[SDL_SCANCODE_A],
            keyboard[SDL_SCANCODE_D],
            keyboard[SDL_SCANCODE_S],
            keyboard[SDL_SCANCODE_W]
        );
#if LAB_CHECKPOINT >= 7
        if (!paused) {
            camera = lab::advanceCameraInRoom(camera, movement, 3.5, deltaTime, roomBounds, 1.6, 0.35);
        }
#else
        camera = lab::advanceCamera(camera, movement, 3.5, deltaTime);
#endif
#endif

        // Room luôn giữ world coordinate; chỉ view transform đọc camera pose hiện tại.
        clearCanvas(pixels);
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
        const std::size_t visibleSegments = drawRoom(pixels, width, height, room, camera, lens, nearPlane);
#else
        const std::size_t visibleSegments = drawRoom(pixels, width, height, room, lens, nearPlane);
#endif
#endif
        drawCrosshair(pixels, width, height);

        char title[512]{};
#if LAB_CHECKPOINT >= 7
        std::snprintf(
            title,
            sizeof(title),
            "P14 | pos (%.2f %.2f %.2f) | yaw %.1f pitch %.1f | %zu/%zu segments | basis %.2e | round-trip %.2e | WASD click Esc Space R",
            camera.position.x,
            camera.position.y,
            camera.position.z,
            camera.yaw * 180.0 / lab::kPi,
            camera.pitch * 180.0 / lab::kPi,
            visibleSegments,
            room.size(),
            lab::basisError(camera),
            lab::viewRoundTripError({2.0, 1.0, 12.0}, camera)
        );
#elif LAB_CHECKPOINT >= 6
        const char* mouseMode = "released";
        if (mouseLookActive) {
            mouseMode = "relative";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P14 | yaw %.1f pitch %.1f | %zu segments | mouse %s | click/Esc WASD IJKL R",
            camera.yaw * 180.0 / lab::kPi,
            camera.pitch * 180.0 / lab::kPi,
            visibleSegments,
            mouseMode
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "P14 | pos (%.2f %.2f %.2f) | yaw %.1f | %zu segments | WASD IJKL R",
            camera.position.x,
            camera.position.y,
            camera.position.z,
            camera.yaw * 180.0 / lab::kPi,
            visibleSegments
        );
#elif LAB_CHECKPOINT >= 4
        const lab::CameraBasis basis = lab::cameraBasis(camera);
        std::snprintf(
            title,
            sizeof(title),
            "P14 | forward (%.2f %.2f %.2f) | %zu segments | IJKL/arrows/R",
            basis.forward.x,
            basis.forward.y,
            basis.forward.z,
            visibleSegments
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P14 | yaw %.1f pitch %.1f | %zu segments | IJKL/arrows/R",
            camera.yaw * 180.0 / lab::kPi,
            camera.pitch * 180.0 / lab::kPi,
            visibleSegments
        );
#elif LAB_CHECKPOINT >= 2
        std::snprintf(
            title,
            sizeof(title),
            "P14 | camera (%.2f %.2f %.2f) | %zu segments | arrows/R",
            camera.position.x,
            camera.position.y,
            camera.position.z,
            visibleSegments
        );
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P14 | %zu/%zu visible room segments", visibleSegments, room.size());
#else
        std::snprintf(title, sizeof(title), "P14 starter | framebuffer + crosshair");
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

    // Giải phóng relative mouse mode trước các tài nguyên SDL khác.
#if LAB_CHECKPOINT >= 6
    if (mouseLookActive) {
        setMouseLook(window, false, mouseLookActive);
    }
#endif
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
