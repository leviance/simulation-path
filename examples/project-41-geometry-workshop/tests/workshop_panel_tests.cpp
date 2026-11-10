#include "test_support.hpp"
#include "workshop_layout.hpp"

#include <limits>

namespace {

using geometry::ParameterId;
using geometry::SurfaceKind;
using geometry::UiRect;
using geometry_tests::require;

void checkBox(const UiRect& rect, const UiRect& panel) {
    require(rect.width > 0 && rect.height > 0, "Every control has a clickable area");
    require(panel.contains(rect.x, rect.y), "Control starts inside the panel");
    require(panel.contains(rect.x + rect.width - 0.1F, rect.y + rect.height - 0.1F), "Control stays inside the panel at the smallest window size");
    require(rect.contains(rect.x, rect.y) && !rect.contains(rect.x + rect.width, rect.y), "Neighboring hit rectangles have no ambiguous shared edge");
}

void testPanelLayout(int width, int height) {
    const auto layout = geometry::layoutWorkshop(width, height);
    for (const auto& box : layout.presets)
        checkBox(box, layout.panel);
    for (const auto& box : layout.sliders)
        checkBox(box, layout.panel);
    for (const auto& box : layout.display)
        checkBox(box, layout.panel);
    checkBox(layout.reset, layout.panel);
    checkBox(layout.cancel, layout.panel);
    checkBox(layout.exportMesh, layout.panel);
    require(layout.sliders.back().y + layout.sliders.back().height < layout.display.front().y, "Slider tracks stay above display buttons");
    const int atOne = geometry::scenePixelWidth(layout, width, width);
    const int atTwo = geometry::scenePixelWidth(layout, width, 2 * width);
    require(std::abs(atTwo - 2 * atOne) <= 1, "Viewport boundary follows drawable DPI");
    require(!layout.panel.contains(layout.panel.x - 1.0F, 10), "Camera region remains distinct from panel");
}

} // namespace

void runWorkshopPanelTests() {
    testPanelLayout(740, 600);
    testPanelLayout(1200, 800);
    testPanelLayout(1920, 1080);
    for (const auto kind : geometry::panelPresets) {
        const auto defaults = geometry::presetSettings(kind);
        const auto controls = geometry::shapeParameters(defaults);
        require(controls.count >= 3 && controls.count <= geometry::maxShapeParameters, "Each preset has a bounded panel");
        for (int index = 0; index < controls.count; ++index) {
            for (const double fraction : {-0.8, 0.0, 0.21, 0.5, 0.93, 1.0, 2.0}) {
                auto candidate = defaults;
                require(geometry::applyParameter(candidate, controls.items[index].id, fraction), "Every visible slider maps to a valid parameter");
                geometry::validateSettings(candidate);
            }
        }
        auto changed = defaults;
        require(geometry::applyParameter(changed, ParameterId::resolution, 1.0), "Resolution track can reach 256");
        require(changed.uSegments == 256 && changed.vSegments == 256, "Maximum resolution remains available");
        require(!geometry::applyParameter(changed, ParameterId::radius, std::numeric_limits<double>::quiet_NaN()), "Invalid pointer values do not mutate requested settings");
    }
    auto mobius = geometry::presetSettings(SurfaceKind::mobius);
    geometry::applyParameter(mobius, ParameterId::twist, 0.5);
    require(mobius.halfTwists == 3, "Mobius slider snaps to odd half twists");
    auto knot = geometry::presetSettings(SurfaceKind::knot);
    geometry::applyParameter(knot, ParameterId::twist, 0.74);
    require(knot.sectionTurns == 1.0, "Knot slider snaps to whole section turns");
    require(!geometry::applyParameter(knot, ParameterId::growth, 0.5), "A hidden shell slider cannot alter the knot");
}
