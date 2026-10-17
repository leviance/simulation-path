#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Không dùng assert: Release phải thực thi các điều kiện như Debug.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}
} // namespace

int main() {
    using namespace lab;
    auto built = buildTree();
    Tree& tree = built.tree;
    Model model;
    Ui ui;
    const auto pause = locate(tree, built.pause);
    check(pause && pause->bounds.x == 688 && pause->bounds.y == 80 && pause->bounds.width == 224, "independent world coordinate fixture");
    const Rect local = find(*tree.root, built.pause)->local;
    movePanel(tree, -16, 4);
    check(locate(tree, built.pause)->bounds.x == 672 && locate(tree, built.pause)->bounds.y == 84, "all ancestors translate");
    check(find(*tree.root, built.pause)->local.x == local.x && find(*tree.root, built.pause)->local.y == local.y, "local coordinates unchanged");

    auto clipped = buildTree(1);
    const auto reset = locate(clipped.tree, clipped.reset);
    check(reset && reset->bounds.height == 44 && reset->clip.height == 36, "clip changes visibility not ownership bounds");
    check(hitTest(clipped.tree, {700, 175}) == clipped.reset && hitTest(clipped.tree, {700, 176}) != clipped.reset, "half-open clipped button");
    check(find(*clipped.tree.root, clipped.slider) && !locate(clipped.tree, clipped.slider), "clipped node is still owned");

    auto overlap = buildTree(2);
    Widget* group = find(*overlap.tree.root, overlap.group);
    const WidgetId top = group->children.back()->id;
    check(hitTest(overlap.tree, {700, 90}) == top, "reverse paint order");
    add(overlap.tree, overlap.group, Kind::Label, {0, 0, 224, 44}, "Overlay label");
    check(hitTest(overlap.tree, {700, 90}) == top, "Label is pass through");
    setEnabled(overlap.tree, top, false, ui);
    pointerDown(overlap.tree, model, ui, {700, 90});
    pointerUp(overlap.tree, model, ui, {700, 90});
    check(model.paused && hitTest(overlap.tree, {700, 90}) == top, "disabled overlay consumes without action");

    built = buildTree();
    pointerUp(tree, model, ui, {700, 90});
    check(model.paused, "orphan release ignored");
    pointerDown(tree, model, ui, {700, 90});
    pointerMove(tree, model, ui, {700, 150});
    check(ui.active == built.pause && ui.hot == built.reset, "hot cannot steal active");
    pointerUp(tree, model, ui, {700, 150});
    check(model.paused, "different button release ignored");
    pointerDown(tree, model, ui, {700, 90});
    pointerUp(tree, model, ui, {700, 90});
    check(!model.paused, "exactly one click action");
    pointerDown(tree, model, ui, {800, 252});
    pointerUp(tree, model, ui, {1200, 252});
    check(model.gravity == 1200 && ui.active == 0, "release commits final slider sample");
    pointerDown(tree, model, ui, {800, 252});
    cancel(ui);
    pointerUp(tree, model, ui, {-200, 252});
    check(model.gravity == 600, "cancel does not invent a final sample");

    ui = Ui{};
    keyDown(tree, model, ui, Key::Tab, false, false);
    check(ui.focus == built.pause, "focus begins at first control");
    const bool paused = model.paused;
    keyDown(tree, model, ui, Key::Enter, false, false);
    keyDown(tree, model, ui, Key::Enter, false, true);
    check(model.paused != paused, "button key repeat suppressed");
    keyDown(tree, model, ui, Key::Tab, false, false);
    keyDown(tree, model, ui, Key::Tab, false, false);
    check(ui.focus == built.slider, "focus order follows tree");
    keyDown(tree, model, ui, Key::End, false, false);
    keyDown(tree, model, ui, Key::Left, false, true);
    check(model.gravity == 1180, "slider arrow may repeat");

    pointerDown(tree, model, ui, {800, 252});
    setVisible(tree, built.group, false, ui);
    check(ui.active == 0 && ui.focus == 0 && find(*tree.root, built.slider), "hide cancels ownership without deleting");
    setVisible(tree, built.group, true, ui);
    pointerDown(tree, model, ui, {800, 252});
    const WidgetId next = tree.nextId;
    check(removeSubtree(tree, built.group, ui), "delete branch");
    check(tree.count == 3 && ui.active == 0 && ui.focus == 0 && !find(*tree.root, built.slider), "delete all descendants and stale IDs");
    const WidgetId label = add(tree, 1, Kind::Label, {0, 0, 20, 20});
    check(label == next && !removeSubtree(tree, 1, ui), "IDs never recycled and root protected");
    check(audit(tree, ui) == 4, "audit after mutation");

    const int count = tree.count;
    const WidgetId nextBefore = tree.nextId;
    bool rejected = false;
    try {
        add(tree, label, Kind::Label, {0, 0, 1, 1});
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected && tree.count == count && tree.nextId == nextBefore, "non-panel parent rejected atomically");
    rejected = false;
    try {
        add(tree, 1, Kind::Label, {std::numeric_limits<double>::quiet_NaN(), 0, 1, 1});
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected && tree.nextId == nextBefore, "invalid geometry rejected before mutation");
    while (tree.count < maxWidgets)
        add(tree, 1, Kind::Label, {0, 0, 1, 1});
    rejected = false;
    try {
        add(tree, 1, Kind::Label, {0, 0, 1, 1});
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected, "node cap");
    Tree deep;
    WidgetId parent = 1;
    for (int depth = 0; depth < 6; ++depth)
        parent = add(deep, parent, Kind::Panel, {0, 0, 1, 1});
    rejected = false;
    try {
        add(deep, parent, Kind::Label, {0, 0, 1, 1});
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected, "depth cap");

    auto retained = buildTree();
    const Widget* rootAddress = retained.tree.root.get();
    const WidgetId lastId = retained.tree.nextId;
    setPaused(model, false);
    for (int frame = 0; frame < 1000; ++frame) {
        paintList(retained.tree);
        hitTest(retained.tree, {700, 90});
        advance(model, fixedDt);
    }
    resetSimulation(model);
    check(retained.tree.root.get() == rootAddress && retained.tree.nextId == lastId && audit(retained.tree, Ui{}) == 9, "retained state survives render/query/physics/reset");
    rejected = false;
    ui.focus = 999;
    try {
        audit(retained.tree, ui);
    } catch (const std::runtime_error&) {
        rejected = true;
    }
    check(rejected, "audit catches stale focus");

    if (failures != 0)
        return EXIT_FAILURE;
    std::cout << "PASS widget tree: ownership, coordinates, clipping, picking, input and lifetime\n";
    return EXIT_SUCCESS;
}
