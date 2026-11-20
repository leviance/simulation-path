#include "events/gesture.hpp"
#include "events/reload.hpp"
#include "script/session.hpp"
#include <cstdlib>
#include <iostream>

namespace {
int failures = 0;

void check(bool good, const char* label) {
    if (!good) {
        ++failures;
        std::cerr << "FAIL " << label << '\n';
    }
}

ink::Value run(const std::string& source) {
    auto p = ink::Parser(source).run();
    ink::Host h;
    ink::Names vars;
    ink::Machine vm(p, vars, h);
    vm.initialize();
    return vm.call("test", {});
}

void rejects(const std::string& source, const std::string& why) {
    try {
        run(source);
        check(false, "invalid program accepted");
    } catch (const tiny::Error& e) {
        check(std::string(e.what()).find(why) != std::string::npos, "diagnostic includes expected reason");
    }
}
} // namespace

int main() {
    using namespace ink;
    check(run("function test(){return 2+3*4-8/2;}") == Value{10.0}, "precedence");
    check(run("function test(){return 18/3/2;}") == Value{3.0}, "left associativity");
    check(run("let n=1; function f(n){if(true){let n=7;n=n+1;}return n;} function test(){return f(4)+n;}") == Value{5.0}, "parameter shadows global and block shadows parameter");
    check(run("function test(){if(3>2 && !false){return 7;}else{return 9;}}") == Value{7.0}, "if/boolean");
    check(run("function test(){return false && unknown();}") == Value{false}, "short circuit");
    rejects("function hidden(){return local;} function test(){let local=3;return hidden();}", "unknown variable");
    rejects("function test(){let a=1;let a=2;}", "already declared");
    rejects("function test(){a=1;}", "assignment before let");
    rejects("function test(){if(2){return 0;}}", "boolean");
    rejects("function test(){return 2/0;}", "zero");
    rejects("function test(){return nope(1);}", "unknown function");
    rejects("function f(v){return v;} function test(){return f();}", "argument count");
    rejects("function test(){return test();}", "call depth");
    std::string expensive = "function test(){";
    for (int i = 0; i < 390; ++i)
        expensive += "1+1;";
    rejects(expensive + "return 0;}", "1024 steps");
    rejects("function test(){return " + std::string(60, '(') + "1" + std::string(60, ')') + ";}", "syntax nesting");
    rejects(std::string(tiny::maxBytes + 1, ' '), "16 KiB");

    const auto assets = std::filesystem::path(COURSE_TEST_ASSETS);
    tiny::Desk d;
    tiny::Palette palette;
    tiny::FlexState flex;
    tiny::Bus bus;
    tiny::Gesture g;
    Session s;
    check(tiny::reloadBound(d, palette, flex, bus, assets / "panel.html", assets / "style.css"), "full UI from HTML and CSS");
    auto callback = [&](tiny::Desk& live, const std::string& event, double value) {
        invoke(s, live, event, value);
    };
    tiny::connect(d, bus, callback);
    const auto radius = tiny::elementById(d.page, "radius"), pause = tiny::elementById(d.page, "pause");
    auto click = [&](lab::WidgetId id) {
        const auto v = lab::locate(d.page.layout.scene.tree, id);
        const lab::Point pt{v->bounds.x + v->bounds.width / 2, v->bounds.y + 8};
        tiny::begin(d, bus, g, pt);
        tiny::end(d, bus, g, pt);
    };
    // [snippet two-scripts]
    check(reload(s, d, assets / "flight.tiny"), "direct script loads");
    click(radius);
    check(d.model.colony.params.radius == 80, "midpoint drives 80 in direct mode");
    click(pause);
    check(d.model.paused && s.variables.at("presses") == Value{1.0}, "button runs script and stores its global");
    check(reload(s, d, assets / "close-study.tiny") && !s.variables.contains("presses"), "reload replaces environment without resetting flock");
    click(radius);
    check(d.model.colony.params.radius == 50 && d.page.values.at(radius) == 80 && d.model.paused, "same input drives 50 in study mode");
    // [/snippet two-scripts]
    const auto version = s.edition;
    check(!reload(s, d, assets / "broken.tiny") && s.edition == version && s.filename == "close-study.tiny", "syntax error preserves active program");
    check(invoke(s, d, "reset") && d.model.colony.params.radius == 50, "old handlers still connected");
    check(reload(s, d, assets / "bad-host.tiny"), "runtime-error fixture parsed");
    lab::setPaused(d.model, false);
    check(!invoke(s, d, "pause") && !d.model.paused && s.variables.at("calls") == Value{0.0}, "late invalid host rolls back model and global writes");
    check(s.message.find("onPause") != std::string::npos && s.message.find("radius outside") != std::string::npos, "runtime error has context");
    check(reload(s, d, assets / "recursive.tiny") && !invoke(s, d, "pause"), "recursion terminates safely");
    check(invoke(s, d, "reset") && d.model.colony.params.radius == 64, "next UI event gets a fresh budget");
    if (failures)
        return EXIT_FAILURE;
    std::cout << "PASS TinyScript: grammar, scope, limits, rollback and two live UI programs\n";
    return EXIT_SUCCESS;
}
