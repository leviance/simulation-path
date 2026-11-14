#pragma once

#include "sculpt_gpu_count_job.hpp"
#include "sculpt_gpu_field_overlay.hpp"

namespace sculpt {

inline void gpuCountPreviewOverlay(Overlay& overlay, const GpuFieldDocument& document, const ModelSettings& settings, const GpuBudget& budget, const GpuFieldLessonControls& controls, const GpuCountLessonJob& job, std::optional<float> value, std::uint32_t probeRevision, int width, int height) {
    const Vec3 text{0.7F, 0.84F, 0.9F}, mint{0.55F, 0.95F, 0.82F};
    const float left = static_cast<float>(width - 348);
    overlay.rect({left, 0, 348, static_cast<float>(height)}, {0.028F, 0.045F, 0.065F});
    float y = 20;
    const auto row = [&](const std::string& label) {
        overlay.text(left + 14, y, label, text, 1.6F, 320);
        y += 21;
    };
    row("PROJECT 44 / CHECKPOINT 07");
    std::string state = "WAITING FOR GPU FIELD";
    if (job.current(document))
        state = "COUNT/SCAN READY / NO MESH";
    if (job.active())
        state = "COUNTING / EDITS LOCKED";
    if (document.strokeOpen())
        state = "FIELD EDITING / OLD SUMMARY";
    if (controls.paused())
        state = "PAUSED / IN-FLIGHT POLL ONLY";
    if (job.cancelled())
        state = "CANCELLED / F1 TO RECOUNT";
    if (job.failed())
        state = "COUNT FAILED / SUMMARY HELD";
    row(state);
    row("N " + std::to_string(settings.grid.samples));
    row("SAMPLES " + std::to_string(settings.grid.sampleCount()));
    row("REAL CELLS " + std::to_string(settings.grid.cellCount()));
    row("PADDED SLOTS " + std::to_string(job.totalChunks() * cellsPerChunk));
    if (job.hasSummary()) {
        row("COUNTED ACTIVE CELLS " + std::to_string(job.activeCells()));
        row("COUNTED VERTICES " + std::to_string(job.vertices()));
        row("COUNTED TRIANGLES " + std::to_string(job.vertices() / 3));
        row("EMITTED VERTICES " + std::to_string(job.emittedVertices()));
    } else {
        row("COUNTED ACTIVE CELLS --");
        row("COUNTED VERTICES --");
        row("COUNTED TRIANGLES --");
        row("EMITTED VERTICES --");
    }
    row("FIELD REV " + std::to_string(document.revision()) + " / COUNT REV " + std::to_string(job.publishedRevision()));
    row("COUNT GENERATION " + std::to_string(job.generation()));
    row("CHUNKS " + std::to_string(job.completedChunks()) + " / " + std::to_string(job.totalChunks()));
    row("TRACKED SSBO BYTES " + std::to_string(budget.used));
    if (job.hasSummary()) {
        row("COUNT MS " + std::to_string(job.times().count).substr(0, 8));
        row("SCAN MS " + std::to_string(job.times().scan).substr(0, 8));
    } else {
        row("COUNT MS --");
        row("SCAN MS --");
    }
    row("LAST COMPLETE GPU QUERY");
    row("NOT A BENCHMARK");
    y += 4;
    row("F5 F6 CHUNK / F7 F8 CELL");
    row("CTRL STEP 16");
    row("X AXIS / UP DOWN LAYER");
    row("HJKL PROBE / ENTER STAMP");
    row("A D MODE / F2 F3 BRUSH");
    row("SHIFT - / CTRL COARSE");
    row("DRAG SLICE / Z Y HISTORY");
    row("C CANCEL COUNT / F1 RETRY");
    row("SPACE PAUSE / ESC ROLLBACK");
    row("1 2 3 PRESET / R RESET");
    row("Q QUIT");
    gpuFieldSliceOverlay(overlay, document, settings, controls, value, probeRevision, width, height);
    const float top = controls.rectangle().y + controls.rectangle().height + 72;
    if (job.inspectionCurrent(document)) {
        const auto& data = job.inspection();
        const auto selected = job.selectedCell();
        std::size_t first = 0;
        if (selected > 16)
            first = std::min(selected - 16, cellsPerChunk - 64);
        const float barWidth = (left - 48) / 64;
        for (std::size_t index = 0; index < 64; ++index) {
            const auto count = data[0][first + index];
            const float barHeight = std::max(1.0F, static_cast<float>(count) * (72.0F / 36));
            Vec3 tint = mint;
            if (first + index == selected)
                tint = {1, 0.78F, 0.35F};
            overlay.rect({24 + static_cast<float>(index) * barWidth, top + 72 - barHeight, std::max(1.0F, barWidth - 1), barHeight}, tint);
        }
        const auto cell = job.selectedGridCell();
        overlay.text(24, top + 82, "CHUNK " + std::to_string(job.selectedChunk()) + " GRID " + std::to_string(cell[0]) + " " + std::to_string(cell[1]) + " " + std::to_string(cell[2]) + " / CELLS " + std::to_string(first) + " TO " + std::to_string(first + 63), text, 1.4F, left - 48);
        const auto count = data[0][selected], offset = data[1][selected];
        overlay.text(24, top + 102, "CELL " + std::to_string(selected) + " COUNT " + std::to_string(count) + " OFFSET " + std::to_string(offset) + " END " + std::to_string(offset + count), {1, 0.85F, 0.5F}, 1.5F, left - 48);
    } else
        overlay.text(24, top + 30, "PREFIX INSPECTION WAITS FOR A COMPLETE CURRENT SNAPSHOT", text, 1.5F, left - 48);
    if (job.failed())
        overlay.text(24, static_cast<float>(height - 24), job.error(), {1, 0.65F, 0.4F}, 1.5F, width - 48.0F);
}

} // namespace sculpt
