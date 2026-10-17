#pragma once
#include "meshing.hpp"
#include <algorithm>

namespace voxel {
inline bool earlierJob(const Job& a, const Job& b) {
    // Gỡ xa trước để giải phóng slot; tải gần trước, tie z rồi x.
    if (a.load != b.load) {
        return !a.load;
    }
    if (a.priority != b.priority) {
        if (a.load) {
            return a.priority < b.priority;
        }
        return a.priority > b.priority;
    }
    return a.key < b.key;
}

inline std::vector<Job> plan(const World& world) {
    const Key center = targetCenter(world);
    std::vector<Job> jobs;
    for (const auto& [key, entry] : world.chunks) {
        (void)entry;
        if (distance(key, center) > keepRadius(world)) {
            jobs.push_back({key, false, 0});
        }
    }
    for (const Key key : wanted(world)) {
        if (!world.chunks.contains(key)) {
            jobs.push_back({key, true, 0});
        }
    }
    for (Job& job : jobs) {
        const int dx = job.key.x - center.x;
        const int dz = job.key.z - center.z;
        job.priority = dx * dx + dz * dz;
    }
    std::sort(jobs.begin(), jobs.end(), earlierJob);
    return jobs;
}

inline void retarget(World& world) {
    const auto jobs = plan(world);
    std::set<std::pair<bool, Key>> ids;
    for (const Job& job : jobs) {
        ids.insert({job.load, job.key});
    }
    for (const Job& old : world.pending) {
        if (!ids.contains({old.load, old.key})) {
            ++world.cancelled;
        }
    }
    world.pending = jobs;
}

inline void pump(World& world) {
    world.pending = plan(world);
    world.lastJobs = 0;
    world.lastMeshes = 0;
    world.lastBudget = world.budget;
    ++world.ticks;
    const int count = std::min(world.budget, static_cast<int>(world.pending.size()));
    std::vector<Key> changed;
    for (int i = 0; i < count; ++i) {
        const Job job = world.pending[i];
        ++world.lastJobs;
        bool applied = false;
        if (job.load) {
            applied = loadChunk(world, job.key);
        } else {
            applied = unloadChunk(world, job.key);
        }
        if (applied) {
            changed.push_back(job.key);
        }
    }
    // Hoàn tất geometry cho cả batch trước khi công bố frame.
    refreshMeshes(world, changed);
    world.pending = plan(world);
}

inline World createWorld(TerrainConfig config = {}, const std::map<Cell, Block>& edits = {}, Player player = {}) {
    validateConfig(config);
    World world;
    world.config = config;
    world.edits = edits;
    world.player = player;
    const Key center = centerOf(player);
    loadChunk(world, center);
    rebuild(world, center);
    world.peak = 1;
    retarget(world);
    return world;
}

inline void movePlayer(World& world, double x, double z) {
    if (!std::isfinite(x) || !std::isfinite(z) || std::abs(x) > playerLimit || std::abs(z) > playerLimit) {
        throw std::out_of_range("player -512..512");
    }
    if (x == world.player.x && z == world.player.z) {
        return;
    }
    const Key before = centerOf(world.player);
    world.player = {x, z};
    world.frameDirty = true;
    if (!(before == centerOf(world.player))) {
        retarget(world);
    }
}

inline void settings(World& world, int radius, int budget) {
    if (radius < 1 || radius > 2 || budget < 1 || budget > 2) {
        throw std::out_of_range("radius/budget 1..2");
    }
    world.radius = radius;
    world.budget = budget;
    retarget(world);
}

} // namespace voxel
