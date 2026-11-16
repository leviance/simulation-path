#pragma once
#include "controls.hpp"
#include "validation.hpp"
#include "view.hpp"
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

namespace picking {
inline void text(SDL_Renderer* renderer, float x, float y, const std::string& value, bool heading = false) {
    float scale = 1.25f;
    if (heading) {
        scale = 1.5f;
    }
    SDL_SetRenderScale(renderer, scale, scale);
    SDL_SetRenderDrawColor(renderer, 211, 226, 239, 255);
    SDL_RenderDebugText(renderer, x / scale, y / scale, value.c_str());
    SDL_SetRenderScale(renderer, 1, 1);
}

inline std::string number(double value) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(3) << value;
    return out.str();
}

inline std::string vectorText(Vec3 value) {
    return number(value.x) + " " + number(value.y) + " " + number(value.z);
}

#if LAB_CHECKPOINT >= 1
inline void drawLabels(SDL_Renderer* renderer, const Workshop& state) {
    const char* labels[]{"PLANE", "SPHERE", "AABB", "TRIANGLE"};
    const Vec3 offsets[]{{-3, 0, -2}, {0, 1.1, 0}, {0, 1.2, 0}, {0, 1.7, 0}};
    for (int id = 0; id < 4; ++id) {
        const Vec3 point = add(objectCenter(state.scene, id), offsets[id]);
        const auto pixel = project(point, state.observer.camera(), sceneWidth, viewHeight);
        if (pixel && pixel->x >= 0 && pixel->x < sceneWidth - 80 && pixel->y >= 120 && pixel->y < viewHeight - 30) {
            text(renderer, static_cast<float>(pixel->x), static_cast<float>(pixel->y), labels[id]);
        }
    }
#if LAB_CHECKPOINT >= 2
    const auto origin = project(state.ray().origin, state.observer.camera(), sceneWidth, viewHeight);
    if (origin && origin->x >= 0 && origin->x < sceneWidth - 100 && origin->y >= 120 && origin->y < 510) {
        text(renderer, static_cast<float>(origin->x + 10), static_cast<float>(origin->y), "EMITTER O");
    }
#endif
}
#endif

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
    SDL_SetRenderDrawColor(renderer, 15, 23, 38, 255);
    const SDL_FRect panel{880, 0, 320, 760};
    SDL_RenderFillRect(renderer, &panel);
    text(renderer, 900, 20, "RAY INSPECTOR / 52", true);
    text(renderer, 900, 46, "Select and translate a target");
    text(renderer, 900, 142, "OBJECT  A/D X  Q/E Y  S/W Z");
    text(renderer, 900, 200, vectorText(objectCenter(state.scene, state.selected)));
#if LAB_CHECKPOINT >= 2
    text(renderer, 900, 216, "SOURCE  J/L X  U/O Y  K/I Z");
    text(renderer, 900, 414, "RAY  tMin=0.000001");
    text(renderer, 900, 434, "tMax=" + number(state.tMax));
    text(renderer, 900, 454, "o " + vectorText(state.ray().origin));
    text(renderer, 900, 474, "d " + vectorText(state.ray().direction));
#endif
    for (const auto& button : buttons(state)) {
        SDL_SetRenderDrawColor(renderer, 30, 45, 65, 255);
        if (button.active) {
            SDL_SetRenderDrawColor(renderer, 43, 87, 107, 255);
        }
        SDL_RenderFillRect(renderer, &button.rect);
        text(renderer, button.rect.x + 5, button.rect.y + 9, button.label);
    }
#if LAB_CHECKPOINT >= 3
    const auto hits = candidates(state.ray(), state.scene);
    const auto hit = hits[state.selected];
    text(renderer, 900, 500, "SELECTED SURFACE");
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
    text(renderer, 900, 608, intervalHeading);
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
    text(renderer, 900, 738, "R reset / B debug / Esc exit");
}
} // namespace picking
