#include "controller.hpp"
#include "oracle.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

int main() {
    using namespace voxel;
    // Tọa độ âm phải quay lại đúng world, local nằm trong [0,16).
    check(floorDiv(-1) == -1 && floorDiv(-16) == -1 && floorDiv(-17) == -2, "floor division");
    for (int i = -1024; i <= 1024; ++i) {
        const double x = i / 2.0;
        const auto s = splitAxis(x);
        check(s.chunk * side + s.local == x && s.local >= 0 && s.local < 16, "coordinate round trip");
    }
    check(splitAxis(-0.5).local == 15.5, "negative fractional position");
    check(hashChunk(generateChunk({0, 0})) == 2424852421u, "origin hash shared with TypeScript");
    check(hashChunk(generateChunk({-1, 0})) == 3845785541u, "negative hash shared with TypeScript");
    World world = createWorld();
    check(world.chunks.size() == 1 && world.pending.size() == 8, "initial visible chunk and queue");
    pump(world);
    check(world.lastJobs == 2 && world.lastMeshes <= 10, "per tick work bound");
    settings(world, 1, 1);
    verifySchedule(world);
    settings(world, 1, 2);
    drain(world);
    check(world.chunks.size() == 9 && verifySurface(world) == 5376, "3x3 flat world surface");
    const int builds = world.rebuilds;
    pump(world);
    check(world.rebuilds == builds && world.lastJobs == 0, "idle does not rebuild");
    const Chunk origin = world.chunks.at({0, 0}).blocks;
    const int loads = world.loads;
    const int untouched = world.chunks.at({-1, -1}).revision;
    movePlayer(world, 16.5, 8);
    pump(world);
    check(world.chunks.at({-1, -1}).revision == untouched, "unrelated chunk stays cached");
    drain(world);
    const int after = world.loads;
    check(after == loads + 3, "only entering row loads");
    movePlayer(world, 15.5, 8);
    drain(world);
    check(world.loads == after && world.chunks.at({0, 0}).blocks == origin, "hysteresis border reversal");
    movePlayer(world, 200, -200);
    movePlayer(world, -0.5, -0.5);
    check(world.cancelled > 0, "stale teleport jobs cancelled");
    drain(world);
    verifySurface(world);
    check(worldBlock(world, 999, 3, 0) == Block::Air, "missing chunk is Air");
    // Mỗi tick công bố mesh xong; không chờ drain mới sửa mặt giáp ranh.
    movePlayer(world, 48, 8);
    for (int i = 0; i < 40 && !world.pending.empty(); ++i) {
        pump(world);
        verifySchedule(world);
        verifySurface(world);
    }
    check(world.pending.empty(), "journey settles");
    settings(world, 2, 1);
    const std::array<Player, 6> journey{{{8, 8}, {40, 8}, {-20, -8}, {180, -180}, {512, 512}, {-512, -512}}};
    for (const Player p : journey) {
        movePlayer(world, p.x, p.z);
        drain(world);
        verifySchedule(world);
        check(world.chunks.size() <= 49, "resident cap");
    }
    settings(world, 1, 2);
    drain(world);
    check(world.chunks.size() <= 25, "radius shrink");
    verifySurface(world);
    movePlayer(world, 8, 8);
    drain(world);
    check(world.chunks.at({0, 0}).blocks == origin, "regeneration after eviction");
    bool rejected = false;
    try {
        movePlayer(world, 600, 0);
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected, "reject out of range player");
    // Frame cache không phụ thuộc vào việc SDL có present hay không.
    App app;
    check(refreshFrame(app), "first frame rasterized");
    const int raster = app.rasterizations;
    const int meshBuilds = app.world.rebuilds;
    check(!refreshFrame(app), "idle frame cache");
    orbit(app.camera, 8, 0);
    app.cameraDirty = true;
    refreshFrame(app);
    check(app.rasterizations == raster + 1 && app.world.rebuilds == meshBuilds, "camera only raster");
    app.paused = false;
    tick(app, 1000);
    check(app.world.ticks == 0, "no unbounded catch up");
    tick(app, 0.1);
    check(app.world.ticks == 1, "one finite batch");

    App presetApp;
    settings(presetApp.world, 2, 1);
    pump(presetApp.world);
    const int previousLoads = presetApp.world.loads;
    const auto previousResident = presetApp.world.chunks.size();
    choosePreset(presetApp, 2);
    check(presetApp.world.radius == 2 && presetApp.world.budget == 1, "preset preserves streaming settings");
    check(presetApp.world.loads == previousLoads && presetApp.world.chunks.size() == previousResident, "preset keeps resident and counters until next tick");
    check(presetApp.world.player.x == 200 && presetApp.world.player.z == -200 && presetApp.world.cancelled > 0, "preset retargets old queue");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "PASS streaming: signed coordinates, budgets, hysteresis, seams, regeneration and cache\n";
    return EXIT_SUCCESS;
}
