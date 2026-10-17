#pragma once
#include "keyboard.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 7
// Xóa unique_ptr gốc của nhánh sẽ hủy cả các descendant trong nhánh đó.
inline int subtreeSize(const Widget& node) {
    int size = 1;
    for (const auto& child : node.children)
        size += subtreeSize(*child);
    return size;
}

inline bool eraseChild(Widget& parent, WidgetId id, Tree& tree) {
    for (auto it = parent.children.begin(); it != parent.children.end(); ++it) {
        if ((*it)->id == id) {
            tree.count -= subtreeSize(**it);
            parent.children.erase(it);
            ++tree.revision;
            return true;
        }
        if (eraseChild(**it, id, tree))
            return true;
    }
    return false;
}

inline bool removeSubtree(Tree& tree, WidgetId id, Ui& ui) {
    if (id == tree.root->id)
        return false;
    const bool removed = eraseChild(*tree.root, id, tree);
    reconcile(tree, ui);
    return removed;
}

inline void setVisible(Tree& tree, WidgetId id, bool visible, Ui& ui) {
    Widget* node = find(*tree.root, id);
    if (node) {
        node->visible = visible;
        ++tree.revision;
    }
    reconcile(tree, ui);
}

inline void setEnabled(Tree& tree, WidgetId id, bool enabled, Ui& ui) {
    Widget* node = find(*tree.root, id);
    if (node) {
        node->enabled = enabled;
        ++tree.revision;
    }
    reconcile(tree, ui);
}
#endif
} // namespace lab
