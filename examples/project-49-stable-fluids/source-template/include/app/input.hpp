#pragma once
#include "hud.hpp"

namespace smoke {
// Chỉ input sửa dữ liệu theo thao tác; solver không đọc chuột hoặc phím trực tiếp.
inline void releasePointer(App& app) {
    app.dragging = false;
    app.previousValid = false;
    SDL_CaptureMouse(false);
}

inline void act(App& app, Action action) {
    if (action == Action::Reset) {
        releasePointer(app);
        app.rebuild(app.grid.n, app.scene);
    }
    if (action == Action::Clean) {
        app.clean = !app.clean;
    }
#if LAB_CHECKPOINT >= 2
    if (action == Action::Scene) {
        releasePointer(app);
        int next = (static_cast<int>(app.scene) + 1) % 4;
#if LAB_CHECKPOINT < 4
        next = static_cast<int>(fluid::Scene::TwinJets);
        if (app.scene == fluid::Scene::TwinJets) {
            next = static_cast<int>(fluid::Scene::Empty);
        }
#endif
        int n = app.grid.n;
        if (n == 8) {
            n = fluid::startingResolution();
        }
        app.rebuild(n, static_cast<fluid::Scene>(next));
        app.parameters.emit = app.scene == fluid::Scene::TwinJets;
        app.parameters.buoyancy = 0;
        if (app.parameters.emit) {
            app.parameters.buoyancy = 0.8;
        }
    }
    if (action == Action::Tool) {
        int next = static_cast<int>(app.tool) + 1;
        app.tool = static_cast<Tool>(next % 4);
#if LAB_CHECKPOINT < 8
        if (app.tool == Tool::Stir) {
            app.tool = Tool::Paint;
        }
#endif
    }
    if (action == Action::Palette) {
        app.colored = true;
        if (app.ink.r == fluid::cyan.r) {
            app.ink = fluid::amber;
        } else if (app.ink.r == fluid::amber.r) {
            app.ink = fluid::white;
        } else {
            app.ink = fluid::cyan;
        }
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (action == Action::Step) {
        app.pause();
        app.singleStep();
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (action == Action::Layer) {
        int next = static_cast<int>(app.layer) + 1;
#if LAB_CHECKPOINT < 5
        if (next == 2) {
            next = 3;
        }
#endif
        app.layer = static_cast<fluid::Layer>(next % 4);
    }
    if (action == Action::Vectors) {
        app.vectors = !app.vectors;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (action == Action::Fixture) {
        releasePointer(app);
        app.rebuild(8, fluid::Scene::JacobiPair);
        app.layer = fluid::Layer::Pressure;
        app.parameters.emit = false;
        app.parameters.buoyancy = 0;
    }
    if (action == Action::Budget) {
        app.pause();
        if (app.parameters.method == fluid::PressureMethod::Jacobi) {
            app.parameters.pressureBudget *= 2;
            if (app.parameters.pressureBudget > 160) {
                app.parameters.pressureBudget = 40;
            }
        } else {
            app.parameters.pressureBudget += 128;
            if (app.parameters.pressureBudget > 384) {
                app.parameters.pressureBudget = 128;
            }
        }
    }
    if (action == Action::Jacobi || action == Action::RestartPressure) {
        app.pause();
        if (!app.grid.pressureReady || action == Action::RestartPressure) {
            fluid::preparePressure(app.grid, true);
        }
        if (action == Action::Jacobi && app.grid.iterations < 160) {
            fluid::jacobiIteration(app.grid);
        }
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (action == Action::Source) {
        app.parameters.emit = !app.parameters.emit;
    }
    if (action == Action::Buoyancy) {
        app.pause();
        app.parameters.buoyancy += 0.8;
        if (app.parameters.buoyancy > 1.6) {
            app.parameters.buoyancy = 0;
        }
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (action == Action::Viscosity) {
        app.pause();
        if (app.parameters.viscosity == 0) {
            app.parameters.viscosity = 0.0001;
        } else if (app.parameters.viscosity == 0.0001) {
            app.parameters.viscosity = 0.0005;
        } else if (app.parameters.viscosity == 0.0005) {
            app.parameters.viscosity = 0.003;
        } else {
            app.parameters.viscosity = 0;
        }
    }
#endif
#if LAB_CHECKPOINT >= 10
    if (action == Action::Pause) {
        app.paused = !app.paused;
        app.accumulator = 0;
    }
    if (action == Action::Resolution && app.scene != fluid::Scene::JacobiPair) {
        releasePointer(app);
        int n = 16;
        if (app.grid.n == 16) {
            n = 32;
        }
#if LAB_CHECKPOINT >= 11
        else if (app.grid.n == 32) {
            n = 64;
        } else if (app.grid.n == 64) {
            n = 128;
        }
#endif
#if LAB_CHECKPOINT >= 14
        if (app.grid.n == 128) {
            n = 256;
        }
#endif
        app.rebuild(n, app.scene);
    }
#endif
#if LAB_CHECKPOINT >= 11
    if (action == Action::Method) {
        app.pause();
        if (app.parameters.method == fluid::PressureMethod::CG) {
#if LAB_CHECKPOINT >= 14
            app.parameters.method = fluid::PressureMethod::PCG;
            app.parameters.pressureBudget = 384;
#else
            app.parameters.method = fluid::PressureMethod::Jacobi;
            app.parameters.pressureBudget = 160;
#endif
        } else if (app.parameters.method == fluid::PressureMethod::Jacobi) {
            app.parameters.method = fluid::PressureMethod::CG;
            app.parameters.pressureBudget = 384;
        } else {
            app.parameters.method = fluid::PressureMethod::Jacobi;
            app.parameters.pressureBudget = 160;
        }
    }
#endif
#if LAB_CHECKPOINT >= 15
    if (action == Action::Verify) {
        app.pause();
        app.reference = "FAIL";
        if (fluid::validate().passed) {
            app.reference = "PASS: N=16 AND N=128";
        }
    }
#endif
#if LAB_CHECKPOINT >= 12
    if (action == Action::HighOrder) {
        app.pause();
        app.parameters.highOrder = !app.parameters.highOrder;
    }
#endif
#if LAB_CHECKPOINT >= 13
    if (action == Action::Confinement) {
        app.pause();
        app.parameters.confinement += 4;
        if (app.parameters.confinement > 20) {
            app.parameters.confinement = 0;
        }
    }
#endif
}

inline void keyDown(App& app, const SDL_KeyboardEvent& event) {
    if ((event.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) != 0) {
        return;
    }
#if LAB_CHECKPOINT >= 2
    if (event.key == SDLK_LEFT) {
        app.selectedX = std::max(0, app.selectedX - 1);
    }
    if (event.key == SDLK_RIGHT) {
        app.selectedX = std::min(app.grid.n - 1, app.selectedX + 1);
    }
    if (event.key == SDLK_UP) {
        app.selectedY = std::min(app.grid.n - 1, app.selectedY + 1);
    }
    if (event.key == SDLK_DOWN) {
        app.selectedY = std::max(0, app.selectedY - 1);
    }
#endif
    if (event.repeat) {
        return;
    }
    if (event.key == SDLK_ESCAPE) {
        app.running = false;
    }
    if (event.key == SDLK_SPACE) {
        act(app, Action::Pause);
    }
    if (event.key == SDLK_N) {
        act(app, Action::Step);
    }
    if (event.key == SDLK_R) {
        act(app, Action::Reset);
    }
    if (event.key == SDLK_P) {
        act(app, Action::Scene);
    }
    if (event.key == SDLK_L) {
        act(app, Action::Layer);
    }
    if (event.key == SDLK_M) {
        act(app, Action::Tool);
    }
    if (event.key == SDLK_E) {
        act(app, Action::Source);
    }
    if (event.key == SDLK_B) {
        act(app, Action::Buoyancy);
    }
    if (event.key == SDLK_Q) {
        act(app, Action::Viscosity);
    }
    if (event.key == SDLK_G) {
        act(app, Action::Resolution);
    }
    if (event.key == SDLK_C) {
        act(app, Action::Method);
    }
    if (event.key == SDLK_T) {
        act(app, Action::Budget);
    }
    if (event.key == SDLK_O) {
        act(app, Action::Vectors);
    }
    if (event.key == SDLK_F1) {
        act(app, Action::Clean);
    }
    if (event.key == SDLK_F2) {
        app.colored = !app.colored;
    }
#if LAB_CHECKPOINT >= 12
    if (event.key == SDLK_F3) {
        act(app, Action::HighOrder);
    }
#endif
#if LAB_CHECKPOINT >= 13
    if (event.key == SDLK_F4) {
        act(app, Action::Confinement);
    }
#endif
    if (event.key == SDLK_H) {
        act(app, Action::Fixture);
    }
    if (event.key == SDLK_J) {
        act(app, Action::Jacobi);
    }
    if (event.key == SDLK_Z) {
        act(app, Action::RestartPressure);
    }
    if (event.key == SDLK_V) {
        act(app, Action::Verify);
    }
#if LAB_CHECKPOINT >= 2
    if (event.key == SDLK_LEFTBRACKET) {
        app.radius = std::max(1, app.radius - 1);
    }
    if (event.key == SDLK_RIGHTBRACKET) {
        app.radius = std::min(16, app.radius + 1);
    }
    if (event.key == SDLK_1) {
        app.ink = fluid::cyan;
    }
    if (event.key == SDLK_2) {
        app.ink = fluid::amber;
    }
    if (event.key == SDLK_3) {
        app.ink = fluid::white;
    }
    const fluid::Vec2 selected{(app.selectedX + 0.5) * app.grid.h, (app.selectedY + 0.5) * app.grid.h};
    if (event.key == SDLK_RETURN && app.tool != Tool::Probe) {
        fluid::paintDisk(app.grid, selected, app.radius, app.tool == Tool::Erase, app.ink);
    }
#if LAB_CHECKPOINT >= 8
    fluid::Vec2 increment;
    if (event.key == SDLK_W) {
        increment.y = 0.05;
    }
    if (event.key == SDLK_S) {
        increment.y = -0.05;
    }
    if (event.key == SDLK_A) {
        increment.x = -0.05;
    }
    if (event.key == SDLK_D) {
        increment.x = 0.05;
    }
    if (increment.x != 0 || increment.y != 0) {
        fluid::impulseAt(app.grid, selected, increment);
    }
#endif
#endif
}

inline void handleEvent(App& app, SDL_Renderer* renderer, const SDL_Event& event) {
    if (event.type == SDL_EVENT_QUIT) {
        app.running = false;
    }
    if (event.type == SDL_EVENT_KEY_DOWN) {
        keyDown(app, event.key);
    }
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
        app.pause();
        releasePointer(app);
    }
#if LAB_CHECKPOINT >= 2
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && app.dragging) {
        if (!app.moved && !app.secondary && app.tool == Tool::Stir && app.previousValid) {
            fluid::paintDisk(app.grid, app.downPoint, app.radius, false, app.ink);
        }
        releasePointer(app);
    }
    const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT);
    if (!down && event.type != SDL_EVENT_MOUSE_MOTION) {
        return;
    }
    float x = 0;
    float y = 0;
    if (down) {
        x = event.button.x;
        y = event.button.y;
    } else {
        x = event.motion.x;
        y = event.motion.y;
    }
    if (down && event.button.button == SDL_BUTTON_LEFT) {
        float logicalX = 0;
        float logicalY = 0;
        if (SDL_RenderCoordinatesFromWindow(renderer, x, y, &logicalX, &logicalY)) {
            for (const auto& button : buttons(app)) {
                if (contains(button.bounds, logicalX, logicalY)) {
                    act(app, button.action);
                    return;
                }
            }
        }
    }
    fluid::Vec2 point;
    if (!world(renderer, x, y, point)) {
        app.previousValid = false;
        return;
    }
    app.selectedX = std::min(app.grid.n - 1, static_cast<int>(point.x / app.grid.h));
    app.selectedY = std::min(app.grid.n - 1, static_cast<int>(point.y / app.grid.h));
    if (down) {
        app.dragging = true;
        app.moved = false;
        app.previousValid = false;
        app.downPoint = point;
        app.secondary = event.button.button == SDL_BUTTON_RIGHT;
        SDL_CaptureMouse(true);
    }
    if (!app.dragging || app.tool == Tool::Probe) {
        return;
    }
    if (std::hypot(point.x - app.downPoint.x, point.y - app.downPoint.y) > 0.004) {
        app.moved = true;
    }
    if ((app.tool == Tool::Paint || app.tool == Tool::Erase) && !app.secondary) {
        if (app.previousValid) {
            fluid::paintStroke(app.grid, app.previous, point, app.radius, app.tool == Tool::Erase, app.ink);
        } else {
            fluid::paintDisk(app.grid, point, app.radius, app.tool == Tool::Erase, app.ink);
        }
    }
#if LAB_CHECKPOINT >= 8
    if ((app.tool == Tool::Stir || app.secondary) && app.previousValid) {
        fluid::stirStroke(app.grid, app.previous, point);
    }
#endif
    app.previous = point;
    app.previousValid = true;
#else
    static_cast<void>(renderer);
#endif
}
} // namespace smoke
