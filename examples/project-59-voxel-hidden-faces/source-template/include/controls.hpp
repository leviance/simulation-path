#pragma once
#include "audit.hpp"
#include "inspection.hpp"
#include <SDL3/SDL.h>

namespace voxel {
struct Controls {
    int preset = 2;
    int slice = 15;
    int face = 0;
    std::array<int, 3> selected{7, 7, 7};
    Chunk chunk = makeChunk(preset);
    Camera camera;
    SceneCache cache;
    bool paused = true;
    bool dragging = false;
    bool gridDrag = false;
    bool culled = false;
};

inline void stop(Controls& state) {
    state.paused = true;
    state.dragging = false;
    SDL_CaptureMouse(false);
}

inline void invalidateGeometry(Controls& state) {
    state.cache.meshDirty = true;
    state.cache.frameDirty = true;
}

inline void reset(Controls& state) {
    stop(state);
    state.preset = 2;
    state.chunk = makeChunk(2);
    state.slice = 15;
    state.face = 0;
    state.selected = {7, 7, 7};
    state.camera = {};
    state.culled = false;
#if LAB_CHECKPOINT >= 3
    state.culled = true;
#endif
    state.cache = {};
}

inline void keyDown(SDL_Keycode key, Controls& state) {
    // Camera/input từ Project 58 có sẵn; các control mới mở theo đúng bài.
    if (key == SDLK_R) {
        reset(state);
    }
    if (key == SDLK_P) {
        stop(state);
        int count = 3;
#if LAB_CHECKPOINT >= 4
        count = 7;
#endif
        state.preset = (state.preset + 1) % count;
        state.chunk = makeChunk(state.preset);
        invalidateGeometry(state);
    }
    if (key == SDLK_LEFT) {
        orbit(state.camera, -8, 0);
    }
    if (key == SDLK_RIGHT) {
        orbit(state.camera, 8, 0);
    }
    if (key == SDLK_UP) {
        orbit(state.camera, 0, -8);
    }
    if (key == SDLK_DOWN) {
        orbit(state.camera, 0, 8);
    }
    if (key == SDLK_PLUS || key == SDLK_EQUALS) {
        zoom(state.camera, 1);
    }
    if (key == SDLK_MINUS) {
        zoom(state.camera, -1);
    }
    if (key == SDLK_SPACE) {
        state.paused = !state.paused;
    }
    if (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN || key == SDLK_PLUS || key == SDLK_EQUALS || key == SDLK_MINUS) {
        state.cache.frameDirty = true;
    }
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_M) {
        stop(state);
        state.culled = !state.culled;
        invalidateGeometry(state);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_PAGEUP || key == SDLK_PAGEDOWN) {
        stop(state);
        if (key == SDLK_PAGEUP) {
            state.slice = std::min(15, state.slice + 1);
        } else {
            state.slice = std::max(0, state.slice - 1);
        }
        invalidateGeometry(state);
    }
#endif
#if LAB_CHECKPOINT >= 6
    const std::array<SDL_Keycode, 3> minus{SDLK_U, SDLK_J, SDLK_N};
    const std::array<SDL_Keycode, 3> plus{SDLK_I, SDLK_K, SDLK_O};
    for (int axis = 0; axis < 3; ++axis) {
        if (key == minus.at(axis)) {
            state.selected.at(axis) = std::max(0, state.selected.at(axis) - 1);
        }
        if (key == plus.at(axis)) {
            state.selected.at(axis) = std::min(15, state.selected.at(axis) + 1);
        }
    }
    if (key == SDLK_F) {
        state.face = (state.face + 1) % 6;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_V) {
        audit();
        SDL_Log("Voxel hidden faces audit PASS");
    }
#endif
}

inline void pointerEvent(SDL_Renderer* renderer, SDL_Event event, Controls& state) {
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        state.dragging = false;
        SDL_CaptureMouse(false);
    }
    const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT;
    const bool move = event.type == SDL_EVENT_MOUSE_MOTION && state.dragging;
    if (!down && !move) {
        return;
    }
    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
        throw std::runtime_error(SDL_GetError());
    }
    float x = 0;
    float y = 0;
    if (down) {
        x = event.button.x;
        y = event.button.y;
        state.gridDrag = false;
#if LAB_CHECKPOINT >= 6
        state.gridDrag = pickCell(x, y, state.selected[1]).has_value();
#endif
        if (state.gridDrag || (x >= 0 && x < 640 && y >= 0 && y < 480)) {
            stop(state);
            state.dragging = true;
            SDL_CaptureMouse(true);
        }
    } else {
        x = event.motion.x;
        y = event.motion.y;
    }
#if LAB_CHECKPOINT >= 6
    if (state.gridDrag) {
        const auto selected = pickCell(x, y, state.selected[1]);
        if (selected.has_value()) {
            state.selected = *selected;
        }
    }
#endif
    if (move && !state.gridDrag && x >= 0 && x < 640 && y >= 0 && y < 480) {
        orbit(state.camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
        state.cache.frameDirty = true;
    }
}
} // namespace voxel
