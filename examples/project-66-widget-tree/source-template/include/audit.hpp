#pragma once
#include "mutation.hpp"
#include <set>

namespace lab {
#if LAB_CHECKPOINT >= 8
// Audit không gọi add/buildTree để tự tạo đáp án cho cây đang kiểm.
inline void checkNode(const Widget& node, int depth, const Tree& tree, std::set<WidgetId>& ids, int& count) {
    ++count;
    if (count > maxWidgets || depth > maxDepth || node.id == 0 || node.id >= tree.nextId || !ids.insert(node.id).second || !validRect(node.local) || (node.kind != Kind::Panel && !node.children.empty())) {
        throw std::runtime_error("invalid widget tree");
    }
    for (const auto& child : node.children) {
        if (!child)
            throw std::runtime_error("null child");
        checkNode(*child, depth + 1, tree, ids, count);
    }
}

inline int audit(const Tree& tree, const Ui& ui) {
    if (!tree.root || tree.root->kind != Kind::Panel || tree.nextId > maxId + 1)
        throw std::runtime_error("invalid root");
    std::set<WidgetId> ids;
    int count = 0;
    checkNode(*tree.root, 0, tree, ids, count);
    if (count != tree.count)
        throw std::runtime_error("invalid tree count");
    Ui repaired = ui;
    reconcile(tree, repaired);
    if (repaired.hot != ui.hot || repaired.active != ui.active || repaired.focus != ui.focus)
        throw std::runtime_error("stale widget id");
    return count;
}
#endif
} // namespace lab
