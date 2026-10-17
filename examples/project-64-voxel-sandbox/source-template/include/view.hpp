#pragma once
#include "controls.hpp"
#include <cstring>

namespace voxel {
// SDL texture là nơi trình bày ảnh CPU; selection overlay không tham gia picking.
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
        std::memcpy(row, frame.pixels.data() + y * imageWidth, imageWidth * sizeof(Color));
    }
    SDL_UnlockTexture(texture);
}

inline ScreenPoint worldProjection(const App& app, Vec3 point) {
    point.x += 8 - app.world.player.x;
    point.z += 8 - app.world.player.z;
    return project(point, app.camera);
}

inline void outline(SDL_Renderer* renderer, const App& app, Cell cell, Color color) {
    std::array<ScreenPoint, 8> points{};
    for (int i = 0; i < 8; ++i) {
        points[i] = worldProjection(app, {static_cast<double>(cell[0] + (i & 1)), static_cast<double>(cell[1] + ((i >> 1) & 1)), static_cast<double>(cell[2] + ((i >> 2) & 1))});
    }
    require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
    for (int i = 0; i < 8; ++i) {
        for (const int bit : {1, 2, 4}) {
            if ((i & bit) == 0) {
                const auto a = points[i];
                const auto b = points[i | bit];
                require(SDL_RenderLine(renderer, static_cast<float>(a.x * 2), static_cast<float>(30 + a.y * 2), static_cast<float>(b.x * 2), static_cast<float>(30 + b.y * 2)));
            }
        }
    }
}

inline void label(SDL_Renderer* renderer, float x, float y, const std::string& text) {
    require(SDL_RenderDebugText(renderer, x, y, text.c_str()));
}

inline void draw(SDL_Renderer* renderer, SDL_Texture* texture, const App& app) {
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    const SDL_FRect image{0, 30, 640, 480};
    require(SDL_RenderTexture(renderer, texture, nullptr, &image));
#if LAB_CHECKPOINT >= 1
    const float x = static_cast<float>((app.aimX + 0.5) * 2);
    const float y = static_cast<float>(30 + (app.aimY + 0.5) * 2);
    require(SDL_SetRenderDrawColor(renderer, 255, 235, 160, 255));
    require(SDL_RenderLine(renderer, x - 5, y, x + 5, y));
    require(SDL_RenderLine(renderer, x, y - 5, x, y + 5));
#endif
#if LAB_CHECKPOINT >= 3
    if (app.trace.hit) {
        outline(renderer, app, app.trace.hit->cell, {255, 220, 120, 255});
        Cell ghost = app.trace.hit->cell;
        for (int i = 0; i < 3; ++i) {
            ghost[i] += app.trace.hit->normal[i];
        }
        if (app.trace.hit->normal != Cell{} && residentBlock(app.world, ghost) == 0 && ghost[1] >= 0 && ghost[1] < 16) {
            outline(renderer, app, ghost, {100, 220, 160, 255});
        }
    }
#endif
    require(SDL_SetRenderDrawColor(renderer, 225, 230, 245, 255));
    label(renderer, 12, 12, "Voxel sandbox: orthographic, no FPS/collision");
    label(renderer, 665, 50, "WASD move | arrows orbit");
    label(renderer, 665, 75, "Mouse aim | middle drag orbit");
    label(renderer, 665, 100, "N step | Space load | R reset");
    label(renderer, 665, 135, "resident=" + std::to_string(app.world.chunks.size()) + " jobs=" + std::to_string(app.world.pending.size()));
    label(renderer, 665, 160, "aim=" + std::to_string(app.aimX) + "," + std::to_string(app.aimY));
#if LAB_CHECKPOINT >= 3
    if (app.trace.hit) {
        const Cell c = app.trace.hit->cell;
        const Cell n = app.trace.hit->normal;
        label(renderer, 665, 190, "hit=" + std::to_string(c[0]) + "," + std::to_string(c[1]) + "," + std::to_string(c[2]));
        label(renderer, 665, 215, "normal=" + std::to_string(n[0]) + "," + std::to_string(n[1]) + "," + std::to_string(n[2]));
    } else {
        std::string status = "No hit within reach";
        if (app.trace.blocked) {
            status = "Unknown chunk blocks picking";
        }
        label(renderer, 665, 190, status);
    }
    label(renderer, 665, 240, "DDA cells=" + std::to_string(app.trace.path.size()));
#endif
#if LAB_CHECKPOINT >= 4
    label(renderer, 665, 280, "Left/F break | right/G place");
    label(renderer, 665, 305, "1 Grass | 2 Dirt | 3 Stone");
    label(renderer, 665, 330, "material=" + std::to_string(static_cast<int>(app.material)));
#endif
#if LAB_CHECKPOINT >= 5
    label(renderer, 665, 365, "deltas=" + std::to_string(app.world.edits.size()) + "/512");
#endif
#if LAB_CHECKPOINT >= 7
    label(renderer, 665, 390, "Z undo=" + std::to_string(app.world.undo.size()) + " Y redo=" + std::to_string(app.world.redo.size()));
#endif
#if LAB_CHECKPOINT >= 8
    label(renderer, 665, 425, "F5 copy VXL1 | Shift+F9 import");
    label(renderer, 665, 450, "Import replaces session/history");
#endif
#if LAB_CHECKPOINT >= 9
    label(renderer, 665, 480, "IJKL aim | P travel presets");
#endif
    label(renderer, 12, 540, "player=" + std::to_string(app.world.player.x) + "," + std::to_string(app.world.player.z));
#if LAB_CHECKPOINT >= 2
    const ViewVolume volume = cameraVolume(app.world, app.camera);
    label(renderer, 665, 515, "near/far=" + std::to_string(static_cast<int>(volume.near)) + "/" + std::to_string(static_cast<int>(volume.far)));
#endif
    label(renderer, 12, 565, "stream meshes=" + std::to_string(app.world.lastMeshes) + " edit rebuilds=" + std::to_string(app.world.editRebuilds));
    label(renderer, 12, 590, "queries=" + std::to_string(app.queries) + " rasters=" + std::to_string(app.rasters));
    label(renderer, 12, 625, app.message);
#if LAB_CHECKPOINT >= 10
    label(renderer, 12, 650, app.auditMessage);
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace voxel
