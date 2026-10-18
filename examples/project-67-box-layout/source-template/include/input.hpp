#pragma once
#include "scene.hpp"
#include "simulation.hpp"

namespace lab {
// ID 0 biểu diễn không có widget. Không lưu Widget* giữa hai sự kiện.
struct Ui {
    std::uint32_t hot = 0;
    std::uint32_t active = 0;
    std::uint32_t focus = 0;
};

inline void cancel(Ui& ui) {
    ui.active = 0;
    ui.hot = 0;
}

inline void activate(const Tree& tree, Model& model, WidgetId id) {
    const auto view = locate(tree, id);
    if (!view || !view->enabled || view->node->kind != Kind::Button)
        return;
    if (view->node->action == Action::Pause)
        setPaused(model, !model.paused);
    if (view->node->action == Action::Reset)
        resetSimulation(model);
}

inline void drag(const Tree& tree, Model& model, WidgetId id, double x) {
    const auto view = locate(tree, id);
    if (view && view->enabled && view->node->kind == Kind::Slider) {
        setGravity(model, (x - view->bounds.x) / view->bounds.width * 1200);
    }
}

inline void reconcile(const Tree& tree, Ui& ui) {
    // Kiểm cả visibility kế thừa: child vẫn tồn tại nhưng parent có thể đã ẩn.
    const auto valid = [&tree](WidgetId id) {
        const auto view = locate(tree, id);
        return view && view->enabled && (view->node->kind == Kind::Button || view->node->kind == Kind::Slider);
    };
    if (!valid(ui.active))
        ui.active = 0;
    if (!valid(ui.focus))
        ui.focus = 0;
    if (!locate(tree, ui.hot))
        ui.hot = 0;
}

inline bool pointerDown(const Tree& tree, Model& model, Ui& ui, Point point) {
    reconcile(tree, ui);
    if (ui.active != 0)
        return true;
    ui.hot = hitTest(tree, point);
    ui.focus = 0;
    const auto view = locate(tree, ui.hot);
    if (view && view->enabled && (view->node->kind == Kind::Button || view->node->kind == Kind::Slider)) {
        ui.active = view->node->id;
        ui.focus = ui.active;
        drag(tree, model, ui.active, point.x);
    }
    return ui.hot != 0;
}

inline void pointerMove(const Tree& tree, Model& model, Ui& ui, Point point) {
    reconcile(tree, ui);
    ui.hot = hitTest(tree, point);
    drag(tree, model, ui.active, point.x);
}

inline void pointerUp(const Tree& tree, Model& model, Ui& ui, Point point) {
    reconcile(tree, ui);
    const WidgetId active = ui.active;
    drag(tree, model, active, point.x);
    ui.active = 0;
    ui.hot = hitTest(tree, point);
    if (active != 0 && active == ui.hot)
        activate(tree, model, active);
}
} // namespace lab
