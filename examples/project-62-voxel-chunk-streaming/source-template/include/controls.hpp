#pragma once
#include "controller.hpp"
#include <SDL3/SDL.h>

namespace voxel {
inline void keyDown(SDL_Keycode key, App& app) {
    // Các thao tác tay tạm dừng playback nhưng không giải quyết hết queue.
    stop(app);
    if (key == SDLK_R) {
        app = App{};
    }

#if LAB_CHECKPOINT >= 1
    double dx = 0;
    double dz = 0;
    if (key == SDLK_W) {
        dz = -4;
    }
    if (key == SDLK_S) {
        dz = 4;
    }
    if (key == SDLK_A) {
        dx = -4;
    }
    if (key == SDLK_D) {
        dx = 4;
    }
    if (dx != 0 || dz != 0) {
        movePlayer(app.world, std::clamp(app.world.player.x + dx, -playerLimit, playerLimit), std::clamp(app.world.player.z + dz, -playerLimit, playerLimit));
    }
    Key selected = app.selected;
    if (key == SDLK_J) {
        --selected.x;
    }
    if (key == SDLK_L) {
        ++selected.x;
    }
    if (key == SDLK_I) {
        --selected.z;
    }
    if (key == SDLK_K) {
        ++selected.z;
    }
    selected.x = std::clamp(selected.x, -64, 64);
    selected.z = std::clamp(selected.z, -64, 64);
    app.selected = selected;
#endif

    if (key == SDLK_LEFT) {
        orbit(app.camera, -8, 0);
        app.cameraDirty = true;
    }
    if (key == SDLK_RIGHT) {
        orbit(app.camera, 8, 0);
        app.cameraDirty = true;
    }
    if (key == SDLK_UP) {
        orbit(app.camera, 0, -8);
        app.cameraDirty = true;
    }
    if (key == SDLK_DOWN) {
        orbit(app.camera, 0, 8);
        app.cameraDirty = true;
    }
    if (key == SDLK_EQUALS || key == SDLK_MINUS) {
        double amount = -1;
        if (key == SDLK_EQUALS) {
            amount = 1;
        }
        zoom(app.camera, amount);
        app.cameraDirty = true;
    }
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_P) {
        choosePreset(app, (app.preset + 1) % 4);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_N) {
        step(app);
    }
    if (key == SDLK_B) {
        settings(app.world, app.world.radius, 3 - app.world.budget);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_G) {
        settings(app.world, 3 - app.world.radius, app.world.budget);
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_T) {
        app.autoTravel = !app.autoTravel;
    }
    if (key == SDLK_E) {
        const double x = app.selected.x * side + 8;
        const double z = app.selected.z * side + 8;
        if (std::abs(x) <= playerLimit && std::abs(z) <= playerLimit) {
            movePlayer(app.world, x, z);
        }
    }
#endif
}
} // namespace voxel
