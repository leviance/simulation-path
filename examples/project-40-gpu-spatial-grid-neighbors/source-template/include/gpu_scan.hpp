#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "compute_program.hpp"
#include "grid_math.hpp"

#include <cstddef>
#include <string>
#include <utility>
#include <vector>

namespace lab {

struct ScanLevelBuffers {
    std::size_t inputCount{};
    std::size_t blockCount{};
    GLuint scanBuffer{};
    GLuint sumsBuffer{};
    bool ownsScanBuffer{};
};

struct GpuScanHierarchy {
    std::vector<ScanLevelBuffers> levels{};
};

// Mọi allocation đều kiểm glGetError để caller có thể giữ workload last-good.
inline bool allocateStorageBuffer(
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
        gl.DeleteBuffers(1, &buffer);
        buffer = 0U;
        return false;
    }
    return true;
}

inline void destroyScanHierarchy(GlApi& gl, GpuScanHierarchy& hierarchy) {
    for (ScanLevelBuffers& level : hierarchy.levels) {
        if (level.ownsScanBuffer && level.scanBuffer != 0U) {
            gl.DeleteBuffers(1, &level.scanBuffer);
        }
        if (level.sumsBuffer != 0U) {
            gl.DeleteBuffers(1, &level.sumsBuffer);
        }
        level.scanBuffer = 0U;
        level.sumsBuffer = 0U;
    }
    hierarchy.levels.clear();
}

#if LAB_CHECKPOINT >= 3

inline bool allocateScanHierarchy(
    GlApi& gl,
    std::size_t inputCount,
    GLuint levelZeroOutput,
    GpuScanHierarchy& hierarchy,
    std::string& diagnostics
) {
    GpuScanHierarchy candidate{};
    const std::vector<ScanLevel> plan = makeScanHierarchy(inputCount);
    candidate.levels.resize(plan.size());
    for (std::size_t index = 0; index < plan.size(); ++index) {
        ScanLevelBuffers& level = candidate.levels[index];
        level.inputCount = plan[index].inputCount;
        level.blockCount = plan[index].blockCount;
        if (index == 0U) {
            level.scanBuffer = levelZeroOutput;
            level.ownsScanBuffer = false;
        } else {
            const GLsizeiptr scanBytes = static_cast<GLsizeiptr>(level.inputCount * sizeof(std::uint32_t));
            if (!allocateStorageBuffer(
                    gl,
                    level.scanBuffer,
                    scanBytes,
                    nullptr,
                    GL_DYNAMIC_COPY,
                    "recursive uint scan output",
                    diagnostics
                )) {
                destroyScanHierarchy(gl, candidate);
                return false;
            }
            level.ownsScanBuffer = true;
        }

        const GLsizeiptr sumsBytes = static_cast<GLsizeiptr>(level.blockCount * sizeof(std::uint32_t));
        if (!allocateStorageBuffer(
                gl,
                level.sumsBuffer,
                sumsBytes,
                nullptr,
                GL_DYNAMIC_COPY,
                "uint scan block sums",
                diagnostics
            )) {
            destroyScanHierarchy(gl, candidate);
            return false;
        }
    }

    destroyScanHierarchy(gl, hierarchy);
    hierarchy = std::move(candidate);
    return true;
}

inline void dispatchScanBlocks(
    GlApi& gl,
    const ComputeProgram& program,
    GLuint inputBuffer,
    GLuint outputBuffer,
    GLuint sumsBuffer,
    std::size_t inputCount
) {
    program.use(gl);
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, inputBuffer);
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, outputBuffer);
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, sumsBuffer);
    gl.Uniform1i(program.uniform("uElementCount"), static_cast<GLint>(inputCount));
    gl.DispatchCompute(static_cast<GLuint>(ceilDiv(inputCount, kScanBlockSpan)), 1U, 1U);
}

inline void dispatchUniformAddUint(
    GlApi& gl,
    const ComputeProgram& program,
    GLuint outputBuffer,
    GLuint offsetsBuffer,
    std::size_t inputCount
) {
    program.use(gl);
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, outputBuffer);
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, offsetsBuffer);
    gl.Uniform1i(program.uniform("uElementCount"), static_cast<GLint>(inputCount));
    gl.DispatchCompute(static_cast<GLuint>(ceilDiv(inputCount, kWorkgroupSize)), 1U, 1U);
}

inline bool runExclusiveScanGpu(
    GlApi& gl,
    const ComputeProgram& scanProgram,
    const ComputeProgram& uniformAddProgram,
    GpuScanHierarchy& hierarchy,
    GLuint inputBuffer,
    std::string& diagnostics
) {
    if (!scanProgram.ready() || !uniformAddProgram.ready() || hierarchy.levels.empty()) {
        diagnostics = "Uint scan programs or hierarchy buffers are not ready.";
        return false;
    }

    GLuint source = inputBuffer;
    for (ScanLevelBuffers& level : hierarchy.levels) {
        dispatchScanBlocks(
            gl,
            scanProgram,
            source,
            level.scanBuffer,
            level.sumsBuffer,
            level.inputCount
        );
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        source = level.sumsBuffer;
    }

    if (hierarchy.levels.size() > 1U) {
        for (std::size_t levelIndex = hierarchy.levels.size() - 1U; levelIndex > 0U; --levelIndex) {
            ScanLevelBuffers& target = hierarchy.levels[levelIndex - 1U];
            const ScanLevelBuffers& offsets = hierarchy.levels[levelIndex];
            dispatchUniformAddUint(
                gl,
                uniformAddProgram,
                target.scanBuffer,
                offsets.scanBuffer,
                target.inputCount
            );
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        }
    }
    diagnostics = "Cell counts became GPU-resident exclusive offsets.";
    return true;
}

#endif

} // namespace lab
