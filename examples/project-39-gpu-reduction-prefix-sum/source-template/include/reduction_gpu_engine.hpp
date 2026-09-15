#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include "compute_program.hpp"
#include "gl_api.hpp"
#include "reduction_math.hpp"

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

#if LAB_CHECKPOINT >= 3
inline ComputeLimits queryComputeLimits(GlApi& gl) {
    ComputeLimits limits{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &limits.majorVersion);
    gl.GetIntegerv(GL_MINOR_VERSION, &limits.minorVersion);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0U, &limits.maximumWorkgroupCountX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0U, &limits.maximumWorkgroupSizeX);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.maximumInvocations);
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &limits.maximumShaderStorageBlockBytes);
    GLint sharedBytes = 0;
    gl.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &sharedBytes);
    limits.maximumSharedMemoryBytes = sharedBytes;
    return limits;
}

#if LAB_CHECKPOINT >= 4
struct PassRecord {
    std::string label{};
    std::size_t inputCount{};
    std::size_t outputCount{};
    GLenum barrierBit{};
};
#endif

#if LAB_CHECKPOINT >= 8

inline const char* barrierName(GLenum barrierBit) {
    if (barrierBit == GL_SHADER_STORAGE_BARRIER_BIT) {
        return "SHADER_STORAGE -> compute consumer";
    }
    if (barrierBit == GL_BUFFER_UPDATE_BARRIER_BIT) {
        return "BUFFER_UPDATE -> readback consumer";
    }
    return "unexpected barrier";
}

#endif

// Query ring không tái sử dụng slot còn pending và không đợi frame vừa submit.
#if LAB_CHECKPOINT >= 9
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

#if LAB_CHECKPOINT >= 5
struct ScanLevelBuffers {
    std::size_t inputCount{};
    std::size_t blockCount{};
    GLuint scanBuffer{};
    GLuint sumsBuffer{};
};
#endif

class ReductionGpuEngine {
    public:
    bool initializePrograms(
        GlApi& gl,
        const std::filesystem::path& shaderDirectory,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT < 3
        (void)gl;
        (void)shaderDirectory;
#endif
#if LAB_CHECKPOINT >= 3
        if (!reduceProgram_.load(
                gl,
                (shaderDirectory / "reduce.comp").string(),
                {"uElementCount"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (!scanProgram_.load(
                gl,
                (shaderDirectory / "scan_blocks.comp").string(),
                {"uElementCount"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (!uniformAddProgram_.load(
                gl,
                (shaderDirectory / "uniform_add.comp").string(),
                {"uElementCount"},
                diagnostics
            )) {
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 9
        if (!timer_.initialize(gl)) {
            diagnostics = "Could not create the four-slot GPU timer query ring.";
            return false;
        }
#endif
        diagnostics = "Compute programs and query resources are ready.";
        return true;
    }

    bool uploadInput(
        GlApi& gl,
        const std::vector<float>& input,
        std::string& diagnostics
    ) {
        if (input.empty() || input.size() > static_cast<std::size_t>(std::numeric_limits<GLint>::max())) {
            diagnostics = "Input count must be non-zero and fit the uElementCount GLint uniform.";
            return false;
        }

        std::vector<HierarchyLevel> candidateHierarchy = makeHierarchy(input.size());
        GLuint candidateInputBuffer = 0U;
        std::array<GLuint, 2> candidateScratch{};
#if LAB_CHECKPOINT >= 5
        std::vector<ScanLevelBuffers> candidateScanLevels(candidateHierarchy.size());
#endif
        const GLsizeiptr inputBytes = static_cast<GLsizeiptr>(input.size() * sizeof(float));
        if (!allocateBuffer(
                gl,
                candidateInputBuffer,
                inputBytes,
                input.data(),
                GL_STATIC_DRAW,
                "input SSBO",
                diagnostics
            )) {
            destroyCandidateReductionBuffers(gl, candidateInputBuffer, candidateScratch);
            return false;
        }

        const std::size_t scratchCount = std::max<std::size_t>(1U, candidateHierarchy.front().blockCount);
        const GLsizeiptr scratchBytes = static_cast<GLsizeiptr>(scratchCount * sizeof(float));
        for (std::size_t index = 0; index < candidateScratch.size(); ++index) {
            if (!allocateBuffer(
                    gl,
                    candidateScratch[index],
                    scratchBytes,
                    nullptr,
                    GL_DYNAMIC_COPY,
                    "reduction scratch SSBO",
                    diagnostics
                )) {
                destroyCandidateReductionBuffers(gl, candidateInputBuffer, candidateScratch);
                return false;
            }
        }

#if LAB_CHECKPOINT >= 5
        for (std::size_t index = 0; index < candidateHierarchy.size(); ++index) {
            ScanLevelBuffers& level = candidateScanLevels[index];
            level.inputCount = candidateHierarchy[index].inputCount;
            level.blockCount = candidateHierarchy[index].blockCount;
            const GLsizeiptr scanBytes = static_cast<GLsizeiptr>(level.inputCount * sizeof(float));
            const GLsizeiptr sumsBytes = static_cast<GLsizeiptr>(level.blockCount * sizeof(float));
            if (!allocateBuffer(
                    gl,
                    level.scanBuffer,
                    scanBytes,
                    nullptr,
                    GL_DYNAMIC_COPY,
                    "scan output SSBO",
                    diagnostics
                )) {
                destroyCandidateReductionBuffers(gl, candidateInputBuffer, candidateScratch);
                destroyCandidateScanBuffers(gl, candidateScanLevels);
                return false;
            }
            if (!allocateBuffer(
                    gl,
                    level.sumsBuffer,
                    sumsBytes,
                    nullptr,
                    GL_DYNAMIC_COPY,
                    "block sums SSBO",
                    diagnostics
                )) {
                destroyCandidateReductionBuffers(gl, candidateInputBuffer, candidateScratch);
                destroyCandidateScanBuffers(gl, candidateScanLevels);
                return false;
            }
        }
#endif

        // Chỉ thay state đang chạy sau khi toàn bộ candidate allocation thành công.
        destroyDataBuffers(gl);
        input_ = input;
        hierarchy_ = std::move(candidateHierarchy);
        inputBuffer_ = candidateInputBuffer;
        reductionScratch_ = candidateScratch;
#if LAB_CHECKPOINT >= 5
        scanLevels_ = std::move(candidateScanLevels);
#endif
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
        diagnostics = "Uploaded deterministic input and allocated hierarchy buffers.";
        return true;
    }

    bool reduceFirstBlock(GlApi& gl, float& result, std::string& diagnostics) {
#if LAB_CHECKPOINT >= 3
        if (!readyForReduction(diagnostics)) {
            return false;
        }
        const std::size_t count = std::min<std::size_t>(input_.size(), kBlockSpan);
        dispatchReductionPass(gl, inputBuffer_, reductionScratch_[0], count);
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        readScalar(gl, reductionScratch_[0], result);
        diagnostics = "Reduced the first workgroup to one partial sum.";
        return true;
#else
        (void)gl;
        result = 0.0F;
        diagnostics = "The first GPU reduction appears in checkpoint 3.";
        return true;
#endif
    }

#if LAB_CHECKPOINT >= 4
    bool runReduction(GlApi& gl, float& result, std::string& diagnostics) {
#if LAB_CHECKPOINT >= 4
        if (!readyForReduction(diagnostics)) {
            return false;
        }
        passTrace_.clear();
#if LAB_CHECKPOINT >= 9
        const bool timingStarted = beginTiming(gl);
        lastTimingSubmitted_ = timingStarted;
#endif
        GLuint source = inputBuffer_;
        std::size_t count = input_.size();
        std::size_t scratchIndex = 0U;
        while (count > 1U) {
            const std::size_t outputCount = ceilDiv(count, kBlockSpan);
            const GLuint destination = reductionScratch_[scratchIndex];
            dispatchReductionPass(gl, source, destination, count);
            GLenum barrierBit = GL_BUFFER_UPDATE_BARRIER_BIT;
            if (outputCount > 1U) {
                barrierBit = GL_SHADER_STORAGE_BARRIER_BIT;
            }
            gl.MemoryBarrier(barrierBit);
            passTrace_.push_back({"reduce", count, outputCount, barrierBit});
            source = destination;
            count = outputCount;
            scratchIndex = 1U - scratchIndex;
        }
#if LAB_CHECKPOINT >= 9
        endTiming(gl, timingStarted);
#endif
        readScalar(gl, source, result);
#if LAB_CHECKPOINT >= 9
        lastReductionReport_ = validateReduction(input_, result);
#endif
        diagnostics = "Hierarchical reduction reached one GPU scalar without intermediate readback.";
        return true;
#else
        (void)gl;
        result = 0.0F;
        diagnostics = "Hierarchical reduction appears in checkpoint 4.";
        return true;
#endif
    }
#endif

#if LAB_CHECKPOINT >= 5
    bool runSingleBlockScan(
        GlApi& gl,
        std::vector<float>& output,
        float& blockSum,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 5
        if (!readyForScan(diagnostics)) {
            return false;
        }
        const std::size_t count = std::min<std::size_t>(input_.size(), kBlockSpan);
        dispatchScanPass(
            gl,
            inputBuffer_,
            scanLevels_[0].scanBuffer,
            scanLevels_[0].sumsBuffer,
            count
        );
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        readVector(gl, scanLevels_[0].scanBuffer, count, output);
        readScalar(gl, scanLevels_[0].sumsBuffer, blockSum);
        diagnostics = "Blelloch upsweep/downweep completed for one block.";
        return true;
#else
        (void)gl;
        output.clear();
        blockSum = 0.0F;
        diagnostics = "Blelloch scan appears in checkpoint 5.";
        return true;
#endif
    }
#endif

#if LAB_CHECKPOINT >= 6
    bool runBlockScans(
        GlApi& gl,
        std::vector<float>& localPrefixes,
        std::vector<float>& blockSums,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 6
        if (!readyForScan(diagnostics)) {
            return false;
        }
        dispatchScanPass(
            gl,
            inputBuffer_,
            scanLevels_[0].scanBuffer,
            scanLevels_[0].sumsBuffer,
            input_.size()
        );
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        readVector(gl, scanLevels_[0].scanBuffer, input_.size(), localPrefixes);
        readVector(gl, scanLevels_[0].sumsBuffer, hierarchy_[0].blockCount, blockSums);
        diagnostics = "Every block produced local prefixes and one block sum.";
        return true;
#else
        (void)gl;
        localPrefixes.clear();
        blockSums.clear();
        diagnostics = "Multi-block scan appears in checkpoint 6.";
        return true;
#endif
    }
#endif

#if LAB_CHECKPOINT >= 7
    bool runExclusiveScan(
        GlApi& gl,
        std::vector<float>& output,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 7
        if (!readyForScan(diagnostics) || !uniformAddProgram_.ready()) {
            diagnostics = "Scan programs or hierarchy buffers are not ready.";
            return false;
        }
        passTrace_.clear();
#if LAB_CHECKPOINT >= 9
        const bool timingStarted = beginTiming(gl);
        lastTimingSubmitted_ = timingStarted;
#endif
        GLuint source = inputBuffer_;
        for (std::size_t levelIndex = 0; levelIndex < scanLevels_.size(); ++levelIndex) {
            ScanLevelBuffers& level = scanLevels_[levelIndex];
            dispatchScanPass(gl, source, level.scanBuffer, level.sumsBuffer, level.inputCount);
            GLenum barrierBit = GL_SHADER_STORAGE_BARRIER_BIT;
            if (scanLevels_.size() == 1U) {
                barrierBit = GL_BUFFER_UPDATE_BARRIER_BIT;
            }
            gl.MemoryBarrier(barrierBit);
            passTrace_.push_back({
                "scan blocks",
                level.inputCount,
                level.blockCount,
                barrierBit,
            });
            source = level.sumsBuffer;
        }

        if (scanLevels_.size() > 1U) {
            for (std::size_t levelIndex = scanLevels_.size() - 1U; levelIndex > 0U; --levelIndex) {
                ScanLevelBuffers& target = scanLevels_[levelIndex - 1U];
                const ScanLevelBuffers& offsets = scanLevels_[levelIndex];
                dispatchUniformAdd(
                    gl,
                    target.scanBuffer,
                    offsets.scanBuffer,
                    target.inputCount
                );
                GLenum barrierBit = GL_SHADER_STORAGE_BARRIER_BIT;
                if (levelIndex == 1U) {
                    barrierBit = GL_BUFFER_UPDATE_BARRIER_BIT;
                }
                gl.MemoryBarrier(barrierBit);
                passTrace_.push_back({
                    "uniform add",
                    target.inputCount,
                    target.blockCount,
                    barrierBit,
                });
            }
        }
#if LAB_CHECKPOINT >= 9
        endTiming(gl, timingStarted);
#endif

        readVector(gl, scanLevels_[0].scanBuffer, input_.size(), output);
#if LAB_CHECKPOINT >= 9
        lastScanReport_ = validateExclusiveScan(input_, output);
#endif
        diagnostics = "Hierarchical exclusive scan completed with GPU-resident block offsets.";
        return true;
#else
        (void)gl;
        output.clear();
        diagnostics = "Hierarchical scan appears in checkpoint 7.";
        return true;
#endif
    }
#endif

#if LAB_CHECKPOINT >= 9
    void pollTiming(GlApi& gl) {
#if LAB_CHECKPOINT >= 9
        timer_.poll(gl);
#else
        (void)gl;
#endif
    }

    double medianGpuMilliseconds() const {
#if LAB_CHECKPOINT >= 9
        return timer_.median();
#else
        return 0.0;
#endif
    }

    std::size_t pendingQueries() const {
#if LAB_CHECKPOINT >= 9
        return timer_.pendingCount();
#else
        return 0U;
#endif
    }

    std::size_t timingSampleCount() const {
#if LAB_CHECKPOINT >= 9
        return timer_.sampleCount();
#else
        return 0U;
#endif
    }

    bool clearTimingSamplesWhenIdle() {
#if LAB_CHECKPOINT >= 9
        return timer_.clearSamplesWhenIdle();
#else
        return true;
#endif
    }

    bool lastTimingSubmitted() const {
        return lastTimingSubmitted_;
    }

    const ValidationReport& reductionReport() const {
        return lastReductionReport_;
    }

    const ValidationReport& scanReport() const {
        return lastScanReport_;
    }
#endif

#if LAB_CHECKPOINT >= 4
    const std::vector<PassRecord>& passTrace() const {
        return passTrace_;
    }
#endif

    const std::vector<float>& input() const {
        return input_;
    }

    void destroy(GlApi& gl) {
#if LAB_CHECKPOINT >= 9
        timer_.destroy(gl);
#endif
        destroyDataBuffers(gl);
#if LAB_CHECKPOINT >= 7
        uniformAddProgram_.destroy(gl);
#endif
#if LAB_CHECKPOINT >= 5
        scanProgram_.destroy(gl);
#endif
        reduceProgram_.destroy(gl);
    }

    private:
    bool readyForReduction(std::string& diagnostics) const {
        if (!reduceProgram_.ready() || inputBuffer_ == 0U || input_.empty()) {
            diagnostics = "Reduction program/input buffers are not ready.";
            return false;
        }
        return true;
    }

#if LAB_CHECKPOINT >= 5
    bool readyForScan(std::string& diagnostics) const {
        if (!scanProgram_.ready() || scanLevels_.empty() || input_.empty()) {
            diagnostics = "Scan program/hierarchy buffers are not ready.";
            return false;
        }
        return true;
    }
#endif

    void dispatchReductionPass(
        GlApi& gl,
        GLuint inputBuffer,
        GLuint outputBuffer,
        std::size_t count
    ) {
        reduceProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, inputBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, outputBuffer);
        gl.Uniform1i(reduceProgram_.uniform("uElementCount"), static_cast<GLint>(count));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(count, kBlockSpan)), 1U, 1U);
    }

#if LAB_CHECKPOINT >= 5
    void dispatchScanPass(
        GlApi& gl,
        GLuint inputBuffer,
        GLuint outputBuffer,
        GLuint sumsBuffer,
        std::size_t count
    ) {
        scanProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, inputBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, outputBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, sumsBuffer);
        gl.Uniform1i(scanProgram_.uniform("uElementCount"), static_cast<GLint>(count));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(count, kBlockSpan)), 1U, 1U);
    }
#endif

#if LAB_CHECKPOINT >= 7
    void dispatchUniformAdd(
        GlApi& gl,
        GLuint outputBuffer,
        GLuint offsetsBuffer,
        std::size_t count
    ) {
        uniformAddProgram_.use(gl);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, outputBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, offsetsBuffer);
        gl.Uniform1i(uniformAddProgram_.uniform("uElementCount"), static_cast<GLint>(count));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(count, kWorkgroupSize)), 1U, 1U);
    }
#endif

#if LAB_CHECKPOINT >= 9
    bool beginTiming(GlApi& gl) {
        return timer_.begin(gl);
    }

    void endTiming(GlApi& gl, bool timingStarted) {
        if (timingStarted) {
            timer_.end(gl);
        }
    }
#endif

    void readScalar(GlApi& gl, GLuint buffer, float& result) {
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(float), &result);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
    }

#if LAB_CHECKPOINT >= 5
    void readVector(
        GlApi& gl,
        GLuint buffer,
        std::size_t count,
        std::vector<float>& output
    ) {
        output.resize(count);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            0,
            static_cast<GLsizeiptr>(count * sizeof(float)),
            output.data()
        );
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0U);
    }
#endif

    bool allocateBuffer(
        GlApi& gl,
        GLuint& buffer,
        GLsizeiptr bytes,
        const void* data,
        GLenum usage,
        const char* label,
        std::string& diagnostics
    ) {
        gl.GenBuffers(1, &buffer);
        if (buffer == 0U) {
            diagnostics = std::string("glGenBuffers failed for ") + label + ".";
            return false;
        }
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        static_cast<void>(gl.GetError());
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, bytes, data, usage);
        if (gl.GetError() != GL_NO_ERROR) {
            diagnostics = std::string("glBufferData failed for ") + label + ".";
            return false;
        }
        return true;
    }

    void destroyCandidateReductionBuffers(
        GlApi& gl,
        GLuint inputBuffer,
        const std::array<GLuint, 2>& scratchBuffers
    ) {
        if (inputBuffer != 0U) {
            gl.DeleteBuffers(1, &inputBuffer);
        }
        for (GLuint scratchBuffer : scratchBuffers) {
            if (scratchBuffer != 0U) {
                gl.DeleteBuffers(1, &scratchBuffer);
            }
        }
    }

#if LAB_CHECKPOINT >= 5
    void destroyCandidateScanBuffers(
        GlApi& gl,
        std::vector<ScanLevelBuffers>& scanLevels
    ) {
        for (ScanLevelBuffers& level : scanLevels) {
            if (level.scanBuffer != 0U) {
                gl.DeleteBuffers(1, &level.scanBuffer);
            }
            if (level.sumsBuffer != 0U) {
                gl.DeleteBuffers(1, &level.sumsBuffer);
            }
        }
    }
#endif

    void destroyDataBuffers(GlApi& gl) {
#if LAB_CHECKPOINT >= 5
        for (ScanLevelBuffers& level : scanLevels_) {
            if (level.scanBuffer != 0U) {
                gl.DeleteBuffers(1, &level.scanBuffer);
            }
            if (level.sumsBuffer != 0U) {
                gl.DeleteBuffers(1, &level.sumsBuffer);
            }
        }
        scanLevels_.clear();
#endif
        if (reductionScratch_[0] != 0U || reductionScratch_[1] != 0U) {
            gl.DeleteBuffers(2, reductionScratch_.data());
        }
        reductionScratch_.fill(0U);
        if (inputBuffer_ != 0U) {
            gl.DeleteBuffers(1, &inputBuffer_);
            inputBuffer_ = 0U;
        }
        hierarchy_.clear();
        input_.clear();
    }

    ComputeProgram reduceProgram_{};
#if LAB_CHECKPOINT >= 5
    ComputeProgram scanProgram_{};
#endif
#if LAB_CHECKPOINT >= 7
    ComputeProgram uniformAddProgram_{};
#endif
#if LAB_CHECKPOINT >= 9
    TimerQueryRing timer_{};
#endif
    GLuint inputBuffer_{};
    std::array<GLuint, 2> reductionScratch_{};
#if LAB_CHECKPOINT >= 5
    std::vector<ScanLevelBuffers> scanLevels_{};
#endif
    std::vector<HierarchyLevel> hierarchy_{};
    std::vector<float> input_{};
#if LAB_CHECKPOINT >= 4
    std::vector<PassRecord> passTrace_{};
#endif
#if LAB_CHECKPOINT >= 9
    ValidationReport lastReductionReport_{};
    ValidationReport lastScanReport_{};
#endif
#if LAB_CHECKPOINT >= 9
    bool lastTimingSubmitted_{};
#endif
};
#endif

} // namespace lab
