#pragma once
#include "geometry.hpp"
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace lab {
#if LAB_CHECKPOINT >= 1
using WidgetId = std::uint32_t;
inline constexpr int maxWidgets = 32;
inline constexpr int maxDepth = 6;
inline constexpr WidgetId maxId = 1000000;
enum class Kind {
    Panel,
    Button,
    Slider,
    Label
};
enum class Action {
    None,
    Pause,
    Reset
};
enum class Binding {
    None,
    Gravity,
    Time
};

// Parent sở hữu child. Ui chỉ giữ ID, không giữ con trỏ có thể bị delete.
struct Widget {
    WidgetId id = 0;
    Kind kind = Kind::Panel;
    Rect local;
    std::string text;
    Action action = Action::None;
    Binding binding = Binding::None;
#if LAB_CHECKPOINT >= 7
    bool visible = true;
    bool enabled = true;
#endif
    std::vector<std::unique_ptr<Widget>> children;
};

struct Tree {
    std::unique_ptr<Widget> root = std::make_unique<Widget>();
    WidgetId nextId = 2;
    int count = 1;
    int revision = 0;

    Tree() {
        root->id = 1;
        root->local = {664, 24, 272, 492};
        root->text = "Panel";
    }
};

inline Widget* find(Widget& node, WidgetId id) {
    if (node.id == id)
        return &node;
    for (const auto& child : node.children) {
        Widget* result = find(*child, id);
        if (result)
            return result;
    }
    return nullptr;
}

inline int depthOf(const Widget& node, WidgetId id, int depth = 0) {
    if (node.id == id)
        return depth;
    for (const auto& child : node.children) {
        const int result = depthOf(*child, id, depth + 1);
        if (result >= 0)
            return result;
    }
    return -1;
}

inline WidgetId add(Tree& tree, WidgetId parentId, Kind kind, Rect local, const std::string& text = "", Action action = Action::None, Binding binding = Binding::None) {
    Widget* parent = find(*tree.root, parentId);
    if (!parent || parent->kind != Kind::Panel || tree.count >= maxWidgets || tree.nextId > maxId || depthOf(*tree.root, parentId) >= maxDepth || !validRect(local) || text.size() > 40) {
        throw std::out_of_range("widget parent, geometry or capacity");
    }

    auto child = std::make_unique<Widget>();
    child->id = tree.nextId;
    child->kind = kind;
    child->local = local;
    child->text = text;
    child->action = action;
    child->binding = binding;
    const WidgetId id = child->id;
    parent->children.push_back(std::move(child));
    ++tree.nextId;
    ++tree.count;
    ++tree.revision;
    return id;
}
#endif
} // namespace lab
