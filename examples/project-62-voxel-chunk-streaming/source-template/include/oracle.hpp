#pragma once
#include "scheduler.hpp"
#if LAB_CHECKPOINT >= 10
namespace voxel {
inline void verifySchedule(const World& world) {
    // Kiểm giới hạn state hiện tại; không thay bộ test hành trình và surface.
    if (world.chunks.size() > maxResident || world.pending.size() > 74 || world.lastJobs > world.lastBudget || world.lastMeshes > 5 * world.lastBudget) {
        throw std::runtime_error("streaming work bound violated");
    }
    std::set<std::pair<bool, Key>> ids;
    for (const Job& job : world.pending) {
        if (!ids.insert({job.load, job.key}).second) {
            throw std::runtime_error("duplicate job");
        }
    }
}

inline int verifySurface(const World& world) {
    using Cell = std::array<int, 3>;
    using FaceKey = std::array<int, 5>;
    std::map<Cell, Block> solid;
    // Oracle đi từ global cell, không gọi makeWorldMask hoặc worldBlock.
    for (const auto& [key, entry] : world.chunks) {
        for (int y = 0; y < side; ++y) {
            for (int z = 0; z < side; ++z) {
                for (int x = 0; x < side; ++x) {
                    const Block material = entry.blocks[x + side * (z + side * y)];
                    if (material != Block::Air) {
                        solid.emplace(Cell{x + key.x * side, y, z + key.z * side}, material);
                    }
                }
            }
        }
    }
    const std::array<Cell, 6> offsets{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
    std::vector<FaceKey> expected;
    for (const auto& [cell, material] : solid) {
        for (int face = 0; face < 6; ++face) {
            const Cell& d = offsets[face];
            const Cell n{cell[0] + d[0], cell[1] + d[1], cell[2] + d[2]};
            if (!solid.contains(n)) {
                expected.push_back({cell[0], cell[1], cell[2], face, static_cast<int>(material)});
            }
        }
    }
    std::vector<FaceKey> actual;
    for (const auto& [key, entry] : world.chunks) {
        for (const Rectangle& r : entry.quads) {
            if (r.face < 0 || r.face > 5 || r.plane < 0 || r.plane > side || r.u < 0 || r.v < 0 || r.width < 1 || r.height < 1 || r.u + r.width > side || r.v + r.height > side) {
                throw std::runtime_error("invalid rectangle");
            }
            for (int v = 0; v < r.height; ++v) {
                for (int u = 0; u < r.width; ++u) {
                    Cell p{};
                    p[r.face / 2] = r.plane;
                    if (r.face % 2 == 0) {
                        --p[r.face / 2];
                    }
                    p[(r.face / 2 + 1) % 3] = r.u + u;
                    p[(r.face / 2 + 2) % 3] = r.v + v;
                    actual.push_back({p[0] + key.x * side, p[1], p[2] + key.z * side, r.face, static_cast<int>(r.material)});
                }
            }
        }
    }
    std::sort(expected.begin(), expected.end());
    std::sort(actual.begin(), actual.end());
    if (expected != actual) {
        throw std::runtime_error("global oriented surface mismatch");
    }
    return static_cast<int>(expected.size());
}

inline void drain(World& world) {
    for (int i = 0; i < 100; ++i) {
        if (world.pending.empty()) {
            return;
        }
        pump(world);
    }
    throw std::runtime_error("streaming did not settle within 100 ticks");
}
} // namespace voxel
#endif
