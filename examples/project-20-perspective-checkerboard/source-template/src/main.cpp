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
constexpr double kPi = 3.14159265358979323846;
constexpr double kNearPlane = 1.0;
constexpr double kVerticalFov = 60.0 * kPi / 180.0;

std::uint32_t rgba(
    std::uint8_t red,
    std::uint8_t green,
    std::uint8_t blue,
    std::uint8_t alpha = 255
) {
    return (std::uint32_t(red) << 24U) | (std::uint32_t(green) << 16U) |
        (std::uint32_t(blue) << 8U) | std::uint32_t(alpha);
}

#if LAB_CHECKPOINT >= 1
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
#endif

#if LAB_CHECKPOINT >= 2
std::uint8_t toByte(double value) {
    return std::uint8_t(std::lround(std::clamp(value, 0.0, 255.0)));
}

std::uint32_t packedColor(lab::Color color) {
    return rgba(toByte(color.red), toByte(color.green), toByte(color.blue));
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

#if LAB_CHECKPOINT >= 1
lab::TexturedQuad quadPreset(int preset) {
    if (preset == 1) {
        return lab::makeTiltedQuad(4.0, 4.0);
    }
    if (preset == 2) {
        return lab::makeTiltedQuad(2.5, 5.0);
    }
    if (preset == 3) {
        return lab::makeTiltedQuad(1.5, 7.0);
    }
    return lab::makeTiltedQuad(0.65, 4.5);
}

void drawProjectedWire(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TexturedQuad& quad,
    const lab::Viewport& viewport
) {
#if LAB_CHECKPOINT >= 3
    for (const auto& face : quad.faces) {
        for (std::size_t edge = 0; edge < face.size(); ++edge) {
            const std::size_t next = (edge + 1) % face.size();
            const auto start = lab::projectVertex(
                quad.vertices[face[edge]],
                kVerticalFov,
                viewport,
                kNearPlane
            );
            const auto end = lab::projectVertex(
                quad.vertices[face[next]],
                kVerticalFov,
                viewport,
                kNearPlane
            );
            if (!start || !end) {
                continue;
            }
            drawLine(
                pixels,
                width,
                height,
                int(std::lround(start->position.x)),
                int(std::lround(start->position.y)),
                int(std::lround(end->position.x)),
                int(std::lround(end->position.y)),
                rgba(219, 229, 255)
            );
        }
    }
#else
    const double aspect = double(viewport.width) / double(viewport.height);
    const double focalScale = 1.0 / std::tan(kVerticalFov * 0.5);
    std::array<lab::Vec2, 4> projected{};
    for (std::size_t index = 0; index < quad.vertices.size(); ++index) {
        const lab::Vec3 point = quad.vertices[index].position;
        const double ndcX = point.x * focalScale / (aspect * point.z);
        const double ndcY = point.y * focalScale / point.z;
        projected[index] = {
            double(viewport.left) + (ndcX * 0.5 + 0.5) * double(viewport.width),
            double(viewport.top) + (0.5 - ndcY * 0.5) * double(viewport.height),
        };
    }
    for (const auto& face : quad.faces) {
        for (std::size_t edge = 0; edge < face.size(); ++edge) {
            const std::size_t next = (edge + 1) % face.size();
            const lab::Vec2 start = projected[face[edge]];
            const lab::Vec2 end = projected[face[next]];
            drawLine(
                pixels,
                width,
                height,
                int(std::lround(start.x)),
                int(std::lround(start.y)),
                int(std::lround(end.x)),
                int(std::lround(end.y)),
                rgba(219, 229, 255)
            );
        }
    }
#endif
}
#endif

#if LAB_CHECKPOINT >= 2
void drawTexturePreview(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Texture2D& texture
) {
    const int previewSize = std::min(128, std::max(64, height / 5));
    const int left = 20;
    const int top = 20;
    for (int y = 0; y < previewSize; ++y) {
        for (int x = 0; x < previewSize; ++x) {
            const lab::Vec2 uv{
                (double(x) + 0.5) / double(previewSize),
                (double(y) + 0.5) / double(previewSize),
            };
            const lab::Color color = lab::sampleNearest(texture, uv, lab::AddressMode::clamp);
            putPixel(pixels, width, height, left + x, top + y, packedColor(color));
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 3
struct AppRasterStats {
    std::size_t triangleCount{};
    std::size_t coveredCount{};
#if LAB_CHECKPOINT >= 4
    double maximumUvError{};
#endif
};

#if LAB_CHECKPOINT >= 4
struct PixelInspection {
    bool covered{};
    lab::Barycentric barycentric{};
    lab::Vec2 affineUv{};
    lab::Vec2 correctedUv{};
    double denominator{};
    std::array<int, 2> texel{};
};
#endif

#if LAB_CHECKPOINT < 8
AppRasterStats drawProjectedTriangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::ScreenTriangle& screen,
    const lab::Texture2D& texture
#if LAB_CHECKPOINT >= 6
    ,
    lab::InterpolationMode interpolationMode
#endif
#if LAB_CHECKPOINT >= 8
    ,
    lab::AddressMode addressMode
#endif
#if LAB_CHECKPOINT >= 4
    ,
    int selectedX,
    int selectedY,
    PixelInspection& inspection
#endif
) {
    AppRasterStats total{};
    total.triangleCount = 1;
    const lab::RasterStats stats = lab::rasterizeTriangle(
        screen,
        width,
        height,
        [&](lab::RasterSample sample) {
            const lab::Vec2 affineUv = lab::interpolateAffineUv(screen, sample.barycentric);
            lab::Vec2 selectedUv = affineUv;
#if LAB_CHECKPOINT >= 4
            const lab::Vec2 referenceUv = lab::referenceUvFromCameraDepths(
                screen,
                sample.barycentric
            );
            total.maximumUvError = std::max(
                total.maximumUvError,
                lab::uvDistance(affineUv, referenceUv)
            );
#endif
#if LAB_CHECKPOINT >= 5
            const auto correctedUv = lab::interpolatePerspectiveUv(screen, sample.barycentric);
#if LAB_CHECKPOINT >= 6
            if (interpolationMode == lab::InterpolationMode::perspectiveCorrect && correctedUv) {
                selectedUv = *correctedUv;
            }
#endif
#endif
#if LAB_CHECKPOINT >= 8
            const lab::Color color = lab::sampleNearest(texture, selectedUv, addressMode);
#else
            const lab::Color color = lab::sampleNearest(
                texture,
                selectedUv,
                lab::AddressMode::clamp
            );
#endif
            putPixel(pixels, width, height, sample.x, sample.y, packedColor(color));

#if LAB_CHECKPOINT >= 4
            if (sample.x == selectedX && sample.y == selectedY) {
                inspection.covered = true;
                inspection.barycentric = sample.barycentric;
                inspection.affineUv = affineUv;
#if LAB_CHECKPOINT >= 5
                if (correctedUv) {
                    inspection.correctedUv = *correctedUv;
                    inspection.denominator = lab::reciprocalDepthDenominator(
                        screen,
                        sample.barycentric
                    );
                }
#else
                inspection.correctedUv = referenceUv;
#endif
#if LAB_CHECKPOINT >= 8
                inspection.texel = lab::nearestTexelIndex(texture, selectedUv, addressMode);
#else
                inspection.texel = lab::nearestTexelIndex(
                    texture,
                    selectedUv,
                    lab::AddressMode::clamp
                );
#endif
            }
#endif
        }
    );
    total.coveredCount = stats.coveredCount;
    return total;
}
#endif

AppRasterStats drawQuad(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TexturedQuad& quad,
    const lab::Texture2D& texture,
    const lab::Viewport& viewport
#if LAB_CHECKPOINT >= 6
    ,
    lab::InterpolationMode interpolationMode
#endif
#if LAB_CHECKPOINT >= 8
    ,
    lab::AddressMode addressMode
#endif
#if LAB_CHECKPOINT >= 4
    ,
    int selectedX,
    int selectedY,
    PixelInspection& inspection
#endif
) {
    AppRasterStats total{};
    for (std::size_t face = 0; face < quad.faces.size(); ++face) {
        const lab::TexturedTriangle input = lab::quadTriangle(quad, face);
#if LAB_CHECKPOINT >= 8
        const lab::TextureRenderStats stats = lab::renderTexturedTriangle(
            input,
            texture,
            viewport,
            kVerticalFov,
            kNearPlane,
            interpolationMode,
            addressMode,
            width,
            height,
            [&](const lab::TexturedPixel& sample) {
                putPixel(
                    pixels,
                    width,
                    height,
                    sample.x,
                    sample.y,
                    packedColor(sample.color)
                );

                if (sample.x != selectedX || sample.y != selectedY) {
                    return;
                }
                inspection.covered = true;
                inspection.barycentric = sample.barycentric;
                inspection.affineUv = sample.affineUv;
                inspection.correctedUv = sample.correctedUv;
                inspection.denominator = sample.denominator;
                inspection.texel = sample.texel;
            }
        );
        total.triangleCount += stats.triangleCount;
        total.coveredCount += stats.coveredCount;
        total.maximumUvError = std::max(total.maximumUvError, stats.maximumUvError);
#else
#if LAB_CHECKPOINT >= 7
        const lab::ClippedPolygon polygon = lab::clipTriangleToNearPlane(input, kNearPlane);
        const lab::TriangleBatch batch = lab::triangulateFan(polygon);
        for (std::size_t output = 0; output < batch.count; ++output) {
            const auto screen = lab::projectTriangle(
                batch.triangles[output],
                kVerticalFov,
                viewport,
                kNearPlane
            );
            if (!screen) {
                continue;
            }
            const AppRasterStats stats = drawProjectedTriangle(
                pixels,
                width,
                height,
                *screen,
                texture
#if LAB_CHECKPOINT >= 6
                ,
                interpolationMode
#endif
#if LAB_CHECKPOINT >= 8
                ,
                addressMode
#endif
#if LAB_CHECKPOINT >= 4
                ,
                selectedX,
                selectedY,
                inspection
#endif
            );
            total.triangleCount += stats.triangleCount;
            total.coveredCount += stats.coveredCount;
#if LAB_CHECKPOINT >= 4
            total.maximumUvError = std::max(total.maximumUvError, stats.maximumUvError);
#endif
        }
#else
        const auto screen = lab::projectTriangle(input, kVerticalFov, viewport, kNearPlane);
        if (!screen) {
            continue;
        }
        const AppRasterStats stats = drawProjectedTriangle(
            pixels,
            width,
            height,
            *screen,
            texture
#if LAB_CHECKPOINT >= 6
            ,
            interpolationMode
#endif
#if LAB_CHECKPOINT >= 4
            ,
            selectedX,
            selectedY,
            inspection
#endif
        );
        total.triangleCount += stats.triangleCount;
        total.coveredCount += stats.coveredCount;
#if LAB_CHECKPOINT >= 4
        total.maximumUvError = std::max(total.maximumUvError, stats.maximumUvError);
#endif
#endif
#endif
    }
    return total;
}
#endif
} // namespace

int main() {
    // Setup tạo từng tài nguyên SDL và dừng ngay nếu một bước thất bại.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 20 - Perspective Checkerboard",
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
    lab::TexturedQuad quad = quadPreset(preset);
#endif
#if LAB_CHECKPOINT >= 2
    const lab::Texture2D checker = lab::makeCheckerTexture();
#endif
#if LAB_CHECKPOINT >= 4
    int selectedX = width / 2;
    int selectedY = height / 2;
#endif
#if LAB_CHECKPOINT >= 6
    lab::InterpolationMode interpolationMode = lab::InterpolationMode::perspectiveCorrect;
    bool compare = true;
#endif
#if LAB_CHECKPOINT >= 8
    lab::AddressMode addressMode = lab::AddressMode::clamp;
    bool paused = true;
    bool dragging = false;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif

    while (running) {
#if LAB_CHECKPOINT >= 8
        bool stepOnce = false;
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                width = std::max(1, event.window.data1);
                height = std::max(1, event.window.data2);
                SDL_Texture* newTexture = createTexture(renderer, width, height);
                if (!newTexture) {
                    std::cerr << "Texture resize failed: " << SDL_GetError() << '\n';
                    running = false;
                    break;
                }
                SDL_DestroyTexture(texture);
                texture = newTexture;
                pixels.assign(std::size_t(width) * std::size_t(height), 0U);
#if LAB_CHECKPOINT >= 4
                selectedX = width / 2;
                selectedY = height / 2;
#endif
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const SDL_Keycode key = event.key.key;
                if (key >= SDLK_1 && key <= SDLK_4) {
                    preset = int(key - SDLK_0);
                    quad = quadPreset(preset);
                }
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_M) {
                    if (interpolationMode == lab::InterpolationMode::affine) {
                        interpolationMode = lab::InterpolationMode::perspectiveCorrect;
                    } else {
                        interpolationMode = lab::InterpolationMode::affine;
                    }
                }
                if (key == SDLK_C) {
                    compare = !compare;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_T) {
                    if (addressMode == lab::AddressMode::clamp) {
                        addressMode = lab::AddressMode::repeat;
                    } else {
                        addressMode = lab::AddressMode::clamp;
                    }
                }
                if (key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (key == SDLK_PERIOD && paused) {
                    stepOnce = true;
                }
                if (key == SDLK_R) {
                    preset = 2;
                    quad = quadPreset(preset);
                    interpolationMode = lab::InterpolationMode::perspectiveCorrect;
                    compare = true;
                    addressMode = lab::AddressMode::clamp;
                    paused = true;
                }
#endif
            }
#endif
#if LAB_CHECKPOINT >= 4
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                selectedX = int(std::lround(event.button.x));
                selectedY = int(std::lround(event.button.y));
#if LAB_CHECKPOINT >= 8
                dragging = true;
                paused = true;
                SDL_CaptureMouse(true);
#endif
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const double depthChange = double(event.motion.xrel) * 0.02;
                for (std::size_t index : {std::size_t(1), std::size_t(2)}) {
                    quad.vertices[index].position.z = std::clamp(
                        quad.vertices[index].position.z + depthChange,
                        1.1,
                        9.0
                    );
                }
                selectedX = int(std::lround(event.motion.x));
                selectedY = int(std::lround(event.motion.y));
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

#if LAB_CHECKPOINT >= 8
        const bool* keyboard = SDL_GetKeyboardState(nullptr);
        double depthDelta = 0.0;
        if (keyboard[SDL_SCANCODE_A] || keyboard[SDL_SCANCODE_LEFT]) {
            depthDelta -= 0.04;
        }
        if (keyboard[SDL_SCANCODE_D] || keyboard[SDL_SCANCODE_RIGHT]) {
            depthDelta += 0.04;
        }
        if (depthDelta != 0.0) {
            paused = true;
            for (std::size_t index : {std::size_t(1), std::size_t(2)}) {
                quad.vertices[index].position.z = std::clamp(
                    quad.vertices[index].position.z + depthDelta,
                    1.1,
                    9.0
                );
            }
        }

        const std::uint64_t currentTicks = SDL_GetTicks();
        double deltaTime = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        deltaTime = std::clamp(deltaTime, 0.0, 0.05);
        if (!paused || stepOnce) {
            const double movement = deltaTime * 0.35;
            for (lab::TexturedVertex& vertex : quad.vertices) {
                vertex.position.z -= movement;
                if (vertex.position.z < 0.45) {
                    quad = quadPreset(preset);
                    break;
                }
            }
        }
#endif

        std::fill(pixels.begin(), pixels.end(), rgba(8, 13, 25));
#if LAB_CHECKPOINT >= 2
        drawTexturePreview(pixels, width, height, checker);
#endif

#if LAB_CHECKPOINT >= 1
        lab::Viewport fullViewport{0, 0, width, height};
#if LAB_CHECKPOINT >= 3
        AppRasterStats rasterStats{};
#if LAB_CHECKPOINT >= 4
        PixelInspection inspection{};
#endif
#if LAB_CHECKPOINT >= 6
        if (compare) {
            const int gap = 12;
            const int panelWidth = std::max(1, (width - gap) / 2);
            const lab::Viewport affineViewport{0, 0, panelWidth, height};
            const lab::Viewport correctViewport{panelWidth + gap, 0, panelWidth, height};
            const AppRasterStats affineStats = drawQuad(
                pixels,
                width,
                height,
                quad,
                checker,
                affineViewport,
                lab::InterpolationMode::affine
#if LAB_CHECKPOINT >= 8
                ,
                addressMode
#endif
#if LAB_CHECKPOINT >= 4
                ,
                selectedX,
                selectedY,
                inspection
#endif
            );
            const AppRasterStats correctStats = drawQuad(
                pixels,
                width,
                height,
                quad,
                checker,
                correctViewport,
                lab::InterpolationMode::perspectiveCorrect
#if LAB_CHECKPOINT >= 8
                ,
                addressMode
#endif
#if LAB_CHECKPOINT >= 4
                ,
                selectedX,
                selectedY,
                inspection
#endif
            );
            rasterStats.triangleCount = affineStats.triangleCount + correctStats.triangleCount;
            rasterStats.coveredCount = affineStats.coveredCount + correctStats.coveredCount;
#if LAB_CHECKPOINT >= 4
            rasterStats.maximumUvError = std::max(
                affineStats.maximumUvError,
                correctStats.maximumUvError
            );
#endif
            drawProjectedWire(pixels, width, height, quad, affineViewport);
            drawProjectedWire(pixels, width, height, quad, correctViewport);
        } else {
#endif
            rasterStats = drawQuad(
                pixels,
                width,
                height,
                quad,
                checker,
                fullViewport
#if LAB_CHECKPOINT >= 6
                ,
                interpolationMode
#endif
#if LAB_CHECKPOINT >= 8
                ,
                addressMode
#endif
#if LAB_CHECKPOINT >= 4
                ,
                selectedX,
                selectedY,
                inspection
#endif
            );
            drawProjectedWire(pixels, width, height, quad, fullViewport);
#if LAB_CHECKPOINT >= 6
        }
#endif
#else
        drawProjectedWire(pixels, width, height, quad, fullViewport);
#endif

#if LAB_CHECKPOINT >= 4
        if (inspection.covered) {
            for (int offset = -5; offset <= 5; ++offset) {
                putPixel(pixels, width, height, selectedX + offset, selectedY, rgba(255, 94, 116));
                putPixel(pixels, width, height, selectedX, selectedY + offset, rgba(255, 94, 116));
            }
        }
#endif

        char title[420]{};
#if LAB_CHECKPOINT >= 8
        const char* interpolationName = "perspective";
        if (interpolationMode == lab::InterpolationMode::affine) {
            interpolationName = "affine";
        }
        const char* addressName = "clamp";
        if (addressMode == lab::AddressMode::repeat) {
            addressName = "repeat";
        }
        const char* compareName = "off";
        if (compare) {
            compareName = "on";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P20 | preset %d | %s | compare %s | address %s | triangles %zu | pixels %zu | max UV error %.4f | sample UV %.3f,%.3f -> %.3f,%.3f | texel %d,%d | 1-4 M C T Space . R drag A/D",
            preset,
            interpolationName,
            compareName,
            addressName,
            rasterStats.triangleCount,
            rasterStats.coveredCount,
            rasterStats.maximumUvError,
            inspection.affineUv.x,
            inspection.affineUv.y,
            inspection.correctedUv.x,
            inspection.correctedUv.y,
            inspection.texel[0],
            inspection.texel[1]
        );
#elif LAB_CHECKPOINT >= 7
        std::snprintf(title, sizeof(title), "P20 checkpoint 7 | near clip keeps position and UV together");
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "P20 checkpoint 6 | M affine/perspective | C compare | error %.4f", rasterStats.maximumUvError);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "P20 checkpoint 5 | 1/z, u/z, v/z | denominator %.5f", inspection.denominator);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P20 checkpoint 4 | affine UV error %.5f", rasterStats.maximumUvError);
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "P20 checkpoint 3 | affine UV | covered %zu", rasterStats.coveredCount);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "P20 checkpoint 2 | procedural checker and nearest sampling");
#else
        std::snprintf(title, sizeof(title), "P20 checkpoint 1 | indexed tilted quad and UV corners");
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

    // Cleanup giải phóng texture trước renderer và window sở hữu nó.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
