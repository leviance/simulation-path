#pragma once
// Đổi camera chỉ tính lại culling. Filter không bao giờ gọi resetCamera.
#include "io/csv.hpp"
#include "statistics.hpp"
#include "view/camera.hpp"
#include <sstream>

namespace survey {
struct Scene {
    std::vector<Point> points;
    Octree tree;
    Camera camera{};
    Region region{};
    Result selected{};
    Result visible{};
    Statistics summary{};
    bool culling = true;
    bool debug{};
    bool useTree = true;
    bool selectionEnabled{};
    bool filtered{};
    double renderMilliseconds{};
    std::size_t drawn{};
    std::string origin = "provided points";
    std::string notice = "Dataset ready. Drag to orbit; H for help.";

    explicit Scene(std::vector<Point> input)
        : points(std::move(input)), tree(points) {
        resetCamera(camera, tree.nodes[0].bounds);
    }
};

// [snippet:refreshSelection]
inline void refreshSelection(Scene& scene) {
    scene.selected = Result{};
#if LAB_CHECKPOINT >= 3
    if (scene.selectionEnabled) {
        if (scene.useTree) {
            scene.selected = scene.tree.query(scene.points, scene.region);
        } else {
            scene.selected = brute(scene.points, scene.region);
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    scene.summary = statistics(scene.points, scene.selected.indices);
#endif
}

// [/snippet:refreshSelection]

// [snippet:refreshVisible]
inline void refreshVisible(Scene& scene, int width, int height) {
    Region frustum = cameraFrustum(scene.camera, double(width) / double(height));
    frustum.minimumHeight = scene.region.minimumHeight;
    frustum.maximumHeight = scene.region.maximumHeight;
#if LAB_CHECKPOINT >= 6
    if (scene.culling) {
        scene.visible = scene.tree.query(scene.points, frustum);
        return;
    }
#endif
    // Chế độ đối chiếu vẫn clip từng point đúng frustum; chỉ không prune node.
    scene.visible = brute(scene.points, frustum);
}

// [/snippet:refreshVisible]

// [snippet:defaultCloud]
inline std::vector<Point> defaultCloud(bool uniform = false) {
#if LAB_CHECKPOINT >= 1
    // Cùng parser cho preset và CSV từ file, không có đường tắt bỏ validation.
    std::ostringstream text;
    writeCsv(text, makeRoom(100000, 30, uniform));
    std::istringstream input(text.str());
    return readCsv(input);
#else
    static_cast<void>(uniform);
    return {};
#endif
}

// [/snippet:defaultCloud]
} // namespace survey
