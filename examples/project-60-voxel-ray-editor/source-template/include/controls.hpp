#pragma once
#include "audit.hpp"
#include <SDL3/SDL.h>

namespace voxel {
// Input chỉ đổi state hoặc gọi một action; không tự giữ con trỏ vào mesh/Hit.
struct Controls {
    Editor editor;
    bool draggingCamera = false;
};

inline void stop(Controls& controls) {
    // Capture chỉ thuộc một lần kéo. Mất focus/reset phải nhả nó ngay.
    controls.editor.paused = true;
    controls.draggingCamera = false;
    SDL_CaptureMouse(false);
}

inline void keyDown(SDL_Keycode key, Controls& controls) {
    auto& state = controls.editor;

    // Nạp lại dữ liệu trước; các cache sẽ được cập nhật ở refresh kế tiếp.
    if (key == SDLK_R) {
        stop(controls);
        state = {};
    }
    if (key == SDLK_P) {
        stop(controls);
        state.preset = (state.preset + 1) % 7;
        state.chunk = makeChunk(state.preset);
        geometryChanged(state);
    }
    // Camera đổi ảnh và ray, nhưng không làm thay đổi topology của chunk.
    if (key == SDLK_LEFT) {
        orbit(state.camera, -8, 0);
        cameraChanged(state);
    }
    if (key == SDLK_RIGHT) {
        orbit(state.camera, 8, 0);
        cameraChanged(state);
    }
    if (key == SDLK_UP) {
        orbit(state.camera, 0, -8);
        cameraChanged(state);
    }
    if (key == SDLK_DOWN) {
        orbit(state.camera, 0, 8);
        cameraChanged(state);
    }
    if (key == SDLK_PLUS || key == SDLK_EQUALS || key == SDLK_MINUS) {
        double amount = 1;
        if (key == SDLK_MINUS) {
            amount = -1;
        }
        zoom(state.camera, amount);
        cameraChanged(state);
    }
#if LAB_CHECKPOINT >= 1
    // Aim nguyên theo pixel CPU, độc lập với kích thước cửa sổ và DPI.
    if (key == SDLK_W || key == SDLK_A || key == SDLK_S || key == SDLK_D) {
        if (key == SDLK_A) {
            state.pixelX = std::max(0, state.pixelX - 2);
        }
        if (key == SDLK_D) {
            state.pixelX = std::min(319, state.pixelX + 2);
        }
        if (key == SDLK_W) {
            state.pixelY = std::max(0, state.pixelY - 2);
        }
        if (key == SDLK_S) {
            state.pixelY = std::min(239, state.pixelY + 2);
        }
        state.pickDirty = true;
        state.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
        if (key == SDLK_LEFTBRACKET) {
            state.reach = std::max(1.0, state.reach - 1);
        } else {
            state.reach = std::min(64.0, state.reach + 1);
        }
        state.pickDirty = true;
        state.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_SPACE) {
        state.paused = !state.paused;
    }
    if (key == SDLK_N) {
        state.paused = true;
        state.shown = std::min(static_cast<int>(state.trace.visits.size()), state.shown + 1);
    }
#endif
#if LAB_CHECKPOINT >= 6
    // Main đã bỏ key repeat: một key-down chỉ tạo một action sửa chunk.
    if (key == SDLK_DELETE || key == SDLK_BACKSPACE) {
        edit(state, false);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_E) {
        edit(state, true);
    }
    if (key == SDLK_1 || key == SDLK_2 || key == SDLK_3) {
        state.material = static_cast<Block>(key - SDLK_0);
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_V) {
        audit();
        SDL_Log("Voxel ray editor audit PASS");
    }
#endif
}

inline void pointerEvent(SDL_Renderer* renderer, SDL_Event event, Controls& controls) {
    auto& state = controls.editor;
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_MIDDLE) {
        controls.draggingCamera = false;
        SDL_CaptureMouse(false);
    }
    const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN;
    const bool motion = event.type == SDL_EVENT_MOUSE_MOTION;
    if (!down && !motion) {
        return;
    }
    // SDL đổi cả tọa độ và relative motion về logical presentation đang dùng.
    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
        throw std::runtime_error(SDL_GetError());
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
    // Vùng ảnh CPU 320x240 được phóng 2 lần; sidebar/letterbox không tạo action.
    const bool inViewport = x >= 0 && y >= 0 && x < 640 && y < 480;
    if (down && inViewport && event.button.button == SDL_BUTTON_MIDDLE) {
        stop(controls);
        controls.draggingCamera = true;
        SDL_CaptureMouse(true);
        return;
    }
    if (motion && controls.draggingCamera) {
        orbit(state.camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
        cameraChanged(state);
        return;
    }
#if LAB_CHECKPOINT >= 1
    if (!inViewport) {
        return;
    }
    state.pixelX = static_cast<int>(x / 2);
    state.pixelY = static_cast<int>(y / 2);
    state.pickDirty = true;
    state.paused = true;
#if LAB_CHECKPOINT >= 6
    if (down && event.button.button == SDL_BUTTON_LEFT) {
        edit(state, false);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (down && event.button.button == SDL_BUTTON_RIGHT) {
        edit(state, true);
    }
#endif
#else
    static_cast<void>(inViewport);
#endif
}
} // namespace voxel
