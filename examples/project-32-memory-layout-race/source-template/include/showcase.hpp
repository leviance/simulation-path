#pragma once
#include "inspection.hpp"
#include <SDL3/SDL.h>

namespace project32 {
// SDL_RenderDebugText chỉ có bộ chữ ASCII; bài học giải thích các nhãn trên ảnh.
inline void putLabel(SDL_Renderer* r, float x, float y, const char* text, bool accent = false) {
    if (accent) SDL_SetRenderDrawColor(r, 127, 226, 221, 255);
    else SDL_SetRenderDrawColor(r, 164, 187, 202, 255);
    SDL_RenderDebugText(r, x, y, text);
}

inline void drawShowcase(SDL_Renderer* r, const lab::Simulation& sim, const lab::RenderStats& drawn, double renderMs) {
    const float top = float(lab::Framebuffer::viewHeight);
    const SDL_FRect footer{0, top, 1120, 820 - top};
    SDL_SetRenderDrawColor(r, 11, 16, 32, 255);
    SDL_RenderFillRect(r, &footer);
    putLabel(r, 26, top + 14, "FIELD NOTES   /   32                     PARTICLE SYSTEMS   /   CPU");
    float scaleX = 1, scaleY = 1;
    SDL_GetRenderScale(r, &scaleX, &scaleY);
    SDL_SetRenderScale(r, scaleX * 2, scaleY * 2);
    SDL_SetRenderDrawColor(r, 234, 223, 202, 255);
    SDL_RenderDebugText(r, 13, (top + 36) / 2, "Particle fountain  /  A water jet");
    SDL_SetRenderScale(r, scaleX, scaleY);
    const char* motion = "PAUSED";
    if (!sim.paused) motion = "RUNNING";
    const char* layout = "AoS";
    if (sim.layout == lab::Layout::soa) layout = "SoA";
    SDL_SetRenderDrawColor(r, 196, 216, 234, 255);
    SDL_RenderDebugTextFormat(r, 26, top + 68, "%zu alive   :   %zu updated / step   :   %zu visible / %zu samples   :   %s   :   %s", sim.active, sim.committedUpdated, drawn.rendered, drawn.sampled, layout, motion);
    SDL_RenderDebugTextFormat(r, 26, top + 89, "t %.3f s   |   spread %.1f m/s   |   update %.3f ms   |   last raster + upload %.3f ms", sim.time, sim.config.spread, sim.updateMs, renderMs);
    putLabel(r, 26, top + 120, "F1  Oblique      F2  Plan      F3  Profile      |      Drag to orbit / pan       Wheel to zoom");
#if LAB_CHECKPOINT >= 8
    putLabel(r, 26, top + 145, "Space  Run / pause      N  One step      U  Follow next birth      L  AoS / SoA      F  All controls");
#elif LAB_CHECKPOINT >= 2
    putLabel(r, 26, top + 145, "Space  Run / pause      N  One step      , / .  Spread      R  Reset      F  All controls");
#else
    putLabel(r, 26, top + 145, "Static snapshot: orbit around the drops. Physics starts at checkpoint 02. F  All controls");
#endif
}

#if LAB_CHECKPOINT >= 8
inline void drawInspection(SDL_Renderer* r, const lab::Simulation& sim, const lab::Camera& camera, const lab::Framebuffer& image, std::size_t slot) {
    const auto drop = lab::readSlot(sim, slot);
    const SDL_FRect card{18, 68, 312, 88};
    SDL_SetRenderDrawColor(r, 13, 34, 45, 255);
    SDL_RenderFillRect(r, &card);
    putLabel(r, 30, 80, "SLOT INSPECTOR  /  I CLOSE", true);
    if (!drop) {
        putLabel(r, 30, 108, "Waiting for the next emission.");
        return;
    }
    SDL_RenderDebugTextFormat(r, 30, 102, "ID %u   GENERATION %u", drop->id, drop->generation);
    SDL_RenderDebugTextFormat(r, 30, 119, "AGE %.4f / %.4f s", drop->age, drop->lifetime);
    if (drop->positionY < lab::fountainFloorY) {
        putLabel(r, 30, 136, "Below grid: alive, out of sight");
        return;
    }
    SDL_RenderDebugTextFormat(r, 30, 136, "HEIGHT %.2f m   VY %+.2f m/s", drop->positionY, drop->velocityY);
    const auto p = lab::projectPoint({drop->positionX, drop->positionY, drop->positionZ}, camera, image.width, image.height);
    if (!p.visible) return;
    // Bốn vạch ngắn chừa tâm trống để còn nhìn thấy chính giọt đang theo dõi.
    SDL_SetRenderDrawColor(r, 255, 214, 127, 255);
    SDL_RenderLine(r, float(p.x - 11), float(p.y), float(p.x - 4), float(p.y));
    SDL_RenderLine(r, float(p.x + 4), float(p.y), float(p.x + 11), float(p.y));
    SDL_RenderLine(r, float(p.x), float(p.y - 11), float(p.x), float(p.y - 4));
    SDL_RenderLine(r, float(p.x), float(p.y + 4), float(p.x), float(p.y + 11));
}
#endif
} // namespace project32
