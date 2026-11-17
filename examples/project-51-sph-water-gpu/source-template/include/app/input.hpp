#pragma once
#include "app/panel.hpp"

namespace water51 {
// Capture the tool at drag start; camera motion cannot turn into obstacle motion mid-drag.

struct Pointer {
    bool active = false;
    bool stir = false;
    float x = 0;
    float y = 0;
};

inline void key(SDL_Keycode key, Controls& c, Camera& camera, Engine& engine, bool control) {
    if (c.stir && !control && engine.model().preset == Preset::Obstacle && (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN)) {
        Vec3 target{engine.meta().target.x, engine.meta().target.y, engine.meta().target.z};
        if (key == SDLK_LEFT)
            target.x -= .03;
        if (key == SDLK_RIGHT)
            target.x += .03;
        if (key == SDLK_UP)
            target.z -= .03;
        if (key == SDLK_DOWN)
            target.z += .03;
        engine.target(target);
        return;
    }
    if (key == SDLK_SPACE && lessonStage >= 5)
        c.paused = !c.paused;
    if (key == SDLK_RETURN && lessonStage >= 5) {
        c.paused = true;
        c.step = true;
    }
    if (key == SDLK_R) {
        c.reset = true;
        c.paused = true;
    }
    if (key == SDLK_A) {
        c.apply = true;
        c.paused = true;
    }
    if (key == SDLK_O)
        c.stir = false;
    if (key == SDLK_T && engine.model().preset == Preset::Obstacle)
        c.stir = true;
    if (key == SDLK_B && lessonStage >= 12) {
        c.benchmark = true;
        c.paused = true;
    }
    if (key == SDLK_M) {
        int mode = static_cast<int>(c.view) + 1;
        if (mode > 3)
            mode = 0;
#if LAB_CHECKPOINT < 8
        if (mode == 0)
            mode = 1;
#endif
        c.view = static_cast<View>(mode);
    }
    if (key == SDLK_1)
        c.preset = Preset::Dam;
    if (key == SDLK_2)
        c.preset = Preset::Pool;
    if (key == SDLK_3)
        c.preset = Preset::Obstacle;
    if (key == SDLK_LEFT)
        camera.yaw -= .08;
    if (key == SDLK_RIGHT)
        camera.yaw += .08;
    if (key == SDLK_UP)
        camera.pitch += .06;
    if (key == SDLK_DOWN)
        camera.pitch -= .06;
    if (key == SDLK_MINUS)
        camera.distance *= 1.08;
    if (key == SDLK_EQUALS || key == SDLK_PLUS)
        camera.distance /= 1.08;
}

// [snippet pointer-tools]
inline void pointerMotion(Pointer& pointer, Camera& camera, Engine& engine, float x, float y, int width, int height) {
    if (!pointer.active)
        return;
    if (pointer.stir) {
        camera.update(height);
        if (engine.model().preset == Preset::Obstacle)
            engine.target(camera.groundPick(x, y, width, height));
    } else {
        camera.yaw -= (x - pointer.x) * .006;
        camera.pitch += (y - pointer.y) * .006;
    }
    pointer.x = x;
    pointer.y = y;
}

// [/snippet pointer-tools]
} // namespace water51
