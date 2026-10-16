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

// Pitch của texture khóa có thể khác width*4, nên copy từng hàng.
inline void upload(SDL_Texture* texture, const Frame& frame) {
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    for (int y = 0; y < imageHeight; ++y) {
        auto* row = static_cast<std::uint8_t*>(pixels) + y * pitch;
        std::memcpy(row, frame.pixels.data() + y * imageWidth, imageWidth * sizeof(Color));
    }
    SDL_UnlockTexture(texture);
}

inline void draw(SDL_Renderer* renderer, SDL_Texture* texture, const Controls& state) {
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    const SDL_FRect image{0, 0, 640, 480};
    require(SDL_RenderTexture(renderer, texture, nullptr, &image));
    std::string mode = "all six faces";
    if (state.culled) {
        mode = "neighbor-face elimination";
    }
    require(SDL_SetRenderDrawColor(renderer, 230, 235, 245, 255));
    const auto& built = state.cache.built;
    const std::string counts = mode + " | active solid=" + std::to_string(built.solid) + " faces=" + std::to_string(built.keys.size()) + " triangles=" + std::to_string(built.mesh.size());
    require(SDL_RenderDebugText(renderer, 12, 490, counts.c_str()));
    const std::string work = "baseline triangles=" + std::to_string(12 * built.solid) + " neighbor checks=" + std::to_string(built.neighborChecks);
    require(SDL_RenderDebugText(renderer, 12, 510, work.c_str()));
#if LAB_CHECKPOINT >= 6
    for (int z = 0; z < side; ++z) {
        for (int x = 0; x < side; ++x) {
            const auto block = get(state.chunk, x, state.selected[1], z);
            const Color color = faceColor(static_cast<int>(block), 2);
            require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
            const SDL_FRect cell{static_cast<float>(panelX + x * cellSize), static_cast<float>(panelY + z * cellSize), 15, 15};
            require(SDL_RenderFillRect(renderer, &cell));
        }
    }
    const SDL_FRect marker{static_cast<float>(panelX + state.selected[0] * cellSize), static_cast<float>(panelY + state.selected[2] * cellSize), 16, 16};
    require(SDL_SetRenderDrawColor(renderer, 255, 220, 80, 255));
    require(SDL_RenderRect(renderer, &marker));
    const auto [x, y, z] = state.selected;
    const std::string selected = "cell=(" + std::to_string(x) + "," + std::to_string(y) + "," + std::to_string(z) + ") face=" + std::to_string(state.face) + " slice=" + std::to_string(state.slice);
    require(SDL_RenderDebugText(renderer, 12, 530, selected.c_str()));
    const auto decision = "Culling rule: " + inspectFace(state.chunk, state.selected, state.face, state.slice);
    require(SDL_RenderDebugText(renderer, 12, 550, decision.c_str()));
#endif
#if LAB_CHECKPOINT >= 7
    const std::string cache = "rebuilds=" + std::to_string(state.cache.rebuilds) + " rasterizations=" + std::to_string(state.cache.rasterizations);
    require(SDL_RenderDebugText(renderer, 12, 570, cache.c_str()));
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace voxel
