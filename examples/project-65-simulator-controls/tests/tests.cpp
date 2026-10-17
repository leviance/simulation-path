#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(double actual, double expected) {
    return std::abs(actual - expected) < 1e-8;
}

void testGeometry() {
    using namespace lab;
    check(contains(pauseButton, {688.0, 80.0}), "top-left included");
    check(!contains(pauseButton, {912.0, 80.0}), "right excluded");
    check(!contains(pauseButton, {688.0, 124.0}), "bottom excluded");
    check(hitTest({800.0, 252.0}) == Control::Gravity, "slider hit");
    check(hitTest({800.0, 320.0}) == Control::None, "blank panel not button");
    check(!windowToLogical({}, 0.0, 540.0).has_value(), "zero viewport rejected");
    const auto logical = windowToLogical({800.0, 180.0}, 960.0, 720.0);
    check(logical && near(logical->x, 800.0) && near(logical->y, 90.0), "tall letterbox offset");
    const auto bar = windowToLogical({800.0, 20.0}, 960.0, 720.0);
    check(bar && hitTest(*bar) == Control::None, "letterbox bar misses UI");
    for (const Point viewport : {Point{960.0, 540.0}, Point{1920.0, 1080.0}, Point{1440.0, 540.0}, Point{480.0, 720.0}}) {
        const double scale = std::min(viewport.x / canvasWidth, viewport.y / canvasHeight);
        const double x = (viewport.x - canvasWidth * scale) / 2.0 + 800.0 * scale;
        const double y = (viewport.y - canvasHeight * scale) / 2.0 + 100.0 * scale;
        const auto point = windowToLogical({x, y}, viewport.x, viewport.y);
        check(point && hitTest(*point) == Control::Pause, "round-trip button in resized window");
    }
}

void testClock() {
    using namespace lab;
    Model a;
    check(advance(a, 50.0) == 0 && a.ticks == 0, "paused time never accumulates");
    setPaused(a, false);
    for (int i = 0; i < 60; ++i) {
        advance(a, fixedDt);
    }
    const double n = 60.0;
    const double expectedVelocity = a.gravity * fixedDt * n;
    const double expectedY = 90.0 + a.gravity * fixedDt * fixedDt * n * (n + 1.0) / 2.0;
    // Đối chiếu công thức tổng cấp số cộng, không gọi lại vòng lặp của simulator.
    check(near(a.velocity, expectedVelocity) && near(a.y, expectedY), "semi-implicit free-flight oracle");
    Model b;
    setPaused(b, false);
    for (int i = 0; i < 15; ++i) {
        advance(b, 4.0 * fixedDt);
    }
    check(a.ticks == b.ticks && near(a.y, b.y), "dt partitions have same fixed steps");
    check(advance(b, 1e9) == 12, "long frame limited to twelve steps");
    check(advance(b, std::numeric_limits<double>::quiet_NaN()) == 0, "NaN frame ignored");
    const auto ticks = b.ticks;
    setPaused(b, true);
    advance(b, 3600.0);
    check(b.ticks == ticks && b.accumulator == 0.0, "pause drops wait time");
    setGravity(b, 1000.0);
    resetSimulation(b);
    check(b.paused && b.gravity == 1000.0 && b.y == 90.0 && b.ticks == 0, "reset keeps pause and gravity");
    setGravity(b, std::numeric_limits<double>::infinity());
    check(b.gravity == 1000.0, "nonfinite parameter ignored");
}

void testPointer() {
    using namespace lab;
    Model model;
    Ui ui;
    pointerUp(model, ui, {800.0, 100.0});
    check(model.paused, "orphan release does not click");
    check(pointerDown(model, ui, {800.0, 100.0}), "panel consumes down");
    pointerMove(model, ui, {100.0, 100.0});
    pointerUp(model, ui, {100.0, 100.0});
    check(model.paused && ui.active == Control::None, "release outside cancels button");
    pointerDown(model, ui, {800.0, 100.0});
    pointerUp(model, ui, {800.0, 160.0});
    check(model.paused, "release another button does not activate");
    pointerDown(model, ui, {800.0, 100.0});
    pointerMove(model, ui, {800.0, 160.0});
    check(ui.active == Control::Pause && ui.focus == Control::Pause, "hover never steals active or focus");
    pointerMove(model, ui, {800.0, 100.0});
    pointerUp(model, ui, {800.0, 100.0});
    check(!model.paused, "leave and reenter same button is click");

    pointerDown(model, ui, {800.0, 252.0});
    check(near(model.gravity, 600.0), "slider midpoint");
    pointerMove(model, ui, {-500.0, 50.0});
    check(model.gravity == 0.0 && ui.active == Control::Gravity, "drag left outside clamps");
    pointerDown(model, ui, {800.0, 100.0});
    check(ui.active == Control::Gravity, "second down cannot replace owner");
    pointerMove(model, ui, {5000.0, 50.0});
    check(model.gravity == 1200.0, "drag right outside clamps");
    suspend(model, ui);
    pointerUp(model, ui, {800.0, 100.0});
    check(model.paused && ui.active == Control::None, "blur cancels before release");

    pointerDown(model, ui, {800.0, 252.0});
    pointerUp(model, ui, {1200.0, 252.0});
    check(model.gravity == 1200.0 && ui.active == Control::None, "up commits final slider position without motion");
    pointerDown(model, ui, {800.0, 252.0});
    pointerUp(model, ui, {-100.0, 252.0});
    check(model.gravity == 0.0, "up outside left clamps without motion");

    const Point blank{800.0, 320.0};
    if (!pointerDown(model, ui, blank)) {
        scenePointerDown(model, blank);
    }
    check(model.scenePresses == 0, "blank panel consumed");
    const Point scenePoint{320.0, 200.0};
    if (!pointerDown(model, ui, scenePoint)) {
        scenePointerDown(model, scenePoint);
    }
    check(model.scenePresses == 1 && model.y == 200.0, "scene receives unconsumed click");
}

void testKeyboard() {
    using namespace lab;
    Model model;
    Ui ui;
    keyDown(model, ui, Key::Tab, false, false);
    check(ui.focus == Control::Pause, "first Tab selects Pause");
    keyDown(model, ui, Key::Space, false, false);
    keyDown(model, ui, Key::Space, false, true);
    check(!model.paused, "Space repeat does not toggle twice");
    keyDown(model, ui, Key::Tab, true, false);
    check(ui.focus == Control::Gravity, "Shift Tab wraps to slider");
    keyDown(model, ui, Key::Home, false, false);
    keyDown(model, ui, Key::Right, false, true);
    check(model.gravity == 20.0, "slider arrows allow repeat");
    keyDown(model, ui, Key::End, false, false);
    check(model.gravity == 1200.0, "End selects maximum");
    keyDown(model, ui, Key::Tab, true, false);
    check(ui.focus == Control::Reset, "reverse slider to Reset");
    keyDown(model, ui, Key::Enter, false, false);
    check(!model.paused && model.gravity == 1200.0 && model.ticks == 0, "keyboard reset preserves choices");
    pointerDown(model, ui, {800.0, 252.0});
    keyDown(model, ui, Key::Escape, false, false);
    check(ui.active == Control::None, "Escape cancels gesture");
}

} // namespace

int main() {
    testGeometry();
    testClock();
    testPointer();
    testKeyboard();

    lab::Model model;
    lab::Ui ui;
    lab::setPaused(model, false);
    for (int i = 0; i < 12000; ++i) {
        lab::setGravity(model, double(i % 1201));
        lab::advance(model, 1.0 / 60.0);
        check(lab::audit(model, ui), "bounded stress state");
    }
    model.gravity = -1.0;
    check(!lab::audit(model, ui), "audit reports corrupted model without fixing it");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 65 validation passed\n";
    return EXIT_SUCCESS;
}
