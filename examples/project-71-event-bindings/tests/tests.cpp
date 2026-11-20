#include "events/reload.hpp"
#include <cstdlib>
#include <iostream>

namespace {
int failures = 0;

void check(bool good, const char* name) {
    if (!good) {
        ++failures;
        std::cerr << "FAIL " << name << '\n';
    }
}
} // namespace

int main() {
    using namespace tiny;
    const auto files = std::filesystem::path(COURSE_TEST_ASSETS);
    Desk d;
    Palette p;
    FlexState f;
    Bus b;
    Gesture g;
    auto load = [&](const char* name) {
        return reloadBound(d, p, f, b, files / name, files / "style.css");
    };
    check(load("panel.html"), "connect five real controls");
    auto point = [&](const std::string& n) {
        const auto v = lab::locate(d.page.layout.scene.tree, elementById(d.page, n));
        if (!v)
            throw Error("missing test target " + n);
        return lab::Point{v->bounds.x + v->bounds.width / 2, v->bounds.y + v->bounds.height / 2};
    };
    auto click = [&](const std::string& n) {
        const auto pt = point(n);
        begin(d, b, g, pt);
        end(d, b, g, pt);
    };
    // [snippet one-action]
    click("pause");
    check(d.model.paused && b.commands == 1 && b.ancestorCalls == 1, "one click toggles exactly once");
    check(b.route == std::vector<std::string>{"pause", "tools", "desk"}, "target to ancestors in order");
    b.stopAtGroup = true;
    click("pause");
    check(!d.model.paused && b.commands == 2 && b.route == std::vector<std::string>{"pause", "tools"}, "handled is not stop; explicit stop cuts root");
    // [/snippet one-action]
    auto outside = lab::Point{3, 3};
    const auto pause = point("pause");
    begin(d, b, g, pause);
    end(d, b, g, outside);
    check(!d.model.paused && b.commands == 2, "release outside cancels button");
    bool original = d.model.colony.showNeighbors;
    click("observe");
    check(d.model.colony.showNeighbors != original, "checkbox changes the real overlay");
    const auto radius = point("radius");
    begin(d, b, g, radius);
    slide(d, b, g, {2000, radius.y});
    end(d, b, g, {2000, radius.y});
    check(d.model.colony.params.radius == 140 && d.ui.active == 0, "capture samples last point outside");
    check(d.model.scenePresses == 0, "UI gestures do not pick scene birds");
    check(!begin(d, b, g, {28, 100}), "unowned viewport press is available to the scene");
    d.ui.focus = elementById(d.page, "separation");
    navigate(d, b, lab::Key::Home, false, false);
    check(d.model.colony.params.separationWeight == 0, "keyboard writes the second parameter");
    lab::stepPhysics(d.model);
    click("reset");
    check(d.model.ticks == 0 && d.model.colony.params.radius == 64, "Reset restores a seeded simulation");
    begin(d, b, g, point("pause"));
    const auto oldRoot = d.page.layout.scene.tree.root.get();
    check(!load("unbound.html") && d.page.layout.scene.tree.root.get() == oldRoot && !d.ui.active, "missing binding rolls back and releases capture");
    check(load("survey.html") && d.edition == 2 && !d.ui.active && !d.ui.focus, "new HTML has fresh input and handlers");
    click("pause");
    check(d.model.paused && b.commands == 1, "same ID after reordering still activates once");
    const unsigned saved = b.edition;
    --b.edition;
    check(!dispatch(d, b, {Topic::Click, elementById(d.page, "pause")}) && d.model.paused, "stale dispatcher ignored");
    b.edition = saved;
    d.ui.focus = elementById(d.page, "pause");
    navigate(d, b, lab::Key::Enter, false, true);
    check(d.model.paused, "key repeat is not a second click");
    begin(d, b, g, point("radius"));
    lab::setWidth(d.page.layout, d.ui, 220);
    reflow(d, f.values);
    check(!d.ui.active, "resize cancels the old capture");
    const auto prior = d.model.colony.params.radius;
    end(d, b, g, {2000, 400});
    check(d.model.colony.params.radius == prior, "orphan release ignored");
    if (failures)
        return EXIT_FAILURE;
    std::cout << "PASS events: single activation, route, stop, capture, focus, reload, five model bindings\n";
    return EXIT_SUCCESS;
}
