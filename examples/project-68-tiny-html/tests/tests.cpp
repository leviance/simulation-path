#include "markup/interact.hpp"
#include <cstdlib>
#include <iostream>

namespace {
int failures = 0;

void check(bool condition, const char* label) {
    if (!condition) {
        std::cerr << "FAIL " << label << '\n';
        ++failures;
    }
}

void reject(const std::string& source, const std::string& reason) {
    try {
        tiny::parse(source);
        check(false, "accepted invalid markup");
    } catch (const tiny::Error& error) {
        check(std::string(error.what()).find(reason) != std::string::npos, "diagnostic includes cause");
    }
}
} // namespace

int main() {
    using namespace tiny;
    // Đọc đúng hai file mà người học sẽ sửa, không dựa vào thư mục gọi CTest.
    const auto assets = std::filesystem::path(COURSE_TEST_ASSETS);
    const auto main = readFile(assets / "panel.html");
    const auto survey = readFile(assets / "survey.html");
    const auto tree = parse(main);
    check(tree.elements.size() == 12 && tree.byId.at("radius") == 8, "independent node count and source order");
    check(tree.elements[8].tag == "input" && tree.elements[8].parent == 6, "slider belongs to settings");
    check(tree.elements[0].classes == std::vector<std::string>{"sheet"}, "class retained");
    const auto plain = parse("<div><label>  R &amp; D   notes </label></div>");
    check(plain.elements[1].text == "R & D notes", "entity and whitespace");
    check(parse("\xef\xbb\xbf<div><span>Nước</span></div>").elements.size() == 2, "BOM and valid UTF-8");
    reject("<div>\n<label>x</button></div>", "2:9");
    reject("<div id='a'><span id='a'/></div>", "duplicate id");
    reject("<div bad='no'/>", "unsupported attribute");
    reject("<div><image/></div>", "unsupported tag");
    reject("<div><input type='range' min='9' max='2'/></div>", "min/max");
    reject("<div><label>A &copy;</label></div>", "entity");
    reject("<div id='bad' id='again'/>", "duplicate attribute");
    reject("<div/><div/>", "single root");
    reject("<div><button><span/></button></div>", "only div");
    reject(std::string(maxBytes + 1, 'a'), "16 KiB");
    reject(std::string("<div>\xc0\xaf</div>"), "UTF-8");
    std::string deep, many = "<div>";
    for (int i = 0; i < 8; ++i)
        deep += "<div>";
    for (int i = 0; i < 32; ++i)
        many += "<span/>";
    reject(deep, "depth");
    reject(many + "</div>", "node/depth");

    // [snippet reload-test]
    Desk d;
    check(reload(d, assets / "panel.html"), "real file loads");
    const auto first = d.page.handles.at(d.page.document.byId.at("radius"));
    const auto before = lab::locate(d.page.layout.scene.tree, first);
    check(before && before->bounds.x == 647, "independent slider left edge: 616+2+14+3+2+7+3");
    if (!before)
        return EXIT_FAILURE;
    const lab::Point middle{before->bounds.x + before->bounds.width / 2, before->bounds.y + 8};
    press(d, middle);
    check(d.ui.active == first && d.model.colony.params.radius == 80, "real drag changes flock");
    const auto root = d.page.layout.scene.tree.root.get();
    check(!reload(d, assets / "broken.html") && d.page.layout.scene.tree.root.get() == root && d.edition == 1, "bad file leaves the old tree alive");
    check(d.status.find("broken.html:4:") != std::string::npos, "file and line visible");
    check(reload(d, assets / "survey.html") && !d.ui.active && !d.ui.focus, "successful swap clears gesture and focus");
    check(d.model.colony.params.radius == 80 && d.edition == 2, "model survives reload");
    // [/snippet reload-test]
    const auto newId = d.page.handles.at(d.page.document.byId.at("radius"));
    const auto after = lab::locate(d.page.layout.scene.tree, newId);
    check(after && after->bounds.y < before->bounds.y, "two files really reflow the controls");
    release(d, middle);
    check(d.model.colony.params.radius == 80, "release from an old tree cannot move a new slider");
    d.ui.focus = newId;
    key(d, lab::Key::End, false, false);
    check(d.model.colony.params.radius == 140, "new slider handles keyboard");
    key(d, lab::Key::Left, false, false);
    check(d.model.colony.params.radius == 138, "HTML step affects keyboard");
    const auto checks = parse(survey);
    check(checks.elements[checks.byId.at("title")].text == "NEIGHBOR SURVEY", "second file title");
    if (failures)
        return EXIT_FAILURE;
    std::cout << "PASS TinyHTML: documents, diagnostics, geometry, live reload and input\n";
    return EXIT_SUCCESS;
}
