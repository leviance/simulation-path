#include "controller.hpp"
#include "oracle.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

voxel::Ray topRay(double x = 0.5, double z = 0.5) {
    return voxel::makeRay({x, 20, z}, {0, -1, 0});
}

void settle(voxel::World& world) {
    voxel::drain(world);
    voxel::flushEdits(world);
}
} // namespace

int main() {
    using namespace voxel;
    {
        // Góc camera từng vẽ block trước origin nhưng lại phá block phía sau.
        World foreground = createWorld();
        settle(foreground);
        movePlayer(foreground, 24, 8);
        settle(foreground);
        writeCell(foreground, {-10, 15, -5}, Block::Stone);
        flushEdits(foreground);
        Camera camera = initialCamera();
        camera.yaw = -2.1;
        const ViewVolume volume = cameraVolume(foreground, camera);
        Frame image;
        render(image, sceneMesh(foreground), camera, true, volume.near, volume.far);
        const Ray ray = cameraRay(camera, foreground.player, 171, 149, volume.near);
        const Trace frontHit = traceWorld(foreground, ray);
        check(frontHit.hit && frontHit.hit->cell == Cell{-10, 15, -5}, "pick agrees with foreground render");
        if (frontHit.hit) {
            check(std::abs(frontHit.hit->distance - (volume.near - image.depth[149 * 320 + 171])) < 1e-9, "ray distance matches rendered depth");
        }
        check(editRay(foreground, ray, false, Block::Grass), "edit foreground");
        check(residentBlock(foreground, {-10, 15, -5}) == 0 && residentBlock(foreground, {4, 3, 3}) != 0, "never edit hidden block instead");
        movePlayer(foreground, 512, -512);
        camera.yaw = -0.7;
        const ViewVolume retained = cameraVolume(foreground, camera);
        check(retained.near > 64 && retained.near - retained.far == 96, "near adapts to retained chunks after teleport");
        const Ray finiteRay = cameraRay(camera, foreground.player, 0, 0, retained.near);
        check(std::isfinite(finiteRay.origin[0]), "adaptive camera remains in ray bounds");
        // Cột và quads đúng chưa đủ nếu buffer triangle đã bị hỏng.
        World corrupted = createWorld();
        corrupted.chunks.at({}).mesh.clear();
        bool meshRejected = false;
        try {
            verifySandbox(corrupted);
        } catch (const std::runtime_error&) {
            meshRejected = true;
        }
        check(meshRejected, "sandbox audit checks actual triangle buffer");
    }
    World world = createWorld();
    check(world.chunks.size() == 1 && world.pending.size() == 8, "visible starter and bounded queue");
    check(hashChunk(world.chunks.at({}).blocks) == 4263195062u, "terrain fixture unchanged");
    check(traceWorld(world, topRay(-0.5, 0.5)).blocked, "Unknown blocks picking");
    check(!editRay(world, topRay(-0.5, 0.5), false, Block::Grass), "cannot edit unloaded data");
    settle(world);

    // Camera inverse phải bù đúng offset world và đi qua tâm pixel.
    for (const Player player : {Player{}, Player{-20.5, 33}, Player{512, -512}}) {
        for (const double zoomValue : {0.5, 1.0, 1.5}) {
            Camera camera = initialCamera();
            camera.zoom = zoomValue;
            for (const std::array<int, 2> pixel : {std::array<int, 2>{0, 0}, {160, 120}, {319, 239}}) {
                const Ray ray = cameraRay(camera, player, pixel[0], pixel[1]);
                const Vec3 p{ray.origin[0] + ray.direction[0] * 20 - player.x + 8, ray.origin[1] + ray.direction[1] * 20, ray.origin[2] + ray.direction[2] * 20 - player.z + 8};
                const ScreenPoint screen = project(p, camera);
                check(std::abs(screen.x - pixel[0] - 0.5) < 1e-9 && std::abs(screen.y - pixel[1] - 0.5) < 1e-9, "inverse world pixel center");
            }
        }
    }
    const std::array<Ray, 8> rays{{topRay(-15.5, -0.5), topRay(-0.5, -0.5), topRay(), topRay(15.5, 8.5), topRay(16.5, 8.5), makeRay({-15, 14, -15}, {1, -0.4, 1}), cameraRay(initialCamera(), {}, 160, 120), cameraRay(initialCamera(), {}, 100, 70)}};
    for (const Ray ray : rays) {
        const Trace actual = traceWorld(world, ray);
        const Trace expected = bruteOracle(world, ray);
        check(actual.blocked == expected.blocked && actual.hit.has_value() == expected.hit.has_value(), "DDA oracle outcome");
        if (actual.hit && expected.hit) {
            check(actual.hit->cell == expected.hit->cell && actual.hit->normal == expected.hit->normal && std::abs(actual.hit->distance - expected.hit->distance) < 1e-9, "DDA oracle cell normal t");
        }
        check(actual.path.size() <= 256, "bounded traversal");
    }
    const Ray ray = topRay();
    const Cell first = traceWorld(world, ray).hit->cell;
    check(editRay(world, ray, false, Block::Grass), "break current hit");
    const Cell second = traceWorld(world, ray).hit->cell;
    check(second[1] == first[1] - 1 && world.edits.size() == 1, "next action sees new data");
    check(editRay(world, ray, true, Block::Stone), "place on newly queried face");
    check(residentBlock(world, first) == 3, "material selection");
    flushEdits(world);
    verifySandbox(world);

    // Đặt từ mặt bên của chunk 0 sang chunk 1, không chỉ đặt theo trục Y.
    World border = createWorld();
    settle(border);
    writeCell(border, {15, 14, 8}, Block::Stone);
    flushEdits(border);
    check(editRay(border, makeRay({20.5, 14.5, 8.5}, {-1, 0, 0}), true, Block::Dirt), "place across resident seam");
    check(residentBlock(border, {16, 14, 8}) == 2 && flushEdits(border) == 2, "cross-seam material and mesh");
    verifySandbox(border);
    writeCell(border, {8, 15, 8}, Block::Stone);
    const std::string ceiling = serialize(border);
    check(!editRay(border, topRay(8.5, 8.5), true, Block::Grass) && serialize(border) == ceiling, "reject target y16 before mutation");

    World cells = createWorld();
    settle(cells);
    for (auto& [key, entry] : cells.chunks) {
        (void)key;
        entry.blocks.fill(Block::Air);
    }
    writeCell(cells, {0, 2, 0}, Block::Stone);
    // Bảng truy vết bài 03: cùng một ray đi từ chunk âm qua x=0.
    const Ray across = makeRay({-1.5, 2.5, 0.5}, {1, 0, 0});
    const Trace crossed = traceWorld(cells, across);
    check(crossed.path == std::vector<Cell>{{-2, 2, 0}, {-1, 2, 0}, {0, 2, 0}}, "worked DDA cell path");
    check(crossed.hit && crossed.hit->cell == Cell{0, 2, 0} && crossed.hit->normal == Cell{-1, 0, 0} && crossed.hit->distance == 1.5, "worked DDA hit at signed seam");
    World unknown = cells;
    unknown.chunks.erase(Key{0, 0});
    const auto beforeUnknown = unknown.chunks.size();
    const Trace blocked = traceWorld(unknown, across);
    check(blocked.blocked && !blocked.hit && blocked.path == crossed.path && unknown.chunks.size() == beforeUnknown, "worked DDA Unknown does not load");

    const Trace diagonal = traceWorld(cells, makeRay({-1, 2.5, -1}, {1, 0, 1}));
    check(diagonal.hit && diagonal.hit->cell == Cell{0, 2, 0} && diagonal.hit->normal == Cell{-1, 0, 0}, "step ties, normal X first");
    const Ray inside = makeRay({0.5, 2.5, 0.5}, {0, -0.0, 1});
    const Trace insideHit = traceWorld(cells, inside);
    check(insideHit.hit && insideHit.hit->normal == Cell{} && insideHit.hit->distance == 0, "inside block normal zero");
    check(!editRay(cells, inside, true, Block::Grass), "inside has no placement face");
    check(!traceWorld(cells, makeRay({0.5, 2.5, -1}, {0, 0, 1}), 0.5).hit, "finite reach miss");

    // Delta là thay đổi của world; unload không được xóa tombstone Air.
    World session = createWorld();
    settle(session);
    writeCell(session, {0, 0, 0}, Block::Air);
    flushEdits(session);
    movePlayer(session, 200, -200);
    settle(session);
    check(!session.chunks.contains({}), "source chunk unloaded");
    const auto residentCount = session.chunks.size();
    check(history(session, false) && session.edits.empty() && session.chunks.size() == residentCount, "offline undo without load");
    check(history(session, true) && effectiveBlock(session, {0, 0, 0}) == Block::Air, "offline redo");
    movePlayer(session, 8, 8);
    settle(session);
    check(residentBlock(session, {0, 0, 0}) == 0, "tombstone rehydrated");
    writeCell(session, {0, 0, 0}, Block::Stone);
    check(session.edits.empty(), "restoring base removes delta");
    flushEdits(session);
    const int historical = session.lastMeshes;
    writeCell(session, {8, 15, 8}, Block::Stone);
    writeCell(session, {9, 15, 8}, Block::Stone);
    check(flushEdits(session) == 1 && flushEdits(session) == 0, "coalesce interior mesh");
    writeCell(session, {0, 15, 0}, Block::Stone);
    check(flushEdits(session) == 3 && session.lastMeshes == historical, "corner meshes and historical stream counter");
    verifySandbox(session);

    World cap = createWorld();
    for (int x = 0; x < 512; ++x) {
        check(writeCell(cap, {x, 15, 0}, Block::Stone), "fill bounded delta map");
    }
    const std::string beforeCap = serialize(cap);
    check(!writeCell(cap, {512, 15, 0}, Block::Stone) && serialize(cap) == beforeCap, "cap rejection before mutation");
    check(cap.undo.size() == 32 && cap.redo.empty(), "history cap");
    check(writeCell(cap, {0, 15, 0}, Block::Air) && cap.edits.size() == 511, "free delta slot");
    check(history(cap, false), "undo latest");
    writeCell(cap, {1, 15, 0}, Block::Air);
    check(cap.redo.empty(), "new branch clears redo");

    World saved = createWorld();
    settle(saved);
    writeCell(saved, {16, 14, 0}, Block::Stone);
    writeCell(saved, {0, 0, 0}, Block::Air);
    writeCell(saved, {-1, 0, -1}, Block::Air);
    const std::string fixture = "VXL1 42 32 3\n3\n-1 0 -1 0\n0 0 0 0\n16 14 0 3\n";
    check(serialize(saved) == fixture, "canonical fixture shared with TypeScript");
    World imported = importSnapshot(saved, fixture);
    check(imported.chunks.size() == 1 && imported.undo.empty() && imported.redo.empty(), "import replaces cache and history");
    settle(imported);
    verifySandbox(imported);
    check(serialize(imported) == fixture, "snapshot round trip");
    for (const std::string& bad : std::vector<std::string>{"", "VXL2 42 32 3\n0", "VXL1 42 8 3\n0", "VXL1 42 32 3\n513", "VXL1 42 32 3\n1\n0 16 0 0", "VXL1 42 32 3\n1\n0 0 0 3", "VXL1 42 32 3\n2\n0 0 0 0\n0 0 0 0", fixture + "extra", "VXL1 +42 32 3\n0", "VXL1 99999999999999999999 32 3\n0", std::string(32769, 'x')}) {
        bool rejected = false;
        try {
            importSnapshot(saved, bad);
        } catch (const std::exception&) {
            rejected = true;
        }
        check(rejected && serialize(saved) == fixture, "malformed import leaves active world intact");
    }
    bool rejected = false;
    try {
        traceWorld(world, {{0, 20, 0}, {0, -2, 0}});
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, "reject nonunit ray");
    rejected = false;
    try {
        makeRay({std::numeric_limits<double>::quiet_NaN(), 0, 0}, {1, 0, 0});
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, "reject NaN before cast");

    App app;
    refreshFrame(app);
    const int queries = app.queries;
    const int rasters = app.rasters;
    aim(app, app.aimX, app.aimY);
    check(!refreshFrame(app) && app.queries == queries && app.rasters == rasters, "idle keeps both caches");
    aim(app, 161, 120);
    check(!refreshFrame(app) && app.queries == queries + 1 && app.rasters == rasters, "aim only re-queries");
    app.auditMessage = "PASS";
    step(app);
    check(app.auditMessage == "Needs recheck: world data changed", "streaming invalidates previous audit");
    settle(app.world);
    app.auditMessage = "PASS";
    step(app);
    check(app.auditMessage == "PASS", "idle tick keeps current audit");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "PASS voxel sandbox invariants\n";
    return EXIT_SUCCESS;
}
