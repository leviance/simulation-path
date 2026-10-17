#pragma once
#include "raster.hpp"
#include "scheduler.hpp"

namespace voxel {
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
    bool cameraDirty = true;
    int rasterizations = 0;
    Key selected{};
    int preset = 0;
    bool paused = true;
    double elapsed = 0;
    bool autoTravel = false;
    std::size_t waypoint = 0;
};

#if LAB_CHECKPOINT >= 8
// Inspector lấy mẫu tại voxel nguyên; không lẫn vị trí marker liên tục với cột dữ liệu.
struct ColumnSample {
    int x;
    int z;
    double signal;
    int height;
};

inline ColumnSample inspectColumn(const App& app) {
    const int x = static_cast<int>(std::floor(app.world.player.x));
    const int z = static_cast<int>(std::floor(app.world.player.z));
    return {x, z, terrainSignal(x, z, app.world.config), heightAt(x, z, app.world.config)};
}
#endif

inline void stop(App& app) {
    app.paused = true;
    app.elapsed = 0;
}

inline void step(App& app) {
    if (app.autoTravel) {
        const std::array<Player, 9> route{{{8, 8}, {20, 8}, {36, 8}, {36, 24}, {20, 24}, {8, 24}, {-4, 8}, {-20, -8}, {8, 8}}};
        const Player p = route[app.waypoint];
        movePlayer(app.world, p.x, p.z);
        app.waypoint = (app.waypoint + 1) % route.size();
    }
    pump(app.world);
    bool finished = app.world.pending.empty();
    finished = finished && !app.autoTravel;
    if (finished) {
        stop(app);
    }
}

inline void tick(App& app, double dt) {
    if (app.paused) {
        return;
    }
    // Mỗi lần chỉ xử lý một batch; không while bù thời gian sau alt-tab.
    app.elapsed += std::clamp(dt, 0.0, 0.1);
    if (app.elapsed >= 0.2) {
        app.elapsed = 0;
        step(app);
    }
}

inline void choosePreset(App& app, int preset) {
    if (preset < 0 || preset > 3) {
        throw std::out_of_range("preset 0..3");
    }
    stop(app);
    app.world = createWorld(app.world.config);
    app.preset = preset;
    const std::array<Player, 4> positions{{{8, 8}, {-0.5, -0.5}, {200, -200}, {15.5, 8}}};
    movePlayer(app.world, positions[preset].x, positions[preset].z);
    app.selected = centerOf(app.world.player);
}

inline Mesh sceneMesh(const World& world) {
    Mesh mesh;
    // Local mesh không đổi khi player/camera di chuyển; chỉ bản vẽ nhận offset.
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

inline bool refreshFrame(App& app) {
    if (!app.world.frameDirty && !app.cameraDirty) {
        return false;
    }
    render(app.frame, sceneMesh(app.world), app.camera);
    app.world.frameDirty = false;
    app.cameraDirty = false;
    ++app.rasterizations;
    return true;
}
} // namespace voxel
