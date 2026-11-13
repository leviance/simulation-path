#pragma once

#include "sculpt_file_tasks.hpp"
#include "sculpt_gpu_edit_verify.hpp"

namespace sculpt {

template <class Complete, class Step>
void waitForFileFixture(Complete complete, Step step, std::chrono::steady_clock::time_point deadline) {
    while (!complete()) {
        if (std::chrono::steady_clock::now() >= deadline)
            throw std::runtime_error("GPU file fixture exceeded its overall deadline");
        SDL_Event event;
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT)
                throw std::runtime_error("GPU file fixture cancelled by window close");
        step();
        SDL_Delay(1);
    }
}

inline void verifyGpuFiles(GpuMeshBuilder& model, GlApi& gl, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
    waitForGpuModel(
        model, [&] {
            return model.ready();
        },
        deadline
    );
    const auto original = snapshotGpuField(model);
    const auto originalMesh = gpuMeshFingerprint(model);
    SaveFieldJob save(gl, budget, model);
    Brush edit{{0.7F, 0, 0}, 0.3F, 0.35F, BrushMode::add};
    gpuCheck(model.beginStroke(31, edit) && model.endStroke(31), "Concurrent save fixture could not begin its later stroke");
    waitForFileFixture([&] {
        return save.stage() == FileStage::complete && model.ready();
    },
                       [&] {
                           save.tick();
                           model.tick();
                           if (model.state() == MeshJobState::failed)
                               throw std::runtime_error(model.error());
                       },
                       deadline);
    gpuCheck(snapshotGpuField(model) != original, "The post-snapshot edit did not change the current field");
    const auto expectedBytes = fieldHeaderSize + original.size() * sizeof(float);
    gpuCheck(std::filesystem::file_size(save.path()) == expectedBytes && !std::filesystem::exists(save.partialPath()), "Saved field size or atomic publication is wrong");

    LoadFieldJob load(gl, budget, save.path());
    waitForFileFixture([&] {
        return load.complete();
    },
                       [&] {
                           load.tick();
                       },
                       deadline);
    auto restored = load.takeModel();
    gpuCheck(snapshotGpuField(*restored) == original && gpuMeshFingerprint(*restored) == originalMesh, "Loading did not restore the frozen field and actual GPU mesh bit-exactly");
    gpuCheck(restored->document().undoCount() == 0 && restored->document().redoCount() == 0 && restored->guardsIntact(), "Imported document inherited stale history or damaged canaries");
    std::cout << "GPU FIELD IO PASS bytes=" << expectedBytes << " samples=" << original.size() << " frozenDuringEdit=1 restoredField=bitExact restoredMesh=bitExact uploadMs=" << restored->times().upload << '\n';

    ExportMeshJob exportJob(*restored);
    restored->requestIsovalue(0.05F);
    waitForFileFixture([&] {
        return exportJob.stage() == FileStage::complete && restored->ready();
    },
                       [&] {
                           exportJob.tick();
                           restored->tick();
                           if (restored->state() == MeshJobState::failed)
                               throw std::runtime_error(restored->error());
                       },
                       deadline);
    gpuCheck(exportJob.summary().vertices != 0 && exportJob.summary().triangles * 3 == exportJob.summary().vertices && !std::filesystem::exists(exportJob.partialPath()), "Export did not publish one complete, parsed mesh snapshot");
    std::cout << "GPU MESH IO PASS vertices=" << exportJob.summary().vertices << " triangles=" << exportJob.summary().triangles << " bytes=" << std::filesystem::file_size(exportJob.path()) << " immutableDuringRemesh=1 readBackNumericHash=bitExact\n";

    SaveFieldJob cancelledSave(gl, budget, *restored);
    cancelledSave.cancel();
    waitForFileFixture([&] {
        return cancelledSave.stage() == FileStage::cancelled;
    },
                       [&] {
                           cancelledSave.tick();
                       },
                       deadline);
    gpuCheck(!std::filesystem::exists(cancelledSave.path()) && std::filesystem::exists(cancelledSave.partialPath()), "Cancelled save published a partial archive");
    ExportMeshJob cancelledExport(*restored);
    cancelledExport.tick();
    cancelledExport.cancel();
    cancelledExport.tick();
    gpuCheck(cancelledExport.stage() == FileStage::cancelled && !std::filesystem::exists(cancelledExport.path()), "Cancelled export published a partial mesh");

    const auto invalidDirectory = reserveOutputDirectory("invalid-fixture");
    const auto invalidPath = invalidDirectory / "bad-checksum.scl";
    std::filesystem::copy_file(save.path(), invalidPath);
    {
        std::fstream altered(invalidPath, std::ios::in | std::ios::out | std::ios::binary);
        altered.seekg(-1, std::ios::end);
        char value{};
        altered.get(value);
        value ^= 1;
        altered.seekp(-1, std::ios::end);
        altered.put(value);
        altered.flush();
        gpuCheck(static_cast<bool>(altered), "Could not prepare the isolated malformed-file fixture");
    }
    const auto lastGood = activeBufferIds(*restored);
    LoadFieldJob invalid(gl, budget, invalidPath);
    bool rejected = false;
    try {
        waitForFileFixture([&] {
            return invalid.complete();
        },
                           [&] {
                               invalid.tick();
                           },
                           deadline);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    gpuCheck(rejected && activeBufferIds(*restored) == lastGood && restored->ready() && restored->guardsIntact(), "A checksum-invalid private load candidate affected last-good");
    std::cout << "GPU FILE LIFECYCLE PASS cancelledSave=1 cancelledExport=1 checksumFailure=1 lastGood=1 outputRoot=.runtime/volume-sculptor\n";
    std::cout << "VERIFIED_FIELD=" << pathText(save.path()) << "\nVERIFIED_MESH=" << pathText(exportJob.path()) << '\n';
}

} // namespace sculpt
