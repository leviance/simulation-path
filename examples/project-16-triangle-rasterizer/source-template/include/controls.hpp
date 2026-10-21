#pragma once
#include "scene.hpp"
#include <SDL3/SDL_keycode.h>

namespace lab {
// Chỉ đổi state; mouse capture được main nhả trước khi gọi handler.
inline void handleKey(Scene& scene, SDL_Keycode key, bool repeat) {
#if LAB_CHECKPOINT >= 1
    if (!repeat && (key == SDLK_R || (key >= SDLK_1 && key <= SDLK_5))) {
        int preset = 1;
        if (key != SDLK_R) {
            preset = static_cast<int>(key - SDLK_0);
        }
        applyPreset(scene, preset);
    }
    if (!repeat && key == SDLK_TAB) {
        scene.selected = (scene.selected + 1) % 3;
    }

    Vec2 delta{};
    if (key == SDLK_LEFT) {
        delta.x = -1.0;
    }
    if (key == SDLK_RIGHT) {
        delta.x = 1.0;
    }
    if (key == SDLK_UP) {
        delta.y = -1.0;
    }
    if (key == SDLK_DOWN) {
        delta.y = 1.0;
    }
    if (delta.x != 0.0 || delta.y != 0.0) {
        if (scene.worldMode) {
            Vec3& point = scene.world[static_cast<std::size_t>(scene.selected)];
            point.x = std::clamp(point.x + delta.x * 0.1, -6.0, 6.0);
            point.y = std::clamp(point.y - delta.y * 0.1, -4.0, 4.0);
        } else {
            Vec2& point = editableVertex(scene.triangle, scene.selected);
            point.x = std::clamp(point.x + delta.x, -200.0, 1300.0);
            point.y = std::clamp(point.y + delta.y, -200.0, 1000.0);
            scene.shared = false;
        }
        resetScan(scene);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!repeat && key == SDLK_SPACE) {
        scene.paused = !scene.paused;
        if (!scene.paused) {
            scene.candidateLimit = 0;
        }
    }
    if (!repeat && key == SDLK_N && scene.paused) {
        if (scene.candidateLimit == kAllCandidates) {
            scene.candidateLimit = 0;
        }
        scene.candidateLimit = std::min(std::size_t(1760000), scene.candidateLimit + 1);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!repeat && key == SDLK_T) {
        if (scene.rule == FillRule::TopLeft) {
            scene.rule = FillRule::Inclusive;
        } else {
            scene.rule = FillRule::TopLeft;
        }
        resetScan(scene);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (!repeat && key == SDLK_C) {
        scene.barycentricColor = !scene.barycentricColor;
        resetScan(scene);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (!repeat && key == SDLK_B) {
        scene.worldMode = !scene.worldMode;
        resetScan(scene);
    }
    if (!repeat && key == SDLK_F) {
        scene.debug = !scene.debug;
        resetScan(scene);
    }
    if (key == SDLK_PAGEUP || key == SDLK_PAGEDOWN) {
        Vec3& point = scene.world[static_cast<std::size_t>(scene.selected)];
        double change = 0.1;
        if (key == SDLK_PAGEDOWN) {
            change = -0.1;
        }
        point.z = std::clamp(point.z + change, 2.5, 10.0);
        resetScan(scene);
    }
    if (key == SDLK_J || key == SDLK_L) {
        double change = 0.1;
        if (key == SDLK_J) {
            change = -0.1;
        }
        scene.camera.position.x = std::clamp(scene.camera.position.x + change, -1.5, 1.5);
        resetScan(scene);
    }
    if (key == SDLK_U || key == SDLK_O) {
        double change = 0.1;
        if (key == SDLK_U) {
            change = -0.1;
        }
        scene.camera.position.z = std::clamp(scene.camera.position.z + change, -1.0, 1.0);
        resetScan(scene);
    }
    if (key == SDLK_EQUALS || key == SDLK_PLUS || key == SDLK_MINUS) {
        double change = -0.03490658503988659;
        if (key == SDLK_MINUS) {
            change = -change;
        }
        scene.camera.fov = std::clamp(scene.camera.fov + change, 0.6981317007977318, 1.7453292519943295);
        resetScan(scene);
    }
#endif
    (void)scene;
    (void)key;
    (void)repeat;
}
} // namespace lab
