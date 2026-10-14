#pragma once
#include "hit.hpp"
#include <algorithm>
#include <limits>

namespace picking {
#if LAB_CHECKPOINT >= 5
// This is a surface query, not just an overlap test against a volume.
struct BoxInterval {
    double entry;
    double exit;
    Vec3 entryNormal;
    Vec3 exitNormal;
};

inline std::optional<BoxInterval> boxInterval(const Ray& ray, const Box& box) {
    if (!valid(ray) || !finite(box.minimum) || !finite(box.maximum)) {
        return std::nullopt;
    }
    const double origins[]{ray.origin.x, ray.origin.y, ray.origin.z};
    const double directions[]{ray.direction.x, ray.direction.y, ray.direction.z};
    const double minima[]{box.minimum.x, box.minimum.y, box.minimum.z};
    const double maxima[]{box.maximum.x, box.maximum.y, box.maximum.z};
    const Vec3 axes[]{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}};
    BoxInterval interval{-std::numeric_limits<double>::infinity(), std::numeric_limits<double>::infinity(), {}, {}};
    for (int axis = 0; axis < 3; ++axis) {
        if (minima[axis] >= maxima[axis]) {
            return std::nullopt;
        }
        if (directions[axis] == 0) {
            if (origins[axis] < minima[axis] || origins[axis] > maxima[axis]) {
                return std::nullopt;
            }
            continue;
        }
        double entry = (minima[axis] - origins[axis]) / directions[axis];
        double exit = (maxima[axis] - origins[axis]) / directions[axis];
        Vec3 entryNormal = multiply(axes[axis], -1);
        Vec3 exitNormal = axes[axis];
        if (entry > exit) {
            std::swap(entry, exit);
            std::swap(entryNormal, exitNormal);
        }
        if (entry > interval.entry) {
            interval.entry = entry;
            interval.entryNormal = entryNormal;
        }
        if (exit < interval.exit) {
            interval.exit = exit;
            interval.exitNormal = exitNormal;
        }
        if (interval.entry > interval.exit) {
            return std::nullopt;
        }
    }
    return interval;
}

inline std::optional<Hit> intersectBox(const Ray& ray, const Box& box) {
    const auto interval = boxInterval(ray, box);
    if (!interval) {
        return std::nullopt;
    }
    if (inRange(ray, interval->entry)) {
        return makeHit(ray, interval->entry, interval->entryNormal, 2);
    }
    if (inRange(ray, interval->exit)) {
        return makeHit(ray, interval->exit, interval->exitNormal, 2);
    }
    return std::nullopt;
}
#endif
} // namespace picking
