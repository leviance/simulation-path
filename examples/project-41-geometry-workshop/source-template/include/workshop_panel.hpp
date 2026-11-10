#pragma once

#include "workshop_overlay.hpp"

#include <charconv>

namespace geometry {

// The panel reads the displayed mesh and the editing settings separately.
inline constexpr Vec3 panelInk{0.89, 0.93, 0.98};
inline constexpr Vec3 panelMuted{0.53, 0.65, 0.75};
inline constexpr Vec3 panelAccent{0.44, 0.88, 0.76};
inline constexpr Vec3 panelOrange{0.98, 0.71, 0.41};

inline const char* shortPresetName(SurfaceKind kind) {
    if (kind == SurfaceKind::patch)
        return "PATCH";
    if (kind == SurfaceKind::shell)
        return "SHELL";
    if (kind == SurfaceKind::knot)
        return "KNOT";
    return presetName(kind);
}

inline const char* panelViewName(PanelView control) {
    if (control == PanelView::wireframe)
        return "WIRE";
    if (control == PanelView::uv)
        return "UV";
    if (control == PanelView::vectors)
        return "N + T";
    return "SEAM";
}

inline bool panelViewActive(const ViewOptions& view, PanelView control) {
    if (control == PanelView::wireframe)
        return view.wireframe;
    if (control == PanelView::uv)
        return view.uv;
    if (control == PanelView::vectors)
        return view.normals;
    return view.seams;
}

inline std::string formatParameter(double value, int decimals) {
    std::array<char, 32> digits{};
    const auto converted = std::to_chars(digits.data(), digits.data() + digits.size(), value, std::chars_format::fixed, decimals);
    if (converted.ec != std::errc{})
        return "-";
    return {digits.data(), converted.ptr};
}

inline void panelButton(WorkshopOverlay& overlay, const UiRect& box, std::string_view label, float scale, bool active, bool available = true) {
    Vec3 fill{0.12, 0.18, 0.24};
    Vec3 text = panelInk;
    if (active) {
        fill = {0.11, 0.31, 0.31};
        text = panelAccent;
    }
    if (!available) {
        fill = {0.085, 0.12, 0.17};
        text = panelMuted;
    }
    overlay.rect(box, fill);
    const float pixel = 1.4F * scale;
    const float textWidth = static_cast<float>(label.size()) * 6.0F * pixel;
    const float padding = std::max(4.0F * scale, 0.5F * (box.width - textWidth));
    overlay.text(box.x + padding, box.y + 0.5F * (box.height - 7.0F * pixel), label, text, pixel, box.width - padding);
}

inline void drawWorkshopPanel(WorkshopOverlay& overlay, const WorkshopLayout& layout, const MeshSession& session, const SurfaceSettings& editing, const ViewOptions& view, std::string_view message) {
    const float scale = layout.scale;
    const float left = layout.reset.x;
    const float width = layout.sliders.front().width;
    const float body = 1.42F * scale;
    overlay.rect(layout.panel, {0.064, 0.092, 0.132});
    overlay.rect({layout.panel.x, 0, 1, layout.panel.height}, {0.19, 0.25, 0.31});
    overlay.text(left, 20 * scale, "PROJECT 41 / MESH LAB", panelAccent, body, width);
    overlay.text(left, 42 * scale, "GEOMETRY WORKSHOP", panelInk, 1.95F * scale, width);

    for (std::size_t index = 0; index < panelPresets.size(); ++index) {
        const SurfaceKind preset = panelPresets[index];
        const std::string label = std::to_string(index + 1) + " " + shortPresetName(preset);
        panelButton(overlay, layout.presets[index], label, scale, editing.kind == preset);
    }

    const Mesh* shown = session.displayedMesh();
    if (shown) {
        std::string headline = "SHOWING ";
        headline += presetName(shown->settings.kind);
        if (session.showingPreview())
            headline += " / PREVIEW";
        overlay.text(left, 151 * scale, headline, panelInk, body, width);
        const std::string counts = std::to_string(shown->vertices.size()) + " VERTS / " +
            std::to_string(shown->indices.size() / 3) + " TRIS";
        overlay.text(left, 172 * scale, counts, panelAccent, body, width);
        const std::string bytes = std::to_string(shown->payloadBytes()) + " PAYLOAD BYTES";
        overlay.text(left, 190 * scale, bytes, panelMuted, body, width);
    } else {
        overlay.text(left, 151 * scale, "NO MESH YET", panelMuted, body, width);
    }

    const bool busy = session.requested().has_value();
    if (busy) {
        std::string status;
        if (session.waitingForRelease())
            status = "DRAG / RELEASE TO REFINE";
        else {
            status = "BUILD " + std::string(presetName(session.requested()->kind)) + " ";
            status += std::to_string(session.completedRows()) + "/" + std::to_string(session.totalRows());
        }
        overlay.text(left, 214 * scale, status, panelOrange, body, width);
        overlay.rect({left, 233 * scale, width, 3 * scale}, {0.16, 0.22, 0.28});
        if (!session.waitingForRelease()) {
            const float progress = static_cast<float>(session.completedRows()) /
                static_cast<float>(std::max(1, session.totalRows()));
            overlay.rect({left, 233 * scale, width * progress, 3 * scale}, panelOrange);
        }
    } else if (shown) {
        overlay.text(left, 214 * scale, "MESH READY", panelMuted, body, width);
    } else {
        overlay.text(left, 214 * scale, "NO COMPLETE MESH", panelOrange, body, width);
    }

    const ParameterList controls = shapeParameters(editing);
    overlay.text(left, 251 * scale, "SHAPE / REQUESTED VALUES", panelMuted, body, width);
    for (int index = 0; index < controls.count; ++index) {
        const ParameterControl& control = controls.items[index];
        const UiRect& track = layout.sliders[index];
        std::string value = formatParameter(control.value, control.decimals);
        if (control.id == ParameterId::resolution)
            value += " X " + std::to_string(editing.vSegments);
        const float labelWidth = static_cast<float>(value.size()) * 6.0F * body;
        overlay.text(track.x, track.y - 10.0F * scale, control.label, panelInk, body, track.width - labelWidth - 8);
        overlay.text(track.x + track.width - labelWidth, track.y - 10.0F * scale, value, panelAccent, body, labelWidth);
        const float y = track.y + 0.5F * track.height;
        const float filled = static_cast<float>(std::clamp(control.fraction(), 0.0, 1.0)) * track.width;
        overlay.rect({track.x, y, track.width, 4 * scale}, {0.18, 0.24, 0.30});
        overlay.rect({track.x, y, filled, 4 * scale}, {0.29, 0.62, 0.58});
        overlay.rect({track.x + filled - 3 * scale, y - 4 * scale, 6 * scale, 12 * scale}, panelAccent);
    }

    overlay.text(left, 550 * scale, "DISPLAY / DOES NOT REBUILD", panelMuted, body, width);
    for (std::size_t index = 0; index < panelViews.size(); ++index) {
        const PanelView control = panelViews[index];
        panelButton(overlay, layout.display[index], panelViewName(control), scale, panelViewActive(view, control));
    }
    if (!message.empty()) {
        const std::size_t columns = static_cast<std::size_t>(width / (6.0F * body));
        if (columns > 0) {
            std::size_t offset = 0;
            for (int line = 0; line < 2 && offset < message.size(); ++line) {
                const auto slice = message.substr(offset, columns);
                overlay.text(left, (620.0F + 16.0F * static_cast<float>(line)) * scale, slice, panelOrange, body, width);
                offset += slice.size();
            }
        }
    } else if (view.normals) {
        overlay.text(left, 620 * scale, "TEAL NORMAL / GOLD TANGENT", panelMuted, body, width);
    }
    panelButton(overlay, layout.reset, "RESET", scale, false);
#if LAB_CHECKPOINT >= 7
    panelButton(overlay, layout.cancel, "CANCEL", scale, false, busy);
#endif
#if LAB_CHECKPOINT >= 8
    panelButton(overlay, layout.exportMesh, "EXPORT OBJ", scale, shown && !busy, shown && !busy);
#endif
    overlay.text(left, 730 * scale, "TAB PANEL / B GRID", panelMuted, body, width);
    overlay.text(left, 752 * scale, "LEFT ORBIT / RIGHT PAN / WHEEL ZOOM", panelMuted, 1.23F * scale, width);
}

} // namespace geometry
