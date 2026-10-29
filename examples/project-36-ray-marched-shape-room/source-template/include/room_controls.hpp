#pragma once
#include "room_frame.hpp"
#include <SDL3/SDL.h>

namespace lab {

// Input không sửa primitive khi đang xoay camera; clock đèn được xử lý riêng.
struct RoomControls {
    bool looking{};
    bool reloadRequested{};

    void release(SDL_Window* window) {
        looking = false;
        SDL_SetWindowRelativeMouseMode(window, false);
    }

    bool event(SDL_Window* window, const SDL_Event& event, RayMarchFrame& frame) {
        if (event.type == SDL_EVENT_QUIT) {
            return false;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
            release(window);
            return true;
        }
#if LAB_CHECKPOINT >= 9
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_RIGHT) {
            looking = SDL_SetWindowRelativeMouseMode(window, true);
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_RIGHT) {
            release(window);
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION && looking) {
            lookCamera(frame.camera, event.motion.xrel, event.motion.yrel);
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL) {
            frame.camera.verticalFieldOfViewRadians = std::clamp(frame.camera.verticalFieldOfViewRadians - event.wheel.y * 0.04, 0.45, 1.65);
        }
#endif
        if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat) {
            return true;
        }
        if ((event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_GUI | SDL_KMOD_ALT)) != 0) {
            return true;
        }
        const SDL_Keycode key = event.key.key;
        if (key == SDLK_ESCAPE) {
            if (looking) {
                release(window);
                return true;
            }
            return false;
        }
        if (key == SDLK_R) {
            release(window);
            frame = {};
        }
        if (key == SDLK_F5) {
            reloadRequested = true;
        }
        if (key == SDLK_TAB) {
            frame.showDebug = !frame.showDebug;
        }
#if LAB_CHECKPOINT >= 8
        if (key == SDLK_SPACE) {
            frame.paused = !frame.paused;
        }
        if (key == SDLK_N) {
            frame.paused = true;
            frame.elapsedSeconds += 0.1;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (key == SDLK_LEFTBRACKET) {
            frame.settings.maximumSteps = std::max(1, frame.settings.maximumSteps - 16);
        }
        if (key == SDLK_RIGHTBRACKET) {
            frame.settings.maximumSteps = std::min(256, frame.settings.maximumSteps + 16);
        }
        if (key == SDLK_MINUS) {
            frame.settings.hitEpsilon = std::max(1e-5, frame.settings.hitEpsilon * 0.5);
        }
        if (key == SDLK_EQUALS) {
            frame.settings.hitEpsilon = std::min(0.02, frame.settings.hitEpsilon * 2.0);
        }
#endif
#if LAB_CHECKPOINT >= 9
        if (key == SDLK_J) {
            frame.scene.sphereRadius = std::max(0.4, frame.scene.sphereRadius - 0.05);
        }
        if (key == SDLK_K) {
            frame.scene.sphereRadius = std::min(1.1, frame.scene.sphereRadius + 0.05);
        }
        if (key == SDLK_U) {
            frame.scene.torusMinorRadius = std::max(0.12, frame.scene.torusMinorRadius - 0.02);
        }
        if (key == SDLK_I) {
            frame.scene.torusMinorRadius = std::min(0.32, frame.scene.torusMinorRadius + 0.02);
        }
#endif
#if LAB_CHECKPOINT >= 10
        if (key == SDLK_V) {
            frame.debugView = (frame.debugView + 1) % 4;
        }
#endif
        return true;
    }

    void advance(SDL_Window* window, RayMarchFrame& frame, double frameSeconds) {
        if (!std::isfinite(frameSeconds) || frameSeconds < 0.0) {
            return;
        }
        const double dt = std::min(frameSeconds, 0.05);
#if LAB_CHECKPOINT >= 8
        if (!frame.paused) {
            frame.elapsedSeconds += dt;
        }
#endif
#if LAB_CHECKPOINT >= 9
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) == 0) {
            return;
        }
        const bool* keys = SDL_GetKeyboardState(nullptr);
        Vec3 local{};
        if (keys[SDL_SCANCODE_W]) { local.z += 1.0; }
        if (keys[SDL_SCANCODE_S]) { local.z -= 1.0; }
        if (keys[SDL_SCANCODE_A]) { local.x -= 1.0; }
        if (keys[SDL_SCANCODE_D]) { local.x += 1.0; }
        if (keys[SDL_SCANCODE_E]) { local.y += 1.0; }
        if (keys[SDL_SCANCODE_Q]) { local.y -= 1.0; }
        if (length(local) > 0.0) {
            moveCamera(frame.camera, normalize(local) * (frame.moveSpeed * dt));
        }
#endif
    }
};

} // namespace lab
