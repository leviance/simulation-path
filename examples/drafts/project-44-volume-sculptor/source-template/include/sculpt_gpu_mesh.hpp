#pragma once

#include "sculpt_gpu_buffer.hpp"
#include "sculpt_gpu_ticket.hpp"
#include <memory>
#include <numeric>
#include <optional>

namespace sculpt {

struct MeshChunk {
    std::shared_ptr<GpuBuffer> buffer;
    ChunkStats stats;
};

enum class MeshJobState { initializing, counting, emitting, ready, cancelled };

class GpuMeshBuilder {
    public:
    GpuMeshBuilder(GlApi& gl, GpuBudget& budget, ModelSettings settings, bool validationPlane = false)
        : gl_(gl), budget_(budget), settings_(settings), fieldProgram_(gl, "sculpt_field.comp"), extractProgram_(gl, "sculpt_extract.comp"), scanProgram_(gl, "sculpt_scan.comp"), normalProgram_(gl, "sculpt_normals.comp"), ticket_(gl), validationPlane_(validationPlane) {
        preflightSculpt(gl, settings);
        const auto samples = settings.grid.sampleCount();
        const auto chunks = chunkCount(settings.grid);
        field_ = buffer(samples * sizeof(float));
        counts_ = buffer(chunks * cellsPerChunk * sizeof(std::uint32_t));
        offsets_ = buffer(chunks * cellsPerChunk * sizeof(std::uint32_t));
        blocks_ = buffer(16 * sizeof(std::uint32_t));
        stats_ = buffer(chunks * sizeof(ChunkStats));
        stamps_ = buffer(8 * 32);
        counted_.resize(chunks);
        candidate_.resize(chunks);
    }

    const ModelSettings& settings() const {
        return settings_;
    }

    MeshJobState state() const {
        return state_;
    }

    bool ready() const {
        return state_ == MeshJobState::ready && activeGeneration_ == requestedGeneration_;
    }

    std::uint32_t requestedGeneration() const {
        return requestedGeneration_;
    }

    std::uint32_t activeGeneration() const {
        return activeGeneration_;
    }

    const std::vector<MeshChunk>& active() const {
        return active_;
    }

    const PassTimes& times() const {
        return times_;
    }

    std::size_t completedChunks() const {
        return cursor_;
    }

    std::uint64_t requestedVertices() const {
        return requestedVertices_;
    }

    void requestIsovalue(float isovalue) {
        ModelSettings next = settings_;
        next.isovalue = isovalue;
        next.validate();
        if (requestedGeneration_ == std::numeric_limits<std::uint32_t>::max())
            throw std::overflow_error("Mesh generation is exhausted");
        ++requestedGeneration_;
        pendingIsovalue_ = isovalue;
        cancelled_ = false;
    }

    void cancel() {
        cancelled_ = true;
        // The in-flight dispatch may finish, but its candidate cannot become ACTIVE.
        if (!ticket_.busy()) {
            candidate_.clear();
            state_ = MeshJobState::cancelled;
        }
    }

    void pause(bool value) {
        paused_ = value;
    }

    bool paused() const {
        return paused_;
    }

    void tick() {
        if (ticket_.busy()) {
            const auto completed = ticket_.poll();
            if (!completed)
                return;
            acceptBatch(*completed);
        }
        if (cancelled_) {
            candidate_.clear();
            state_ = MeshJobState::cancelled;
            return;
        }
        if (pendingIsovalue_ && state_ != MeshJobState::initializing) {
            if (initialized_ < settings_.grid.sampleCount())
                state_ = MeshJobState::initializing;
            else
                restart();
        }
        if (paused_)
            return;
        if (state_ == MeshJobState::initializing)
            submitField();
        else if (state_ == MeshJobState::counting)
            submitCount();
        else if (state_ == MeshJobState::emitting)
            submitEmit();
    }

    std::vector<float> readField(std::size_t first, std::size_t count) const {
        if (ticket_.busy() || initialized_ != settings_.grid.sampleCount() || first > settings_.grid.sampleCount() || count > settings_.grid.sampleCount() - first || count > 65536)
            throw std::invalid_argument("Field readback requires an idle bounded chunk");
        std::vector<float> result(count);
        field_->read(first * sizeof(float), std::as_writable_bytes(std::span(result)));
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

    bool guardsIntact() const {
        if (ticket_.busy())
            throw std::logic_error("Guard readback must not block an in-flight batch");
        for (const auto* source : {field_.get(), counts_.get(), offsets_.get(), blocks_.get(), stats_.get(), stamps_.get()})
            if (!source->guardIntact(source->bytes() - guardBytes))
                return false;
        for (const auto& chunk : active_)
            if (chunk.buffer && !chunk.buffer->guardIntact(chunk.stats.vertices * sizeof(SurfaceVertex)))
                return false;
        return true;
    }

    private:
    std::unique_ptr<GpuBuffer> buffer(std::size_t payload) {
        auto result = std::make_unique<GpuBuffer>(gl_, budget_, payload + guardBytes);
        result->setGuard(payload);
        return result;
    }

    void gridUniforms(const Program& program) {
        const auto& grid = settings_.grid;
        gl_.Uniform1i(program.uniform("gridN"), grid.samples);
        gl_.Uniform3f(program.uniform("gridOrigin"), grid.origin.x, grid.origin.y, grid.origin.z);
        gl_.Uniform1f(program.uniform("gridSpacing"), grid.spacing());
    }

    void bindStorage() {
        field_->bind(0);
        counts_->bind(1);
        offsets_->bind(2);
        blocks_->bind(3);
        stats_->bind(4);
        // Count does not write Mesh, but still binds a valid dummy range for that active block.
        blocks_->bind(5);
        stamps_->bind(6);
    }

    ChunkStats readStats(std::size_t chunk) const {
        ChunkStats result;
        stats_->read(chunk * sizeof(result), std::as_writable_bytes(std::span(&result, 1)));
        return result;
    }

    void restart() {
        settings_.isovalue = *pendingIsovalue_;
        pendingIsovalue_.reset();
        candidate_.assign(counted_.size(), {});
        cursor_ = 0;
        requestedVertices_ = 0;
        jobGeneration_ = requestedGeneration_;
        times_.count = 0;
        times_.scan = 0;
        times_.emit = 0;
        times_.normals = 0;
        state_ = MeshJobState::counting;
    }

    void acceptBatch(const std::array<double, 2>& elapsed) {
        if (state_ == MeshJobState::initializing) {
            times_.field += elapsed[0];
            initialized_ += pendingSamples_;
            if (initialized_ == settings_.grid.sampleCount()) {
                if (!pendingIsovalue_)
                    pendingIsovalue_ = settings_.isovalue;
                restart();
            }
            return;
        }
        if (cancelled_ || jobGeneration_ != requestedGeneration_)
            return;
        if (state_ == MeshJobState::counting) {
            times_.count += elapsed[0];
            times_.scan += elapsed[1];
            const auto stats = readStats(cursor_);
            if (stats.invalid || stats.mismatch || stats.generation != jobGeneration_ || stats.vertices > maximumChunkVertices || stats.vertices % 3 != 0)
                throw std::runtime_error("GPU count/scan returned invalid topology, capacity or generation");
            counted_[cursor_] = stats;
            requestedVertices_ += stats.vertices;
            ++cursor_;
            if (cursor_ == counted_.size()) {
                if (requestedVertices_ > maximumMeshVertices)
                    throw std::overflow_error("Counted mesh exceeds capacity; last-good is retained without truncation");
                cursor_ = 0;
                state_ = MeshJobState::emitting;
            }
        } else if (state_ == MeshJobState::emitting) {
            times_.emit += elapsed[0];
            times_.normals += elapsed[1];
            const auto stats = readStats(cursor_);
            if (stats.invalid || stats.mismatch || stats.generation != jobGeneration_ || stats.emitted != stats.vertices)
                throw std::runtime_error("GPU emit did not fill its exact counted snapshot range");
            candidate_[cursor_].stats = stats;
            ++cursor_;
            if (cursor_ == counted_.size()) {
                active_ = std::move(candidate_);
                candidate_.resize(counted_.size());
                activeGeneration_ = jobGeneration_;
                state_ = MeshJobState::ready;
            }
        }
    }

    void submitField() {
        bindStorage();
        fieldProgram_.use();
        gridUniforms(fieldProgram_);
        gl_.Uniform1i(fieldProgram_.uniform("operation"), 0);
        int shape = static_cast<int>(settings_.shape);
        if (validationPlane_)
            shape = 3;
        gl_.Uniform1i(fieldProgram_.uniform("shape"), shape);
        pendingSamples_ = std::min<std::size_t>(65536, settings_.grid.sampleCount() - initialized_);
        gl_.Uniform1ui(fieldProgram_.uniform("firstSample"), static_cast<GLuint>(initialized_));
        gl_.Uniform1ui(fieldProgram_.uniform("sampleBatch"), static_cast<GLuint>(pendingSamples_));
        ticket_.begin(0);
        gl_.DispatchCompute(static_cast<GLuint>((pendingSamples_ + 255) / 256), 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    void extractUniforms(int phase) {
        extractProgram_.use();
        gridUniforms(extractProgram_);
        gl_.Uniform1i(extractProgram_.uniform("phase"), phase);
        gl_.Uniform1f(extractProgram_.uniform("isovalue"), settings_.isovalue);
        gl_.Uniform1ui(extractProgram_.uniform("chunk"), static_cast<GLuint>(cursor_));
        gl_.Uniform1ui(extractProgram_.uniform("generation"), jobGeneration_);
        gl_.Uniform1ui(extractProgram_.uniform("vertexCapacity"), counted_[cursor_].vertices);
    }

    void submitCount() {
        bindStorage();
        ChunkStats zero;
        zero.generation = jobGeneration_;
        stats_->write(cursor_ * sizeof(zero), std::as_bytes(std::span(&zero, 1)));
        extractUniforms(0);
        ticket_.begin(0);
        gl_.DispatchCompute(16, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        ticket_.end();
        ticket_.begin(1);
        scanProgram_.use();
        gl_.Uniform1ui(scanProgram_.uniform("chunk"), static_cast<GLuint>(cursor_));
        for (int phase = 0; phase < 3; ++phase) {
            gl_.Uniform1i(scanProgram_.uniform("phase"), phase);
            GLuint groups = 1;
            if (phase == 0)
                groups = 8;
            if (phase == 2)
                groups = 16;
            gl_.DispatchCompute(groups, 1, 1);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        }
        ticket_.end();
        ticket_.submit();
    }

    void submitEmit() {
        while (cursor_ < counted_.size() && counted_[cursor_].vertices == 0) {
            candidate_[cursor_].stats = counted_[cursor_];
            ++cursor_;
        }
        if (cursor_ == counted_.size()) {
            active_ = std::move(candidate_);
            candidate_.resize(counted_.size());
            activeGeneration_ = jobGeneration_;
            state_ = MeshJobState::ready;
            return;
        }
        bindStorage();
        const auto count = counted_[cursor_].vertices;
        auto output = std::make_shared<GpuBuffer>(gl_, budget_, count * sizeof(SurfaceVertex) + guardBytes);
        output->setGuard(count * sizeof(SurfaceVertex));
        output->bind(5);
        candidate_[cursor_].buffer = std::move(output);
        extractUniforms(1);
        ticket_.begin(0);
        gl_.DispatchCompute(16, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        ticket_.end();
        normalProgram_.use();
        gridUniforms(normalProgram_);
        gl_.Uniform1ui(normalProgram_.uniform("chunk"), static_cast<GLuint>(cursor_));
        gl_.Uniform1ui(normalProgram_.uniform("vertexCount"), count);
        ticket_.begin(1);
        gl_.DispatchCompute((count + 255) / 256, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    GlApi& gl_;
    GpuBudget& budget_;
    ModelSettings settings_;
    Program fieldProgram_, extractProgram_, scanProgram_, normalProgram_;
    GpuTicket ticket_;
    std::unique_ptr<GpuBuffer> field_, counts_, offsets_, blocks_, stats_, stamps_;
    std::vector<ChunkStats> counted_;
    std::vector<MeshChunk> candidate_, active_;
    MeshJobState state_{MeshJobState::initializing};
    PassTimes times_;
    std::uint64_t requestedVertices_{};
    std::size_t initialized_{}, pendingSamples_{}, cursor_{};
    std::uint32_t requestedGeneration_{1}, jobGeneration_{1}, activeGeneration_{};
    std::optional<float> pendingIsovalue_;
    bool cancelled_{}, paused_{}, validationPlane_{};
};

} // namespace sculpt
