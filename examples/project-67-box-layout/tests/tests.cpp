#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Không dùng assert: Release/NDEBUG vẫn phải thực thi tất cả điều kiện.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}
} // namespace

int main() {
    using namespace lab;
    LayoutState state;
    Ui ui;
    Model model;
    ensureLayout(state, ui);
    const auto group = locate(state.scene.tree, state.scene.group);
    const auto pause = locate(state.scene.tree, state.scene.pause);
    check(group && group->bounds.height == 252, "Group auto height = 28 + 192 + 32");
    check(pause && pause->bounds.x == 656 && pause->bounds.y == 96 && pause->bounds.width == 240 && pause->bounds.height == 36, "independent nested world fixture");
    check(state.sizes.at(1).naturalHeight == 360 && state.scene.tree.root->local.height == 492, "natural height is not fixed height");
    check(auditLayout(state) == 9, "valid initial state");

    // Ẩn bỏ một outer height 44 và một gap 8; hiện lại phục hồi Rect.
    const Rect sliderBefore = find(*state.scene.tree.root, state.scene.slider)->local;
    toggleReset(state, ui);
    ensureLayout(state, ui);
    check(state.sizes.at(state.scene.group).height == 200, "hidden removes margins and one gap");
    check(find(*state.scene.tree.root, state.scene.slider)->local.y == sliderBefore.y - 52, "following children move automatically");
    toggleReset(state, ui);
    ensureLayout(state, ui);
    check(find(*state.scene.tree.root, state.scene.slider)->local.y == sliderBefore.y, "show restores layout");

    // Measure không sửa geometry; Panel rỗng/một child không có gap.
    LayoutState custom;
    auto* customGroup = find(*custom.scene.tree.root, custom.scene.group);
    for (const auto& child : customGroup->children)
        child->visible = false;
    Measures sizes;
    const Size empty = measure(*customGroup, 284, custom.scene.styles, sizes);
    check(empty.height == 28, "empty Panel has only insets");
    Widget* only = find(*custom.scene.tree.root, custom.scene.pause);
    only->visible = true;
    const Rect oldRect = only->local;
    custom.scene.styles.at(only->id).margin = {3, 7, 9, 11};
    sizes.clear();
    const Size single = measure(*customGroup, 284, custom.scene.styles, sizes);
    check(single.height == 82 && sizes.at(only->id).width == 236, "asymmetric edges and no single-child gap");
    check(only->local.x == oldRect.x && only->local.y == oldRect.y, "measure does not arrange");
    const Rect content = contentBox({10, 20, 100, 60}, BoxStyle{});
    check(content.x == 15 && content.y == 25 && content.width == 90 && content.height == 50, "independent content box");

    // Mutation dọn Style/ID; xóa không lùi nextId để dùng lại ID.
    for (int n = 0; n < 4; ++n)
        check(appendLabel(state, ui), "append within cap");
    check(!appendLabel(state, ui), "reject fifth extra Label");
    ensureLayout(state, ui);
    check(state.sizes.at(1).naturalHeight == 520 && state.sizes.at(state.scene.group).height == 412, "vertical overflow is not shrink");
    const WidgetId removed = state.extras.back();
    const WidgetId idBefore = state.scene.tree.nextId;
    check(removeLabel(state, ui), "remove last Label");
    check(!state.scene.styles.contains(removed) && !find(*state.scene.tree.root, removed), "style and owner removed together");
    appendLabel(state, ui);
    check(state.extras.back() == idBefore, "new ID does not reuse removed ID");
    while (removeLabel(state, ui)) {
    }
    ensureLayout(state, ui);

    // Core hủy active khi geometry đổi; capture của hệ điều hành thuộc host.
    const auto slider = locate(state.scene.tree, state.scene.slider);
    pointerDown(state.scene.tree, model, ui, {slider->bounds.x + 120, slider->bounds.y + 10});
    check(ui.active == state.scene.slider && model.gravity == 600, "slider begins at old geometry");
    setWidth(state, ui, 220);
    check(ui.active == 0 && state.dirty, "resize cancels old gesture before layout");
    const double gravity = model.gravity;
    ensureLayout(state, ui);
    pointerUp(state.scene.tree, model, ui, {1200, 250});
    check(model.gravity == gravity, "orphan release does not apply old sample");
    const auto narrow = locate(state.scene.tree, state.scene.slider);
    check(narrow && narrow->bounds.x == 756 && narrow->bounds.width == 140, "input sees new Fill geometry before draw");
    pointerDown(state.scene.tree, model, ui, {826, narrow->bounds.y + 10});
    pointerUp(state.scene.tree, model, ui, {826, narrow->bounds.y + 10});
    check(model.gravity == 600, "new slider midpoint after resize");
    setOverflow(state, ui, true);
    ensureLayout(state, ui);
    const auto overflow = locate(state.scene.tree, state.scene.slider);
    check(overflow && overflow->bounds.width == 320 && overflow->clip.width == 158, "fixed bounds are not clip bounds");
    check(hitTest(state.scene.tree, {920, overflow->bounds.y + 10}) != state.scene.slider, "clipped area cannot start drag");
    pointerDown(state.scene.tree, model, ui, {836, overflow->bounds.y + 10});
    check(model.gravity == 300, "mapping divides full bounds width not clip");
    pointerUp(state.scene.tree, model, ui, {1200, overflow->bounds.y + 10});
    check(model.gravity == 1200 && ui.active == 0, "captured final release clamps outside viewport");

    // Gravity/ticks/Reset không làm dirty layout hoặc dựng lại cây.
    const int passes = state.passes;
    const Widget* rootAddress = state.scene.tree.root.get();
    const WidgetId nextId = state.scene.tree.nextId;
    setPaused(model, false);
    for (int frame = 0; frame < 1000; ++frame) {
        ensureLayout(state, ui);
        paintList(state.scene.tree);
        advance(model, fixedDt);
    }
    check(state.passes == passes && state.scene.tree.root.get() == rootAddress && state.scene.tree.nextId == nextId, "1000 frames retain layout and ownership");
    check(setWidth(state, ui, 220) && !state.dirty, "same constraint is a no-op");
    check(!setWidth(state, ui, std::numeric_limits<double>::quiet_NaN()) && !state.dirty, "invalid width is atomic");
    check(!setSpacing(state, ui, -1, 16) && !state.dirty, "invalid gap rejected before mutation");
    resetSimulation(model);
    check(state.passes == passes, "physics reset does not rebuild layout");

    // Zero width là output hợp lệ của Fill nhưng không vẽ/hit được.
    setOverflow(state, ui, false);
    setSpacing(state, ui, 8, 48);
    state.scene.styles.at(state.scene.slider).margin = {64, 4, 64, 4};
    invalidate(state, ui);
    ensureLayout(state, ui);
    check(find(*state.scene.tree.root, state.scene.slider)->local.width == 0, "Fill clamps to zero not negative");
    check(!locate(state.scene.tree, state.scene.slider), "zero-width control is not visible or hittable");

    // Uniform setter phải sửa cả bốn cạnh, kể cả khi cạnh trái đã đúng.
    state.scene.styles.at(1).padding.right = 40;
    setSpacing(state, ui, 8, 48);
    check(state.dirty && state.scene.styles.at(1).padding.right == 48, "uniform padding compares all four edges");
    ensureLayout(state, ui);

    if (failures != 0)
        return EXIT_FAILURE;
    std::cout << "PASS box layout: measure, arrange, flow, cache, overflow and input\n";
    return EXIT_SUCCESS;
}
