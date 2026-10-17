#pragma once
#include "controls.hpp"
#include <cstring>
#include <string>

namespace voxel {
inline void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

inline void upload(SDL_Texture* texture, const Frame& frame) {
    // Pitch theo byte có thể lớn hơn chiều rộng ảnh, nên copy từng hàng.
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    for (int y = 0; y < imageHeight; ++y) {
        auto* row = static_cast<std::uint8_t*>(pixels) + y * pitch;
        std::memcpy(row, frame.pixels.data() + y * imageWidth, imageWidth * sizeof(Color));
    }
    SDL_UnlockTexture(texture);
}

inline Key mapKey(const App& app, int u, int v) {
    const Key center = centerOf(app.world.player);
    return {center.x + u - 3, center.z + v - 3};
}

inline void draw(SDL_Renderer* renderer, SDL_Texture* texture, const App& app) {
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    const SDL_FRect image{0, 30, 640, 480};
    require(SDL_RenderTexture(renderer, texture, nullptr, &image));
#if LAB_CHECKPOINT >= 1
    const ScreenPoint p = project({8, 4.2, 8}, app.camera);
    const SDL_FRect marker{static_cast<float>(p.x * 2 - 3), static_cast<float>(30 + p.y * 2 - 3), 6, 6};
    require(SDL_SetRenderDrawColor(renderer, 255, 100, 120, 255));
    require(SDL_RenderFillRect(renderer, &marker));
#endif
    for (int v = 0; v < 7; ++v) {
        for (int u = 0; u < 7; ++u) {
            const Key key = mapKey(app, u, v);
            Color color{24, 34, 52, 255};
            if (app.world.chunks.contains(key)) {
                color = {195, 140, 55, 255};
                if (distance(key, targetCenter(app.world)) <= loadRadius(app.world)) {
                    color = {65, 160, 120, 255};
                }
            }
#if LAB_CHECKPOINT >= 5
            for (const Job& job : app.world.pending) {
                if (job.key == key && job.load) {
                    color = {70, 110, 195, 255};
                }
            }
#endif
            require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
            const SDL_FRect cell{static_cast<float>(680 + u * 32), static_cast<float>(100 + v * 32), 30, 30};
            require(SDL_RenderFillRect(renderer, &cell));
            if (key == app.selected) {
                require(SDL_SetRenderDrawColor(renderer, 255, 235, 140, 255));
                require(SDL_RenderRect(renderer, &cell));
            }
        }
    }
#if LAB_CHECKPOINT >= 1
    double localX = app.world.player.x;
    double localZ = app.world.player.z;
#if LAB_CHECKPOINT >= 2
    localX = splitAxis(app.world.player.x).local;
    localZ = splitAxis(app.world.player.z).local;
#endif
    const SDL_FRect playerDot{static_cast<float>(680 + (3 + localX / 16) * 32 - 2), static_cast<float>(100 + (3 + localZ / 16) * 32 - 2), 4, 4};
    require(SDL_SetRenderDrawColor(renderer, 255, 100, 120, 255));
    require(SDL_RenderFillRect(renderer, &playerDot));
#endif
    require(SDL_SetRenderDrawColor(renderer, 235, 235, 245, 255));
    require(SDL_RenderDebugText(renderer, 12, 12, "WASD move | arrows/drag orbit | +/- zoom | R reset | Esc quit"));
    const std::string player = "player=(" + std::to_string(app.world.player.x) + "," + std::to_string(app.world.player.z) + ") resident=" + std::to_string(app.world.chunks.size());
    require(SDL_RenderDebugText(renderer, 12, 520, player.c_str()));
    const std::string selected = "selected=(" + std::to_string(app.selected.x) + "," + std::to_string(app.selected.z) + ")";
    require(SDL_RenderDebugText(renderer, 680, 70, selected.c_str()));
    require(SDL_RenderDebugText(renderer, 680, 340, "green wanted | amber kept"));
    require(SDL_RenderDebugText(renderer, 680, 360, "blue queued | IJKL select"));
#if LAB_CHECKPOINT >= 2
    const auto x = splitAxis(app.world.player.x);
    const auto z = splitAxis(app.world.player.z);
    const std::string location = "chunk=(" + std::to_string(x.chunk) + "," + std::to_string(z.chunk) + ") local=(" + std::to_string(x.local) + "," + std::to_string(z.local) + ")";
    require(SDL_RenderDebugText(renderer, 12, 540, location.c_str()));
#endif
#if LAB_CHECKPOINT >= 4
    const auto found = app.world.chunks.find(app.selected);
    if (found != app.world.chunks.end()) {
        const std::string hash = "hash=" + std::to_string(hashChunk(found->second.blocks));
        require(SDL_RenderDebugText(renderer, 680, 385, hash.c_str()));
    }
#endif
#if LAB_CHECKPOINT >= 5
    const std::string queue = "jobs=" + std::to_string(app.world.pending.size()) + " loads/unloads=" + std::to_string(app.world.loads) + "/" + std::to_string(app.world.unloads) + " N step | Space play | B budget";
    require(SDL_RenderDebugText(renderer, 12, 560, queue.c_str()));
#endif
#if LAB_CHECKPOINT >= 8
    const std::string work = "last jobs/meshes=" + std::to_string(app.world.lastJobs) + "/" + std::to_string(app.world.lastMeshes) + " rebuild/raster=" + std::to_string(app.world.rebuilds) + "/" + std::to_string(app.rasterizations);
    require(SDL_RenderDebugText(renderer, 12, 580, work.c_str()));
#endif
#if LAB_CHECKPOINT >= 6
    const std::string rings = "G radius=" + std::to_string(app.world.radius) + " keep=" + std::to_string(keepRadius(app.world));
    require(SDL_RenderDebugText(renderer, 680, 410, rings.c_str()));
#endif
#if LAB_CHECKPOINT >= 9
    std::string route = "T route off | E teleport";
    if (app.autoTravel) {
        route = "T route ON | E teleport";
    }
    require(SDL_RenderDebugText(renderer, 680, 430, route.c_str()));
#endif
#if LAB_CHECKPOINT >= 10
    require(SDL_RenderDebugText(renderer, 680, 450, "V current bounds audit"));
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace voxel
