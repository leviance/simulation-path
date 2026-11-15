#pragma once
#include "image.hpp"
#include <iomanip>
#include <sstream>

namespace smoke {
// Nút và phím dùng cùng Action, tránh có hai cách sửa state khác nhau.
enum class Action {
    Pause,
    Step,
    Reset,
    Scene,
    Layer,
    Tool,
    Palette,
    Source,
    Viscosity,
    Buoyancy,
    Method,
    Budget,
    Resolution,
    Clean,
    Vectors,
    Verify,
    Jacobi,
    RestartPressure,
    HighOrder,
    Confinement,
    Fixture,
};

struct Button {
    Action action;
    SDL_FRect bounds;
    std::string label;
    bool active = false;
};

inline std::string number(double value, int precision = 2) {
    std::ostringstream stream;
    stream << std::scientific << std::setprecision(precision) << value;
    return stream.str();
}

inline const char* sceneName(fluid::Scene scene) {
    switch (scene) {
    case fluid::Scene::Vortex:
        return "VORTEX";
    case fluid::Scene::Compression:
        return "COMPRESSION TEST";
    case fluid::Scene::Empty:
        return "EMPTY CHAMBER";
    case fluid::Scene::JacobiPair:
        return "JACOBI 8x8";
    default:
        return "TWIN SMOKE JETS";
    }
}

inline const char* layerName(fluid::Layer layer) {
    switch (layer) {
    case fluid::Layer::Velocity:
        return "VELOCITY";
    case fluid::Layer::Pressure:
        return "PRESSURE";
    case fluid::Layer::Divergence:
        return "DIVERGENCE";
    default:
        return "SMOKE";
    }
}

inline const char* toolName(Tool tool) {
    switch (tool) {
    case Tool::Paint:
        return "PAINT";
    case Tool::Erase:
        return "ERASE";
    case Tool::Probe:
        return "PROBE";
    default:
        return "STIR / CLICK TO ADD";
    }
}

inline std::vector<Button> buttons(const App& app) {
    std::vector<Button> result{{Action::Reset, {1114, 29, 142, 34}, "R  RESET"}, {Action::Clean, {824, 295, 208, 34}, "F1  CLEAN / DEBUG", !app.clean}};
#if LAB_CHECKPOINT >= 2
    result.push_back({Action::Scene, {824, 135, 208, 34}, "P  SCENE"});
    result.push_back({Action::Tool, {824, 215, 208, 34}, "M  TOOL"});
    result.push_back({Action::Palette, {1044, 215, 212, 34}, "1/2/3  INK COLOR"});
#endif
#if LAB_CHECKPOINT >= 3
    result.push_back({Action::Step, {1044, 175, 212, 34}, "N  ONE STEP"});
#endif
#if LAB_CHECKPOINT >= 4
    result.push_back({Action::Layer, {1044, 135, 212, 34}, "L  VIEW LAYER"});
    result.push_back({Action::Vectors, {1044, 295, 212, 34}, "O  VELOCITY GLYPHS", app.vectors});
#endif
#if LAB_CHECKPOINT >= 5
    result.push_back({Action::Budget, {1044, 375, 212, 34}, "T  PRESSURE BUDGET"});
    result.push_back({Action::Jacobi, {824, 415, 208, 34}, "J  ONE JACOBI ROUND"});
    result.push_back({Action::RestartPressure, {1044, 415, 212, 34}, "Z  RESTART PRESSURE"});
    result.push_back({Action::Fixture, {824, 455, 208, 22}, "H  JACOBI 8x8"});
#endif
#if LAB_CHECKPOINT >= 12
    result.push_back({Action::HighOrder, {1044, 455, 212, 22}, "F3  MACCORMACK", app.parameters.highOrder});
#endif
#if LAB_CHECKPOINT >= 13
    result.push_back({Action::Confinement, {824, 753, 432, 27}, "F4  SWIRL STRENGTH " + number(app.parameters.confinement, 0)});
#endif
#if LAB_CHECKPOINT >= 8
    result.push_back({Action::Source, {824, 255, 208, 34}, "E  EMITTERS", app.parameters.emit});
    result.push_back({Action::Buoyancy, {1044, 255, 212, 34}, "B  BUOYANCY"});
#endif
#if LAB_CHECKPOINT >= 9
    result.push_back({Action::Viscosity, {824, 335, 208, 34}, "Q  VISCOSITY"});
#endif
#if LAB_CHECKPOINT >= 10
    result.push_back({Action::Pause, {824, 175, 208, 34}, "SPACE  RUN / PAUSE", !app.paused});
    result.push_back({Action::Resolution, {1044, 335, 212, 34}, "G  GRID SIZE"});
#endif
#if LAB_CHECKPOINT >= 11
    result.push_back({Action::Method, {824, 375, 208, 34}, "C  PRESSURE SOLVER"});
#endif
#if LAB_CHECKPOINT >= 15
    result.push_back({Action::Verify, {824, 823, 432, 34}, "V  RUN INDEPENDENT REFERENCE TESTS"});
#endif
    return result;
}

inline bool contains(const SDL_FRect& rect, float x, float y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

inline bool text(SDL_Renderer* renderer, float x, float y, const std::string& value) {
    return SDL_SetRenderDrawColor(renderer, 199, 217, 234, 255) && SDL_RenderDebugText(renderer, x, y, value.c_str());
}

inline bool drawHud(SDL_Renderer* renderer, const App& app) {
    const SDL_FRect panel{808, 105, 464, 768};
    if (!SDL_SetRenderDrawColor(renderer, 15, 23, 36, 255) || !SDL_RenderFillRect(renderer, &panel)) {
        return false;
    }
    for (const auto& button : buttons(app)) {
        Uint8 green = 45;
        if (button.active) {
            green = 87;
        }
        if (!SDL_SetRenderDrawColor(renderer, 28, green, 66, 255) || !SDL_RenderFillRect(renderer, &button.bounds) || !text(renderer, button.bounds.x + 10, button.bounds.y + 13, button.label)) {
            return false;
        }
    }
    std::string status = "PAUSED";
    if (!app.paused) {
        status = "RUNNING";
    }
    if (!text(renderer, 24, 30, "SMOKE CHAMBER / STABLE FLUIDS 2D") || !text(renderer, 24, 54, "CLICK TO ADD INK / DRAG TO STIR / RIGHT DRAG: STIR WITHOUT PAINT") || !text(renderer, 24, 82, std::string(sceneName(app.scene)) + "   |   " + layerName(app.layer) + "   |   " + status) || !text(renderer, 824, 118, "EXPERIMENT CONTROLS / CPU - C++20 - SDL3")) {
        return false;
    }
    if (!text(renderer, 824, 478, std::string("TOOL ") + toolName(app.tool) + "   radius=" + std::to_string(app.radius)) || !text(renderer, 824, 502, "GRID " + std::to_string(app.grid.n) + " x " + std::to_string(app.grid.n) + " = " + std::to_string(app.grid.density.size()) + " CELLS") || !text(renderer, 824, 526, "MODEL t=" + number(app.grid.tick * fluid::fixedDt) + "s   tick=" + std::to_string(app.grid.tick))) {
        return false;
    }
    const auto diagnostics = fluid::diagnose(app.grid);
    std::string method = "JACOBI";
    if (app.parameters.method == fluid::PressureMethod::CG) {
        method = "CG";
    }
    if (app.parameters.method == fluid::PressureMethod::PCG) {
        method = "PCG / MULTIGRID";
    }
    if (!text(renderer, 824, 550, method + " <= " + std::to_string(app.parameters.pressureBudget) + " rounds / nu=" + number(app.parameters.viscosity)) || !text(renderer, 824, 574, "BUOYANCY " + number(app.parameters.buoyancy) + "  |  DROPPED " + number(app.dropped) + "s")) {
        return false;
    }
    const SDL_FRect swatch{1220, 477, 28, 18};
    if (!SDL_SetRenderDrawColor(renderer, static_cast<Uint8>(255 * app.ink.r), static_cast<Uint8>(255 * app.ink.g), static_cast<Uint8>(255 * app.ink.b), 255) || !SDL_RenderFillRect(renderer, &swatch)) {
        return false;
    }
    if (!app.clean) {
        const int i = app.selectedY * app.grid.n + app.selectedX;
        if (!text(renderer, 824, 612, "CELL " + std::to_string(app.selectedX) + "," + std::to_string(app.selectedY) + "   density=" + number(app.grid.density[i]))) {
            return false;
        }
#if LAB_CHECKPOINT >= 4
        const int u = app.selectedY * (app.grid.n + 1) + app.selectedX;
        const int v = app.selectedY * app.grid.n + app.selectedX;
        if (!text(renderer, 824, 636, "u " + number(app.grid.u[u], 1) + "/" + number(app.grid.u[u + 1], 1) + " v " + number(app.grid.v[v], 1) + "/" + number(app.grid.v[v + app.grid.n], 1)) || !text(renderer, 824, 660, "DIV RMS " + number(fluid::rms(app.grid.divergence)) + " Courant=" + number(diagnostics.courant))) {
            return false;
        }
#else
        if (!text(renderer, 824, 636, "INTEGRAL(d) " + number(diagnostics.mass))) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (app.grid.pressureReady) {
            const auto cell = fluid::inspectJacobi(app.grid, app.selectedX, app.selectedY);
            if (!text(renderer, 824, 708, "JACOBI b=" + number(cell.rhs) + " sum=" + number(cell.sum)) || !text(renderer, 824, 732, "candidate=" + number(cell.candidate) + " k=" + std::to_string(app.grid.iterations))) {
                return false;
            }
        }
#endif
#if LAB_CHECKPOINT >= 5
        std::string residual = "NO ACTIVE RHS";
        if (app.grid.pressureReady) {
            residual = "JACOBI r=" + number(fluid::pressureResidual(app.grid));
        } else if (app.grid.projection.available) {
            residual = "LAST r=" + number(app.grid.projection.residual);
        }
        if (!text(renderer, 824, 684, "PRESSURE " + number(app.grid.pressure[i]) + "  " + residual)) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 6
        if (app.grid.projection.available) {
            const auto& p = app.grid.projection;
            std::string result = "BUDGET EXHAUSTED";
            if (p.converged) {
                result = "CONVERGED";
            }
            std::string solver = "J";
            if (p.method == fluid::PressureMethod::CG) {
                solver = "CG";
            }
            if (p.method == fluid::PressureMethod::PCG) {
                solver = "PCG";
            }
            if (!text(renderer, 824, 708, "LAST " + solver + " " + number(p.before) + " -> " + number(p.after)) || !text(renderer, 824, 732, "k=" + std::to_string(p.iterations) + "/" + std::to_string(p.budget) + " tol=" + number(p.target) + " " + result)) {
                return false;
            }
        }
#endif
    } else if (!text(renderer, 824, 636, "F1: inspect velocity, pressure and divergence") || !text(renderer, 824, 660, "Colors are passive tracers of the same flow.")) {
        return false;
    }
    if (!text(renderer, 824, 784, "REFERENCE: " + app.reference) || !text(renderer, 824, 804, app.error) || !text(renderer, 24, 886, "P +/-0.08  DIV +/-1  SPEED 0..0.6 | NEG BLUE / POS ORANGE | M TOOL  [ ] RADIUS  ENTER INK  WASD IMPULSE | ESC EXIT")) {
        return false;
    }
    return true;
}

inline bool draw(SDL_Renderer* renderer, const App& app, [[maybe_unused]] Image& image) {
    if (!SDL_SetRenderDrawColor(renderer, 7, 12, 21, 255) || !SDL_RenderClear(renderer)) {
        return false;
    }
    if (!image.draw(renderer, app.grid, app.layer, app.colored)) {
        return false;
    }
#if LAB_CHECKPOINT >= 2
    if (!app.clean) {
        const auto point = screen({app.selectedX * app.grid.h, (app.selectedY + 1) * app.grid.h});
        const SDL_FRect cell{static_cast<float>(point.x), static_cast<float>(point.y), static_cast<float>(viewSize * app.grid.h), static_cast<float>(viewSize * app.grid.h)};
        if (!SDL_SetRenderDrawColor(renderer, 122, 255, 208, 255) || !SDL_RenderRect(renderer, &cell)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    if ((app.vectors && !app.clean) || app.layer == fluid::Layer::Velocity) {
        const int stride = std::max(2, app.grid.n / 12);
        for (int y = 0; y < app.grid.n; y += stride) {
            for (int x = 0; x < app.grid.n; x += stride) {
                const fluid::Vec2 point{(x + 0.5) * app.grid.h, (y + 0.5) * app.grid.h};
                const auto flow = fluid::velocityAt(app.grid, point);
                const double speed = std::hypot(flow.x, flow.y);
                if (speed < 1e-10) {
                    continue;
                }
                const double length = std::min(0.05, 0.15 * speed);
                const auto a = screen(point);
                const auto b = screen({point.x + length * flow.x / speed, point.y + length * flow.y / speed});
                const double dx = b.x - a.x;
                const double dy = b.y - a.y;
                if (!SDL_SetRenderDrawColor(renderer, 140, 203, 235, 255) || !SDL_RenderLine(renderer, static_cast<float>(a.x), static_cast<float>(a.y), static_cast<float>(b.x), static_cast<float>(b.y)) || !SDL_RenderLine(renderer, static_cast<float>(b.x), static_cast<float>(b.y), static_cast<float>(b.x - 0.3 * dx - 0.2 * dy), static_cast<float>(b.y - 0.3 * dy + 0.2 * dx)) || !SDL_RenderLine(renderer, static_cast<float>(b.x), static_cast<float>(b.y), static_cast<float>(b.x - 0.3 * dx + 0.2 * dy), static_cast<float>(b.y - 0.3 * dy - 0.2 * dx))) {
                    return false;
                }
            }
        }
    }
#endif
    const SDL_FRect frame{viewX - 1, viewY - 1, viewSize + 2, viewSize + 2};
    if (!SDL_SetRenderDrawColor(renderer, 43, 60, 79, 255) || !SDL_RenderRect(renderer, &frame)) {
        return false;
    }
    return drawHud(renderer, app);
}
} // namespace smoke
