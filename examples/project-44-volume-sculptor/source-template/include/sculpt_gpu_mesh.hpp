#pragma once

#include "sculpt_gpu_document.hpp"
#include "sculpt_gpu_layout.hpp"
#include "sculpt_mesh_chunk.hpp"
#include <memory>
#include <numeric>
#include <optional>

namespace sculpt {

enum class MeshJobState {
    initializing,
    editing,
    counting,
    emitting,
    ready,
    cancelled,
    failed
};

class GpuMeshBuilder {
    public:
    GpuMeshBuilder(GlApi& gl, GpuBudget& budget, ModelSettings settings, bool validationPlane = false, FieldInitialization initialization = FieldInitialization::preset, std::optional<GpuFieldSeed> seed = {})
        : gl_(gl), budget_(budget), settings_(settings), document_(gl, budget, settings, validationPlane, initialization, std::move(seed)), layout_(gl, budget, settings), normalProgram_(gl, "sculpt_normals.comp"), ticket_(gl) {
        const auto chunks = chunkCount(settings.grid);
        counted_.resize(chunks);
        candidate_.resize(chunks);
    }

    const ModelSettings& settings() const {
        return settings_;
    }

    MeshJobState state() const {
        return state_;
    }

    // snippet:sculpt-mesh-ready
    bool ready() const {
        return state_ == MeshJobState::ready && document_.stable() && activeFieldRevision_ == document_.revision() && activeGeneration_ == requestedGeneration_;
    }

    // end-snippet:sculpt-mesh-ready

    std::uint32_t requestedGeneration() const {
        return requestedGeneration_;
    }

    std::uint32_t activeGeneration() const {
        return activeGeneration_;
    }

    bool hasQueuedRequest() const {
        return pendingIsovalue_.has_value() && !cancelled_ && state_ != MeshJobState::failed;
    }

    const std::vector<MeshChunk>& active() const {
        return active_;
    }

    PassTimes times() const {
        PassTimes result = times_;
        result.field = document_.times().field;
        result.upload = document_.times().upload;
        result.brush = document_.times().brush;
        result.history = document_.times().history;
        return result;
    }

    const GpuFieldDocument& document() const {
        return document_;
    }

    void appendImport(std::span<const float> values) {
        document_.appendImport(values);
    }

    void finishImport() {
        document_.finishImport();
    }

    bool gpuBusy() const {
        return ticket_.busy() || document_.busy();
    }

    const std::string& error() const {
        return error_;
    }

    const ModelSettings& activeSettings() const {
        return activeSettings_;
    }

    std::uint32_t activeFieldRevision() const {
        return activeFieldRevision_;
    }

    std::size_t jobChunks() const {
        return work_.size();
    }

    std::size_t lastRebuiltChunks() const {
        return lastRebuiltChunks_;
    }

    std::span<const std::uint32_t> workChunks() const {
        return work_;
    }

    // A lower explicit capacity is useful for the overflow experiment; it never permits truncation.
    void setMeshVertexLimit(std::size_t limit) {
        if (limit < 3 || limit > maximumMeshVertices)
            throw std::invalid_argument("Mesh capacity must stay within the declared vertex budget");
        meshVertexLimit_ = limit;
    }

    bool beginStroke(std::uint32_t owner, Brush brush) {
        if (paused_ || !ready() || !document_.beginStroke(owner, brush))
            return false;
        state_ = MeshJobState::editing;
        return true;
    }

    bool moveStroke(std::uint32_t owner, Vec3 point) {
        return document_.moveStroke(owner, point);
    }

    bool endStroke(std::uint32_t owner) {
        return document_.endStroke(owner);
    }

    void abortStroke() {
        document_.abortStroke();
    }

    bool undo() {
        if (paused_ || !ready())
            return false;
        return document_.undo();
    }

    bool redo() {
        if (paused_ || !ready())
            return false;
        return document_.redo();
    }

    std::size_t completedChunks() const {
        return cursor_;
    }

    std::uint64_t requestedVertices() const {
        return requestedVertices_;
    }

    // snippet:sculpt-request-generation
    void requestIsovalue(float isovalue) {
        ModelSettings next = settings_;
        next.isovalue = isovalue;
        next.validate();
        if (requestedGeneration_ == std::numeric_limits<std::uint32_t>::max())
            throw std::overflow_error("Mesh generation is exhausted");
        ++requestedGeneration_;
        pendingIsovalue_ = isovalue;
        cancelled_ = false;
        error_.clear();
        if (state_ == MeshJobState::failed && document_.stable() && !ticket_.busy())
            state_ = MeshJobState::cancelled;
    }

    // end-snippet:sculpt-request-generation

    // snippet:sculpt-cancel-mesh
    void cancel() {
        cancelled_ = true;
        document_.abortStroke();
        // The in-flight dispatch may finish, but its candidate cannot become ACTIVE.
        if (!ticket_.busy() && !document_.busy() && !document_.strokeOpen()) {
            candidate_.clear();
            state_ = MeshJobState::cancelled;
        }
    }

    // end-snippet:sculpt-cancel-mesh

    void pause(bool value) {
        paused_ = value;
    }

    bool paused() const {
        return paused_;
    }

    // snippet:sculpt-retry-last-good
    void resumeLastGood() {
        if (!gpuBusy() && document_.stable() && activeGeneration_ == requestedGeneration_ && activeFieldRevision_ == document_.revision() && activeSettings_.isovalue == settings_.isovalue) {
            cancelled_ = false;
            pendingIsovalue_.reset();
            state_ = MeshJobState::ready;
        } else
            requestIsovalue(settings_.isovalue);
    }

    // end-snippet:sculpt-retry-last-good

    void tick() {
        if (state_ == MeshJobState::failed)
            return;
        try {
            // snippet:sculpt-drain-mesh-ticket
            if (ticket_.busy()) {
                const auto completed = ticket_.poll();
                if (!completed)
                    return;
                acceptBatch(*completed);
            }
            // end-snippet:sculpt-drain-mesh-ticket
            document_.tick(paused_ || cancelled_);
            if (cancelled_ && !document_.busy() && !document_.strokeOpen()) {
                candidate_.clear();
                state_ = MeshJobState::cancelled;
                return;
            }
            if (!document_.stable()) {
                state_ = MeshJobState::editing;
                if (document_.state() == FieldState::initializing || document_.state() == FieldState::loading)
                    state_ = MeshJobState::initializing;
                return;
            }
            if (cancelled_) {
                candidate_.clear();
                state_ = MeshJobState::cancelled;
                return;
            }
            // snippet:sculpt-schedule-mesh-revision
            if (paused_)
                return;
            if (document_.revision() != observedRevision_) {
                if (observedRevision_ != 0) {
                    if (requestedGeneration_ == std::numeric_limits<std::uint32_t>::max())
                        throw std::overflow_error("Mesh generation is exhausted");
                    ++requestedGeneration_;
                }
                restart(false);
            } else if (pendingIsovalue_)
                restart(true);
            if (state_ == MeshJobState::counting)
                submitCount();
            else if (state_ == MeshJobState::emitting)
                submitEmit();
            else if (state_ == MeshJobState::editing)
                state_ = MeshJobState::ready;
            // end-snippet:sculpt-schedule-mesh-revision
        } catch (const std::exception& failure) {
            error_ = failure.what();
            if (!ticket_.busy())
                candidate_.clear();
            state_ = MeshJobState::failed;
        }
    }

    std::vector<float> readField(std::size_t first, std::size_t count) const {
        if (ticket_.busy() || !document_.stable() || first > settings_.grid.sampleCount() || count > settings_.grid.sampleCount() - first || count > 65536)
            throw std::invalid_argument("Field readback requires an idle bounded chunk");
        std::vector<float> result(count);
        document_.field().read(first * sizeof(float), std::as_writable_bytes(std::span(result)));
        return result;
    }

    std::vector<SurfaceVertex> readChunk(std::size_t chunk) const {
        if (!ready() || chunk >= active_.size())
            throw std::invalid_argument("Mesh readback requires a complete ACTIVE mesh");
        const auto& source = active_[chunk];
        std::vector<SurfaceVertex> result(source.stats.vertices);
        if (!result.empty())
            source.buffer->read(0, std::as_writable_bytes(std::span(result)));
        return result;
    }

    std::array<std::vector<std::uint32_t>, 2> readChunkLayout(std::size_t chunk) const {
        if (!ready() || chunk >= active_.size())
            throw std::invalid_argument("Layout inspection requires a complete current mesh");
        return layout_.readLayout(chunk);
    }

    bool guardsIntact() const {
        if (ticket_.busy() || document_.busy())
            throw std::logic_error("Guard readback must not block an in-flight batch");
        if (!document_.guardsIntact() || !layout_.guardsIntact())
            return false;
        for (const auto& chunk : active_)
            if (chunk.buffer && !chunk.buffer->guardIntact(chunk.stats.vertices * sizeof(SurfaceVertex)))
                return false;
        return true;
    }

    private:
    ChunkStats readStats(std::size_t chunk) const {
        return layout_.readStats(chunk);
    }

    void restart(bool full) {
        if (pendingIsovalue_) {
            settings_.isovalue = *pendingIsovalue_;
            full = true;
        }
        pendingIsovalue_.reset();
        // snippet:sculpt-select-dirty-work
        const auto dirty = document_.takeDirty();
#if LAB_CHECKPOINT >= 9
        work_ = dirtyChunks(settings_.grid, dirty);
#else
        // Checkpoint 08 deliberately rebuilds the whole volume after a real edit.
        // Checkpoint 09 introduces dependency-safe dirty-chunk reuse.
        (void)dirty;
        full = true;
#endif
        if (full || active_.empty()) {
            work_.resize(counted_.size());
            std::iota(work_.begin(), work_.end(), 0U);
        }
        // end-snippet:sculpt-select-dirty-work
        // snippet:sculpt-reuse-unaffected
        candidate_ = active_;
        candidate_.resize(counted_.size());
        for (const auto chunk : work_)
            candidate_[chunk] = {};
        cursor_ = 0;
        requestedVertices_ = 0;
        for (auto& chunk : candidate_) {
            requestedVertices_ += chunk.stats.vertices;
            chunk.validForGeneration = requestedGeneration_;
        }
        // end-snippet:sculpt-reuse-unaffected
        observedRevision_ = document_.revision();
        jobGeneration_ = requestedGeneration_;
        times_.count = 0;
        times_.scan = 0;
        times_.emit = 0;
        times_.normals = 0;
        state_ = MeshJobState::counting;
        if (work_.empty())
            publish();
    }

    void acceptBatch(const std::array<double, 2>& elapsed) {
        // snippet:sculpt-reject-stale-batch
        if (cancelled_ || jobGeneration_ != requestedGeneration_)
            return;
        // end-snippet:sculpt-reject-stale-batch
        if (state_ == MeshJobState::counting) {
            times_.count += elapsed[0];
            times_.scan += elapsed[1];
            const auto chunk = work_[cursor_];
            const auto stats = readStats(chunk);
            if (stats.invalid || stats.mismatch || stats.generation != jobGeneration_ || stats.vertices > maximumChunkVertices || stats.vertices % 3 != 0)
                throw std::runtime_error("GPU count/scan returned invalid topology, capacity or generation");
            counted_[chunk] = stats;
            requestedVertices_ += stats.vertices;
            ++cursor_;
            if (cursor_ == work_.size()) {
                // snippet:sculpt-gpu-mesh-capacity
                if (requestedVertices_ > meshVertexLimit_)
                    throw std::overflow_error("Counted mesh exceeds capacity; last-good is retained without truncation");
                cursor_ = 0;
                state_ = MeshJobState::emitting;
                // end-snippet:sculpt-gpu-mesh-capacity
            }
        } else if (state_ == MeshJobState::emitting) {
            times_.emit += elapsed[0];
            times_.normals += elapsed[1];
            const auto chunk = work_[cursor_];
            const auto stats = readStats(chunk);
            // snippet:sculpt-gpu-emit-accept
            if (stats.invalid || stats.mismatch || stats.generation != jobGeneration_ || stats.emitted != stats.vertices)
                throw std::runtime_error("GPU emit did not fill its exact counted snapshot range");
            candidate_[chunk].stats = stats;
            candidate_[chunk].validForGeneration = jobGeneration_;
            // end-snippet:sculpt-gpu-emit-accept
            ++cursor_;
            if (cursor_ == work_.size())
                publish();
        }
    }

    // snippet:sculpt-publish-mesh
    void publish() {
        active_ = std::move(candidate_);
        candidate_.resize(counted_.size());
        activeGeneration_ = jobGeneration_;
        activeFieldRevision_ = observedRevision_;
        activeSettings_ = settings_;
        lastRebuiltChunks_ = work_.size();
        state_ = MeshJobState::ready;
    }

    // end-snippet:sculpt-publish-mesh

    void extractUniforms(int phase) {
        const auto chunk = work_[cursor_];
        layout_.extractUniforms(phase, settings_.isovalue, chunk, jobGeneration_, counted_[chunk].vertices);
    }

    void submitCount() {
        const auto chunk = work_[cursor_];
        layout_.submitCount(ticket_, document_.field(), settings_.isovalue, chunk, jobGeneration_);
    }

    void submitEmit() {
        while (cursor_ < work_.size() && counted_[work_[cursor_]].vertices == 0) {
            const auto chunk = work_[cursor_];
            candidate_[chunk].stats = counted_[chunk];
            candidate_[chunk].validForGeneration = jobGeneration_;
            ++cursor_;
        }
        if (cursor_ == work_.size()) {
            publish();
            return;
        }
        layout_.bindStorage(document_.field());
        // snippet:sculpt-gpu-mesh-allocation
        const auto chunk = work_[cursor_];
        const auto count = counted_[chunk].vertices;
        auto output = std::make_shared<GpuBuffer>(gl_, budget_, count * sizeof(SurfaceVertex) + guardBytes);
        output->setGuard(count * sizeof(SurfaceVertex));
        output->bind(5);
        candidate_[chunk].buffer = std::move(output);
        // end-snippet:sculpt-gpu-mesh-allocation
        // snippet:sculpt-gpu-emit-dispatch
        extractUniforms(1);
        ticket_.begin(0);
        gl_.DispatchCompute(16, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        ticket_.end();
        // end-snippet:sculpt-gpu-emit-dispatch
        // snippet:sculpt-gpu-normal-dispatch
        normalProgram_.use();
        layout_.gridUniforms(normalProgram_);
        gl_.Uniform1ui(normalProgram_.uniform("chunk"), chunk);
        gl_.Uniform1ui(normalProgram_.uniform("vertexCount"), count);
        ticket_.begin(1);
        gl_.DispatchCompute((count + 255) / 256, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
        // end-snippet:sculpt-gpu-normal-dispatch
    }

    GlApi& gl_;
    GpuBudget& budget_;
    ModelSettings settings_;
    GpuFieldDocument document_;
    GpuChunkLayout layout_;
    Program normalProgram_;
    GpuTicket ticket_;
    std::vector<ChunkStats> counted_;
    std::vector<MeshChunk> candidate_, active_;
    std::vector<std::uint32_t> work_;
    ModelSettings activeSettings_;
    MeshJobState state_{MeshJobState::initializing};
    PassTimes times_;
    std::uint64_t requestedVertices_{};
    std::size_t cursor_{}, lastRebuiltChunks_{};
    std::size_t meshVertexLimit_{maximumMeshVertices};
    std::uint32_t requestedGeneration_{1}, jobGeneration_{1}, activeGeneration_{};
    std::uint32_t observedRevision_{}, activeFieldRevision_{};
    std::optional<float> pendingIsovalue_;
    bool cancelled_{}, paused_{};
    std::string error_;
};

} // namespace sculpt
