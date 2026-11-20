#pragma once
#include "visibility.hpp"
#include <chrono>
#include <map>
#include <set>
#include <utility>
#if LAB_CHECKPOINT >= 6101
#include "greedy.hpp"
#endif
#if LAB_CHECKPOINT >= 6301
#include "terrain.hpp"
#endif

namespace trail {
#if LAB_CHECKPOINT >= 5901
using Key = std::pair<int, int>;
enum class Mesher {
    Naive,
    Visible,
    Greedy
};
struct Tile {
    Column data;
    Mesh mesh;
    int solids = 0;
#if LAB_CHECKPOINT >= 6103
    std::vector<Vec3> grass;
#endif
};

struct Region {
    std::map<Key, Tile> tiles;
    std::set<Key> dirty;
    int builds = 0, loads = 0, unloads = 0;
    double lastBuildMs = 0, lastLoadMs = 0;
    std::uint32_t seed = 73;

    Block read(int wx, int y, int wz) const {
        const auto ax = splitCoordinate(wx), az = splitCoordinate(wz);
        const auto at = tiles.find({ax.chunk, az.chunk});
        if (at == tiles.end())
            return Block::Air;
        return at->second.data.get(ax.local, y, az.local);
    }

    // [snippet dirty-border]
    void markNeighborhood(Key k) {
        for (auto delta : std::array<Key, 5>{{{0, 0}, {1, 0}, {-1, 0}, {0, 1}, {0, -1}}}) {
            const Key key{k.first + delta.first, k.second + delta.second};
            if (tiles.contains(key))
                dirty.insert(key);
        }
    }
    // [/snippet dirty-border]
    void put(Column column) {
        const Key key{column.cx, column.cz};
        int n = 0;
        for (const Section& s : column.sections)
            for (Block b : s)
                if (b != Block::Air)
                    ++n;
        Tile tile;
        tile.data = std::move(column);
        tile.solids = n;
#if LAB_CHECKPOINT >= 6103
        for (int z = 1; z < side; z += 2)
            for (int x = 1; x < side; x += 2) {
                const int wx = key.first * side + x, wz = key.second * side + z;
                if ((hash(wx, wz, 73) & 3) == 0)
                    continue;
                for (int y = tile.data.height() - 1; y >= 0; --y) {
                    if (tile.data.get(x, y, z) != Block::Grass)
                        continue;
                    if (tile.data.get(x, y + 1, z) == Block::Air)
                        tile.grass.push_back({wx + 0.42, y + 1.0, wz + 0.56});
                    break;
                }
            }
#endif
        tiles.insert_or_assign(key, std::move(tile));
        markNeighborhood(key);
        ++loads;
    }

    void load(Key key) {
        const auto began = std::chrono::steady_clock::now();
#if LAB_CHECKPOINT >= 6301
        // [snippet load-land]
        put(naturalColumn(key.first, key.second, seed));
        // [/snippet load-land]
#else
        put(makeBank(key.first, key.second));
#endif
        lastLoadMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - began).count();
    }

    void rebuild(Key key, Mesher mode) {
        auto& tile = tiles.at(key);
        const Column& column = tile.data;
        // Chỉ tra bảng các chunk khi đi qua một mép của cột hiện tại.
        // [snippet lookup-neighbor]
        const auto sample = [&](int wx, int y, int wz) {
            const int x = wx - key.first * side, z = wz - key.second * side;
            if (x >= 0 && x < side && z >= 0 && z < side)
                return column.get(x, y, z);
            return read(wx, y, wz);
        };
        // [/snippet lookup-neighbor]
        const auto start = std::chrono::steady_clock::now();
        if (mode == Mesher::Naive)
            tile.mesh = naiveMesh(column);
#if LAB_CHECKPOINT >= 6101
        // [snippet use-greedy]
        else if (mode == Mesher::Greedy)
            tile.mesh = greedyMesh(column, sample);
        // [/snippet use-greedy]
#endif
        else
            tile.mesh = visibleMesh(column, sample);
        lastBuildMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
        dirty.erase(key);
        ++builds;
    }

    void buildSome(int budget, Mesher mode) {
        while (budget > 0 && !dirty.empty()) {
            const Key next = *dirty.begin();
            rebuild(next, mode);
            --budget;
        }
    }

    std::size_t faces() const {
        std::size_t total = 0;
        for (const auto& entry : tiles)
            total += entry.second.mesh.size();
        return total;
    }
};
#endif
} // namespace trail
