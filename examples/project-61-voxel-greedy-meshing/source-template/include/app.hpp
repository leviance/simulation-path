#pragma once
#include "cache.hpp"
#include "oracle.hpp"
#include "stepper.hpp"
#include <SDL3/SDL.h>
#include <cstring>
#include <string>

namespace voxel {
struct App {
    // Preview của mask tách khỏi mesh 3D và ảnh đã raster.
    int preset = 2;
    int slice = 15;
    int face = 2;
    int plane = 16;
#if LAB_CHECKPOINT >= 5
    bool merge = true;
#else
    bool merge = false;
#endif
    Camera camera;
    Chunk chunk = makeChunk(2);
    Cache cache;
#if LAB_CHECKPOINT >= 2
    Mask mask{};
#endif
#if LAB_CHECKPOINT >= 4
    std::vector<Rectangle> preview;
#endif
#if LAB_CHECKPOINT >= 7
    Stepper stepper;
#endif
};

inline void resetPreview(App& app) {
#if LAB_CHECKPOINT >= 2
    app.mask = makeMask(app.chunk, app.face, app.plane, app.slice);
#endif
#if LAB_CHECKPOINT >= 4
    int comparisons = 0;
    app.preview = extractRectangles(app.mask, app.face, app.plane, comparisons);
#endif
#if LAB_CHECKPOINT >= 7
    app.stepper = {};
#endif
#if LAB_CHECKPOINT < 2
    (void)app;
#endif
}

inline void changeMesh(App& app) {
    app.cache.meshDirty = true;
    resetPreview(app);
}

inline void stop(App& app) {
#if LAB_CHECKPOINT >= 7
    app.stepper.paused = true;
    app.stepper.elapsed = 0;
#else
    (void)app;
#endif
}

inline void keyDown(SDL_Keycode key, App& app) {
    stop(app);
    if (key == SDLK_R) {
        app = App{};
        resetPreview(app);
    }
    if (key == SDLK_P) {
        app.preset = (app.preset + 1) % 9;
        app.chunk = makeChunk(app.preset);
        changeMesh(app);
    }
    if (key == SDLK_LEFT || key == SDLK_RIGHT) {
        double dx = -8;
        if (key == SDLK_RIGHT) {
            dx = 8;
        }
        orbit(app.camera, dx, 0);
        app.cache.frameDirty = true;
    }
    if (key == SDLK_UP || key == SDLK_DOWN) {
        double dy = -8;
        if (key == SDLK_DOWN) {
            dy = 8;
        }
        orbit(app.camera, 0, dy);
        app.cache.frameDirty = true;
    }
    if (key == SDLK_EQUALS || key == SDLK_MINUS) {
        double amount = -1;
        if (key == SDLK_EQUALS) {
            amount = 1;
        }
        zoom(app.camera, amount);
        app.cache.frameDirty = true;
    }
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_F) {
        app.face = (app.face + 1) % 6;
        resetPreview(app);
    }
    if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
        int delta = -1;
        if (key == SDLK_RIGHTBRACKET) {
            delta = 1;
        }
        app.plane = std::clamp(app.plane + delta, 0, 16);
        resetPreview(app);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_M) {
        app.merge = !app.merge;
        changeMesh(app);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_PAGEUP || key == SDLK_PAGEDOWN) {
        int delta = -1;
        if (key == SDLK_PAGEUP) {
            delta = 1;
        }
        app.slice = std::clamp(app.slice + delta, 0, 15);
        changeMesh(app);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_N) {
        next(app.stepper, static_cast<int>(app.preview.size()));
    }
#endif
}

inline void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

inline void upload(SDL_Texture* texture, const Frame& frame) {
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    for (int y = 0; y < imageHeight; ++y) {
        auto* row = static_cast<std::uint8_t*>(pixels) + y * pitch;
        const auto* source = frame.pixels.data() + y * imageWidth;
        std::memcpy(row, source, imageWidth * sizeof(Color));
    }
    SDL_UnlockTexture(texture);
}

inline void draw(SDL_Renderer* renderer, SDL_Texture* texture, const App& app) {
#if LAB_CHECKPOINT < 1
    (void)app;
#endif
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    const SDL_FRect image{0, 30, 640, 480};
    require(SDL_RenderTexture(renderer, texture, nullptr, &image));
    require(SDL_SetRenderDrawColor(renderer, 235, 235, 245, 255));
    require(SDL_RenderDebugText(renderer, 12, 12, "P preset | R reset | arrows orbit | +/- zoom | Esc quit"));
#if LAB_CHECKPOINT >= 1
    const std::string counts = "unit faces=" + std::to_string(app.cache.built.unitFaces) + " quads=" + std::to_string(app.cache.built.quads.size()) + " triangles=" + std::to_string(app.cache.built.mesh.size());
    require(SDL_RenderDebugText(renderer, 12, 520, counts.c_str()));
#endif
#if LAB_CHECKPOINT >= 2
    for (int v = 0; v < side; ++v) {
        for (int u = 0; u < side; ++u) {
            const Color color = faceColor(app.mask[v * side + u], app.face);
            require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
            const SDL_FRect cell{static_cast<float>(680 + u * 16), static_cast<float>(80 + v * 16), 15, 15};
            require(SDL_RenderFillRect(renderer, &cell));
        }
    }
    require(SDL_SetRenderDrawColor(renderer, 235, 235, 245, 255));
    const std::string selected = "face=" + std::to_string(app.face) + " plane=" + std::to_string(app.plane) + " F / [ ]";
    require(SDL_RenderDebugText(renderer, 680, 50, selected.c_str()));
#endif
#if LAB_CHECKPOINT >= 4
    const auto& rectangles = app.preview;
    int count = static_cast<int>(rectangles.size());
#if LAB_CHECKPOINT >= 7
    count = app.stepper.count;
#endif
    require(SDL_SetRenderDrawColor(renderer, 255, 220, 80, 255));
    for (int i = 0; i < count; ++i) {
        const Rectangle& r = rectangles.at(i);
        const SDL_FRect outline{static_cast<float>(680 + r.u * 16), static_cast<float>(80 + r.v * 16), static_cast<float>(r.width * 16), static_cast<float>(r.height * 16)};
        require(SDL_RenderRect(renderer, &outline));
    }
    const std::string progress = "rectangles " + std::to_string(count) + "/" + std::to_string(rectangles.size());
    require(SDL_RenderDebugText(renderer, 680, 360, progress.c_str()));
#if LAB_CHECKPOINT >= 7
    if (count > 0) {
        const Rectangle& r = rectangles.at(count - 1);
        const std::string position = "u=" + std::to_string(r.u) + " v=" + std::to_string(r.v) + " w=" + std::to_string(r.width) + " h=" + std::to_string(r.height);
        require(SDL_RenderDebugText(renderer, 680, 385, position.c_str()));
    }
#endif
#endif
#if LAB_CHECKPOINT >= 5
    require(SDL_SetRenderDrawColor(renderer, 235, 235, 245, 255));
    std::string controls = "M baseline/greedy";
#if LAB_CHECKPOINT >= 6
    controls += " | PageUp/Down cut=" + std::to_string(app.slice);
#endif
#if LAB_CHECKPOINT >= 7
    controls += " | Space play/pause | N next";
#endif
#if LAB_CHECKPOINT >= 9
    controls += " | V verify";
#endif
    require(SDL_RenderDebugText(renderer, 12, 575, controls.c_str()));
#endif
    require(SDL_SetRenderDrawColor(renderer, 235, 235, 245, 255));
#if LAB_CHECKPOINT >= 8
    const std::string work = "rebuilds=" + std::to_string(app.cache.rebuilds) + " raster=" + std::to_string(app.cache.rasterizations) + " samples=" + std::to_string(app.cache.built.samples) + " comparisons=" + std::to_string(app.cache.built.comparisons);
    require(SDL_RenderDebugText(renderer, 12, 550, work.c_str()));
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace voxel
