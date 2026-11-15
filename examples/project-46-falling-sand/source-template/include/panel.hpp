#pragma once

#include "commands.hpp"
#include "view.hpp"
#include "workshop.hpp"
#include <iomanip>
#include <sstream>

namespace sand {

struct Button {
    Rect rectangle;
    const char* label;
    Action action;
};

inline const std::array<Button, 14>& buttons() {
    static const std::array<Button, 14> items{{
        {{24, 68, 92, 28}, "1 SAND", Action::Sand},
        {{124, 68, 92, 28}, "2 WALL", Action::Wall},
        {{224, 68, 92, 28}, "3 WATER", Action::Water},
        {{324, 68, 92, 28}, "4 ERASE", Action::Erase},
        {{436, 68, 92, 28}, "SPACE RUN", Action::Run},
        {{536, 68, 92, 28}, "N STEP", Action::Step},
        {{636, 68, 100, 28}, "SPEED +", Action::Speed},
        {{744, 68, 112, 28}, "R RESET", Action::Reset},
        {{892, 130, 192, 28}, "P NEXT PRESET", Action::Preset},
        {{892, 166, 192, 28}, "K CLEAR", Action::Clear},
        {{892, 202, 192, 28}, "B NEXT SEED", Action::Seed},
        {{892, 238, 192, 28}, "O SCAN ORDER", Action::Order},
        {{892, 294, 92, 28}, "[ SMALLER", Action::RadiusLess},
        {{992, 294, 92, 28}, "] LARGER", Action::RadiusMore},
    }};
    return items;
}

inline Action hitPanel(float x, float y) {
    for (const Button& button : buttons()) {
        const Rect r = button.rectangle;
        if (x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height) {
            return button.action;
        }
    }
    return Action::None;
}

inline void text(SDL_Renderer* renderer, float x, float y, const std::string& value, Rgba color = {209, 219, 235, 255}) {
    setColor(renderer, color);
    requireSdl(SDL_RenderDebugText(renderer, x, y, value.c_str()), "panel text");
}

inline std::string decimal(double value) {
    std::ostringstream result;
    result << std::fixed << std::setprecision(2) << value;
    return result.str();
}

#if LAB_CHECKPOINT >= 7
inline void drawPanel(SDL_Renderer* renderer, const Grid& grid, const Workshop& state) {
    text(renderer, 24, 25, "FALLING SAND / CELLULAR WORKSHOP", {235, 201, 131, 255});
    text(renderer, 24, 45, "Local swaps. Closed boundaries. Toy water - not a fluid solver.");
    std::string status = "PAUSED";
    if (!state.paused) {
        status = "RUNNING";
    }
    text(renderer, 892, 25, status, {104, 213, 182, 255});
    text(renderer, 892, 45, "30 ticks/s x " + decimal(state.speed()));
#if LAB_CHECKPOINT >= 8
    for (const Button& button : buttons()) {
        const Rect r = button.rectangle;
        const SDL_FRect rectangle{r.x, r.y, r.width, r.height};
        setColor(renderer, {28, 39, 57, 255});
        const bool selected = (button.action == Action::Sand && state.material == Cell::Sand) || (button.action == Action::Wall && state.material == Cell::Wall) || (button.action == Action::Water && state.material == Cell::Water) || (button.action == Action::Erase && state.material == Cell::Empty) || (button.action == Action::Run && !state.paused);
        if (selected) {
            setColor(renderer, {77, 68, 43, 255});
        }
        requireSdl(SDL_RenderFillRect(renderer, &rectangle), "panel button");
        std::string label = button.label;
        if (button.action == Action::Run && !state.paused) {
            label = "SPACE PAUSE";
        }
        text(renderer, r.x + 8, r.y + 10, label);
    }
#else
    text(renderer, 24, 78, "SPACE run/pause | N tick | 1 sand 2 wall 3 water 4 erase | [ ] brush");
#endif
    text(renderer, 892, 275, "BRUSH: " + std::string(brushName(state.material)) + " r=" + std::to_string(state.radius));
    text(renderer, 892, 348, "INSPECTOR", {235, 201, 131, 255});
    float y = 380;
    const auto counts = countMaterials(grid);
    auto row = [&](const std::string& value) {
        text(renderer, 892, y, value);
        y += 20;
    };
    row(std::to_string(grid.width) + " x " + std::to_string(grid.height) + " CELLS");
    row("TICK " + std::to_string(grid.tick));
    row("SAND " + std::to_string(counts[2]));
    row("WATER " + std::to_string(counts[3]));
    row("WALL " + std::to_string(counts[1]));
    row("VISITED " + std::to_string(state.stats.visited));
    row("SWAPS " + std::to_string(state.stats.swaps));
    row("UPDATE " + decimal(state.updateMs) + "ms");
    row("UPLOAD " + decimal(state.uploadMs) + "ms CPU");
    row("SUBMIT " + decimal(state.submitMs) + "ms CPU");
    row("DROPPED " + decimal(state.dropped) + "s");
    text(renderer, 24, 654, "RESET PRESET: " + std::string(presetName(state.preset)) + " | SEED " + std::to_string(state.seed));
    text(renderer, 24, 675, orderName(state.order));
    text(renderer, 24, 696, state.message, {104, 213, 182, 255});
    text(renderer, 24, 729, "F1 clean | F2 flat/shaded | right mouse erase | arrows + Enter paint | V check | Esc quit");
    const std::string cursor = "CELL " + std::to_string(state.cursorX) + "," + std::to_string(state.cursorY);
    text(renderer, 470, 654, cursor + " INDEX " + std::to_string(grid.index(state.cursorX, state.cursorY)));
    text(renderer, 470, 675, "CONTENTS " + std::string(materialName(grid.at(state.cursorX, state.cursorY))));
}

inline void drawCursor(SDL_Renderer* renderer, const Grid& grid, const Workshop& state) {
    const Rect view = sceneRect(grid, state.showcase);
    const float scale = view.width / grid.width;
    const float radius = static_cast<float>(state.radius);
    const SDL_FRect brush{view.x + (state.cursorX - radius) * scale, view.y + (state.cursorY - radius) * scale, (radius * 2 + 1) * scale, (radius * 2 + 1) * scale};
    const SDL_FRect clip{view.x, view.y, view.width, view.height};
    const SDL_Rect clipPixels{static_cast<int>(clip.x), static_cast<int>(clip.y), static_cast<int>(clip.w), static_cast<int>(clip.h)};
    requireSdl(SDL_SetRenderClipRect(renderer, &clipPixels), "clip cursor to scene");
    setColor(renderer, {236, 225, 195, 255});
    requireSdl(SDL_RenderRect(renderer, &brush), "brush outline");
    requireSdl(SDL_SetRenderClipRect(renderer, nullptr), "restore clip");
}
#endif

} // namespace sand
