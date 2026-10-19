#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {
// SDL chỉ trình bày texture CPU và chữ debug ASCII.
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 800);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST) || !SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool text(SDL_Renderer* renderer, float x, float y, const char* value) {
    return SDL_RenderDebugText(renderer, x, y, value);
}

inline bool label3D(SDL_Renderer* renderer, Vec3 point, const Camera& camera, const char* label) {
    const ProjectedPoint projected = projectPerspective(worldToCamera(point, camera));
    if (!projected.visible || projected.screen.x < 25.0 || projected.screen.x > 1020.0 || projected.screen.y < 145.0 || projected.screen.y > 660.0) {
        return true;
    }
    return text(renderer, static_cast<float>(projected.screen.x + 8.0), static_cast<float>(projected.screen.y - 8.0), label);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture, const Scene& scene) {
    if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr) || !SDL_SetRenderDrawColor(renderer, 225, 232, 250, 255)) {
        return false;
    }
    if (!text(renderer, 16, 14, "3D COMPASS | Perspective | A/D yaw, W/S pitch, +/- distance | R reset | Esc quit") || !text(renderer, 16, 34, "1/2/3 select vertex | arrows XY | PageUp/Down Z | F1-F5 presets | mouse drag: orbit (lesson 6+)")) {
        return false;
    }
    char value[220]{};
    std::snprintf(value, sizeof(value), "eye (%.2f, %.2f, %.2f) | yaw %.2f pitch %.2f radius %.2f", cameraEye(scene.camera).x, cameraEye(scene.camera).y, cameraEye(scene.camera).z, scene.camera.yaw, scene.camera.pitch, scene.camera.radius);
    if (!text(renderer, 16, 58, value)) {
        return false;
    }
#if LAB_CHECKPOINT >= 1
    if (!label3D(renderer, {3.0, 0.0, 0.0}, scene.camera, "X") || !label3D(renderer, {0.0, 3.0, 0.0}, scene.camera, "Y") || !label3D(renderer, {0.0, 0.0, 3.0}, scene.camera, "Z")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    const Triangle& triangle = scene.triangle;
    const Edges edges = triangleEdges(triangle);
    if (!label3D(renderer, triangle.p0, scene.camera, "P0") || !label3D(renderer, triangle.p1, scene.camera, "P1 / vector A tip") || !label3D(renderer, triangle.p2, scene.camera, "P2 / vector B tip")) {
        return false;
    }
    std::snprintf(value, sizeof(value), "vector A (%.2f,%.2f,%.2f) | vector B (%.2f,%.2f,%.2f) | selected P%d", edges.a.x, edges.a.y, edges.a.z, edges.b.x, edges.b.y, edges.b.z, scene.selected);
    if (!text(renderer, 16, 80, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 3
    const Vec3 raw = triangleRawNormal(triangle);
    std::snprintf(value, sizeof(value), "cross A x B (%.4g, %.4g, %.4g) | dot(N,A) %.2e dot(N,B) %.2e", raw.x, raw.y, raw.z, dot(raw, edges.a), dot(raw, edges.b));
    if (!text(renderer, 16, 102, value) || !text(renderer, 16, 702, "YELLOW raw cross: display length min(0.2*|N|,2.2) | ORANGE A | CYAN B")) {
        return false;
    }
    if (!normalHasDirection(triangle) && !text(renderer, 16, 124, "DEGENERATE / NEAR-COLLINEAR: normal direction and facing undefined (not front/back)")) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    const Vec3 unit = triangleUnitNormal(triangle);
    std::snprintf(value, sizeof(value), "unit N (%.4f,%.4f,%.4f) | area %.6g world^2 | MAGENTA unit display 1.4", unit.x, unit.y, unit.z, triangleArea(triangle));
    if (!normalHasDirection(triangle)) {
        std::snprintf(value, sizeof(value), "unit N undefined | measured area %.6g world^2 (not forced to zero)", triangleArea(triangle));
    }
    if (!text(renderer, 16, 724, value)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (normalHasDirection(triangle)) {
        const double facing = facingAmount(triangle, subtract(cameraEye(scene.camera), triangleCentroid(triangle)));
        const char* state = "edge-on";
        if (facing > 1e-6) {
            state = "front";
        } else if (facing < -1e-6) {
            state = "back";
        }
        std::snprintf(value, sizeof(value), "facing %.5f: %s (toward actual eye) | F: reverse P1/P2, area unchanged", facing, state);
        if (!text(renderer, 16, 746, value)) {
            return false;
        }
    }
#endif
#if LAB_CHECKPOINT >= 6
    const char* state = "PAUSED";
    if (!scene.paused) {
        state = "ORBITING";
    }
    if (!text(renderer, 900, 58, state)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    std::snprintf(value, sizeof(value), "relative orthogonality error %.2e | Space pause | N step 0.1s", orthogonalityError(triangle));
    if (!normalHasDirection(triangle)) {
        std::snprintf(value, sizeof(value), "relative orthogonality error undefined | Space pause | N step 0.1s");
    }
    if (!text(renderer, 16, 774, value)) {
        return false;
    }
#endif
    return SDL_RenderPresent(renderer);
}
} // namespace lab
