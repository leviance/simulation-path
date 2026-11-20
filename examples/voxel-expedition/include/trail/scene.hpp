// Cửa sổ chỉ cần biết kiểu Scene, dù bản đồ có một hay nhiều chunk.

#pragma once

#if LAB_CHECKPOINT >= 5901
// Khi có các chunk kề nhau, Scene quản lý chúng theo tọa độ world.
#include "field-scene.hpp"
#else
#include "sky.hpp"
#include <string>
#include <utility>

namespace trail {
// Camera không sở hữu địa hình. Đi lại chỉ thay góc nhìn, không dựng lại mesh.
struct Scene {
    Camera camera;
    Mesh mesh;
    bool debug = false;
    bool paused = false;
    bool useDepth = true;
    int preset = 0;
    int rebuilds = 0;
    int solids = 0;
    double seconds = 0;
#if LAB_CHECKPOINT >= 5806
    int sliceY = 4;
    bool showSlice = false;
#endif
#if LAB_CHECKPOINT >= 5807
    std::string auditResult;

    // [snippet audit-fixtures]
    void inspectFixtures() {
        const Mesh full = naiveMesh(solidCube());
        const Mesh empty = naiveMesh(Column{});
        const Mesh single = naiveMesh(singleStone());
        if (full.size() != 24576 || !empty.empty() || single.size() != 6) {
            throw std::runtime_error("Unexpected baseline mesh");
        }
        auditResult = "PASS: empty 0 / stone 6 / solid 24576 quads";
    }
    // [/snippet audit-fixtures]
#endif
#if LAB_CHECKPOINT >= 5802
    Column column;
#endif

    void resetPose() {
        camera = {};
#if LAB_CHECKPOINT >= 5803
        if (preset == 1) {
            camera.eye = {23, 21, -9};
            camera.yaw = -0.71;
            camera.pitch = -0.50;
        }
#endif
#if LAB_CHECKPOINT >= 5804
        if (preset == 2) {
            camera.eye = {7.0, 5.75, 0.8};
            camera.yaw = 0.12;
            camera.pitch = 0.015;
        }
#endif
    }

    std::size_t faceCount() const {
        return mesh.size();
    }
    int solidCount() const {
        return solids;
    }
    int buildCount() const {
        return rebuilds;
    }
    bool update(double dt) {
        if (!paused)
            seconds += dt;
        return false;
    }
#if LAB_CHECKPOINT >= 5806
    Block inspectedBlock(int x, int y, int z) const {
        return column.get(x, y, z);
    }
#endif

    void generate() {
        mesh.clear();
        solids = 0;
#if LAB_CHECKPOINT >= 5801
        // [snippet first-stone]
        appendCube(mesh, {7, 7, 7}, Block::Stone);
        solids = 1;
        // [/snippet first-stone]
#endif
#if LAB_CHECKPOINT >= 5802
        column = singleStone();
#endif
#if LAB_CHECKPOINT >= 5803
        if (preset == 1)
            column = solidCube();
        if (preset == 3)
            column = Column{};
#if LAB_CHECKPOINT >= 5804
        if (preset == 2)
            column = makeBank();
#endif
        solids = 0;
        for (const Section& section : column.sections) {
            solids += static_cast<int>(std::count_if(section.begin(), section.end(), [](Block b) { return b != Block::Air; }));
        }
        // [snippet replace-mesh]
        mesh = naiveMesh(column);
        // [/snippet replace-mesh]
#elif LAB_CHECKPOINT >= 5802
        mesh.clear();
        // [snippet stone-from-cell]
        appendCube(mesh, {7, 7, 7}, column.get(7, 7, 7));
        // [/snippet stone-from-cell]
#endif
        ++rebuilds;
        resetPose();
    }

    Scene() {
#if LAB_CHECKPOINT >= 5804
        preset = 2;
#elif LAB_CHECKPOINT >= 5803
        preset = 1;
#endif
        generate();
    }

    void draw(Frame& frame, const Atlas& atlas) const {
        frame.clear();
        Drawing drawing(frame, atlas, camera);
        drawing.depthTest = useDepth;
        drawSky(drawing);
        for (const Face& face : mesh) {
            drawing.drawFace(face);
        }
    }
};

#if LAB_CHECKPOINT >= 5805
// [snippet walk-step]
inline void travel(Scene& scene, double forward, double right, double up, double dt) {
    const Vec3 direction = walkDirection(scene.camera.yaw, forward, right);
    const double step = 4.5 * std::clamp(dt, 0.0, 0.05);
    scene.camera.eye = scene.camera.eye + direction * step;
    scene.camera.eye.y += up * step;
}
// [/snippet walk-step]
#endif
} // namespace trail
#endif
