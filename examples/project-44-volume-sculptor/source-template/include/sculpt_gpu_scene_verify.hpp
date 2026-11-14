#pragma once

#include "sculpt_gpu_edit_verify.hpp"
#include "sculpt_scene_tasks.hpp"

namespace sculpt {

inline std::unique_ptr<GpuMeshBuilder> waitForScene(NativeSceneTasks& scenes, GpuMeshBuilder& previous, std::chrono::steady_clock::time_point deadline) {
    while (scenes.busy()) {
        if (std::chrono::steady_clock::now() >= deadline)
            throw std::runtime_error("Scene fixture exceeded its overall deadline");
        previous.tick();
        scenes.tick(previous);
        SDL_Event event;
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT)
                throw std::runtime_error("Scene fixture cancelled by window close");
        SDL_Delay(1);
    }
    if (scenes.takeRetained())
        previous.resumeLastGood();
    return scenes.takeModel();
}

inline double compareResampledField(const ScalarGrid& reference, const GpuMeshBuilder& actual) {
    const auto& grid = actual.settings().grid;
    double worst = 0;
    for (std::size_t first = 0; first < grid.sampleCount(); first += 65536) {
        const auto values = actual.readField(first, std::min<std::size_t>(65536, grid.sampleCount() - first));
        for (std::size_t local = 0; local < values.size(); ++local) {
            const auto id = first + local;
            const Vec3 coordinate{static_cast<float>(id % grid.samples), static_cast<float>((id / grid.samples) % grid.samples), static_cast<float>(id / (grid.samples * grid.samples))};
            const auto point = grid.worldFromGrid(coordinate);
            const double error = std::abs(values[local] - reference.sample(point));
            gpuCheck(std::isfinite(values[local]) && error < 0.000003, "GPU resolution resampling differs from the stored CPU trilinear reference");
            worst = std::max(worst, error);
        }
    }
    return worst;
}

inline void verifyResetPreset(const GpuMeshBuilder& model) {
    const auto& grid = model.settings().grid;
    double worst = 0;
    for (std::size_t first = 0; first < grid.sampleCount(); first += 65536) {
        const auto values = model.readField(first, std::min<std::size_t>(65536, grid.sampleCount() - first));
        for (std::size_t local = 0; local < values.size(); ++local) {
            const auto id = first + local;
            const auto point = grid.worldFromGrid({static_cast<float>(id % grid.samples), static_cast<float>((id / grid.samples) % grid.samples), static_cast<float>(id / (grid.samples * grid.samples))});
            const double x = point.x, y = point.y, z = point.z;
            double expected = std::sqrt(x * x + y * y + z * z) - 0.82;
            if (model.settings().shape == Shape::separatedSpheres) {
                const double left = std::sqrt((x + 0.55) * (x + 0.55) + y * y + z * z) - 0.42;
                const double right = std::sqrt((x - 0.55) * (x - 0.55) + y * y + z * z) - 0.42;
                expected = std::min(left, right);
            } else if (model.settings().shape == Shape::torus) {
                const double radial = std::sqrt(x * x + z * z) - 0.68;
                expected = std::sqrt(radial * radial + y * y) - 0.22;
            }
            const auto error = std::abs(values[local] - expected);
            gpuCheck(error < 0.000004 && std::isfinite(values[local]), "Reset did not recreate the selected analytic preset");
            worst = std::max(worst, error);
        }
    }
    std::cout << "GPU RESET FIELD PASS samples=" << grid.samples << " shape=" << static_cast<int>(model.settings().shape) << " maxScalarError=" << worst << '\n';
}

inline void verifyGpuSceneChanges(GpuMeshBuilder& source, GlApi& gl, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
    waitForGpuModel(
        source, [&] {
            return source.ready();
        },
        deadline
    );
    Brush brush{{0.7F, 0, 0}, 0.32F, 0.28F, BrushMode::add};
    gpuCheck(source.beginStroke(60, brush) && source.endStroke(60), "Resampling fixture could not prepare an edited stored field");
    waitForGpuModel(
        source, [&] {
            return source.ready();
        },
        deadline
    );
    ScalarGrid original(source.settings().grid);
    original.replaceValues(snapshotGpuField(source));

    NativeSceneTasks scenes(gl, budget);
    gpuCheck(scenes.resolution(source, 64, 0), "Resolution request was not accepted");
    auto changed = waitForScene(scenes, source, deadline);
    gpuCheck(changed && changed->ready() && changed->settings().grid.samples == 64, "A partial or incorrect grid was handed off");
    const auto downError = compareResampledField(original, *changed);
    gpuCheck(changed->document().undoCount() == 0 && changed->document().redoCount() == 0, "New resolution retained incompatible old-grid history");
    ScalarGrid smaller(changed->settings().grid);
    smaller.replaceValues(snapshotGpuField(*changed));
    gpuCheck(scenes.resolution(*changed, 128, 0), "Mandatory 128-sample resampling request was not accepted");
    auto larger = waitForScene(scenes, *changed, deadline);
    gpuCheck(larger && larger->settings().grid.samples == 128, "128-cubed resampling was replaced by a smaller workload");
    const auto upError = compareResampledField(smaller, *larger);
    changed = std::move(larger);
    gpuCheck(changed->guardsIntact(), "Resolution resampling damaged its source/destination canary");
    std::cout << "GPU RESAMPLE PASS source=128 down=64 up=128 downMax=" << downError << " upMax=" << upError << " editedFieldPreserved=1 worldDomainPreserved=1 fullSamplesChecked=1\n";

    const auto oldIds = activeBufferIds(*changed);
    const auto oldRevision = changed->document().revision();
    gpuCheck(!scenes.resolution(*changed, 128, 0) && changed->ready() && activeBufferIds(*changed) == oldIds && changed->document().revision() == oldRevision, "Choosing the current resolution changed data/history or scheduled work");
    gpuCheck(scenes.resolution(*changed, 192, 0), "First coalescing request was rejected");
    changed->tick();
    scenes.tick(*changed);
    gpuCheck(scenes.reset(*changed, Shape::separatedSpheres) && scenes.resolution(*changed, 64, 0), "Newest scene request was not queued");
    gpuCheck(scenes.selectedShape(*changed) == Shape::separatedSpheres && scenes.reset(*changed, scenes.selectedShape(*changed)), "Reset reverted a pending preset to the old active shape");
    auto latest = waitForScene(scenes, *changed, deadline);
    gpuCheck(latest && latest->settings().grid.samples == 64 && latest->settings().shape == Shape::separatedSpheres, "An obsolete resolution/preset request became active");
    verifyResetPreset(*latest);
    changed = std::move(latest);

    Brush wide{{0, 0, 0}, 0.6F, 0.35F, BrushMode::add};
    gpuCheck(changed->beginStroke(61, wide), "Reset fixture could not start its owned stroke");
    waitForGpuModel(
        *changed, [&] {
            return changed->document().times().brush > 0;
        },
        deadline
    );
    gpuCheck(scenes.reset(*changed, Shape::sphere), "Reset during an active stroke was rejected");
    auto reset = waitForScene(scenes, *changed, deadline);
    gpuCheck(reset && !changed->moveStroke(61, {0.1F, 0, 0}) && !reset->moveStroke(61, {0.1F, 0, 0}) && reset->document().undoCount() == 0, "The old pointer continued writing after grid replacement");
    verifyResetPreset(*reset);
    changed = std::move(reset);

    const auto beforeCancel = budget.used;
    const auto lastGood = activeBufferIds(*changed);
    gpuCheck(scenes.resolution(*changed, 128, 0), "Cancellation fixture could not start its candidate");
    while (scenes.busy() && scenes.progress() <= 0.25) {
        if (std::chrono::steady_clock::now() >= deadline)
            throw std::runtime_error("Scene cancellation fixture exceeded its deadline");
        changed->tick();
        scenes.tick(*changed);
        SDL_Delay(1);
    }
    scenes.pause(true);
    for (int tick = 0; tick < 6; ++tick) {
        changed->tick();
        scenes.tick(*changed);
        SDL_Delay(1);
    }
    const auto held = scenes.progress();
    for (int tick = 0; tick < 10; ++tick) {
        changed->tick();
        scenes.tick(*changed);
        SDL_Delay(1);
    }
    gpuCheck(scenes.paused() && scenes.progress() == held && activeBufferIds(*changed) == lastGood, "Pausing the grid job submitted more work or replaced the current mesh");
    scenes.cancel();
    auto cancelled = waitForScene(scenes, *changed, deadline);
    gpuCheck(!cancelled && changed->ready() && activeBufferIds(*changed) == lastGood && budget.used == beforeCancel, "Cancelled replacement published a partial model or leaked its allocation budget");
    const auto beforeFault = budget.used;
    budget.limit = budget.used;
    gpuCheck(scenes.reset(*changed, Shape::torus), "Allocation refusal fixture could not begin its bounded request");
    auto refused = waitForScene(scenes, *changed, deadline);
    budget.limit = gpuByteBudget;
    gpuCheck(!refused && changed->ready() && activeBufferIds(*changed) == lastGood && budget.used == beforeFault, "A failed candidate destroyed last-good or leaked its budget");
    gpuCheck(!scenes.resolution(*changed, 65, 0) && changed->ready() && !scenes.busy(), "Invalid resolution was accepted or stopped the valid current model");
    std::cout << "GPU SCENE LIFECYCLE PASS sameResolutionNoop=1 newestRequestOnly=1 resetCancelsOwner=1 pauseBetweenBatches=1 cancelledCandidate=1 allocationRefusal=1 lastGood=1 invalidResolution=1\n";
}

} // namespace sculpt
