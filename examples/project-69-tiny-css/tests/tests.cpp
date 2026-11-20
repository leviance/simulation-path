#include "markup/interact.hpp"
#include "style/editor.hpp"
#include <cstdlib>
#include <iostream>

namespace {
int failures = 0;

void check(bool good, const char* message) {
    if (!good) {
        std::cerr << "FAIL " << message << '\n';
        ++failures;
    }
}

void reject(const std::string& text) {
    try {
        tiny::parseSheet(text);
        check(false, "bad CSS accepted");
    } catch (const tiny::Error& e) {
        check(std::string(e.what()).find(':') != std::string::npos, "CSS error has a position");
    }
}
} // namespace

int main() {
    using namespace tiny;
    const auto files = std::filesystem::path(COURSE_TEST_ASSETS);
    Desk d;
    check(reload(d, files / "panel.html"), "load the same HTML for every stylesheet");
    Palette p;
    p.defaults = d.page.layout.scene.styles;
    const auto id = d.page.handles.at(d.page.document.byId.at("pause"));
    const auto& e = d.page.document.elements.at(d.page.document.byId.at("pause"));

    // [snippet cascade-test]
    const auto sheet = parseSheet("button { color: #111111; } .action { color: #222222; } .primary { color: #333333; } #pause { background: #886622; } button { background: #000000; }");
    const auto c = cascade(e, p.defaults.at(id), sheet);
    check(c.matches.size() == 5, "all matching rules are recorded in source order");
    check(c.paint.ink == RGB{51, 51, 51} && c.winner.at("color").rule == 2, "later class wins a tie");
    check(c.paint.paper == RGB{136, 102, 34} && c.winner.at("background").rule == 3, "ID beats a later tag");
    // [/snippet cascade-test]
    reject("button { width: 9%; }");
    reject(".group button { color: #000000; }");
    reject("button { padding: -1px; }");
    reject("button { display: flex; }");
    reject("button { color: #05zz00; }");
    reject("button { height: 12px }");
    check(reloadCss(d, p, files / "style.css"), "load lagoon theme");
    const auto dark = p.computed.at(id).paint.paper;
    const auto darkRect = lab::locate(d.page.layout.scene.tree, id)->bounds;
    const auto tick = d.model.ticks;
    check(reloadCss(d, p, files / "field.css"), "load daylight theme in the same instance");
    const auto lightRect = lab::locate(d.page.layout.scene.tree, id)->bounds;
    check(dark != p.computed.at(id).paint.paper && darkRect.height == 34 && lightRect.height == 30, "two files change actual paint and geometry");
    check(darkRect.x > lightRect.x && d.model.ticks == tick, "padding reflows without changing the flock");
    check(lab::hitTest(d.page.layout.scene.tree, {lightRect.x + 2, lightRect.y + 2}) == id, "hit-test uses fresh bounds");
    const int before = d.page.layout.passes;
    auto source = readFile(files / "field.css") + "\n#pause { color: #663311; }";
    installSheet(d, p, parseSheet(source), source);
    check(before == d.page.layout.passes && p.computed.at(id).paint.ink == RGB{102, 51, 17}, "paint-only reload does not remeasure");
    check(!reloadCss(d, p, files / "broken.css") && before == d.page.layout.passes && d.status.find("broken.css:2:") != std::string::npos, "invalid CSS leaves the valid theme in place");
    const auto col = p.computed.at(id).paint.ink;
    try {
        const std::string bad = "button { height: auto; }";
        installSheet(d, p, parseSheet(bad), bad);
        check(false, "auto-height leaf accepted");
    } catch (const Error&) {
        check(p.computed.at(id).paint.ink == col, "semantic error does not partially publish");
    }
    const auto radius = d.page.handles.at(d.page.document.byId.at("radius"));
    d.ui.focus = radius;
    key(d, lab::Key::End, false, false);
    check(d.model.colony.params.radius == 140, "restyled control still changes the simulation");
    if (failures)
        return EXIT_FAILURE;
    std::cout << "PASS TinyCSS: selectors, precedence, paint, reflow, rollback and live controls\n";
    return EXIT_SUCCESS;
}
