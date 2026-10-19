#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, Framebuffer::width, Framebuffer::height);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE) || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

// SDL trình bày ảnh CPU và chữ ASCII; không làm thay phép biến đổi hay slider.
inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 16, 14, "SQUARE TRANSFORMER | R: identity | F1-F5: presets | Esc: quit") ||
        !text(renderer, 16, 34, "A/D: scaleX | S/W: scaleY | Q/E: angle | J/L: shearX | K/I: shearY")) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    const Vec2 vertex = worldPoint({1.0, 1.0}, scene);
    const Vec2 basisX = worldPoint({1.0, 0.0}, scene);
    const Vec2 basisY = worldPoint({0.0, 1.0}, scene);
    const Vec2 origin = worldPoint({}, scene);
    char label[240]{};
    std::snprintf(label, sizeof(label), "P2 local(1,1) -> world(%.3f,%.3f) | ex(%.2f,%.2f) ey(%.2f,%.2f)", vertex.x, vertex.y, basisX.x - origin.x, basisX.y - origin.y, basisY.x - origin.x, basisY.y - origin.y);
    if (!text(renderer, 16, 58, label) || !text(renderer, 16, 750, "GREY original/world grid | GREEN transformed square/grid | RED ex | BLUE ey | YELLOW local origin")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const Mat3 matrix = sceneMatrix(scene);
    for (int row = 0; row < 3; ++row) {
        char line[100]{};
        std::snprintf(line, sizeof(line), "[% .3f % .3f % .3f]", matrix.at(row, 0), matrix.at(row, 1), matrix.at(row, 2));
        if (!text(renderer, 940, 610.0f + 18.0f * row, line)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 6
    const char* orderLabel = "S -> H -> R -> T";
    if (scene.order == TransformOrder::RotateShearScale) {
        orderLabel = "R -> H -> S -> T";
    }
    if (!text(renderer, 940, 690, orderLabel) || !text(renderer, 940, 710, "O: switch order")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    for (int index = 0; index < 7; ++index) {
        char value[80]{};
        std::snprintf(value, sizeof(value), "%s: % .3f", kSliders[static_cast<std::size_t>(index)].label, parameterValue(scene, index));
        if (!text(renderer, 940, static_cast<float>(sliderY(index) - 24.0), value)) {
            return false;
        }
    }
    const char* state = "PAUSED | Space: animate | N: step";
    if (!scene.paused) {
        state = "RUNNING | Space: pause";
    }
    if (!text(renderer, 16, 80, state) || !text(renderer, 940, 110, "Up/Down select; Left/Right edit")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    const Square square = transformedSquare(scene);
    const double determinant = determinantLinearPart(matrix);
    const double areaRatio = polygonArea(square) / 4.0;
    const Vec2 direct = directTransform({1.0, 1.0}, scene);
    const double error = std::hypot(vertex.x - direct.x, vertex.y - direct.y);
    const char* orientation = "preserved";
    if (std::abs(determinant) <= 1e-10) {
        orientation = "singular/near-singular";
    } else if (determinant < 0.0) {
        orientation = "reversed";
    }
    std::snprintf(label, sizeof(label), "det %.6f (%s) | area ratio %.6f | direct/matrix error %.2e", determinant, orientation, areaRatio, error);
    if (!text(renderer, 16, 775, label)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
