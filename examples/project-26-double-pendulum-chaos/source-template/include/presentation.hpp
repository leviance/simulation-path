#pragma once
#include "view.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {

// Số đo của hai con lắc được đọc sau bước vật lý, không tính lại quỹ đạo khi vẽ.
inline bool drawHud(SDL_Renderer* renderer, const Scene& scene) {
    bool ok = SDL_SetRenderDrawColor(renderer, 205, 215, 235, 255);
    const auto text = [&](float x, float y, const char* value) {
        ok = SDL_RenderDebugText(renderer, x, y, value) && ok;
    };
    char line[220]{};
    const char* motion = "RUNNING";
    if (scene.paused) {
        motion = "PAUSED";
    }
    std::snprintf(line, sizeof(line), "DOUBLE PENDULUM | A: blue, B: red | t=%.3f s | %s", primaryState(scene).elapsed, motion);
    text(30, 20, line);
    text(30, 42, "R reset current experiment | F clean/debug | Esc quit | A/D theta1, W/S theta2 initial angles");
#if LAB_CHECKPOINT >= 3
    text(30, 64, "Space start/pause | N one step | [ smaller dt | ] larger dt");
#else
    text(30, 64, "Static geometry: angles from downward vertical, rigid massless rods; no integration yet.");
#endif
    text(52, 110, "A: primary initial state");
#if LAB_CHECKPOINT >= 4
    text(582, 110, "B: same model, theta2 + epsilon at t=0");
#else
    text(582, 110, "Second pendulum is added in lesson 4.");
#endif
#if LAB_CHECKPOINT == 0
    text(70, 290, "SDL scaffold ready. Implement geometry in lesson 1.");
#endif
#if LAB_CHECKPOINT == 1
    const auto geometry = pendulumGeometry(scene.initial, scene.parameters);
    std::snprintf(line, sizeof(line), "bob1=(%.4f,%.4f) m | bob2=(%.4f,%.4f) m | L1=L2=1 m", geometry.bob1.x, geometry.bob1.y, geometry.bob2.x, geometry.bob2.y);
    text(30, 560, line);
#endif
#if LAB_CHECKPOINT == 2
    const auto derivative = pendulumDerivative(scene.initial, scene.parameters);
    const char* derivativeStatus = "NO";
    if (derivative.valid) {
        derivativeStatus = "yes";
    }
    std::snprintf(line, sizeof(line), "alpha1=%.6f rad/s^2 | alpha2=%.6f rad/s^2 | valid=%s", derivative.omega1Rate, derivative.omega2Rate, derivativeStatus);
    text(30, 560, line);
    text(30, 584, "Q/E: omega1, Z/C: omega2. Both accelerations are evaluated from the same input state.");
#endif
#if LAB_CHECKPOINT >= 3
    std::snprintf(line, sizeof(line), "E_A=%.6f J | max |delta E_A|=%.3e J", pendulumEnergy(primaryState(scene), scene.parameters), scene.maximumEnergyErrorA);
    text(40, 548, line);
    text(570, 570, "Energy error Delta E(t) [J]: blue A, red B");
    std::snprintf(line, sizeof(line), "+/-%.3e J (zero at center)", energyGraphBound(scene));
    text(580, 596, line);
    if (!scene.history.empty()) {
        std::snprintf(line, sizeof(line), "time %.3f -> %.3f s | latest %zu samples", scene.history.front().time, scene.history.back().time, scene.history.size());
        text(570, 742, line);
    }
    std::snprintf(line, sizeof(line), "dt=%.7f s | steps=%zu | substeps=%d | dropped=%.4f s", kStepOptions[scene.dtIndex], scene.steps, scene.substeps, scene.droppedTime);
    text(30, 766, line);
#endif
#if LAB_CHECKPOINT >= 4
    std::snprintf(line, sizeof(line), "E_B=%.6f J | max |delta E_B|=%.3e J", pendulumEnergy(perturbedState(scene), scene.parameters), scene.maximumEnergyErrorB);
    text(570, 548, line);
    std::snprintf(line, sizeof(line), "epsilon=%.1e rad | Up/Down: epsilon | 0: identical twins", scene.perturbation);
    if (scene.debug) {
        text(30, 84, line);
    }
#endif
#if LAB_CHECKPOINT >= 5
#if LAB_CHECKPOINT >= 6
    const auto& twins = scene.experiment.twins;
#else
    const auto& twins = scene.twins;
#endif
    const auto twinMetrics = measureTwins(twins, scene.parameters);
    char growth[40] = "n/a";
    if (std::isfinite(twinMetrics.finiteTimeExponent)) {
        std::snprintf(growth, sizeof(growth), "%.5f 1/s", twinMetrics.finiteTimeExponent);
    }
    std::snprintf(line, sizeof(line), "bob distance %.5f m | growthT %s (not converged Lya)", twinMetrics.secondBobDistance, growth);
    text(30, 788, line);
    text(40, 570, "Phase distance d(t), log10: purple twins");
    text(48, 596, "1e2 (top) -> 1e-12 (floor, display only)");
    if (!scene.history.empty()) {
        const auto& last = scene.history.back();
        std::snprintf(line, sizeof(line), "t=%.3f s | d=%.3e", last.time, last.physical);
        text(40, 742, line);
    }
#endif
#if LAB_CHECKPOINT >= 6
#if LAB_CHECKPOINT == 6
    text(30, 808, "Enter: +10s in bounded batches | Backspace: stop job");
#endif
    if (scene.debug) {
        text(580, 128, "Green in A pane: same initial state, dt/2 reference");
    }
    const auto metrics = measureChaos(scene.experiment, scene.parameters);
    const char* finiteStatus = "NO";
    if (metrics.finite) {
        finiteStatus = "yes";
    }
    std::snprintf(line, sizeof(line), "h/h2: %.3e | finite=%s", metrics.numericalSeparation, finiteStatus);
    text(650, 788, line);
#endif
#if LAB_CHECKPOINT >= 7
    std::snprintf(line, sizeof(line), "Space pause | N step | [/] dt | Enter +30s | Backspace stop | remaining %d steps", scene.fastRemaining);
    text(30, 64, line);
    text(30, 84, "P/1/2/3 presets | Up/Down epsilon | 0 identical twins | drag A bob2: edit initial angles");
#endif
    if (!scene.message.empty()) {
        text(30, 808, scene.message.c_str());
    }
    return ok;
}
} // namespace lab
