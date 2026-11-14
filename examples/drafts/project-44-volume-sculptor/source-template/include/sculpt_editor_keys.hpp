#pragma once

#include "sculpt_grid.hpp"
#include <optional>

namespace sculpt {

struct EditorDigitAction {
    std::optional<int> samples;
    std::optional<Shape> preset;
};

// Keep F5 full rebuild and F6 inspection from lesson 09; resolution has its own modifier.
inline EditorDigitAction editorDigitAction(int digit, bool control) {
    EditorDigitAction action;
    if (control) {
        if (digit == 1)
            action.samples = 32;
        else if (digit == 2)
            action.samples = 64;
        else if (digit == 3)
            action.samples = 128;
        else if (digit == 4)
            action.samples = 192;
    } else {
        if (digit == 1)
            action.preset = Shape::sphere;
        else if (digit == 2)
            action.preset = Shape::separatedSpheres;
        else if (digit == 3)
            action.preset = Shape::torus;
    }
    return action;
}

} // namespace sculpt
