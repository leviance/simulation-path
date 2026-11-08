#pragma once
#include "cloth_program.hpp"

#include <cstdint>
#include <vector>

namespace cloth {

inline GLuint groupCount(std::uint64_t count) {
    return static_cast<GLuint>((count + 255ULL) / 256ULL);
}

inline bool storageBuffer(GlApi& gl, GLuint& name, std::uint64_t bytes, const void* data, std::string& error) {
    gl.GenBuffers(1, &name);
    if (name == 0U) {
        error = "Cannot create GPU storage buffer.";
        return false;
    }
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, name);
    gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), data, GL_DYNAMIC_COPY);
    if (gl.GetError() != GL_NO_ERROR) {
        error = "GPU buffer allocation failed; previous cloth remains available.";
        gl.DeleteBuffers(1, &name);
        name = 0U;
        return false;
    }
    return true;
}

struct ScanLevel {
    std::uint32_t count{};
    GLuint output{};
    GLuint sums{};
};

// Same counts -> exclusive offsets primitive as Project 39, now consumed by a 3D CSR grid.
class GpuScan {
    GlApi& gl_;
    std::vector<ScanLevel> levels_{};

    public:
    explicit GpuScan(GlApi& gl)
        : gl_(gl) {}

    GpuScan(const GpuScan&) = delete;
    GpuScan& operator=(const GpuScan&) = delete;

    ~GpuScan() {
        clear();
    }

    void clear() {
        for (std::size_t index = 0U; index < levels_.size(); ++index) {
            if (index != 0U) {
                gl_.DeleteBuffers(1, &levels_[index].output);
            }
            gl_.DeleteBuffers(1, &levels_[index].sums);
        }
        levels_.clear();
    }

    bool allocate(std::uint32_t count, GLuint output, std::string& error) {
        clear();
        bool first = true;
        while (count != 0U) {
            ScanLevel level{};
            level.count = count;
            level.output = output;
            if (!first && !storageBuffer(gl_, level.output, 4ULL * count, nullptr, error)) {
                return false;
            }
            const std::uint32_t groups = groupCount(count);
            if (!storageBuffer(gl_, level.sums, 4ULL * groups, nullptr, error)) {
                if (!first) {
                    gl_.DeleteBuffers(1, &level.output);
                }
                return false;
            }
            levels_.push_back(level);
            if (groups == 1U) {
                break;
            }
            count = groups;
            first = false;
        }
        return true;
    }

    void run(GLuint input, GLuint scanProgram, GLuint addProgram) {
        GLuint source = input;
        for (const auto& level : levels_) {
            gl_.UseProgram(scanProgram);
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, source);
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, level.output);
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, level.sums);
            gl_.Uniform1ui(gl_.GetUniformLocation(scanProgram, "uCount"), level.count);
            gl_.DispatchCompute(groupCount(level.count), 1U, 1U);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
            source = level.sums;
        }
        for (std::size_t index = levels_.size(); index > 1U; --index) {
            const auto& level = levels_[index - 2U];
            const auto& parent = levels_[index - 1U];
            gl_.UseProgram(addProgram);
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, level.output);
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, parent.output);
            gl_.Uniform1ui(gl_.GetUniformLocation(addProgram, "uCount"), level.count);
            gl_.DispatchCompute(groupCount(level.count), 1U, 1U);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        }
    }
};

} // namespace cloth
