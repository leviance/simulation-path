#pragma once

#include "atom_controls.hpp"
#include "atom_overlay.hpp"
#include "atom_statistics.hpp"
#include <iomanip>
#include <sstream>

namespace atom {

inline std::string number(double value, int precision = 2) {
    std::ostringstream output;
    output.imbue(std::locale::classic());
    output << std::fixed << std::setprecision(precision) << value;
    return output.str();
}

inline std::string scientific(double value) {
    std::ostringstream output;
    output.imbue(std::locale::classic());
    output << std::scientific << std::setprecision(2) << value;
    return output.str();
}

struct PaneReadout {
    std::string label{"FIELD PREVIEW"};
    SamplingConfig config;
    SamplingMode mode{SamplingMode::weighted};
    std::string desiredLabel;
    std::uint32_t generated{}, accepted{}, requested{};
    std::uint32_t drawSubmitted{};
    std::uint32_t pendingGenerated{}, pendingRequested{};
    double tableMs{}, sampleMs{}, tail{};
    bool measured{}, measuring{};
    std::array<std::uint32_t, 22> measurement{};
    double probeMs{}, evaluateMs{};
    double activeBufferMiB{}, candidateBufferMiB{};
    bool evaluated{};
};

struct PanelState {
    PlaygroundConfig config;
    std::array<PaneReadout, 2> panes;
    int selected{};
    bool paused{}, placeProbe{};
    double drawMs{}, memoryMiB{}, peakMiB{};
    std::string message;
};

struct Button {
    UiRect rect;
    Command command;
};

// Layout and hit testing share these rectangles in logical window coordinates.
class Panel {
    public:
    Command hit(float x, float y) const {
        for (const auto& button : buttons_)
            if (button.rect.contains(x, y))
                return button.command;
        return {};
    }

    void build(Overlay& overlay, int width, int height, const PanelState& state) {
        buttons_.clear();
        overlay.reset(width, height);
        const float left = static_cast<float>(width - nativePanelWidth);
        overlay.rect({left, 0, nativePanelWidth, static_cast<float>(height)}, {0.035F, 0.045F, 0.07F});
        text(overlay, left + 14, 16, "ATOMIC PLAYGROUND", {0.65F, 0.85F, 1}, 2);
        text(overlay, left + 14, 40, "LOCATION SAMPLES / NOT ELECTRONS");
        button(overlay, left + 14, 62, 155, "TAB: EDIT PANE " + std::to_string(state.selected + 1), {Action::pane});
        button(overlay, left + 179, 62, 155, "F1: CLEAN / DEBUG", {Action::debug});
        for (int index = 0; index < 10; ++index) {
            const float x = left + 14 + static_cast<float>(index % 2) * 165;
            const float y = 92 + static_cast<float>(index / 2) * 25;
            button(overlay, x, y, 155, std::to_string((index + 1) % 10) + ": " + presets[index].name, {Action::preset, index});
        }
        button(overlay, left + 14, 222, 155, "N: POINT COUNT", {Action::count});
        button(overlay, left + 179, 222, 155, "S: NEXT SEED", {Action::seed});
        button(overlay, left + 14, 249, 155, "SPACE: PAUSE", {Action::pause});
        button(overlay, left + 179, 249, 155, "C: CANCEL JOB", {Action::cancel});
        button(overlay, left + 14, 276, 155, "F2: COMPARE", {Action::compare});
        button(overlay, left + 179, 276, 155, "F3: SCALE MODE", {Action::fit});
        button(overlay, left + 14, 303, 155, "F5: CLIP", {Action::clip});
        button(overlay, left + 179, 303, 155, "P: PLACE PROBE", {Action::probe});
        button(overlay, left + 14, 330, 155, "F4: PALETTE", {Action::palette});
        button(overlay, left + 179, 330, 155, "M: SAMPLER MODE", {Action::mode});
        const auto& pane = state.panes[state.selected];
        text(overlay, left + 14, 368, pane.label, {0.6F, 0.84F, 1});
        text(overlay, left + 14, 388, "CURRENT N" + std::to_string(pane.requested) + " / SEED " + std::to_string(pane.config.seed));
        text(overlay, left + 14, 408, "GENERATED " + std::to_string(pane.generated));
        text(overlay, left + 14, 428, "ACCEPTED " + std::to_string(pane.accepted));
        text(overlay, left + 14, 448, "DRAW SUBMIT " + std::to_string(pane.drawSubmitted));
        if (pane.pendingRequested)
            text(overlay, left + 14, 468, "PENDING " + std::to_string(pane.pendingGenerated) + "/" + std::to_string(pane.pendingRequested), {1, 0.7F, 0.3F});
        else
            text(overlay, left + 14, 468, "RMAX " + number(pane.config.radius) + " / TAIL " + scientific(pane.tail));
        text(overlay, left + 14, 488, "TABLE " + std::to_string(pane.config.radialBins) + " X " + std::to_string(pane.config.muBins) + " X " + std::to_string(pane.config.phiBins));
        text(overlay, left + 14, 508, "TABLE CPU " + number(pane.tableMs) + " / SAMPLE GPU " + number(pane.sampleMs) + " MS");
        std::string probeTiming = "PROBE N/A";
        if (pane.measuring)
            probeTiming = "PROBE PENDING";
        else if (pane.measured)
            probeTiming = "PROBE " + number(pane.probeMs) + " MS";
        text(overlay, left + 14, 528, "DRAW GPU " + number(state.drawMs) + " MS / " + probeTiming);
        std::string evaluation = "EVALUATE NOT RUN / AVAILABLE IN 11";
        if (pane.evaluated)
            evaluation = "EVALUATE GPU " + number(pane.evaluateMs) + " MS / READ+COMPARE";
        text(overlay, left + 14, 560, evaluation);
        text(overlay, left + 14, 548, "GPU LIVE " + number(state.memoryMiB) + " / PEAK " + number(state.peakMiB) + " MIB");
        text(overlay, left + 14, 570, "R RESET / HOME CAMERA / F6 SAVE / F7 LOAD");
        text(overlay, left + 14, 590, "X AXIS / [ ] CLIP / , . PROBE RADIUS");
        text(overlay, left + 14, 610, "- + OPACITY / PGUP PGDN SIZE / B BOOST");
        text(overlay, left + 14, 630, pane.desiredLabel, {0.8F, 0.85F, 1});
        text(overlay, left + 14, 650, state.message, {1, 0.65F, 0.3F});
        viewReadout(overlay, width - nativePanelWidth, height, state);
    }

    private:
    static void text(Overlay& overlay, float x, float y, const std::string& value, Vec3 color = {0.65F, 0.7F, 0.8F}, float scale = 1) {
        overlay.text(x, y, value, color, scale, 326);
    }

    void button(Overlay& overlay, float x, float y, float width, const std::string& label, Command command) {
        const UiRect rect{x, y, width, 21};
        buttons_.push_back({rect, command});
        overlay.rect(rect, {0.09F, 0.12F, 0.18F});
        overlay.text(x + 6, y + 7, label, {0.78F, 0.85F, 0.94F}, 1, width - 12);
    }

    static void viewReadout(Overlay& overlay, int width, int height, const PanelState& state) {
        const auto& config = state.config;
        int paneCount = 1;
        if (config.comparison)
            paneCount = 2;
        const float paneWidth = static_cast<float>(width) / paneCount;
        for (int index = 0; index < paneCount; ++index) {
            const float x = index * paneWidth + 18;
            const auto& pane = state.panes[index];
            overlay.text(x, 20, pane.label, {0.8F, 0.87F, 0.98F}, 2, paneWidth - 32);
            std::string scale = "SAME WORLD SCALE / A0=1";
            if (config.autoFit)
                scale = "AUTO-FIT / SCALE DIFFERS";
            overlay.text(x, 46, scale, {0.6F, 0.7F, 0.85F}, 1, paneWidth - 32);
            overlay.text(x, 64, "LMB ORBIT / RMB PAN / WHEEL TRAVERSE", {0.6F, 0.7F, 0.85F}, 1, paneWidth - 32);
            std::string clip = "CLIP OFF";
            if (config.clipEnabled) {
                const std::array<std::string, 3> axes{"X", "Y", "Z"};
                clip = "CLIP " + axes[config.clipAxis] + " <= " + number(config.clipOffset);
            }
            overlay.text(x, 84, clip, {0.6F, 0.8F, 0.75F}, 1, paneWidth - 32);
            if (pane.mode != SamplingMode::weighted)
                overlay.text(x, 158, "WRONG SAMPLER EXPERIMENT / N <= 16384", {1, 0.5F, 0.25F}, 1, paneWidth - 32);
            if (state.placeProbe)
                overlay.text(x, 104, "CLICK VIEW TO MOVE PROBE / P TO LEAVE", {0.3F, 1, 0.75F}, 1, paneWidth - 32);
            overlay.text(x, 122, "N " + std::to_string(pane.accepted) + " / BUF " + number(pane.activeBufferMiB) + " MIB", {0.6F, 0.7F, 0.85F}, 1, paneWidth - 32);
            if (pane.candidateBufferMiB > 0)
                overlay.text(x, 138, "CANDIDATE BUF " + number(pane.candidateBufferMiB) + " MIB", {1, 0.7F, 0.3F}, 1, paneWidth - 32);
            if (config.debug)
                measurement(overlay, x, static_cast<float>(height - 150), paneWidth - 32, config, pane);
            std::string legend = "BLUE - / ORANGE + PHASE / NOT CHARGE";
            if (config.palette == 1)
                legend = "COLOR: R/RMAX / TEAL NEAR VIOLET FAR";
            if (config.palette == 2)
                legend = "COLOR: -LOG(RHO)/20 / BLUE HIGH RHO";
            overlay.text(x, static_cast<float>(height - 30), legend, {0.6F, 0.75F, 0.95F}, 1, paneWidth - 32);
            std::string transfer = "ADDITIVE SPLAT / 1-EXP(-EXPOSURE*L)";
            if (config.densityBoost)
                transfer += " / EXTRA RHO BOOST";
#if LAB_CHECKPOINT < 6
            transfer = "LDR FLAT DISK / NO TONE MAPPING YET";
#endif
            overlay.text(x, static_cast<float>(height - 14), transfer, {0.6F, 0.7F, 0.8F}, 1, paneWidth - 32);
        }
    }

    static void measurement(Overlay& overlay, float x, float y, float width, const PlaygroundConfig& config, const PaneReadout& pane) {
        if (!pane.measured) {
            std::string status = "PROBE: WAITING FOR CURRENT CLOUD";
            if (pane.measuring)
                status = "PROBE: MEASURING / OLD RESULT HIDDEN";
            overlay.text(x, y, status, {0.4F, 0.9F, 0.75F}, 1, width);
            return;
        }
        const auto interval = binomialWilson(pane.measurement[3], pane.accepted);
        overlay.text(x, y, "SPHERE P " + number(interval.estimate, 4) + " CI95 " + number(interval.low, 4) + ".." + number(interval.high, 4), {0.4F, 0.9F, 0.75F}, 1, width);
        const auto reference = expectedOriginSphere(pane.config, config.probeCenter, config.probeRadius);
        std::string label = "MOVED REGION: MC CI ONLY / NO EXACT REF";
        if (reference)
            label = "ORIGIN SPHERE REF " + number(*reference, 4) + " / TAIL-TABLE SEPARATE";
        overlay.text(x, y + 16, label, {0.6F, 0.75F, 0.8F}, 1, width);
        overlay.text(x, y + 32, "VISIBLE " + std::to_string(pane.measurement[2]) + " / DENOM " + std::to_string(pane.accepted), {0.6F, 0.75F, 0.8F}, 1, width);
        overlay.text(x, y + 48, "RADIAL: TEAL SAMPLES / ORANGE REF", {0.6F, 0.75F, 0.8F}, 1, width);
        const auto referenceBins = referenceRadialHistogram(pane.config);
        const float barWidth = std::max(4.0F, width / 16 - 2);
        for (std::size_t bin = 0; bin < 16; ++bin) {
            const float observed = static_cast<float>(pane.measurement[bin + 4]) / pane.accepted;
            const float h = std::min(60.0F, observed * 180);
            const float expected = std::min(60.0F, static_cast<float>(referenceBins[bin]) * 180);
            const float bx = x + static_cast<float>(bin) * (barWidth + 2);
            overlay.rect({bx, y + 112 - h, barWidth, h}, {0.15F, 0.6F, 0.75F});
            overlay.rect({bx, y + 112 - expected, barWidth, 2}, {1, 0.65F, 0.3F});
        }
    }

    std::vector<Button> buttons_;
};

} // namespace atom
