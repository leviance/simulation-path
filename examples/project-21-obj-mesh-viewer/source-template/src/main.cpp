#include <SDL3/SDL.h>

#include "lab.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
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

#if LAB_CHECKPOINT >= 1
struct LoadedAsset {
    lab::ObjLoadResult result{};
    std::string path{};
};

LoadedAsset loadRocketAsset() {
    const std::array<std::string, 4> candidates{
        "assets/low-poly-rocket.obj",
        "../assets/low-poly-rocket.obj",
        "../../assets/low-poly-rocket.obj",
        "../../../assets/low-poly-rocket.obj",
    };
    LoadedAsset lastAttempt{};
    for (const std::string& path : candidates) {
        lab::ObjLoadResult result = lab::loadObjFile(path);
        if (result.opened) {
            return {std::move(result), path};
        }
        lastAttempt = {std::move(result), path};
    }
    return lastAttempt;
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

void drawPoint(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::ScreenVertex& point,
    std::uint32_t color
) {
    const int centerX = int(std::lround(point.x));
    const int centerY = int(std::lround(point.y));
    for (int offsetY = -2; offsetY <= 2; ++offsetY) {
        for (int offsetX = -2; offsetX <= 2; ++offsetX) {
            putPixel(pixels, width, height, centerX + offsetX, centerY + offsetY, color);
        }
    }
}

void drawLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    lab::ScreenVertex start,
    lab::ScreenVertex end,
    std::uint32_t color
) {
    int x0 = int(std::lround(start.x));
    int y0 = int(std::lround(start.y));
    const int x1 = int(std::lround(end.x));
    const int y1 = int(std::lround(end.y));
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
        const int doubledError = 2 * error;
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

std::vector<std::optional<lab::ScreenVertex>> projectMeshPositions(
    const lab::ObjMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    double distance
) {
    std::vector<std::optional<lab::ScreenVertex>> projected{};
    projected.reserve(mesh.positions.size());
    for (const lab::Vec3 position : mesh.positions) {
        const lab::Vec3 cameraPoint = lab::toCameraPoint(position, angleX, angleY, distance);
        projected.push_back(lab::projectVertex(cameraPoint, width, height));
    }
    return projected;
}

void renderPointCloud(
    const lab::ObjMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    double distance,
    std::vector<std::uint32_t>& pixels
) {
    const auto projected = projectMeshPositions(mesh, width, height, angleX, angleY, distance);
    for (const std::optional<lab::ScreenVertex>& point : projected) {
        if (point) {
            drawPoint(pixels, width, height, *point, 0xffd166ffU);
        }
    }
}

#if LAB_CHECKPOINT >= 2
void renderWireframe(
    const lab::ObjMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    double distance,
    std::vector<std::uint32_t>& pixels
) {
    const auto projected = projectMeshPositions(mesh, width, height, angleX, angleY, distance);
    for (const lab::ObjTriangle& triangle : mesh.triangles) {
        const auto& a = projected[triangle.indices[0]];
        const auto& b = projected[triangle.indices[1]];
        const auto& c = projected[triangle.indices[2]];
        if (!a || !b || !c) {
            continue;
        }
        drawLine(pixels, width, height, *a, *b, 0x70d6ffffU);
        drawLine(pixels, width, height, *b, *c, 0x70d6ffffU);
        drawLine(pixels, width, height, *c, *a, 0x70d6ffffU);
    }
}
#endif
#endif
} // namespace

int main() {
    // Khởi tạo SDL và streaming texture; parser cùng renderer CPU nằm trong lab.hpp.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 21 - OBJ Mesh Viewer",
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
    LoadedAsset asset = loadRocketAsset();
    if (!asset.result.opened || asset.result.mesh.positions.empty()) {
        std::cerr << "Cannot load rocket OBJ. Last path: " << asset.path << '\n';
        for (const lab::ObjDiagnostic& diagnostic : asset.result.diagnostics) {
            std::cerr << "line " << diagnostic.line << ": " << diagnostic.message << '\n';
        }
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    lab::ObjMesh mesh = std::move(asset.result.mesh);
#if LAB_CHECKPOINT >= 5
    if (!lab::normalizeMesh(mesh)) {
        std::cerr << "Mesh normalization failed: empty or zero-size bounds.\n";
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
#endif
    double angleX = -0.35;
    double angleY = 0.65;
    double distance = 4.2;
    bool dragging = false;
    float previousMouseX = 0.0F;
    float previousMouseY = 0.0F;
    bool paused = true;
    std::uint64_t previousTicks = SDL_GetTicks();
#if LAB_CHECKPOINT >= 6
    bool cullBackfaces = true;
#endif
#if LAB_CHECKPOINT >= 7
    bool reverseOrder = false;
    lab::DepthBuffer depthBuffer(width, height);
#endif
#if LAB_CHECKPOINT >= 8
    bool wireframe = false;
#endif
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
#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_N) {
                    angleY += 0.08;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    angleX = -0.35;
                    angleY = 0.65;
                    distance = 4.2;
                    paused = true;
#if LAB_CHECKPOINT >= 6
                    cullBackfaces = true;
#endif
#if LAB_CHECKPOINT >= 7
                    reverseOrder = false;
#endif
#if LAB_CHECKPOINT >= 8
                    wireframe = false;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_C) {
                    cullBackfaces = !cullBackfaces;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_O) {
                    reverseOrder = !reverseOrder;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (!event.key.repeat && event.key.key == SDLK_W) {
                    wireframe = !wireframe;
                }
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3) {
                    const int preset = int(event.key.key - SDLK_0);
                    if (preset == 1) {
                        distance = 4.2;
                    } else if (preset == 2) {
                        distance = 2.1;
                    } else {
                        distance = 1.25;
                    }
                    paused = true;
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
                paused = true;
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
#if LAB_CHECKPOINT >= 7
                depthBuffer.resize(width, height);
#endif
            }
        }
        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 1
        const std::uint64_t currentTicks = SDL_GetTicks();
        const double deltaSeconds = std::min(0.05, double(currentTicks - previousTicks) / 1000.0);
        previousTicks = currentTicks;
        if (!paused) {
            angleY += deltaSeconds * 0.45;
        }
#endif

        std::fill(pixels.begin(), pixels.end(), kClearColor);
#if LAB_CHECKPOINT >= 7
        lab::RenderStats stats{};
#if LAB_CHECKPOINT >= 8
        if (wireframe) {
            renderWireframe(mesh, width, height, angleX, angleY, distance, pixels);
        } else {
#endif
            lab::RenderOptions options{};
            options.angleX = angleX;
            options.angleY = angleY;
            options.distance = distance;
            options.cullBackfaces = cullBackfaces;
            options.reverseOrder = reverseOrder;
            stats = lab::renderObjMesh(mesh, width, height, options, pixels, depthBuffer);
#if LAB_CHECKPOINT >= 8
        }
#endif
#elif LAB_CHECKPOINT >= 6
        const lab::PainterStats stats = lab::renderPainterMesh(
            mesh,
            width,
            height,
            angleX,
            angleY,
            distance,
            cullBackfaces,
            pixels
        );
#elif LAB_CHECKPOINT >= 2
        renderWireframe(mesh, width, height, angleX, angleY, distance, pixels);
#elif LAB_CHECKPOINT >= 1
        renderPointCloud(mesh, width, height, angleX, angleY, distance, pixels);
#endif

        char title[640]{};
#if LAB_CHECKPOINT >= 8
        const char* viewName = "solid";
        if (wireframe) {
            viewName = "wireframe";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P21 | %s | v %zu face %zu tri %zu diag %zu | raster %zu pass %zu reject %zu | W C O 1-3 Space N R",
            viewName,
            mesh.positions.size(),
            asset.result.sourceFaceCount,
            mesh.triangles.size(),
            asset.result.diagnostics.size(),
            stats.rasterizedTriangles,
            stats.passedFragments,
            stats.rejectedFragments
        );
#elif LAB_CHECKPOINT >= 7
        std::snprintf(
            title,
            sizeof(title),
            "P21 | clip + Z-buffer | source %zu raster %zu pass %zu reject %zu | C O Space N R",
            stats.sourceTriangles,
            stats.rasterizedTriangles,
            stats.passedFragments,
            stats.rejectedFragments
        );
#elif LAB_CHECKPOINT >= 6
        std::snprintf(
            title,
            sizeof(title),
            "P21 | face normal + Lambert | raster %zu covered %zu degenerate %zu | C Space N R",
            stats.rasterizedTriangles,
            stats.coveredFragments,
            stats.degenerateTriangles
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "P21 | normalized mesh | v %zu tri %zu", mesh.positions.size(), mesh.triangles.size());
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P21 | triangle fan | face %zu -> tri %zu", asset.result.sourceFaceCount, mesh.triangles.size());
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "P21 | slash + negative index | v %zu tri %zu", mesh.positions.size(), mesh.triangles.size());
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "P21 | OBJ 1-based faces | v %zu tri %zu", mesh.positions.size(), mesh.triangles.size());
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P21 | OBJ point cloud | v %zu | %s", mesh.positions.size(), asset.path.c_str());
#else
        std::snprintf(title, sizeof(title), "Project 21 starter | SDL3 CPU framebuffer");
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
