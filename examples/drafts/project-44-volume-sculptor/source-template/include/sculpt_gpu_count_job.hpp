#pragma once

#include "sculpt_active_deadline.hpp"
#include "sculpt_gpu_document.hpp"
#include "sculpt_gpu_layout.hpp"

namespace sculpt {

// Lesson 07 counts every chunk; dirty-region reuse is introduced after emit/draw.
#if LAB_CHECKPOINT >= 7
class GpuCountLessonJob {
    public:
    GpuCountLessonJob(GlApi& gl, GpuBudget& budget, ModelSettings settings)
        : settings_(settings), layout_(gl, budget, settings), ticket_(gl), candidate_(chunkCount(settings.grid)) {}

    bool gpuBusy() const {
        return ticket_.busy();
    }

    bool active() const {
        return active_;
    }

    bool cancelled() const {
        return cancelled_;
    }

    bool failed() const {
        return !error_.empty();
    }

    bool blocksEdits() const {
        return active_ || ticket_.busy();
    }

    bool hasSummary() const {
        return publishedRevision_ != 0;
    }

    std::uint32_t publishedRevision() const {
        return publishedRevision_;
    }

    std::uint32_t generation() const {
        return publishedGeneration_;
    }

    std::size_t completedChunks() const {
        return cursor_;
    }

    std::size_t totalChunks() const {
        return candidate_.size();
    }

    std::uint64_t vertices() const {
        return publishedVertices_;
    }

    std::uint64_t activeCells() const {
        return publishedActiveCells_;
    }

    std::uint64_t emittedVertices() const {
        return publishedEmitted_;
    }

    const PassTimes& times() const {
        return publishedTimes_;
    }

    const std::string& error() const {
        return error_;
    }

    std::size_t selectedChunk() const {
        return selectedChunk_;
    }

    std::size_t selectedCell() const {
        return selectedCell_;
    }

    const ModelSettings& settings() const {
        return settings_;
    }

    const std::vector<ChunkStats>& published() const {
        return published_;
    }

    bool current(const GpuFieldDocument& document) const {
        return hasSummary() && !active_ && !ticket_.busy() && !cancelled_ && !failed() && !restart_ && document.stable() && publishedRevision_ == document.revision() && fieldId_ == document.field().id();
    }

    void cancel() {
        if (!active_ && !ticket_.busy() && !restart_)
            return;
        cancelled_ = true;
        restart_ = false;
        if (!ticket_.busy())
            active_ = false;
    }

    void request() {
        cancelled_ = false;
        restart_ = true;
        error_.clear();
    }

    void resetForField() {
        if (ticket_.busy())
            throw std::logic_error("Cannot replace the field while count/scan still references it");
        active_ = false;
        workingRevision_ = 0;
        publishedRevision_ = 0;
        publishedGeneration_ = 0;
        published_.clear();
        publishedVertices_ = publishedActiveCells_ = publishedEmitted_ = 0;
        cursor_ = 0;
        candidateTimes_ = {};
        publishedTimes_ = {};
        inspection_ = {};
        cacheGeneration_ = 0;
        request();
    }

    // snippet:sculpt-count-job-tick
    void tick(const GpuFieldDocument& document, bool paused) {
        try {
            if (active_) {
                deadline_->pause(paused);
                if (deadline_->expired())
                    throw std::runtime_error("Count/scan exceeded sixty seconds of active work");
            }
            if (ticket_.busy()) {
                requireSnapshot(document);
                const auto elapsed = ticket_.poll();
                if (!elapsed)
                    return;
                if (!cancelled_ && !restart_ && !failed())
                    accept(*elapsed);
            }
            if (cancelled_) {
                active_ = false;
                return;
            }
            if (paused || !document.stable() || (failed() && !restart_))
                return;
            if (restart_ || workingRevision_ != document.revision())
                begin(document);
            if (active_) {
                requireSnapshot(document);
                layout_.submitCount(ticket_, document.field(), settings_.isovalue, cursor_, workingGeneration_);
            }
        } catch (const std::exception& error) {
            error_ = error.what();
            active_ = false;
        }
    }

    // end-snippet:sculpt-count-job-tick

    void selectChunk(std::size_t chunk) {
        if (chunk >= totalChunks())
            throw std::out_of_range("Selected count chunk is outside the grid");
        selectedChunk_ = chunk;
        manualChunk_ = true;
        autoCell_ = true;
        cacheGeneration_ = 0;
    }

    void selectCell(std::size_t cell) {
        if (cell >= cellsPerChunk)
            throw std::out_of_range("Selected count cell is outside its chunk");
        selectedCell_ = cell;
        manualChunk_ = true;
        autoCell_ = false;
    }

    void event(const SDL_Event& event) {
        if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat)
            return;
        const auto key = event.key.key;
        if (key == SDLK_C)
            cancel();
        if (key == SDLK_F1)
            request();
        int step = 1;
        if ((event.key.mod & SDL_KMOD_CTRL) != 0)
            step = 16;
        if (key == SDLK_F5 || key == SDLK_F6) {
            if (key == SDLK_F5)
                step = -step;
            selectChunk(static_cast<std::size_t>(std::clamp(static_cast<int>(selectedChunk_) + step, 0, static_cast<int>(totalChunks()) - 1)));
        }
        if (key == SDLK_F7 || key == SDLK_F8) {
            if (key == SDLK_F7)
                step = -step;
            selectCell(static_cast<std::size_t>(std::clamp(static_cast<int>(selectedCell_) + step, 0, static_cast<int>(cellsPerChunk) - 1)));
        }
    }

    void updateInspection(const GpuFieldDocument& document) {
        if (!current(document))
            return;
        if (cacheGeneration_ != publishedGeneration_ || cacheChunk_ != selectedChunk_) {
            inspection_ = layout_.readLayout(selectedChunk_);
            cacheGeneration_ = publishedGeneration_;
            cacheChunk_ = selectedChunk_;
            if (autoCell_) {
                const auto found = std::find_if(inspection_[0].begin(), inspection_[0].end(), [](auto count) {
                    return count != 0;
                });
                selectedCell_ = 0;
                if (found != inspection_[0].end())
                    selectedCell_ = static_cast<std::size_t>(found - inspection_[0].begin());
                autoCell_ = false;
            }
        }
    }

    bool inspectionCurrent(const GpuFieldDocument& document) const {
        return current(document) && cacheGeneration_ == publishedGeneration_ && cacheChunk_ == selectedChunk_;
    }

    const std::array<std::vector<std::uint32_t>, 2>& inspection() const {
        return inspection_;
    }

    std::array<int, 3> selectedGridCell() const {
        const auto side = static_cast<std::size_t>(chunksPerAxis(settings_.grid));
        return {static_cast<int>((selectedChunk_ % side) * chunkSide + selectedCell_ % chunkSide), static_cast<int>(((selectedChunk_ / side) % side) * chunkSide + (selectedCell_ / chunkSide) % chunkSide), static_cast<int>((selectedChunk_ / (side * side)) * chunkSide + selectedCell_ / (chunkSide * chunkSide))};
    }

    std::array<std::vector<std::uint32_t>, 2> readLayout(std::size_t chunk, const GpuFieldDocument& document) const {
        if (!current(document))
            throw std::logic_error("Layout inspection requires a complete matching count snapshot");
        return layout_.readLayout(chunk);
    }

    bool guardsIntact(const GpuFieldDocument& document) const {
        if (gpuBusy() || !document.stable())
            throw std::logic_error("Count guards require idle completed GPU batches");
        return layout_.guardsIntact() && document.guardsIntact();
    }

    private:
    // snippet:sculpt-count-snapshot-guard
    void requireSnapshot(const GpuFieldDocument& document) const {
        if (!document.stable() || document.revision() != workingRevision_ || document.field().id() != fieldId_)
            throw std::logic_error("The field changed while count/scan still referenced its snapshot");
    }

    // end-snippet:sculpt-count-snapshot-guard

    void begin(const GpuFieldDocument& document) {
        if (workingGeneration_ == std::numeric_limits<std::uint32_t>::max())
            throw std::overflow_error("Count generation is exhausted");
        ++workingGeneration_;
        workingRevision_ = document.revision();
        fieldId_ = document.field().id();
        cursor_ = 0;
        candidateVertices_ = candidateActiveCells_ = candidateEmitted_ = 0;
        candidateTimes_ = {};
        deadline_.emplace(std::chrono::seconds(60));
        inspection_ = {};
        cacheGeneration_ = 0;
        restart_ = false;
        cancelled_ = false;
        error_.clear();
        active_ = true;
    }

    // snippet:sculpt-count-job-accept
    void accept(const std::array<double, 2>& elapsed) {
        const auto stats = layout_.readStats(cursor_);
        if (stats.invalid || stats.mismatch || stats.generation != workingGeneration_ || stats.vertices > maximumChunkVertices || stats.vertices % 3 != 0 || stats.activeCells > cellsPerChunk || stats.emitted != 0 || stats.normalFallbacks != 0)
            throw std::runtime_error("Count/scan returned invalid topology, generation or unexpected emitted vertices");
        candidate_[cursor_] = stats;
        candidateVertices_ += stats.vertices;
        candidateActiveCells_ += stats.activeCells;
        candidateEmitted_ += stats.emitted;
        candidateTimes_.count += elapsed[0];
        candidateTimes_.scan += elapsed[1];
        ++cursor_;
        if (cursor_ == totalChunks()) {
            published_ = candidate_;
            publishedVertices_ = candidateVertices_;
            publishedActiveCells_ = candidateActiveCells_;
            publishedEmitted_ = candidateEmitted_;
            publishedTimes_ = candidateTimes_;
            publishedRevision_ = workingRevision_;
            publishedGeneration_ = workingGeneration_;
            active_ = false;
            if (!manualChunk_) {
                selectedChunk_ = 0;
                for (std::size_t chunk = 0; chunk < published_.size(); ++chunk) {
                    if (published_[chunk].vertices != 0) {
                        selectedChunk_ = chunk;
                        break;
                    }
                }
                autoCell_ = true;
            }
        }
    }

    // end-snippet:sculpt-count-job-accept

    ModelSettings settings_;
    GpuChunkLayout layout_;
    GpuTicket ticket_;
    std::vector<ChunkStats> candidate_, published_;
    std::array<std::vector<std::uint32_t>, 2> inspection_;
    std::optional<ActiveDeadline> deadline_;
    PassTimes candidateTimes_, publishedTimes_;
    std::uint64_t candidateVertices_{}, candidateActiveCells_{}, candidateEmitted_{};
    std::uint64_t publishedVertices_{}, publishedActiveCells_{}, publishedEmitted_{};
    std::uint32_t workingRevision_{}, publishedRevision_{}, workingGeneration_{}, publishedGeneration_{}, cacheGeneration_{};
    GLuint fieldId_{};
    std::size_t cursor_{}, selectedChunk_{}, selectedCell_{}, cacheChunk_{};
    bool active_{}, cancelled_{}, restart_{true}, manualChunk_{}, autoCell_{true};
    std::string error_;
};
#else
class GpuCountLessonJob;
#endif

} // namespace sculpt
