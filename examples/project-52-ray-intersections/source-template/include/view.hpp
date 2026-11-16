#pragma once
#include "scene-drawing.hpp"
#include "workshop.hpp"
#include <SDL3/SDL.h>

namespace picking {
constexpr int viewWidth = 1200;
constexpr int viewHeight = 760;
constexpr int sceneWidth = 880;
constexpr SDL_FRect aimRect{20, 550, 280, 190};

inline bool inside(SDL_FRect rect, float x, float y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

#if LAB_CHECKPOINT >= 2
inline void drawRay(Raster& raster, const Ray& ray, double visibleEnd, bool debug) {
    // Hidden portions use dim dashes, not an opaque line pretending to be in front.
    raster.line(at(ray, ray.tMin), at(ray, ray.tMax), {77, 113, 139}, debug);
    raster.line(at(ray, ray.tMin), at(ray, visibleEnd), {98, 245, 206}, debug, 1);
    raster.marker(ray.origin, {245, 242, 214}, 5);
}
#endif

#if LAB_CHECKPOINT >= 3
// [snippet draw-hit]
inline void drawHit(Raster& raster, const Hit& hit, bool selected) {
    Color color{164, 182, 202};
    if (selected) {
        color = {139, 255, 162};
    }
    const Vec3 end = add(hit.point, multiply(hit.normal, 0.65));
    raster.marker(hit.point, color, 4);
    raster.line(hit.point, end, color, true, 1);
    const Vec3 side = cameraBasis(raster.camera).right;
    const Vec3 base = subtract(end, multiply(hit.normal, 0.14));
    raster.line(end, add(base, multiply(side, 0.08)), color, true);
    raster.line(end, subtract(base, multiply(side, 0.08)), color, true);
}

// [/snippet draw-hit]
#endif

inline void drawWorkshop(Raster& raster, const Workshop& state, bool aimingView = false) {
    raster.begin(state.observer.camera());
#if LAB_CHECKPOINT >= 2
    if (aimingView) {
        raster.begin(state.emitter);
    }
#else
    (void)aimingView;
#endif
#if LAB_CHECKPOINT >= 1
    drawScene(raster, state.scene, state.selected, state.debug);
#endif
#if LAB_CHECKPOINT >= 2
    const Ray ray = state.ray();
    double end = ray.tMax;
#if LAB_CHECKPOINT >= 3
    const auto hits = candidates(ray, state.scene);
    std::optional<Hit> best;
#if LAB_CHECKPOINT >= 7
    best = nearestHit(hits);
    if (best) {
        end = best->t;
    }
#endif
    for (const auto& hit : hits) {
        if (hit) {
            bool selected = hit->objectId == state.selected;
            if (best) {
                selected = hit->objectId == best->objectId;
            }
            drawHit(raster, *hit, selected);
        }
    }
#endif
    drawRay(raster, ray, end, state.debug);
#if LAB_CHECKPOINT >= 4
    if (state.selected == 1) {
        const auto interval = sphereInterval(ray, state.scene.sphere);
        if (interval && inRange(ray, interval->exit)) {
            raster.marker(at(ray, interval->exit), {241, 179, 82}, 3);
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.selected == 2) {
        const auto interval = boxInterval(ray, state.scene.box);
        if (interval && inRange(ray, interval->exit)) {
            raster.marker(at(ray, interval->exit), {241, 179, 82}, 3);
        }
    }
#endif
#endif
}

inline bool presentRaster(SDL_Renderer* renderer, SDL_Texture* texture, const Raster& raster, const SDL_FRect& destination) {
    if (!SDL_UpdateTexture(texture, nullptr, raster.pixels.data(), raster.width * static_cast<int>(sizeof(std::uint32_t)))) {
        return false;
    }
    return SDL_RenderTexture(renderer, texture, nullptr, &destination);
}
} // namespace picking
