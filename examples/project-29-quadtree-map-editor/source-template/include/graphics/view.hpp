#pragma once
// Vẽ đủ các ID giao viewport; lớp debug không thay đổi dữ liệu hay kết quả query.
#include "editor/scene.hpp"
#include "framebuffer.hpp"

namespace maplab {
inline constexpr double boardLeft = 70;
inline constexpr double boardTop = 80;

inline Point worldToBoard(Point point, const Scene& scene) {
    auto screen = worldToScreen(point, scene.camera, scene.size);
    screen.x += boardLeft;
    screen.y += boardTop;
    return screen;
}

inline Point boardToScreen(Point point) {
    return {point.x - boardLeft, point.y - boardTop};
}

inline bool insideBoard(Point point, const Scene& scene) {
    const auto screen = boardToScreen(point);
    return screen.x >= 0 && screen.x < scene.size.x && screen.y >= 0 && screen.y < scene.size.y;
}

inline void paintBox(Framebuffer& image, const Scene& scene, const Box& box, std::uint32_t color, bool filled = true) {
    if (!intersects(box, viewport(scene.camera, scene.size))) {
        return;
    }
    const auto a = worldToBoard({box.x, box.y}, scene);
    const auto b = worldToBoard({right(box), bottom(box)}, scene);
    if (!filled) {
        drawLine(image, a.x, a.y, b.x, a.y, color);
        drawLine(image, b.x, a.y, b.x, b.y, color);
        drawLine(image, b.x, b.y, a.x, b.y, color);
        drawLine(image, a.x, b.y, a.x, a.y, color);
        return;
    }
    // Clip double trước khi đổi sang int; không rasterize cả một world box xa camera.
    const int left = static_cast<int>(std::floor(std::clamp(a.x, 0.0, Framebuffer::width - 1.0)));
    const int top = static_cast<int>(std::floor(std::clamp(a.y, 0.0, Framebuffer::height - 1.0)));
    const int endX = static_cast<int>(std::ceil(std::clamp(b.x, 0.0, Framebuffer::width - 1.0)));
    const int endY = static_cast<int>(std::ceil(std::clamp(b.y, 0.0, Framebuffer::height - 1.0)));
    rectangle(image, left, top, endX, endY, color, true);
}

// [snippet:drawObject]
inline void drawObject(Framebuffer& image, const Scene& scene, const Object& object, bool selected, Point offset = {}, bool valid = true) {
#if LAB_CHECKPOINT >= 1
    const Box box = translate(object.box, offset);
    std::uint32_t color = 0xe6ba73ff;
    if (object.kind == Kind::Tree) {
        color = 0x53b887ff;
    } else if (object.kind == Kind::Park) {
        color = 0x315c53ff;
    }
    paintBox(image, scene, box, color);
    if (box.width * scene.camera.zoom >= 6 && box.height * scene.camera.zoom >= 6) {
        if (object.kind == Kind::House) {
            const auto left = worldToBoard({box.x, box.y + box.height * 0.36}, scene);
            const auto tip = worldToBoard({box.x + box.width / 2, box.y}, scene);
            const auto end = worldToBoard({right(box), box.y + box.height * 0.36}, scene);
            drawLine(image, left.x, left.y, tip.x, tip.y, 0xad7b62ff);
            drawLine(image, tip.x, tip.y, end.x, end.y, 0xad7b62ff);
            paintBox(image, scene, {box.x + box.width * 0.25, box.y + box.height * 0.55, box.width * 0.2, box.height * 0.3}, 0x4d5261ff);
        } else if (object.kind == Kind::Tree) {
            paintBox(image, scene, {box.x + box.width * 0.44, box.y + box.height * 0.45, box.width * 0.12, box.height * 0.5}, 0x52725aff);
        } else {
            const auto a = worldToBoard({box.x, box.y + box.height / 2}, scene);
            const auto b = worldToBoard({right(box), box.y + box.height / 2}, scene);
            drawLine(image, a.x, a.y, b.x, b.y, 0x82b3a2ff);
        }
    }
    if (selected) {
        std::uint32_t outline = 0xf4ca64ff;
        if (!valid) {
            outline = 0xff7b72ff;
        }
        paintBox(image, scene, box, outline, false);
    }
#else
    static_cast<void>(image);
    static_cast<void>(scene);
    static_cast<void>(object);
    static_cast<void>(selected);
    static_cast<void>(offset);
    static_cast<void>(valid);
#endif
}

// [/snippet:drawObject]

inline void drawScene(Framebuffer& image, Scene& scene) {
    image.clear();
    const Box view = viewport(scene.camera, scene.size);
    paintBox(image, scene, scene.document.tree.config.root, 0x18232bff);
    const auto& root = scene.document.tree.config.root;
    double spacing = 64;
    if (scene.camera.zoom < 0.1) {
        spacing = 512;
    }
    for (double x = std::ceil(std::max(root.x, view.x) / spacing) * spacing; x <= std::min(right(root), right(view)); x += spacing) {
        const auto a = worldToBoard({x, std::max(root.y, view.y)}, scene);
        const auto b = worldToBoard({x, std::min(bottom(root), bottom(view))}, scene);
        drawLine(image, a.x, a.y, b.x, b.y, 0x34404bff);
    }
    for (double y = std::ceil(std::max(root.y, view.y) / spacing) * spacing; y <= std::min(bottom(root), bottom(view)); y += spacing) {
        const auto a = worldToBoard({std::max(root.x, view.x), y}, scene);
        const auto b = worldToBoard({std::min(right(root), right(view)), y}, scene);
        drawLine(image, a.x, a.y, b.x, b.y, 0x34404bff);
    }
    bool moving = false;
#if LAB_CHECKPOINT >= 8
    if (scene.gesture && scene.gesture->tool == Tool::Move) {
        moving = true;
    }
#endif
    scene.drawn = 0;
    for (std::uint32_t id : scene.visible.ids) {
        if (moving && scene.document.selection.contains(id)) {
            continue;
        }
        drawObject(image, scene, scene.document.tree.objects.at(id), scene.document.selection.contains(id));
        ++scene.drawn;
    }
#if LAB_CHECKPOINT >= 8
    if (moving && scene.preview && scene.gesture) {
        bool valid = true;
        if (scene.gesture->bounds) {
            valid = contains(root, translate(*scene.gesture->bounds, scene.gesture->offset));
        }
        for (std::uint32_t id : scene.preview->ids) {
            drawObject(image, scene, scene.document.tree.objects.at(id), true, scene.gesture->offset, valid);
            ++scene.drawn;
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (scene.debug) {
        const Query* trace = &scene.visible;
        if (scene.document.lastQuery) {
            trace = &*scene.document.lastQuery;
        }
        const std::unordered_set<int> visited(trace->visited.begin(), trace->visited.end());
        const std::unordered_set<int> pruned(trace->pruned.begin(), trace->pruned.end());
        std::size_t boxes = 0;
        for (std::size_t index = 0; index < scene.document.tree.nodes.size() && boxes < 4096; ++index) {
            const auto& node = scene.document.tree.nodes[index];
            if (!intersects(node.box, view)) {
                continue;
            }
            std::uint32_t color = 0x344561ff;
            if (visited.contains(static_cast<int>(index))) {
                color = 0x6be89bff;
            }
            if (pruned.contains(static_cast<int>(index))) {
                color = 0xff7b72ff;
            }
            paintBox(image, scene, node.box, color, false);
            ++boxes;
        }
    }
#endif
    if (scene.gesture && scene.gesture->tool == Tool::Select) {
        paintBox(image, scene, normalize(scene.gesture->startWorld, scene.gesture->currentWorld), 0x82b8ffff, false);
    }
    // SDL labels nằm ngoài viewport; không để preview/debug vẽ đè lên chúng.
    rectangle(image, 0, 0, Framebuffer::width - 1, 79, kBackground, true);
    rectangle(image, 0, 681, Framebuffer::width - 1, Framebuffer::height - 1, kBackground, true);
    rectangle(image, 0, 80, 69, 680, kBackground, true);
    rectangle(image, 1031, 80, Framebuffer::width - 1, 680, kBackground, true);
}
} // namespace maplab
