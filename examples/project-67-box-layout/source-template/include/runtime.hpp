#pragma once
#include "keyboard.hpp"

namespace lab {
// Cache theo hợp đồng setter: Model không tự làm dirty hình học của cây.
struct LayoutState {
    Scene scene = buildScene();
    double width = 320;
    int passes = 0;
    bool dirty = true;
    bool overflow = false;
    std::vector<WidgetId> extras;
#if LAB_CHECKPOINT >= 3
    Measures sizes;
#endif
};

inline void invalidate(LayoutState& state, Ui& ui) {
    state.dirty = true;
    cancel(ui);
}

inline bool ensureLayout(LayoutState& state, Ui& ui) {
#if LAB_CHECKPOINT >= 7
    if (!state.dirty)
        return false;
#endif
#if LAB_CHECKPOINT >= 3
    state.sizes.clear();
    measure(*state.scene.tree.root, state.width, state.scene.styles, state.sizes);
#if LAB_CHECKPOINT >= 4
    arrange(*state.scene.tree.root, 936 - state.width, 24, state.scene.styles, state.sizes);
#endif
    ++state.passes;
#endif
    state.dirty = false;
    reconcile(state.scene.tree, ui);
    return true;
}

#if LAB_CHECKPOINT >= 4
inline bool setSpacing(LayoutState& state, Ui& ui, double gap, double padding) {
    if (!std::isfinite(gap) || gap < 0 || gap > 32 || !std::isfinite(padding) || padding < 0 || padding > 48)
        return false;
    bool changed = false;
    for (const WidgetId id : {WidgetId{1}, state.scene.group}) {
        auto found = state.scene.styles.find(id);
        if (found == state.scene.styles.end())
            continue;
        BoxStyle& style = found->second;
        double targetPadding = padding;
        if (id != 1)
            targetPadding = std::max(0.0, padding - 4);
        if (style.gap == gap && style.padding.left == targetPadding && style.padding.top == targetPadding && style.padding.right == targetPadding && style.padding.bottom == targetPadding)
            continue;
        style.gap = gap;
        style.padding = {targetPadding, targetPadding, targetPadding, targetPadding};
        changed = true;
    }
    if (changed)
        invalidate(state, ui);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 6
inline void toggleReset(LayoutState& state, Ui& ui) {
    Widget* reset = find(*state.scene.tree.root, state.scene.reset);
    reset->visible = !reset->visible;
    invalidate(state, ui);
}

inline bool appendLabel(LayoutState& state, Ui& ui) {
    if (state.extras.size() >= 4)
        return false;
    const WidgetId id = add(state.scene.tree, state.scene.group, Kind::Label, {0, 0, 1, 24}, "Added Label");
    state.scene.styles[id] = defaultStyle(*find(*state.scene.tree.root, id));
    state.extras.push_back(id);
    invalidate(state, ui);
    return true;
}

inline bool removeLabel(LayoutState& state, Ui& ui) {
    if (state.extras.empty())
        return false;
    const WidgetId id = state.extras.back();
    auto& children = find(*state.scene.tree.root, state.scene.group)->children;
    const auto found = std::find_if(children.begin(), children.end(), [id](const auto& child) {
        return child->id == id;
    });
    if (found == children.end())
        throw std::runtime_error("extra Label is not owned by Group");
    children.erase(found);
    --state.scene.tree.count;
    ++state.scene.tree.revision;
    state.scene.styles.erase(id);
    state.extras.pop_back();
    invalidate(state, ui);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool setWidth(LayoutState& state, Ui& ui, double value) {
    if (!std::isfinite(value) || value < 220 || value > 420)
        return false;
    if (value != state.width) {
        state.width = value;
        invalidate(state, ui);
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 8
inline void setOverflow(LayoutState& state, Ui& ui, bool enabled) {
    if (state.overflow == enabled)
        return;
    BoxStyle& style = state.scene.styles.at(state.scene.slider);
    style.width = Width::Fill;
    if (enabled)
        style.width = Width::Fixed;
    style.fixedWidth = 320;
    state.overflow = enabled;
    invalidate(state, ui);
}
#endif
} // namespace lab
