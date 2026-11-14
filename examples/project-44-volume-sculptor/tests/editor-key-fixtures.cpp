#include "sculpt_editor_keys.hpp"
#include <iostream>

void testEditorDigitKeys() {
    using namespace sculpt;
    const std::array<int, 4> sizes{32, 64, 128, 192};
    const std::array<Shape, 3> shapes{Shape::sphere, Shape::separatedSpheres, Shape::torus};
    for (int digit = 1; digit <= 4; ++digit) {
        const auto action = editorDigitAction(digit, true);
        if (action.samples != sizes[digit - 1] || action.preset)
            throw std::runtime_error("Ctrl+digit changed the preset instead of resolution");
        const auto preset = editorDigitAction(digit, false);
        if (preset.samples || (digit <= 3 && preset.preset != shapes[digit - 1]) || (digit == 4 && preset.preset))
            throw std::runtime_error("Unmodified digit did not keep its reset-preset role");
    }
    for (int digit : {-1, 0, 5, 9, std::numeric_limits<int>::max()})
        for (bool control : {false, true}) {
            const auto action = editorDigitAction(digit, control);
            if (action.samples || action.preset)
                throw std::runtime_error("Non-mapped digit changed the scene");
        }
    std::cout << "EDITOR KEYS PASS ctrlResolution=4 plainPreset=3 noPlainFour=1 invalidNoop=10 noSdlWindow=1\n";
}
