#pragma once

#include "sculpt_gpu_pick.hpp"
#include "sculpt_gpu_verify.hpp"
#include "sculpt_mesh_snapshot.hpp"
#include <bit>

namespace sculpt {

inline void APIENTRY refuseBufferStorage(GLenum, GLsizeiptr, const void*, GLenum) {}

// Exercise the failed-driver-storage cleanup branch without exhausting physical VRAM or RAM.
class BufferStorageFault {
    public:
    explicit BufferStorageFault(GlApi& gl)
        : gl_(gl), original_(gl.BufferData) {
        gl_.BufferData = refuseBufferStorage;
    }

    ~BufferStorageFault() {
        gl_.BufferData = original_;
    }

    private:
    GlApi& gl_;
    PFNGLBUFFERDATAPROC original_;
};

inline void gpuCheck(bool value, const char* message) {
    if (!value)
        throw std::runtime_error(message);
}

template <class Predicate>
void waitForGpuModel(GpuMeshBuilder& model, Predicate complete, std::chrono::steady_clock::time_point deadline) {
    while (!complete()) {
        if (std::chrono::steady_clock::now() >= deadline)
            throw std::runtime_error("GPU editing fixture exceeded its overall deadline");
        SDL_Event event;
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT)
                throw std::runtime_error("GPU fixture cancelled by window close");
        model.tick();
        if (!complete() && model.state() == MeshJobState::failed)
            throw std::runtime_error("GPU fixture: " + model.error());
        SDL_Delay(1);
    }
}

// Validation-only readback. Runtime sculpting/meshing never calls this full-field helper.
inline std::vector<float> snapshotGpuField(const GpuMeshBuilder& model) {
    gpuCheck(model.ready(), "A field snapshot requires the complete current mesh");
    std::vector<float> result;
    result.reserve(model.settings().grid.sampleCount());
    for (std::size_t first = 0; first < model.settings().grid.sampleCount(); first += 65536) {
        const auto count = std::min<std::size_t>(65536, model.settings().grid.sampleCount() - first);
        const auto values = model.readField(first, count);
        result.insert(result.end(), values.begin(), values.end());
    }
    return result;
}

inline std::vector<GLuint> activeBufferIds(const GpuMeshBuilder& model) {
    std::vector<GLuint> result;
    for (const auto& chunk : model.active()) {
        GLuint id = 0;
        if (chunk.buffer)
            id = chunk.buffer->id();
        result.push_back(id);
    }
    return result;
}

inline std::uint64_t gpuMeshFingerprint(const GpuMeshBuilder& model) {
    std::uint64_t hash = 14695981039346656037ULL;
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        const auto vertices = model.readChunk(chunk);
        gpuCheck(model.active()[chunk].validForGeneration == model.activeGeneration(), "A reused chunk is not valid for the published generation");
        const auto bytes = std::as_bytes(std::span(vertices));
        const auto* data = bytes.data();
        // Same byte-for-byte FNV input/order, without a checked iterator increment per byte in Debug.
        // readChunk sizes the vector from its validated, bounded ACTIVE vertex count.
        for (std::size_t index = 0; index < bytes.size(); ++index) {
            hash ^= std::to_integer<std::uint8_t>(data[index]);
            hash *= 1099511628211ULL;
        }
    }
    return hash;
}

inline MeshSnapshot snapshotGpuMesh(const GpuMeshBuilder& model) {
    gpuCheck(model.ready(), "Mesh snapshot needs a complete current generation");
    MeshSnapshot result;
    result.reserve(model.active().size());
    std::size_t vertices = 0;
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        gpuCheck(model.active()[chunk].validForGeneration == model.activeGeneration(), "Snapshot chunk is not valid for ACTIVE");
        auto data = model.readChunk(chunk);
        vertices += data.size();
        gpuCheck(vertices <= maximumMeshVertices, "Diagnostic snapshot exceeded the declared mesh capacity");
        result.push_back(std::move(data));
    }
    return result;
}

inline bool sameGpuMesh(const GpuMeshBuilder& model, const MeshSnapshot& expected) {
    gpuCheck(model.ready(), "Byte comparison needs a complete current generation");
    if (expected.size() != model.active().size())
        return false;
    for (std::size_t chunk = 0; chunk < expected.size(); ++chunk) {
        gpuCheck(model.active()[chunk].validForGeneration == model.activeGeneration(), "Compared chunk is not valid for ACTIVE");
        if (!sameSurfaceBytes(model.readChunk(chunk), expected[chunk]))
            return false;
    }
    return true;
}

inline double verifyBrushReference(const GridSpec& grid, const std::vector<float>& before, const std::vector<float>& after, std::span<const Brush> stamps) {
    gpuCheck(before.size() == grid.sampleCount() && after.size() == before.size(), "Brush fixture has the wrong field size");
    double worst = 0;
    std::size_t changed = 0;
    for (std::size_t id = 0; id < before.size(); ++id) {
        const int x = static_cast<int>(id % grid.samples);
        const int y = static_cast<int>((id / grid.samples) % grid.samples);
        const int z = static_cast<int>(id / (grid.samples * grid.samples));
        const auto point = grid.worldFromGrid({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)});
        double expected = before[id];
        const bool boundary = x == 0 || y == 0 || z == 0 || x == grid.samples - 1 || y == grid.samples - 1 || z == grid.samples - 1;
        if (!boundary) {
            for (const auto& brush : stamps) {
                const double dx = static_cast<double>(point.x) - brush.center.x;
                const double dy = static_cast<double>(point.y) - brush.center.y;
                const double dz = static_cast<double>(point.z) - brush.center.z;
                const double q = (dx * dx + dy * dy + dz * dz) / (static_cast<double>(brush.radius) * brush.radius);
                const double remainder = std::max(0.0, 1.0 - q);
                double delta = brush.strength * remainder * remainder;
                if (brush.mode == BrushMode::add)
                    delta = -delta;
                if (delta != 0)
                    expected = std::clamp(expected + delta, -4.0, 4.0);
            }
        }
        const double error = std::abs(after[id] - expected);
        gpuCheck(std::isfinite(after[id]) && error < 0.000003, "GPU brush differs from independent double-precision falloff reference");
        if (boundary)
            gpuCheck(after[id] == before[id], "GPU brush changed a protected boundary sample");
        worst = std::max(worst, error);
        if (after[id] != before[id])
            ++changed;
    }
    gpuCheck(changed != 0, "GPU brush fixture did not edit any stored samples");
    return worst;
}

inline void verifyGpuPicking(GpuMeshBuilder& model, GpuPicker& picker, std::chrono::steady_clock::time_point deadline) {
    double worst = 0;
    for (const float x : {0.0F, 0.35F, 0.78F, 1.4F}) {
        gpuCheck(picker.request(model, {x, 0, 4}, {0, 0, -1}, 123), "An idle current field refused a finite picking ray");
        std::optional<PickAnswer> answer;
        waitForGpuModel(
            model, [&] {
                if (!answer)
                    answer = picker.poll();
                return answer.has_value();
            },
            deadline
        );
        gpuCheck(answer->tag == 123 && answer->data.state[1] == model.document().revision(), "GPU pick mixed a request or field revision");
        if (x > 0.82F) {
            gpuCheck(!answer->hit(), "A ray outside the sphere returned a false hit");
            continue;
        }
        const double expectedZ = std::sqrt(0.82 * 0.82 - static_cast<double>(x) * x);
        const double error = std::abs(answer->point().z - expectedZ);
        gpuCheck(answer->hit() && error < 2 * model.settings().grid.spacing() * model.settings().grid.spacing(), "GPU field picking differs from an independent sphere/ray intersection");
        gpuCheck(std::abs(answer->data.pointValue[3]) < 0.000003F && answer->data.state[2] <= 2048, "GPU pick did not report a bounded isovalue crossing");
        worst = std::max(worst, error);
    }
    gpuCheck(picker.request(model, {0, 0, 0}, {0, 0, 1}, 124), "Inside-origin picking request failed");
    std::optional<PickAnswer> answer;
    waitForGpuModel(
        model, [&] {
            if (!answer)
                answer = picker.poll();
            return answer.has_value();
        },
        deadline
    );
    gpuCheck(answer->hit() && answer->point().z > 0.8F && answer->normal().z > 0.99F, "Inside-origin ray did not find the outward exit surface");
    std::cout << "GPU PICK PASS hitMiss=4 insideExit=1 maxWorldError=" << worst << " stepBudget=2048 summaryBytes=64\n";
}

inline void verifyGpuNoop(GlApi& gl, GpuBudget& budget, std::chrono::steady_clock::time_point deadline) {
    ModelSettings settings;
    settings.grid.samples = 32;
    GpuMeshBuilder model(gl, budget, settings);
    auto ready = [&] {
        return model.ready();
    };
    waitForGpuModel(model, ready, deadline);
    Brush real{{0.7F, 0, 0}, 0.28F, 0.2F, BrushMode::add};
    gpuCheck(model.beginStroke(40, real) && model.endStroke(40), "No-op fixture could not prepare history");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.undo(), "No-op fixture could not prepare a redo snapshot");
    waitForGpuModel(model, ready, deadline);
    const auto original = snapshotGpuField(model);
    const auto buffers = activeBufferIds(model);
    const auto generation = model.activeGeneration();
    const auto fieldRevision = model.document().revision();
    // For N=32 the eight nearest samples are about 0.0838 units from this cell center.
    Brush betweenSamples{{0, 0, 0}, 0.03F, 0.3F, BrushMode::add};
    gpuCheck(model.beginStroke(41, betweenSamples) && model.endStroke(41), "No-op fixture could not submit its bounded stamp");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.document().changedSampleWrites() == 0 && model.document().undoCount() == 0 && model.document().redoCount() == 1, "A no-op stroke consumed undo or cleared redo");
    gpuCheck(model.document().revision() == fieldRevision && model.activeGeneration() == generation && activeBufferIds(model) == buffers && snapshotGpuField(model) == original, "A no-op stroke changed data, generation or mesh buffers");
    gpuCheck(model.guardsIntact(), "Edit summary canary was damaged");
    std::cout << "GPU NOOP PASS samples=32768 changedWrites=0 undoPreserved=1 redoPreserved=1 noRemesh=1 summaryBytes=16\n";
}

inline void verifyPausedGpuInput(GpuMeshBuilder& model, const GpuBudget& budget) {
    const auto revision = model.document().revision();
    const auto bytes = budget.used;
    model.pause(true);
    gpuCheck(!model.beginStroke(90, Brush{{0.6F, 0, 0}, 0.28F, 0.2F, BrushMode::add}) && !model.undo() && !model.redo(), "Paused mesh accepted a brush/history mutation");
    for (int tick = 0; tick < 3; ++tick)
        model.tick();
    gpuCheck(!model.gpuBusy() && model.document().revision() == revision && budget.used == bytes, "Paused input submitted GPU work or allocated history");
    model.pause(false);
}

inline void verifyGpuEditing(GpuMeshBuilder& model, GpuBudget& budget, GlApi& gl) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
    auto ready = [&] {
        return model.ready();
    };
    waitForGpuModel(model, ready, deadline);
    verifyGpuShape(model, false);
    GpuPicker picker(gl, budget);
    verifyGpuPicking(model, picker, deadline);
    verifyGpuNoop(gl, budget, deadline);
    const auto original = snapshotGpuField(model);
    const auto originalIds = activeBufferIds(model);

    Brush add{{0.6F, 0.1F, 0}, 0.32F, 0.22F, BrushMode::add};
    gpuCheck(model.beginStroke(7, add), "GPU stroke did not acquire its owner");
    gpuCheck(!model.moveStroke(8, {0.7F, 0.1F, 0}) && !model.endStroke(8), "Foreign pointer changed or ended a GPU stroke");
    gpuCheck(model.moveStroke(7, {0.8F, 0.1F, 0}) && model.endStroke(7), "Owner could not finish its GPU stroke");
    waitForGpuModel(model, ready, deadline);
    const auto edited = snapshotGpuField(model);
    std::array<Brush, 3> referenceStamps{add, add, add};
    referenceStamps[1].center.x = 0.68F;
    referenceStamps[2].center.x = 0.76F;
    const auto addError = verifyBrushReference(model.settings().grid, original, edited, referenceStamps);
    const auto editedIds = activeBufferIds(model);
    std::size_t reused = 0;
    for (std::size_t chunk = 0; chunk < editedIds.size(); ++chunk)
        if (editedIds[chunk] != 0 && editedIds[chunk] == originalIds[chunk])
            ++reused;
    gpuCheck(model.lastRebuiltChunks() > 0 && model.lastRebuiltChunks() < chunkCount(model.settings().grid) && reused > 0, "A local edit rebuilt everything instead of reusing proven-unaffected chunks");
    const auto incremental = snapshotGpuMesh(model);
    verifyPausedGpuInput(model, budget);
    const auto localChunks = model.lastRebuiltChunks();
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);
    gpuCheck(sameGpuMesh(model, incremental), "Dirty-chunk geometry/normals differ from a full extraction of the same field");
    std::cout << "GPU DIRTY PASS rebuilt=" << localChunks << '/' << chunkCount(model.settings().grid) << " reusedNonempty=" << reused << " fullMeshByteMatch=1 addMax=" << addError << '\n';

    gpuCheck(model.undo(), "GPU undo was unavailable after a committed stroke");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(snapshotGpuField(model) == original, "GPU undo did not restore the field byte-exactly");
    verifyPausedGpuInput(model, budget);
    gpuCheck(model.redo(), "GPU redo was unavailable after undo");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(snapshotGpuField(model) == edited, "GPU redo did not restore the edited field byte-exactly");

    Brush subtract{{0.68F, 0.1F, 0}, 0.35F, 0.18F, BrushMode::subtract};
    gpuCheck(model.beginStroke(9, subtract) && model.endStroke(9), "Subtract stroke could not commit");
    waitForGpuModel(model, ready, deadline);
    const auto subtracted = snapshotGpuField(model);
    const auto subtractError = verifyBrushReference(model.settings().grid, edited, subtracted, std::span(&subtract, 1));
    gpuCheck(model.undo(), "Subtract undo was unavailable");
    waitForGpuModel(model, ready, deadline);
    gpuCheck(snapshotGpuField(model) == edited, "Subtract undo did not restore its before-stroke snapshot");

    Brush wide{{0.2F, 0, 0}, 0.6F, 0.4F, BrushMode::subtract};
    gpuCheck(model.beginStroke(11, wide), "Rollback fixture could not begin");
    waitForGpuModel(
        model, [&] {
            return model.document().times().brush > 0;
        },
        deadline
    );
    model.abortStroke();
    waitForGpuModel(model, ready, deadline);
    gpuCheck(!model.moveStroke(11, {0.3F, 0, 0}) && snapshotGpuField(model) == edited, "Blur rollback left a partial dispatch or accepted a stale owner");
    std::cout << "GPU HISTORY PASS pointerOwner=1 undoRedoByteExact=1 subtractMax=" << subtractError << " partialBatchRollback=1 pausedMutationGates=2\n";

    auto lastGood = activeBufferIds(model);
    const auto lastGeneration = model.activeGeneration();
    model.requestIsovalue(0.075F);
    model.tick();
    model.cancel();
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::cancelled;
        },
        deadline
    );
    for (int tick = 0; tick < 10; ++tick)
        model.tick();
    gpuCheck(activeBufferIds(model) == lastGood && model.activeGeneration() == lastGeneration, "A cancelled generation replaced last-good chunks");
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);

    lastGood = activeBufferIds(model);
    model.setMeshVertexLimit(3);
    model.requestIsovalue(0);
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::failed;
        },
        deadline
    );
    gpuCheck(!model.error().empty() && activeBufferIds(model) == lastGood, "Capacity overflow silently truncated or replaced last-good");
    model.setMeshVertexLimit(maximumMeshVertices);
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);

    lastGood = activeBufferIds(model);
    budget.limit = budget.used;
    model.requestIsovalue(0.025F);
    waitForGpuModel(
        model, [&] {
            return model.state() == MeshJobState::failed;
        },
        deadline
    );
    gpuCheck(!model.error().empty() && activeBufferIds(model) == lastGood, "Allocation refusal replaced last-good or was not reported");
    budget.limit = gpuByteBudget;
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);
    lastGood = activeBufferIds(model);
    const auto allocatedBeforeFault = budget.used;
    {
        BufferStorageFault fault(gl);
        model.requestIsovalue(0.025F);
        waitForGpuModel(
            model, [&] {
                return model.state() == MeshJobState::failed;
            },
            deadline
        );
        gpuCheck(activeBufferIds(model) == lastGood && budget.used == allocatedBeforeFault && !model.error().empty(), "Failed buffer storage leaked its budget or replaced last-good");
    }
    model.requestIsovalue(0);
    waitForGpuModel(model, ready, deadline);
    gpuCheck(model.guardsIntact() && sameGpuMesh(model, incremental), "Recovery damaged a canary or changed the valid edited mesh");
    std::cout << "GPU RECOVERY PASS cancel=1 capacityRefusal=1 allocationBudgetRefusal=1 injectedStorageFailure=1 lastGood=1 canaries=ok samples=" << model.settings().grid.sampleCount() << " cells=" << model.settings().grid.cellCount() << " brushMs=" << model.times().brush << " historyCopyMs=" << model.times().history << '\n';
    for (int stroke = 0; stroke < 6; ++stroke) {
        Brush inside{{0, 0, 0}, 0.08F, 0.03F, BrushMode::add};
        gpuCheck(model.beginStroke(20, inside) && model.endStroke(20), "Bounded-history fixture could not commit its stroke");
        waitForGpuModel(model, ready, deadline);
        gpuCheck(model.document().undoCount() + model.document().redoCount() <= 4, "GPU history exceeded the total four-snapshot capacity");
    }
    gpuCheck(model.document().undoCount() == 4 && model.guardsIntact(), "GPU history did not discard the oldest snapshots safely");
    std::cout << "GPU HISTORY LIMIT PASS committedExtra=6 retainedSnapshots=4 canaries=ok\n";
}

} // namespace sculpt
