#pragma once

#include "sculpt_controls.hpp"
#include "sculpt_overlay.hpp"

namespace sculpt {

// Supplied UI for the emit/dirty lessons. Later slice/file/resolution controls are absent.
inline void gpuSurfaceOverlay(Overlay& overlay, const GpuMeshBuilder& model, const GpuBudget& budget, const SculptControls& controls, int width, int height, bool compact, std::string_view sceneStatus, std::optional<std::uint32_t> selectedChunk = {}) {
    int panelWidth = nativePanelWidth;
    if (compact)
        panelWidth = 48;
    const float left = static_cast<float>(width - panelWidth);
    overlay.rect({left, 0, static_cast<float>(panelWidth), static_cast<float>(height)}, {0.028F, 0.045F, 0.065F});
    if (compact) {
        overlay.text(left + 6, 20, "F10", {0.6F, 0.95F, 0.85F}, 2, 38);
        std::string mode = "DRAW";
        if (!controls.sculptMode())
            mode = "CAM";
        overlay.text(left + 5, 48, mode, {0.6F, 0.95F, 0.85F}, 1.4F, 38);
        return;
    }
    float y = 18;
    float rowHeight = 20;
    float textScale = 1.55F;
#if LAB_CHECKPOINT >= 9
    rowHeight = std::floor(std::clamp((height - 36.0F) / 40, 15.0F, 20.0F));
    textScale = 1.6F;
#else
    (void)selectedChunk;
#endif
    const auto row = [&](const std::string& text, Vec3 color = {0.7F, 0.84F, 0.9F}) {
        overlay.text(left + 14, y, text, color, textScale, 322);
        y += rowHeight;
    };
    const auto& grid = model.settings().grid;
    const std::array<std::string, 7> states{"INITIALIZING FIELD", "EDITING / RELEASE STROKE", "COUNT AND SCAN", "EMIT AND NORMALS", "CURRENT MESH", "CANCELLED / ENTER TO RETRY", "FAILED / LAST-GOOD HELD"};
    std::uint64_t vertices = 0, activeCells = 0, fallbacks = 0, reusedNonempty = 0;
    for (const auto& chunk : model.active()) {
        vertices += chunk.stats.emitted;
        activeCells += chunk.stats.activeCells;
        fallbacks += chunk.stats.normalFallbacks;
        if (chunk.buffer && chunk.stats.generation < model.activeGeneration())
            ++reusedNonempty;
    }
#if LAB_CHECKPOINT >= 9
    row("PROJECT 44 / CHECKPOINT 09", {0.5F, 0.95F, 0.83F});
#else
    row("PROJECT 44 / CHECKPOINT 08", {0.5F, 0.95F, 0.83F});
#endif
    row("GPU FIELD -> GPU TRIANGLES");
    std::string status = states.at(static_cast<std::size_t>(model.state()));
    if (model.hasQueuedRequest() && !model.gpuBusy())
        status = "REMESH REQUEST QUEUED";
    else if (model.state() == MeshJobState::ready && !model.ready())
        status = "WAITING FOR CURRENT MESH";
    row(status);
    if (model.paused())
        row("PAUSED / SPACE TO RESUME", {1, 0.7F, 0.4F});
    row("FIELD REV " + std::to_string(model.document().revision()) + " / MESH FIELD " + std::to_string(model.activeFieldRevision()));
    row("GEN " + std::to_string(model.activeGeneration()) + " / REQUEST " + std::to_string(model.requestedGeneration()));
    if (!model.ready() && !model.active().empty())
        row("DISPLAYING LAST-GOOD MESH", {1, 0.7F, 0.4F});
    row("N " + std::to_string(grid.samples) + " / SAMPLES " + std::to_string(grid.sampleCount()));
    row("REAL CELLS " + std::to_string(grid.cellCount()));
    row("ACTIVE CELLS " + std::to_string(activeCells));
    row("COUNTED REQUEST " + std::to_string(model.requestedVertices()));
    row("EMITTED ACTIVE " + std::to_string(vertices));
    row("TRIANGLES " + std::to_string(vertices / 3));
#if LAB_CHECKPOINT >= 9
    row("DIRTY REBUILD / SAFE CHUNK REUSE");
    row("REUSED NONEMPTY " + std::to_string(reusedNonempty));
    row("JOB CHUNKS " + std::to_string(model.completedChunks()) + "/" + std::to_string(model.jobChunks()));
#else
    row("FULL REBUILD / NO DIRTY REUSE");
#endif
    row("LAST CHUNKS " + std::to_string(model.lastRebuiltChunks()) + "/" + std::to_string(chunkCount(grid)));
    row("NORMAL FALLBACKS " + std::to_string(fallbacks));
    row("TRACKED GPU BYTES " + std::to_string(budget.used));
    row("UNDO " + std::to_string(model.document().undoCount()) + " / REDO " + std::to_string(model.document().redoCount()));
    row("RADIUS " + std::to_string(controls.brush().radius).substr(0, 5) + " / POWER " + std::to_string(controls.brush().strength).substr(0, 5));
    std::string mode = "ADD";
    if (controls.brush().mode == BrushMode::subtract)
        mode = "SUBTRACT";
    row("BRUSH " + mode + " / DEPTH " + std::to_string(controls.depth()).substr(0, 5));
    if (controls.sculptMode())
        row("LMB SCULPT / TAB -> CAMERA");
    else
        row("LMB ORBIT / TAB -> SCULPT", {1, 0.7F, 0.4F});
    row("RMB ORBIT / MMB PAN / WHEEL ZOOM");
    row("A ADD / D SUBTRACT / Z Y HISTORY");
    row("F2 RADIUS / F3 POWER / F4 DEPTH");
    row("SHIFT DECREASE / CTRL LARGE STEP");
    row("F11 WIRE / F12 NORMAL / F10 MENU");
#if LAB_CHECKPOINT >= 9
    row("F5 FORCE FULL REBUILD / I BOX");
    row("F6 NEXT JOB CHUNK / NO REMESH");
    if (selectedChunk)
        row("SELECTED CHUNK " + std::to_string(*selectedChunk), {1, 0.7F, 0.28F});
#endif
    row("HOME CAMERA / R RESET SPHERE");
    row("SPACE PAUSE / C CANCEL");
    row("ENTER RESUME OR RETRY");
    row("ESC ABORT STROKE / Q QUIT");
    if (!sceneStatus.empty())
        row(std::string(sceneStatus), {1, 0.7F, 0.4F});
    if (!model.error().empty())
        overlay.text(16, static_cast<float>(height - 46), model.error(), {1, 0.65F, 0.4F}, 1.5F, left - 30);
    if (!controls.notice().empty())
        overlay.text(16, static_cast<float>(height - 24), controls.notice(), {1, 0.65F, 0.4F}, 1.5F, left - 30);
}

} // namespace sculpt
