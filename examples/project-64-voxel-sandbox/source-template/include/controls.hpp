#pragma once
#include "controller.hpp"
#include <SDL3/SDL.h>

namespace voxel {
// Một key-down không repeat là một action; thao tác tay luôn pause queue.
inline void keyDown(SDL_Keycode key, SDL_Keymod modifiers, App& app) {
    stop(app);
    if (key == SDLK_R) {
        app = App{};
    }

    if (key == SDLK_N) {
        step(app);
    }
    if (key == SDLK_W) {
        travel(app, 0, -4);
    }
    if (key == SDLK_S) {
        travel(app, 0, 4);
    }
    if (key == SDLK_A) {
        travel(app, -4, 0);
    }
    if (key == SDLK_D) {
        travel(app, 4, 0);
    }

    if (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN) {
        double dx = 0;
        double dy = 0;
        if (key == SDLK_LEFT) {
            dx = -8;
        }
        if (key == SDLK_RIGHT) {
            dx = 8;
        }
        if (key == SDLK_UP) {
            dy = -8;
        }
        if (key == SDLK_DOWN) {
            dy = 8;
        }
        orbit(app.camera, dx, dy);
        app.cameraDirty = true;
        app.pickDirty = true;
    }
    if (key == SDLK_EQUALS || key == SDLK_MINUS) {
        double amount = -1;
        if (key == SDLK_EQUALS) {
            amount = 1;
        }
        zoom(app.camera, amount);
        app.cameraDirty = true;
        app.pickDirty = true;
    }
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_1) {
        app.material = Block::Grass;
    }
    if (key == SDLK_2) {
        app.material = Block::Dirt;
    }
    if (key == SDLK_3) {
        app.material = Block::Stone;
    }
    if (key == SDLK_F) {
        action(app, false);
    }
    if (key == SDLK_G) {
        action(app, true);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_Z || key == SDLK_Y) {
        if (history(app.world, key == SDLK_Y)) {
            app.pickDirty = true;
            app.message = "History applied to world address";
#if LAB_CHECKPOINT >= 10
            invalidateAudit(app);
#endif
        }
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_F5) {
        const std::string text = serialize(app.world);
        if (SDL_SetClipboardText(text.c_str())) {
            app.message = "VXL1 copied: paste into a text file to keep it";
        } else {
            app.message = SDL_GetError();
        }
    }
    if (key == SDLK_F9 && (modifiers & SDL_KMOD_SHIFT) != 0) {
        char* raw = SDL_GetClipboardText();
        std::string text;
        if (raw != nullptr) {
            std::size_t length = 0;
            while (length <= 32768 && raw[length] != '\0') {
                ++length;
            }
            if (length > 32768) {
                SDL_free(raw);
                app.message = "Snapshot exceeds 32768 bytes";
                return;
            }
            text = raw;
        }
        SDL_free(raw);
        try {
            World next = importSnapshot(app.world, text);
            app.world = std::move(next);
#if LAB_CHECKPOINT >= 10
            invalidateAudit(app);
#endif
            app.pickDirty = true;
            app.message = "Imported snapshot; history cleared";
        } catch (const std::exception& error) {
            app.message = error.what();
        }
    }
#else
    (void)modifiers;
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_P) {
        choosePreset(app);
    }
    if (key == SDLK_J) {
        aim(app, app.aimX - 2, app.aimY);
    }
    if (key == SDLK_L) {
        aim(app, app.aimX + 2, app.aimY);
    }
    if (key == SDLK_I) {
        aim(app, app.aimX, app.aimY - 2);
    }
    if (key == SDLK_K) {
        aim(app, app.aimX, app.aimY + 2);
    }
#endif
}
} // namespace voxel
