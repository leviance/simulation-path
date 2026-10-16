#pragma once
#include "cache.hpp"
#include "editing.hpp"

namespace voxel {
// Pure state không chứa SDL handle, nên kiểm cache/edit bằng CTest được.
struct Editor {
    Chunk chunk = makeChunk(6);
    int preset = 6;
    Camera camera;
    SceneCache cache;
    int pixelX = 160;
    int pixelY = 120;
    double reach = 64;
    Block material = Block::Stone;
    std::optional<Ray> ray;
    Trace trace;
    bool pickDirty = true;
    int queries = 0;
    int shown = 1;
    bool paused = true;
    std::string message = "No edits yet";
};

inline void geometryChanged(Editor& state) {
    state.cache.meshDirty = true;
    state.cache.frameDirty = true;
    state.pickDirty = true;
    state.paused = true;
}

inline void cameraChanged(Editor& state) {
    state.cache.frameDirty = true;
    state.pickDirty = true;
    state.paused = true;
}

inline bool refresh(Editor& state) {
    const bool imageChanged = update(state.cache, state.chunk, true, 15, state.camera);
#if LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT >= 8
    if (!state.pickDirty) {
        return imageChanged;
    }
#endif
    const bool changed = state.pickDirty;
    state.ray = cameraRay(state.camera, state.pixelX + 0.5, state.pixelY + 0.5);
    state.trace = {};
#if LAB_CHECKPOINT >= 3
    state.trace.interval = clipBox(*state.ray, {0, 0, 0}, {16, 16, 16}, state.reach);
#endif
#if LAB_CHECKPOINT >= 4
    state.trace = traverse(state.chunk, *state.ray, state.reach);
#endif
    state.pickDirty = false;
    ++state.queries;
    if (changed) {
        state.shown = 1;
    }
#endif
    return imageChanged;
}

#if LAB_CHECKPOINT >= 6
inline EditResult edit(Editor& state, [[maybe_unused]] bool place) {
    // Action dùng ray/state hiện tại, không dùng lại cached Hit của preview.
    const Ray actionRay = cameraRay(state.camera, state.pixelX + 0.5, state.pixelY + 0.5);
    EditResult result;
#if LAB_CHECKPOINT >= 7
    if (place) {
        result = placeBlock(state.chunk, actionRay, state.reach, state.material);
    } else {
#endif
        result = breakBlock(state.chunk, actionRay, state.reach);
#if LAB_CHECKPOINT >= 7
    }
#endif
    state.message = result.message;
    if (result.changed) {
        geometryChanged(state);
    }
    return result;
}
#endif
} // namespace voxel
