#pragma once
#include "input.hpp"

namespace lab {
enum class Key {
    Other,
    Tab,
    Enter,
    Space,
    Left,
    Right,
    Home,
    End,
    Escape
};

// Duyệt focus theo cây, không viết danh sách Pause/Reset/Gravity cố định nữa.
inline bool keyDown(const Tree& tree, Model& model, Ui& ui, Key key, bool shift, bool repeat) {
    reconcile(tree, ui);
    if (key == Key::Escape) {
        cancel(ui);
        return true;
    }
    const auto order = focusOrder(tree);
    if (key == Key::Tab) {
        if (repeat)
            return true;
        cancel(ui);
        if (order.empty()) {
            ui.focus = 0;
            return false;
        }
        int index = -1;
        for (int i = 0; i < static_cast<int>(order.size()); ++i)
            if (order[i] == ui.focus)
                index = i;
        int next = index + 1;
        if (shift) {
            next = index - 1;
            if (index < 0)
                next = static_cast<int>(order.size()) - 1;
        }
        const int size = static_cast<int>(order.size());
        ui.focus = order[static_cast<std::size_t>((next + size) % size)];
        return true;
    }
    if (ui.active != 0)
        return true;
    if (key == Key::Enter || key == Key::Space) {
        if (!repeat)
            activate(tree, model, ui.focus);
        return ui.focus != 0;
    }
    const auto view = locate(tree, ui.focus);
    if (!view || view->node->kind != Kind::Slider)
        return false;
    if (key == Key::Left)
        setGravity(model, model.gravity - 20);
    else if (key == Key::Right)
        setGravity(model, model.gravity + 20);
    else if (key == Key::Home)
        setGravity(model, 0);
    else if (key == Key::End)
        setGravity(model, 1200);
    else
        return false;
    return true;
}
} // namespace lab
