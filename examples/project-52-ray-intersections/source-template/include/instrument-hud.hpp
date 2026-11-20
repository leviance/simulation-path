#pragma once
#include "view.hpp"
#include <iomanip>
#include <sstream>
#include <string>

namespace picking {
constexpr SDL_Color paper{23, 35, 45, 255};
constexpr SDL_Color rule{65, 87, 95, 255};
constexpr SDL_Color muted{167, 188, 195, 255};
constexpr SDL_Color type{232, 240, 235, 255};
constexpr SDL_Color beamInk{152, 243, 221, 255};
constexpr SDL_Color insideInk{255, 184, 95, 255};
constexpr SDL_Color normalInk{169, 254, 139, 255};

inline void pen(SDL_Renderer* renderer, SDL_Color color) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
}

inline void fill(SDL_Renderer* renderer, SDL_FRect rect, SDL_Color color) {
    pen(renderer, color);
    SDL_RenderFillRect(renderer, &rect);
}

inline void line2D(SDL_Renderer* renderer, float x, float y, float endX, float endY, SDL_Color color) {
    pen(renderer, color);
    SDL_RenderLine(renderer, x, y, endX, endY);
}

inline void letter(SDL_Renderer* renderer, float x, float y, const std::string& value, float scale, SDL_Color color) {
    SDL_SetRenderScale(renderer, scale, scale);
    pen(renderer, color);
    SDL_RenderDebugText(renderer, x / scale, y / scale, value.c_str());
    SDL_SetRenderScale(renderer, 1, 1);
}

inline void text(SDL_Renderer* renderer, float x, float y, const std::string& value, bool heading = false) {
    if (heading) {
        letter(renderer, x, y, value, 1.5f, type);
    } else {
        letter(renderer, x, y, value, 1.25f, type);
    }
}

inline std::string number(double value) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(3) << value;
    return out.str();
}

#if LAB_CHECKPOINT >= 1
inline void drawHeading(SDL_Renderer* renderer) {
    fill(renderer, {20, 23, 4, 56}, beamInk);
    letter(renderer, 34, 23, "OPTICS  /  GEOMETRY SERIES                                  FIELD STATION  52", 1, beamInk);
    letter(renderer, 33, 42, "Ray measurement bench", 2.5f, type);
    letter(renderer, 35, 71, "OBSERVER   /   RMB orbit   /   Shift + RMB pan   /   Wheel zoom", 1, muted);
}

inline void tag(SDL_Renderer* renderer, Pixel pixel, float dx, float dy, const char* name, SDL_Color swatch) {
    const auto x = static_cast<float>(pixel.x);
    const auto y = static_cast<float>(pixel.y);
    const float w = static_cast<float>(std::char_traits<char>::length(name)) * 8 + 18;
    const float left = x + dx;
    const float top = y + dy;
    if (x < 0 || x >= sceneWidth || y < 0 || y >= viewHeight || left < 8 || left + w >= sceneWidth - 4 || top < 90 || top > 625) {
        return;
    }
    if (left < 305 && top > 512) {
        return;
    }
    const float link = std::clamp(x, left + 3, left + w - 3);
    line2D(renderer, x, y, link, top + 10, swatch);
    fill(renderer, {left, top, w, 19}, paper);
    fill(renderer, {left, top, 2, 19}, swatch);
    letter(renderer, left + 8, top + 6, name, 1, type);
}

inline void drawLabels(SDL_Renderer* renderer, const Workshop& state) {
    const auto& scene = state.scene;
    const Vec3 anchors[]{add(scene.plane.point, {-3.2, 0, 0.75}), add(scene.sphere.center, {0, scene.sphere.radius, 0}),
                         {scene.box.maximum.x, scene.box.maximum.y, scene.box.minimum.z}, scene.triangle.c};
    const char* names[]{"01 / DATUM", "02 / SPHERE", "03 / AABB", "04 / SHEET"};
    const SDL_Color swatches[]{{159, 179, 180, 255}, {109, 222, 211, 255}, {244, 178, 98, 255}, {204, 182, 248, 255}};
    const std::array<float, 4> dx{-60, -105, 12, 18};
    const std::array<float, 4> dy{16, -20, -17, -13};
    for (int i = 0; i < 4; ++i) {
        const auto projected = project(anchors[i], state.observer.camera(), sceneWidth, viewHeight);
        if (projected) {
            tag(renderer, *projected, dx[i], dy[i], names[i], swatches[i]);
        }
    }
#if LAB_CHECKPOINT >= 2
    const auto origin = project(state.ray().origin, state.observer.camera(), sceneWidth, viewHeight);
    if (origin) {
        tag(renderer, *origin, -86, -35, "O / SOURCE", beamInk);
    }
#endif
}
#endif

#if LAB_CHECKPOINT >= 2
inline void aimOverlay(SDL_Renderer* renderer, const Workshop& state) {
    fill(renderer, aimHeading, paper);
    fill(renderer, {18, 522, 3, 28}, beamInk);
    letter(renderer, 30, 532, "SOURCE VIEW", 1, beamInk);
    letter(renderer, 153, 532, "DRAG / ARROWS", 1, muted);
    pen(renderer, rule);
    SDL_RenderRect(renderer, &aimRect);
    const float x = aimRect.x + static_cast<float>(state.u) * aimRect.w;
    const float y = aimRect.y + static_cast<float>(state.v) * aimRect.h;
    const SDL_Rect clip{static_cast<int>(aimRect.x), static_cast<int>(aimRect.y), static_cast<int>(aimRect.w), static_cast<int>(aimRect.h)};
    SDL_SetRenderClipRect(renderer, &clip);
    for (int sign : {-1, 1}) {
        line2D(renderer, x + 3 * sign, y, x + 9 * sign, y, type);
        line2D(renderer, x, y + 3 * sign, x, y + 9 * sign, type);
    }
    SDL_SetRenderClipRect(renderer, nullptr);
}

inline void distanceStrip(SDL_Renderer* renderer, const Workshop& state) {
    // This is a ruler in ray parameter t, not a screen-space measurement.
    const Ray ray = state.ray();
    constexpr float left = 346;
    constexpr float right = 835;
    constexpr float y = 692;
    fill(renderer, stripRect, paper);
    fill(renderer, {321, 637, 539, 1}, rule);
    letter(renderer, left, 650, "01 / RAY DISTANCE", 1.25f, type);
    letter(renderer, 648, 652, "UNIT DIRECTION  /  WORLD UNITS", 0.875f, muted);
    const auto along = [&](double t) {
        const double fraction = std::clamp((t - ray.tMin) / (ray.tMax - ray.tMin), 0.0, 1.0);
        return left + static_cast<float>(fraction) * (right - left);
    };
    double stop = ray.tMax;
#if LAB_CHECKPOINT >= 3
    const auto hits = candidates(ray, state.scene);
    auto hit = hits[state.selected];
#if LAB_CHECKPOINT >= 7
    hit = nearestHit(hits);
#endif
    if (hit) {
        stop = hit->t;
    }
#endif
    fill(renderer, {left, y, right - left, 3}, rule);
    fill(renderer, {left, y, along(stop) - left, 3}, beamInk);
#if LAB_CHECKPOINT >= 4
    const auto markInterior = [&](double entry, double exit) {
        if (exit < ray.tMin || entry > ray.tMax) {
            return;
        }
        const float start = along(entry);
        const float end = along(exit);
        fill(renderer, {start, y - 2, std::max(1.0f, end - start), 7}, insideInk);
    };
    if (state.selected == 1) {
        const auto span = sphereInterval(ray, state.scene.sphere);
        if (span) {
            markInterior(span->entry, span->exit);
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.selected == 2) {
        const auto span = boxInterval(ray, state.scene.box);
        if (span) {
            markInterior(span->entry, span->exit);
        }
    }
#endif
    for (int i = 0; i <= 10; ++i) {
        const float tick = left + i * (right - left) / 10;
        line2D(renderer, tick, y + 5, tick, y + 8, rule);
    }
#if LAB_CHECKPOINT >= 3
    if (hit) {
        const float atHit = along(stop);
        line2D(renderer, atHit, y - 11, atHit, y + 2, type);
        fill(renderer, {atHit - 2, y - 13, 5, 4}, type);
    }
#endif
    letter(renderer, left, y - 17, "O", 1, muted);
    letter(renderer, right - 81, y - 17, "tMax " + number(ray.tMax), 1, muted);
    letter(renderer, left, 715, "INCIDENT RAY", 1, beamInk);
#if LAB_CHECKPOINT >= 3
    letter(renderer, 520, 715, "NORMAL", 1, normalInk);
#endif
#if LAB_CHECKPOINT >= 4
    letter(renderer, 647, 715, "INSIDE SELECTED SOLID", 1, insideInk);
#endif
}
#endif
} // namespace picking
