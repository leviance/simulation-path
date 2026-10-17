#pragma once
#include "terrain.hpp"
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

struct Job {
    Key key;
    bool load;
    int priority;
};

struct World {
    Player player;
    TerrainConfig config;
    int generation = 1;
    int radius = 1;
    int budget = 2;
    std::map<Key, Entry> chunks;
    std::vector<Job> pending;
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
    return world.radius;
}

inline Key targetCenter(const World& world) {
    return centerOf(world.player);
}

inline int keepRadius(const World& world) {
    return loadRadius(world) + 1;
}

inline std::vector<Key> wanted(const World& world) {
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
}

inline std::uint32_t hashChunk(const Chunk& blocks) {
    std::uint32_t hash = 2166136261u;
    for (const Block value : blocks) {
        hash = (hash ^ static_cast<std::uint32_t>(value)) * 16777619u;
    }
    return hash;
}

inline bool loadChunk(World& world, Key key) {
    if (world.chunks.contains(key) || world.chunks.size() >= maxResident) {
        return false;
    }
    Entry entry;
    entry.blocks = generateTerrain(key, world.config);
    world.chunks.emplace(key, std::move(entry));
    ++world.loads;
    return true;
}

inline bool unloadChunk(World& world, Key key) {
    if (world.chunks.erase(key) == 0) {
        return false;
    }
    ++world.unloads;
    return true;
}
} // namespace voxel
