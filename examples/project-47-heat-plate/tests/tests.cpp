#include "diagnostics.hpp"
#include "timing.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <numbers>
#include <string_view>

int failures = 0;

void check(bool condition, std::string_view label) {
    // Không dùng assert: Release vẫn phải trả EXIT_FAILURE khi một điều kiện sai.
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(double actual, double expected, double tolerance = 1e-10) {
    return std::isfinite(actual) && std::abs(actual - expected) <= tolerance;
}

int main() {
    heat::Settings settings;
    heat::Field field(5, 5);
    check(!field.contains(5, 0) && field.index(2, 2) == 12, "bounds and row-major index");
    bool rejectedSize = false;
    try {
        heat::Field invalid(2, 5);
    } catch (const std::invalid_argument&) {
        rejectedSize = true;
    }
    check(rejectedSize, "invalid dimensions rejected");
    heat::paintDisk(field, 0, 0, 1, 1);
    check(near(heat::measure(field).sum, 3), "brush clips at corner");
    heat::paintStroke(field, 0, 3, 4, 3, 0, 1);
    for (int x = 0; x < 5; ++x) {
        check(field.current[field.index(x, 3)] == 1, "thin stroke connected");
    }

    // Một xung ở giữa có đáp án chính xác sau một bước với r=0.2.
    field = heat::Field(5, 5);
    field.current[field.index(2, 2)] = 1;
    check(heat::diffuse(field, settings), "stable pulse accepted");
    check(near(heat::sample(field, 2, 2), 0.2), "pulse center equals 0.2");
    check(near(heat::sample(field, 1, 2), 0.2) && near(heat::sample(field, 2, 1), 0.2), "four neighbors receive heat");
    check(near(heat::sample(field, 1, 1), 0), "diagonal not touched in one step");
    check(near(heat::measure(field).sum, 1), "pulse heat conserved");

    field = heat::Field(9, 7);
    std::fill(field.current.begin(), field.current.end(), 0.4);
    for (int step = 0; step < 20; ++step) {
        heat::diffuse(field, settings);
    }
    for (const double value : field.current) {
        check(near(value, 0.4), "uniform insulated field stays uniform");
    }

    // Eigenmode của lưới cell-centered cách nhiệt có hệ số suy giảm biết trước.
    field = heat::Field(8, 6);
    const double angle = std::numbers::pi / field.width;
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            field.current[field.index(x, y)] = 0.5 + 0.25 * std::cos(angle * (x + 0.5));
        }
    }
    const double gain = 1 - 4 * heat::ratioX(settings) * std::pow(std::sin(angle / 2), 2);
    for (int step = 0; step < 20; ++step) {
        heat::diffuse(field, settings);
    }
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const double expected = 0.5 + 0.25 * std::pow(gain, 20) * std::cos(angle * (x + 0.5));
            check(near(heat::sample(field, x, y), expected), "discrete cosine decay matches oracle");
        }
    }

    const auto before = field.current;
    const auto beforeTick = field.tick;
    settings.diffusivity = 12;
    check(!heat::diffuse(field, settings), "unstable r=0.4 rejected");
    check(field.current == before && field.tick == beforeTick, "rejected step is not partially written");
    settings.dt = 1.0 / 60.0;
    check(heat::stable(settings), "halving dt restores stability");
    settings.dx = std::numeric_limits<double>::quiet_NaN();
    check(!heat::stable(settings), "non-finite spacing rejected");
    settings = heat::Settings{};
    settings.dx = 0.5;
    check(!heat::stable(settings), "smaller grid spacing tightens the bound");
    settings.dx = 2;
    check(heat::stable(settings), "rectangular spacing uses rx plus ry");

    settings = heat::Settings{};
    heat::Field reference = heat::makeField();
    for (int step = 0; step < 60; ++step) {
        heat::diffuse(reference, settings);
    }
    for (const int fps : {15, 30, 120}) {
        field = heat::makeField();
        double accumulator = 0;
        for (int frame = 0; frame < fps * 2; ++frame) {
            const auto plan = heat::planSteps(accumulator, 1.0 / fps, settings.dt);
            accumulator = plan.remainder;
            for (int step = 0; step < plan.steps; ++step) {
                heat::diffuse(field, settings);
            }
        }
        check(field.tick == 60 && field.current == reference.current, "render FPS leaves solver trajectory unchanged");
    }
    const auto hitch = heat::planSteps(0, 10, 1.0 / 60.0);
    check(hitch.steps == 8 && hitch.dropped > 9.8, "stalled frame has finite work budget");
    check(hitch.remainder >= 0 && hitch.remainder < 1.0 / 60.0, "timing remainder stays bounded");

    const auto report = heat::validatePlate();
    check(report.conserved && report.bounded && report.coldEdges, "reference validators pass");
    std::cout << "Heat plate tests: " << failures << " failure(s)\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
