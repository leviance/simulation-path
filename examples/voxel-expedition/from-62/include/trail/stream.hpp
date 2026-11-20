#pragma once
#include "region.hpp"
#include <deque>

namespace trail {
#if LAB_CHECKPOINT >= 6201
struct Stream {
    int radius = 2;
    int budget = 1;
    Key center{1000000, 1000000};
    std::deque<Key> wanted;

    void plan(Region& world, Key eye) {
        if (eye == center)
            return;
        center = eye;
        wanted.clear();
        // [snippet keep-ring]
        for (auto it = world.tiles.begin(); it != world.tiles.end();) {
            const Key key = it->first;
            const int distance = std::max(std::abs(key.first - eye.first), std::abs(key.second - eye.second));
            if (distance > radius + 1) {
                it = world.tiles.erase(it);
                world.dirty.erase(key);
                world.markNeighborhood(key);
                ++world.unloads;
            } else {
                ++it;
            }
        }
        // [/snippet keep-ring]
        // [snippet load-rings]
        for (int ring = 0; ring <= radius; ++ring)
            for (int dz = -ring; dz <= ring; ++dz)
                for (int dx = -ring; dx <= ring; ++dx) {
                    if (std::max(std::abs(dx), std::abs(dz)) != ring)
                        continue;
                    const Key key{eye.first + dx, eye.second + dz};
                    if (!world.tiles.contains(key))
                        wanted.push_back(key);
                }
        // [/snippet load-rings]
    }

#if LAB_CHECKPOINT >= 6204
    // Không chỉ đếm cột: đủ 25 cột nhưng thiếu cột dưới chân vẫn là sai.
    bool complete(const Region& world) const {
        if (!wanted.empty() || !world.dirty.empty() || world.tiles.size() > 49)
            return false;
        for (int z = -radius; z <= radius; ++z)
            for (int x = -radius; x <= radius; ++x) {
                if (!world.tiles.contains({center.first + x, center.second + z}))
                    return false;
            }
        return true;
    }
#endif
    // [snippet stream-budget]
    bool tick(Region& world, Mesher mode) {
        const bool changed = !wanted.empty() || !world.dirty.empty();
        for (int n = 0; n < budget && !wanted.empty(); ++n) {
            const Key next = wanted.front();
            wanted.pop_front();
            world.load(next);
            world.rebuild(next, mode);
        }
        world.buildSome(1, mode);
        return changed;
    }
    // [/snippet stream-budget]
};
#endif
} // namespace trail
