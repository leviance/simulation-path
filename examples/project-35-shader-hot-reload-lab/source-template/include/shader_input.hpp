#pragma once
#include "gl_api.hpp"
#include "pipeline.hpp"

namespace lab {
struct PointerDrag { Uint8 button{}; ShutterState before{}; };
struct Commands { bool close{}, reload{}; };
#if LAB_CHECKPOINT >= 2
inline void tiltShutter(ShutterState& s, float delta) {
    s.angle = std::clamp(s.angle + delta, -45.0F, 65.0F);
    s.paused = true;
}
// [snippet move-crate]
inline void slideCrate(ShutterState& s, float delta) {
    s.boxX = std::clamp(s.boxX + delta, -2.1F, 2.1F);
}
// [/snippet move-crate]
inline void advanceBlades(ShutterState& s, float degrees, int& direction) {
    s.angle = std::clamp(s.angle + float(direction) * degrees, -38.0F, 42.0F);
    if (s.angle >= 42) direction = -1;
    if (s.angle <= -38) direction = 1;
}
#endif
inline Commands keyDown(ShutterState& s, SDL_Keycode key, int& direction) {
    Commands cmd{};
    if (key == SDLK_ESCAPE) cmd.close = true;
    else if (key == SDLK_R) { s = {}; direction = -1; }
    else if (key == SDLK_J) s.yaw = std::clamp(s.yaw - 4.0F, -55.0F, 65.0F);
    else if (key == SDLK_K) s.yaw = std::clamp(s.yaw + 4.0F, -55.0F, 65.0F);
    else if (key == SDLK_W) s.pitch = std::clamp(s.pitch + 3.0F, 7.0F, 50.0F);
    else if (key == SDLK_S) s.pitch = std::clamp(s.pitch - 3.0F, 7.0F, 50.0F);
    else if (key == SDLK_PLUS || key == SDLK_EQUALS) s.zoom = std::min(1.45F, s.zoom + 0.06F);
    else if (key == SDLK_MINUS) s.zoom = std::max(0.78F, s.zoom - 0.06F);
#if LAB_CHECKPOINT >= 2
    else if (key == SDLK_LEFT) tiltShutter(s, -3);
    else if (key == SDLK_RIGHT) tiltShutter(s, 3);
    else if (key == SDLK_A) slideCrate(s, -0.18F);
    else if (key == SDLK_D) slideCrate(s, 0.18F);
    else if (key == SDLK_Q) s.sun = std::max(-22.0F, s.sun - 2.0F);
    else if (key == SDLK_E) s.sun = std::min(22.0F, s.sun + 2.0F);
    else if (key == SDLK_1) { s.angle = 42; s.paused = true; }
    else if (key == SDLK_2) { s.angle = 23; s.paused = true; }
    else if (key == SDLK_3) { s.angle = -38; s.paused = true; }
    else if (key == SDLK_SPACE) s.paused = !s.paused;
    else if (key == SDLK_N) { s.paused = true; advanceBlades(s, 2, direction); }
#endif
#if LAB_CHECKPOINT >= 3
    else if (key == SDLK_V) { const bool wasDepth = s.mode == 1; s.mode = int(!wasDepth); }
#endif
#if LAB_CHECKPOINT >= 4
    else if (key == SDLK_H) s.shadows = !s.shadows;
#endif
#if LAB_CHECKPOINT >= 5
    else if (key == SDLK_F) s.filtering = !s.filtering;
    else if (key == SDLK_LEFTBRACKET) s.bias = std::max(0.0F, s.bias - 0.0005F);
    else if (key == SDLK_RIGHTBRACKET) s.bias = std::min(0.012F, s.bias + 0.0005F);
#endif
#if LAB_CHECKPOINT >= 6
    else if (key == SDLK_F5) cmd.reload = true;
    else if (key == SDLK_TAB) s.inspect = !s.inspect;
#endif
#if LAB_CHECKPOINT >= 7
    else if (key == SDLK_M) s.mode = (s.mode + 1) % 4;
#endif
    return cmd;
}
inline void releasePointer(PointerDrag& drag) {
    if (drag.button) SDL_CaptureMouse(false);
    drag.button = 0;
}
inline Commands handleRoomEvent(ShutterState& s, PointerDrag& drag, const SDL_Event& e, int w, int h, int& dir) {
    if (e.type == SDL_EVENT_QUIT) return {true, false};
    if (e.type == SDL_EVENT_WINDOW_FOCUS_LOST || e.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
        releasePointer(drag); s.paused = true;
    }
    if (e.type == SDL_EVENT_KEY_DOWN && !e.key.repeat && !(e.key.mod & (SDL_KMOD_ALT | SDL_KMOD_CTRL | SDL_KMOD_GUI))) {
        if (drag.button && e.key.key == SDLK_ESCAPE) { s = drag.before; releasePointer(drag); return {}; }
        if (!drag.button) return keyDown(s, e.key.key, dir);
    }
    if (e.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !drag.button && (e.button.button == SDL_BUTTON_LEFT || e.button.button == SDL_BUTTON_RIGHT)) {
        if (SDL_CaptureMouse(true)) { drag.before = s; drag.button = e.button.button; s.paused = true; }
    } else if (e.type == SDL_EVENT_MOUSE_MOTION && drag.button) {
        const float dx = e.motion.xrel / float(std::max(1, w)), dy = e.motion.yrel / float(std::max(1, h));
        if (drag.button == SDL_BUTTON_RIGHT) {
            s.yaw = std::clamp(s.yaw - 110.0F * dx, -55.0F, 65.0F);
            s.pitch = std::clamp(s.pitch + 75.0F * dy, 7.0F, 50.0F);
        }
#if LAB_CHECKPOINT >= 2
        if (drag.button == SDL_BUTTON_LEFT) tiltShutter(s, 130.0F * dx);
#endif
    } else if (e.type == SDL_EVENT_MOUSE_BUTTON_UP && e.button.button == drag.button) releasePointer(drag);
    else if (e.type == SDL_EVENT_MOUSE_WHEEL) {
        float delta = e.wheel.y;
        if (e.wheel.direction == SDL_MOUSEWHEEL_FLIPPED) delta = -delta;
        s.zoom = std::clamp(s.zoom + 0.06F * delta, 0.78F, 1.45F);
    }
    return {};
}
} // namespace lab
