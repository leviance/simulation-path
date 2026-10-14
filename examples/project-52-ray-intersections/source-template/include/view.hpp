#pragma once
#include "query.hpp"
#include <SDL3/SDL.h>
#include <array>

namespace picking {
constexpr int viewWidth = 900;
constexpr int viewHeight = 640;

// Clip the segment before projection: an inside-camera preset crosses the near plane.
#if LAB_CHECKPOINT >= 1
inline void line(SDL_Renderer* renderer, Vec3 a, Vec3 b, const Camera& camera) {
    const Vec3 forward = cameraBasis(camera).forward;
    const double da = dot(subtract(a, camera.origin), forward);
    const double db = dot(subtract(b, camera.origin), forward);
    constexpr double nearDepth = 0.051;
    if (da < nearDepth && db < nearDepth) {
        return;
    }
    if (da < nearDepth) {
        a = add(a, multiply(subtract(b, a), (nearDepth - da) / (db - da)));
    } else if (db < nearDepth) {
        b = add(b, multiply(subtract(a, b), (nearDepth - db) / (da - db)));
    }
    const auto pa = project(a, camera, viewWidth, viewHeight);
    const auto pb = project(b, camera, viewWidth, viewHeight);
    if (pa && pb) {
        SDL_RenderLine(renderer, static_cast<float>(pa->x), static_cast<float>(pa->y), static_cast<float>(pb->x), static_cast<float>(pb->y));
    }
}

inline void drawScene(SDL_Renderer* renderer, const Scene& scene, const Camera& camera) {
    SDL_SetRenderDrawColor(renderer, 83, 99, 130, 255);
    for (int i = -4; i <= 4; ++i) {
        line(renderer, {static_cast<double>(i), -1, -2}, {static_cast<double>(i), -1, 5}, camera);
        line(renderer, {-4, -1, static_cast<double>(i)}, {4, -1, static_cast<double>(i)}, camera);
    }
    // Three great circles are a visual guide; queries use the analytic sphere.
    SDL_SetRenderDrawColor(renderer, 98, 190, 255, 255);
    for (int axis = 0; axis < 3; ++axis) {
        for (int segment = 0; segment < 64; ++segment) {
            const double a = segment * 2 * 3.141592653589793 / 64;
            const double b = (segment + 1) * 2 * 3.141592653589793 / 64;
            Vec3 p{std::cos(a), std::sin(a), 0};
            Vec3 q{std::cos(b), std::sin(b), 0};
            if (axis == 1) {
                p = {std::cos(a), 0, std::sin(a)};
                q = {std::cos(b), 0, std::sin(b)};
            }
            if (axis == 2) {
                p = {0, std::cos(a), std::sin(a)};
                q = {0, std::cos(b), std::sin(b)};
            }
            line(renderer, add(scene.sphere.center, multiply(p, scene.sphere.radius)), add(scene.sphere.center, multiply(q, scene.sphere.radius)), camera);
        }
    }
    SDL_SetRenderDrawColor(renderer, 229, 182, 92, 255);
    std::array<Vec3, 8> corners{};
    for (int i = 0; i < 8; ++i) {
        corners[i] = scene.box.minimum;
        if ((i & 1) != 0)
            corners[i].x = scene.box.maximum.x;
        if ((i & 2) != 0)
            corners[i].y = scene.box.maximum.y;
        if ((i & 4) != 0)
            corners[i].z = scene.box.maximum.z;
    }
    for (int i = 0; i < 8; ++i) {
        for (int bit : {1, 2, 4}) {
            if ((i & bit) == 0)
                line(renderer, corners[i], corners[i | bit], camera);
        }
    }
    SDL_SetRenderDrawColor(renderer, 195, 135, 240, 255);
    line(renderer, scene.triangle.a, scene.triangle.b, camera);
    line(renderer, scene.triangle.b, scene.triangle.c, camera);
    line(renderer, scene.triangle.c, scene.triangle.a, camera);
}
#endif

#if LAB_CHECKPOINT >= 2
inline void drawRay(SDL_Renderer* renderer, const Ray& ray, double u, double v) {
    SDL_SetRenderDrawColor(renderer, 240, 240, 240, 255);
    const float x = static_cast<float>(u * viewWidth);
    const float y = static_cast<float>(v * viewHeight);
    SDL_RenderLine(renderer, x - 8, y, x + 8, y);
    SDL_RenderLine(renderer, x, y - 8, x, y + 8);
    // XZ inset makes the ray visible even though its camera projection is one pixel.
    SDL_FRect inset{15, 415, 210, 210};
    SDL_SetRenderDrawColor(renderer, 15, 21, 36, 255);
    SDL_RenderFillRect(renderer, &inset);
    SDL_SetRenderDrawColor(renderer, 60, 80, 110, 255);
    SDL_RenderRect(renderer, &inset);
    SDL_SetRenderDrawColor(renderer, 100, 225, 180, 255);
    const Vec3 end = at(ray, std::min(ray.tMax, 12.0));
    const SDL_Rect clip{15, 415, 210, 210};
    SDL_SetRenderClipRect(renderer, &clip);
    SDL_RenderLine(renderer, static_cast<float>(120 + ray.origin.x * 14), static_cast<float>(430 + (ray.origin.z + 7) * 14), static_cast<float>(120 + end.x * 14), static_cast<float>(430 + (end.z + 7) * 14));
    SDL_SetRenderClipRect(renderer, nullptr);
}
#endif

#if LAB_CHECKPOINT >= 3
inline void drawHit(SDL_Renderer* renderer, const Hit& hit, const Camera& camera, bool selected) {
    SDL_SetRenderDrawColor(renderer, 170, 170, 170, 255);
    if (selected)
        SDL_SetRenderDrawColor(renderer, 120, 255, 130, 255);
    const auto p = project(hit.point, camera, viewWidth, viewHeight);
    if (p) {
        SDL_FRect marker{static_cast<float>(p->x - 4), static_cast<float>(p->y - 4), 8, 8};
        SDL_RenderRect(renderer, &marker);
    }
    line(renderer, hit.point, add(hit.point, multiply(hit.normal, 0.5)), camera);
}
#endif
} // namespace picking
