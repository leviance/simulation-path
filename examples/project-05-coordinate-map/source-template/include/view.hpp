#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 4
// Lặp bằng số bước nhỏ, không cộng dồn số thực cho tới khi mất chính xác.
inline void drawGrid(Framebuffer& image, const Camera2D& camera) {
    const Vec2 bottomLeft = camera.screenToWorld({0.0, static_cast<double>(image.height)});
    const Vec2 topRight = camera.screenToWorld({static_cast<double>(image.width), 0.0});
    const double spacing = gridSpacing(camera.scale());
    const double firstX = std::ceil(bottomLeft.x / spacing) * spacing;
    const double firstY = std::ceil(bottomLeft.y / spacing) * spacing;
    const int columns = static_cast<int>(std::ceil((topRight.x - bottomLeft.x) / spacing)) + 1;
    const int rows = static_cast<int>(std::ceil((topRight.y - bottomLeft.y) / spacing)) + 1;
    for (int index = 0; index < columns; ++index) {
        const double worldX = firstX + index * spacing;
        const int x = static_cast<int>(std::lround(camera.worldToScreen({worldX, 0.0}).x));
        vertical(image, x, kGrid);
    }
    for (int index = 0; index < rows; ++index) {
        const double worldY = firstY + index * spacing;
        const int y = static_cast<int>(std::lround(camera.worldToScreen({0.0, worldY}).y));
        horizontal(image, y, kGrid);
    }
}

#endif
// Dựng lại từ world state; resize và camera không viết lại vị trí của điểm.
inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
#if LAB_CHECKPOINT >= 4
    drawGrid(image, scene.camera);
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
    const Vec2 origin = scene.camera.worldToScreen({0.0, 0.0});
#else
    const Vec2 origin{image.width * 0.5, image.height * 0.5};
#endif
    // Kiểm tra trong vùng nhìn trước khi đổi double sang int.
    if (origin.y >= 0.0 && origin.y < image.height) {
        horizontal(image, static_cast<int>(std::lround(origin.y)), kAxisX);
    }
    if (origin.x >= 0.0 && origin.x < image.width) {
        vertical(image, static_cast<int>(std::lround(origin.x)), kAxisY);
    }
    for (std::size_t index = 0; index < scene.points.size(); ++index) {
        const Vec2 world = scene.points[index];
#if LAB_CHECKPOINT >= 2
        const Vec2 markerScreen = scene.camera.worldToScreen(world);
#else
        const Vec2 markerScreen{
            origin.x + world.x * scene.camera.pixelsPerUnit,
            origin.y - world.y * scene.camera.pixelsPerUnit,
        };
#endif
        if (markerScreen.x < -10.0 || markerScreen.x > image.width + 10.0 || markerScreen.y < -10.0 || markerScreen.y > image.height + 10.0) {
            continue;
        }
        const int x = static_cast<int>(std::lround(markerScreen.x));
        const int y = static_cast<int>(std::lround(markerScreen.y));
#if LAB_CHECKPOINT >= 6
        if (static_cast<int>(index) == scene.selected) {
            disc(image, x, y, 9, kSelected);
        }
#endif
        disc(image, x, y, 6, kPoint);
    }
#endif
}
} // namespace lab
