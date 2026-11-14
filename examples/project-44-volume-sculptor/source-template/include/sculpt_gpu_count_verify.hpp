#pragma once

#include "sculpt_gpu_count_job.hpp"
#include "sculpt_gpu_field_controls.hpp"
#include "sculpt_topology.hpp"
#include <iostream>

namespace sculpt {

// Four complete layout checks, then bounded pause/cancel/retry and app-reset checks.
// The 32^3 CPU oracle is a fixture only; 128^3 never runs CPU extraction here.
class GpuCountLessonVerifier {
    public:
    bool done() const {
        return phase_ == 9;
    }

    void tick(GpuCountLessonJob& job, GpuFieldDocument& document, GpuFieldLessonControls& controls) {
        if (done())
            return;
        if (job.failed())
            throw std::runtime_error("Count/scan fixture failed: " + job.error());
        const auto& settings = job.settings();
        if (phase_ < 4) {
            if (!job.current(document))
                return;
            if (chunk_ == 0)
                prepareReference(document, settings.grid);
            const auto checkStarted = std::chrono::steady_clock::now();
            for (int batch = 0; batch < 4 && chunk_ < job.totalChunks(); ++batch) {
                verifyChunk(job, document, settings);
                ++chunk_;
            }
            checkCpuMs_ += std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - checkStarted).count();
            if (chunk_ != job.totalChunks())
                return;
            if (!job.guardsIntact(document) || validCells_ != settings.grid.cellCount() || totalVertices_ != job.vertices() || totalActive_ != job.activeCells() || job.emittedVertices() != 0 || totalVertices_ == 0)
                throw std::runtime_error("Count totals, complete cell coverage or guards do not match the published snapshot");
            hashes_[phase_] = hash_;
            if ((phase_ == 2 && hash_ != hashes_[0]) || (phase_ == 3 && hash_ != hashes_[1]))
                throw std::runtime_error("Undo/redo did not restore GPU counts and offsets exactly");
            if (phase_ != 0 && (job.selectedChunk() != pinnedChunk_ || job.selectedCell() != pinnedCell_))
                throw std::runtime_error("A field edit/history change unexpectedly moved the inspected cell");
            std::cout << "GPU COUNT SNAPSHOT PASS phase=" << phase_ << " samples=" << settings.grid.sampleCount() << " cells=" << validCells_ << " paddedSlots=" << job.totalChunks() * cellsPerChunk << " countedVertices=" << job.vertices() << " emittedVertices=" << job.emittedVertices() << " prefixChecks=" << job.totalChunks() * cellsPerChunk << " cpuCellOracle=" << static_cast<int>(reference_.has_value()) << " phaseWallMs=" << std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - phaseStarted_).count() << " readbackAndCpuCheckMs=" << checkCpuMs_ << '\n'
                      << std::flush;
            if (phase_ == 0) {
                initialStats_ = job.published();
                const auto generation = job.generation();
                job.cancel();
                if (!job.current(document) || job.generation() != generation)
                    throw std::runtime_error("Cancel changed an already completed idle count job");
                job.updateInspection(document);
                pinnedChunk_ = job.selectedChunk();
                pinnedCell_ = std::min(job.selectedCell() + 1, cellsPerChunk - 1);
                job.selectCell(pinnedCell_);
                job.updateInspection(document);
                if (!job.current(document) || job.generation() != generation || job.selectedChunk() != pinnedChunk_)
                    throw std::runtime_error("Inspection selection triggered counting or changed its field snapshot");
                const auto before = document.revision();
                send(controls, document, settings, SDLK_RETURN, true);
                if (!document.strokeOpen() || document.revision() != before)
                    throw std::runtime_error("Enter did not queue a GPU stroke without prematurely publishing its revision");
            } else if (phase_ == 1) {
                if (hash_ == hashes_[0])
                    throw std::runtime_error("The GPU brush did not change the counted layout");
                send(controls, document, settings, SDLK_Z, true);
            } else if (phase_ == 2)
                send(controls, document, settings, SDLK_Y, true);
            else {
                modifiedStats_ = job.published();
                job.updateInspection(document);
                inspection_ = job.inspection();
                inspectionChunk_ = job.selectedChunk();
                generationBeforeRetry_ = job.generation();
                job.request();
            }
            ++phase_;
            chunk_ = 0;
            validCells_ = totalVertices_ = totalActive_ = 0;
            hash_ = 14695981039346656037ULL;
            reference_.reset();
            phaseStarted_ = std::chrono::steady_clock::now();
            checkCpuMs_ = 0;
            return;
        }
        if (phase_ == 4 && job.active() && job.gpuBusy()) {
            const auto revision = document.revision();
            const auto undo = document.undoCount();
            const auto redo = document.redoCount();
            for (const auto key : {SDLK_RETURN, SDLK_Z, SDLK_Y})
                send(controls, document, settings, key, false);
            if (!document.stable() || document.revision() != revision || document.undoCount() != undo || document.redoCount() != redo)
                throw std::runtime_error("The input mutation gate did not protect an in-flight count snapshot");
            send(controls, document, settings, SDLK_SPACE, false);
            if (!controls.paused())
                throw std::runtime_error("Count fixture could not pause through the supplied input router");
            phase_ = 5;
        } else if (phase_ == 5 && !job.gpuBusy()) {
            const auto completed = job.completedChunks();
            for (int tick = 0; tick < 3; ++tick)
                job.tick(document, true);
            if (!job.active() || job.completedChunks() != completed || job.gpuBusy())
                throw std::runtime_error("Paused count job submitted another chunk");
            job.cancel();
            if (!job.cancelled() || job.current(document) || !job.hasSummary())
                throw std::runtime_error("Cancellation lost the published summary or mislabeled it as current");
            send(controls, document, settings, SDLK_SPACE, false);
            job.request();
            phase_ = 6;
        } else if (phase_ == 6 && job.current(document)) {
            if (job.generation() <= generationBeforeRetry_ || job.published().size() != modifiedStats_.size())
                throw std::runtime_error("Retry did not publish a fresh complete count generation");
            for (std::size_t index = 0; index < modifiedStats_.size(); ++index) {
                const auto& expected = modifiedStats_[index];
                const auto& actual = job.published()[index];
                if (actual.vertices != expected.vertices || actual.activeCells != expected.activeCells || actual.degenerate != expected.degenerate || actual.emitted != 0 || actual.generation != job.generation())
                    throw std::runtime_error("Retried count summary differs from its unchanged field snapshot");
            }
            if (job.readLayout(inspectionChunk_, document) != inspection_ || !job.guardsIntact(document))
                throw std::runtime_error("Retried count inspection differs from the original modified layout");
            generationBeforeReset_ = job.generation();
            job.request();
            phase_ = 7;
        } else if (phase_ == 7 && job.active() && job.gpuBusy()) {
            send(controls, document, settings, SDLK_R, false);
            if (!controls.resetRequest())
                throw std::runtime_error("Reset was not accepted while the count ticket was in flight");
            phase_ = 8;
        } else if (phase_ == 8) {
            if (!job.hasSummary()) {
                if (job.publishedRevision() != 0 || job.times().count != 0 || job.times().scan != 0 || job.inspectionCurrent(document))
                    throw std::runtime_error("Reset retained a stale summary, timing or inspection label");
                sawResetInvalidation_ = true;
            }
            if (!job.current(document))
                return;
            if (!sawResetInvalidation_ || controls.resetRequest() || document.revision() != 1 || document.undoCount() != 0 || document.redoCount() != 0 || job.generation() <= generationBeforeReset_ || job.published().size() != initialStats_.size())
                throw std::runtime_error("Reset did not replace the field and publish a fresh matching count snapshot");
            for (std::size_t index = 0; index < initialStats_.size(); ++index) {
                const auto& expected = initialStats_[index];
                const auto& actual = job.published()[index];
                if (actual.vertices != expected.vertices || actual.activeCells != expected.activeCells || actual.degenerate != expected.degenerate || actual.emitted != 0 || actual.generation != job.generation())
                    throw std::runtime_error("Reset count does not match the original preset");
            }
            if (!job.guardsIntact(document))
                throw std::runtime_error("Reset damaged a count/field guard");
            phase_ = 9;
            std::cout << "GPU COUNT LIFECYCLE PASS enterStamp=1 undoRedoLayoutExact=1 editGate=3 pauseBetweenChunks=1 cancelKeepsSummary=1 idleCancelNoop=1 retryFreshGeneration=1 selectedLayoutExact=1 selectionNoRecount=1 selectionPinnedAcrossEdits=1 resetInFlight=1 resetClearsSummary=1 resetDropsHistory=1 noMeshVertexAllocation=1\n";
        }
    }

    private:
    static void send(GpuFieldLessonControls& controls, GpuFieldDocument& document, const ModelSettings& settings, SDL_Keycode key, bool canEdit) {
        SDL_Event event{};
        event.type = SDL_EVENT_KEY_DOWN;
        event.key.key = key;
        controls.event(event, document, settings.grid, settings.shape, canEdit);
    }

    void prepareReference(const GpuFieldDocument& document, const GridSpec& grid) {
        if (grid.samples <= 32) {
            reference_.emplace(grid);
            std::vector<float> values(grid.sampleCount());
            document.field().read(0, std::as_writable_bytes(std::span(values)));
            reference_->replaceValues(values);
        }
    }

    void verifyChunk(const GpuCountLessonJob& job, const GpuFieldDocument& document, const ModelSettings& settings) {
        const auto layout = job.readLayout(chunk_, document);
        if (layout[0].size() != cellsPerChunk || layout[1].size() != cellsPerChunk)
            throw std::runtime_error("GPU layout readback did not return two complete bounded arrays");
        const auto* counts = layout[0].data();
        const auto* offsets = layout[1].data();
        const auto& stats = job.published().at(chunk_);
        const int side = chunksPerAxis(settings.grid);
        const int cx = static_cast<int>(chunk_ % side) * chunkSide;
        const int cy = static_cast<int>((chunk_ / side) % side) * chunkSide;
        const int cz = static_cast<int>(chunk_ / (side * side)) * chunkSide;
        std::uint64_t prefix = 0, active = 0;
        for (std::size_t local = 0; local < cellsPerChunk; ++local) {
            const auto count = counts[local];
            const int x = cx + static_cast<int>(local % chunkSide);
            const int y = cy + static_cast<int>((local / chunkSide) % chunkSide);
            const int z = cz + static_cast<int>(local / (chunkSide * chunkSide));
            const bool valid = x < settings.grid.samples - 1 && y < settings.grid.samples - 1 && z < settings.grid.samples - 1;
            if (count > 36 || count % 3 != 0 || offsets[local] != prefix || (!valid && count != 0))
                throw std::runtime_error("Count/prefix or padded-cell zero differs from its independent sequential reference");
            if (valid) {
                ++validCells_;
                if (reference_ && count != polygonizeCell(*reference_, x, y, z, settings.isovalue).count * 3)
                    throw std::runtime_error("GPU count differs from the small independently executed CPU tetra oracle");
            }
            prefix += count;
            if (count != 0)
                ++active;
            hash_ ^= count;
            hash_ *= 1099511628211ULL;
            hash_ ^= offsets[local];
            hash_ *= 1099511628211ULL;
        }
        if (prefix != stats.vertices || active != stats.activeCells || stats.emitted != 0 || stats.invalid || stats.mismatch || stats.generation != job.generation())
            throw std::runtime_error("Chunk count summary does not describe its exact exclusive ranges");
        totalVertices_ += prefix;
        totalActive_ += active;
    }

    std::optional<ScalarGrid> reference_;
    std::array<std::uint64_t, 4> hashes_{};
    std::vector<ChunkStats> initialStats_, modifiedStats_;
    std::array<std::vector<std::uint32_t>, 2> inspection_;
    std::size_t phase_{}, chunk_{}, inspectionChunk_{}, pinnedChunk_{}, pinnedCell_{};
    std::uint32_t generationBeforeRetry_{}, generationBeforeReset_{};
    std::uint64_t validCells_{}, totalVertices_{}, totalActive_{};
    std::uint64_t hash_{14695981039346656037ULL};
    std::chrono::steady_clock::time_point phaseStarted_{std::chrono::steady_clock::now()};
    double checkCpuMs_{};
    bool sawResetInvalidation_{};
};

} // namespace sculpt
