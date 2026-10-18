#pragma once
#include "runtime.hpp"
#include <set>

namespace lab {
// Audit chỉ đọc state; không arrange lại để che một cache đang sai.
#if LAB_CHECKPOINT >= 9
inline void checkLayoutNode(const Widget& node, const LayoutState& state, std::set<WidgetId>& ids, int depth) {
    if (depth > maxDepth || ids.size() >= std::size_t(maxWidgets) || node.id == 0 || node.id >= state.scene.tree.nextId || !ids.insert(node.id).second || (node.kind != Kind::Panel && !node.children.empty()) || !state.scene.styles.contains(node.id) || !validStyle(state.scene.styles.at(node.id), node))
        throw std::runtime_error("invalid layout tree");
    for (const double value : {node.local.x, node.local.y, node.local.width, node.local.height}) {
        if (!std::isfinite(value))
            throw std::runtime_error("non-finite layout");
    }
    if (node.local.width < 0 || node.local.height < 0)
        throw std::runtime_error("negative layout size");
    for (const auto& child : node.children) {
        if (!child)
            throw std::runtime_error("null child");
        checkLayoutNode(*child, state, ids, depth + 1);
    }
}

inline int auditLayout(const LayoutState& state) {
    if (state.dirty)
        throw std::runtime_error("layout is dirty");
    std::set<WidgetId> ids;
    checkLayoutNode(*state.scene.tree.root, state, ids, 0);
    if (ids.size() != state.scene.styles.size() || int(ids.size()) != state.scene.tree.count)
        throw std::runtime_error("ownership/style mismatch");
    return int(paintList(state.scene.tree).size());
}
#endif
} // namespace lab
