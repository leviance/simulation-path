#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "geometry.hpp"
#include "simulation.hpp"
#include <array>

namespace lab {
enum class Control { None, Pause, Reset, Observe, Radius, Separation };

struct Ui {
    Control hot = Control::None;
    Control active = Control::None;
    Control focus = Control::None;
};

#if LAB_CHECKPOINT >= 2
constexpr Rect panel{656, 22, 282, 496};
constexpr Rect scene{24, 88, 608, 380};
constexpr Rect pauseButton{676, 100, 112, 40};
constexpr Rect resetButton{800, 100, 118, 40};
constexpr Rect observeBox{676, 165, 242, 36};
constexpr Rect radiusSlider{676, 250, 242, 30};
constexpr Rect separationSlider{676, 338, 242, 30};
constexpr std::array<Control, 5> order{Control::Pause, Control::Reset, Control::Observe, Control::Radius, Control::Separation};

inline Rect bounds(Control control) {
    switch (control) {
        case Control::Pause: return pauseButton;
        case Control::Reset: return resetButton;
        case Control::Observe: return observeBox;
        case Control::Radius: return radiusSlider;
        case Control::Separation: return separationSlider;
        default: return {};
    }
}

// [snippet shared-hit]
inline Control hitTest(Point point) {
    for (const auto control : order) {
#if LAB_CHECKPOINT < 4
        if (control == Control::Radius || control == Control::Separation)
            continue;
#endif
        if (contains(bounds(control), point))
            return control;
    }
    return Control::None;
}
// [/snippet shared-hit]
#endif

#if LAB_CHECKPOINT >= 3
inline void cancelPointer(Ui& ui) {
    ui.active = Control::None;
    ui.hot = Control::None;
}

inline void activate(Model& model, Control control) {
    if (control == Control::Pause)
        setPaused(model, !model.paused);
    if (control == Control::Reset)
        resetSimulation(model);
    if (control == Control::Observe)
        model.colony.showNeighbors = !model.colony.showNeighbors;
}
#endif

#if LAB_CHECKPOINT >= 4
// [snippet slider-model]
inline void setSlider(Model& model, Control control, double t) {
    if (!std::isfinite(t)) return;
    const double fraction = std::clamp(t, 0.0, 1.0);
    if (control == Control::Radius)
        model.colony.params.radius = std::lerp(20.0, 140.0, fraction);
    if (control == Control::Separation)
        model.colony.params.separationWeight = std::lerp(0.0, 5.0, fraction);
}

inline void dragSlider(Model& model, Control control, double x) {
    const Rect track = bounds(control);
    setSlider(model, control, (x - track.x) / track.width);
}
// [/snippet slider-model]
inline bool isSlider(Control c) {
    return c == Control::Radius || c == Control::Separation;
}
#endif

#if LAB_CHECKPOINT >= 3
inline bool pointerDown(Model& model, Ui& ui, Point point) {
    if (ui.active != Control::None)
        return true;
    ui.hot = hitTest(point);
    ui.active = ui.hot;
    ui.focus = ui.hot;
#if LAB_CHECKPOINT >= 4
    if (isSlider(ui.active))
        dragSlider(model, ui.active, point.x);
#else
    (void)model;
#endif
    return contains(panel, point);
}

inline void pointerMove(Model& model, Ui& ui, Point point) {
    ui.hot = hitTest(point);
#if LAB_CHECKPOINT >= 4
    if (isSlider(ui.active))
        dragSlider(model, ui.active, point.x);
#else
    (void)model;
#endif
}

// [snippet release-once]
inline void pointerUp(Model& model, Ui& ui, Point point) {
    const Control pressed = ui.active;
    ui.active = Control::None;
    ui.hot = hitTest(point);
#if LAB_CHECKPOINT >= 4
    if (isSlider(pressed))
        dragSlider(model, pressed, point.x);
#endif
    if (pressed != Control::None && pressed == ui.hot)
        activate(model, pressed);
}
// [/snippet release-once]
#endif

#if LAB_CHECKPOINT >= 5
enum class Key { Tab, Enter, Space, Left, Right, Home, End, Escape, Other };

// [snippet focus-order]
inline void nextFocus(Ui& ui, bool backwards) {
    const auto it = std::find(order.begin(), order.end(), ui.focus);
    if (it == order.end()) {
        ui.focus = order.front();
        if (backwards) ui.focus = order.back();
        return;
    }
    const int count = int(order.size());
    int step = 1;
    if (backwards) step = -1;
    ui.focus = order[(int(it - order.begin()) + count + step) % count];
}
// [/snippet focus-order]
inline bool keyDown(Model& model, Ui& ui, Key key, bool shift, bool repeat) {
    if (key == Key::Escape) {
        cancelPointer(ui);
        return true;
    }
    if (key == Key::Tab) {
        if (!repeat) {
            cancelPointer(ui);
            nextFocus(ui, shift);
        }
        return true;
    }
    if (ui.active != Control::None) return true;
    if (ui.focus == Control::None) return false;
    // [snippet key-action]
    if (key == Key::Space || key == Key::Enter) {
        if (!isSlider(ui.focus) && !repeat) activate(model, ui.focus);
        return true;
    }
    // [/snippet key-action]
    if (!isSlider(ui.focus)) return false;
    double t = (model.colony.params.radius - 20) / 120;
    if (ui.focus == Control::Separation) t = model.colony.params.separationWeight / 5;
    if (key == Key::Left) t -= 0.05;
    else if (key == Key::Right) t += 0.05;
    else if (key == Key::Home) t = 0;
    else if (key == Key::End) t = 1;
    else return false;
    setSlider(model, ui.focus, t);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 6
// [snippet pick-bird]
inline void scenePointerDown(Model& model, Point point) {
    if (!contains(scene, point)) return;
    const double x = (point.x - scene.x) * model.colony.params.width / scene.width;
    const double y = (point.y - scene.y) * model.colony.params.height / scene.height;
    model.colony.selectAt({x, y});
    ++model.scenePresses;
}
// [/snippet pick-bird]
inline void suspend(Model& model, Ui& ui) {
    cancelPointer(ui);
    setPaused(model, true);
}
#endif
} // namespace lab
