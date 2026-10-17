#pragma once
#include "query.hpp"
#include "scheduler.hpp"

namespace voxel {
// Delta lưu địa chỉ world, không giữ Entry reference qua unload.
inline void validateCell(Cell cell) {
    if (cell[0] < -1024 || cell[0] >= 1024 || cell[1] < 0 || cell[1] >= 16 || cell[2] < -1024 || cell[2] >= 1024) {
        throw std::out_of_range("world voxel bounds");
    }
}

inline Block baseBlock(const World& world, Cell cell) {
    validateCell(cell);
    return materialAt(cell[1], heightAt(cell[0], cell[2], world.config), world.config);
}

inline Block effectiveBlock(const World& world, Cell cell) {
    const auto found = world.edits.find(cell);
    if (found != world.edits.end()) {
        return found->second;
    }
    return baseBlock(world, cell);
}

#if LAB_CHECKPOINT >= 4
inline void markEdit(World& world, Cell cell) {
    const Key key{floorDiv(cell[0]), floorDiv(cell[2])};
    if (!world.chunks.contains(key)) {
        return;
    }
    world.dirty.insert(key);
    const int x = cell[0] - key.x * side;
    const int z = cell[2] - key.z * side;
    if (x == 0) {
        world.dirty.insert({key.x - 1, key.z});
    }
    if (x == 15) {
        world.dirty.insert({key.x + 1, key.z});
    }
    if (z == 0) {
        world.dirty.insert({key.x, key.z - 1});
    }
    if (z == 15) {
        world.dirty.insert({key.x, key.z + 1});
    }
}

inline int flushEdits(World& world) {
    if (world.dirty.empty()) {
        return 0;
    }
    const int historical = world.lastMeshes;
    std::set<Key> keys = world.dirty;
#if LAB_CHECKPOINT < 6
    keys.clear();
    for (const auto& [key, entry] : world.chunks) {
        (void)entry;
        keys.insert(key);
    }
#endif
    int count = 0;
    for (const Key key : keys) {
        if (world.chunks.contains(key)) {
            rebuild(world, key);
            ++count;
        }
    }
    world.lastMeshes = historical;
    world.editRebuilds += count;
    world.dirty.clear();
    world.frameDirty = true;
    return count;
}

inline bool writeCell(World& world, Cell cell, Block value, bool record = true) {
    validateCell(cell);
    if (static_cast<unsigned>(value) > 3) {
        throw std::out_of_range("Block ID 0..3");
    }
    const Key key{floorDiv(cell[0]), floorDiv(cell[2])};
    const auto found = world.chunks.find(key);
    Block before = effectiveBlock(world, cell);
    if (found != world.chunks.end()) {
        before = get(found->second.blocks, cell[0] - key.x * side, cell[1], cell[2] - key.z * side);
    }
    if (before == value) {
        return false;
    }
#if LAB_CHECKPOINT >= 5
    const Block base = baseBlock(world, cell);
    if (value != base && !world.edits.contains(cell) && world.edits.size() >= 512) {
        return false;
    }
    if (value == base) {
        world.edits.erase(cell);
    } else {
        world.edits[cell] = value;
    }
#else
    if (found == world.chunks.end()) {
        return false;
    }
#endif
    if (found != world.chunks.end()) {
        set(found->second.blocks, cell[0] - key.x * side, cell[1], cell[2] - key.z * side, value);
    }
    markEdit(world, cell);
#if LAB_CHECKPOINT >= 7
    if (record) {
        world.undo.push_back({cell, before, value});
        if (world.undo.size() > 32) {
            world.undo.erase(world.undo.begin());
        }
        world.redo.clear();
    }
#else
    (void)record;
#endif
#if LAB_CHECKPOINT < 6
    flushEdits(world);
#endif
    return true;
}

inline bool editRay(World& world, const Ray& ray, bool place, Block material) {
    if (material == Block::Air || static_cast<unsigned>(material) > 3) {
        throw std::out_of_range("material 1..3");
    }
    // Luôn pick lại từ dữ liệu hiện tại; preview trên màn hình có thể đã cũ.
    const Trace trace = traceWorld(world, ray);
    if (!trace.hit) {
        return false;
    }
    Cell cell = trace.hit->cell;
    Block value = Block::Air;
    if (place) {
        if (trace.hit->normal == Cell{}) {
            return false;
        }
        for (int i = 0; i < 3; ++i) {
            cell[i] += trace.hit->normal[i];
        }
        if (cell[1] < 0 || cell[1] >= 16 || cell[0] < -1024 || cell[0] >= 1024 || cell[2] < -1024 || cell[2] >= 1024 || residentBlock(world, cell) != 0) {
            return false;
        }
        value = material;
    }
    return writeCell(world, cell, value);
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool history(World& world, bool redo) {
    auto& source = world.undo;
    auto& target = world.redo;
    if (redo) {
        if (world.redo.empty()) {
            return false;
        }
        const Command command = world.redo.back();
        if (effectiveBlock(world, command.cell) != command.before) {
            return false;
        }
        if (!writeCell(world, command.cell, command.after, false)) {
            return false;
        }
        world.redo.pop_back();
        world.undo.push_back(command);
        return true;
    }
    if (source.empty()) {
        return false;
    }
    const Command command = source.back();
    if (effectiveBlock(world, command.cell) != command.after) {
        return false;
    }
    if (!writeCell(world, command.cell, command.before, false)) {
        return false;
    }
    source.pop_back();
    target.push_back(command);
    return true;
}
#endif
} // namespace voxel
