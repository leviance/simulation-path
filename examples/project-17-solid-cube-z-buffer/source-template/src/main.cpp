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
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;
constexpr std::uint32_t kClearColor = 0x090f1dffU;

SDL_Texture* createStreamingTexture(SDL_Renderer* renderer, int width, int height) {
    return SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
}

#if LAB_CHECKPOINT >= 7
void showDepthBuffer(std::vector<std::uint32_t>& pixels, const lab::DepthBuffer& depthBuffer) {
    for (std::size_t index = 0; index < pixels.size(); ++index) {
        const std::uint8_t shade = lab::depthShade(depthBuffer.values()[index]);
        pixels[index] = lab::packColor({shade, shade, shade, 255});
    }
}
#endif
} // namespace

int main() {
    // Khởi tạo SDL và hạ tầng present; renderer 3D thuần nằm trong lab.hpp.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 17 - Solid Cube and Z-buffer",
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
        kClearColor
    );
    SDL_Texture* texture = createStreamingTexture(renderer, width, height);
    if (!texture) {
        std::cerr << "Texture creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

#if LAB_CHECKPOINT >= 1
    const lab::CubeMesh mesh = lab::makeCubeMesh();
    double angleX = -0.42;
    double angleY = 0.68;
#endif
#if LAB_CHECKPOINT >= 2
    bool reverseOrder = false;
#endif
#if LAB_CHECKPOINT >= 3
    lab::DepthBuffer depthBuffer(width, height);
#endif
#if LAB_CHECKPOINT >= 5
    bool depthEnabled = true;
#endif
#if LAB_CHECKPOINT >= 6
    bool paused = true;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 7
    bool depthView = false;
    int preset = 1;
#endif
#if LAB_CHECKPOINT >= 1
    bool dragging = false;
    float previousMouseX = 0.0F;
    float previousMouseY = 0.0F;
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
#if LAB_CHECKPOINT >= 2
                if (!event.key.repeat && event.key.key == SDLK_O) {
                    reverseOrder = !reverseOrder;
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_D) {
                    depthEnabled = !depthEnabled;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_N) {
                    angleY += 0.08;
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_V) {
                    depthView = !depthView;
                }
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3) {
                    preset = int(event.key.key - SDLK_0);
                    if (preset == 1) {
                        angleX = -0.42;
                        angleY = 0.68;
                    } else if (preset == 2) {
                        angleX = 0.0;
                        angleY = 0.0;
                    } else {
                        angleX = -0.70;
                        angleY = 0.95;
                    }
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    angleX = -0.42;
                    angleY = 0.68;
#if LAB_CHECKPOINT >= 2
                    reverseOrder = false;
#endif
#if LAB_CHECKPOINT >= 5
                    depthEnabled = true;
#endif
#if LAB_CHECKPOINT >= 6
                    paused = true;
#endif
#if LAB_CHECKPOINT >= 7
                    depthView = false;
                    preset = 1;
#endif
                }
#endif
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN &&
                event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                previousMouseX = event.button.x;
                previousMouseY = event.button.y;
                SDL_CaptureMouse(true);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                angleY += double(event.motion.x - previousMouseX) * 0.008;
                angleX += double(event.motion.y - previousMouseY) * 0.008;
                previousMouseX = event.motion.x;
                previousMouseY = event.motion.y;
#if LAB_CHECKPOINT >= 6
                paused = true;
#endif
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP &&
                event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif

            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                SDL_Texture* newTexture = createStreamingTexture(renderer, newWidth, newHeight);
                if (!newTexture) {
                    std::cerr << "Texture resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                    break;
                }
                SDL_DestroyTexture(texture);
                texture = newTexture;
                width = newWidth;
                height = newHeight;
                pixels.assign(std::size_t(width) * std::size_t(height), kClearColor);
#if LAB_CHECKPOINT >= 3
                depthBuffer.resize(width, height);
#endif
            }
        }

        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 6
        const std::uint64_t currentTicks = SDL_GetTicks();
        const double deltaSeconds = std::min(0.05, double(currentTicks - previousTicks) / 1000.0);
        previousTicks = currentTicks;
        if (!paused) {
            angleY += deltaSeconds * 0.55;
        }
#endif

        std::fill(pixels.begin(), pixels.end(), kClearColor);
#if LAB_CHECKPOINT >= 3
        depthBuffer.clear(1.0);
#endif

#if LAB_CHECKPOINT >= 6
        const lab::RenderStats stats = lab::renderCube(
            mesh,
            width,
            height,
            angleX,
            angleY,
            reverseOrder,
            depthEnabled,
            pixels,
            depthBuffer
        );
#elif LAB_CHECKPOINT >= 1
        const auto screenVertices = lab::projectCube(mesh, width, height, angleX, angleY);
        for (std::size_t position = 0; position < mesh.triangles.size(); ++position) {
            std::size_t triangleIndex = position;
#if LAB_CHECKPOINT >= 2
            triangleIndex = lab::triangleIndexAt(position, mesh.triangles.size(), reverseOrder);
#endif
            const lab::ScreenTriangle triangle = lab::screenTriangle(
                mesh.triangles[triangleIndex],
                screenVertices
            );
            lab::rasterizeTriangle(
                triangle,
                width,
                height,
                [&](int x, int y, lab::Barycentric weights, const lab::ScreenTriangle& normalized) {
                    const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
#if LAB_CHECKPOINT >= 4
                    const double fragmentDepth = lab::interpolateNdcDepth(normalized, weights);
#else
                    static_cast<void>(weights);
#endif
#if LAB_CHECKPOINT >= 5
                    const lab::DepthTestResult test = lab::depthTestAndWrite(
                        depthBuffer,
                        x,
                        y,
                        fragmentDepth,
                        depthEnabled
                    );
                    if (!test.passed) {
                        return;
                    }
                    pixels[index] = lab::packColor(normalized.color);
#elif LAB_CHECKPOINT >= 4
                    const std::uint8_t shade = std::uint8_t(std::lround(
                        (1.0 - std::clamp(fragmentDepth, 0.0, 1.0)) * 235.0 + 20.0
                    ));
                    pixels[index] = lab::packColor({shade, shade, shade, 255});
#else
                    pixels[index] = lab::packColor(normalized.color);
#endif
                }
            );
        }
#endif

#if LAB_CHECKPOINT >= 7
        if (depthView) {
            showDepthBuffer(pixels, depthBuffer);
        }
#endif

        char title[512]{};
#if LAB_CHECKPOINT >= 7
        const char* depthModeName = "Z-buffer off";
        if (depthEnabled) {
            depthModeName = "Z-buffer on";
        }
        const char* orderName = "normal";
        if (reverseOrder) {
            orderName = "reversed";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P17 | %s | order %s | covered %zu pass %zu reject %zu | preset %d | 1-3 D O V Space N R",
            depthModeName,
            orderName,
            stats.coveredCount,
            stats.passedCount,
            stats.rejectedCount,
            preset
        );
#elif LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P17 | 12 triangles | covered %zu pass %zu reject %zu | D O Space N R",
            stats.coveredCount,
            stats.passedCount,
            stats.rejectedCount
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "P17 | depth compare + write | D toggle, O order, drag, R");
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P17 | interpolated NDC depth | grayscale preview");
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "P17 | depth buffer %dx%d clear=1.0 | O order, drag, R",
            depthBuffer.width(),
            depthBuffer.height()
        );
#elif LAB_CHECKPOINT >= 2
        const char* orderName = "normal";
        if (reverseOrder) {
            orderName = "reversed";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P17 | no depth test | order %s | O toggle, drag, R",
            orderName
        );
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P17 | solid cube, 12 triangles | drag, R");
#else
        std::snprintf(title, sizeof(title), "Project 17 starter | SDL3 CPU framebuffer");
#endif
        SDL_SetWindowTitle(window, title);

        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderClear(renderer) ||
            !SDL_RenderTexture(renderer, texture, nullptr, nullptr) ||
            !SDL_RenderPresent(renderer)) {
            std::cerr << "Present failed: " << SDL_GetError() << '\n';
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
