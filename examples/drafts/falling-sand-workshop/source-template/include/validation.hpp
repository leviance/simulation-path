#pragma once

#include "presets.hpp"
#include "rules.hpp"

namespace sand {

struct Validation {
    bool conserved = true;
    bool wallsFixed = true;
    bool oneCellFall = false;
    bool closedBottom = false;
    bool oneCellWater = false;

    bool passed() const {
        return conserved && wallsFixed && oneCellFall && closedBottom && oneCellWater;
    }
};

#if LAB_CHECKPOINT >= 9
inline Validation validateScene() {
    Validation result;
    // Oracle nhỏ: biết trước chính xác nơi một ô cát phải đến.
    Grid single(5, 5);
    single.set(2, 1, Cell::Sand);
    stepGrid(single);
    result.oneCellFall = single.at(2, 1) == Cell::Empty && single.at(2, 2) == Cell::Sand;
    single = Grid(5, 5);
    single.set(2, 4, Cell::Sand);
    stepGrid(single);
    result.closedBottom = single.at(2, 4) == Cell::Sand;
    single = Grid(5, 5);
    single.set(1, 4, Cell::Water);
    stepGrid(single);
    result.oneCellWater = single.at(2, 4) == Cell::Water && countMaterials(single)[3] == 1;

    Grid grid = makeScene();
    const auto counts = countMaterials(grid);
    const auto initial = grid.cells;
    // Một fixture riêng, hữu hạn, không sửa scene người dùng hoặc tự mở benchmark.
    for (int tick = 0; tick < 120; ++tick) {
        stepGrid(grid);
        result.conserved = result.conserved && countMaterials(grid) == counts;
        for (std::size_t i = 0; i < initial.size(); ++i) {
            if (initial[i] == Cell::Wall && grid.cells[i] != Cell::Wall) {
                result.wallsFixed = false;
            }
        }
    }
    return result;
}
#endif

} // namespace sand
