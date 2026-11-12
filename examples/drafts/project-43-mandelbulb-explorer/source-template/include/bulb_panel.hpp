#pragma once
#include "bulb_overlay.hpp"
#include "bulb_jobs.hpp"
#include <iomanip>
#include <sstream>

namespace bulb {

inline std::string number(double value, int precision = 3) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(precision) << value;
    return text.str();
}
struct PanelLayout {
    UiRect panel;
    std::array<UiRect, 9> rows;
    std::array<UiRect, 3> presets;
    std::array<UiRect, 5> buttons;
};
inline PanelLayout panelLayout(int width, int height) {
    PanelLayout result;
    result.panel = {static_cast<float>(width - 310), 0, 310, static_cast<float>(height)};
    const float left = result.panel.x + 14;
    for (int row = 0; row < 9; ++row)
        result.rows[row] = {left, 109.0F + row * 25.0F, 282, 23};
    for (int id = 0; id < 3; ++id)
        result.presets[id] = {left + id * 95.0F, 352, 91, 25};
    for (int id = 0; id < 5; ++id)
        result.buttons[id] = {left + (id % 2) * 144.0F, 391.0F + (id / 2) * 32.0F, 138, 27};
    return result;
}
inline void drawPanel(Overlay &ui, const PanelLayout &layout, const RenderPlan &plan, Settings staged, int selected, int view, double kernelMs, double submitMs, double imageGpuMs, std::string_view error) {
    const float left = layout.panel.x + 14;
    const Vec3 muted{0.48, 0.60, 0.71}, text{0.83, 0.89, 0.94}, accent{0.30, 0.88, 0.80};
    ui.rect(layout.panel, {0.035, 0.055, 0.08});
    const auto label = [&](float y, std::string_view s, Vec3 color = Vec3{0.83, 0.89, 0.94}) { ui.text(left, y, s, color, 1.4F, 282); };
    label(18, "PROJECT 43 / MANDELBULB", accent);
    std::uint32_t active = 0;
    if (plan.active())
        active = plan.active()->generation;
    label(43, "ACTIVE " + std::to_string(active) + " / REQUEST " + std::to_string(plan.requested().generation));
    std::string state = "PREVIEW 120 X 68";
    if (plan.complete())
        state = "COMPLETE 960 X 540";
#if LAB_CHECKPOINT < 7
    state = "PREVIEW ONLY / LEARNING STAGE";
#endif
    if (plan.needsPreview())
        state = "PREPARING NEW PREVIEW";
    else if (plan.cancelled())
        state = "CANCELLED / KEEP ACTIVE";
    else if (plan.paused())
        state = "REFINEMENT PAUSED";
    label(65, state, accent);
    label(87, "LEFT - / RIGHT + / TAB ROW", muted);
    const std::array<std::string, 9> values{
        "POWER " + std::to_string(staged.power), "BAILOUT " + number(staged.bailout, 1), "ORBIT LIMIT " + std::to_string(staged.iterations),
        "RAY LIMIT " + std::to_string(staged.raySteps), "HIT EPS " + number(staged.epsilon, 5), "NORMAL H " + number(staged.normalStep, 5),
        "SAMPLES " + std::to_string(staged.samples), "PALETTE " + std::to_string(staged.palette), "SAFETY " + number(staged.safety, 2)};
    for (int row = 0; row < 9; ++row) {
        Vec3 background{0.07, 0.10, 0.14};
        if (selected == row)
            background = {0.06, 0.22, 0.24};
        ui.rect(layout.rows[row], background);
        ui.text(left + 7, layout.rows[row].y + 7, values[row], text, 1.35F, 268);
    }
    const std::array<std::string, 3> presets{"1 OVERVIEW", "2 POWER 6", "3 DETAIL"};
    for (int id = 0; id < 3; ++id) {
        ui.rect(layout.presets[id], {0.08, 0.14, 0.19});
        ui.text(layout.presets[id].x + 6, layout.presets[id].y + 8, presets[id], text, 1.3F, 83);
    }
    const std::array<std::string, 5> buttons{"SPACE PAUSE", "X CANCEL", "ENTER RESTART", "F SHOWCASE", "H VIEW " + std::to_string(view)};
    for (int id = 0; id < 5; ++id) {
        ui.rect(layout.buttons[id], {0.08, 0.14, 0.19});
        ui.text(layout.buttons[id].x + 7, layout.buttons[id].y + 8, buttons[id], text, 1.3F, 125);
    }
    const auto &counts = plan.finalCounters();
    label(505, "FINAL SAMPLES " + std::to_string(counts.samples));
    label(527, "HIT " + std::to_string(counts.hits) + " MISS " + std::to_string(counts.misses));
    label(549, "BUDGET " + std::to_string(counts.budget) + " INSIDE " + std::to_string(counts.inside));
    label(571, "INVALID " + std::to_string(counts.invalid) + " NORMAL FB " + std::to_string(counts.fallbacks));
    label(595, "RAY STEPS " + std::to_string(counts.steps));
    label(617, "ORBIT WORK " + std::to_string(counts.iterations));
    label(643, "LAST KERNEL " + number(kernelMs) + " MS", accent);
    label(665, "SUBMIT CPU " + number(submitMs) + " MS", muted);
    label(687, "IMAGE GPU SUM " + number(imageGpuMs, 1) + " MS", muted);
    label(711, "FAR 32 / BOUND R2 / F32", muted);
    label(733, "L DRAG ORBIT / R DRAG PAN", muted);
    label(755, "WHEEL DOLLY / IJKL / PGUP DN", muted);
    label(777, "R RESET / HOME CAMERA / Q QUIT", muted);
    if (!error.empty())
        label(800, error, {1.0, 0.38, 0.28});
}

} // namespace bulb
