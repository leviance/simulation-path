#pragma once
#include "coordinates.hpp"
#include <map>
#include <set>

namespace voxel {
// Entry sở hữu dữ liệu và mesh. Job chỉ giữ Key, không giữ con trỏ Entry.
struct Entry {
    Chunk blocks{};
    Mesh mesh;
    std::vector<Rectangle> quads;
    int unitFaces = 0;
    int revision = 0;
};
#if LAB_CHECKPOINT >= 5
struct Job {
    Key key;
    bool load;
    int priority;
};
#endif
struct World {
    Player player;
    int radius = 1;
    int budget = 2;
    std::map<Key, Entry> chunks;
#if LAB_CHECKPOINT >= 5
    std::vector<Job> pending;
#endif
    int loads = 0;
    int unloads = 0;
    int rebuilds = 0;
    int cancelled = 0;
    int ticks = 0;
    int lastJobs = 0;
    int lastMeshes = 0;
    int lastBudget = 2;
    std::size_t peak = 0;
    bool frameDirty = true;
};

inline int loadRadius(const World& world) {
#if LAB_CHECKPOINT >= 3
    return world.radius;
#else
    (void)world;
    return 0;
#endif
}

inline Key targetCenter(const World& world) {
#if LAB_CHECKPOINT >= 3
    return centerOf(world.player);
#else
    (void)world;
    return {};
#endif
}

inline int keepRadius(const World& world) {
#if LAB_CHECKPOINT >= 6
    return loadRadius(world) + 1;
#else
    return loadRadius(world);
#endif
}

inline std::vector<Key> wanted(const World& world) {
#if LAB_CHECKPOINT >= 3
    const Key center = targetCenter(world);
    const int radius = loadRadius(world);
    std::vector<Key> keys;
    for (int z = center.z - radius; z <= center.z + radius; ++z) {
        for (int x = center.x - radius; x <= center.x + radius; ++x) {
            validateKey({x, z});
            keys.push_back({x, z});
        }
    }
    return keys;
#else
    (void)world;
    return {Key{}};
#endif
}

inline Chunk generateChunk(Key key) {
    validateKey(key);
    Chunk blocks{};
    const Block top = static_cast<Block>(1 + ((key.x + key.z) % 3 + 3) % 3);
    for (int y = 0; y < 4; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                Block material = Block::Dirt;
                if (y == 0) {
                    material = Block::Stone;
                }
                if (y == 3) {
                    material = top;
                }
                set(blocks, x, y, z, material);
            }
        }
    }
    return blocks;
}
#if LAB_CHECKPOINT >= 4
inline std::uint32_t hashChunk(const Chunk& blocks) {
    std::uint32_t hash = 2166136261u;
    for (const Block value : blocks) {
        hash = (hash ^ static_cast<std::uint32_t>(value)) * 16777619u;
    }
    return hash;
}
#endif
inline bool loadChunk(World& world, Key key) {
    if (world.chunks.contains(key) || world.chunks.size() >= maxResident) {
        return false;
    }
    Entry entry;
    entry.blocks = generateChunk(key);
    world.chunks.emplace(key, std::move(entry));
    ++world.loads;
    return true;
}
#if LAB_CHECKPOINT >= 4
inline bool unloadChunk(World& world, Key key) {
    if (world.chunks.erase(key) == 0) {
        return false;
    }
    ++world.unloads;
    return true;
}
#endif
} // namespace voxel
