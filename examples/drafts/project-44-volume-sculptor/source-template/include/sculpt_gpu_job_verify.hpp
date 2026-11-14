#pragma once

#include "sculpt_gpu_edit_verify.hpp"

namespace sculpt {

// Job protocol fixture only. Runtime never reads back/compares the whole mesh each frame.
inline void verifyGpuMeshJobs(GpuMeshBuilder& model, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(20);
    const auto ready = [&] {
        return model.ready();
    };
    waitForGpuModel(model, ready, deadline);
    const auto originalMesh = snapshotGpuMesh(model);
    const auto originalField = model.document().revision();

    // Pause still drains the submitted fence, but cannot enqueue the next count chunk.
    model.pause(true);
    model.requestIsovalue(0);
    gpuCheck(model.hasQueuedRequest() && !model.ready() && !model.gpuBusy(), "Queued request falsely claimed a current mesh or dispatched while paused");
    model.pause(false);
    model.tick();
    gpuCheck(model.gpuBusy(), "Pause fixture did not submit its first count batch");
    model.pause(true);
    waitForGpuModel(
        model, [&] {
            return !model.gpuBusy();
        },
        deadline
    );
    const auto cursor = model.completedChunks();
    for (int tick = 0; tick < 4; ++tick)
        model.tick();
    gpuCheck(!model.gpuBusy() && model.completedChunks() == cursor && !model.ready(), "Paused job submitted more work or falsely became current");
    model.requestIsovalue(0.075F);
    model.requestIsovalue(0);
    const auto latest = model.requestedGeneration();
    model.pause(false);
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.activeGeneration() == latest && sameGpuMesh(model, originalMesh), "Paused queued requests published an older generation or wrong field");

    // Make a count ticket stale before the CPU accepts its completion.
    model.requestIsovalue(0.025F);
    model.tick();
    gpuCheck(model.gpuBusy(), "Stale-generation fixture did not submit a count ticket");
    model.requestIsovalue(0);
    const auto newest = model.requestedGeneration();
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.activeGeneration() == newest && sameGpuMesh(model, originalMesh), "An in-flight stale count replaced the newest request");

    const auto ids = activeBufferIds(model);
    const auto previousGeneration = model.activeGeneration();
    const auto bytes = budget.used;
    std::size_t firstSurface = 0;
    while (firstSurface < model.active().size() && !model.active()[firstSurface].buffer)
        ++firstSurface;
    gpuCheck(firstSurface < model.active().size(), "Cancel fixture needs a nonempty surface chunk");
    model.requestIsovalue(0);
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::emitting && model.completedChunks() > firstSurface && model.gpuBusy();
        },
        deadline
    );
    gpuCheck(activeBufferIds(model) == ids && model.activeGeneration() == previousGeneration, "A partial candidate was exposed before complete publication");
    model.cancel();
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::cancelled && !model.gpuBusy();
        },
        deadline
    );
    gpuCheck(!model.hasQueuedRequest() && activeBufferIds(model) == ids && model.activeGeneration() == previousGeneration && budget.used == bytes && model.guardsIntact(), "Cancel during emit replaced last-good or leaked candidate storage");
    model.resumeLastGood();
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.activeGeneration() > previousGeneration && model.document().revision() == originalField && sameGpuMesh(model, originalMesh), "Retry did not recover the unchanged field/mesh snapshot");
    std::cout << "GPU MESH JOB PASS queuedNotCurrent=1 pauseDrainsFence=1 pauseStopsNextBatch=1 latestRequestWins=1 staleCountRejected=1 partialEmitHidden=1 cancelDuringEmit=1 candidateBytesReleased=1 retryMeshByteExact=1 fieldUnchanged=1 samples=" << model.settings().grid.sampleCount() << " cells=" << model.settings().grid.cellCount() << '\n';
}

} // namespace sculpt
