#pragma once
#include "model.hpp"
#include "program.hpp"
#include <string>

namespace water3 {
// Buffers are owned here and freed before the GL context. No CPU array scales with N.
inline void bind(lab::GlApi& gl, GLuint slot, GLuint buffer) {
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, slot, buffer);
}

inline GLuint allocate(lab::GlApi& gl, std::uint64_t bytes) {
    GLuint buffer = 0;
    gl.GenBuffers(1, &buffer);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
    gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), nullptr, GL_DYNAMIC_COPY);
    if (!buffer || gl.GetError() != GL_NO_ERROR) {
        gl.DeleteBuffers(1, &buffer);
        throw std::runtime_error("GPU allocation failed; reduce count");
    }
    return buffer;
}

inline void checkLimits(lab::GlApi& gl, const Plan& plan) {
    GLint64 block = 0;
    GLint bindings = 0, computeBlocks = 0, vertexBlocks = 0, invocations = 0, groupSize = 0, groupCount = 0, shared = 0;
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &block);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &computeBlocks);
    gl.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &groupSize);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groupCount);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &shared);
    const auto groups = ceilDivide(std::max(plan.count, plan.cells), 256);
    if (block <= 0 || plan.largestBlock > static_cast<std::uint64_t>(block) || bindings < 7 || computeBlocks < 7 || vertexBlocks < 2 || invocations < 256 || groupSize < 256 || groupCount < static_cast<GLint>(groups) || shared < 4096 || plan.residentBytes > 192ULL * 1024 * 1024) {
        throw std::runtime_error("Workload exceeds GPU limits or 192 MiB teaching budget");
    }
}

struct ScanBuffers {
    GLuint output = 0;
    GLuint sums = 0;
    ScanLevel level;
    bool ownsOutput = false;
};

struct Storage {
    Plan plan;
    std::array<GLuint, 2> positions{};
    std::array<GLuint, 2> velocities{};
    GLuint density = 0, acceleration = 0, counts = 0, offsets = 0, cursors = 0, indices = 0;
    std::array<GLuint, 2> scratch{};
    std::vector<ScanBuffers> scan;

    void destroy(lab::GlApi& gl) {
        gl.DeleteBuffers(2, positions.data());
        gl.DeleteBuffers(2, velocities.data());
        gl.DeleteBuffers(2, scratch.data());
        const GLuint buffers[] = {density, acceleration, counts, offsets, cursors, indices};
        gl.DeleteBuffers(6, buffers);
        for (const auto& level : scan) {
            if (level.ownsOutput) {
                gl.DeleteBuffers(1, &level.output);
            }
            gl.DeleteBuffers(1, &level.sums);
        }
        *this = Storage{};
    }

    void create(lab::GlApi& gl, const Plan& requested) {
        checkLimits(gl, requested);
        plan = requested;
        try {
            for (auto& buffer : positions) {
                buffer = allocate(gl, 16ULL * plan.count);
            }
            for (auto& buffer : velocities) {
                buffer = allocate(gl, 16ULL * plan.count);
            }
            density = allocate(gl, 16ULL * plan.count);
            acceleration = allocate(gl, 16ULL * plan.count);
            counts = allocate(gl, 4ULL * plan.cells);
            offsets = allocate(gl, 4ULL * plan.cells);
            cursors = allocate(gl, 4ULL * plan.cells);
            indices = allocate(gl, 4ULL * plan.count);
            for (auto& buffer : scratch) {
                buffer = allocate(gl, 16ULL * ceilDivide(plan.count, 256));
            }
            for (std::size_t i = 0; i < plan.levels.size(); ++i) {
                scan.push_back({});
                auto& buffer = scan.back();
                buffer.level = plan.levels[i];
                buffer.output = offsets;
                if (i > 0) {
                    buffer.ownsOutput = true;
                    buffer.output = allocate(gl, 4ULL * buffer.level.input);
                }
                buffer.sums = allocate(gl, 4ULL * buffer.level.groups);
            }
        } catch (...) {
            destroy(gl);
            throw;
        }
    }
};

template <typename Value>
inline std::vector<Value> readVector(lab::GlApi& gl, GLuint buffer, std::uint32_t count) {
    if (count > 512) {
        throw std::runtime_error("Readback oracle capped at 512");
    }
    std::vector<Value> result(count);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(count * sizeof(Value)), result.data());
    return result;
}
} // namespace water3
