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
constexpr int kInitialWidth = 1040;
constexpr int kInitialHeight = 680;

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

void clearCanvas(std::vector<std::uint32_t>& pixels) {
    std::fill(pixels.begin(), pixels.end(), rgba(8, 13, 25));
}

void drawPipelineRail(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int selectedStage,
    int availableStage
) {
    constexpr int stageCount = 6;
    const int left = 72;
    const int right = std::max(left + 1, width - 72);
    const int y = 92;
    drawLine(pixels, width, height, left, y, right, y, rgba(55, 70, 102));

    for (int stage = 0; stage < stageCount; ++stage) {
        const int x = left + stage * (right - left) / (stageCount - 1);
        std::uint32_t color = rgba(48, 59, 84);
        if (stage <= availableStage) {
            color = rgba(104, 145, 224);
        }
        if (stage == selectedStage) {
            color = rgba(255, 190, 82);
        }
        fillSquare(pixels, width, height, x, y, 8, color);
        drawRectangle(pixels, width, height, x - 13, y - 13, x + 13, y + 13, rgba(151, 169, 207));
    }
}

struct ViewportRect {
    int left{};
    int top{};
    int width{};
    int height{};
};

ViewportRect makeViewport(int width, int height) {
    ViewportRect viewport{};
    viewport.left = 72;
    viewport.top = 170;
    viewport.width = std::max(160, width - 144);
    viewport.height = std::max(160, height - 230);
    return viewport;
}

void drawViewport(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const ViewportRect& viewport
) {
    const int right = viewport.left + viewport.width;
    const int bottom = viewport.top + viewport.height;
    drawRectangle(pixels, width, height, viewport.left, viewport.top, right, bottom, rgba(65, 82, 119));
    drawLine(
        pixels,
        width,
        height,
        viewport.left + viewport.width / 2,
        viewport.top,
        viewport.left + viewport.width / 2,
        bottom,
        rgba(31, 43, 68)
    );
    drawLine(
        pixels,
        width,
        height,
        viewport.left,
        viewport.top + viewport.height / 2,
        right,
        viewport.top + viewport.height / 2,
        rgba(31, 43, 68)
    );
}

void drawPreviewMarker(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const ViewportRect& viewport,
    double offsetX,
    double offsetY,
    std::uint32_t color
) {
    const int centerX = viewport.left + viewport.width / 2 + int(std::lround(offsetX));
    const int centerY = viewport.top + viewport.height / 2 - int(std::lround(offsetY));
    fillSquare(pixels, width, height, centerX, centerY, 6, color);
    drawLine(pixels, width, height, centerX - 14, centerY, centerX + 14, centerY, color);
    drawLine(pixels, width, height, centerX, centerY - 14, centerX, centerY + 14, color);
}

#if LAB_CHECKPOINT >= 6
const char* statusName(lab::PipelineStatus status) {
    if (status == lab::PipelineStatus::Visible) {
        return "visible";
    }
    if (status == lab::PipelineStatus::BehindCamera) {
        return "behind";
    }
    if (status == lab::PipelineStatus::BeforeNearPlane) {
        return "before-near";
    }
    if (status == lab::PipelineStatus::BeyondFarPlane) {
        return "beyond-far";
    }
    return "outside";
}

void applyPreset(
    int preset,
    lab::Vec3& localVertex,
    lab::ModelTransform& model,
    lab::Camera3D& camera,
    lab::PerspectiveLens& lens
) {
    localVertex = {1.0, 0.75, 0.5};
    model = lab::ModelTransform{};
    camera = lab::Camera3D{};
    lens = lab::PerspectiveLens{};

    if (preset == 2) {
        localVertex = {0.1, 0.1, 0.0};
        model.position = {0.0, 0.0, 0.2};
    }
    if (preset == 3) {
        localVertex = {0.0, 0.0, 0.0};
        model.position = {0.0, 0.0, -2.0};
    }
    if (preset == 4) {
        localVertex = {0.0, 0.0, 0.0};
        model.position = {0.0, 0.0, lens.farPlane + 4.0};
    }
    if (preset == 5) {
        localVertex = {0.0, 0.0, 0.0};
        model.position = {12.0, 0.0, 4.0};
    }
}
#endif

#if LAB_CHECKPOINT >= 7
const char* stageName(int stage) {
    if (stage == 0) {
        return "LOCAL";
    }
    if (stage == 1) {
        return "WORLD";
    }
    if (stage == 2) {
        return "CAMERA";
    }
    if (stage == 3) {
        return "CLIP";
    }
    if (stage == 4) {
        return "NDC";
    }
    return "SCREEN";
}

void formatSelectedValue(
    char* output,
    std::size_t outputSize,
    int stage,
    const lab::PipelineTrace& trace
) {
    if (stage <= 3) {
        lab::Vec4 value = trace.local;
        if (stage == 1) {
            value = trace.world;
        }
        if (stage == 2) {
            value = trace.camera;
        }
        if (stage == 3) {
            value = trace.clip;
        }
        std::snprintf(
            output,
            outputSize,
            "(%.3f %.3f %.3f %.3f)",
            value.x,
            value.y,
            value.z,
            value.w
        );
        return;
    }
    if (stage == 4) {
        std::snprintf(
            output,
            outputSize,
            "(%.3f %.3f %.3f)",
            trace.ndc.x,
            trace.ndc.y,
            trace.ndc.z
        );
        return;
    }
    std::snprintf(output, outputSize, "(%.1f %.1f)", trace.screen.x, trace.screen.y);
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL, cửa sổ và framebuffer trước khi học pipeline 3D.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 15 - 3D Pipeline Inspector",
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
    const lab::Vec3 initialLocalVertex{1.0, 0.75, 0.5};
    lab::Vec3 localVertex = initialLocalVertex;
#endif
#if LAB_CHECKPOINT >= 3
    const lab::ModelTransform initialModel{};
    lab::ModelTransform model = initialModel;
#endif
#if LAB_CHECKPOINT >= 4
    const lab::Camera3D initialCamera{};
    lab::Camera3D camera = initialCamera;
#endif
#if LAB_CHECKPOINT >= 5
    const lab::PerspectiveLens initialLens{};
    lab::PerspectiveLens lens = initialLens;
#endif
#if LAB_CHECKPOINT >= 6
    int preset = 1;
#endif
#if LAB_CHECKPOINT >= 7
    int selectedStage = 0;
    bool paused = true;
    Uint64 previousTicks = SDL_GetTicksNS();
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

#if LAB_CHECKPOINT >= 3
                constexpr double angleStep = 5.0 * lab::kPi / 180.0;
                if (event.key.key == SDLK_Q) {
                    model.yaw -= angleStep;
                }
                if (event.key.key == SDLK_E) {
                    model.yaw += angleStep;
                }
#endif

#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_A) {
                    camera.position.x -= 0.2;
                }
                if (event.key.key == SDLK_D) {
                    camera.position.x += 0.2;
                }
                if (event.key.key == SDLK_W) {
                    camera.position.z += 0.2;
                }
                if (event.key.key == SDLK_S) {
                    camera.position.z -= 0.2;
                }
                if (event.key.key == SDLK_J) {
                    camera.yaw -= angleStep;
                }
                if (event.key.key == SDLK_L) {
                    camera.yaw += angleStep;
                }
                if (event.key.key == SDLK_I) {
                    camera.pitch += angleStep;
                }
                if (event.key.key == SDLK_K) {
                    camera.pitch -= angleStep;
                }
#endif

#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_LEFTBRACKET) {
                    lens.verticalFovRadians = std::max(
                        25.0 * lab::kPi / 180.0,
                        lens.verticalFovRadians - angleStep
                    );
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    lens.verticalFovRadians = std::min(
                        110.0 * lab::kPi / 180.0,
                        lens.verticalFovRadians + angleStep
                    );
                }
#endif

#if LAB_CHECKPOINT >= 6
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_5) {
                    preset = int(event.key.key - SDLK_0);
                    applyPreset(preset, localVertex, model, camera, lens);
                }
#endif

#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_LEFT) {
                    selectedStage = std::max(0, selectedStage - 1);
                }
                if (event.key.key == SDLK_RIGHT) {
                    selectedStage = std::min(5, selectedStage + 1);
                }
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (!event.key.repeat && event.key.key == SDLK_N) {
                    model.yaw = lab::advanceModelYaw(model.yaw, 35.0 * lab::kPi / 180.0, 1.0 / 30.0);
                }
#endif

#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    localVertex = initialLocalVertex;
#if LAB_CHECKPOINT >= 3
                    model = initialModel;
#endif
#if LAB_CHECKPOINT >= 4
                    camera = initialCamera;
#endif
#if LAB_CHECKPOINT >= 5
                    lens = initialLens;
#endif
#if LAB_CHECKPOINT >= 6
                    preset = 1;
#endif
#if LAB_CHECKPOINT >= 7
                    selectedStage = 0;
                    paused = true;
#endif
                }
#endif
            }

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

#if LAB_CHECKPOINT >= 7
        const Uint64 currentTicks = SDL_GetTicksNS();
        const double deltaTime = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
        if (!paused) {
            model.yaw = lab::advanceModelYaw(model.yaw, 35.0 * lab::kPi / 180.0, deltaTime);
        }
#endif

        clearCanvas(pixels);
        const ViewportRect viewport = makeViewport(width, height);
        drawViewport(pixels, width, height, viewport);

        int availableStage = -1;
        int activeStage = 0;
#if LAB_CHECKPOINT >= 1
        availableStage = 0;
#endif
#if LAB_CHECKPOINT >= 3
        availableStage = 1;
        activeStage = 1;
#endif
#if LAB_CHECKPOINT >= 4
        availableStage = 2;
        activeStage = 2;
#endif
#if LAB_CHECKPOINT >= 5
        availableStage = 3;
        activeStage = 3;
#endif
#if LAB_CHECKPOINT >= 6
        availableStage = 5;
        activeStage = 5;
#endif
#if LAB_CHECKPOINT >= 7
        activeStage = selectedStage;
#endif
        drawPipelineRail(pixels, width, height, activeStage, availableStage);

#if LAB_CHECKPOINT >= 6
        const lab::PipelineTrace trace = lab::tracePipeline(
            localVertex,
            model,
            camera,
            lens,
            viewport.width,
            viewport.height
        );
        if (trace.status == lab::PipelineStatus::Visible) {
            const int markerX = viewport.left + int(std::lround(trace.screen.x));
            const int markerY = viewport.top + int(std::lround(trace.screen.y));
            fillSquare(pixels, width, height, markerX, markerY, 7, rgba(255, 196, 88));
            drawLine(pixels, width, height, markerX - 16, markerY, markerX + 16, markerY, rgba(255, 224, 112));
            drawLine(pixels, width, height, markerX, markerY - 16, markerX, markerY + 16, rgba(255, 224, 112));
        }
#elif LAB_CHECKPOINT >= 4
        const lab::Vec4 worldPoint = lab::transform(lab::modelMatrix(model), lab::toPoint(localVertex));
        const lab::Vec4 cameraPoint = lab::transform(lab::viewMatrix(camera), worldPoint);
        drawPreviewMarker(pixels, width, height, viewport, cameraPoint.x * 34.0, cameraPoint.y * 34.0, rgba(255, 196, 88));
#elif LAB_CHECKPOINT >= 3
        const lab::Vec4 worldPoint = lab::transform(lab::modelMatrix(model), lab::toPoint(localVertex));
        drawPreviewMarker(pixels, width, height, viewport, worldPoint.x * 34.0, worldPoint.y * 34.0, rgba(255, 196, 88));
#elif LAB_CHECKPOINT >= 1
        const lab::Vec2 preview = lab::previewLocalVertex(localVertex, 54.0);
        drawPreviewMarker(pixels, width, height, viewport, preview.x, preview.y, rgba(255, 196, 88));
#else
        drawPreviewMarker(pixels, width, height, viewport, 0.0, 0.0, rgba(104, 145, 224));
#endif

        char title[640]{};
#if LAB_CHECKPOINT >= 7
        char selectedValue[160]{};
        formatSelectedValue(selectedValue, sizeof(selectedValue), selectedStage, trace);
        const double agreement = lab::pipelineAgreementError(
            localVertex,
            model,
            camera,
            lens,
            viewport.width,
            viewport.height
        );
        std::snprintf(
            title,
            sizeof(title),
            "P15 | %s %s | %s | MVP error %.2e | Left/Right stage, Q/E model, WASD/IJKL camera, 1-5 preset, Space/N/R",
            stageName(selectedStage),
            selectedValue,
            statusName(trace.status),
            agreement
        );
#elif LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P15 | clip (%.2f %.2f %.2f %.2f) | NDC (%.2f %.2f %.2f) | %s | preset %d",
            trace.clip.x,
            trace.clip.y,
            trace.clip.z,
            trace.clip.w,
            trace.ndc.x,
            trace.ndc.y,
            trace.ndc.z,
            statusName(trace.status),
            preset
        );
#elif LAB_CHECKPOINT >= 5
        const lab::Vec4 clipPoint = lab::transform(
            lab::projectionMatrix(lens, double(viewport.width) / double(viewport.height)),
            cameraPoint
        );
        std::snprintf(
            title,
            sizeof(title),
            "P15 | camera (%.2f %.2f %.2f %.2f) -> clip (%.2f %.2f %.2f %.2f) | FOV %.0f | [ ]",
            cameraPoint.x,
            cameraPoint.y,
            cameraPoint.z,
            cameraPoint.w,
            clipPoint.x,
            clipPoint.y,
            clipPoint.z,
            clipPoint.w,
            lens.verticalFovRadians * 180.0 / lab::kPi
        );
#elif LAB_CHECKPOINT >= 4
        std::snprintf(
            title,
            sizeof(title),
            "P15 | world (%.2f %.2f %.2f) -> camera (%.2f %.2f %.2f) | WASD IJKL Q/E R",
            worldPoint.x,
            worldPoint.y,
            worldPoint.z,
            cameraPoint.x,
            cameraPoint.y,
            cameraPoint.z
        );
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P15 | local (%.2f %.2f %.2f) -> world (%.2f %.2f %.2f) | model yaw %.0f | Q/E R",
            localVertex.x,
            localVertex.y,
            localVertex.z,
            worldPoint.x,
            worldPoint.y,
            worldPoint.z,
            model.yaw * 180.0 / lab::kPi
        );
#elif LAB_CHECKPOINT >= 2
        const lab::Vec4 pointAfterTranslation = lab::transform(
            lab::translationMatrix({2.0, 1.0, 3.0}),
            lab::toPoint(localVertex)
        );
        const lab::Vec4 directionAfterTranslation = lab::transform(
            lab::translationMatrix({2.0, 1.0, 3.0}),
            lab::toDirection(localVertex)
        );
        std::snprintf(
            title,
            sizeof(title),
            "P15 | point w=1 -> (%.1f %.1f %.1f) | direction w=0 -> (%.1f %.1f %.1f)",
            pointAfterTranslation.x,
            pointAfterTranslation.y,
            pointAfterTranslation.z,
            directionAfterTranslation.x,
            directionAfterTranslation.y,
            directionAfterTranslation.z
        );
#elif LAB_CHECKPOINT >= 1
        std::snprintf(
            title,
            sizeof(title),
            "P15 | LOCAL vertex (%.2f %.2f %.2f) | pipeline stages đang chờ",
            localVertex.x,
            localVertex.y,
            localVertex.z
        );
#else
        std::snprintf(title, sizeof(title), "Project 15 starter | framebuffer + inspector frame");
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
