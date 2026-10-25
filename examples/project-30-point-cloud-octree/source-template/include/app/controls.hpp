#pragma once
// Đổi vùng chọn hoặc filter không reset camera.
#include "io/files.hpp"
#include "stage.hpp"
#include "survey/benchmark.hpp"
#include <SDL3/SDL.h>

namespace survey {
inline void cameraKey(Camera& camera, SDL_Keycode key) {
    const Basis basis = cameraBasis(camera);
    if (key == SDLK_W) {
        translateCamera(camera, basis.forward * 0.5);
    }
    if (key == SDLK_S) {
        translateCamera(camera, basis.forward * -0.5);
    }
    if (key == SDLK_A) {
        translateCamera(camera, basis.right * -0.5);
    }
    if (key == SDLK_D) {
        translateCamera(camera, basis.right * 0.5);
    }
    if (key == SDLK_Q) {
        translateCamera(camera, {0, -0.5, 0});
    }
    if (key == SDLK_E) {
        translateCamera(camera, {0, 0.5, 0});
    }
}

// [snippet:regionKey]
inline bool regionKey(Region& region, SDL_Keycode key) {
    bool changed = true;
    if (key == SDLK_J) {
        region.center.x -= 0.5;
    } else if (key == SDLK_L) {
        region.center.x += 0.5;
    } else if (key == SDLK_I) {
        region.center.y += 0.5;
    } else if (key == SDLK_K) {
        region.center.y -= 0.5;
    } else if (key == SDLK_U) {
        region.center.z -= 0.5;
    } else if (key == SDLK_O) {
        region.center.z += 0.5;
    } else if (key == SDLK_1) {
        region.shape = Shape::Box;
    } else if (key == SDLK_2) {
        region.shape = Shape::Sphere;
    } else if (key == SDLK_LEFTBRACKET) {
        region.half = region.half * 0.8;
        region.half.x = std::max(0.05, region.half.x);
        region.half.y = std::max(0.05, region.half.y);
        region.half.z = std::max(0.05, region.half.z);
        region.radius = std::max(0.05, region.radius * 0.8);
    } else if (key == SDLK_RIGHTBRACKET) {
        region.half = region.half * 1.25;
        region.half.x = std::min(1000.0, region.half.x);
        region.half.y = std::min(1000.0, region.half.y);
        region.half.z = std::min(1000.0, region.half.z);
        region.radius = std::min(1000.0, region.radius * 1.25);
    } else {
        changed = false;
    }
    region.center.x = std::clamp(region.center.x, -10000.0, 10000.0);
    region.center.y = std::clamp(region.center.y, -10000.0, 10000.0);
    region.center.z = std::clamp(region.center.z, -10000.0, 10000.0);
    return changed;
}

// [/snippet:regionKey]

inline void handleKey(Scene& scene, Job& job, SDL_Keycode key, SDL_Keymod modifiers) {
    static_cast<void>(scene);
    static_cast<void>(modifiers);
    if (key == SDLK_SPACE) {
        job.paused = !job.paused;
        return;
    }
    // Không ghép kết quả của hai workload khác nhau vào cùng benchmark.
    job.active = false;
    job.report.clear();
#if LAB_CHECKPOINT >= 2
    if (!scene.camera.freeFly) {
        cameraKey(scene.camera, key);
    }
    if (key == SDLK_F) {
        switchCameraMode(scene.camera);
    }
    if (key == SDLK_HOME) {
        resetCamera(scene.camera, scene.tree.nodes[0].bounds);
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (regionKey(scene.region, key)) {
        scene.selectionEnabled = true;
        refreshSelection(scene);
    }
    if (key == SDLK_DELETE || key == SDLK_BACKSPACE) {
        scene.selectionEnabled = false;
        refreshSelection(scene);
        scene.notice = "Selection cleared; dataset unchanged.";
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_M) {
        scene.useTree = !scene.useTree;
        refreshSelection(scene);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_C) {
        scene.culling = !scene.culling;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_T) {
        scene.debug = !scene.debug;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_H) {
        scene.filtered = !scene.filtered;
        scene.region.minimumHeight = -10000;
        scene.region.maximumHeight = 10000;
        if (scene.filtered) {
            scene.region.minimumHeight = 0;
            scene.region.maximumHeight = 3;
        }
        refreshSelection(scene);
    }
    if (key == SDLK_PAGEUP || key == SDLK_PAGEDOWN) {
        double delta = 0.25;
        if (key == SDLK_PAGEDOWN) {
            delta = -0.25;
        }
        if (modifiers & SDL_KMOD_SHIFT) {
            scene.region.minimumHeight = std::clamp(scene.region.minimumHeight + delta, -10000.0, scene.region.maximumHeight);
        } else {
            scene.region.maximumHeight = std::clamp(scene.region.maximumHeight + delta, scene.region.minimumHeight, 10000.0);
        }
        refreshSelection(scene);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_X) {
        const auto path = exportSelection(scene.points, scene.selected);
        scene.notice = "Exported " + std::to_string(scene.selected.indices.size()) + " points to " + path.string();
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_V) {
        job = startValidation(scene);
    }
#endif
#if LAB_CHECKPOINT >= 10
    if (key == SDLK_B) {
        job = startBenchmark(scene);
    }
#endif
}
} // namespace survey
