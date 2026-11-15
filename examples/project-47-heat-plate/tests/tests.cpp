#include "brush.hpp"
#include "commands.hpp"
#include "diffusion.hpp"
#include "layout.hpp"
#include "metrics.hpp"
#include "options.hpp"
#include "pixels.hpp"
#include "presets.hpp"
#include "reference.hpp"
#include "timing.hpp"
#include "validation.hpp"
#include <array>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view description) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << description << '\n';
    }
}

bool near(double actual, double expected, double absoluteTolerance) {
    return std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= absoluteTolerance;
}

// Oracle theo từng cạnh: cộng cùng một thông lượng với hai dấu ngược nhau.
// Không dùng sample/stability/diffuse hoặc Laplacian của implementation.
std::vector<double> edgeReference(const heat::Field& field, const heat::Settings& settings) {
    std::vector<double> next = field.current;
    const double rx = settings.diffusivity * settings.dt / (settings.dx * settings.dx);
    const double ry = settings.diffusivity * settings.dt / (settings.dy * settings.dy);
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const std::size_t first = static_cast<std::size_t>(y * field.width + x);
            if (x + 1 < field.width) {
                const std::size_t second = first + 1;
                const double transfer = rx * (field.current[second] - field.current[first]);
                next[first] += transfer;
                next[second] -= transfer;
            }
            if (y + 1 < field.height) {
                const std::size_t second = first + static_cast<std::size_t>(field.width);
                const double transfer = ry * (field.current[second] - field.current[first]);
                next[first] += transfer;
                next[second] -= transfer;
            }
        }
    }
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const std::size_t index = static_cast<std::size_t>(y * field.width + x);
            if (settings.boundary == heat::Boundary::ColdRim && (x == 0 || y == 0 || x + 1 == field.width || y + 1 == field.height)) {
                next[index] = 0;
            } else if (field.pins[index] != heat::Pin::None) {
                next[index] = static_cast<double>(field.pins[index]);
            }
        }
    }
    return next;
}

void testStorageAndBrush() {
    heat::Field field(8, 6);
    heat::Settings settings;
    check(field.index(7, 5) == 47, "row-major last index");
    check(!field.contains(8, 0) && !field.contains(-1, 0), "coordinate bounds prevent row aliasing");
    for (int width : {-1, 0, 513, std::numeric_limits<int>::max()}) {
        bool rejected = false;
        try {
            const heat::Field invalid(width, 8);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "invalid dimensions rejected before allocation");
    }
    heat::paintDisk(field, settings, 0, 0, 1, 1);
    check(heat::measure(field, settings).sum == 3, "corner radius-one brush touches three cells");
    field = heat::Field(8, 6);
    heat::paintStroke(field, settings, 0, 2, 7, 2, 0, 1);
    check(heat::measure(field, settings).sum == 8, "radius-zero interpolation has no holes");
    heat::paintStroke(field, settings, 7, 2, 0, 2, 0, 0);
    check(heat::measure(field, settings).sum == 0, "reverse cold stroke covers the same cells");
    heat::paintStroke(field, settings, -1, 0, 7, 0, 3, 1);
    check(heat::measure(field, settings).sum == 0, "invalid endpoint never bridges into the plate");
    heat::paintDisk(field, settings, 3, 3, 0, 1, heat::BrushMode::Heater);
    check(field.pins[field.index(3, 3)] == heat::Pin::Hot, "heater writes its actual mask");
    heat::paintDisk(field, settings, 3, 3, 0, 0, heat::BrushMode::EraseHeater);
    check(field.pins[field.index(3, 3)] == heat::Pin::None && field.current[field.index(3, 3)] == 1, "erase heater removes forcing, not stored temperature");
    settings.boundary = heat::Boundary::ColdRim;
    heat::paintDisk(field, settings, 0, 0, 2, 1, heat::BrushMode::Heater);
    check(field.current[0] == 0 && field.pins[0] == heat::Pin::None, "cold rim cannot be overwritten by the brush or heater");
}

void testKnownUpdatesAndOracle() {
    heat::Settings settings;
    settings.diffusivity = 0.2;
    settings.dt = 1;
    settings.dx = 1;
    settings.dy = 1;
    heat::Field field(5, 5);
    field.current[field.index(2, 2)] = 1;
    const auto initial = field.current;
    const auto result = heat::diffuse(field, settings);
    check(result.advanced && result.visited == 25 && field.tick == 1 && field.time == 1, "one accepted tick visits the complete field");
    check(near(field.current[field.index(2, 2)], 0.2, 1e-14), "2D impulse center is 0.2");
    check(near(field.current[field.index(1, 2)], 0.2, 1e-14) && near(field.current[field.index(2, 1)], 0.2, 1e-14), "2D impulse neighbors are 0.2");
    check(field.current[field.index(1, 1)] == 0, "stencil does not spread diagonally in one tick");
    check(field.next == initial, "double buffer retains the previous time level after swap");

    settings.diffusivity = 0.7;
    settings.dt = 0.03;
    settings.dx = 0.4;
    settings.dy = 0.8;
    for (heat::Boundary boundary : {heat::Boundary::Insulated, heat::Boundary::ColdRim}) {
        field = heat::Field(9, 7);
        settings.boundary = boundary;
        for (std::size_t index = 0; index < field.current.size(); ++index) {
            field.current[index] = static_cast<double>((index * 17 + 3) % 23) / 23;
        }
        heat::applyBoundary(field, settings);
        for (int tick = 0; tick < 20; ++tick) {
            const auto expected = edgeReference(field, settings);
            check(heat::diffuse(field, settings).advanced, "non-square-spacing oracle update accepted");
            for (std::size_t index = 0; index < expected.size(); ++index) {
                check(near(field.current[index], expected[index], 2e-14), "stencil matches independent paired-edge flux reference");
            }
        }
    }
}

void testInvariantsAndSources() {
    heat::Settings settings;
    heat::Field field = heat::makeField(heat::Preset::Uniform, 32);
    const auto constant = field.current;
    heat::diffuse(field, settings);
    check(field.current == constant, "insulated constant field is unchanged exactly");
    field = heat::makeField(heat::Preset::Hotspot, 192);
    const double initialIntegral = heat::measure(field, settings).integral;
    double maximumIntegralError = 0;
    double maximumSymmetryError = 0;
    for (int tick = 0; tick < 120; ++tick) {
        const auto before = heat::measure(field, settings);
        const auto result = heat::diffuse(field, settings);
        const auto after = heat::measure(field, settings);
        check(result.advanced && result.visited == 36864, "192x192 final performs every cell update");
        maximumIntegralError = std::max(maximumIntegralError, std::abs(after.integral - initialIntegral));
        check(after.minimum >= before.minimum - 1e-14 && after.maximum <= before.maximum + 1e-14, "stable closed system obeys the maximum principle");
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                maximumSymmetryError = std::max(maximumSymmetryError, std::abs(field.current[field.index(x, y)] - field.current[field.index(field.width - 1 - x, y)]));
            }
        }
    }
    const double integralTolerance = 1e-9 + std::abs(initialIntegral) * 1e-12;
    check(maximumIntegralError <= integralTolerance, "closed unforced integral respects its absolute-plus-relative tolerance");
    check(maximumSymmetryError <= 1e-12, "symmetric initial source retains reflection symmetry");
    std::cout << "LARGE_FIELD cells=36864 ticks=120 integral_error=" << maximumIntegralError << " tolerance=" << integralTolerance << " symmetry_error=" << maximumSymmetryError << '\n';

    settings.boundary = heat::Boundary::ColdRim;
    field = heat::makeField(heat::Preset::Uniform, 32);
    heat::applyBoundary(field, settings);
    const double beforeSink = heat::measure(field, settings).integral;
    for (int tick = 0; tick < 30; ++tick) {
        heat::diffuse(field, settings);
    }
    check(heat::measure(field, settings).integral < beforeSink, "cold rim is a sink, not a conserved closed system");
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            if (field.edge(x, y)) {
                check(field.current[field.index(x, y)] == 0, "all cold-rim cells remain zero");
            }
        }
    }
    settings.boundary = heat::Boundary::Insulated;
    settings.diffusivity = 0.2;
    settings.dt = 1;
    settings.dx = 1;
    settings.dy = 1;
    field = heat::Field(5, 5);
    heat::paintDisk(field, settings, 2, 2, 0, 1, heat::BrushMode::Heater);
    const double beforeSource = heat::measure(field, settings).integral;
    const auto sourceStep = heat::diffuse(field, settings);
    check(field.current[field.index(2, 2)] == 1, "thermostat is enforced after diffusion");
    check(near(sourceStep.sourceChange, 0.8, 1e-14), "heater reports normalized temperature-area supplied, not Joule");
    check(near(heat::measure(field, settings).integral - beforeSource, sourceStep.sourceChange, 2e-14), "closed-domain integral change matches forcing contribution");
}

void testSafetyAndInstability() {
    heat::Settings settings;
    const auto standard = heat::stability(settings);
    check(near(standard.rx, 0.2, 1e-15) && near(standard.sum, 0.4, 1e-15) && standard.stable, "published D/dt/h has CFL sum 0.4");
    settings.diffusivity = 0;
    check(heat::stability(settings).stable && std::isinf(heat::stability(settings).maximumDt), "D=0 needs no divide-by-zero stability bound");
    settings = heat::Settings{};
    heat::Field field = heat::makeField(heat::Preset::Checker, 32);
    settings.dt = 0.05;
    const auto initial = field.current;
    check(!heat::diffuse(field, settings).advanced && field.current == initial && field.tick == 0, "ordinary mode rejects unstable settings without touching the field");
    settings.experiment = true;
    bool brokeMaximumPrinciple = false;
    bool stopped = false;
    for (int attempt = 0; attempt <= 400; ++attempt) {
        const auto previous = field.current;
        const auto previousTick = field.tick;
        const auto result = heat::diffuse(field, settings);
        if (!result.advanced) {
            check(result.status == heat::StepStatus::ExperimentAmplitude, "unstable checker stops on the stated amplitude guard");
            check(field.current == previous && field.tick == previousTick, "rejected candidate retains the last finite time level");
            stopped = true;
            break;
        }
        const auto stats = heat::measure(field, settings);
        brokeMaximumPrinciple = brokeMaximumPrinciple || stats.minimum < 0 || stats.maximum > 1;
        check(stats.finite && std::max(std::abs(stats.minimum), std::abs(stats.maximum)) <= 16, "published experiment states stay finite and bounded by the guard");
    }
    check(stopped && brokeMaximumPrinciple && field.tick > 1, "bounded experiment actually exhibits instability rather than refusing all steps");
    std::cout << "INSTABILITY accepted_steps=" << field.tick << " max=" << heat::measure(field, settings).maximum << " min=" << heat::measure(field, settings).minimum << '\n';
    settings.diffusivity = 0;
    field = heat::Field(3, 3);
    for (int step = 0; step < 400; ++step) {
        check(heat::diffuse(field, settings).advanced, "finite experiment budget accepts its stated steps");
    }
    check(heat::diffuse(field, settings).status == heat::StepStatus::ExperimentBudget && field.tick == 400, "experiment cannot run past its step budget");
    settings = heat::Settings{};
    settings.dx = 0;
    check(!heat::diffuse(field, settings).advanced && field.tick == 400, "invalid spacing cannot advance or modify the current field");
    settings.dx = 0.5;
    settings.dt = std::numeric_limits<double>::quiet_NaN();
    check(!heat::stability(settings).valid, "NaN timestep rejected");
    settings = heat::Settings{};
    field = heat::Field(3, 3);
    std::fill(field.current.begin(), field.current.end(), 1e308);
    const auto finiteBefore = field.current;
    check(heat::diffuse(field, settings).status == heat::StepStatus::NonFiniteCandidate, "non-finite arithmetic candidate is rejected");
    check(field.current == finiteBefore && field.tick == 0, "non-finite rejection does not publish a partial buffer");
}

void testReferenceAndRefinement() {
    heat::Settings settings;
    settings.dx = 0.7;
    settings.dy = 0.9;
    settings.diffusivity = 0.6;
    settings.dt = 0.03;
    heat::Field field = heat::cosineField(17, 13, 3, 2);
    const double amplification = heat::discreteAmplification(settings, 17, 13, 3, 2);
    for (int step = 0; step < 40; ++step) {
        heat::diffuse(field, settings);
    }
    const double schemeError = heat::maximumCosineError(field, 0.25 * std::pow(amplification, 40), 3, 2);
    check(schemeError <= 2e-13, "cosine mode matches the independently derived discrete amplification");
    std::array<double, 3> errors{};
    int row = 0;
    for (int size : {16, 32, 64}) {
        settings.diffusivity = 0.5;
        settings.dx = 16.0 / size;
        settings.dy = settings.dx;
        settings.dt = 0.2 * settings.dx * settings.dx / settings.diffusivity;
        const int steps = static_cast<int>(std::lround(0.4 / settings.dt));
        field = heat::cosineField(size, size, 1, 1);
        for (int step = 0; step < steps; ++step) {
            check(heat::diffuse(field, settings).advanced, "refinement fixture stays inside the same CFL budget");
        }
        check(near(field.time, 0.4, 1e-14), "refinement rows reach the same model time");
        errors[static_cast<std::size_t>(row++)] = heat::maximumCosineError(field, heat::continuousAmplitude(settings, size, size, 1, 1, 0.4), 1, 1);
        std::cout << "REFINEMENT n=" << size << " h=" << settings.dx << " dt=" << settings.dt << " time=" << field.time << " error=" << errors[static_cast<std::size_t>(row - 1)] << '\n';
    }
    check(errors[1] < errors[0] / 3 && errors[2] < errors[1] / 3, "fixed-domain/time refinement with dt proportional to h squared reduces the continuous-solution error");
    check(schemeError < errors[2], "scheme parity and PDE discretization error are different measurements");
}

void testClock() {
    const double dt = 1.0 / 30.0;
    for (int fps : {15, 30, 120}) {
        double accumulator = 0;
        int steps = 0;
        for (int frame = 0; frame < fps * 2; ++frame) {
            const auto plan = heat::planSteps(accumulator, 1.0 / fps, dt);
            accumulator = plan.remainder;
            steps += plan.steps;
            check(plan.dropped < 1e-12, "ordinary frame sequence does not drop model time");
        }
        check(steps == 60, "same elapsed and dt create sixty steps independent of render FPS");
    }
    const auto hitch = heat::planSteps(0, 10, dt, 4);
    check(hitch.steps == 8 && hitch.dropped > 39 && hitch.remainder < dt, "stall work and remainder are bounded, dropped time is in model seconds");
    check(heat::planSteps(0, std::numeric_limits<double>::quiet_NaN(), dt).steps == 0, "NaN clock cannot create work");
    const auto tiny = heat::planSteps(0, 1, 1e-320);
    check(tiny.steps == 8 && std::isfinite(tiny.dropped), "extreme positive timestep cannot overflow the step-count conversion");
}

void testWorkshopAndBytes() {
    heat::Workshop state;
    heat::Field field = heat::makeField(heat::Preset::Hotspot, 192);
    check(state.paused && state.size == 192, "final workshop starts paused at the real 192-square acceptance preset");
    heat::applyAction(heat::Action::Run, field, state);
    check(!state.paused, "Run resumes");
    heat::applyAction(heat::Action::Run, field, state);
    check(state.paused, "Run toggles back to pause");
    heat::applyAction(heat::Action::Heater, field, state);
    check(state.brushMode == heat::BrushMode::Heater, "Heater is an explicit brush mode");
    heat::applyAction(heat::Action::Heater, field, state);
    check(state.brushMode == heat::BrushMode::Temperature, "Heater toggles back to a one-time input");
    state.dragging = heat::Slider::Timestep;
    heat::setSlider(state, heat::Slider::Timestep, (0.05 - 0.002) / 0.098);
    check(near(state.settings.dt, 0.05, 1e-14) && state.dragging == heat::Slider::Timestep && state.paused, "slider pauses without losing the active drag");
    heat::applyAction(heat::Action::Experiment, field, state);
    check(state.settings.experiment && state.dirty && state.paused, "unsafe experiment is explicit, paused and recolors immediately");
    field.experimentSteps = 400;
    heat::applyAction(heat::Action::Experiment, field, state);
    heat::applyAction(heat::Action::Experiment, field, state);
    check(field.experimentSteps == 400, "toggling experiment cannot bypass the per-field step budget");
    heat::applyAction(heat::Action::Resolution, field, state);
    check(state.size == 256 && field.current.size() == 65536 && state.settings.dx == 0.375 && state.settings.dt == 0.05, "resolution changes h over fixed L, never repairs dt silently");
    check(!heat::stability(state.settings).stable, "resolution change can make the unchanged timestep unstable");
    heat::applyAction(heat::Action::Clear, field, state);
    check(state.preset == heat::Preset::Hotspot && heat::measure(field, state.settings).maximum == 0, "Clear does not replace the reset preset");
    heat::applyAction(heat::Action::Reset, field, state);
    check(heat::measure(field, state.settings).maximum > 0.99, "Reset restores the chosen input rather than the cleared field");
    int x = -1;
    int y = -1;
    check(heat::logicalCell(field, 24, 132, x, y) && x == 0 && y == 0, "logical viewport maps top-left to first cell");
    check(!heat::logicalCell(field, 744, 852, x, y), "half-open viewport excludes right/bottom outside edges");
    check(!heat::logicalCell(field, std::numeric_limits<float>::quiet_NaN(), 140, x, y), "non-finite coordinates rejected before integer conversion");
    check(heat::logicalCell(field, 255.5F, 0.5F, x, y, true) && x == 255 && y == 0, "clean view uses field logical coordinates, not debug layout");
    heat::Field row(3, 1);
    row.current = {0, 0.5, 1};
    std::array<std::uint8_t, 20> bytes;
    bytes.fill(77);
    heat::encodeRow(row, 0, bytes.data(), false, false);
    for (int column = 0; column < row.width; ++column) {
        const auto color = heat::heatColor(row.current[static_cast<std::size_t>(column)]);
        const auto offset = static_cast<std::size_t>(column) * 4;
        check(bytes[offset] == color.r && bytes[offset + 1] == color.g && bytes[offset + 2] == color.b && bytes[offset + 3] == 255, "RGBA byte order is independent of host packed-integer endian");
    }
    check(bytes[12] == 77 && bytes.back() == 77, "row encoder never writes into pitch padding");
    check(row.current[2] == 1, "color encoding does not mutate raw solver values");
}

void testArguments() {
    auto parses = [](const std::vector<const char*>& arguments) {
        std::vector<std::string> argumentStrings;
        for (const char* argument : arguments) {
            argumentStrings.emplace_back(argument);
        }
        // Tạo xong strings trước khi mượn data(), không cần ép bỏ const của literal.
        std::vector<char*> argumentPointers;
        for (std::string& argument : argumentStrings) {
            argumentPointers.push_back(argument.data());
        }
        return heat::parseOptions(static_cast<int>(argumentPointers.size()), argumentPointers.data());
    };
    check(parses({"p47", "--hidden", "--seconds", "0.1"}).size == 192, "finite hidden viewer defaults to acceptance resolution");
    const std::vector<std::vector<const char*>> invalidCases{
        {"p47", "--hidden"},
        {"p47", "--dt", "nan"},
        {"p47", "--size", "128x"},
        {"p47", "--verify", "--size", "192"},
        {"p47", "--verify", "--run"},
        {"p47", "--benchmark", "--experiment"},
        {"p47", "--benchmark", "--hidden"},
        {"p47", "--steps", "30"},
        {"p47", "--benchmark", "--size", "256", "--steps", "1000", "--repeats", "9"}};
    for (const auto& arguments : invalidCases) {
        bool rejected = false;
        try {
            static_cast<void>(parses(arguments));
        } catch (const std::exception&) {
            rejected = true;
        }
        check(rejected, "CLI rejects invalid, ignored, conflicting or unbounded arguments");
    }
}

} // namespace

int main() {
    testStorageAndBrush();
    testKnownUpdatesAndOracle();
    testInvariantsAndSources();
    testSafetyAndInstability();
    testReferenceAndRefinement();
    testClock();
    testWorkshopAndBytes();
    testArguments();
    check(heat::validatePlate(std::cout), "CLI fixture runner agrees with independent CPU test coverage");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "P47 numerical core checks passed; UI and packaging require separate verification\n";
    return EXIT_SUCCESS;
}
