#include "grid.hpp"
#include "rules.hpp"
#include "timing.hpp"
#include "validation.hpp"
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

sand::Grid mixedFixture() {
    sand::Grid grid(8, 8);
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            const int value = (x * 17 + y * 31) % 11;
            if (value == 0) {
                grid.set(x, y, sand::Cell::Sand);
            }
            if (value == 1) {
                grid.set(x, y, sand::Cell::Water);
            }
            if (value == 2) {
                grid.set(x, y, sand::Cell::Wall);
            }
        }
    }
    return grid;
}
} // namespace

int main() {
    using sand::Cell;
    // Bounds và row-major phải đúng trước khi kiểm tra chuyển động.
    sand::Grid grid(8, 8);
    check(grid.index(7, 7) == 63, "last cell row-major index");
    check(grid.at(-1, 0) == Cell::Wall, "outside is blocked");
    grid.set(8, 0, Cell::Sand);
    check(grid.at(0, 1) == Cell::Empty, "x == width cannot alias the next row");
    bool invalidRejected = false;
    try {
        const sand::Grid invalid(0, 8);
    } catch (const std::invalid_argument&) {
        invalidRejected = true;
    }
    check(invalidRejected, "reject invalid grid size");

    // Brush có thể chạm biên, nhưng không được ghi ra ngoài vector.
    sand::paintDisk(grid, 0, 0, 1, Cell::Sand);
    check(sand::countMaterials(grid)[2] == 3, "corner disk is clipped");
    grid = sand::Grid(8, 8);
    sand::paintStroke(grid, 0, 2, 7, 2, 0, Cell::Wall);
    check(sand::countMaterials(grid)[1] == 8, "horizontal stroke has no gaps");
    sand::paintStroke(grid, 7, 2, 0, 2, 0, Cell::Empty);
    check(sand::countMaterials(grid)[1] == 0, "reverse stroke erases all samples");

    grid = sand::Grid(8, 8);
    grid.set(4, 0, Cell::Sand);
    sand::stepGrid(grid);
    check(grid.at(4, 1) == Cell::Sand && grid.at(4, 0) == Cell::Empty, "sand falls exactly one cell");
    check(sand::countMaterials(grid)[2] == 1, "fall neither duplicates nor destroys sand");
    grid = sand::Grid(8, 8);
    grid.set(4, 7, Cell::Sand);
    sand::stepGrid(grid);
    check(grid.at(4, 7) == Cell::Sand, "closed bottom retains sand");
    grid = sand::Grid(8, 8);
    grid.set(4, 3, Cell::Sand);
    grid.set(4, 4, Cell::Wall);
    sand::stepGrid(grid);
    check(grid.at(5, 4) == Cell::Sand, "odd parity chooses right diagonal first");
    check(grid.at(4, 4) == Cell::Wall, "obstacle stays in place");

    // Chặn mọi đích rơi để cô lập chuyển động ngang của nước.
    grid = sand::Grid(8, 8);
    for (int x = 0; x < 8; ++x) {
        grid.set(x, 4, Cell::Wall);
    }
    grid.set(2, 3, Cell::Water);
    sand::stepGrid(grid);
    check(grid.at(3, 3) == Cell::Water, "water moves one horizontal cell, not a full row");
    check(grid.moved[grid.index(2, 3)] == 1 && grid.moved[grid.index(3, 3)] == 1, "both swap endpoints are marked");

    // Một hạt nước bị vây để cát phía trên có thể đổi chỗ với nó.
    grid = sand::Grid(3, 3);
    for (int x = 0; x < 3; ++x) {
        grid.set(x, 2, Cell::Wall);
    }
    grid.set(0, 1, Cell::Wall);
    grid.set(2, 1, Cell::Wall);
    grid.set(1, 0, Cell::Sand);
    grid.set(1, 1, Cell::Water);
    const auto beforeSwap = sand::countMaterials(grid);
    sand::stepGrid(grid);
    check(grid.at(1, 0) == Cell::Water && grid.at(1, 1) == Cell::Sand, "sand sinks by swap");
    check(sand::countMaterials(grid) == beforeSwap, "swap preserves each material count");

    const auto result = sand::validateScene();
    check(result.conserved, "120 ticks preserve material counts");
    check(result.deterministic, "120 ticks are repeatable");
    check(result.wallsFixed, "120 ticks keep wall positions");
    sand::Grid mixed = mixedFixture();
    const auto initialCounts = sand::countMaterials(mixed);
    for (int tick = 0; tick < 50; ++tick) {
        sand::stepGrid(mixed);
        check(sand::countMaterials(mixed) == initialCounts, "mixed fixture conserves every tick");
    }
    std::cout << "mixed fixture checksum: " << sand::checksum(mixed) << '\n';
    check(sand::checksum(mixed) == 2882136376U, "shared C++ and Canvas 50-tick fixture");

    // Cùng 2 giây, không có input: mọi chuỗi frame dưới budget phải cho cùng grid.
    sand::Grid reference = sand::makeScene();
    for (int tick = 0; tick < 60; ++tick) {
        sand::stepGrid(reference);
    }
    for (const int fps : {15, 30, 120}) {
        double accumulator = 0;
        sand::Grid timed = sand::makeScene();
        for (int frame = 0; frame < 2 * fps; ++frame) {
            const auto plan = sand::planSteps(accumulator, 1.0 / fps);
            accumulator = plan.remainder;
            check(plan.dropped < 1e-12, "normal frame does not drop time");
            for (int step = 0; step < plan.steps; ++step) {
                sand::stepGrid(timed);
            }
        }
        check(timed.tick == 60 && timed.cells == reference.cells, "frame splits preserve 60-tick result");
    }
    const auto hitch = sand::planSteps(0, 10);
    check(hitch.steps == 4 && hitch.dropped > 9.8, "large stall is bounded and reported");
    check(hitch.remainder >= 0 && hitch.remainder < sand::kTickSeconds, "bounded remainder");
    const auto invalidTime = sand::planSteps(-1, std::numeric_limits<double>::quiet_NaN());
    check(invalidTime.steps == 0, "invalid time cannot start work");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 46: all checks passed\n";
    return EXIT_SUCCESS;
}
