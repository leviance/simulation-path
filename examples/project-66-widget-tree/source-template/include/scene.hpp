#pragma once
#include "traversal.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 1
// Chỉ builder tạo node. Paint, hit-test và update vật lý không gọi builder.
struct BuiltTree {
    Tree tree;
    WidgetId group = 1;
    WidgetId pause = 0;
    WidgetId reset = 0;
    WidgetId slider = 0;
};

inline BuiltTree buildTree(int preset = 0) {
    if (preset < 0 || preset > 3)
        throw std::out_of_range("preset 0..3");
    BuiltTree built;
    Tree& tree = built.tree;
    if (preset == 3)
        tree.root->local.x = 520;
    add(tree, 1, Kind::Label, {24, 16, 224, 24}, "SIMULATOR");
#if LAB_CHECKPOINT >= 2
    int height = 300;
#if LAB_CHECKPOINT >= 3
    if (preset == 1)
        height = 96;
#endif
    built.group = add(tree, 1, Kind::Panel, {24, 56, 224, static_cast<double>(height)}, "Controls");
    built.pause = add(tree, built.group, Kind::Button, {0, 0, 224, 44}, "Pause / Resume", Action::Pause);
    built.reset = add(tree, built.group, Kind::Button, {0, 60, 224, 44}, "Reset scene", Action::Reset);
#else
    built.pause = add(tree, 1, Kind::Button, {24, 56, 224, 44}, "Pause / Resume", Action::Pause);
#endif
#if LAB_CHECKPOINT >= 5
    add(tree, built.group, Kind::Label, {0, 128, 224, 24}, "Gravity (px/s2)");
    built.slider = add(tree, built.group, Kind::Slider, {0, 152, 224, 40});
    add(tree, built.group, Kind::Label, {0, 204, 224, 24}, "", Action::None, Binding::Gravity);
    add(tree, 1, Kind::Label, {24, 390, 224, 24}, "", Action::None, Binding::Time);
#endif
#if LAB_CHECKPOINT >= 4
    if (preset == 2)
        add(tree, built.group, Kind::Button, {0, 0, 224, 44}, "Reset on top", Action::Reset);
#endif
    return built;
}

#if LAB_CHECKPOINT >= 2
inline void movePanel(Tree& tree, double dx, double dy) {
    if (!std::isfinite(dx) || !std::isfinite(dy))
        return;
    tree.root->local.x = std::clamp(tree.root->local.x + dx, 0.0, 688.0);
    tree.root->local.y = std::clamp(tree.root->local.y + dy, 0.0, 48.0);
    ++tree.revision;
}
#endif
#endif
} // namespace lab
