#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#if LAB_CHECKPOINT >= 7
#include "rules.hpp"

namespace sand {
struct Validation {
    bool conserved = true;
    bool deterministic = true;
    bool wallsFixed = true;
};

inline Validation validateScene() {
    Grid first = makeScene();
    Grid second = makeScene();
    const Grid initial = first;
    const auto before = countMaterials(first);
    Validation result;
    // Ca kiểm tra hữu hạn, không thay đổi hộp cát người dùng đang vẽ.
    for (int tick = 0; tick < 120; ++tick) {
        stepGrid(first);
        stepGrid(second);
        result.conserved = result.conserved && countMaterials(first) == before;
        result.deterministic = result.deterministic && first.cells == second.cells;
        for (std::size_t i = 0; i < first.cells.size(); ++i) {
            if (initial.cells[i] == Cell::Wall && first.cells[i] != Cell::Wall) {
                result.wallsFixed = false;
            }
        }
    }
    return result;
}
} // namespace sand
#endif
