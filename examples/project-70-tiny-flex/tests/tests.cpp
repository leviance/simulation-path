#include "flex/workshop.hpp"
#include "markup/interact.hpp"
#include <cstdlib>
#include <iostream>

namespace {
int failures = 0;

void check(bool good, const char* message) {
    if (!good) {
        ++failures;
        std::cerr << "FAIL " << message << '\n';
    }
}

bool close(double a, double b) {
    return std::abs(a - b) < 1e-7;
}
} // namespace

int main() {
    using namespace tiny;
    Options o;
    o.flex = true;
    o.axis = Axis::Row;
    o.align = Align::Start;
    // [snippet golden]
    const Item fixed{40, 10, 0, 0, 0, 0, 0}, growing{20, 15, 2, 0, 0, 0, 0};
    check(line(o, 100, 50, 8, {}).empty(), "empty row");
    o.justify = Justify::Between;
    const auto single = line(o, 100, 50, 8, {fixed});
    check(single[0].x == 0 && single[0].width == 40, "single space-between starts at zero");
    auto pair = line(o, 100, 50, 8, {fixed, growing});
    check(pair[0].x == 0 && pair[1].x == 48 && pair[1].width == 52, "100 minus bases 60 and gap 8 leaves 32");
    pair = line(o, 38, 50, 8, {fixed, growing});
    check(pair[0].width == 40 && pair[1].x == 48 && pair[1].width == 20, "deficit clips; does not shrink");
    // [/snippet golden]
    for (const auto axis : {Axis::Row, Axis::Column}) {
        o.axis = axis;
        for (const auto justify : {Justify::Start, Justify::Center, Justify::End, Justify::Between}) {
            o.justify = justify;
            for (const auto align : {Align::Start, Align::Center, Align::End, Align::Stretch}) {
                o.align = align;
                const auto all = line(o, 120, 50, 10, {fixed, fixed});
                double start = 0, second = 50, side = 0, thick = 10;
                if (justify == Justify::Center) {
                    start = 15;
                    second = 65;
                }
                if (justify == Justify::End) {
                    start = 30;
                    second = 80;
                }
                if (justify == Justify::Between)
                    second = 80;
                if (align == Align::Center)
                    side = 20;
                if (align == Align::End)
                    side = 40;
                if (align == Align::Stretch)
                    thick = 50;
                if (axis == Axis::Row)
                    check(all[0].x == start && all[1].x == second && all[0].y == side && all[0].height == thick, "golden horizontal");
                else
                    check(all[0].y == start && all[1].y == second && all[0].x == side && all[0].width == thick, "golden vertical");
            }
        }
    }
    o = {};
    o.axis = Axis::Row;
    const auto weights = line(o, 150, 30, 10, {{20, 10, 1}, {30, 10, 2}});
    check(weights[0].width == 50 && weights[1].width == 90, "surplus ratio 1:2");
    const auto files = std::filesystem::path(COURSE_TEST_ASSETS);
    Desk d;
    Palette p;
    FlexState f;
    check(reload(d, files / "panel.html"), "HTML from disk");
    p.defaults = d.page.layout.scene.styles;
    check(changeFlexSheet(d, p, f, files / "style.css"), "CSS from disk");
    unsigned containers = 0;
    for (const auto& value : f.values)
        if (value.second.flex)
            ++containers;
    check(containers >= 3 && f.values.at(f.toolbar).axis == Axis::Row, "nested row and column from CSS");
    const auto id = [&](const std::string& s) {
        return d.page.handles.at(d.page.document.byId.at(s));
    };
    for (const double w : {420., 320., 220.}) {
        lab::setWidth(d.page.layout, d.ui, w);
        reflow(d, f.values);
        const auto pause = lab::locate(d.page.layout.scene.tree, id("pause"));
        const auto reset = lab::locate(d.page.layout.scene.tree, id("reset"));
        check(pause && reset && close(pause->bounds.y, reset->bounds.y) && reset->bounds.x > pause->bounds.x, "row shares y across widths");
        const auto radius = lab::locate(d.page.layout.scene.tree, id("radius"));
        const lab::Point mid{radius->bounds.x + radius->bounds.width / 2, radius->bounds.y + 8};
        press(d, mid);
        release(d, mid);
        check(d.model.colony.params.radius == 80, "resize keeps slider picking and value");
    }
    const auto links = lab::locate(d.page.layout.scene.tree, id("observe"));
    check(links && links->clip.width < links->bounds.width, "narrow toolbar clips the last control");
    toggleControl(d, "observe");
    reflow(d, f.values);
    check(!lab::locate(d.page.layout.scene.tree, id("observe")), "hidden item not in paint/hit");
    check(changeFlexSheet(d, p, f, files / "column.css"), "reload column without compiling");
    const auto a = lab::locate(d.page.layout.scene.tree, id("pause"));
    const auto b = lab::locate(d.page.layout.scene.tree, id("reset"));
    check(a && b && b->bounds.y > a->bounds.y && close(a->bounds.x, b->bounds.x), "column recomputed in same tree");
    const auto passes = d.page.layout.passes;
    for (int i = 0; i < 1000; ++i)
        reflow(d, f.values);
    check(passes == d.page.layout.passes, "no idle reflow");
    if (failures)
        return EXIT_FAILURE;
    std::cout << "PASS TinyFlex: axes, margins, basis/growth, alignment, clipping and input\n";
    return EXIT_SUCCESS;
}
