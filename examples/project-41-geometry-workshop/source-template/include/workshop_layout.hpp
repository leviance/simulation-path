#pragma once

#include "workshop_parameters.hpp"

namespace geometry {

// Draw and hit-test the panel with the same rectangles in logical window coordinates.
struct UiRect {
    float x{};
    float y{};
    float width{};
    float height{};

    bool contains(float px, float py) const {
        return px >= x && px < x + width && py >= y && py < y + height;
    }
};

struct WorkshopLayout {
    float scale{};
    UiRect panel;
    std::array<UiRect, 4> presets;
    std::array<UiRect, maxShapeParameters> sliders;
    std::array<UiRect, 4> display;
    UiRect reset;
    UiRect cancel;
    UiRect exportMesh;
};

#if LAB_CHECKPOINT >= 6
inline constexpr std::array panelPresets{SurfaceKind::torus, SurfaceKind::shell, SurfaceKind::mobius, SurfaceKind::knot};
#elif LAB_CHECKPOINT >= 5
inline constexpr std::array panelPresets{SurfaceKind::patch, SurfaceKind::torus, SurfaceKind::mobius, SurfaceKind::shell};
#elif LAB_CHECKPOINT >= 4
inline constexpr std::array panelPresets{SurfaceKind::patch, SurfaceKind::torus, SurfaceKind::mobius};
#elif LAB_CHECKPOINT >= 3
inline constexpr std::array panelPresets{SurfaceKind::patch, SurfaceKind::torus};
#else
inline constexpr std::array panelPresets{SurfaceKind::patch};
#endif

enum class PanelView { wireframe, uv, vectors, seams };

#if LAB_CHECKPOINT >= 3
inline constexpr std::array panelViews{PanelView::wireframe, PanelView::uv, PanelView::vectors, PanelView::seams};
#elif LAB_CHECKPOINT >= 2
inline constexpr std::array panelViews{PanelView::wireframe, PanelView::vectors};
#elif LAB_CHECKPOINT >= 1
inline constexpr std::array panelViews{PanelView::vectors};
#else
inline constexpr std::array<PanelView, 0> panelViews{};
#endif

inline WorkshopLayout layoutWorkshop(int width, int height) {
    WorkshopLayout layout{};
    const float w = static_cast<float>(width);
    const float h = static_cast<float>(height);
    const float scale = std::clamp(h / 800.0F, 0.70F, 1.0F);
    const float panelWidth = std::min(w * 0.45F, 344.0F);
    layout.scale = scale;
    layout.panel = {w - panelWidth, 0, panelWidth, h};
    const float padding = 16.0F * scale;
    const float left = layout.panel.x + padding;
    const float innerWidth = panelWidth - 2.0F * padding;
    const float gap = 6.0F * scale;
    const float presetWidth = (innerWidth - gap) / 2.0F;
    for (int index = 0; index < 4; ++index) {
        const float x = left + static_cast<float>(index % 2) * (presetWidth + gap);
        const float y = (72.0F + static_cast<float>(index / 2) * 34.0F) * scale;
        layout.presets[index] = {x, y, presetWidth, 29.0F * scale};
    }
    for (int index = 0; index < maxShapeParameters; ++index) {
        layout.sliders[index] = {left, (284.0F + static_cast<float>(index) * 43.0F) * scale, innerWidth, 20.0F * scale};
    }
    const float displayWidth = (innerWidth - 3.0F * gap) / 4.0F;
    for (int index = 0; index < 4; ++index) {
        const float x = left + static_cast<float>(index) * (displayWidth + gap);
        layout.display[index] = {x, 571.0F * scale, displayWidth, 29.0F * scale};
    }
    const float actionWidth = (innerWidth - 2.0F * gap) / 3.0F;
    layout.reset = {left, 671.0F * scale, actionWidth, 34.0F * scale};
    layout.cancel = {left + actionWidth + gap, layout.reset.y, actionWidth, layout.reset.height};
    layout.exportMesh = {layout.cancel.x + actionWidth + gap, layout.reset.y, actionWidth, layout.reset.height};
    return layout;
}

inline int scenePixelWidth(const WorkshopLayout& layout, int logicalWidth, int drawableWidth) {
    const double fraction = layout.panel.x / static_cast<double>(logicalWidth);
    return std::clamp(static_cast<int>(std::lround(fraction * drawableWidth)), 1, drawableWidth);
}

} // namespace geometry
