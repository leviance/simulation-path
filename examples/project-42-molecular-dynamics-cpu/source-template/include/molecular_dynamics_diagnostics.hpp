#pragma once

#if LAB_CHECKPOINT >= 6
#include <SDL3/SDL.h>
#include <string>
#include <vector>

namespace md_ui {

// SDL debug text chỉ hỗ trợ ASCII. Bảng này dành cho số đo của lab học tập.
inline bool drawDiagnostics(SDL_Renderer* renderer, int height, const std::vector<std::string>& lines) {
    const float scale = 1.5f;
    const float top = float(height) / scale - float(lines.size()) * 13.0f - 12.0f;
    if (!SDL_SetRenderScale(renderer, scale, scale)) {
        return false;
    }
    const SDL_FRect panel{12.0f, top - 5.0f, 470.0f, float(lines.size()) * 13.0f + 8.0f};
    bool valid = SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
    valid = SDL_RenderFillRect(renderer, &panel) && valid;
    valid = SDL_SetRenderDrawColor(renderer, 220, 225, 235, 255) && valid;
    for (std::size_t index = 0; index < lines.size(); ++index) {
        valid = SDL_RenderDebugText(renderer, 17.0f, top + float(index) * 13.0f, lines[index].c_str()) && valid;
    }
    return SDL_SetRenderScale(renderer, 1.0f, 1.0f) && valid;
}

} // namespace md_ui
#endif
