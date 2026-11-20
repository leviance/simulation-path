#pragma once
#include "desk.hpp"

namespace tiny {
inline bool press(Desk& d, lab::Point p) {
    lab::ensureLayout(d.page.layout, d.ui);
    const bool consumed = lab::pointerDown(d.page.layout.scene.tree, d.model, d.ui, p);
#if LAB_CHECKPOINT >= 6804
    rangeAt(d, d.ui.active, p.x);
#endif
    return consumed;
}

inline void move(Desk& d, lab::Point p) {
    lab::pointerMove(d.page.layout.scene.tree, d.model, d.ui, p);
#if LAB_CHECKPOINT >= 6804
    rangeAt(d, d.ui.active, p.x);
#endif
}

inline void release(Desk& d, lab::Point p) {
#if LAB_CHECKPOINT >= 6804
    rangeAt(d, d.ui.active, p.x);
#endif
    lab::pointerUp(d.page.layout.scene.tree, d.model, d.ui, p);
}

inline bool key(Desk& d, lab::Key k, bool shift, bool repeat) {
#if LAB_CHECKPOINT >= 6804
    const auto it = d.page.elements.find(d.ui.focus);
    if (!d.ui.active && it != d.page.elements.end() && d.page.document.elements[it->second].range) {
        const auto r = *d.page.document.elements[it->second].range;
        double v = rangeValue(d, d.ui.focus);
        if (k == lab::Key::Right)
            v += r.step;
        else if (k == lab::Key::Left)
            v -= r.step;
        else if (k == lab::Key::Home)
            v = r.low;
        else if (k == lab::Key::End)
            v = r.high;
        else
            return lab::keyDown(d.page.layout.scene.tree, d.model, d.ui, k, shift, repeat);
        applyRange(d, d.ui.focus, v);
        return true;
    }
#endif
    return lab::keyDown(d.page.layout.scene.tree, d.model, d.ui, k, shift, repeat);
}
} // namespace tiny
