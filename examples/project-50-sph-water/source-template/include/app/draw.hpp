#pragma once
#include "state.hpp"
#include <SDL3/SDL.h>
#include <iomanip>
#include <sstream>

namespace tank {
inline constexpr SDL_FRect viewport{24, 108, 900, 540};

inline std::string number(double value, int digits = 3) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << value;
    return out.str();
}

inline void text(SDL_Renderer* renderer, float x, float y, const std::string& label, SDL_Color color = {166, 190, 212, 255}) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_RenderDebugText(renderer, x, y, label.c_str());
}

// [snippet disk]
inline void disk(SDL_Renderer* renderer, float x, float y, float radius) {
    for (int dy = -static_cast<int>(radius); dy <= static_cast<int>(radius); ++dy) {
        const float span = std::sqrt(std::max(0.0f, radius * radius - dy * dy));
        SDL_RenderLine(renderer, x - span, y + dy, x + span, y + dy);
    }
}

// [/snippet disk]

// [snippet mapping]
inline water::Vec2 toScreen(double x, double y) {
    return {viewport.x + viewport.w * x / water::width, viewport.y + viewport.h * (1 - y / water::height)};
}

inline bool fromScreen(float x, float y, water::Vec2& point) {
    if (x < viewport.x || x > viewport.x + viewport.w || y < viewport.y || y > viewport.y + viewport.h) {
        return false;
    }
    point.x = water::width * (x - viewport.x) / viewport.w;
    point.y = water::height * (1 - (y - viewport.y) / viewport.h);
    return true;
}

// [/snippet mapping]
enum class Action {
    Pause,
    Step,
    Reset,
    Scene,
    Count,
    View,
    Tool,
    Pour,
    Paddle,
    Debug,
    Verify
};

struct Button {
    Action action;
    SDL_FRect bounds;
    std::string label;
};

inline std::vector<Button> buttons() {
    std::vector<Button> list = {{Action::Reset, {1130, 32, 126, 32}, "R  RESET"}, {Action::Debug, {956, 488, 300, 30}, "F1  CLEAN / DEBUG"}};
#if LAB_CHECKPOINT >= 2
    list.push_back({Action::Step, {1110, 108, 146, 32}, "N  ONE STEP"});
#endif
#if LAB_CHECKPOINT >= 8
    list.push_back({Action::Pause, {956, 108, 144, 32}, "SPACE  RUN/PAUSE"});
#endif
    list.push_back({Action::Scene, {956, 150, 300, 32}, "P  CHANGE SCENE"});
#if LAB_CHECKPOINT >= 9
    list.push_back({Action::Count, {956, 192, 300, 32}, "G  1000 / 5000 / 10000"});
    list.push_back({Action::View, {956, 234, 300, 32}, "L  SURFACE / DATA"});
#endif
#if LAB_CHECKPOINT >= 10
    list.push_back({Action::Tool, {956, 276, 144, 32}, "M  MOUSE TOOL"});
    list.push_back({Action::Pour, {1110, 276, 146, 32}, "E  POUR ON/OFF"});
#endif
#if LAB_CHECKPOINT >= 11
    list.push_back({Action::Paddle, {956, 530, 300, 30}, "O  PADDLE ON/OFF"});
#endif
#if LAB_CHECKPOINT >= 12
    list.push_back({Action::Verify, {956, 572, 300, 30}, "V  INDEPENDENT CHECK"});
#endif
    return list;
}

inline bool contains(const SDL_FRect& rect, float x, float y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

inline void draw(App& app, SDL_Renderer* renderer, SDL_Texture* texture) {
    SDL_SetRenderDrawColor(renderer, 7, 12, 21, 255);
    SDL_RenderClear(renderer);
    text(renderer, 24, 34, "SPH 2D / WATER TANK", {113, 211, 255, 255});
    std::string mode = "PARTICLES";
    if (app.view == View::Surface)
        mode = "WATER SURFACE";
    if (app.view == View::Density)
        mode = "DENSITY / rho0";
    if (app.view == View::Pressure)
        mode = "PRESSURE (N/m)";
    if (app.view == View::Speed)
        mode = "SPEED (m/s)";
    std::string status = "PAUSED";
    if (!app.paused)
        status = "RUNNING";
    std::string scene = "DAM-BREAK";
    if (app.preset == water::Preset::Pool)
        scene = "POOL";
    if (app.preset == water::Preset::Obstacle)
        scene = "OBSTACLE";
    if (app.preset == water::Preset::Empty)
        scene = "EMPTY";
    text(renderer, 24, 66, std::to_string(app.state.particles.size()) + " PARTICLES   /   " + mode + "   /   " + status);
    text(renderer, 24, 84, "SCENE: " + scene);
    SDL_SetRenderDrawColor(renderer, 9, 18, 31, 255);
    SDL_RenderFillRect(renderer, &viewport);
#if LAB_CHECKPOINT >= 9
    if (app.view == View::Surface) {
        if (app.dirty) {
            water::reconstruct(app.state, app.surface);
            water::shade(app.surface);
            SDL_UpdateTexture(texture, nullptr, app.surface.rgba.data(), app.surface.w * 4);
        }
        SDL_RenderTexture(renderer, texture, nullptr, &viewport);
    }
#else
    static_cast<void>(texture);
#endif
    if (app.view != View::Surface) {
        // [snippet draw-particles]
        for (const auto& p : app.state.particles) {
            const auto point = toScreen(p.x, p.y);
#if LAB_CHECKPOINT >= 9
            double value = 0;
            if (app.view == View::Density)
                value = std::clamp((p.density / water::restDensity - 0.85) / 0.30, 0.0, 1.0);
            if (app.view == View::Pressure)
                value = std::clamp(p.pressure / 60000, 0.0, 1.0);
            if (app.view == View::Speed)
                value = std::clamp(std::hypot(p.vx, p.vy) / 8, 0.0, 1.0);
            SDL_SetRenderDrawColor(renderer, static_cast<Uint8>(40 + 215 * value), static_cast<Uint8>(170 - 70 * value), static_cast<Uint8>(239 - 180 * value), 255);
#else
            SDL_SetRenderDrawColor(renderer, 40, 170, 239, 255);
#endif
            disk(renderer, static_cast<float>(point.x), static_cast<float>(point.y), 2.2f);
        }
        // [/snippet draw-particles]
        app.surface.drawn = app.state.particles.size();
    }
    if (app.state.paddle.enabled) {
        const auto center = toScreen(app.state.paddle.x, app.state.paddle.y);
        const float radius = static_cast<float>(viewport.w * app.state.paddle.radius / water::width);
        SDL_SetRenderDrawColor(renderer, 119, 151, 174, 255);
        disk(renderer, static_cast<float>(center.x), static_cast<float>(center.y), radius);
        SDL_SetRenderDrawColor(renderer, 26, 43, 60, 255);
        disk(renderer, static_cast<float>(center.x), static_cast<float>(center.y), radius - 3);
        const auto target = toScreen(app.state.paddle.targetX, app.state.paddle.targetY);
        SDL_SetRenderDrawColor(renderer, 255, 190, 102, 255);
        SDL_RenderLine(renderer, static_cast<float>(center.x), static_cast<float>(center.y), static_cast<float>(target.x), static_cast<float>(target.y));
    }
    SDL_SetRenderDrawColor(renderer, 77, 113, 144, 255);
    SDL_RenderRect(renderer, &viewport);
    if (app.debug && app.selected < app.state.particles.size()) {
        const auto& p = app.state.particles[app.selected];
        const auto center = toScreen(p.x, p.y);
        SDL_SetRenderDrawColor(renderer, 255, 204, 121, 255);
        const float radius = static_cast<float>(viewport.w * water::support / water::width);
        for (int k = 0; k < 90; ++k) {
            const double a = k * 2 * std::numbers::pi / 90;
            const double b = (k + 1) * 2 * std::numbers::pi / 90;
            SDL_RenderLine(renderer, static_cast<float>(center.x + radius * std::cos(a)), static_cast<float>(center.y + radius * std::sin(a)), static_cast<float>(center.x + radius * std::cos(b)), static_cast<float>(center.y + radius * std::sin(b)));
        }
        text(renderer, 24, 700, "ID " + std::to_string(app.selected) + "   rho/rho0 " + number(p.density / water::restDensity) + "   pressure " + number(p.pressure, 1) + " N/m");
        text(renderer, 24, 724, "rho/rho0 min / median / max: " + number(app.metrics.minimum) + " / " + number(app.metrics.median) + " / " + number(app.metrics.maximum));
        text(renderer, 24, 748, "p95 compression " + number(100 * app.metrics.p95Compression, 2) + "%   leakage " + std::to_string(app.metrics.leaked) + "   candidates " + std::to_string(app.state.candidates));
    }
#if LAB_CHECKPOINT >= 10
    const auto nozzle = toScreen(app.nozzle.x, app.nozzle.y);
    SDL_FRect nozzleRect{static_cast<float>(nozzle.x - 18), static_cast<float>(nozzle.y - 12), 36, 8};
    SDL_SetRenderDrawColor(renderer, 244, 187, 110, 255);
    SDL_RenderFillRect(renderer, &nozzleRect);
#endif
    for (const auto& button : buttons()) {
        SDL_SetRenderDrawColor(renderer, 26, 43, 62, 255);
        SDL_RenderFillRect(renderer, &button.bounds);
        std::string label = button.label;
        if (button.action == Action::Pour && app.pouring)
            label = "E  POUR: ON";
        text(renderer, button.bounds.x + 12, button.bounds.y + 12, label);
    }
    const double values[3] = {app.settings.soundSpeed, app.settings.alpha, app.settings.gravity};
    const double minimums[3] = {12, 0, 0};
    const double maximums[3] = {40, 1, 12};
    const std::string names[3] = {"C  SOUND SPEED (m/s)", "Q  ARTIFICIAL VISCOSITY", "B  GRAVITY (m/s2)"};
    for (int k = 0; k < 3; ++k) {
        const float y = 334.0f + k * 48.0f;
        text(renderer, 956, y, names[k] + " " + number(values[k], 2));
        SDL_SetRenderDrawColor(renderer, 43, 65, 84, 255);
        SDL_RenderLine(renderer, 956, y + 25, 1256, y + 25);
        const double fraction = (values[k] - minimums[k]) / (maximums[k] - minimums[k]);
        SDL_SetRenderDrawColor(renderer, 95, 207, 249, 255);
        disk(renderer, static_cast<float>(956 + 300 * fraction), y + 25, 5);
    }
    text(renderer, 956, 638, "MODEL " + number(app.state.time) + "s   tick " + std::to_string(app.state.tick));
    text(renderer, 956, 660, "dt " + number(app.state.dt, 6) + "s  step " + number(app.stepMs, 2) + "ms");
    text(renderer, 956, 682, "DROPPED " + number(app.dropped) + "s");
    text(renderer, 956, 704, "UPDATED / DRAWN " + std::to_string(app.state.updated) + " / " + std::to_string(app.surface.drawn));
    text(renderer, 956, 726, "REFERENCE " + app.report);
    std::string tool = "INSPECT";
    if (app.tool == Tool::Pour)
        tool = "POUR";
    if (app.tool == Tool::Paddle)
        tool = "PADDLE";
    text(renderer, 24, 674, "MOUSE: " + tool + "    ARROWS: MOVE TOOL    ENTER: POUR    ESC: EXIT");
    if (!app.error.empty())
        text(renderer, 24, 782, app.error, {255, 147, 129, 255});
    app.dirty = false;
}
} // namespace tank
