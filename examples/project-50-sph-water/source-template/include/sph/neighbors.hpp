#pragma once
#include "scenes.hpp"

namespace water {
struct Search {
    std::vector<Particle> samples;
    std::vector<std::vector<int>> lists;
    std::size_t candidates = 0;
};

#if LAB_CHECKPOINT >= 7
// [snippet grid]
struct Grid {
    static constexpr int columns = 74;
    static constexpr int rows = 46;
    std::vector<int> starts = std::vector<int>(columns * rows + 1);
    std::vector<int> ids;

    int cell(double x, double y) const {
        if (!std::isfinite(x) || !std::isfinite(y) || x < -3 * support || y < -3 * support || x >= (columns - 3) * support || y >= (rows - 3) * support) {
            throw std::out_of_range("Sample outside bounded grid");
        }
        const int cx = static_cast<int>(std::floor(x / support)) + 3;
        const int cy = static_cast<int>(std::floor(y / support)) + 3;
        if (cx < 0 || cx >= columns || cy < 0 || cy >= rows) {
            throw std::out_of_range("Sample outside bounded grid");
        }
        return cy * columns + cx;
    }

    void build(const std::vector<Particle>& points) {
        std::fill(starts.begin(), starts.end(), 0);
        for (const auto& p : points) {
            ++starts[cell(p.x, p.y) + 1];
        }
        for (std::size_t k = 1; k < starts.size(); ++k) {
            starts[k] += starts[k - 1];
        }
        auto cursor = starts;
        ids.resize(points.size());
        for (std::size_t j = 0; j < points.size(); ++j) {
            ids[cursor[cell(points[j].x, points[j].y)]++] = static_cast<int>(j);
        }
    }
};

// [/snippet grid]
#endif

#if LAB_CHECKPOINT >= 4
// [snippet neighbors]
inline Search buildNeighbors(const State& state, bool useGrid) {
    Search result;
    result.samples = samples(state);
    result.lists.resize(state.particles.size());
#if LAB_CHECKPOINT >= 7
    Grid grid;
    if (useGrid) {
        grid.build(result.samples);
    }
#else
    static_cast<void>(useGrid);
#endif
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        const auto& p = state.particles[i];
        auto& list = result.lists[i];
        list.reserve(40);
        const auto consider = [&](int j) {
            ++result.candidates;
            const double dx = p.x - result.samples[j].x;
            const double dy = p.y - result.samples[j].y;
            if (dx * dx + dy * dy < support * support) {
                list.push_back(j);
            }
        };
#if LAB_CHECKPOINT >= 7
        if (useGrid) {
            const int center = grid.cell(p.x, p.y);
            const int cx = center % Grid::columns;
            const int cy = center / Grid::columns;
            for (int y = std::max(0, cy - 1); y <= std::min(Grid::rows - 1, cy + 1); ++y) {
                for (int x = std::max(0, cx - 1); x <= std::min(Grid::columns - 1, cx + 1); ++x) {
                    const int cell = y * Grid::columns + x;
                    for (int k = grid.starts[cell]; k < grid.starts[cell + 1]; ++k) {
                        consider(grid.ids[k]);
                    }
                }
            }
        } else
#endif
        {
            if (state.particles.size() > 1000) {
                throw std::invalid_argument("All-pairs is a small oracle, not the 5000-particle runtime");
            }
            for (std::size_t j = 0; j < result.samples.size(); ++j) {
                consider(static_cast<int>(j));
            }
        }
        // Cùng thứ tự cộng với all-pairs để lỗi search không lẫn lỗi reduction.
        std::sort(list.begin(), list.end());
    }
    return result;
}

// [/snippet neighbors]
#endif
} // namespace water
