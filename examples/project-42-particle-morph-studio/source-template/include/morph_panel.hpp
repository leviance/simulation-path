#pragma once

#include "morph_overlay.hpp"
#include "morph_renderer.hpp"
#include <iomanip>
#include <sstream>

namespace morph {

struct PanelLayout {
    UiRect panel;
    std::array<UiRect, 3> source;
    std::array<UiRect, 3> target;
    std::array<UiRect, 5> rows;
    UiRect apply;
    UiRect cancel;
    UiRect timeline;
    std::array<UiRect, 3> transport;
    std::array<UiRect, 5> views;
};

inline PanelLayout panelLayout(int width, int height) {
    const float panelWidth = std::min(356.0F, width * 0.43F);
    const float left = width - panelWidth + 14.0F;
    const float inner = panelWidth - 28.0F;
    PanelLayout layout{};
    layout.panel = {width - panelWidth, 0, panelWidth, static_cast<float>(height)};
    for (int index = 0; index < 3; ++index) {
        const float x = left + index * (inner + 5.0F) / 3.0F;
        layout.source[index] = {x, 178, (inner - 10) / 3, 25};
        layout.target[index] = {x, 222, (inner - 10) / 3, 25};
        layout.transport[index] = {x, 440, (inner - 10) / 3, 26};
    }
    for (int row = 0; row < 5; ++row)
        layout.rows[row] = {left, 260.0F + row * 25.0F, inner, 23};
    layout.apply = {left, 389, (inner - 6) / 2, 27};
    layout.cancel = {left + (inner + 6) / 2, 389, (inner - 6) / 2, 27};
    layout.timeline = {left, 493, inner, 18};
    for (int index = 0; index < 5; ++index)
        layout.views[index] = {left + index * (inner + 3) / 5, 523, (inner - 12) / 5, 25};
    return layout;
}

inline std::string number(double value, int precision = 2) {
    std::ostringstream output;
    output << std::fixed << std::setprecision(precision) << value;
    return output.str();
}
inline std::string matchingName(Matching matching) {
    if (matching == Matching::spatial)
        return "SPATIAL";
    return "RANDOM";
}

struct PanelStatus {
    double uploadMs{};
    double updateMs{};
    double drawMs{};
    double frameMs{};
    bool timersReady{};
    std::uint32_t updated{};
    std::uint32_t drawn{};
};

inline void drawPanel(Overlay &ui, const PanelLayout &layout, const Settings &staged, const PreparationSession &session, const Timeline &timeline, const View &view, int selectedRow, const PanelStatus &status, std::string_view message) {
    const float left = layout.panel.x + 14;
    const float inner = layout.panel.width - 28;
    const Vec3 text{0.81, 0.88, 0.94};
    const Vec3 muted{0.47, 0.59, 0.69};
    const Vec3 accent{0.27, 0.86, 0.82};
    ui.rect(layout.panel, {0.035, 0.052, 0.079});
    const auto label = [&](float y, std::string_view value, Vec3 tint = Vec3{0.81, 0.88, 0.94}) {
        ui.text(left, y, value, tint, 1.35F, inner);
    };
    const auto button = [&](UiRect box, std::string_view title, bool active) {
        Vec3 background{0.075, 0.115, 0.155};
        if (active)
            background = {0.06, 0.25, 0.25};
        ui.rect(box, background);
        ui.text(box.x + 6, box.y + 8, title, text, 1.15F, box.width - 9);
    };
    label(17, "PROJECT 42 / PARTICLE MORPH", accent);
#if LAB_CHECKPOINT >= 7
    label(39, "GPU UPDATE / SSBO DRAW", text);
#elif LAB_CHECKPOINT >= 6
    label(39, "CPU UPDATE / SSBO DRAW", text);
#else
    label(39, "CPU PREVIEW / NO PHYSICS", text);
#endif
    if (session.active()) {
        const auto &data = *session.active();
        label(64, "ACTIVE " + std::string(shapeName(data.settings.source)) + " TO " + std::string(shapeName(data.settings.target)));
        label(83, "N " + std::to_string(data.settings.count) + " / GEN " + std::to_string(data.generation), accent);
        label(103, "CPU SET " + number(data.setupMs) + " S " + number(data.samplingMs) + " M " + number(data.matchingMs) + " MS", muted);
    } else
        label(66, "NO ACTIVE / PREPARING", muted);
    label(124, "DRAW " + std::to_string(status.drawn) + " UPDATE " + std::to_string(status.updated));
    label(151, "STAGED SOURCE / NOT ACTIVE", muted);
    for (int index = 0; index < 3; ++index) {
        const auto shape = static_cast<Shape>(index);
        button(layout.source[index], shapeName(shape), staged.source == shape);
        button(layout.target[index], shapeName(shape), staged.target == shape);
    }
    label(208, "STAGED TARGET", muted);
    const std::array<std::string, 5> rows{
        "N " + std::to_string(staged.count),
        "SEED " + std::to_string(staged.seed),
        "SAMPLING AREA",
        "MATCH " + matchingName(view.matching),
        "EASING LINEAR / PATH STRAIGHT",
    };
    for (int row = 0; row < 5; ++row) {
        std::string value = rows[row];
        if (row == 2 && staged.sampling == Sampling::triangleBiased)
            value = "SAMPLING TRIANGLE BIASED";
        if (row == 4) {
            value = "LINEAR";
            if (view.easing == Easing::smooth)
                value = "SMOOTH";
            value += " / STRAIGHT";
            if (view.path == Path::arc) {
                value = "LINEAR / ARC";
                if (view.easing == Easing::smooth)
                    value = "SMOOTH / ARC";
            }
            if (view.path == Path::flow) {
                value = "LINEAR / FLOW";
                if (view.easing == Easing::smooth)
                    value = "SMOOTH / FLOW";
            }
        }
        button(layout.rows[row], value, row == selectedRow);
    }
    button(layout.apply, "ENTER APPLY", false);
    button(layout.cancel, "X CANCEL", false);
    button(layout.transport[0], "SPACE PLAY", !timeline.paused);
    button(layout.transport[1], "REVERSE", timeline.reverse);
    button(layout.transport[2], "R RESET", false);
    label(478, "MODEL T " + number(timeline.normalized(), 3) + " / " + number(timeline.duration, 1) + " S");
    ui.rect(layout.timeline, {0.10, 0.17, 0.22});
    ui.rect({layout.timeline.x, layout.timeline.y, static_cast<float>(timeline.normalized()) * layout.timeline.width, layout.timeline.height}, {0.07, 0.42, 0.43});
    button(layout.views[0], "M A/B", view.matching == Matching::spatial);
    button(layout.views[1], "E EASE", view.easing == Easing::smooth);
    button(layout.views[2], "C PATH", view.path != Path::straight);
    button(layout.views[3], "H HEAT", view.heatmap);
    button(layout.views[4], "P PATH", view.paths);
    label(562, "16 TRIANGLE HEIGHT GROUPS", muted);
#if LAB_CHECKPOINT >= 3
    if (session.active()) {
        const auto &data = *session.active();
        double maximum = 1;
        for (std::size_t bin = 0; bin < histogramBins; ++bin)
            maximum = std::max(maximum, std::max(data.expected[bin] * data.settings.count, static_cast<double>(data.observed[bin])));
        const float spacing = inner / static_cast<float>(histogramBins);
        for (std::size_t bin = 0; bin < histogramBins; ++bin) {
            const float x = left + static_cast<float>(bin) * spacing;
            const float expected = static_cast<float>(data.expected[bin] * data.settings.count / maximum) * 35;
            const float observed = static_cast<float>(data.observed[bin] / maximum) * 35;
            ui.rect({x, 609 - expected, spacing * 0.4F, expected}, {0.10, 0.57, 0.64});
            ui.rect({x + spacing * 0.45F, 609 - observed, spacing * 0.4F, observed}, {0.96, 0.43, 0.19});
        }
    }
#endif
    label(615, "TEAL AREA / ORANGE SAMPLES", muted);
    label(637, "UPLOAD SUBMIT " + number(status.uploadMs) + " MS", muted);
    if (status.timersReady)
        label(655, "LAST UP " + number(status.updateMs, 3) + " DRAW " + number(status.drawMs, 3) + " MS");
    else
        label(655, "GPU TIMERS PENDING / NOT ZERO", muted);
    label(674, "FRAME " + number(status.frameMs) + " MS / 32 PATHS MAX", muted);
    std::string state = std::string(message);
    if (session.busy())
        state = "PREPARING PHASE " + std::to_string(session.phase()) + " / X CANCEL";
    if (!session.error().empty())
        state = session.error();
    label(697, state, accent);
    label(724, "TAB ROW / LEFT RIGHT / ENTER", muted);
    label(744, "LEFT ORBIT / RIGHT PAN / WHEEL ZOOM", muted);
    label(764, "IJKL CAMERA / PGUP PGDOWN ZOOM", muted);
}

} // namespace morph
