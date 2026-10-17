#pragma once
#include "quad.hpp"
#include "rectangles.hpp"
#include "world.hpp"

namespace voxel {
#if LAB_CHECKPOINT >= 7
inline Block worldBlock(const World& world, int x, int y, int z) {
    if (y < 0 || y >= side) {
        return Block::Air;
    }
    const Key key{floorDiv(x), floorDiv(z)};
    const auto found = world.chunks.find(key);
    if (found == world.chunks.end()) {
        return Block::Air;
    }
    return get(found->second.blocks, x - key.x * side, y, z - key.z * side);
}

inline Mask makeWorldMask(const World& world, Key key, int face, int plane) {
    Mask mask{};
    const Chunk& blocks = world.chunks.at(key).blocks;
    const int axis = face / 2;
    const int uAxis = (axis + 1) % 3;
    const int vAxis = (axis + 2) % 3;
    int sign = -1;
    if (face % 2 == 0) {
        sign = 1;
    }
    for (int v = 0; v < side; ++v) {
        for (int u = 0; u < side; ++u) {
            std::array<int, 3> p{};
            p[axis] = plane;
            if (sign > 0) {
                --p[axis];
            }
            p[uAxis] = u;
            p[vAxis] = v;
            // Chỉ chunk hiện tại sở hữu source; neighbor có thể thuộc chunk khác.
            if (!inside(p[0], p[1], p[2])) {
                continue;
            }
            const Block material = get(blocks, p[0], p[1], p[2]);
            if (material == Block::Air) {
                continue;
            }
            auto n = p;
            n[axis] += sign;
            Block neighbor = Block::Air;
            if (inside(n[0], n[1], n[2])) {
                neighbor = get(blocks, n[0], n[1], n[2]);
            } else {
                neighbor = worldBlock(world, key.x * side + n[0], n[1], key.z * side + n[2]);
            }
            if (neighbor == Block::Air) {
                mask[v * side + u] = material;
            }
        }
    }
    return mask;
}
#endif
inline void rebuild(World& world, Key key) {
    auto found = world.chunks.find(key);
    if (found == world.chunks.end()) {
        return;
    }
    Entry& entry = found->second;
    entry.mesh.clear();
    entry.quads.clear();
    entry.unitFaces = 0;
    for (int face = 0; face < 6; ++face) {
        for (int plane = 0; plane <= side; ++plane) {
#if LAB_CHECKPOINT >= 7
            const Mask mask = makeWorldMask(world, key, face, plane);
#else
            const Mask mask = makeMask(entry.blocks, face, plane, 15);
#endif
            for (const Block material : mask) {
                if (material != Block::Air) {
                    ++entry.unitFaces;
                }
            }
            int comparisons = 0;
            for (const Rectangle& r : extractRectangles(mask, face, plane, comparisons)) {
                entry.quads.push_back(r);
                appendQuad(entry.mesh, r);
            }
        }
    }
    ++entry.revision;
    ++world.rebuilds;
    ++world.lastMeshes;
}
#if LAB_CHECKPOINT >= 8
inline void markAffected(std::set<Key>& dirty, Key key) {
    dirty.insert(key);
    dirty.insert({key.x - 1, key.z});
    dirty.insert({key.x + 1, key.z});
    dirty.insert({key.x, key.z - 1});
    dirty.insert({key.x, key.z + 1});
}
#endif
inline void refreshMeshes(World& world, const std::vector<Key>& changed) {
    if (changed.empty()) {
        return;
    }
#if LAB_CHECKPOINT >= 8
    std::set<Key> dirty;
    for (const Key key : changed) {
        markAffected(dirty, key);
    }
    for (const Key key : dirty) {
        rebuild(world, key);
    }
#else
    // Bản trước cache vẫn đúng hình học nhưng dựng lại cả vùng resident.
    for (const auto& [key, entry] : world.chunks) {
        (void)entry;
        rebuild(world, key);
    }
#endif
    world.peak = std::max(world.peak, world.chunks.size());
    world.frameDirty = true;
}
} // namespace voxel
