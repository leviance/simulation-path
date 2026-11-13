#pragma once

#include "sculpt_grid.hpp"
#include <optional>

namespace sculpt {

struct RayInterval {
    float entry{}, exit{32};
};

// Supplied slab intersection. Picking samples only inside the stored field's domain.
inline std::optional<RayInterval> gridRayInterval(const GridSpec& grid, Vec3 origin, Vec3 direction) {
    grid.validate();
    if (!finite(origin) || !finite(direction))
        throw std::invalid_argument("Ray/box intersection needs finite inputs");
    const std::array<float, 3> start{origin.x, origin.y, origin.z};
    const std::array<float, 3> ray{direction.x, direction.y, direction.z};
    const std::array<float, 3> minimum{grid.origin.x, grid.origin.y, grid.origin.z};
    RayInterval interval;
    for (int axis = 0; axis < 3; ++axis) {
        const float maximum = minimum[axis] + grid.extent;
        if (std::abs(ray[axis]) < 1e-8F) {
            if (start[axis] < minimum[axis] || start[axis] > maximum)
                return {};
        } else {
            const float a = (minimum[axis] - start[axis]) / ray[axis];
            const float b = (maximum - start[axis]) / ray[axis];
            interval.entry = std::max(interval.entry, std::min(a, b));
            interval.exit = std::min(interval.exit, std::max(a, b));
        }
    }
    if (interval.exit < interval.entry)
        return {};
    return interval;
}

struct CpuPick {
    Vec3 point;
    float distance{}, value{};
    std::uint32_t steps{};
    bool hit{}, exhausted{};
};

// snippet:sculpt-cpu-field-pick
#if LAB_CHECKPOINT >= 4
inline CpuPick pickCpuField(const ScalarGrid& field, Vec3 origin, Vec3 direction, float isovalue) {
    if (!finite(origin) || !std::isfinite(isovalue) || std::abs(isovalue) > 1)
        throw std::invalid_argument("Field picking needs a finite ray and bounded isovalue");
    direction = normalized(direction);
    const auto interval = gridRayInterval(field.spec(), origin, direction);
    if (!interval)
        return {};
    float previousT = interval->entry;
    float previous = field.sample(origin + direction * previousT) - isovalue;
    for (std::uint32_t step = 0; step < 2048; ++step) {
        if (std::abs(previous) < 1e-6F) {
            const Vec3 point = origin + direction * previousT;
            return {point, previousT, field.sample(point), step + 1, true, false};
        }
        // Edited values are not distances. Advance by a known fraction of the grid spacing.
        const float nextT = std::min(previousT + field.spec().spacing() * 0.25F, interval->exit);
        const float next = field.sample(origin + direction * nextT) - isovalue;
        if ((previous < 0) != (next < 0)) {
            float low = previousT, high = nextT;
            for (int iteration = 0; iteration < 12; ++iteration) {
                const float middle = (low + high) * 0.5F;
                const float value = field.sample(origin + direction * middle) - isovalue;
                if ((value < 0) == (previous < 0))
                    low = middle;
                else
                    high = middle;
            }
            const float distance = (low + high) * 0.5F;
            const Vec3 point = origin + direction * distance;
            return {point, distance, field.sample(point), step + 1, true, false};
        }
        if (nextT >= interval->exit)
            return {{}, 0, 0, step + 1, false, false};
        previousT = nextT;
        previous = next;
    }
    return {{}, 0, 0, 2048, false, true};
}
#else
CpuPick pickCpuField(const ScalarGrid& field, Vec3 origin, Vec3 direction, float isovalue);
#endif

// end-snippet:sculpt-cpu-field-pick

// snippet:sculpt-brush-plane
#if LAB_CHECKPOINT >= 5
inline std::optional<Vec3> brushPlanePoint(Vec3 rayOrigin, Vec3 rayDirection, Vec3 anchor, Vec3 planeNormal) {
    if (!finite(rayOrigin) || !finite(rayDirection) || !finite(anchor) || !finite(planeNormal))
        throw std::invalid_argument("Brush plane needs finite vectors");
    const float denominator = dot(rayDirection, planeNormal);
    if (std::abs(denominator) < 1e-5F)
        return {};
    const float distance = dot(anchor - rayOrigin, planeNormal) / denominator;
    if (!std::isfinite(distance) || distance <= 0 || distance > 32)
        return {};
    return rayOrigin + rayDirection * distance;
}
#else
std::optional<Vec3> brushPlanePoint(Vec3 rayOrigin, Vec3 rayDirection, Vec3 anchor, Vec3 planeNormal);
#endif

// end-snippet:sculpt-brush-plane

} // namespace sculpt
