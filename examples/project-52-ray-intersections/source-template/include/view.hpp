#pragma once
#include "beam-drawing.hpp"
#include "workshop.hpp"
#include <SDL3/SDL.h>

namespace picking {
constexpr int viewWidth = 1200;
constexpr int viewHeight = 760;
constexpr int sceneWidth = 880;
constexpr SDL_FRect aimRect{20, 550, 280, 190};
constexpr SDL_FRect stripRect{321, 637, 539, 103};
constexpr SDL_FRect aimHeading{18, 522, 284, 28};

inline bool inside(SDL_FRect rect, float x, float y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

#if LAB_CHECKPOINT >= 2
inline void drawRay(Raster& raster, const Ray& ray, double visibleEnd, bool debug) {
    // The faint continuation still ends at tMax. Hidden portions of the
    // incident beam use dashes instead of pretending to lie on the surface.
    raster.line(at(ray, ray.tMin), at(ray, ray.tMax), {94, 131, 143}, debug);
    raster.line(at(ray, ray.tMin), at(ray, visibleEnd), {48, 130, 138}, debug, 2);
    raster.line(at(ray, ray.tMin), at(ray, visibleEnd), {179, 255, 239}, debug);
    raster.marker(ray.origin, {230, 255, 241}, 3);
    raster.ring(ray.origin, {130, 223, 217}, 7);
}
#endif

#if LAB_CHECKPOINT >= 3
// [snippet draw-hit]
inline void drawHit(Raster& raster, const Hit& hit, bool selected) {
    // Vẫn đánh dấu giao điểm phụ, nhưng chỉ vẽ mũi tên cho pháp tuyến đang xét.
    if (!selected) {
        raster.ring(hit.point, {161, 183, 191}, 3);
        return;
    }
    const Color color{169, 254, 139};
    const Vec3 end = add(hit.point, multiply(hit.normal, 0.65));
    raster.line(hit.point, end, color, true, 1, 0.76);
    // Chọn hướng vuông góc với mũi tên ngay trên màn hình, kể cả
    // khi pháp tuyến của vật gần song song với trục ngang của camera.
    Vec3 side = normalize(cross(hit.normal, raster.basis.forward));
    if (length(side) < 0.001) {
        side = raster.basis.right;
    }
    const Vec3 base = subtract(end, multiply(hit.normal, 0.14));
    raster.line(end, add(base, multiply(side, 0.08)), color, true);
    raster.line(end, subtract(base, multiply(side, 0.08)), color, true);
    raster.marker(hit.point, {245, 255, 231}, 3);
}

// [/snippet draw-hit]
#endif

inline void drawWorkshop(Raster& raster, const Workshop& state, bool aimingView = false) {
    Camera camera = state.observer.camera();
#if LAB_CHECKPOINT >= 2
    if (aimingView) {
        camera = state.emitter;
    }
#else
    (void)aimingView;
#endif
    raster.begin(camera);
#if LAB_CHECKPOINT >= 1
    drawScene(raster, state.scene, state.selected, state.debug);
#endif
#if LAB_CHECKPOINT >= 2
    const Ray ray = state.ray();
    if (!aimingView) {
        drawCollimator(raster, ray);
    }
    double end = ray.tMax;
#if LAB_CHECKPOINT >= 3
    const auto hits = candidates(ray, state.scene);
    std::optional<Hit> best;
    if (hits[state.selected]) {
        end = hits[state.selected]->t;
    }
#if LAB_CHECKPOINT >= 7
    best = nearestHit(hits);
    if (best) {
        end = best->t;
    }
#endif
#endif
    drawRay(raster, ray, end, state.debug);
#if LAB_CHECKPOINT >= 4
    if (state.selected == 1) {
        const auto interval = sphereInterval(ray, state.scene.sphere);
        if (interval) {
            drawSolidPath(raster, ray, interval->entry, interval->exit);
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.selected == 2) {
        const auto interval = boxInterval(ray, state.scene.box);
        if (interval) {
            drawSolidPath(raster, ray, interval->entry, interval->exit);
        }
    }
#endif
#if LAB_CHECKPOINT >= 3
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
#endif
}

inline bool presentRaster(SDL_Renderer* renderer, SDL_Texture* texture, const Raster& raster, const SDL_FRect& destination) {
    if (!SDL_UpdateTexture(texture, nullptr, raster.pixels.data(), raster.width * static_cast<int>(sizeof(std::uint32_t)))) {
        return false;
    }
    return SDL_RenderTexture(renderer, texture, nullptr, &destination);
}
} // namespace picking
