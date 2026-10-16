#pragma once
#include "controls.hpp"
#include <cstring>
#include <iomanip>
#include <sstream>

namespace voxel {
inline void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

// Frame RGBA8 đã có sẵn; copy theo pitch thật của streaming texture.
inline void upload(SDL_Texture* texture, const Frame& frame) {
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    for (int y = 0; y < imageHeight; ++y) {
        std::memcpy(static_cast<std::uint8_t*>(pixels) + y * pitch, frame.pixels.data() + y * imageWidth, imageWidth * sizeof(Color));
    }
    SDL_UnlockTexture(texture);
}

inline void outline(SDL_Renderer* renderer, Cell cell, const Camera& camera, Color color) {
    require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
    for (const auto& face : faces) {
        for (int i = 0; i < 4; ++i) {
            const auto a = face.at(i);
            const auto b = face.at((i + 1) % 4);
            const auto p = project({a.x + cell[0], a.y + cell[1], a.z + cell[2]}, camera);
            const auto q = project({b.x + cell[0], b.y + cell[1], b.z + cell[2]}, camera);
            require(SDL_RenderLine(renderer, static_cast<float>(p.x * 2), static_cast<float>(p.y * 2), static_cast<float>(q.x * 2), static_cast<float>(q.y * 2)));
        }
    }
}

#if LAB_CHECKPOINT >= 1
inline void drawCrosshair(SDL_Renderer* renderer, int x, int y) {
    require(SDL_SetRenderDrawColor(renderer, 240, 240, 250, 255));
    const float sx = static_cast<float>(x * 2 + 1);
    const float sy = static_cast<float>(y * 2 + 1);
    require(SDL_RenderLine(renderer, sx - 6, sy, sx + 6, sy));
    require(SDL_RenderLine(renderer, sx, sy - 6, sx, sy + 6));
}
#endif

// Lát chiếu XZ chỉ để đọc đường đi; các ô khác y có thể chồng nhau trên inset.
#if LAB_CHECKPOINT >= 2
inline void drawRayInset(SDL_Renderer* renderer, const Editor& state) {
    const SDL_Rect bounds{660, 60, 256, 256};
    require(SDL_SetRenderClipRect(renderer, &bounds));
    require(SDL_SetRenderDrawColor(renderer, 45, 60, 85, 255));
    for (int i = 0; i <= 16; ++i) {
        const float step = static_cast<float>(i * 16);
        require(SDL_RenderLine(renderer, 660 + step, 60, 660 + step, 316));
        require(SDL_RenderLine(renderer, 660, 60 + step, 916, 60 + step));
    }
    if (state.ray.has_value()) {
        const auto a = state.ray->origin;
        const auto b = pointAt(*state.ray, state.reach);
        require(SDL_SetRenderDrawColor(renderer, 255, 185, 90, 255));
        require(SDL_RenderLine(renderer, static_cast<float>(660 + a.x * 16), static_cast<float>(60 + a.z * 16), static_cast<float>(660 + b.x * 16), static_cast<float>(60 + b.z * 16)));
    }
    require(SDL_SetRenderClipRect(renderer, nullptr));
}
#endif

inline void draw(SDL_Renderer* renderer, SDL_Texture* texture, const Editor& state) {
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    const SDL_FRect image{0, 0, 640, 480};
    require(SDL_RenderTexture(renderer, texture, nullptr, &image));
#if LAB_CHECKPOINT >= 1
    drawCrosshair(renderer, state.pixelX, state.pixelY);
#endif
#if LAB_CHECKPOINT >= 4
    const int visible = std::min(state.shown, static_cast<int>(state.trace.visits.size()));
    for (int i = 0; i < visible; ++i) {
        const auto visit = state.trace.visits.at(i);
        require(SDL_SetRenderDrawColor(renderer, 65, 130, 210, 255));
        const SDL_FRect cell{660.0f + visit.cell[0] * 16, 60.0f + visit.cell[2] * 16, 15, 15};
        require(SDL_RenderFillRect(renderer, &cell));
    }
    if (visible > 0) {
        outline(renderer, state.trace.visits.at(visible - 1).cell, state.camera, {80, 160, 255, 255});
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.trace.hit.has_value()) {
        outline(renderer, state.trace.hit->cell, state.camera, {255, 220, 70, 255});
    }
#endif
#if LAB_CHECKPOINT >= 7
    const auto target = placementCell(state.chunk, state.trace.hit);
    if (target.has_value()) {
        outline(renderer, *target, state.camera, {80, 240, 140, 255});
    }
#endif
#if LAB_CHECKPOINT >= 2
    drawRayInset(renderer, state);
    if (state.ray.has_value()) {
        const auto ray = *state.ray;
        std::ostringstream text;
        text << std::fixed << std::setprecision(2) << "O(" << ray.origin.x << "," << ray.origin.y << "," << ray.origin.z << ") D(" << ray.direction.x << "," << ray.direction.y << "," << ray.direction.z << ")";
        require(SDL_SetRenderDrawColor(renderer, 230, 235, 245, 255));
        require(SDL_RenderDebugText(renderer, 12, 470, text.str().c_str()));
    }
#endif
    require(SDL_SetRenderDrawColor(renderer, 230, 235, 245, 255));
    const std::string counts = "solid=" + std::to_string(state.cache.built.solid) + " triangles=" + std::to_string(state.cache.built.mesh.size()) + " aim=(" + std::to_string(state.pixelX) + "," + std::to_string(state.pixelY) + ")";
    require(SDL_RenderDebugText(renderer, 12, 490, counts.c_str()));
#if LAB_CHECKPOINT >= 3
    std::string interval = "MISS / beyond reach";
    if (state.trace.interval.has_value()) {
        interval = "reach=" + std::to_string(state.reach) + " enter=" + std::to_string(state.trace.interval->enter) + " exit=" + std::to_string(state.trace.interval->exit);
    }
    require(SDL_RenderDebugText(renderer, 12, 510, interval.c_str()));
#endif
#if LAB_CHECKPOINT >= 4
    const std::string visits = "DDA cells=" + std::to_string(state.trace.visits.size()) + " shown=" + std::to_string(visible) + " | inset: XZ projection (Y in hit text)";
    require(SDL_RenderDebugText(renderer, 12, 530, visits.c_str()));
    if (visible > 0) {
        const auto visit = state.trace.visits.at(visible - 1);
        const std::string cell = "Visit (" + std::to_string(visit.cell[0]) + "," + std::to_string(visit.cell[1]) + "," + std::to_string(visit.cell[2]) + ") t=" + std::to_string(visit.enter) + ".." + std::to_string(visit.exit);
        require(SDL_RenderDebugText(renderer, 12, 590, cell.c_str()));
    }
#endif
#if LAB_CHECKPOINT >= 5
    std::string hitText = "MISS";
    if (state.trace.hit.has_value()) {
        const auto hit = *state.trace.hit;
        hitText = "HIT (" + std::to_string(hit.cell[0]) + "," + std::to_string(hit.cell[1]) + "," + std::to_string(hit.cell[2]) + ") n=(" + std::to_string(hit.normal[0]) + "," + std::to_string(hit.normal[1]) + "," + std::to_string(hit.normal[2]) + ") t=" + std::to_string(hit.distance);
    }
    require(SDL_RenderDebugText(renderer, 12, 550, hitText.c_str()));
#endif
#if LAB_CHECKPOINT >= 6
    require(SDL_RenderDebugText(renderer, 12, 570, state.message.c_str()));
#endif
#if LAB_CHECKPOINT >= 8
    const std::string work = "rebuild/raster/pick=" + std::to_string(state.cache.rebuilds) + "/" + std::to_string(state.cache.rasterizations) + "/" + std::to_string(state.queries);
    require(SDL_RenderDebugText(renderer, 660, 340, work.c_str()));
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace voxel
