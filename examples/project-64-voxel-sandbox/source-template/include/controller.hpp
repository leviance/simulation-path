#pragma once
#include "snapshot.hpp"

namespace voxel {
// App chỉ giữ state điều khiển và cache; World sở hữu blocks/delta/mesh.
inline Camera initialCamera() {
    Camera camera;
    camera.pitch = 0.65;
    camera.scale = 2;
    return camera;
}

struct App {
    World world = createWorld();
    Camera camera = initialCamera();
    Frame frame;
    int aimX = 160;
    int aimY = 120;
    Block material = Block::Grass;
    Trace trace;
    bool pickDirty = true;
    bool cameraDirty = true;
    bool paused = true;
    double elapsed = 0;
    int queries = 0;
    int rasters = 0;
    int preset = 0;
    std::string message = "N step | Space load | R reset";
#if LAB_CHECKPOINT >= 10
    std::string auditMessage = "Not checked";
#endif
};

#if LAB_CHECKPOINT >= 10
inline void invalidateAudit(App& app) {
    app.auditMessage = "Needs recheck: world data changed";
}
#endif

inline void stop(App& app) {
    app.paused = true;
    app.elapsed = 0;
}

inline void aim(App& app, int x, int y) {
    x = std::clamp(x, 0, 319);
    y = std::clamp(y, 0, 239);
    if (app.aimX == x && app.aimY == y) {
        return;
    }
    app.aimX = x;
    app.aimY = y;
    app.pickDirty = true;
}

inline Mesh sceneMesh(const World& world) {
    Mesh mesh;
    for (const auto& [key, entry] : world.chunks) {
        for (Triangle triangle : entry.mesh) {
            for (Vec3& p : triangle.points) {
                p.x += key.x * side - world.player.x + 8;
                p.z += key.z * side - world.player.z + 8;
            }
            mesh.push_back(triangle);
        }
    }
    return mesh;
}

inline void refreshPick(App& app) {
    if (!app.pickDirty) {
        return;
    }
#if LAB_CHECKPOINT >= 3
    app.trace = traceWorld(app.world, cameraRay(app.camera, app.world.player, app.aimX, app.aimY, cameraVolume(app.world, app.camera).near));
    ++app.queries;
#endif
    app.pickDirty = false;
}

inline bool refreshFrame(App& app) {
#if LAB_CHECKPOINT >= 4
    flushEdits(app.world);
#endif
    refreshPick(app);
    if (!app.world.frameDirty && !app.cameraDirty) {
        return false;
    }
#if LAB_CHECKPOINT >= 2
    const ViewVolume volume = cameraVolume(app.world, app.camera);
    render(app.frame, sceneMesh(app.world), app.camera, true, volume.near, volume.far);
#else
    render(app.frame, sceneMesh(app.world), app.camera);
#endif
    app.world.frameDirty = false;
    app.cameraDirty = false;
    ++app.rasters;
    return true;
}

inline void action(App& app, bool place) {
    stop(app);
#if LAB_CHECKPOINT >= 4
    const Ray ray = cameraRay(app.camera, app.world.player, app.aimX, app.aimY, cameraVolume(app.world, app.camera).near);
    const bool changed = editRay(app.world, ray, place, app.material);
    app.message = "No change: check hit, resident, boundary or delta cap";
    if (changed) {
        app.message = "Edited one cell";
        app.pickDirty = true;
#if LAB_CHECKPOINT >= 10
        invalidateAudit(app);
#endif
    }
#else
    (void)place;
    app.message = "Read-only checkpoint";
#endif
}

inline void step(App& app) {
    pump(app.world);
    if (app.world.lastJobs != 0) {
        app.pickDirty = true;
#if LAB_CHECKPOINT >= 10
        invalidateAudit(app);
#endif
    }
    if (app.world.pending.empty()) {
        stop(app);
    }
}

inline void tick(App& app, double dt) {
    if (app.paused) {
        return;
    }
    app.elapsed += std::clamp(dt, 0.0, 0.1);
    if (app.elapsed >= 0.2) {
        app.elapsed = 0;
        step(app);
    }
}

inline void travel(App& app, double dx, double dz) {
    stop(app);
    movePlayer(app.world, std::clamp(app.world.player.x + dx, -playerLimit, playerLimit), std::clamp(app.world.player.z + dz, -playerLimit, playerLimit));
    app.pickDirty = true;
}
#if LAB_CHECKPOINT >= 9
inline void choosePreset(App& app) {
    stop(app);
    app.preset = (app.preset + 1) % 4;
    const std::array<Player, 4> positions{{{8, 8}, {-0.5, -0.5}, {200, -200}, {15.5, 8}}};
    movePlayer(app.world, positions[app.preset].x, positions[app.preset].z);
    app.pickDirty = true;
    app.message = "Travel keeps session deltas; N/Space loads the new region";
}
#endif
} // namespace voxel
