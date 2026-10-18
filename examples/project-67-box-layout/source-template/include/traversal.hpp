#pragma once
#include "tree.hpp"
#include <functional>

namespace lab {
// WidgetView chỉ dùng trong một lần duyệt, không giữ qua mutation.
struct WidgetView {
    const Widget* node;
    Rect bounds;
    Rect clip;
    bool enabled;
    int depth;
};

inline std::optional<WidgetView> place(const Widget& node, Point origin, Rect clip, bool enabled, int depth) {
    if (!node.visible)
        return std::nullopt;
    enabled = enabled && node.enabled;
    const Rect bounds{origin.x + node.local.x, origin.y + node.local.y, node.local.width, node.local.height};
    clip = intersect(bounds, clip);
    if (clip.width <= 0 || clip.height <= 0)
        return std::nullopt;
    return WidgetView{&node, bounds, clip, enabled, depth};
}

inline void visit(const Widget& node, Point origin, Rect clip, bool enabled, int depth, const std::function<void(const WidgetView&)>& draw) {
    const auto placed = place(node, origin, clip, enabled, depth);
    if (!placed)
        return;
    draw(*placed);
    for (const auto& child : node.children) {
        visit(*child, {placed->bounds.x, placed->bounds.y}, placed->clip, placed->enabled, depth + 1, draw);
    }
}

inline std::vector<WidgetView> paintList(const Tree& tree) {
    std::vector<WidgetView> result;
    visit(*tree.root, {}, viewport, true, 0, [&result](const WidgetView& view) {
        result.push_back(view);
    });
    return result;
}

inline std::optional<WidgetView> locate(const Tree& tree, WidgetId id) {
    for (const WidgetView& view : paintList(tree)) {
        if (view.node->id == id)
            return view;
    }
    return std::nullopt;
}

inline WidgetId pick(const Widget& node, Point origin, Rect clip, bool enabled, int depth, Point point) {
    const auto placed = place(node, origin, clip, enabled, depth);
    if (!placed || !contains(placed->clip, point) || !contains(placed->bounds, point))
        return 0;
    // Con vẽ sau nằm trên: tìm ngược thứ tự paint, rồi mới xét parent.
    for (auto it = node.children.rbegin(); it != node.children.rend(); ++it) {
        const WidgetId hit = pick(**it, {placed->bounds.x, placed->bounds.y}, placed->clip, placed->enabled, depth + 1, point);
        if (hit != 0)
            return hit;
    }
    if (node.kind == Kind::Panel)
        return node.id;
    if (node.kind == Kind::Button || node.kind == Kind::Slider)
        return node.id;
    return 0;
}

inline WidgetId hitTest(const Tree& tree, Point point) {
    if (!contains(viewport, point))
        return 0;
    return pick(*tree.root, {}, viewport, true, 0, point);
}

inline std::vector<WidgetId> focusOrder(const Tree& tree) {
    std::vector<WidgetId> result;
    for (const WidgetView& view : paintList(tree)) {
        if (view.enabled && (view.node->kind == Kind::Button || view.node->kind == Kind::Slider))
            result.push_back(view.node->id);
    }
    return result;
}
} // namespace lab
