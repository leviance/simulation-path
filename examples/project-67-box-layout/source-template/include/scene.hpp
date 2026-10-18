#pragma once
#include "layout.hpp"
#include "traversal.hpp"

namespace lab {
struct Scene {
    Tree tree;
    WidgetId title = 0;
    WidgetId group = 0;
    WidgetId pause = 0;
    WidgetId reset = 0;
    WidgetId slider = 0;
    WidgetId footer = 0;
#if LAB_CHECKPOINT >= 2
    Styles styles;
#endif
};

#if LAB_CHECKPOINT >= 2
inline void initStyles(const Widget& node, Styles& styles) {
    styles[node.id] = defaultStyle(node);
    for (const auto& child : node.children)
        initStyles(*child, styles);
}
#endif

// Starter giữ nguyên cách đặt Rect thủ công của Project 66, trên một cây phẳng.
inline Scene buildScene() {
    Scene scene;
    Tree& tree = scene.tree;
    tree.root->local = {616, 24, 320, 492};
    scene.title = add(tree, 1, Kind::Label, {18, 18, 284, 24}, "SIMULATOR");
    WidgetId parent = 1;
#if LAB_CHECKPOINT >= 5
    scene.group = add(tree, 1, Kind::Panel, {22, 54, 276, 252}, "Controls");
    parent = scene.group;
#endif
    scene.pause = add(tree, parent, Kind::Button, {22, 58, 276, 36}, "Pause", Action::Pause);
    scene.reset = add(tree, parent, Kind::Button, {22, 108, 276, 36}, "Reset", Action::Reset);
    add(tree, parent, Kind::Label, {22, 158, 276, 24}, "Gravity");
    scene.slider = add(tree, parent, Kind::Slider, {22, 198, 276, 32}, "Gravity");
    add(tree, parent, Kind::Label, {22, 244, 276, 24}, "", Action::None, Binding::Gravity);
    scene.footer = add(tree, 1, Kind::Label, {18, 292, 284, 24}, "", Action::None, Binding::Time);
#if LAB_CHECKPOINT >= 2
    initStyles(*tree.root, scene.styles);
    BoxStyle& rootStyle = scene.styles.at(1);
    rootStyle.height = Height::Fixed;
    rootStyle.fixedHeight = 492;
    rootStyle.margin = {0, 0, 0, 0};
    rootStyle.padding = {16, 16, 16, 16};
    scene.styles.at(scene.title).margin = {0, 0, 0, 0};
    scene.styles.at(scene.footer).margin = {0, 0, 0, 0};
#endif
    return scene;
}
} // namespace lab
