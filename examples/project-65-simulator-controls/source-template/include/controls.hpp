#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "geometry.hpp"
#include "simulation.hpp"

namespace lab {

// Chỉ ba control cố định; chưa có widget tree hoặc hệ thống layout.
enum class Control {
    None,
    Pause,
    Reset,
    Gravity
};

struct Ui {
    Control hot = Control::None;
    Control active = Control::None;
    Control focus = Control::None;
};

#if LAB_CHECKPOINT >= 2
constexpr Rect panel{664.0, 24.0, 272.0, 492.0};
constexpr Rect pauseButton{688.0, 80.0, 224.0, 44.0};
constexpr Rect resetButton{688.0, 140.0, 224.0, 44.0};
constexpr Rect gravitySlider{688.0, 232.0, 224.0, 40.0};
constexpr Rect scene{24.0, 24.0, 616.0, 492.0};

inline Control hitTest(Point point) {
    if (contains(pauseButton, point)) {
        return Control::Pause;
    }
    if (contains(resetButton, point)) {
        return Control::Reset;
    }
#if LAB_CHECKPOINT >= 4
    if (contains(gravitySlider, point)) {
        return Control::Gravity;
    }
#endif
    return Control::None;
}
#endif

#if LAB_CHECKPOINT >= 3
inline void cancelPointer(Ui& ui) {
    ui.active = Control::None;
    ui.hot = Control::None;
}

inline void activate(Model& model, Control control) {
    if (control == Control::Pause) {
        setPaused(model, !model.paused);
    }
    if (control == Control::Reset) {
        resetSimulation(model);
    }
}
#endif

#if LAB_CHECKPOINT >= 4
inline void dragGravity(Model& model, double x) {
    const double t = (x - gravitySlider.x) / gravitySlider.width;
    setGravity(model, t * 1200.0);
}
#endif

#if LAB_CHECKPOINT >= 3
inline bool pointerDown(Model& model, Ui& ui, Point point) {
    if (ui.active != Control::None) {
        return true;
    }

    ui.hot = hitTest(point);
    ui.active = ui.hot;
    ui.focus = ui.hot;
#if LAB_CHECKPOINT >= 4
    if (ui.active == Control::Gravity) {
        dragGravity(model, point.x);
    }
#else
    (void)model;
#endif
    // Cả khoảng trống trong panel cũng thuộc UI, không chuyển click cho cảnh.
    return contains(panel, point);
}

inline void pointerMove(Model& model, Ui& ui, Point point) {
    ui.hot = hitTest(point);
#if LAB_CHECKPOINT >= 4
    if (ui.active == Control::Gravity) {
        dragGravity(model, point.x);
    }
#else
    (void)model;
#endif
}

inline void pointerUp(Model& model, Ui& ui, Point point) {
    const Control pressed = ui.active;
#if LAB_CHECKPOINT >= 4
    // Event up có thể mang tọa độ mới dù motion cuối đã bị gộp hoặc bỏ qua.
    if (pressed == Control::Gravity) {
        dragGravity(model, point.x);
    }
#endif
    ui.active = Control::None;
    ui.hot = hitTest(point);

    // Một button chỉ chạy khi bắt đầu nhấn và kết thúc thả trên chính nó.
    if (pressed != Control::None && pressed == ui.hot) {
        activate(model, pressed);
    }
}
#endif

#if LAB_CHECKPOINT >= 5
enum class Key {
    Tab,
    Enter,
    Space,
    Left,
    Right,
    Home,
    End,
    Escape,
    Other
};

inline bool keyDown(Model& model, Ui& ui, Key key, bool shift, bool repeat) {
    if (key == Key::Escape) {
        cancelPointer(ui);
        return true;
    }
    if (key == Key::Tab) {
        if (repeat) {
            return true;
        }
        cancelPointer(ui);
        if (shift) {
            if (ui.focus == Control::Reset) {
                ui.focus = Control::Pause;
            } else if (ui.focus == Control::Gravity) {
                ui.focus = Control::Reset;
            } else {
                ui.focus = Control::Gravity;
            }
        } else {
            if (ui.focus == Control::Pause) {
                ui.focus = Control::Reset;
            } else if (ui.focus == Control::Reset) {
                ui.focus = Control::Gravity;
            } else {
                ui.focus = Control::Pause;
            }
        }
        return true;
    }
    if (ui.active != Control::None) {
        return true;
    }

    if (key == Key::Enter || key == Key::Space) {
        if (!repeat) {
            activate(model, ui.focus);
        }
        return ui.focus != Control::None;
    }
    if (ui.focus != Control::Gravity) {
        return false;
    }
    if (key == Key::Left) {
        setGravity(model, model.gravity - 20.0);
        return true;
    }
    if (key == Key::Right) {
        setGravity(model, model.gravity + 20.0);
        return true;
    }
    if (key == Key::Home) {
        setGravity(model, 0.0);
        return true;
    }
    if (key == Key::End) {
        setGravity(model, 1200.0);
        return true;
    }
    return false;
}
#endif

#if LAB_CHECKPOINT >= 6
inline void scenePointerDown(Model& model, Point point) {
    if (!contains(scene, point)) {
        return;
    }

    model.y = std::clamp(point.y, 48.0, floorY - ballRadius);
    model.velocity = 0.0;
    model.accumulator = 0.0;
    ++model.scenePresses;
    ++model.clockRevision;
}

inline void suspend(Model& model, Ui& ui) {
    // Blur/resize không được để lại một thao tác kéo đang dở.
    cancelPointer(ui);
    setPaused(model, true);
    model.accumulator = 0.0;
}
#endif

} // namespace lab
