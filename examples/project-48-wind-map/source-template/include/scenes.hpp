#pragma once
#include "derivatives.hpp"

namespace wind {
#if LAB_CHECKPOINT >= 8
inline void addVortex(Field& field, Vec2 center, double strength) {
    // Vector tiếp tuyến nhân Gaussian: trơn tại tâm và giảm dần ra xa.
    if (!inside(center) || !std::isfinite(strength) || std::abs(strength) > 2) {
        throw std::invalid_argument("Invalid vortex");
    }
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const auto i = field.index(x, y);
            const Vec2 p = world(field, x, y);
            const double qx = p.x - center.x;
            const double qy = p.y - center.y;
            const double weight = strength * std::exp(-(qx * qx + qy * qy) / (0.55 * 0.55));
            field.vx[i] += -qy * weight;
            field.vy[i] += qx * weight;
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline void populate(Field& field, const Scene& scene) {
    // Ghi lại toàn bộ nền trước khi cộng xoáy, để cùng Scene cho cùng Field.
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const auto i = field.index(x, y);
            const Vec2 p = world(field, x, y);
            field.scalar[i] = potentialAt(p, scene.potential);
            Vec2 v{1, 0.25};
            if (scene.preset == Preset::Source) {
                v = p;
            }
            if (scene.preset == Preset::Sink) {
                v = {-p.x, -p.y};
            }
            if (scene.preset == Preset::Rotation) {
                v = {-p.y, p.x};
            }
            if (scene.preset == Preset::Shear) {
                v = {p.y, 0};
            }
            field.vx[i] = v.x;
            field.vy[i] = v.y;
        }
    }
#if LAB_CHECKPOINT >= 3
    if (scene.preset == Preset::Gradient) {
        gradient(field);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (scene.vortex) {
        addVortex(field, scene.center, scene.strength);
    }
#endif
}
#endif
} // namespace wind
