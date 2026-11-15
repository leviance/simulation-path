#pragma once
#include "workshop.hpp"
#include <iomanip>
#include <sstream>

namespace wind {
enum class Action { Preset,
                    Overlay,
                    Potential,
                    Resolution,
                    Pause,
                    Step,
                    Reset,
                    Tracers,
                    Clean,
                    Edit,
                    Vortex,
                    Reverse,
                    Verify };

struct Button {
    Action action;
    SDL_FRect bounds;
    const char* label;
};

inline std::vector<Button> buttons() {
    std::vector<Button> result{{Action::Reset, {28, 65, 120, 28}, "R  RESET"}, {Action::Clean, {158, 65, 120, 28}, "F1 VIEW"}};
#if LAB_CHECKPOINT >= 2
    result.push_back({Action::Preset, {28, 22, 162, 28}, "P  PRESET"});
#endif
#if LAB_CHECKPOINT >= 3
    result.push_back({Action::Overlay, {200, 22, 162, 28}, "L  OVERLAY"});
    result.push_back({Action::Potential, {372, 22, 162, 28}, "H  SCALAR"});
#endif
#if LAB_CHECKPOINT >= 6
    result.push_back({Action::Resolution, {544, 22, 162, 28}, "G  GRID"});
#endif
#if LAB_CHECKPOINT >= 7
    result.push_back({Action::Pause, {288, 65, 152, 28}, "SPACE RUN/PAUSE"});
    result.push_back({Action::Step, {450, 65, 120, 28}, "N  STEP"});
    result.push_back({Action::Tracers, {580, 65, 150, 28}, "T  TRACERS"});
#endif
#if LAB_CHECKPOINT >= 8
    result.push_back({Action::Edit, {888, 485, 260, 28}, "M  PROBE / EDIT VORTEX"});
    result.push_back({Action::Vortex, {888, 523, 125, 28}, "B  VORTEX"});
    result.push_back({Action::Reverse, {1023, 523, 125, 28}, "S  REVERSE"});
#endif
#if LAB_CHECKPOINT >= 9
    result.push_back({Action::Verify, {888, 645, 260, 28}, "V  REFERENCE CHECK"});
#endif
    return result;
}

inline bool contains(const SDL_FRect& rect, float x, float y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

inline std::string number(double value, int digits = 4) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(digits) << value;
    return text.str();
}

inline const char* layerName(Layer layer) {
    switch (layer) {
    case Layer::Potential:
        return "SCALAR phi";
    case Layer::Gradient:
        return "GRADIENT phi / magnitude";
    case Layer::Divergence:
        return "DIVERGENCE v";
    case Layer::Curl:
        return "CURL z of v";
    default:
        return "VELOCITY ARROWS";
    }
}

#if LAB_CHECKPOINT >= 2
inline const char* presetName(Preset preset) {
    switch (preset) {
    case Preset::Source:
        return "SOURCE (x, y)";
    case Preset::Sink:
        return "SINK (-x, -y)";
    case Preset::Rotation:
        return "ROTATION (-y, x)";
    case Preset::Shear:
        return "SHEAR (y, 0)";
    case Preset::Gradient:
        return "VELOCITY = GRADIENT phi";
    default:
        return "UNIFORM (1, 0.25)";
    }
}
#endif

inline bool text(SDL_Renderer* renderer, float x, float y, const std::string& value) {
    return SDL_SetRenderDrawColor(renderer, 199, 219, 237, 255) && SDL_RenderDebugText(renderer, x, y, value.c_str());
}

inline bool drawPanel(SDL_Renderer* renderer, const Workshop& app) {
    const SDL_FRect panel{876, 108, 288, 624};
    if (!SDL_SetRenderDrawColor(renderer, 18, 27, 42, 255) || !SDL_RenderFillRect(renderer, &panel)) {
        return false;
    }
    for (const auto& button : buttons()) {
        if (!SDL_SetRenderDrawColor(renderer, 37, 55, 75, 255) || !SDL_RenderFillRect(renderer, &button.bounds) || !text(renderer, button.bounds.x + 8, button.bounds.y + 10, button.label)) {
            return false;
        }
    }
    if (!text(renderer, 888, 121, "WIND MAP / VECTOR INSPECTOR") || !text(renderer, 888, 146, layerName(app.layer))) {
        return false;
    }
#if LAB_CHECKPOINT >= 2
    if (!text(renderer, 888, 168, presetName(app.scene.preset))) {
        return false;
    }
#endif
    if (!text(renderer, 888, 195, "NODES " + std::to_string(app.field.width) + " x " + std::to_string(app.field.height) + " = " + std::to_string(app.field.scalar.size())) || !text(renderer, 888, 212, "dx " + number(app.field.dx) + "  dy " + number(app.field.dy))) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    if (!app.clean) {
        const auto p = world(app.field, app.cursorX, app.cursorY);
        const auto i = app.field.index(app.cursorX, app.cursorY);
        if (!text(renderer, 888, 244, "PROBE " + std::to_string(app.cursorX) + ", " + std::to_string(app.cursorY) + "  index " + std::to_string(i)) || !text(renderer, 888, 263, "x " + number(p.x) + "  y " + number(p.y)) || !text(renderer, 888, 282, "vx " + number(app.field.vx[i], 6)) || !text(renderer, 888, 301, "vy " + number(app.field.vy[i], 6))) {
            return false;
        }
#if LAB_CHECKPOINT >= 3
        if (!text(renderer, 888, 322, "phi " + number(app.field.scalar[i], 6)) || !text(renderer, 888, 341, "grad.x " + number(derivativeX(app.field, app.field.scalar, app.cursorX, app.cursorY), 6)) || !text(renderer, 888, 360, "grad.y " + number(derivativeY(app.field, app.field.scalar, app.cursorX, app.cursorY), 6))) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (!text(renderer, 888, 381, "div v " + number(divergence(app.field, app.cursorX, app.cursorY), 6))) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 5
        // [snippet curl-inspector]
        if (!text(renderer, 888, 400, "curl z " + number(curl(app.field, app.cursorX, app.cursorY), 6))) {
            return false;
        }
        // [/snippet curl-inspector]
#endif
    }
    if (app.clean && !text(renderer, 888, 263, "CLEAN VIEW / F1: inspector")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (!text(renderer, 28, 749, "-2 BLUE       0 DARK       +2 ORANGE    |    SATURATED COLOR != CLAMPED DATA")) {
        return false;
    }
    for (int x = 0; x < 200; ++x) {
        const SDL_Color color = scalarColor(-2 + 4.0 * x / 199);
        if (!SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255) || !SDL_RenderLine(renderer, 888.0F + x, 443, 888.0F + x, 459)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    std::string state = "PAUSED";
    if (!app.paused) {
        state = "RUNNING";
    }
    if (!app.tracers) {
        state = "TRACERS OFF";
    }
    if (!text(renderer, 888, 569, state + "  tick " + std::to_string(app.tick)) || !text(renderer, 888, 588, "t " + number(app.tick * dt, 3) + "s  dropped " + number(app.dropped, 3)) || !text(renderer, 888, 607, "128 tracers / 24 trail samples")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    std::string mode = "MOUSE: PROBE";
    if (app.editVortex) {
        mode = "MOUSE: PLACE VORTEX";
    }
    if (!text(renderer, 888, 470, mode)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (!text(renderer, 888, 687, "Reference: " + app.report)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    std::string scalar = "phi BOWL: (x*x + y*y)/2";
    if (app.scene.potential == Potential::Hill) {
        scalar = "phi HILL: exp(-x*x-y*y)";
    }
    if (!text(renderer, 888, 422, scalar)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (app.scene.preset == Preset::Gradient && !app.scene.vortex) {
        const auto error = gradientError(app.field, app.scene.potential);
        std::ostringstream values;
        values << std::scientific << std::setprecision(3) << "GRAD MAX ERROR | interior " << error.interior << " | boundary " << error.boundary;
        if (!text(renderer, 28, 766, values.str())) {
            return false;
        }
    }
#endif
    return text(renderer, 888, 717, "ARROWS: probe  ENTER: vortex");
}

inline bool drawWorkshop(SDL_Renderer* renderer, const Workshop& app) {
    if (!SDL_SetRenderDrawColor(renderer, 9, 17, 29, 255) || !SDL_RenderClear(renderer)) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    if (!drawField(renderer, app.field, app.layer)) {
        return false;
    }
    if (!app.clean) {
        const Vec2 p = toScreen(world(app.field, app.cursorX, app.cursorY));
        const SDL_FRect marker{static_cast<float>(p.x - 5), static_cast<float>(p.y - 5), 10, 10};
        if (!SDL_SetRenderDrawColor(renderer, 122, 255, 204, 255) || !SDL_RenderRect(renderer, &marker)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (app.tracers && !drawParticles(renderer, app.particles)) {
        return false;
    }
#endif
    return drawPanel(renderer, app);
}
} // namespace wind
