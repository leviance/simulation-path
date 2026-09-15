#pragma once

#include "dynamics.hpp"
#include <array>
#include <string>

namespace neighbors {

// Phần hình học và force-shifted LJ trong dynamics.hpp được giữ từ Project 43.
using pbc::System;
using pbc::Vec2;

#if LAB_CHECKPOINT >= 2
struct PairIndex {
    std::size_t i{};
    std::size_t j{};
    bool operator==(const PairIndex&) const = default;
};

struct NeighborList {
    std::vector<PairIndex> pairs;
    std::vector<Vec2> reference;
    pbc::Box box;
    double cutoff{};
    double skin{};
    std::uint64_t generation{};
    std::size_t rebuilds{};
    std::size_t buildChecks{};
    std::size_t forceChecks{};
    bool ready{false};
};

inline bool validListParameters(const System& system, double skin) {
    const double listRadius = system.parameters.cutoff + skin;
    // Đây là giới hạn đơn giản hóa của lab, chặt hơn điều kiện của force cutoff.
    return pbc::validParameters(system.parameters, system.box) && std::isfinite(skin) && skin > 0.0 && listRadius < 0.5 * std::min(system.box.width, system.box.height);
}

inline void saveReference(const System& system, double skin, std::uint64_t generation, NeighborList& list) {
    list.reference.clear();
    for (const pbc::Particle& particle : system.particles) {
        list.reference.push_back(particle.unwrapped);
    }
    list.box = system.box;
    list.cutoff = system.parameters.cutoff;
    list.skin = skin;
    list.generation = generation;
    list.ready = true;
    ++list.rebuilds;
}

inline bool validState(const System& system) {
    if (system.particles.empty() || system.particles.size() > 1000) {
        return false;
    }
    for (const pbc::Particle& particle : system.particles) {
        if (!pbc::finite(particle.position) || !pbc::finite(particle.unwrapped) || !pbc::finite(particle.velocity) || !std::isfinite(particle.mass) || particle.mass <= 0.0) {
            return false;
        }
        if (particle.position.x < 0.0 || particle.position.x >= system.box.width || particle.position.y < 0.0 || particle.position.y >= system.box.height) {
            return false;
        }
    }
    return true;
}

inline bool rebuildNaive(const System& system, double skin, std::uint64_t generation, NeighborList& list) {
    if (!validListParameters(system, skin) || !validState(system)) {
        return false;
    }
    list.pairs.clear();
    const double listRadius = system.parameters.cutoff + skin;
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        for (std::size_t j = i + 1; j < system.particles.size(); ++j) {
            ++list.buildChecks;
            const Vec2 delta = pbc::minimumImage(pbc::subtract(system.particles[j].position, system.particles[i].position), system.box);
            if (pbc::length(delta) < listRadius) {
                list.pairs.push_back({i, j});
            }
        }
    }
    saveReference(system, skin, generation, list);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 3
// Hàm mức thấp: chỉ dùng khi danh sách còn hiệu lực, hoặc trong thí nghiệm danh sách cũ.
inline pbc::Evaluation evaluateListed(const System& system, const NeighborList& list) {
    pbc::Evaluation result;
    result.forces.resize(system.particles.size());
    if (!pbc::validParameters(system.parameters, system.box) || !validState(system) || !list.ready) {
        return result;
    }
    for (const PairIndex pair : list.pairs) {
        if (pair.i >= pair.j || pair.j >= system.particles.size()) {
            return result;
        }
        ++result.evaluatedPairs;
        const Vec2 delta = pbc::minimumImage(pbc::subtract(system.particles[pair.j].position, system.particles[pair.i].position), system.box);
        const double distance = pbc::length(delta);
        if (!std::isfinite(distance) || distance < 1.0e-6) {
            return result;
        }
        if (distance >= system.parameters.cutoff) {
            continue;
        }
        const pbc::PairSample sample = pbc::shiftedPair(distance, system.parameters);
        const Vec2 force = pbc::scale(delta, sample.slope / distance);
        if (!pbc::finite(force) || !std::isfinite(sample.potential)) {
            return result;
        }
        ++result.activePairs;
        result.forces[pair.i] = pbc::add(result.forces[pair.i], force);
        result.forces[pair.j] = pbc::subtract(result.forces[pair.j], force);
        result.potential += sample.potential;
    }
    result.valid = std::isfinite(result.potential);
    for (const Vec2 force : result.forces) {
        result.valid = result.valid && pbc::finite(force);
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 4
inline double maximumDisplacement(const System& system, const NeighborList& list) {
    if (list.reference.size() != system.particles.size()) {
        return std::numeric_limits<double>::infinity();
    }
    double maximum = 0.0;
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        const double displacement = pbc::length(pbc::subtract(system.particles[i].unwrapped, list.reference[i]));
        if (!std::isfinite(displacement)) {
            return std::numeric_limits<double>::infinity();
        }
        maximum = std::max(maximum, displacement);
    }
    return maximum;
}

inline bool needsRebuild(const System& system, double skin, std::uint64_t generation, const NeighborList& list) {
    if (!list.ready || list.reference.size() != system.particles.size() || list.generation != generation) {
        return true;
    }
    if (list.box.width != system.box.width || list.box.height != system.box.height || list.cutoff != system.parameters.cutoff || list.skin != skin) {
        return true;
    }
    // Kiểm trước MỖI lần tính lực; đúng nửa skin cũng dựng lại để tránh ca sát ngưỡng.
    return maximumDisplacement(system, list) >= 0.5 * skin;
}
#endif

#if LAB_CHECKPOINT >= 5
inline int wrapCell(int coordinate, int count) {
    int wrapped = coordinate % count;
    if (wrapped < 0) {
        wrapped += count;
    }
    return wrapped;
}

inline bool rebuildGrid(const System& system, double skin, std::uint64_t generation, NeighborList& list) {
    if (!validListParameters(system, skin) || !validState(system)) {
        return false;
    }
    const double listRadius = system.parameters.cutoff + skin;
    // Giới hạn số ô chỉ làm ô rộng hơn, nên stencil 3x3 vẫn bao phủ listRadius.
    const int columns = int(std::min(128.0, std::floor(system.box.width / listRadius)));
    const int rows = int(std::min(128.0, std::floor(system.box.height / listRadius)));
    const double cellWidth = system.box.width / columns;
    const double cellHeight = system.box.height / rows;
    std::vector<std::vector<std::size_t>> cells(std::size_t(columns * rows));
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        const Vec2 position = system.particles[i].position;
        const int x = std::min(columns - 1, int(position.x / cellWidth));
        const int y = std::min(rows - 1, int(position.y / cellHeight));
        cells[std::size_t(y * columns + x)].push_back(i);
    }
    list.pairs.clear();
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        const Vec2 position = system.particles[i].position;
        const int centerX = std::min(columns - 1, int(position.x / cellWidth));
        const int centerY = std::min(rows - 1, int(position.y / cellHeight));
        std::array<int, 9> visited{};
        int visitedCount = 0;
        for (int offsetY = -1; offsetY <= 1; ++offsetY) {
            for (int offsetX = -1; offsetX <= 1; ++offsetX) {
                const int cellX = wrapCell(centerX + offsetX, columns);
                const int cellY = wrapCell(centerY + offsetY, rows);
                const int cellId = cellY * columns + cellX;
                if (std::find(visited.begin(), visited.begin() + visitedCount, cellId) != visited.begin() + visitedCount) {
                    continue;
                }
                visited[std::size_t(visitedCount++)] = cellId;
                for (const std::size_t j : cells[std::size_t(cellId)]) {
                    if (j <= i) {
                        continue;
                    }
                    ++list.buildChecks;
                    const Vec2 delta = pbc::minimumImage(pbc::subtract(system.particles[j].position, position), system.box);
                    if (pbc::length(delta) < listRadius) {
                        list.pairs.push_back({i, j});
                    }
                }
            }
        }
    }
    // Cùng thứ tự i,j như oracle: sai số do thứ tự cộng không che lỗi tìm cặp.
    std::sort(list.pairs.begin(), list.pairs.end(), [](PairIndex a, PairIndex b) {
        if (a.i != b.i) {
            return a.i < b.i;
        }
        return a.j < b.j;
    });
    saveReference(system, skin, generation, list);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 4
inline bool ensureList(const System& system, double skin, std::uint64_t generation, NeighborList& list) {
    if (!validListParameters(system, skin) || !validState(system)) {
        return false;
    }
    if (!needsRebuild(system, skin, generation, list)) {
        return true;
    }
#if LAB_CHECKPOINT >= 5
    return rebuildGrid(system, skin, generation, list);
#else
    return rebuildNaive(system, skin, generation, list);
#endif
}
#endif

} // namespace neighbors
