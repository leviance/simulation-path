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
lab::Vec2 projectForGuide(lab::Vec3 point, int width, int height) {
    const double aspect = double(width) / double(height);
    const double focalScale = 1.0 / std::tan(kVerticalFov * 0.5);
    const double ndcX = point.x * focalScale / (aspect * point.z);
    const double ndcY = point.y * focalScale / point.z;
    return {
        (ndcX * 0.5 + 0.5) * double(width),
        (0.5 - ndcY * 0.5) * double(height),
    };
}

lab::TetrahedronMesh placeStaticMesh(const lab::TetrahedronMesh& localMesh) {
    lab::TetrahedronMesh cameraMesh = localMesh;
    for (lab::Vec3& vertex : cameraMesh.vertices) {
        vertex = lab::add(vertex, {0.0, 0.0, 5.0});
    }
    return cameraMesh;
}
#endif

#if LAB_CHECKPOINT >= 3
lab::DirectionalLight lightPreset(int preset) {
    if (preset == 1) {
        return lab::makeDirectionalLight({0.0, 0.0, -1.0});
    }
    if (preset == 2) {
        return lab::makeDirectionalLight({0.0, 1.0, -0.25});
    }
    if (preset == 3) {
        return lab::makeDirectionalLight({1.0, 0.15, -0.25});
    }
    return lab::makeDirectionalLight({0.0, 0.0, 1.0});
}
#endif

#if LAB_CHECKPOINT >= 2
lab::Color faceDisplayColor(
    const lab::Face& face,
    lab::Vec3 unitNormal
#if LAB_CHECKPOINT >= 3
    ,
    const lab::DirectionalLight& light
#endif
#if LAB_CHECKPOINT >= 7
    ,
    bool lightingEnabled
#endif
) {
#if LAB_CHECKPOINT >= 5
    const lab::Material material{face.baseColor, 0.16, 0.84};
#if LAB_CHECKPOINT >= 7
    if (!lightingEnabled) {
        return material.baseColor;
    }
#endif
    return lab::shadeMaterial(unitNormal, light, material).shadedColor;
#elif LAB_CHECKPOINT >= 4
    (void)face;
    const double diffuse = lab::lambertDiffuse(unitNormal, light.surfaceToLight);
    return {220.0 * diffuse, 220.0 * diffuse, 220.0 * diffuse};
#else
    (void)unitNormal;
#if LAB_CHECKPOINT >= 3
    (void)light;
#endif
    return face.baseColor;
#endif
}
#endif

#if LAB_CHECKPOINT >= 1
void drawWireFrame(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TetrahedronMesh& mesh
#if LAB_CHECKPOINT >= 3
    ,
    const lab::DirectionalLight& light
#endif
#if LAB_CHECKPOINT >= 7
    ,
    bool lightingEnabled
#endif
) {
    for (const lab::Face& face : mesh.faces) {
        const auto vertices = lab::faceVertices(mesh, face);
#if LAB_CHECKPOINT >= 6
        if (!lab::isFrontFacing(vertices)) {
            continue;
        }
#endif
        lab::Color displayColor = face.baseColor;
#if LAB_CHECKPOINT >= 2
        const lab::Vec3 normal = lab::faceUnitNormal(vertices);
        displayColor = faceDisplayColor(
            face,
            normal
#if LAB_CHECKPOINT >= 3
            ,
            light
#endif
#if LAB_CHECKPOINT >= 7
            ,
            lightingEnabled
#endif
        );
#endif
        for (std::size_t index = 0; index < vertices.size(); ++index) {
            const std::size_t next = (index + 1) % vertices.size();
            const lab::Vec2 start = projectForGuide(vertices[index], width, height);
            const lab::Vec2 end = projectForGuide(vertices[next], width, height);
            drawLine(
                pixels,
                width,
                height,
                int(std::lround(start.x)),
                int(std::lround(start.y)),
                int(std::lround(end.x)),
                int(std::lround(end.y)),
                packedColor(displayColor)
            );
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 2
void drawSelectedNormal(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TetrahedronMesh& mesh,
    std::size_t selectedFace
) {
    const auto vertices = lab::faceVertices(mesh, mesh.faces[selectedFace]);
    const lab::Vec3 centroid = lab::faceCentroid(vertices);
    const lab::Vec3 normalEnd = lab::add(centroid, lab::scale(lab::faceUnitNormal(vertices), 0.85));
    const lab::Vec2 start = projectForGuide(centroid, width, height);
    const lab::Vec2 end = projectForGuide(normalEnd, width, height);
    drawLine(
        pixels,
        width,
        height,
        int(std::lround(start.x)),
        int(std::lround(start.y)),
        int(std::lround(end.x)),
        int(std::lround(end.y)),
        rgba(255, 255, 255)
    );
}
#endif

#if LAB_CHECKPOINT >= 7
struct FrameStats {
    int visibleFaces{};
    int culledFaces{};
    std::size_t clippedTriangles{};
    std::size_t coveredPixels{};
};

FrameStats drawSolidMesh(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::TetrahedronMesh& mesh,
    const lab::DirectionalLight& light,
    bool lightingEnabled
) {
    FrameStats frameStats{};
    const lab::Viewport viewport{width, height};

    for (const lab::Face& face : mesh.faces) {
        const auto vertices = lab::faceVertices(mesh, face);
        if (!lab::isFrontFacing(vertices)) {
            ++frameStats.culledFaces;
            continue;
        }
        ++frameStats.visibleFaces;

        const lab::Vec3 normal = lab::faceUnitNormal(vertices);
        const lab::Color displayColor = faceDisplayColor(
            face,
            normal,
            light,
            lightingEnabled
        );
        const lab::Triangle3 triangle{{vertices[0], vertices[1], vertices[2]}};
        const lab::ClippedPolygon polygon = lab::clipTriangleToNearPlane(
            triangle,
            kNearPlane
        );
        const lab::TriangleBatch batch = lab::triangulateFan(polygon);
        frameStats.clippedTriangles += batch.count;

        for (std::size_t index = 0; index < batch.count; ++index) {
            const auto screenTriangle = lab::projectTriangle(
                batch.triangles[index],
                kVerticalFov,
                viewport,
                kNearPlane
            );
            if (!screenTriangle) {
                continue;
            }
            const lab::RasterStats rasterStats = lab::rasterizeTriangle(
                *screenTriangle,
                width,
                height,
                [&](int x, int y) {
                    putPixel(pixels, width, height, x, y, packedColor(displayColor));
                }
            );
            frameStats.coveredPixels += rasterStats.coveredCount;
        }
    }
    return frameStats;
}
#endif
} // namespace

int main() {
    // Setup tạo và kiểm tra từng tài nguyên SDL trước khi vào frame loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 19 - Lambert Tetrahedron",
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
    const lab::TetrahedronMesh localMesh = lab::makeTetrahedron();
    std::size_t selectedFace = 0;
#endif
#if LAB_CHECKPOINT >= 3
    int lightPresetIndex = 1;
    lab::DirectionalLight light = lightPreset(lightPresetIndex);
#endif
#if LAB_CHECKPOINT >= 6
    double pitch = -0.28;
    double yaw = 0.55;
    bool paused = true;
    bool dragging = false;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 7
    bool lightingEnabled = true;
    bool normalVisible = true;
#endif

    while (running) {
#if LAB_CHECKPOINT >= 6
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
                if (key == SDLK_TAB) {
                    selectedFace = (selectedFace + 1) % localMesh.faces.size();
                }
#if LAB_CHECKPOINT >= 3
                if (key >= SDLK_1 && key <= SDLK_4) {
                    lightPresetIndex = int(key - SDLK_0);
                    light = lightPreset(lightPresetIndex);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (key == SDLK_PERIOD && paused) {
                    stepOnce = true;
                }
                if (key == SDLK_R) {
                    pitch = -0.28;
                    yaw = 0.55;
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_L) {
                    lightingEnabled = !lightingEnabled;
                }
                if (key == SDLK_N) {
                    normalVisible = !normalVisible;
                }
#endif
            }
#endif
#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                paused = true;
                SDL_CaptureMouse(true);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                yaw += double(event.motion.xrel) * 0.008;
                pitch += double(event.motion.yrel) * 0.008;
                pitch = std::clamp(pitch, -1.4, 1.4);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

#if LAB_CHECKPOINT >= 6
        const bool* keyboard = SDL_GetKeyboardState(nullptr);
        if (keyboard[SDL_SCANCODE_LEFT] || keyboard[SDL_SCANCODE_A]) {
            yaw -= 0.025;
            paused = true;
        }
        if (keyboard[SDL_SCANCODE_RIGHT] || keyboard[SDL_SCANCODE_D]) {
            yaw += 0.025;
            paused = true;
        }
        if (keyboard[SDL_SCANCODE_UP] || keyboard[SDL_SCANCODE_W]) {
            pitch -= 0.025;
            paused = true;
        }
        if (keyboard[SDL_SCANCODE_DOWN] || keyboard[SDL_SCANCODE_S]) {
            pitch += 0.025;
            paused = true;
        }

        const std::uint64_t currentTicks = SDL_GetTicks();
        double deltaTime = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        deltaTime = std::clamp(deltaTime, 0.0, 0.05);
        if (!paused || stepOnce) {
            yaw += 0.7 * deltaTime;
        }
#endif

        std::fill(pixels.begin(), pixels.end(), rgba(8, 13, 25));

#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 6
        const lab::TetrahedronMesh cameraMesh = lab::transformMesh(
            localMesh,
            pitch,
            yaw,
            {0.0, 0.0, 5.0}
        );
#else
        const lab::TetrahedronMesh cameraMesh = placeStaticMesh(localMesh);
#endif

#if LAB_CHECKPOINT >= 7
        const FrameStats frameStats = drawSolidMesh(
            pixels,
            width,
            height,
            cameraMesh,
            light,
            lightingEnabled
        );
        drawWireFrame(pixels, width, height, cameraMesh, light, lightingEnabled);
        if (normalVisible) {
            drawSelectedNormal(pixels, width, height, cameraMesh, selectedFace);
        }
#else
        drawWireFrame(
            pixels,
            width,
            height,
            cameraMesh
#if LAB_CHECKPOINT >= 3
            ,
            light
#endif
        );
#if LAB_CHECKPOINT >= 2
        drawSelectedNormal(pixels, width, height, cameraMesh, selectedFace);
#endif
#endif

        char title[320]{};
#if LAB_CHECKPOINT >= 7
        const auto selectedVertices = lab::faceVertices(
            cameraMesh,
            cameraMesh.faces[selectedFace]
        );
        const lab::Vec3 selectedNormal = lab::faceUnitNormal(selectedVertices);
        const lab::Material selectedMaterial{
            cameraMesh.faces[selectedFace].baseColor,
            0.16,
            0.84,
        };
        const lab::LightingSample sample = lab::shadeMaterial(
            selectedNormal,
            light,
            selectedMaterial
        );
        const char* lightingName = "off";
        if (lightingEnabled) {
            lightingName = "on";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P19 | face %zu | dot %.3f | diffuse %.3f | intensity %.3f | visible/culled %d/%d | triangles %zu | pixels %zu | light %d | lighting %s | drag WASD 1-4 Tab L N Space . R",
            selectedFace,
            sample.dotValue,
            sample.diffuse,
            sample.intensity,
            frameStats.visibleFaces,
            frameStats.culledFaces,
            frameStats.clippedTriangles,
            frameStats.coveredPixels,
            lightPresetIndex,
            lightingName
        );
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "P19 checkpoint 6 | rotate geometry, recompute normals, cull backs");
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "P19 checkpoint 5 | ambient + diffuse x baseColor");
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P19 checkpoint 4 | diffuse = max(0, dot(N, L))");
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "P19 checkpoint 3 | surfaceToLight preset %d", lightPresetIndex);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "P19 checkpoint 2 | outward unit face normals");
#else
        std::snprintf(title, sizeof(title), "P19 checkpoint 1 | four shared vertices, four indexed faces");
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

    // Cleanup giải phóng tài nguyên theo thứ tự ngược với lúc tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
