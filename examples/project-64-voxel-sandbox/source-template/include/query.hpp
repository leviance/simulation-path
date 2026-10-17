#pragma once
#include "ray.hpp"

namespace voxel {
// -1 nghĩa là chưa resident, không phải Air để tia được đi xuyên qua.
#if LAB_CHECKPOINT >= 3
inline int residentBlock(const World& world, Cell cell) {
    if (cell[1] < 0 || cell[1] >= side) {
        return 0;
    }
    const Key key{floorDiv(cell[0]), floorDiv(cell[2])};
    const auto found = world.chunks.find(key);
    if (found == world.chunks.end()) {
        return -1;
    }
    return static_cast<int>(get(found->second.blocks, cell[0] - key.x * side, cell[1], cell[2] - key.z * side));
}

inline Trace traceWorld(const World& world, const Ray& ray, double reach = 96) {
    const Ray validated = makeRay(ray.origin, ray.direction);
    for (int i = 0; i < 3; ++i) {
        if (std::abs(ray.direction[i] - validated.direction[i]) > epsilon) {
            throw std::out_of_range("normalized direction");
        }
    }
    if (!std::isfinite(reach) || reach <= 0 || reach > 96) {
        throw std::out_of_range("reach (0,96]");
    }
    Trace result;
    const auto interval = clipBox(ray, {-1024, 0, -1024}, {1024, 16, 1024}, reach);
    if (!interval) {
        return result;
    }
    Cell cell{};
    Cell step{};
    Vector tMax{INFINITY, INFINITY, INFINITY};
    Vector tDelta{INFINITY, INFINITY, INFINITY};
    for (int i = 0; i < 3; ++i) {
        const double d = ray.direction[i];
        double p = ray.origin[i] + interval->enter * d;
        const double nearest = std::round(p);
        if (d != 0 && std::abs(p - nearest) <= epsilon * std::abs(d)) {
            p = nearest;
        }
        cell[i] = static_cast<int>(std::floor(p));
        if (d < 0 && p == std::floor(p)) {
            --cell[i];
        }
        if (d != 0) {
            step[i] = 1;
            if (d < 0) {
                step[i] = -1;
            }
            int boundary = cell[i];
            if (d > 0) {
                ++boundary;
            }
            tMax[i] = (boundary - ray.origin[i]) / d;
            tDelta[i] = 1 / std::abs(d);
        }
    }
    const auto first = clipBox(ray, {static_cast<double>(cell[0]), static_cast<double>(cell[1]), static_cast<double>(cell[2])}, {static_cast<double>(cell[0] + 1), static_cast<double>(cell[1] + 1), static_cast<double>(cell[2] + 1)}, reach);
    Cell normal = interval->normal;
    if (first) {
        normal = first->normal;
    }
    double t = interval->enter;
    for (int iteration = 0; iteration < 256; ++iteration) {
        if (cell[0] < -1024 || cell[0] >= 1024 || cell[1] < 0 || cell[1] >= 16 || cell[2] < -1024 || cell[2] >= 1024) {
            return result;
        }
        const double next = std::min({tMax[0], tMax[1], tMax[2]});
        const double exit = std::min(next, interval->exit);
        if (exit - t > epsilon) {
            result.path.push_back(cell);
            const int value = residentBlock(world, cell);
            if (value < 0) {
                result.blocked = true;
                return result;
            }
            if (value > 0) {
                result.hit = Hit{cell, normal, t};
                return result;
            }
        }
        if (next >= interval->exit - epsilon) {
            return result;
        }
        normal = {};
        bool chosen = false;
        for (int i = 0; i < 3; ++i) {
            if (tMax[i] <= next + epsilon) {
                cell[i] += step[i];
                tMax[i] += tDelta[i];
                if (!chosen) {
                    normal[i] = -step[i];
                    chosen = true;
                }
            }
        }
        t = std::max(t, next);
    }
    throw std::runtime_error("DDA exceeded 256 iterations");
}
#endif

} // namespace voxel
