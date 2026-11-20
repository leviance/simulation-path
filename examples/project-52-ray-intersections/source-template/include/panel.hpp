#pragma once
#include "controls.hpp"
#include "instrument-hud.hpp"
#include "validation.hpp"
#include <string>
#include <vector>

namespace picking {
inline std::string vectorText(Vec3 value) {
    return number(value.x) + " " + number(value.y) + " " + number(value.z);
}

struct Button {
    SDL_FRect rect;
    const char* label;
    Action action;
    int value = 0;
    Vec3 delta{};
    bool active = false;
};

inline std::vector<Button> buttons(const Workshop& state) {
    std::vector<Button> result;
    const char* names[]{"1 Plane", "2 Sphere", "3 AABB", "4 Triangle"};
    for (int i = 0; i < 4; ++i) {
        result.push_back({{900.0f + (i % 2) * 142.0f, 68.0f + (i / 2) * 36.0f, 134, 30}, names[i], Action::select, i, {}, state.selected == i});
    }
    const char* labels[]{"X-", "X+", "Y-", "Y+", "Z-", "Z+"};
    const Vec3 deltas[]{{-0.1, 0, 0}, {0.1, 0, 0}, {0, -0.1, 0}, {0, 0.1, 0}, {0, 0, -0.1}, {0, 0, 0.1}};
    for (int i = 0; i < 6; ++i) {
        result.push_back({{900.0f + i * 47.0f, 162, 40, 28}, labels[i], Action::moveObject, 0, deltas[i]});
    }
#if LAB_CHECKPOINT >= 2
    for (int i = 0; i < 6; ++i) {
        result.push_back({{900.0f + i * 47.0f, 234, 40, 28}, labels[i], Action::moveSource, 0, deltas[i]});
    }
    result.push_back({{900, 276, 134, 30}, "F Aim target", Action::aim});
    result.push_back({{1042, 276, 62, 30}, "tMax-", Action::range, -1});
    result.push_back({{1112, 276, 64, 30}, "tMax+", Action::range, 1});
#endif
#if LAB_CHECKPOINT >= 7
    const char* presets[]{"5 Room", "6 In S", "7 In B", "8 Away"};
    for (int i = 0; i < 4; ++i) {
        result.push_back({{900.0f + i * 71.0f, 318, 65, 30}, presets[i], Action::preset, i});
    }
    const char* pauseLabel = "Pause scan";
    if (state.paused) {
        pauseLabel = "Start scan";
    }
    result.push_back({{900, 360, 134, 30}, pauseLabel, Action::pause});
#endif
    result.push_back({{1042, 360, 62, 30}, "Reset", Action::reset});
    result.push_back({{1112, 360, 64, 30}, "Debug", Action::debug, 0, {}, state.debug});
    return result;
}

inline bool panelClick(Workshop& state, float x, float y) {
    for (const auto& button : buttons(state)) {
        if (inside(button.rect, x, y)) {
            perform(state, button.action, button.value, button.delta);
            return true;
        }
    }
    return false;
}

inline void drawPanel(SDL_Renderer* renderer, const Workshop& state) {
    fill(renderer, {880, 0, 320, 760}, {17, 28, 37, 255});
    fill(renderer, {880, 0, 1, 760}, rule);
    letter(renderer, 900, 18, "Bench controls", 1.75f, type);
    letter(renderer, 1132, 23, "ID 52", 1, beamInk);
    letter(renderer, 900, 48, "01   SPECIMEN RACK", 1, muted);
    letter(renderer, 900, 145, "TRANSLATE OBJECT   A/D   Q/E   S/W", 1, muted);
    letter(renderer, 900, 198, "C  " + vectorText(objectCenter(state.scene, state.selected)), 1, muted);
#if LAB_CHECKPOINT >= 2
    letter(renderer, 900, 217, "TRANSLATE SOURCE   J/L   U/O   K/I", 1, muted);
    fill(renderer, {896, 400, 286, 91}, paper);
    letter(renderer, 907, 412, "02   RAY  /  WORLD SPACE", 1, beamInk);
    letter(renderer, 907, 430, "tMin 1e-6  /  tMax " + number(state.tMax), 1, muted);
    letter(renderer, 907, 451, "O  " + vectorText(state.ray().origin), 1.125f, type);
    letter(renderer, 907, 472, "D  " + vectorText(state.ray().direction), 1.125f, type);
#endif
    for (const auto& button : buttons(state)) {
        fill(renderer, button.rect, {37, 52, 63, 255});
        if (button.active) {
            fill(renderer, button.rect, {47, 84, 85, 255});
            fill(renderer, {button.rect.x, button.rect.y, 3, button.rect.h}, beamInk);
        }
        letter(renderer, button.rect.x + 7, button.rect.y + 10, button.label, 1.125f, type);
    }
#if LAB_CHECKPOINT >= 3
    const auto hits = candidates(state.ray(), state.scene);
    const auto hit = hits[state.selected];
    letter(renderer, 900, 500, "03   SELECTED SURFACE", 1, beamInk);
    if (hit) {
        text(renderer, 900, 520, "t=" + number(hit->t));
        text(renderer, 900, 540, "p " + vectorText(hit->point));
        text(renderer, 900, 560, "n " + vectorText(hit->normal));
        std::string face = "frontFace=false";
        if (hit->frontFace) {
            face = "frontFace=true";
        }
        text(renderer, 900, 580, face);
    } else {
        text(renderer, 900, 520, "MISS in the declared range");
    }
    std::string intervalHeading = "SURFACE: no volume interval";
    std::string intervalText = "One plane crossing only";
    if (state.selected == 1 || state.selected == 2) {
        intervalHeading = "GEOMETRIC entry / exit";
        intervalText = "No solid interval at this step";
    }
#if LAB_CHECKPOINT >= 4
    if (state.selected == 1) {
        const auto interval = sphereInterval(state.ray(), state.scene.sphere);
        intervalText = "MISS: no real roots";
        if (interval)
            intervalText = number(interval->entry) + " / " + number(interval->exit);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.selected == 2) {
        const auto interval = boxInterval(state.ray(), state.scene.box);
        intervalText = "MISS: disjoint slabs";
        if (interval)
            intervalText = number(interval->entry) + " / " + number(interval->exit);
    }
#endif
    if (state.selected == 3) {
        intervalHeading = "TRIANGLE: w / u / v";
        intervalText = "No barycentric coordinates";
        if (hit) {
            intervalText = number(1 - hit->u - hit->v) + " / " + number(hit->u) + " / " + number(hit->v);
        }
    }
    letter(renderer, 900, 608, intervalHeading, 1, insideInk);
    text(renderer, 900, 628, intervalText);
#if LAB_CHECKPOINT >= 7
    const auto best = nearestHit(hits);
    std::string nearest = "Nearest: MISS";
    if (best)
        nearest = "Nearest ID " + std::to_string(best->objectId) + "  t=" + number(best->t);
    text(renderer, 900, 660, nearest);
#endif
#if LAB_CHECKPOINT >= 8
    const auto report = validateHits(state.ray(), state.scene, hits);
    text(renderer, 900, 684, "Residual checks " + std::to_string(report.checks) + " fail " + std::to_string(report.failures));
    text(renderer, 900, 704, "Residuals do not prove misses");
#endif
#endif
    fill(renderer, {896, 727, 286, 1}, rule);
    letter(renderer, 900, 740, "R reset   B labels/axes   Esc exit", 1, muted);
}
} // namespace picking
