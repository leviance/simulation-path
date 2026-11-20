#pragma once
#include "optical-bench.hpp"

namespace picking {
inline Color specimenColor(int id, int selected) {
    const Color pigments[]{{65, 89, 96}, {41, 169, 178}, {215, 137, 70}, {160, 126, 216}};
    const Color color = pigments[id];
    if (id == selected) {
        return colorBetween(color, {231, 235, 225}, 0.09);
    }
    return color;
}

#if LAB_CHECKPOINT >= 1
// [snippet draw-scene]
inline void drawScene(Raster& raster, const Scene& scene, int selected, bool debug) {
    // Vạch dài cách nhau một đơn vị. Tấm chia độ chỉ minh họa một phần
    // của mặt phẳng vô hạn; bóng và vạch khắc không phải vật để chọn.
    drawMat(raster, scene.plane, selected == 0);
    drawGraduations(raster, scene.plane, debug);
    drawContactShadows(raster, scene);

    // Ba mẫu lấy trực tiếp từ Scene. Vẽ được chúng ngay cả khi người học
    // chưa viết bất kỳ hàm nào để tìm giao điểm.
    drawSphereMesh(raster, scene.sphere, specimenColor(1, selected));
    drawBoxMesh(raster, scene.box, specimenColor(2, selected));
    drawTrianglePlate(raster, scene.triangle, specimenColor(3, selected));
}

// [/snippet draw-scene]
#endif
} // namespace picking
