#pragma once
#include "model.hpp"
#include <map>
#include <utility>

namespace water {
// Lists contain fluid and wall indices; the self index is kept for density.
struct Neighborhood {
    std::vector<Vec2> positions;
    std::vector<std::vector<std::size_t>> lists;
    std::size_t candidates = 0;
};

#if LAB_CHECKPOINT >= 4
inline Neighborhood buildNeighbors(const State& state, [[maybe_unused]] bool useGrid) {
    Neighborhood result;
    for (const auto& p : state.particles) {
        result.positions.push_back(p.position);
    }
    result.positions.insert(result.positions.end(), state.walls.begin(), state.walls.end());
#if LAB_CHECKPOINT >= 7
    std::map<std::pair<int, int>, std::vector<std::size_t>> buckets;
    if (useGrid) {
        for (std::size_t j = 0; j < result.positions.size(); ++j) {
            const auto p = result.positions[j];
            auto cell = std::make_pair(static_cast<int>(std::floor(p.x / support)), static_cast<int>(std::floor(p.y / support)));
            buckets[cell].push_back(j);
        }
    }
#endif
    for (const auto& p : state.particles) {
        std::vector<std::size_t> nearby;
#if LAB_CHECKPOINT >= 7
        if (useGrid) {
            const int cx = static_cast<int>(std::floor(p.position.x / support));
            const int cy = static_cast<int>(std::floor(p.position.y / support));
            for (int y = cy - 1; y <= cy + 1; ++y) {
                for (int x = cx - 1; x <= cx + 1; ++x) {
                    const auto found = buckets.find({x, y});
                    if (found != buckets.end()) {
                        nearby.insert(nearby.end(), found->second.begin(), found->second.end());
                    }
                }
            }
        } else {
#endif
            for (std::size_t j = 0; j < result.positions.size(); ++j) {
                nearby.push_back(j);
            }
#if LAB_CHECKPOINT >= 7
        }
#endif
        result.candidates += nearby.size();
        std::vector<std::size_t> list;
        for (const auto j : nearby) {
            const auto displacement = subtract(p.position, result.positions[j]);
            if (dot(displacement, displacement) < support * support) {
                list.push_back(j);
            }
        }
        // Match all-pairs summation order so numeric comparisons isolate search errors.
        std::sort(list.begin(), list.end());
        result.lists.push_back(std::move(list));
    }
    return result;
}
#endif
} // namespace water
