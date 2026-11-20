#pragma once
#include "model.hpp"
#include <SDL3/SDL.h>
#include <string>

namespace photon {
constexpr int viewWidth = 1080;
constexpr int viewHeight = 720;
inline constexpr SDL_FRect mediumRect{70, 150, 540, 360};

inline void require(bool success) {
    if (!success)
        throw std::runtime_error(SDL_GetError());
}

inline SDL_FPoint screen(Point point) {
    // The front glass, source, traces and detector all use the same XY plane.
    return {static_cast<float>(340 + 180 * point[0]), static_cast<float>(330 - 180 * point[1])};
}

#if LAB_CHECKPOINT >= 1
inline SDL_Color tone(SDL_Color a, SDL_Color b, double t) {
    const auto channel = [t](Uint8 first, Uint8 last) {
        return static_cast<Uint8>(std::lround(first + (last - first) * t));
    };
    return {channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b), 255};
}

inline void ink(SDL_Renderer* r, SDL_Color c) {
    require(SDL_SetRenderDrawColor(r, c.r, c.g, c.b, c.a));
}

inline void panel(SDL_Renderer* r, float x, float y, float w, float h, SDL_Color c) {
    ink(r, c);
    const SDL_FRect rect{x, y, w, h};
    require(SDL_RenderFillRect(r, &rect));
}

inline void line(SDL_Renderer* r, float x, float y, float u, float v, SDL_Color c) {
    ink(r, c);
    require(SDL_RenderLine(r, x, y, u, v));
}

inline void label(SDL_Renderer* r, float x, float y, const std::string& text, SDL_Color c, float scale = 1) {
    ink(r, c);
    float oldX, oldY;
    require(SDL_GetRenderScale(r, &oldX, &oldY));
    require(SDL_SetRenderScale(r, oldX * scale, oldY * scale));
    require(SDL_RenderDebugText(r, x / scale, y / scale, text.c_str()));
    require(SDL_SetRenderScale(r, oldX, oldY));
}

inline void quad(SDL_Renderer* r, SDL_FPoint a, SDL_FPoint b, SDL_FPoint c, SDL_FPoint d, SDL_Color topColor, SDL_Color bottomColor) {
    const auto rgba = [](SDL_Color s) {
        return SDL_FColor{s.r / 255.f, s.g / 255.f, s.b / 255.f, 1};
    };
    const SDL_Vertex v[]{{a, rgba(topColor), {}}, {b, rgba(topColor), {}}, {c, rgba(bottomColor), {}}, {d, rgba(bottomColor), {}}};
    const int triangles[]{0, 1, 2, 0, 2, 3};
    require(SDL_RenderGeometry(r, nullptr, v, 4, triangles, 6));
}

inline void stroke(SDL_Renderer* r, SDL_FPoint a, SDL_FPoint b, float width, SDL_Color color) {
    const float dx = b.x - a.x, dy = b.y - a.y;
    const float length = std::hypot(dx, dy);
    if (length < 0.001f)
        return;
    const float ox = -0.5f * width * dy / length, oy = 0.5f * width * dx / length;
    quad(r, {a.x + ox, a.y + oy}, {b.x + ox, b.y + oy}, {b.x - ox, b.y - oy}, {a.x - ox, a.y - oy}, color, color);
}

inline constexpr SDL_Color paper{220, 239, 239, 255}, muted{137, 170, 183, 255}, divider{41, 65, 78, 255};
inline constexpr SDL_Color gold{255, 207, 103, 255}, teal{78, 226, 194, 255}, coral{255, 131, 135, 255}, lilac{198, 161, 236, 255};

// [snippet build-optical-chamber]
inline void paintChamber(SDL_Renderer* r, const Settings& settings) {
    const float x = mediumRect.x, y = mediumRect.y, w = mediumRect.w, h = mediumRect.h;
    // Glass thickness is only a frame. It never extends the simulated medium.
    const double haze = std::clamp(settings.muS / 3, 0.0, 1.0);
    const double absorption = std::clamp(settings.muA / 3, 0.0, 1.0);
    SDL_Color shallow = tone({17, 77, 91, 255}, {70, 130, 128, 255}, haze);
    SDL_Color deep = tone({9, 30, 51, 255}, {39, 75, 90, 255}, haze);
    shallow = tone(shallow, {16, 39, 48, 255}, 0.43 * absorption);
    deep = tone(deep, {10, 24, 36, 255}, 0.43 * absorption);
    quad(r, {x, y}, {x + w, y}, {x + w, y + h}, {x, y + h}, shallow, deep);
    quad(r, {x, y}, {x + 16, y - 13}, {x + w + 16, y - 13}, {x + w, y}, {66, 126, 133, 255}, {26, 66, 80, 255});
    quad(r, {x + w, y}, {x + w + 16, y - 13}, {x + w + 16, y + h - 13}, {x + w, y + h}, {41, 91, 103, 255}, {15, 40, 57, 255});
    for (int i = 1; i < 6; ++i) {
        const float mark = x + w * static_cast<float>(i) / 6;
        for (float v = y + 6; v < y + h - 5; v += 10) {
            const SDL_Color etched = tone(tone(shallow, deep, (v - y) / h), {150, 190, 183, 255}, 0.16);
            line(r, mark, v, mark, v + 2, etched);
        }
    }
    for (int j = 1; j < 4; ++j) {
        const float mark = y + h * static_cast<float>(j) / 4;
        const SDL_Color etched = tone(tone(shallow, deep, (mark - y) / h), {150, 190, 183, 255}, 0.18);
        for (float u = x + 5; u < x + w - 4; u += 12)
            line(r, u, mark, u + 3, mark, etched);
    }
    line(r, x, y, x + w, y, {149, 204, 201, 255});
    line(r, x + 16, y - 13, x + w + 16, y - 13, {113, 169, 175, 255});
    line(r, x, y, x, y + h, {102, 158, 170, 255});
    line(r, x, y + h, x + w, y + h, {76, 118, 135, 255});
    line(r, x + 2, y + 2, x + w - 3, y + 2, tone(shallow, {170, 227, 216, 255}, 0.26));
    panel(r, x - 2, y + h + 1, w + 19, 3, {37, 61, 72, 255});
    for (const float foot : {0.12f, 0.85f}) {
        panel(r, x + w * foot - 6, y + h + 3, 12, 4, {65, 97, 106, 255});
    }
    // launch() picks y in [-0.75,+0.75]; only that part of the aperture emits.
    panel(r, x - 17, y + h / 8 - 6, 16, 3 * h / 4 + 12, {37, 58, 68, 255});
    panel(r, x - 10, y + h / 8, 5, 3 * h / 4, {179, 111, 57, 255});
    panel(r, x - 5, y + h / 8, 4, 3 * h / 4, gold);
    for (const float bolt : {0.16f, 0.84f}) {
        panel(r, x - 15, y + h * bolt, 3, 3, {157, 171, 158, 255});
    }
    for (int bin = 0; bin < 24; ++bin) {
        panel(r, x + w + 2, y + h * (23 - bin) / 24 + 1, 6, h / 24 - 2, {47, 86, 88, 255});
    }
    for (int i = 0; i <= 30; ++i) {
        const float mark = x + w * static_cast<float>(i) / 30;
        float tick = 3;
        if (i % 5 == 0)
            tick = 7;
        line(r, mark, y + h + 8, mark, y + h + 8 + tick, muted);
    }
    label(r, x - 8, y + h + 18, "-1.5", muted);
    label(r, x + w / 2 - 3, y + h + 18, "0", muted);
    label(r, x + w - 34, y + h + 18, "+1.5 x", muted);
}

// [/snippet build-optical-chamber]
#endif
} // namespace photon
