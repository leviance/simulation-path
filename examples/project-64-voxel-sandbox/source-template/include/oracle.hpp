#pragma once
#include "editing.hpp"
#include "mesh-oracle.hpp"
#include "surface-oracle.hpp"

namespace voxel {
// Oracle quét cell AABB, không dùng step/tMax/tDelta của DDA.
#if LAB_CHECKPOINT >= 10
inline Trace bruteOracle(const World& world, const Ray& ray) {
    Trace result;
    double best = INFINITY;
    for (const auto& [key, entry] : world.chunks) {
        for (int y = 0; y < 16; ++y) {
            for (int z = 0; z < 16; ++z) {
                for (int x = 0; x < 16; ++x) {
                    if (get(entry.blocks, x, y, z) == Block::Air) {
                        continue;
                    }
                    const Cell cell{key.x * 16 + x, y, key.z * 16 + z};
                    const auto span = clipBox(ray, {static_cast<double>(cell[0]), static_cast<double>(y), static_cast<double>(cell[2])}, {static_cast<double>(cell[0] + 1), static_cast<double>(y + 1), static_cast<double>(cell[2] + 1)}, 96);
                    if (span && span->enter < best) {
                        best = span->enter;
                        result.hit = Hit{cell, span->normal, best};
                    }
                }
            }
        }
    }
    const int cx = static_cast<int>(std::floor(ray.origin[0] / 16));
    const int cz = static_cast<int>(std::floor(ray.origin[2] / 16));
    for (int z = cz - 7; z <= cz + 7; ++z) {
        for (int x = cx - 7; x <= cx + 7; ++x) {
            if (world.chunks.contains({x, z})) {
                continue;
            }
            const auto span = clipBox(ray, {static_cast<double>(x * 16), 0, static_cast<double>(z * 16)}, {static_cast<double>(x * 16 + 16), 16, static_cast<double>(z * 16 + 16)}, 96);
            if (span && span->enter <= best + epsilon) {
                result.blocked = true;
            }
        }
    }
    if (result.blocked) {
        result.hit.reset();
    }
    return result;
}

inline void verifySandbox(const World& world) {
    verifySchedule(world);
    if (world.edits.size() > 512 || world.undo.size() > 32 || world.redo.size() > 32 || !world.dirty.empty()) {
        throw std::runtime_error("sandbox bounds or unflushed mesh");
    }
    for (const auto& [key, entry] : world.chunks) {
        for (int y = 0; y < 16; ++y) {
            for (int z = 0; z < 16; ++z) {
                for (int x = 0; x < 16; ++x) {
                    if (get(entry.blocks, x, y, z) != effectiveBlock(world, {key.x * 16 + x, y, key.z * 16 + z})) {
                        throw std::runtime_error("resident differs from base + delta");
                    }
                }
            }
        }
    }
    verifySurface(world);
    verifyTriangles(world);
}
#endif

} // namespace voxel
