#pragma once
#include "document.hpp"
#include "runtime.hpp"

namespace tiny {
struct Page {
    lab::LayoutState layout;
    Document document;
    std::vector<lab::WidgetId> handles;
    std::map<lab::WidgetId, std::size_t> elements;
    std::map<lab::WidgetId, double> values;
};

#if LAB_CHECKPOINT >= 6804
inline lab::Kind kindOf(const Element& e) {
    if (e.tag == "div")
        return lab::Kind::Panel;
    if (e.tag == "button")
        return lab::Kind::Button;
#if LAB_CHECKPOINT >= 7100
    if (e.tag == "input" && !e.range)
        return lab::Kind::Button;
#endif
    if (e.tag == "input")
        return lab::Kind::Slider;
    return lab::Kind::Label;
}

// [snippet attach]
inline Page build(Document document, double width) {
    Page p;
    auto& state = p.layout;
    state.scene = lab::Scene{};
    state.width = width;
    p.document = std::move(document);
    for (std::size_t i = 0; i < p.document.elements.size(); ++i) {
        const auto& e = p.document.elements[i];
        lab::WidgetId id = state.scene.tree.root->id;
        if (e.parent >= 0) {
            const auto parent = p.handles.at(static_cast<std::size_t>(e.parent));
            id = lab::add(state.scene.tree, parent, kindOf(e), {0, 0, 1, 1}, e.text);
        }
        p.handles.push_back(id);
        p.elements.emplace(id, i);
        if (e.range)
            p.values[id] = e.range->value;
    }
    lab::initStyles(*state.scene.tree.root, state.scene.styles);
    auto& root = state.scene.styles.at(1);
    root.height = lab::Height::Fixed;
    root.fixedHeight = 492;
    root.margin = {};
    root.padding = {14, 14, 14, 14};
    root.gap = 5;
    for (const auto id : p.handles) {
        if (id == 1)
            continue;
        auto& style = state.scene.styles.at(id);
        style.margin = {3, 2, 3, 2};
        if (style.height == lab::Height::Auto) {
            style.padding = {7, 7, 7, 7};
            style.gap = 3;
        }
    }
    return p;
}

// [/snippet attach]

inline double snap(const Range& range, double value) {
    if (value >= range.high)
        return range.high;
    const double steps = std::round((value - range.low) / range.step);
    return std::clamp(range.low + steps * range.step, range.low, range.high);
}
#endif
} // namespace tiny
