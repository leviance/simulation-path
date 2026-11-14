#pragma once

#include "sculpt_gl.hpp"
#include "sculpt_limits.hpp"
#include <memory>
#include <span>

namespace sculpt {

struct GpuBudget {
    std::size_t used{};
    std::size_t limit{gpuByteBudget};
    std::size_t peakReserved{};

    void reserve(std::size_t bytes) {
        if (limit > gpuByteBudget || bytes == 0 || bytes > limit || used > limit - bytes)
            throw std::runtime_error("GPU allocation exceeds the configured byte budget; keep last-good");
        used += bytes;
        peakReserved = std::max(peakReserved, used);
    }

    void release(std::size_t bytes) {
        used -= bytes;
    }
};

class GpuBuffer {
    public:
    GpuBuffer(GlApi& gl, GpuBudget& budget, std::size_t bytes)
        : gl_(gl), budget_(budget), bytes_(bytes) {
        budget_.reserve(bytes);
        try {
            gl_.GenBuffers(1, &id_);
            if (!id_)
                throw std::runtime_error("Could not create a GPU buffer");
            gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
            gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), nullptr, GL_DYNAMIC_DRAW);
            GLint64 actual{};
            gl_.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &actual);
            if (gl_.GetError() != GL_NO_ERROR || actual != static_cast<GLint64>(bytes))
                throw std::runtime_error("GPU buffer allocation failed or returned the wrong byte size");
        } catch (...) {
            if (id_)
                gl_.DeleteBuffers(1, &id_);
            budget_.release(bytes_);
            throw;
        }
    }

    ~GpuBuffer() {
        gl_.DeleteBuffers(1, &id_);
        budget_.release(bytes_);
    }

    GpuBuffer(const GpuBuffer&) = delete;
    GpuBuffer& operator=(const GpuBuffer&) = delete;

    GLuint id() const {
        return id_;
    }

    std::size_t bytes() const {
        return bytes_;
    }

    void bind(GLuint binding) const {
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, id_);
    }

    void write(std::size_t offset, std::span<const std::byte> data) {
        if (offset > bytes_ || data.size() > bytes_ - offset)
            throw std::out_of_range("GPU write is outside its allocated buffer");
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(data.size()), data.data());
    }

    void read(std::size_t offset, std::span<std::byte> data) const {
        if (offset > bytes_ || data.size() > bytes_ - offset)
            throw std::out_of_range("GPU read is outside its allocated buffer");
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(data.size()), data.data());
    }

    void setGuard(std::size_t payloadBytes) {
        std::array<std::uint32_t, guardBytes / 4> guard;
        guard.fill(canaryWord);
        write(payloadBytes, std::as_bytes(std::span(guard)));
    }

    bool guardIntact(std::size_t payloadBytes) const {
        std::array<std::uint32_t, guardBytes / 4> guard{};
        read(payloadBytes, std::as_writable_bytes(std::span(guard)));
        return std::all_of(guard.begin(), guard.end(), [](auto word) {
            return word == canaryWord;
        });
    }

    private:
    GlApi& gl_;
    GpuBudget& budget_;
    GLuint id_{};
    std::size_t bytes_{};
};

struct GpuFieldSeed {
    std::shared_ptr<const GpuBuffer> buffer;
    GridSpec grid;
};

inline void preflightSculpt(GlApi& gl, const ModelSettings& settings) {
    settings.validate();
    GLint major{}, minor{}, bindings{}, blocks{}, fragmentBlocks{}, localSize{}, invocations{}, groupCount{};
    GLint64 maximumBlock{}, sharedBytes{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &major);
    gl.GetIntegerv(GL_MINOR_VERSION, &minor);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &blocks);
    gl.GetIntegerv(GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS, &fragmentBlocks);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &localSize);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groupCount);
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &maximumBlock);
    gl.GetInteger64v(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &sharedBytes);
    const auto countBytes = chunkCount(settings.grid) * cellsPerChunk * sizeof(std::uint32_t) + guardBytes;
    if (major < 4 || (major == 4 && minor < 3) || bindings < 8 || blocks < 6 || fragmentBlocks < 1 || localSize < 256 || invocations < 256 || groupCount < 576 || maximumBlock < static_cast<GLint64>(countBytes) || sharedBytes < 2048)
        throw std::runtime_error("Sculpt requires OpenGL 4.3, eight SSBO bindings, 256-thread groups and bounded scan storage");
}

} // namespace sculpt
