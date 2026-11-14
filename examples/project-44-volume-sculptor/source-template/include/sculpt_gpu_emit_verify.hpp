#pragma once

#include "sculpt_camera.hpp"
#include "sculpt_gpu_edit_verify.hpp"
#include "sculpt_gpu_layout_verify.hpp"

namespace sculpt {

// Exact binary spacing makes this checker fixture exercise a truly zero gradient on GPU.
inline void verifyCriticalGpuNormals(GlApi& gl, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(20);
    ModelSettings settings;
    settings.grid = {32, {-1.5F, -1.5F, -1.5F}, 3.875F};
    std::vector<float> values(settings.grid.sampleCount(), 1);
    for (int z = 0; z < 5; ++z)
        for (int y = 0; y < 5; ++y)
            for (int x = 0; x < 5; ++x)
                if ((x + y + z) % 2 == 0)
                    values[settings.grid.sampleIndex(x, y, z)] = -1;
    GpuMeshBuilder model(gl, budget, settings, false, FieldInitialization::archive);
    model.appendImport(values);
    waitForGpuModel(
        model, [&] {
            return !model.gpuBusy() && model.document().initializedSamples() == values.size();
        },
        deadline
    );
    model.finishImport();
    waitForGpuModel(
        model, [&] {
            return model.ready();
        },
        deadline
    );
    std::size_t fallbacks = 0, checked = 0;
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        fallbacks += model.active()[chunk].stats.normalFallbacks;
        for (const auto& vertex : model.readChunk(chunk)) {
            gpuCheck(finite(normalOf(vertex)) && std::abs(length(normalOf(vertex)) - 1) < 0.00001F, "Zero-gradient GPU fallback left an invalid normal");
            ++checked;
        }
    }
    gpuCheck(fallbacks > 0 && checked > fallbacks && model.guardsIntact(), "Critical GPU field did not exercise both gradient and face fallback normals");
    std::cout << "GPU CRITICAL NORMAL PASS samples=" << values.size() << " spacing=0.125 vertices=" << checked << " zeroGradientFallbacks=" << fallbacks << " finiteUnitNormals=1 guards=ok\n";
}

#if LAB_CHECKPOINT == 8
// Validation-only mesh readback. This does not run in the interactive edit/count/emit path.
inline void verifyEmittedSurface(const GpuMeshBuilder& model) {
    gpuCheck(model.ready() && model.guardsIntact(), "Emit fixture needs a complete mesh and intact guards");
    const auto& grid = model.settings().grid;
    const Vec3 maximum = grid.origin + Vec3{1, 1, 1} * grid.extent;
    std::uint64_t emitted = 0;
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        const auto& stats = model.active()[chunk].stats;
        gpuCheck(stats.vertices == stats.emitted && stats.vertices % 3 == 0 && !stats.invalid && !stats.mismatch && stats.generation == model.activeGeneration(), "Full rebuild mixed count/emit/generation");
        const auto vertices = model.readChunk(chunk);
        for (const auto& vertex : vertices) {
            const auto p = positionOf(vertex), n = normalOf(vertex);
            gpuCheck(finite(p) && finite(n) && std::abs(length(n) - 1) < 0.0001F && vertex.position[3] == 1 && vertex.normal[3] == 0, "Emit produced an invalid packed vertex or normal");
            gpuCheck(p.x >= grid.origin.x && p.y >= grid.origin.y && p.z >= grid.origin.z && p.x <= maximum.x && p.y <= maximum.y && p.z <= maximum.z, "An emitted point is outside the stored field domain");
        }
        emitted += vertices.size();
    }
    gpuCheck(emitted > 0 && emitted == model.requestedVertices(), "Published emitted count differs from exact allocation");
    std::cout << "GPU EMIT SNAPSHOT PASS field=" << model.document().revision() << " meshField=" << model.activeFieldRevision() << " emitted=" << emitted << " triangles=" << emitted / 3 << " exactAllocation=1 finiteUnitNormals=1 guards=ok\n";
}

inline void verifyGpuEmitLesson(GpuMeshBuilder& model, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(20);
    const auto ready = [&] {
        return model.ready();
    };
    waitForGpuModel(model, ready, deadline);
    verifyGpuShape(model, false);
    const auto original = snapshotGpuField(model);
    const auto originalMesh = snapshotGpuMesh(model);
    const auto initialIds = activeBufferIds(model);
    Brush brush{{0.6F, 0.1F, 0}, 0.32F, 0.22F, BrushMode::add};
    gpuCheck(model.beginStroke(8, brush) && model.endStroke(8), "Emit lesson could not commit its local stroke");
    waitForGpuModel(model, ready, deadline);
    const auto edited = snapshotGpuField(model);
    const auto error = verifyBrushReference(model.settings().grid, original, edited, std::span(&brush, 1));
    const auto editedMesh = snapshotGpuMesh(model);
    gpuCheck(!sameGpuMesh(model, originalMesh), "A surface-crossing edit did not change the emitted mesh");
    const auto editedIds = activeBufferIds(model);
    std::size_t reused = 0;
    for (std::size_t chunk = 0; chunk < editedIds.size(); ++chunk)
        if (editedIds[chunk] != 0 && editedIds[chunk] == initialIds[chunk])
            ++reused;
    gpuCheck(model.lastRebuiltChunks() == chunkCount(model.settings().grid) && reused == 0, "Checkpoint 08 unexpectedly used dirty-chunk reuse");
    verifyEmittedSurface(model);
    if (model.settings().grid.samples <= 64)
        verifyGpuLayout(model);
    const auto generation = model.activeGeneration();
    Camera camera;
    camera.orbit(16, -8);
    camera.pan(3, 5);
    camera.zoom(1);
    for (int tick = 0; tick < 4; ++tick)
        model.tick();
    gpuCheck(model.activeGeneration() == generation && activeBufferIds(model) == editedIds, "Camera-only changes triggered a rebuild");
    gpuCheck(model.undo(), "Emit lesson undo was unavailable");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(snapshotGpuField(model) == original && sameGpuMesh(model, originalMesh), "Undo did not restore both field and emitted mesh");
    gpuCheck(model.redo(), "Emit lesson redo was unavailable");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(snapshotGpuField(model) == edited && sameGpuMesh(model, editedMesh), "Redo did not restore both field and emitted mesh");
    const auto lastGood = activeBufferIds(model);
    const auto allocated = budget.used;
    model.setMeshVertexLimit(3);
    model.requestIsovalue(0);
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::failed;
        },
        deadline
    );
    gpuCheck(activeBufferIds(model) == lastGood && budget.used == allocated && !model.error().empty(), "Capacity refusal replaced last-good or allocated/truncated output");
    model.setMeshVertexLimit(maximumMeshVertices);
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.guardsIntact() && sameGpuMesh(model, editedMesh), "Emit did not recover its exact last-good geometry");
    std::cout << "GPU EMIT LESSON PASS fullRebuildChunks=" << model.lastRebuiltChunks() << '/' << chunkCount(model.settings().grid) << " reusedNonempty=" << reused << " cameraNoRemesh=1 historyFieldAndMeshByteExact=1 capacityBeforeAllocation=1 lastGood=1 recovery=1 brushMax=" << error << " samples=" << model.settings().grid.sampleCount() << " cells=" << model.settings().grid.cellCount() << '\n';
}
#endif

} // namespace sculpt
