#pragma once
#include "binding.hpp"

namespace tiny {
struct Gesture {
    double start = 0, last = 0;
    bool edited = false;
};

inline bool control(const lab::WidgetView& v) {
    return v.enabled && (v.node->kind == lab::Kind::Button || v.node->kind == lab::Kind::Slider);
}

#if LAB_CHECKPOINT >= 7103
// [snippet sample]
inline void sample(Desk& d, Bus& bus, Gesture& g, double x) {
    const auto id = d.ui.active;
    const auto v = lab::locate(d.page.layout.scene.tree, id);
    if (!v || !control(*v) || !d.page.values.contains(id))
        return;
    const auto& r = *d.page.document.elements.at(d.page.elements.at(id)).range;
    const double f = std::clamp((x - v->bounds.x) / v->bounds.width, 0.0, 1.0);
    const double proposed = snap(r, r.low + f * (r.high - r.low));
#if LAB_CHECKPOINT >= 7205
    // Script mới có thể diễn giải khác cùng một vị trí trỏ chuột.
    if (g.edited && proposed == g.last)
#else
    if (proposed == g.last)
#endif
        return;
    g.last = proposed;
    g.edited = true;
    dispatch(d, bus, {Topic::Input, id, 0, proposed});
}

// [/snippet sample]
#endif

inline bool begin(Desk& d, Bus& bus, Gesture& g, lab::Point p) {
    if (d.ui.active)
        return true;
    auto& tree = d.page.layout.scene.tree;
    d.ui.hot = lab::hitTest(tree, p);
    d.ui.focus = 0;
    const auto v = lab::locate(tree, d.ui.hot);
    if (v && control(*v)) {
        d.ui.focus = v->node->id;
        d.ui.active = d.ui.focus;
        g = {};
#if LAB_CHECKPOINT >= 7103
        if (d.page.values.contains(d.ui.active)) {
            g.start = rangeValue(d, d.ui.active);
            g.last = g.start;
            sample(d, bus, g, p.x);
        }
#endif
    }
    return d.ui.hot != 0;
}

inline void slide(Desk& d, Bus& bus, Gesture& g, lab::Point p) {
    lab::reconcile(d.page.layout.scene.tree, d.ui);
    d.ui.hot = lab::hitTest(d.page.layout.scene.tree, p);
#if LAB_CHECKPOINT >= 7103
    sample(d, bus, g, p.x);
#endif
}

// [snippet end-gesture]
inline void end(Desk& d, Bus& bus, Gesture& g, lab::Point p) {
    lab::reconcile(d.page.layout.scene.tree, d.ui);
    const auto owner = d.ui.active;
    if (!owner)
        return;
    slide(d, bus, g, p);
    d.ui.active = 0;
    if (d.page.values.contains(owner)) {
        if (g.edited && g.last != g.start)
            dispatch(d, bus, {Topic::Change, owner, 0, g.last});
    } else if (d.ui.hot == owner)
        dispatch(d, bus, {Topic::Click, owner});
    g = {};
}

// [/snippet end-gesture]

#if LAB_CHECKPOINT >= 7104
// [snippet keyboard-dispatch]
inline bool navigate(Desk& d, Bus& bus, lab::Key key, bool shift, bool repeat) {
    auto& tree = d.page.layout.scene.tree;
    if (key == lab::Key::Tab || key == lab::Key::Escape)
        return lab::keyDown(tree, d.model, d.ui, key, shift, repeat);
    if (d.ui.active)
        return true;
    const auto v = lab::locate(tree, d.ui.focus);
    if (!v || !control(*v))
        return false;
    if (v->node->kind == lab::Kind::Button && (key == lab::Key::Space || key == lab::Key::Enter)) {
        if (!repeat)
            dispatch(d, bus, {Topic::Click, d.ui.focus});
        return true;
    }
    if (!d.page.values.contains(d.ui.focus))
        return false;
    const auto& r = *d.page.document.elements.at(d.page.elements.at(d.ui.focus)).range;
    const double current = rangeValue(d, d.ui.focus);
    double proposal = current;
    if (key == lab::Key::Left)
        proposal -= r.step;
    else if (key == lab::Key::Right)
        proposal += r.step;
    else if (key == lab::Key::Home)
        proposal = r.low;
    else if (key == lab::Key::End)
        proposal = r.high;
    else
        return false;
    proposal = snap(r, proposal);
    if (proposal != current) {
        dispatch(d, bus, {Topic::Input, d.ui.focus, 0, proposal});
        dispatch(d, bus, {Topic::Change, d.ui.focus, 0, proposal});
    }
    return true;
}

// [/snippet keyboard-dispatch]
#endif
} // namespace tiny
