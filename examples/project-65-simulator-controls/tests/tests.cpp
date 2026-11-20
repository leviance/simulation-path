#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>

namespace {
int failures = 0;
void check(bool ok, const char* what) {
    if (!ok) { std::cerr << "FAIL: " << what << '\n'; ++failures; }
}

bool sameBirds(const std::vector<lab::Boid>& a, const std::vector<lab::Boid>& b) {
    if (a.size() != b.size()) return false;
    for (std::size_t i = 0; i < a.size(); ++i) {
        if (a[i].id != b[i].id || a[i].position.x != b[i].position.x || a[i].position.y != b[i].position.y ||
            a[i].velocity.x != b[i].velocity.x || a[i].velocity.y != b[i].velocity.y) return false;
    }
    return true;
}

void click(lab::Model& model, lab::Ui& ui, lab::Point p) {
    check(lab::pointerDown(model, ui, p), "panel consumes press");
    lab::pointerUp(model, ui, p);
}

void testGestures() {
    using namespace lab;
    Model m;
    Ui ui;
    const auto initial = m.colony.birds;
    check(initial.size() == 192 && !m.paused, "known running preset");
    check(hitTest({676,100}) == Control::Pause && hitTest({788,100}) == Control::None, "half-open bounds");
    pointerDown(m, ui, {690,120});
    pointerUp(m, ui, {500,120});
    check(!m.paused, "outside release cancels click");
    click(m, ui, {690,120});
    check(m.paused && advance(m, 1.0) == 0, "pause freezes the solver");
    pointerDown(m, ui, {700,260});
    pointerMove(m, ui, {-500,260});
    const auto small = m.colony.observe().neighbors.size();
    pointerUp(m, ui, {1400,260});
    check(m.colony.params.radius == 140 && m.colony.observe().neighbors.size() > small, "drag outside; query changes while paused");
    check(sameBirds(initial, m.colony.birds), "inspection does not move birds");
    click(m, ui, {740,180});
    check(!m.colony.showNeighbors, "checkbox toggles once");
    Model comparison = m;
    comparison.colony.showNeighbors = true;
    stepPhysics(m); stepPhysics(comparison);
    check(sameBirds(m.colony.birds, comparison.colony.birds), "hide overlay does not affect solver");
    check(pointerDown(m, ui, {670,390}), "blank panel consumes event");
    const auto chosen = m.colony.selected;
    scenePointerDown(m, {680,450});
    check(m.scenePresses == 0 && m.colony.selected == chosen, "panel never selects bird");
    scenePointerDown(m, {110,185});
    check(m.scenePresses == 1, "one scene pick");
    click(m, ui, {830,120});
    check(m.paused && sameBirds(initial, m.colony.birds) && m.ticks == 0 &&
          m.colony.params.radius == 64 && m.colony.params.separationWeight == 1.5 && m.colony.showNeighbors, "deterministic reset");
}

void testKeyboardAndLoss() {
    using namespace lab;
    Model m; Ui ui;
    for (auto control : order) {
        keyDown(m, ui, Key::Tab, false, false);
        check(ui.focus == control, "tab follows draw order");
    }
    keyDown(m, ui, Key::Home, false, false);
    check(m.colony.params.separationWeight == 0, "separation home");
    keyDown(m, ui, Key::End, false, false);
    check(m.colony.params.separationWeight == 5, "separation end");
    keyDown(m, ui, Key::Tab, true, false);
    check(ui.focus == Control::Radius, "reverse tab");
    setSlider(m, Control::Radius, std::numeric_limits<double>::quiet_NaN());
    check(m.colony.params.radius == 64, "NaN cannot reach solver");
    pointerDown(m, ui, {750,260});
    suspend(m, ui);
    check(ui.active == Control::None && m.paused, "lost focus releases drag");
    const auto p = windowToLogical({800,210}, 960,720);
    check(p && p->x == 800 && p->y == 120, "letterbox input");
    check(!windowToLogical({},0,100), "invalid viewport");
}

// [snippet oracle]
void testBoids() {
    using namespace lab;
    Model a, b;
    Ui ui;
    for (double t : {0.0, 0.5, 1.0}) {
        setSlider(a, Control::Radius, t);
        check(audit(a, ui), "grid neighbor IDs equal independent brute force");
    }
    setSlider(b, Control::Radius, 1.0);
    setSlider(a, Control::Separation, 0);
    setSlider(b, Control::Separation, 1);
    stepPhysics(a); stepPhysics(b);
    check(!sameBirds(a.colony.birds, b.colony.birds), "separation changes trajectories");
    resetSimulation(a); resetSimulation(b);
    advance(a, fixedDt); advance(a, fixedDt);
    advance(b, 2 * fixedDt);
    check(a.ticks == 2 && sameBirds(a.colony.birds, b.colony.birds), "fixed step partition");
    check(advance(a, 9.0) == 6, "bounded catch-up");
}
// [/snippet oracle]
}

int main() {
    testGestures(); testKeyboardAndLoss(); testBoids();
    if (failures) return EXIT_FAILURE;
    std::cout << "PASS: 192 P28 Boids, panel gestures, keyboard, reset, spatial oracle\n";
    return EXIT_SUCCESS;
}
