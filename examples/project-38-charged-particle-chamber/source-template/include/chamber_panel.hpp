#pragma once
#include "chamber_controls.hpp"
#include "chamber_overlay.hpp"

namespace chamber {

struct FrameInfo {
    // Presentation reads a frame snapshot; it does not own or update any particle state.
    std::size_t allocated{}, updated{}, drawn{};
    std::uint64_t tick{};
    double time{}, frameMs{}, updateMs{}, drawMs{}, discarded{};
    double stateMiB{}, reservedMiB{}, blockMiB{};
    double phaseSpan{};
    int appliedSteps{};
    int renderWidth{}, renderHeight{};
    std::size_t haloSamples{};
    std::string device{}, message{};
    std::string validation{"V: validate separate buffer"};
    std::string benchmark{"B: finite GPU benchmark"};
    Vec3 selectedPosition{}, selectedVelocity{};
    double selectedPositionError{}, selectedVelocityError{};
    bool selectedReady{};
};

inline void scaffoldPanel(Overlay& overlay, float dpr, int width) {
    const float left = static_cast<float>(width) - 384.0F * dpr;
    overlay.rectangle(left, 0, 384.0F * dpr, static_cast<float>(overlay.height), {0.045F, 0.065F, 0.105F});
    overlay.text(left + 20 * dpr, 22 * dpr, "P38 CHARGED PARTICLES", {0.92F, 0.95F, 1}, 3 * dpr);
    overlay.text(left + 20 * dpr, 66 * dpr, "3D CHAMBER / OPENGL 4.3", {0.4F, 0.9F, 0.75F}, 2 * dpr);
    overlay.text(left + 20 * dpr, 100 * dpr, "DRAG ORBIT / RIGHT DRAG PAN", {0.7F, 0.8F, 0.95F}, 2 * dpr);
    overlay.text(left + 20 * dpr, 124 * dpr, "WHEEL ZOOM / IJKL KEYBOARD", {0.7F, 0.8F, 0.95F}, 2 * dpr);
    overlay.text(left + 20 * dpr, 154 * dpr, "Q QUIT / BACKSPACE CAMERA", {0.7F, 0.8F, 0.95F}, 2 * dpr);
}

#if LAB_CHECKPOINT >= 2
inline void drawShowcase(Overlay& overlay, const Controls& controls, const Settings& active, const FrameInfo& info, float dpr) {
    const Vec3 ink{0.91F, 0.96F, 1};
    const Vec3 dim{0.51F, 0.63F, 0.73F};
    const Vec3 mint{0.35F, 0.9F, 0.7F};
    overlay.text(28 * dpr, 20 * dpr, "PROJECT 38 / GPU FIELD LAB", mint, 2.4F * dpr);
    overlay.text(28 * dpr, 48 * dpr, "CHARGED PARTICLE CHAMBER", ink, 4.0F * dpr);
    char line[180]{};
    std::snprintf(line, sizeof(line), "%zu PARTICLES / +Q ORANGE / -Q CYAN / SELECTED GOLD", info.allocated);
    if (controls.bySpeed)
        std::snprintf(line, sizeof(line), "%zu PARTICLES / SPEED 0..5: BLUE TO GOLD / SELECTED GOLD", info.allocated);
    overlay.text(28 * dpr, 84 * dpr, line, dim, 2.0F * dpr);
    std::snprintf(line, sizeof(line), "E [%.2F %.2F %.2F]    B [%.2F %.2F %.2F]    T %.2F S", active.fields.electric.x, active.fields.electric.y, active.fields.electric.z, active.fields.magnetic.x, active.fields.magnetic.y, active.fields.magnetic.z, info.time);
    overlay.text(28 * dpr, 106 * dpr, line, dim, 2.0F * dpr);
#if LAB_CHECKPOINT >= 8
    std::snprintf(line, sizeof(line), "STEPS/FRAME %d OF MAX 8 / DROPPED WALL %.3F S", info.appliedSteps, info.discarded);
    overlay.text(28 * dpr, 128 * dpr, line, dim, 2.0F * dpr);
#endif
    const float right = static_cast<float>(overlay.width) - 180 * dpr;
    overlay.rectangle(right, 18 * dpr, 156 * dpr, 32 * dpr, {0.08F, 0.17F, 0.2F});
    overlay.text(right + 14 * dpr, 28 * dpr, "H CONTROLS", mint, 2.4F * dpr);
    if (controls.paused)
        overlay.text(right, 66 * dpr, "PAUSED / N STEP", {1, 0.7F, 0.3F}, 2 * dpr);
    const float bottom = static_cast<float>(overlay.height) - 92 * dpr;
    overlay.rectangle(0, bottom, static_cast<float>(overlay.width), 92 * dpr, {0.025F, 0.045F, 0.065F});
    std::snprintf(line, sizeof(line), "STATE %.2F MIB / CORE ALL %zu / HALO SAMPLED %zu / RENDER %d X %d / INITIAL PHASE %.1F S", info.stateMiB, info.drawn, info.haloSamples, info.renderWidth, info.renderHeight, info.phaseSpan);
    overlay.text(28 * dpr, bottom + 16 * dpr, line, dim, 2 * dpr);
    overlay.text(28 * dpr, bottom + 39 * dpr, "DRAG ORBIT / RIGHT DRAG PAN / WHEEL ZOOM / SPACE PAUSE / R RESET / 1-4 PRESET / P PHASE", ink, 2 * dpr);
    overlay.text(28 * dpr, bottom + 62 * dpr, "H CONTROLS / D FIELD GUIDES / T TRAILS / [ ] SELECT ID / F FOCUS / V VALIDATE / B BENCH / Q QUIT", mint, 2 * dpr);
}

inline void drawPanel(Overlay& overlay, const Controls& controls, const Settings& active, const FrameInfo& info, float dpr) {
    const float left = static_cast<float>(overlay.width) - 384.0F * dpr;
    const float x = left + 20 * dpr;
    const Vec3 ink{0.91F, 0.94F, 1};
    const Vec3 dim{0.55F, 0.64F, 0.77F};
    const Vec3 mint{0.35F, 0.9F, 0.7F};
    const Vec3 amber{1, 0.68F, 0.28F};
    overlay.rectangle(left, 0, 384 * dpr, static_cast<float>(overlay.height), {0.045F, 0.065F, 0.105F});
    overlay.text(x, 18 * dpr, "P38 / CHARGED CHAMBER", ink, 3 * dpr);
    std::string colorLegend = "+Q ORANGE / -Q CYAN / 0 GRAY";
    if (controls.bySpeed)
        colorLegend = "SPEED 0..5: BLUE TO GOLD";
    overlay.text(x, 48 * dpr, colorLegend, mint, 2 * dpr);
    char line[160]{};
    std::snprintf(line, sizeof(line), "ACTIVE N %zu  T %.3F  TICK %llu", info.allocated, info.time, static_cast<unsigned long long>(info.tick));
    overlay.text(x, 72 * dpr, line, ink, 2 * dpr);
    std::snprintf(line, sizeof(line), "UPDATED/FRAME %zu  DRAWN %zu", info.updated, info.drawn);
    overlay.text(x, 92 * dpr, line, dim, 2 * dpr);
    std::snprintf(line, sizeof(line), "FRAME CPU+PRESENT %.2F MS", info.frameMs);
    overlay.text(x, 112 * dpr, line, dim, 2 * dpr);
#if LAB_CHECKPOINT >= 11
    std::snprintf(line, sizeof(line), "UPDATE GPU %.3F / DRAW %.3F MS", info.updateMs, info.drawMs);
    overlay.text(x, 132 * dpr, line, dim, 2 * dpr);
#else
    overlay.text(x, 132 * dpr, "GPU TIMING NOT MEASURED YET", dim, 2 * dpr);
#endif
    std::snprintf(line, sizeof(line), "ACTIVE E %.2F %.2F %.2F", active.fields.electric.x, active.fields.electric.y, active.fields.electric.z);
    overlay.text(x, 154 * dpr, line, mint, 2 * dpr);
    std::snprintf(line, sizeof(line), "ACTIVE B %.2F %.2F %.2F", active.fields.magnetic.x, active.fields.magnetic.y, active.fields.magnetic.z);
    overlay.text(x, 174 * dpr, line, mint, 2 * dpr);
    std::string stateLabel = "STAGED / TAB THEN LEFT-RIGHT";
    if (controls.stagedChanged)
        stateLabel = "STAGED CHANGES / ENTER TO APPLY";
    overlay.text(x, 200 * dpr, stateLabel, amber, 2 * dpr);

    const Settings& staged = controls.staged;
    const std::array<const char*, 14> names{"N", "SEED", "DT", "Q SCALE", "EX", "EY", "EZ", "BX", "BY", "BZ", "VX0", "VY0", "VZ0", "SELECTED ID"};
    const std::array<double, 14> values{static_cast<double>(staged.count), static_cast<double>(staged.seed), staged.dt, staged.fields.chargeScale, staged.fields.electric.x, staged.fields.electric.y, staged.fields.electric.z, staged.fields.magnetic.x, staged.fields.magnetic.y, staged.fields.magnetic.z, staged.initialVelocity.x, staged.initialVelocity.y, staged.initialVelocity.z, static_cast<double>(controls.selectedParticle)};
    for (int row = 0; row < static_cast<int>(names.size()); ++row) {
        const float y = (224.0F + row * 18.0F) * dpr;
        if (controls.selectedControl == row)
            overlay.rectangle(left + 12 * dpr, y - 3 * dpr, 356 * dpr, 17 * dpr, {0.1F, 0.17F, 0.24F});
        std::snprintf(line, sizeof(line), "%s %.6G", names[static_cast<std::size_t>(row)], values[static_cast<std::size_t>(row)]);
        if (row == 0)
            std::snprintf(line, sizeof(line), "N %zu", staged.count);
        if (row == 1)
            std::snprintf(line, sizeof(line), "SEED %u", staged.seed);
        if (row == 13)
            std::snprintf(line, sizeof(line), "SELECTED ID %u", controls.selectedParticle);
        overlay.text(x, y, line, ink, 2 * dpr);
        overlay.text(static_cast<float>(overlay.width) - 130 * dpr, y, "[-]   [+]", mint, 2 * dpr);
    }
    overlay.rectangle(left + 12 * dpr, 484 * dpr, 356 * dpr, 23 * dpr, {0.12F, 0.24F, 0.25F});
    overlay.text(x, 490 * dpr, "ENTER APPLY / R RESET ACTIVE", mint, 2 * dpr);
    std::string playback = "SPACE PAUSE / N SINGLE STEP";
    if (controls.paused)
        playback = "PAUSED / N SINGLE STEP";
    overlay.text(x, 522 * dpr, playback, amber, 2 * dpr);
    overlay.text(x, 542 * dpr, "1-4 PRESETS / T TRAILS / M COLOR", ink, 2 * dpr);
    overlay.text(x, 562 * dpr, "D DEBUG / V VALIDATE / B BENCH", ink, 2 * dpr);
    overlay.text(x, 582 * dpr, "ESC CANCEL JOB / Q QUIT", ink, 2 * dpr);

    float y = 612 * dpr;
    if (info.selectedReady) {
        std::snprintf(line, sizeof(line), "ID %u  X %.2F %.2F %.2F", controls.selectedParticle, info.selectedPosition.x, info.selectedPosition.y, info.selectedPosition.z);
        overlay.text(x, y, line, ink, 2 * dpr);
        y += 18 * dpr;
        std::snprintf(line, sizeof(line), "V %.2F %.2F %.2F / ERR %.2G", info.selectedVelocity.x, info.selectedVelocity.y, info.selectedVelocity.z, info.selectedPositionError);
        overlay.text(x, y, line, dim, 2 * dpr);
        y += 18 * dpr;
    }
    overlay.wrapped(x, y, info.message, amber, 2 * dpr);
    overlay.wrapped(x, y, info.validation, mint, 2 * dpr);
    overlay.wrapped(x, y, info.benchmark, dim, 2 * dpr);
    overlay.text(18 * dpr, 16 * dpr, "X RED / Y GREEN / Z BLUE - GRID IS A RULER, NOT A WALL", dim, 2 * dpr);
    overlay.text(18 * dpr, 36 * dpr, info.device, dim, 2 * dpr);
    std::snprintf(line, sizeof(line), "STATE %.2F MIB / RESERVE %.2F / SSBO LIMIT %.2F MIB", info.stateMiB, info.reservedMiB, info.blockMiB);
    overlay.text(18 * dpr, 56 * dpr, line, dim, 2 * dpr);
#if LAB_CHECKPOINT >= 8
    std::snprintf(line, sizeof(line), "STEPS/FRAME %d OF MAX 8 / DROPPED WALL %.3F S", info.appliedSteps, info.discarded);
    overlay.text(18 * dpr, 76 * dpr, line, dim, 2 * dpr);
#endif
    overlay.text(18 * dpr, static_cast<float>(overlay.height) - 42 * dpr, "DRAG ORBIT / RIGHT DRAG PAN / WHEEL ZOOM / SHIFT-IJKL PAN", ink, 2 * dpr);
    overlay.text(18 * dpr, static_cast<float>(overlay.height) - 24 * dpr, "CLICK TRACKED 32 / [ ] ALL IDS / F FOCUS / BACKSPACE CAMERA", dim, 2 * dpr);
}
#endif

} // namespace chamber
