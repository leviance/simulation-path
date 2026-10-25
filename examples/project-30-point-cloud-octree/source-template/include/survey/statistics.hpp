#pragma once
// Empty selection có count=0, không có bounds/centroid; không chia cho 0.
#include "spatial/octree.hpp"

namespace survey {
struct Statistics {
    std::size_t count{};
    Box bounds{};
    Vec3 centroid{};
};

// [snippet:statistics]
inline Statistics statistics(const std::vector<Point>& points, const std::vector<std::size_t>& indices) {
#if LAB_CHECKPOINT >= 7
    Statistics result{};
    if (indices.empty()) {
        return result;
    }
    result.bounds = {points.at(indices.front()).position, points.at(indices.front()).position};
    Vec3 total{};
    for (std::size_t index : indices) {
        const Vec3 p = points.at(index).position;
        result.bounds.minimum = {std::min(result.bounds.minimum.x, p.x), std::min(result.bounds.minimum.y, p.y), std::min(result.bounds.minimum.z, p.z)};
        result.bounds.maximum = {std::max(result.bounds.maximum.x, p.x), std::max(result.bounds.maximum.y, p.y), std::max(result.bounds.maximum.z, p.z)};
        total = total + p;
    }
    result.count = indices.size();
    result.centroid = total * (1.0 / double(result.count));
    return result;
#else
    static_cast<void>(points);
    static_cast<void>(indices);
    return {};
#endif
}

// [/snippet:statistics]

// [snippet:selectedPoints]
inline std::vector<Point> selectedPoints(const std::vector<Point>& points, const Result& selected) {
    std::vector<Point> output;
    for (std::size_t index : selected.indices) {
        output.push_back(points.at(index));
    }
    std::sort(output.begin(), output.end(), [](const Point& a, const Point& b) {
        return a.id < b.id;
    });
    return output;
}

// [/snippet:selectedPoints]
} // namespace survey
