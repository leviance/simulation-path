#pragma once
#include "clip.hpp"

namespace voxel {
struct Visit {
    Cell cell;
    double enter;
    double exit;
    Cell normal{};
};

struct Hit {
    Cell cell;
    Cell normal;
    double distance;
};

struct Trace {
    std::optional<Interval> interval;
    std::vector<Visit> visits;
    std::optional<Hit> hit;
};

#if LAB_CHECKPOINT >= 4
inline Trace traverse(const Chunk& chunk, const Ray& ray, double reach = 64, bool stopAtSolid = true) {
    Trace trace;
    trace.interval = clipBox(ray, {0, 0, 0}, {16, 16, 16}, reach);
    if (!trace.interval.has_value()) {
        return trace;
    }
    const auto origin = components(ray.origin);
    const auto direction = components(ray.direction);
    const auto start = components(pointAt(ray, trace.interval->enter));
    Cell cell{};
    Cell step{};
    std::array<double, 3> tMax{};
    std::array<double, 3> tDelta{};
    for (int axis = 0; axis < 3; ++axis) {
        double p = std::clamp(start[axis], 0.0, 16.0);
        const double integer = std::round(p);
        if (direction[axis] != 0 && std::abs(p - integer) <= tolerance * std::abs(direction[axis])) {
            p = integer;
        }
        int coordinate = static_cast<int>(std::floor(p));
        if (direction[axis] < 0 && p == std::floor(p)) {
            --coordinate;
        }
        cell[axis] = std::clamp(coordinate, 0, 15);
        tMax[axis] = std::numeric_limits<double>::infinity();
        tDelta[axis] = std::numeric_limits<double>::infinity();
        if (direction[axis] != 0) {
            step[axis] = 1;
            double boundary = cell[axis] + 1;
            if (direction[axis] < 0) {
                step[axis] = -1;
                boundary = cell[axis];
            }
            tMax[axis] = (boundary - origin[axis]) / direction[axis];
            tDelta[axis] = 1 / std::abs(direction[axis]);
        }
    }
    double t = trace.interval->enter;
    Cell normal = trace.interval->normal;
    for (int iteration = 0; iteration < 64; ++iteration) {
        if (!inside(cell[0], cell[1], cell[2])) {
            return trace;
        }
        const double next = std::min({tMax[0], tMax[1], tMax[2]});
        const double exit = std::min(next, trace.interval->exit);
        if (exit - t > tolerance) {
            trace.visits.push_back({cell, t, exit, normal});
#if LAB_CHECKPOINT >= 5
            if (stopAtSolid && get(chunk, cell[0], cell[1], cell[2]) != Block::Air) {
                trace.hit = Hit{cell, normal, t};
                return trace;
            }
#else
            static_cast<void>(chunk);
            static_cast<void>(stopAtSolid);
#endif
        }
        if (next >= trace.interval->exit - tolerance) {
            return trace;
        }
        // Đi qua mọi trục tie cùng lúc; normal chọn X rồi Y rồi Z để tái lập.
        normal = {};
        bool normalChosen = false;
        for (int axis = 0; axis < 3; ++axis) {
            if (tMax[axis] <= next + tolerance) {
                cell[axis] += step[axis];
                tMax[axis] += tDelta[axis];
                if (!normalChosen) {
                    normal[axis] = -step[axis];
                    normalChosen = true;
                }
            }
        }
        t = std::max(t, next);
    }
    throw std::runtime_error("DDA exceeded bounded 64 iterations");
}
#endif
} // namespace voxel
