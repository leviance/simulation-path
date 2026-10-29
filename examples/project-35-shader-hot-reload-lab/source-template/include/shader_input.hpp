#pragma once
#include "gl_api.hpp"
#include "pipeline.hpp"

namespace lab {
inline constexpr std::size_t visibleShaderEffects() {
#if LAB_CHECKPOINT >= 9
    return 4;
#elif LAB_CHECKPOINT >= 8
    return 3;
#elif LAB_CHECKPOINT >= 7
    return 2;
#else
    return 1;
#endif
}

struct ShaderKeyResult {
    bool reload{}, resetWatch{}, close{}, cancelDrag{};
};

inline ShaderKeyResult handleShaderKey([[maybe_unused]] ShaderScene& scene, SDL_Keycode key, bool dragging, [[maybe_unused]] int& logOffset) {
    ShaderKeyResult result{};
    if (key == SDLK_ESCAPE) {
        result.cancelDrag = dragging;
        result.close = !dragging;
    }
#if LAB_CHECKPOINT >= 4
    else if (key == SDLK_F5)
        result.reload = true;
#endif
#if LAB_CHECKPOINT >= 7
    else if (key >= SDLK_1 && key < SDLK_1 + visibleShaderEffects()) {
        scene.requestedEffect = std::size_t(key - SDLK_1);
        result.reload = result.resetWatch = true;
        logOffset = 0;
    }
#endif
    else if (dragging)
        return result;
#if LAB_CHECKPOINT >= 5
    else if (key == SDLK_A) {
        scene.autoReload = !scene.autoReload;
        result.reload = scene.autoReload;
        result.resetWatch = true;
    }
#endif
#if LAB_CHECKPOINT >= 6
    else if (key == SDLK_SPACE)
        scene.paused = !scene.paused;
    else if (key == SDLK_N) {
        scene.paused = true;
        scene.timeSeconds += 1.0 / 30;
    } else if (key == SDLK_R)
        resetShaderView(scene);
    else if (key == SDLK_PLUS || key == SDLK_EQUALS)
        zoomShader(scene, 1);
    else if (key == SDLK_MINUS)
        zoomShader(scene, -1);
    else if (key == SDLK_LEFT)
        scene.mouseX = std::max(0.0, scene.mouseX - 0.03);
    else if (key == SDLK_RIGHT)
        scene.mouseX = std::min(1.0, scene.mouseX + 0.03);
    else if (key == SDLK_UP)
        scene.mouseY = std::max(0.0, scene.mouseY - 0.03);
    else if (key == SDLK_DOWN)
        scene.mouseY = std::min(1.0, scene.mouseY + 0.03);
#endif
#if LAB_CHECKPOINT >= 10
    else if (key == SDLK_TAB)
        scene.showDebug = !scene.showDebug;
    else if (key == SDLK_PAGEUP)
        logOffset = std::max(0, logOffset - 4);
    else if (key == SDLK_PAGEDOWN)
        logOffset = std::min(4096, logOffset + 4);
#endif
    return result;
}
} // namespace lab
