#pragma once
#include "layout.hpp"
#include <SDL3/SDL.h>
#include <iomanip>
#include <sstream>
#include <string>

namespace slices {
using Color = std::array<Uint8, 4>;
inline constexpr Color ink{35, 62, 82, 255};
inline constexpr Color muted{82, 112, 131, 255};
inline constexpr std::array<Color, 3> planeColors{{{76, 214, 225, 255}, {255, 178, 94, 255}, {200, 146, 246, 255}}};

inline std::string number(double value, int precision = 3) {
    std::ostringstream stream;
    stream << std::fixed << std::setprecision(precision) << value;
    return stream.str();
}

// Keep errors sticky: a later successful drawing call must not hide a failure.
struct Painter {
    SDL_Renderer* renderer;
    bool ok = true;
    bool dark = false;

    void color(Color value) {
        ok = SDL_SetRenderDrawColor(renderer, value[0], value[1], value[2], value[3]) && ok;
    }

    void box(Rect rect, Color value, bool filled = true) {
        color(value);
        const SDL_FRect area{static_cast<float>(rect.x), static_cast<float>(rect.y), static_cast<float>(rect.width), static_cast<float>(rect.height)};
        if (filled) {
            ok = SDL_RenderFillRect(renderer, &area) && ok;
        } else {
            ok = SDL_RenderRect(renderer, &area) && ok;
        }
    }

    void line(double x, double y, double endX, double endY, Color value) {
        color(value);
        ok = SDL_RenderLine(renderer, static_cast<float>(x), static_cast<float>(y), static_cast<float>(endX), static_cast<float>(endY)) && ok;
    }

    void text(double x, double y, const std::string& value, Color valueColor = ink, float scale = 1.5f) {
        if (dark && valueColor == ink) {
            valueColor = {219, 234, 245, 255};
        }
        if (dark && valueColor == muted) {
            valueColor = {165, 189, 206, 255};
        }
        color(valueColor);
        ok = SDL_SetRenderScale(renderer, scale, scale) && ok;
        ok = SDL_RenderDebugText(renderer, static_cast<float>(x) / scale, static_cast<float>(y) / scale, value.c_str()) && ok;
        ok = SDL_SetRenderScale(renderer, 1, 1) && ok;
    }

    void button(Rect rect, const std::string& label, bool selected = false) {
        Color background{233, 239, 243, 255};
        if (dark) {
            background = {29, 48, 64, 255};
        }
        if (selected) {
            background = {34, 124, 135, 255};
            if (dark) {
                background = {140, 202, 208, 255};
            }
        }
        box(rect, background);
        box(rect, {58, 81, 104, 255}, false);
        Color foreground = ink;
        if (selected && !dark) {
            foreground = {255, 255, 255, 255};
        }
        if (selected && dark) {
            foreground = {18, 51, 58, 255};
        }
        text(rect.x + 9, rect.y + 10, label, foreground, 1.25f);
    }

    void slider(Rect rect, double normalized, Color tint) {
        const double t = std::clamp(normalized, 0.0, 1.0);
        box({rect.x, rect.y + 8, rect.width, 6}, {38, 54, 75, 255});
        box({rect.x, rect.y + 8, rect.width * t, 6}, tint);
        box({rect.x + rect.width * t - 4, rect.y + 2, 8, 18}, ink);
    }
};
} // namespace slices
