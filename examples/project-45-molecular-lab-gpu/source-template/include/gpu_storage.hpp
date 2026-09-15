#pragma once

#include "gl_api.hpp"
#include "molecular_math.hpp"

#include <array>
#include <stdexcept>
#include <utility>

namespace molecular {

inline Limits queryLimits(lab::GlApi& gl) {
    Limits limits{};
    GLint64 bytes = 0;
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &bytes);
    limits.maximumBlockBytes = static_cast<std::uint64_t>(bytes);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &limits.storageBindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &limits.computeBlocks);
    gl.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &limits.vertexBlocks);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.invocations);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &limits.groupSizeX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &limits.groupCountX);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &limits.sharedBytes);
    return limits;
}

inline GLuint allocateBuffer(lab::GlApi& gl, std::uint64_t bytes) {
    GLuint buffer = 0;
    gl.GenBuffers(1, &buffer);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
    gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), nullptr, GL_DYNAMIC_COPY);
    if (buffer == 0 || gl.GetError() != GL_NO_ERROR) {
        gl.DeleteBuffers(1, &buffer);
        throw std::runtime_error("GPU allocation failed; reduce the particle count.");
    }
    return buffer;
}

struct Bank {
    GLuint positions = 0;
    GLuint velocities = 0;
    GLuint forces = 0;
};

struct Control {
    std::uint32_t flags = 0;
    std::uint32_t maxDisplacementBits = 0;
    std::uint32_t maxOccupancy = 0;
    std::uint32_t reserved = 0;
};

static_assert(sizeof(Control) == 16);

// Storage không tự gọi GL trong destructor: phải giải phóng trước SDL_GL_DestroyContext.
struct Storage {
    std::array<Bank, 2> banks{};
    GLuint referencePositions = 0;
    GLuint counts = 0;
    GLuint indices = 0;
    GLuint control = 0;
    std::array<GLuint, 2> scratch{};
    Plan plan{};

    void destroy(lab::GlApi& gl) {
        for (const auto& bank : banks) {
            const GLuint buffers[] = {bank.positions, bank.velocities, bank.forces};
            gl.DeleteBuffers(3, buffers);
        }
        const GLuint buffers[] = {referencePositions, counts, indices, control, scratch[0], scratch[1]};
        gl.DeleteBuffers(6, buffers);
        *this = {};
    }

    void allocate(lab::GlApi& gl, const Plan& requested) {
        plan = requested;
        try {
            for (auto& bank : banks) {
                bank.positions = allocateBuffer(gl, plan.particleBytes);
                bank.velocities = allocateBuffer(gl, plan.particleBytes);
                bank.forces = allocateBuffer(gl, plan.particleBytes);
            }
            referencePositions = allocateBuffer(gl, plan.particleBytes);
            counts = allocateBuffer(gl, 4ULL * plan.cells);
            indices = allocateBuffer(gl, plan.indexBytes);
            control = allocateBuffer(gl, sizeof(Control));
            for (auto& buffer : scratch) {
                buffer = allocateBuffer(gl, plan.reductionBytes);
            }
        } catch (...) {
            destroy(gl);
            throw;
        }
    }
};

inline void bind(lab::GlApi& gl, GLuint index, GLuint buffer) {
    gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, index, buffer);
}

template <typename Value>
inline Value readSmall(lab::GlApi& gl, GLuint buffer) {
    Value value{};
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(Value), &value);
    return value;
}

inline void resetControl(lab::GlApi& gl, GLuint buffer) {
    const Control control{};
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
    gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(Control), &control);
}

} // namespace molecular
