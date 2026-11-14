#pragma once

#include "atom_camera.hpp"
#include "atom_config.hpp"
#include "atom_gl.hpp"
#include <optional>

namespace atom {

enum class Action {
    none,
    preset,
    pane,
    count,
    seed,
    reset,
    cancel,
    pause,
    compare,
    fit,
    palette,
    clip,
    axis,
    clipLess,
    clipMore,
    probe,
    probeLess,
    probeMore,
    opacityLess,
    opacityMore,
    sizeLess,
    sizeMore,
    boost,
    debug,
    mode,
    save,
    load,
    camera
};

struct Command {
    Action action{Action::none};
    int value{};
};

inline Command keyCommand(SDL_Keycode key) {
    if (key >= SDLK_1 && key <= SDLK_9)
        return {Action::preset, static_cast<int>(key - SDLK_1)};
    if (key == SDLK_0)
        return {Action::preset, 9};
    switch (key) {
    case SDLK_TAB:
        return {Action::pane};
    case SDLK_N:
        return {Action::count};
    case SDLK_S:
        return {Action::seed};
    case SDLK_R:
        return {Action::reset};
    case SDLK_C:
        return {Action::cancel};
    case SDLK_SPACE:
        return {Action::pause};
    case SDLK_F1:
        return {Action::debug};
    case SDLK_F2:
        return {Action::compare};
    case SDLK_F3:
        return {Action::fit};
    case SDLK_F4:
        return {Action::palette};
    case SDLK_F5:
        return {Action::clip};
    case SDLK_F6:
        return {Action::save};
    case SDLK_F7:
        return {Action::load};
    case SDLK_X:
        return {Action::axis};
    case SDLK_LEFTBRACKET:
        return {Action::clipLess};
    case SDLK_RIGHTBRACKET:
        return {Action::clipMore};
    case SDLK_P:
        return {Action::probe};
    case SDLK_COMMA:
        return {Action::probeLess};
    case SDLK_PERIOD:
        return {Action::probeMore};
    case SDLK_MINUS:
        return {Action::opacityLess};
    case SDLK_EQUALS:
        return {Action::opacityMore};
    case SDLK_PAGEDOWN:
        return {Action::sizeLess};
    case SDLK_PAGEUP:
        return {Action::sizeMore};
    case SDLK_B:
        return {Action::boost};
    case SDLK_M:
        return {Action::mode};
    case SDLK_HOME:
        return {Action::camera};
    default:
        return {};
    }
}

// A single pointer owns a drag. Focus loss releases capture and never leaves a
// stale mouse delta that would make the camera jump when the window is focused.
struct PointerDrag {
    std::optional<Uint8> button;
    float x{}, y{};

    void release() {
        button.reset();
        SDL_CaptureMouse(false);
    }

    void begin(Uint8 pressed, float newX, float newY) {
        if (button)
            return;
        button = pressed;
        x = newX;
        y = newY;
        SDL_CaptureMouse(true);
    }

    void move(Camera& camera, float newX, float newY) {
        if (!button)
            return;
        if (*button == SDL_BUTTON_LEFT)
            camera.orbit(newX - x, newY - y);
        else
            camera.pan(newX - x, newY - y);
        x = newX;
        y = newY;
    }
};

inline std::uint32_t nextPointCount(std::uint32_t current) {
    constexpr std::array<std::uint32_t, 5> counts{1024, 16384, 100000, 1000000, 5000000};
    for (auto count : counts)
        if (count > current)
            return count;
    return counts.front();
}

} // namespace atom
