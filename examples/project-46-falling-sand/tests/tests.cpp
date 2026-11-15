#include "benchmark.hpp"
#include "commands.hpp"
#include "layout.hpp"
#include "pixels.hpp"
#include "timing.hpp"
#include "validation.hpp"
#include <array>
#include <iostream>
#include <limits>
#include <set>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view description) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << description << '\n';
    }
}

// Oracle test dùng ID đi cùng vật liệu, không dùng moved mask theo tọa độ.
// Các fixture một bước bên dưới vẫn kiểm các kết quả cụ thể, không dựa vào oracle này.
struct ReferenceCell {
    sand::Cell material;
    int id;
};

void referenceStep(std::vector<ReferenceCell>& cells, int width, int height, std::uint32_t tick, sand::ScanOrder order) {
    using sand::Cell;
    std::set<int> movedIds;
    bool reverse = tick % 2U != 0;
    if (order == sand::ScanOrder::LeftToRight) {
        reverse = false;
    }
    if (order == sand::ScanOrder::RightToLeft) {
        reverse = true;
    }
    for (int row = 0; row < height; ++row) {
        int y = height - 1 - row;
        if (order == sand::ScanOrder::TopDown) {
            y = row;
        }
        for (int column = 0; column < width; ++column) {
            int x = column;
            if (reverse) {
                x = width - 1 - column;
            }
            const int sourceIndex = y * width + x;
            const ReferenceCell source = cells[static_cast<std::size_t>(sourceIndex)];
            if ((source.material != Cell::Sand && source.material != Cell::Water) || movedIds.contains(source.id)) {
                continue;
            }
            int direction = -1;
            if ((static_cast<std::uint32_t>(x + y) + tick) % 2U != 0) {
                direction = 1;
            }
            const std::array<std::array<int, 2>, 5> targets{{{x, y + 1}, {x + direction, y + 1}, {x - direction, y + 1}, {x + direction, y}, {x - direction, y}}};
            int targetCount = 3;
            if (source.material == Cell::Water) {
                targetCount = 5;
            }
            for (int target = 0; target < targetCount; ++target) {
                const int tx = targets[static_cast<std::size_t>(target)][0];
                const int ty = targets[static_cast<std::size_t>(target)][1];
                if (tx < 0 || ty < 0 || tx >= width || ty >= height) {
                    continue;
                }
                const int destinationIndex = ty * width + tx;
                const ReferenceCell destination = cells[static_cast<std::size_t>(destinationIndex)];
                const bool exchange = source.material == Cell::Sand && destination.material == Cell::Water && !movedIds.contains(destination.id);
                if (destination.material != Cell::Empty && !exchange) {
                    continue;
                }
                movedIds.insert(source.id);
                if (destination.material == Cell::Water) {
                    movedIds.insert(destination.id);
                }
                std::swap(cells[static_cast<std::size_t>(sourceIndex)], cells[static_cast<std::size_t>(destinationIndex)]);
                break;
            }
        }
    }
}

void testGridAndBrush() {
    using sand::Cell;
    sand::Grid grid(8, 6);
    check(grid.index(7, 5) == 47, "row-major last cell");
    check(grid.at(-1, 0) == Cell::Wall && grid.at(8, 0) == Cell::Wall, "closed outside boundary");
    grid.set(8, 0, Cell::Sand);
    check(grid.at(0, 1) == Cell::Empty, "invalid x does not alias next row");
    for (const int width : {-1, 0, 1025, std::numeric_limits<int>::max()}) {
        bool rejected = false;
        try {
            const sand::Grid invalid(width, 5);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "invalid dimensions rejected before allocation");
    }
    sand::paintDisk(grid, 0, 0, 1, Cell::Sand);
    check(sand::countMaterials(grid)[2] == 3, "corner brush clips to three cells");
    grid = sand::Grid(8, 6);
    sand::paintStroke(grid, 0, 2, 7, 2, 0, Cell::Wall);
    check(sand::countMaterials(grid)[1] == 8, "radius-zero line has no holes");
    sand::paintStroke(grid, 7, 2, 0, 2, 0, Cell::Empty);
    check(sand::countMaterials(grid)[1] == 0, "reverse erase covers the line");
    sand::paintStroke(grid, -1, 0, 7, 0, 1, Cell::Sand);
    check(sand::countMaterials(grid)[2] == 0, "outside endpoint does not bridge into the grid");
}

void testRules() {
    using sand::Cell;
    check(sand::validateScene().passed(), "independent one-step and 120-tick fixtures");
    sand::Grid grid(3, 3);
    for (int x = 0; x < 3; ++x) {
        grid.set(x, 2, Cell::Wall);
    }
    grid.set(0, 1, Cell::Wall);
    grid.set(2, 1, Cell::Wall);
    grid.set(1, 0, Cell::Sand);
    grid.set(1, 1, Cell::Water);
    const auto counts = sand::countMaterials(grid);
    const auto stats = sand::stepGrid(grid);
    check(grid.at(1, 0) == Cell::Water && grid.at(1, 1) == Cell::Sand, "sand exchanges with trapped water");
    check(sand::countMaterials(grid) == counts, "swap preserves all four counts");
    check(grid.moved[grid.index(1, 0)] == 1 && grid.moved[grid.index(1, 1)] == 1, "both participants are marked");
    check(stats.swaps == 1 && stats.visited == 9, "actual swaps and full-grid visits");
    grid = sand::Grid(3, 3);
    grid.set(1, 1, Cell::Wall);
    check(!sand::tryMove(grid, 1, 1, 1, 2), "tryMove never moves a wall");
    check(!sand::tryMove(grid, -1, 1, 0, 1), "invalid source is checked");
    check(!sand::tryMove(grid, 0, 1, 1, 1), "an empty source cannot move");
    // Cùng một fixture nhỏ sẽ dùng để đối chiếu Canvas sau khi port luật mới.
    grid = sand::Grid(8, 8);
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            const int value = (x * 17 + y * 31) % 11;
            if (value == 0) {
                grid.set(x, y, Cell::Sand);
            } else if (value == 1) {
                grid.set(x, y, Cell::Water);
            } else if (value == 2) {
                grid.set(x, y, Cell::Wall);
            }
        }
    }
    const sand::Grid mixed = grid;
    // Cùng các mốc parity trong tests TypeScript; oracle vẫn so từng ô ở từng tick.
    const std::array<std::uint32_t, 4> expectedChecksums{3694149450U, 380760090U, 1912800860U, 3694149450U};
    for (sand::ScanOrder order : {sand::ScanOrder::Alternating, sand::ScanOrder::LeftToRight, sand::ScanOrder::RightToLeft, sand::ScanOrder::TopDown}) {
        grid = mixed;
        grid.order = order;
        std::vector<ReferenceCell> reference;
        for (std::size_t index = 0; index < grid.cells.size(); ++index) {
            reference.push_back({grid.cells[index], static_cast<int>(index)});
        }
        for (int tick = 0; tick < 50; ++tick) {
            referenceStep(reference, grid.width, grid.height, grid.tick, order);
            sand::stepGrid(grid);
            for (std::size_t index = 0; index < grid.cells.size(); ++index) {
                check(grid.cells[index] == reference[index].material, "stamp model matches independent particle-ID oracle each tick");
            }
        }
        check(sand::checksum(grid) == expectedChecksums[static_cast<std::size_t>(order)], "native and Canvas parity fixture checksum");
        std::cout << "MIXED_FIXTURE order=" << static_cast<int>(order) << " checksum=" << sand::checksum(grid) << '\n';
    }
}

void testOrder() {
    using sand::Cell;
    sand::Grid left(3, 3);
    for (int x = 0; x < 3; ++x) {
        left.set(x, 2, Cell::Wall);
    }
    left.set(0, 1, Cell::Water);
    left.set(2, 1, Cell::Water);
    sand::Grid right = left;
    left.order = sand::ScanOrder::LeftToRight;
    right.order = sand::ScanOrder::RightToLeft;
    sand::stepGrid(left);
    sand::stepGrid(right);
    // Hai ô nước tranh cùng ô giữa: bên được duyệt trước chiếm được nó.
    check(left.at(0, 1) == Cell::Empty && left.at(1, 1) == Cell::Water, "left scan wins center from left");
    check(right.at(2, 1) == Cell::Empty && right.at(1, 1) == Cell::Water, "right scan wins center from right");
    check(left.cells != right.cells && sand::countMaterials(left) == sand::countMaterials(right), "order changes state, not counts");
    left = sand::Grid(3, 3);
    for (int x = 0; x < 3; ++x) {
        left.set(x, 2, Cell::Wall);
    }
    left.set(0, 0, Cell::Sand);
    left.set(1, 1, Cell::Water);
    right = left;
    right.order = sand::ScanOrder::TopDown;
    sand::stepGrid(left);
    sand::stepGrid(right);
    check(left.at(1, 1) == Cell::Sand && left.at(0, 1) == Cell::Water, "bottom-up sand can enter the vacancy left by water");
    check(right.at(0, 1) == Cell::Sand && right.at(2, 1) == Cell::Water, "top-down gives sand the lower cell first");

    left = sand::Grid(3, 4);
    for (int y = 0; y < 4; ++y) {
        left.set(0, y, Cell::Wall);
        left.set(2, y, Cell::Wall);
    }
    left.set(1, 0, Cell::Sand);
    left.set(1, 1, Cell::Sand);
    sand::stepGrid(left);
    check(left.at(1, 0) == Cell::Empty && left.at(1, 1) == Cell::Sand && left.at(1, 2) == Cell::Sand, "both grains descend once without reserving the vacancy");
}

void testTiming() {
    for (const int fps : {15, 30, 120}) {
        for (const double speed : {0.5, 1.0, 2.0}) {
            int ticks = 0;
            double accumulator = 0;
            for (int frame = 0; frame < fps * 2; ++frame) {
                const auto plan = sand::planSteps(accumulator, 1.0 / fps, speed);
                accumulator = plan.remainder;
                ticks += plan.steps;
                check(plan.dropped < 1e-10, "normal frame splits drop no time");
            }
            check(ticks == static_cast<int>(60 * speed), "fixed tick count respects time and speed");
        }
    }
    const auto hitch = sand::planSteps(0, 10, 4);
    check(hitch.steps == 4 && hitch.dropped > 39, "large hitch has a finite work budget");
    check(hitch.remainder >= 0 && hitch.remainder < sand::kTickSeconds, "remainder stays in a single tick");
    const auto invalid = sand::planSteps(-1, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity());
    check(invalid.steps == 0, "invalid elapsed cannot create work");
}

void testPixelsAndLayout() {
    sand::Grid grid(3, 2);
    grid.set(1, 0, sand::Cell::Sand);
    grid.set(2, 1, sand::Cell::Water);
    std::array<std::uint8_t, 32> memory;
    memory.fill(0xcd);
    sand::writeRgbaRow(grid, 0, memory.data(), true);
    sand::writeRgbaRow(grid, 1, memory.data() + 16, true);
    check(memory[4] == 229 && memory[5] == 192 && memory[6] == 123 && memory[7] == 255, "RGBA channel byte order");
    check(memory[24] == 65 && memory[25] == 157 && memory[26] == 220, "second row starts at pitch, not row bytes");
    check(memory[12] == 0xcd && memory[15] == 0xcd && memory[28] == 0xcd && memory[31] == 0xcd, "row padding canaries remain unchanged");
    int x = -1;
    int y = -1;
    const auto view = sand::sceneRect(grid);
    check(sand::logicalCell(grid, view.x, view.y, x, y) && x == 0 && y == 0, "viewport origin maps to first cell");
    check(!sand::logicalCell(grid, view.x - 1, view.y, x, y), "letterbox does not clamp into scene");
    check(!sand::logicalCell(grid, view.x + view.width, view.y, x, y), "right edge is exclusive");
    check(!sand::logicalCell(grid, std::numeric_limits<float>::quiet_NaN(), 0, x, y), "non-finite pointer rejected");
    check(sand::logicalCell(grid, 2.5F, 1.5F, x, y, true) && x == 2 && y == 1, "clean presentation uses grid coordinates");
}

void testScaleAndReset() {
    sand::Grid initial = sand::makeWorkshopScene(3, 46);
    check(initial.width == 512 && initial.height == 320 && initial.cells.size() == 163840, "required final grid is real");
    const auto counts = sand::countMaterials(initial);
    sand::Grid grid = initial;
    for (int tick = 0; tick < 120; ++tick) {
        const auto stats = sand::stepGrid(grid);
        check(stats.visited == 163840, "every large-grid tick visits the full grid");
        check(sand::countMaterials(grid) == counts, "large-grid counts are conserved each tick");
        for (std::size_t i = 0; i < initial.cells.size(); ++i) {
            if (initial.cells[i] == sand::Cell::Wall) {
                check(grid.cells[i] == sand::Cell::Wall, "large-grid walls never move");
            }
        }
    }
    check(sand::checksum(grid) == 524100528U, "512x320 mixture matches the documented native and Canvas state after 120 ticks");
    sand::Workshop state;
    state.preset = 3;
    state.seed = 46;
    state.paused = false;
    state.accumulator = 0.02;
    state.drawing = true;
    sand::resetScene(grid, state, false);
    check(grid.tick == 0 && grid.cells == initial.cells, "reset restores the actual same-seed scene");
    check(state.paused && !state.drawing && state.accumulator == 0, "reset drops time debt and held brush");
    sand::resetScene(grid, state, true);
    check(sand::countMaterials(grid)[0] == 163840 && state.preset == 3, "clear empties grid but keeps reset preset");
    check(sand::makeWorkshopScene(3, 47).cells != initial.cells, "different seed really changes mixture input");
}

void testCommandsAndOptions() {
    sand::Grid grid = sand::makeWorkshopScene(3, 46);
    sand::Workshop state;
    state.preset = 3;
    const auto original = grid.cells;
    sand::applyAction(sand::Action::Run, grid, state);
    check(!state.paused && state.accumulator == 0, "run starts with no time debt");
    state.drawing = true;
    sand::applyAction(sand::Action::Step, grid, state);
    check(state.paused && state.singleStep && !state.drawing, "single step pauses and releases held input");
    sand::applyAction(sand::Action::Speed, grid, state);
    check(state.speed() == 2 && state.accumulator == 0, "speed button changes speed without advancing grid");
    check(grid.cells == original && grid.tick == 0, "commands have not simulated a hidden step");
    sand::applyAction(sand::Action::Order, grid, state);
    check(grid.order == sand::ScanOrder::LeftToRight && state.paused, "order control selects its actual rule");
    state.updateMs = 42;
    sand::applyAction(sand::Action::Seed, grid, state);
    check(state.seed == 47 && grid.cells != original && grid.tick == 0, "seed button regenerates actual mixture");
    check(state.updateMs == 0 && state.stats.visited == 0, "new scene does not display old update timings or visits");
    sand::applyAction(sand::Action::Clear, grid, state);
    check(sand::countMaterials(grid)[0] == grid.cells.size(), "clear button empties all materials");
    sand::applyAction(sand::Action::Reset, grid, state);
    check(grid.cells == sand::makeWorkshopScene(3, 47).cells, "reset button keeps new selected seed");
    for (int count = 0; count < 100; ++count) {
        sand::applyAction(sand::Action::RadiusMore, grid, state);
    }
    check(state.radius == 24, "brush radius has a finite maximum");

    auto parse = [](std::vector<std::string> tokens) {
        tokens.insert(tokens.begin(), "p46");
        std::vector<char*> pointers;
        for (std::string& token : tokens) {
            pointers.push_back(token.data());
        }
        return sand::parseOptions(static_cast<int>(pointers.size()), pointers.data());
    };
    const auto valid = parse({"--seed", "4294967295", "--hidden", "--seconds", "0.2"});
    check(valid.seed == UINT32_MAX && valid.hidden, "maximum uint32 seed and finite hidden run parse");
    for (const auto& tokens : std::vector<std::vector<std::string>>{{"--hidden"}, {"--seconds", "nan"}, {"--seconds", "-1"}, {"--seconds", "2oops"}, {"--seed", "4294967296"}, {"--seed", "-1"}, {"--preset", "5"}, {"--order", "4"}, {"--benchmark", "--steps", "600", "--repeats", "15"}, {"--unknown"}, {"--seed"}}) {
        bool rejected = false;
        try {
            static_cast<void>(parse(tokens));
        } catch (const std::logic_error&) {
            rejected = true;
        }
        check(rejected, "malformed or unbounded CLI request is rejected");
    }
}

} // namespace

int main() {
    testGridAndBrush();
    testRules();
    testOrder();
    testTiming();
    testPixelsAndLayout();
    testScaleAndReset();
    testCommandsAndOptions();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "P46 CPU checks passed; includes 512x320 x120 ticks and explicit order fixtures\n";
    return EXIT_SUCCESS;
}
