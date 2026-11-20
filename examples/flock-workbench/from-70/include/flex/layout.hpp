#pragma once
#include "line.hpp"
#include "style/editor.hpp"

namespace tiny {
using FlexMap = std::map<lab::WidgetId, Options>;

inline Options options(const Computed& c) {
    Options o;
    for (const auto& [key, w] : c.winner) {
        const auto& v = w.declaration.value;
        if (key == "display")
            o.flex = v == "flex";
        if (key == "flex-direction" && v == "row")
            o.axis = Axis::Row;
        if (key == "justify-content") {
            if (v == "center")
                o.justify = Justify::Center;
            if (v == "end")
                o.justify = Justify::End;
            if (v == "space-between")
                o.justify = Justify::Between;
        }
        if (key == "align-items") {
            if (v == "start")
                o.align = Align::Start;
            if (v == "center")
                o.align = Align::Center;
            if (v == "end")
                o.align = Align::End;
        }
        if (key == "flex-grow")
            o.grow = number(v, v, 0);
        if (key == "flex-basis" && v != "auto")
            o.basis = pixels(v, v, 0, 0, 600);
    }
    if (!o.flex) {
        o.axis = Axis::Column;
        o.justify = Justify::Start;
        o.align = Align::Stretch;
    }
    return o;
}

inline lab::Size intrinsic(const lab::Widget& node, const lab::Styles& styles, const FlexMap& all, lab::Measures& memo) {
    const auto& box = styles.at(node.id);
    const auto& opt = all.at(node.id);
    double w = 84, h = box.fixedHeight;
    if (node.kind == lab::Kind::Panel) {
        double main = 0, cross = 0;
        int seen = 0;
        for (const auto& child : node.children) {
            if (!child->visible)
                continue;
            const auto size = intrinsic(*child, styles, all, memo);
            const auto m = styles.at(child->id).margin;
            double a = size.height, b = size.width;
            double along = m.top + m.bottom, across = m.left + m.right;
            if (opt.axis == Axis::Row) {
                a = size.width;
                b = size.height;
                along = m.left + m.right;
                across = m.top + m.bottom;
            }
            if (opt.flex && all.at(child->id).basis >= 0)
                a = all.at(child->id).basis;
            if (++seen > 1)
                main += box.gap;
            main += a + along;
            cross = std::max(cross, b + across);
        }
        double innerW = cross, innerH = main;
        if (opt.axis == Axis::Row) {
            innerW = main;
            innerH = cross;
        }
        w = innerW + 2 * box.border + box.padding.left + box.padding.right;
        if (box.height == lab::Height::Auto)
            h = innerH + 2 * box.border + box.padding.top + box.padding.bottom;
    }
    if (box.width == lab::Width::Fixed)
        w = box.fixedWidth;
    const lab::Size answer{w, h, h};
    memo[node.id] = answer;
    return answer;
}

// [snippet place-children]
inline void placeFlex(lab::Widget& parent, lab::Rect frame, const lab::Styles& styles, const FlexMap& all, const lab::Measures& sizes) {
    parent.local = frame;
    if (parent.kind != lab::Kind::Panel)
        return;
    const auto& box = styles.at(parent.id);
    const auto opt = all.at(parent.id);
    const auto inside = lab::contentBox({0, 0, frame.width, frame.height}, box);
    std::vector<Item> items;
    std::vector<lab::Widget*> children;
    for (auto& child : parent.children) {
        if (!child->visible)
            continue;
        children.push_back(child.get());
        const auto size = sizes.at(child->id);
        const auto pref = all.at(child->id);
        const auto& b = styles.at(child->id);
        Item item{size.height, size.width, 0, b.margin.top, b.margin.bottom, b.margin.left, b.margin.right, b.width == lab::Width::Fill};
        if (opt.axis == Axis::Row)
            item = {size.width, size.height, 0, b.margin.left, b.margin.right, b.margin.top, b.margin.bottom, b.height == lab::Height::Auto};
        if (opt.flex) {
            item.grow = pref.grow;
            if (pref.basis >= 0)
                item.basis = pref.basis;
        }
        items.push_back(item);
    }
    double length = inside.height, breadth = inside.width;
    if (opt.axis == Axis::Row) {
        length = inside.width;
        breadth = inside.height;
    }
    const auto rects = line(opt, length, breadth, box.gap, items);
    for (std::size_t i = 0; i < children.size(); ++i) {
        auto r = rects[i];
        r.x += inside.x;
        r.y += inside.y;
        placeFlex(*children[i], r, styles, all, sizes);
    }
}

// [/snippet place-children]

#if LAB_CHECKPOINT >= 7002
// [snippet reflow]
inline void reflow(Desk& d, const FlexMap& optionsById) {
    auto& state = d.page.layout;
    if (!state.dirty)
        return;
    if (optionsById.empty()) {
        lab::ensureLayout(state, d.ui);
        return;
    }
    auto& root = *state.scene.tree.root;
    state.sizes.clear();
    const auto size = intrinsic(root, state.scene.styles, optionsById, state.sizes);
    placeFlex(root, {936 - state.width, 24, state.width, size.height}, state.scene.styles, optionsById, state.sizes);
    ++state.passes;
    state.dirty = false;
    lab::reconcile(state.scene.tree, d.ui);
}

// [/snippet reflow]
#endif
} // namespace tiny
