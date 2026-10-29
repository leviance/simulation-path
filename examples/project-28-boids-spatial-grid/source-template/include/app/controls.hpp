#pragma once
#include "scene.hpp"
#include <SDL3/SDL.h>

namespace lab {

// Đổi tham số phải hủy công việc dựa trên snapshot cũ trước khi chạy bước mới.
inline void applyKey(GridScene& scene, SDL_Keycode key) {
    if (key == SDLK_SPACE) {
        const bool wasPaused = scene.paused;
        stopScene(scene);
        scene.paused = !wasPaused;
    }
    if (key == SDLK_N) {
        requestStep(scene);
    }
    if (key == SDLK_R) {
        resetScene(scene);
    }
    if (key == SDLK_F) {
        scene.debug = !scene.debug;
    }
    if (key == SDLK_F3) {
        scene.showCells = !scene.showCells;
    }
    if (key == SDLK_F4) {
        scene.showOccupancy = !scene.showOccupancy;
    }
    if (key == SDLK_LEFT || key == SDLK_RIGHT) {
        std::size_t increment = 1;
        if (key == SDLK_LEFT) {
            increment = scene.boids.size() - 1;
        }
        scene.selected = (scene.selected + increment) % scene.boids.size();
        scene.inspectionDirty = true;
    }
    if (key == SDLK_1 || key == SDLK_2) {
        scene.count = 256;
        if (key == SDLK_2) {
            scene.count = 1024;
        }
        resetScene(scene);
    }
#if LAB_CHECKPOINT >= 5
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_3) {
        scene.count = 10000;
        resetScene(scene);
    }
#endif
    if (key == SDLK_M) {
        stopScene(scene);
        if (scene.method == Method::Brute) {
            scene.method = Method::Grid;
        } else if (scene.count <= 1024) {
            scene.method = Method::Brute;
        } else {
            scene.notice = "Brute requires N <= 1024. N was not changed.";
        }
    }
#endif
    if (key == SDLK_P) {
        ++scene.seed;
        resetScene(scene);
    }
    if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
        invalidateModel(scene);
        double change = 4;
        if (key == SDLK_LEFTBRACKET) {
            change = -4;
        }
        scene.cellSize = std::clamp(scene.cellSize + change, 16.0, 240.0);
    }
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_L) {
        if (scene.layout == Layout::Uniform) {
            scene.layout = Layout::Clustered;
        } else if (scene.layout == Layout::Clustered) {
            scene.layout = Layout::Dense;
        } else {
            scene.layout = Layout::Uniform;
        }
        resetScene(scene);
    }
#endif
    const bool parametersChanged = key == SDLK_Q || key == SDLK_A || key == SDLK_W || key == SDLK_S || key == SDLK_E || key == SDLK_D || key == SDLK_T || key == SDLK_G || key == SDLK_Y || key == SDLK_H || key == SDLK_U || key == SDLK_J;
    if (parametersChanged) {
        invalidateModel(scene);
        if (key == SDLK_Q) {
            scene.params.separationWeight = std::min(5.0, scene.params.separationWeight + 0.1);
        }
        if (key == SDLK_A) {
            scene.params.separationWeight = std::max(0.0, scene.params.separationWeight - 0.1);
        }
        if (key == SDLK_W) {
            scene.params.alignmentWeight = std::min(5.0, scene.params.alignmentWeight + 0.1);
        }
        if (key == SDLK_S) {
            scene.params.alignmentWeight = std::max(0.0, scene.params.alignmentWeight - 0.1);
        }
        if (key == SDLK_E) {
            scene.params.cohesionWeight = std::min(5.0, scene.params.cohesionWeight + 0.1);
        }
        if (key == SDLK_D) {
            scene.params.cohesionWeight = std::max(0.0, scene.params.cohesionWeight - 0.1);
        }
        if (key == SDLK_T) {
            scene.params.radius = std::min(240.0, scene.params.radius + 4.0);
        }
        if (key == SDLK_G) {
            scene.params.radius = std::max(0.0, scene.params.radius - 4.0);
        }
        if (key == SDLK_Y) {
            scene.params.maxSpeed = std::min(240.0, scene.params.maxSpeed + 5.0);
        }
        if (key == SDLK_H) {
            scene.params.maxSpeed = std::max(10.0, scene.params.maxSpeed - 5.0);
        }
        if (key == SDLK_U) {
            scene.params.maxAcceleration = std::min(240.0, scene.params.maxAcceleration + 5.0);
        }
        if (key == SDLK_J) {
            scene.params.maxAcceleration = std::max(10.0, scene.params.maxAcceleration - 5.0);
        }
    }
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_V) {
        stopScene(scene);
        if (scene.count > 1024) {
            scene.notice = "Choose N <= 1024 for full validation. No automatic downsampling.";
        } else {
            scene.validation = createValidation(scene.boids, scene.params, scene.cellSize);
        }
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_B || key == SDLK_K) {
        stopScene(scene);
        scene.benchmark = createGridBenchmark(scene.params, scene.seed, scene.cellSize, scene.layout, key == SDLK_K);
        scene.resultPage = 0;
    }
    if (key == SDLK_F5 && scene.resultPage > 0) {
        --scene.resultPage;
    }
    if (key == SDLK_F6 && (scene.resultPage + 1) * 3 < scene.benchmark.rows.size()) {
        ++scene.resultPage;
    }
#endif
}
} // namespace lab
