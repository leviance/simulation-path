#pragma once
#include "benchmark.hpp"
#include "ui-overlay.hpp"
#include <iomanip>
#include <sstream>

namespace water3 {
inline std::string number(double value, int digits = 3) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << value;
    return out.str();
}

class Panel {
    public:
    std::vector<UiButton> buttons;
    float contentHeight = 0;

    void prepare(const Layout& layout, const PanelState& state, const Plan& plan, const Engine& engine, const Benchmark& bench, bool referenceActive) {
        buttons.clear();
        const bool job = bench.active() || referenceActive;
        const bool idle = engine.ready && !engine.queue.pending() && !job;
        const auto can = uiFeatures();
        const auto add = [&](Command command, std::string label, float y, int column, bool enabled = true, bool active = false, int columns = 3) {
            buttons.push_back({layout.cell(y, column, columns), command, std::move(label), enabled, active});
        };
        std::string play = "RUN SPACE";
        if (state.playing)
            play = "PAUSE";
        add(Command::Play, play, 118, 0, can.run && !job, state.playing);
        add(Command::Step, "STEP N", 118, 1, can.density && !job);
        add(Command::Reset, "RESET R", 118, 2, can.state && !job);
        add(Command::View, "VIEW L", 150, 0, can.density && !bench.active());
        add(Command::Debug, "DEBUG F1", 150, 1, true, state.debug);
        add(Command::Home, "CAM HOME", 150, 2, !bench.active());
        constexpr std::array sides{8U, 32U, 48U, 80U, 100U};
        constexpr std::array names{"512", "32K", "110K", "512K", "1M"};
        constexpr std::array commands{Command::Small, Command::Medium, Command::Required, Command::HalfMillion, Command::Million};
        for (int i = 0; i < 5; ++i)
            add(commands[i], names[i], 208.0F + 31 * (i / 3), i % 3, can.scale && !job, plan.side == sides[i]);
        add(Command::Confirm, "APPLY", 239, 2, idle && state.armedSide != 0);
        add(Command::Sound, "C F " + number(engine.settings.soundSpeed, 0), 276, 0, can.force && idle);
        add(Command::Viscosity, "ALPHA Q", 276, 1, can.force && idle);
        add(Command::Grid, "GRID G", 276, 2, can.grid && idle && plan.count <= 512, engine.grid);
        add(Command::Benchmark, "BENCH B", 310, 0, can.run && idle);
        add(Command::Validate, "VERIFY V", 310, 1, can.reference && idle);
        add(Command::Cancel, "CANCEL C", 310, 2, true);
    }

    Command hit(float x, float y) const {
        for (const auto& button : buttons)
            if (button.enabled && button.rect.contains(x, y))
                return button.command;
        return Command::None;
    }

    void draw(Overlay& ui, const Layout& layout, PanelState& state, const Plan& plan, const Engine& engine, const View& view, const Benchmark& bench, bool referenceActive, int width, int height) {
        const UiColor text{0.77F, 0.85F, 0.91F}, cyan{0.28F, 0.79F, 0.97F}, muted{0.38F, 0.48F, 0.58F};
        ui.reset(width, height);
        ui.text(18, 22, "SPH / GPU WATER TANK", cyan, 2.1F, 700);
        constexpr std::array modes{"WATER", "DENSITY 600-1200 KG/M3", "PRESSURE 0-60000 PA", "SPEED 0-4 M/S", "UNLIT PARTICLES"};
        ui.text(18, 54, modes[view.mode], text, 1.25F, 700);
        ui.text(18, static_cast<float>(height - 24), "DRAG: ORBIT / WHEEL: ZOOM / HOME: CAMERA / F1: DATA / ESC: EXIT", muted, 1.1F, layout.scene.width);
        ui.rect(layout.panel, {0.045F, 0.075F, 0.105F});
        const float left = layout.panel.x + 12;
        std::string status = "PAUSED";
        if (state.playing)
            status = "RUNNING";
        if (engine.queue.pending())
            status = "GPU PENDING";
        if (bench.active())
            status = "BENCHMARK";
        if (referenceActive)
            status = "SMALL-N VERIFY";
        ui.text(left, 96, status, cyan, 1.5F);
        ui.text(left, 188, "N PRESETS / ENTER TO APPLY", muted, 1.15F);
        for (const auto& button : buttons) {
            UiColor fill{0.09F, 0.15F, 0.20F}, tint = text;
            if (button.active)
                fill = {0.07F, 0.28F, 0.36F};
            if (!button.enabled)
                tint = muted;
            ui.rect(button.rect, fill);
            ui.text(button.rect.x + 6, button.rect.y + 8, button.label, tint, 1.3F, button.rect.width - 10);
        }
        std::string message = state.message;
        if (state.armedSide)
            message = "CONFIRM N=" + std::to_string(makePlan(state.armedSide).count) + " - ENTER OR C";
        if (bench.active())
            message = "WARM " + std::to_string(bench.warmups) + "/30 STEP " + std::to_string(bench.total.size()) + "/8 RENDER " + std::to_string(bench.rendering.size()) + "/8";
        ui.text(left, 348, message, cyan, 1.05F, layout.panel.width - 24);
        ui.text(left, 364, "ALPHA=" + number(engine.settings.alpha, 2) + "  C=" + number(engine.settings.soundSpeed, 0) + " M/S", muted, 1.1F);

        std::vector<std::string> rows;
        std::uint32_t allocated = 0;
        if (engine.storage.positions[0])
            allocated = plan.count;
        rows.push_back("ALLOCATED=" + std::to_string(allocated));
        rows.push_back("ALIVE=" + std::to_string(plan.count) + " DRAW=" + std::to_string(view.drawn));
        rows.push_back("UPDATED=" + std::to_string(engine.lastDiagnostics.updated()) + " TICK=" + std::to_string(engine.steps));
        rows.push_back("MODEL TIME " + number(engine.time, 5) + " S");
        rows.push_back("DT " + number(engine.lastDt, 7) + " S");
        rows.push_back("SPH BUFFERS " + number(plan.residentBytes / 1048576.0, 2) + " MIB");
        rows.push_back("MASS " + number(plan.mass * plan.count, 3) + " KG");
        if (state.debug) {
            rows.push_back("RHO BEFORE STEP / KG/M3");
            if (engine.steps > 0) {
                rows.push_back("MIN/MAX " + number(engine.lastDiagnostics.minimum(), 1) + "/" + number(engine.lastDiagnostics.maximum(), 1));
                rows.push_back("MED/P95 BIN " + number(engine.lastDiagnostics.quantile(0.5) * restDensity, 1) + "/" + number(engine.lastDiagnostics.quantile(0.95) * restDensity, 1));
            } else
                rows.push_back("NO COMMITTED SPH STEP YET");
            rows.push_back("POSTSTEP LEAK=" + std::to_string(engine.lastDiagnostics.leaked()) + " BAD=" + std::to_string(engine.lastDiagnostics.invalid()));
            rows.push_back("GPU BATCH " + number(engine.queue.milliseconds) + " MS");
            rows.push_back("CPU ENQUEUE " + number(engine.enqueueMilliseconds) + " MS");
            rows.push_back("SUBMIT-COMMIT " + number(engine.commitMilliseconds, 2) + " MS");
            rows.push_back("GPU SCENE " + number(view.timer.milliseconds) + " MS / NO UI");
            if (bench.phase == BenchmarkPhase::Done) {
                rows.push_back("BENCH MEDIAN [MIN-MAX] MS");
                for (std::size_t i = 0; i < bench.passCount; ++i) {
                    const auto d = distribution(bench.pass[i]);
                    rows.push_back(bench.labels[i].substr(0, 10) + " " + number(d.median) + " [" + number(d.minimum) + "-" + number(d.maximum) + "]");
                }
                const auto gpu = distribution(bench.total), render = distribution(bench.rendering);
                rows.push_back("GPU " + number(gpu.median) + " [" + number(gpu.minimum) + "-" + number(gpu.maximum) + "]");
                rows.push_back("DRAW " + number(render.median) + " [" + number(render.minimum) + "-" + number(render.maximum) + "]");
            } else {
                rows.push_back("LAST GPU PASS / MS");
                for (std::size_t i = 0; i < engine.queue.passCount; ++i)
                    rows.push_back(std::string(engine.queue.timings[i].label) + " " + number(engine.queue.timings[i].milliseconds));
            }
        } else {
            rows.push_back("F1: DENSITY + PASS PROFILER");
            rows.push_back("100K REQUIRED / 512K-1M OPTIONAL");
            rows.push_back("WCSPH MODEL / NOT EXACT WATER");
        }
        contentHeight = static_cast<float>(rows.size() * 17);
        const float available = height - layout.statsTop - 30;
        state.scroll = std::clamp(state.scroll, 0.0F, std::max(0.0F, contentHeight - available));
        for (std::size_t i = 0; i < rows.size(); ++i) {
            const float y = layout.statsTop + static_cast<float>(i * 17) - state.scroll;
            if (y >= layout.statsTop && y + 10 < height - 30)
                ui.text(left, y, rows[i], text, 1.3F, layout.panel.width - 24);
        }
        ui.text(left, static_cast<float>(height - 26), "WHEEL / PGDN: SCROLL DATA", muted, 1.2F);
    }
};
} // namespace water3
