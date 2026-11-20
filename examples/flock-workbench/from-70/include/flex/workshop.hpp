#pragma once
#include "layout.hpp"

namespace tiny {
struct FlexState {
    FlexMap values;
    bool axes = false;
    lab::WidgetId toolbar = 0;
};

inline void readOptions(Desk& d, const Palette& palette, FlexState& f) {
    FlexMap next;
    for (const auto& [id, c] : palette.computed)
        next[id] = options(c);
    if (next != f.values) {
        f.values = std::move(next);
        lab::invalidate(d.page.layout, d.ui);
    }
    const auto index = d.page.document.byId.find("tools");
    if (index != d.page.document.byId.end())
        f.toolbar = d.page.handles.at(index->second);
}

inline bool changeFlexSheet(Desk& d, Palette& palette, FlexState& f, const std::filesystem::path& file) {
    if (!reloadCss(d, palette, file))
        return false;
    readOptions(d, palette, f);
#if LAB_CHECKPOINT >= 7002
    reflow(d, f.values);
#else
    lab::ensureLayout(d.page.layout, d.ui);
#endif
    d.status = file.filename().string() + "   /   layout " + std::to_string(d.page.layout.passes);
    return true;
}

#if LAB_CHECKPOINT >= 7005
// [snippet remove-from-line]
inline bool toggleControl(Desk& d, const std::string& name) {
    auto found = d.page.document.byId.find(name);
    if (found == d.page.document.byId.end())
        return false;
    auto& tree = d.page.layout.scene.tree;
    auto* node = lab::find(*tree.root, d.page.handles.at(found->second));
    node->visible = !node->visible;
    lab::invalidate(d.page.layout, d.ui);
    return true;
}

// [/snippet remove-from-line]
#endif
} // namespace tiny
