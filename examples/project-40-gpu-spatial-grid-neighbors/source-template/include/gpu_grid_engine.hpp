#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "compute_program.hpp"
#include "gpu_scan.hpp"
#include "grid_math.hpp"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <limits>
#include <string>
#include <utility>
#include <vector>

namespace lab {

inline ComputeLimits queryComputeLimits(GlApi& gl) {
    ComputeLimits limits{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &limits.majorVersion);
    gl.GetIntegerv(GL_MINOR_VERSION, &limits.minorVersion);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0U, &limits.maximumWorkgroupCountX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0U, &limits.maximumWorkgroupSizeX);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.maximumInvocations);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &limits.maximumStorageBindings);
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &limits.maximumShaderStorageBlockBytes);
    GLint sharedBytes = 0;
    gl.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &sharedBytes);
    limits.maximumSharedMemoryBytes = sharedBytes;
    return limits;
}

struct PassRecord {
    std::string label{};
    std::string writes{};
    std::size_t itemCount{};
    GLenum barrierBit{};
};

inline const char* barrierName(GLenum barrierBit) {
    if (barrierBit == GL_SHADER_STORAGE_BARRIER_BIT) {
        return "SHADER_STORAGE -> compute consumer";
    }
    if (barrierBit == GL_BUFFER_UPDATE_BARRIER_BIT) {
        return "BUFFER_UPDATE -> readback consumer";
    }
    return "unexpected barrier";
}

#if LAB_CHECKPOINT >= 8

// Bốn query slot giúp frame hiện tại không phải đợi sample vừa submit.
class TimerQueryRing {
    public:
    bool initialize(GlApi& gl) {
        if (queries_[0] == 0U) {
            gl.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        }
        return queries_[0] != 0U;
    }

    bool begin(GlApi& gl) {
        if (active_ || pending_[writeIndex_]) {
            return false;
        }
        gl.BeginQuery(GL_TIME_ELAPSED, queries_[writeIndex_]);
        active_ = true;
        activeIndex_ = writeIndex_;
        return true;
    }

    void end(GlApi& gl) {
        if (!active_) {
            return;
        }
        gl.EndQuery(GL_TIME_ELAPSED);
        pending_[activeIndex_] = true;
        writeIndex_ = (activeIndex_ + 1U) % queries_.size();
        active_ = false;
    }

    void poll(GlApi& gl) {
        for (std::size_t index = 0; index < queries_.size(); ++index) {
            if (!pending_[index]) {
                continue;
            }
            GLint available = GL_FALSE;
            gl.GetQueryObjectiv(queries_[index], GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE) {
                continue;
            }
            GLuint64 nanoseconds = 0U;
            gl.GetQueryObjectui64v(queries_[index], GL_QUERY_RESULT, &nanoseconds);
            samples_.push_back(static_cast<double>(nanoseconds) / 1'000'000.0);
            if (samples_.size() > 31U) {
                samples_.erase(samples_.begin());
            }
            pending_[index] = false;
        }
    }

    double median() const {
        return medianMilliseconds(samples_);
    }

    std::size_t pendingCount() const {
        return static_cast<std::size_t>(std::count(pending_.begin(), pending_.end(), true));
    }

    std::size_t sampleCount() const {
        return samples_.size();
    }

    bool clearSamplesWhenIdle() {
        if (active_ || pendingCount() != 0U) {
            return false;
        }
        samples_.clear();
        return true;
    }

    void destroy(GlApi& gl) {
        if (queries_[0] != 0U) {
            gl.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        }
        queries_.fill(0U);
        pending_.fill(false);
        samples_.clear();
        active_ = false;
        writeIndex_ = 0U;
    }

    private:
    std::array<GLuint, 4> queries_{};
    std::array<bool, 4> pending_{};
    std::vector<double> samples_{};
    std::size_t writeIndex_{};
    std::size_t activeIndex_{};
    bool active_{};
};

#endif

struct GridBuffers {
    GLuint positions{};
    GLuint cellCounts{};
    GLuint cellOffsets{};
    GLuint cellCursors{};
    GLuint sortedIndices{};
    GLuint neighborSummaries{};
    GpuScanHierarchy scan{};
};

inline void destroyGridBuffers(GlApi& gl, GridBuffers& buffers) {
    destroyScanHierarchy(gl, buffers.scan);
    const std::array<GLuint, 6> ids = {
        buffers.positions,
        buffers.cellCounts,
        buffers.cellOffsets,
        buffers.cellCursors,
        buffers.sortedIndices,
        buffers.neighborSummaries,
    };
    for (GLuint id : ids) {
        if (id != 0U) {
            gl.DeleteBuffers(1, &id);
        }
    }
    buffers = {};
}

class GpuGridEngine {
    public:
    bool initializePrograms(
        GlApi& gl,
        const std::filesystem::path& shaderDirectory,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT < 2
        (void)gl;
        (void)shaderDirectory;
#endif
#if LAB_CHECKPOINT >= 2
        if (!clearProgram_.load(gl, (shaderDirectory / "clear_counts.comp").string(), {"uCellCount"}, diagnostics)) {
            return false;
        }
        if (!countProgram_.load(
                gl,
                (shaderDirectory / "count_cells.comp").string(),
                {"uParticleCount", "uColumns", "uRows", "uCellSize", "uWorldWidth", "uWorldHeight"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 3
        if (!scanProgram_.load(gl, (shaderDirectory / "scan_uint.comp").string(), {"uElementCount"}, diagnostics)) {
            return false;
        }
        if (!uniformAddProgram_.load(gl, (shaderDirectory / "uniform_add_uint.comp").string(), {"uElementCount"}, diagnostics)) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (!prepareProgram_.load(gl, (shaderDirectory / "prepare_cursors.comp").string(), {"uCellCount"}, diagnostics)) {
            return false;
        }
        if (!scatterProgram_.load(
                gl,
                (shaderDirectory / "scatter_indices.comp").string(),
                {"uParticleCount", "uColumns", "uRows", "uCellSize", "uWorldWidth", "uWorldHeight"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (!neighborProgram_.load(
                gl,
                (shaderDirectory / "find_neighbors.comp").string(),
                {"uParticleCount", "uColumns", "uRows", "uCellSize", "uWorldWidth", "uWorldHeight", "uRadius"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 8
        if (!timer_.initialize(gl)) {
            diagnostics = "Could not create the four-slot GPU timer query ring.";
            return false;
        }
#endif
        diagnostics = "GPU grid programs and query resources are ready.";
        return true;
    }

    bool rebuild(
        GlApi& gl,
        const std::vector<Vec2>& positions,
        const GridSpec& spec,
        float radius,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 2
        if (positions.empty() || positions.size() > std::numeric_limits<std::uint32_t>::max()) {
            diagnostics = "Particle count must be non-zero and fit uint indexing.";
            return false;
        }
        if (spec.cellCount() == 0U || spec.cellCount() > std::numeric_limits<std::uint32_t>::max()) {
            diagnostics = "Grid cell count must be non-zero and fit uint indexing.";
            return false;
        }

        GridBuffers candidate{};
        if (!allocateGridBuffers(gl, positions, spec, candidate, diagnostics)) {
            destroyGridBuffers(gl, candidate);
            return false;
        }

        // Commit chỉ xảy ra sau khi mọi buffer và scan level đã cấp phát thành công.
        destroyGridBuffers(gl, buffers_);
        buffers_ = std::move(candidate);
        positions_ = positions;
        spec_ = spec;
        radius_ = radius;
        diagnostics = "Committed a complete candidate GPU grid workload.";
        return true;
#else
        (void)gl;
        (void)positions;
        (void)spec;
        (void)radius;
        diagnostics = "GPU buffers appear in checkpoint 2.";
        return true;
#endif
    }

    bool run(
        GlApi& gl,
        std::string& diagnostics,
        bool collectResults = true,
        bool requireTimingSlot = false,
        bool* timingSubmitted = nullptr
    ) {
#if LAB_CHECKPOINT >= 2
        if (!ready(diagnostics)) {
            return false;
        }
        const bool timingStarted = beginTiming(gl);
        if (timingSubmitted) {
            *timingSubmitted = timingStarted;
        }
        if (requireTimingSlot && !timingStarted) {
            diagnostics = "All GPU timer slots are pending; benchmark sample was deferred.";
            return true;
        }
        passTrace_.clear();
        dispatchClear(gl);
        memoryBarrier(gl, "clear", "cellCounts", spec_.cellCount(), GL_SHADER_STORAGE_BARRIER_BIT);
        dispatchCount(gl);
#if LAB_CHECKPOINT >= 3
        memoryBarrier(gl, "count", "cellCounts", positions_.size(), GL_SHADER_STORAGE_BARRIER_BIT);
        if (!runExclusiveScanGpu(
                gl,
                scanProgram_,
                uniformAddProgram_,
                buffers_.scan,
                buffers_.cellCounts,
                diagnostics
            )) {
            endTiming(gl, timingStarted);
            return false;
        }
        recordScanPasses();
#else
        memoryBarrier(gl, "count", "cellCounts", positions_.size(), GL_BUFFER_UPDATE_BARRIER_BIT);
#endif
#if LAB_CHECKPOINT >= 4
        dispatchPrepareCursors(gl);
        memoryBarrier(gl, "prepare cursors", "cellCursors", spec_.cellCount(), GL_SHADER_STORAGE_BARRIER_BIT);
        dispatchScatter(gl);
#if LAB_CHECKPOINT >= 5
        memoryBarrier(gl, "scatter", "sortedIndices", positions_.size(), GL_SHADER_STORAGE_BARRIER_BIT);
        dispatchNeighbors(gl);
        memoryBarrier(gl, "neighbors", "NeighborSummary", positions_.size(), GL_BUFFER_UPDATE_BARRIER_BIT);
#else
        memoryBarrier(gl, "scatter", "sortedIndices", positions_.size(), GL_BUFFER_UPDATE_BARRIER_BIT);
#endif
#endif
        endTiming(gl, timingStarted);
        if (!collectResults) {
            diagnostics = "Submitted one timed GPU grid sample without CPU readback.";
            return true;
        }
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        readCellCounts(gl);
#if LAB_CHECKPOINT >= 3
        readVector(gl, buffers_.cellOffsets, spec_.cellCount(), cellOffsets_);
#endif
#if LAB_CHECKPOINT >= 4
        readVector(gl, buffers_.cellCursors, spec_.cellCount(), cellCursors_);
        const std::size_t previewCount = std::min<std::size_t>(16U, positions_.size());
        readVector(gl, buffers_.sortedIndices, previewCount, sortedPreview_);
#endif
#if LAB_CHECKPOINT >= 5
        sampleSummary_ = readSummary(gl, 0U);
#endif
#if LAB_CHECKPOINT >= 8
        validate(gl);
#endif
        diagnostics = "GPU grid pipeline completed without intermediate CPU readback.";
        return true;
#else
        (void)gl;
        (void)collectResults;
        (void)requireTimingSlot;
        (void)timingSubmitted;
        diagnostics = "The compute pipeline appears in checkpoint 2.";
        return true;
#endif
    }

    void pollTiming(GlApi& gl) {
#if LAB_CHECKPOINT >= 8
        timer_.poll(gl);
#else
        (void)gl;
#endif
    }

    double medianGpuMilliseconds() const {
#if LAB_CHECKPOINT >= 8
        return timer_.median();
#else
        return 0.0;
#endif
    }

    std::size_t pendingQueries() const {
#if LAB_CHECKPOINT >= 8
        return timer_.pendingCount();
#else
        return 0U;
#endif
    }

    std::size_t timingSampleCount() const {
#if LAB_CHECKPOINT >= 8
        return timer_.sampleCount();
#else
        return 0U;
#endif
    }

    bool clearTimingSamplesWhenIdle() {
#if LAB_CHECKPOINT >= 8
        return timer_.clearSamplesWhenIdle();
#else
        return true;
#endif
    }

    const std::vector<std::uint32_t>& cellCounts() const {
        return cellCounts_;
    }

    const std::vector<std::uint32_t>& cellOffsets() const {
        return cellOffsets_;
    }

    const std::vector<std::uint32_t>& sortedPreview() const {
        return sortedPreview_;
    }

    const NeighborSummary& sampleSummary() const {
        return sampleSummary_;
    }

    bool cursorEndsMatch() const {
        if (cellCursors_.size() != cellOffsets_.size() || cellOffsets_.size() != cellCounts_.size()) {
            return false;
        }
        for (std::size_t cell = 0; cell < cellCursors_.size(); ++cell) {
            if (cellCursors_[cell] != cellOffsets_[cell] + cellCounts_[cell]) {
                return false;
            }
        }
        return true;
    }

    const std::vector<PassRecord>& passTrace() const {
        return passTrace_;
    }

    const GridValidationReport& gridReport() const {
        return gridReport_;
    }

    std::size_t neighborMismatchCount() const {
        return neighborMismatchCount_;
    }

    std::size_t firstNeighborMismatch() const {
        return firstNeighborMismatch_;
    }

    void destroy(GlApi& gl) {
#if LAB_CHECKPOINT >= 8
        timer_.destroy(gl);
#endif
        destroyGridBuffers(gl, buffers_);
        neighborProgram_.destroy(gl);
        scatterProgram_.destroy(gl);
        prepareProgram_.destroy(gl);
        uniformAddProgram_.destroy(gl);
        scanProgram_.destroy(gl);
        countProgram_.destroy(gl);
        clearProgram_.destroy(gl);
        positions_.clear();
        cellCounts_.clear();
        cellOffsets_.clear();
        cellCursors_.clear();
        sortedPreview_.clear();
        passTrace_.clear();
    }

    private:
    bool allocateGridBuffers(
        GlApi& gl,
        const std::vector<Vec2>& positions,
        const GridSpec& spec,
        GridBuffers& candidate,
        std::string& diagnostics
    ) {
        const GLsizeiptr positionBytes = static_cast<GLsizeiptr>(positions.size() * sizeof(Vec2));
        const GLsizeiptr cellBytes = static_cast<GLsizeiptr>(spec.cellCount() * sizeof(std::uint32_t));
        const GLsizeiptr indexBytes = static_cast<GLsizeiptr>(positions.size() * sizeof(std::uint32_t));
        const GLsizeiptr summaryBytes = static_cast<GLsizeiptr>(positions.size() * sizeof(NeighborSummary));
        if (!allocateStorageBuffer(gl, candidate.positions, positionBytes, positions.data(), GL_STATIC_DRAW, "positions", diagnostics)) {
            return false;
        }
        if (!allocateStorageBuffer(gl, candidate.cellCounts, cellBytes, nullptr, GL_DYNAMIC_COPY, "cell counts", diagnostics)) {
            return false;
        }
        if (!allocateStorageBuffer(gl, candidate.cellOffsets, cellBytes, nullptr, GL_DYNAMIC_COPY, "cell offsets", diagnostics)) {
            return false;
        }
        if (!allocateStorageBuffer(gl, candidate.cellCursors, cellBytes, nullptr, GL_DYNAMIC_COPY, "cell cursors", diagnostics)) {
            return false;
        }
        if (!allocateStorageBuffer(gl, candidate.sortedIndices, indexBytes, nullptr, GL_DYNAMIC_COPY, "sorted particle indices", diagnostics)) {
            return false;
        }
        if (!allocateStorageBuffer(gl, candidate.neighborSummaries, summaryBytes, nullptr, GL_DYNAMIC_COPY, "neighbor summaries", diagnostics)) {
            return false;
        }
#if LAB_CHECKPOINT >= 3
        if (!allocateScanHierarchy(
                gl,
                spec.cellCount(),
                candidate.cellOffsets,
                candidate.scan,
                diagnostics
            )) {
            return false;
        }
#endif
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
        return true;
    }

    bool ready(std::string& diagnostics) const {
        if (!clearProgram_.ready() || !countProgram_.ready() || buffers_.positions == 0U) {
            diagnostics = "Count programs or grid buffers are not ready.";
            return false;
        }
#if LAB_CHECKPOINT >= 3
        if (!scanProgram_.ready() || !uniformAddProgram_.ready() || buffers_.scan.levels.empty()) {
            diagnostics = "Scan programs or hierarchy buffers are not ready.";
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (!prepareProgram_.ready() || !scatterProgram_.ready()) {
            diagnostics = "Prepare/scatter programs are not ready.";
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (!neighborProgram_.ready()) {
            diagnostics = "Neighbor program is not ready.";
            return false;
        }
#endif
        return true;
    }

    void setGridUniforms(GlApi& gl, const ComputeProgram& program) {
        gl.Uniform1i(program.uniform("uParticleCount"), static_cast<GLint>(positions_.size()));
        gl.Uniform1i(program.uniform("uColumns"), static_cast<GLint>(spec_.columns));
        gl.Uniform1i(program.uniform("uRows"), static_cast<GLint>(spec_.rows));
        gl.Uniform1f(program.uniform("uCellSize"), spec_.cellSize);
        gl.Uniform1f(program.uniform("uWorldWidth"), spec_.worldWidth);
        gl.Uniform1f(program.uniform("uWorldHeight"), spec_.worldHeight);
    }

    void dispatchClear(GlApi& gl) {
        clearProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.cellCounts);
        gl.Uniform1i(clearProgram_.uniform("uCellCount"), static_cast<GLint>(spec_.cellCount()));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(spec_.cellCount(), kWorkgroupSize)), 1U, 1U);
    }

    void dispatchCount(GlApi& gl) {
        countProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.positions);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.cellCounts);
        setGridUniforms(gl, countProgram_);
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(positions_.size(), kWorkgroupSize)), 1U, 1U);
    }

#if LAB_CHECKPOINT >= 4
    void dispatchPrepareCursors(GlApi& gl) {
        prepareProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.cellOffsets);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.cellCursors);
        gl.Uniform1i(prepareProgram_.uniform("uCellCount"), static_cast<GLint>(spec_.cellCount()));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(spec_.cellCount(), kWorkgroupSize)), 1U, 1U);
    }

    void dispatchScatter(GlApi& gl) {
        scatterProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.positions);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.cellCursors);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, buffers_.sortedIndices);
        setGridUniforms(gl, scatterProgram_);
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(positions_.size(), kWorkgroupSize)), 1U, 1U);
    }
#endif

#if LAB_CHECKPOINT >= 5
    void dispatchNeighbors(GlApi& gl) {
        neighborProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.positions);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.cellCounts);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, buffers_.cellOffsets);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 3U, buffers_.sortedIndices);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 4U, buffers_.neighborSummaries);
        setGridUniforms(gl, neighborProgram_);
        gl.Uniform1f(neighborProgram_.uniform("uRadius"), radius_);
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(positions_.size(), kWorkgroupSize)), 1U, 1U);
    }
#endif

    void memoryBarrier(
        GlApi& gl,
        const char* label,
        const char* writes,
        std::size_t itemCount,
        GLenum barrierBit
    ) {
        gl.MemoryBarrier(barrierBit);
#if LAB_CHECKPOINT >= 7
        passTrace_.push_back({label, writes, itemCount, barrierBit});
#else
        (void)label;
        (void)writes;
        (void)itemCount;
#endif
    }

    void recordScanPasses() {
#if LAB_CHECKPOINT >= 7
        for (const ScanLevelBuffers& level : buffers_.scan.levels) {
            passTrace_.push_back({"scan blocks", "cellOffsets/blockSums", level.inputCount, GL_SHADER_STORAGE_BARRIER_BIT});
        }
        if (buffers_.scan.levels.size() > 1U) {
            for (std::size_t level = buffers_.scan.levels.size() - 1U; level > 0U; --level) {
                passTrace_.push_back({"uniform add", "cellOffsets", buffers_.scan.levels[level - 1U].inputCount, GL_SHADER_STORAGE_BARRIER_BIT});
            }
        }
#endif
    }

    void readCellCounts(GlApi& gl) {
        cellCounts_.resize(spec_.cellCount());
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_.cellCounts);
        gl.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            0,
            static_cast<GLsizeiptr>(cellCounts_.size() * sizeof(std::uint32_t)),
            cellCounts_.data()
        );
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
    }

    template <typename Value>
    void readVector(GlApi& gl, GLuint buffer, std::size_t count, std::vector<Value>& output) {
        output.resize(count);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            0,
            static_cast<GLsizeiptr>(count * sizeof(Value)),
            output.data()
        );
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
    }

#if LAB_CHECKPOINT >= 5
    NeighborSummary readSummary(GlApi& gl, std::size_t index) {
        NeighborSummary summary{};
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_.neighborSummaries);
        gl.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            static_cast<GLintptr>(index * sizeof(NeighborSummary)),
            sizeof(NeighborSummary),
            &summary
        );
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
        return summary;
    }
#endif

#if LAB_CHECKPOINT >= 8
    void validate(GlApi& gl) {
        std::vector<std::uint32_t> offsets{};
        std::vector<std::uint32_t> cursors{};
        std::vector<std::uint32_t> sortedIndices{};
        readVector(gl, buffers_.cellOffsets, spec_.cellCount(), offsets);
        readVector(gl, buffers_.cellCursors, spec_.cellCount(), cursors);
        readVector(gl, buffers_.sortedIndices, positions_.size(), sortedIndices);
        gridReport_ = validateCsr(positions_.size(), spec_, cellCounts_, offsets, sortedIndices);
        for (std::size_t cell = 0; cell < cursors.size(); ++cell) {
            const std::uint32_t expectedCursor = offsets[cell] + cellCounts_[cell];
            if (cursors[cell] != expectedCursor) {
                gridReport_.rangesInsideStorage = false;
                if (gridReport_.firstInvalidCell == std::numeric_limits<std::size_t>::max()) {
                    gridReport_.firstInvalidCell = cell;
                }
            }
        }

        neighborMismatchCount_ = 0U;
        firstNeighborMismatch_ = std::numeric_limits<std::size_t>::max();
        const std::vector<std::size_t> samples = validationSampleIndices(positions_.size());
        for (std::size_t queryIndex : samples) {
            const NeighborSummary actual = readSummary(gl, queryIndex);
            const NeighborSummary expected = bruteForceNeighbor(positions_, queryIndex, radius_);
            if (!summariesMatch(actual, expected)) {
                if (firstNeighborMismatch_ == std::numeric_limits<std::size_t>::max()) {
                    firstNeighborMismatch_ = queryIndex;
                }
                ++neighborMismatchCount_;
            }
        }
    }

    bool beginTiming(GlApi& gl) {
        return timer_.begin(gl);
    }

    void endTiming(GlApi& gl, bool timingStarted) {
        if (timingStarted) {
            timer_.end(gl);
        }
    }
#else
    bool beginTiming(GlApi& gl) {
        (void)gl;
        return false;
    }

    void endTiming(GlApi& gl, bool timingStarted) {
        (void)gl;
        (void)timingStarted;
    }
#endif

    ComputeProgram clearProgram_{};
    ComputeProgram countProgram_{};
    ComputeProgram scanProgram_{};
    ComputeProgram uniformAddProgram_{};
    ComputeProgram prepareProgram_{};
    ComputeProgram scatterProgram_{};
    ComputeProgram neighborProgram_{};
#if LAB_CHECKPOINT >= 8
    TimerQueryRing timer_{};
#endif
    GridBuffers buffers_{};
    GridSpec spec_{};
    float radius_{6.0F};
    std::vector<Vec2> positions_{};
    std::vector<std::uint32_t> cellCounts_{};
    std::vector<std::uint32_t> cellOffsets_{};
    std::vector<std::uint32_t> cellCursors_{};
    std::vector<std::uint32_t> sortedPreview_{};
    NeighborSummary sampleSummary_{};
    std::vector<PassRecord> passTrace_{};
    GridValidationReport gridReport_{};
    std::size_t neighborMismatchCount_{};
    std::size_t firstNeighborMismatch_{std::numeric_limits<std::size_t>::max()};
};

} // namespace lab
