#pragma once

#include "cloth_camera.hpp"
#include "cloth_program.hpp"

#include <array>
#include <chrono>
#include <filesystem>

namespace cloth {

struct alignas(16) PickResult {
    Vec4 position{};
    std::array<std::uint32_t, 4> key{noVertex, noVertex, noVertex, noVertex};

    bool valid() const {
        return key[0] != noVertex;
    }
};

static_assert(sizeof(PickResult) == 32U);

class GpuPicker {
    GLuint program_{};
    std::array<GLuint, 2> buffers_{};
    GLuint resultBuffer_{};
    GLsync fence_{};
    std::chrono::steady_clock::time_point requested_{};

    public:
    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        program_ = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / "cloth_pick.comp"}}, error);
        if (program_ == 0U) {
            return false;
        }
        gl.GenBuffers(2, buffers_.data());
        for (GLuint buffer : buffers_) {
            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
            gl.BufferData(GL_SHADER_STORAGE_BUFFER, 4096U * sizeof(PickResult), nullptr, GL_DYNAMIC_COPY);
        }
        return gl.GetError() == GL_NO_ERROR;
    }

    void cancel(GlApi& gl) {
        if (fence_ != nullptr) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
    }

    bool busy() const {
        return fence_ != nullptr;
    }

    void request(GlApi& gl, GLuint positions, std::uint32_t count, const Camera& camera, int width, int height, float x, float y, std::uint32_t probe = noVertex) {
        cancel(gl);
        const Mat4 matrix = camera.viewProjection(static_cast<float>(width) / std::max(height, 1));
        gl.UseProgram(program_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(program_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.Uniform2f(gl.GetUniformLocation(program_, "uClick"), x, y);
        gl.Uniform2f(gl.GetUniformLocation(program_, "uViewport"), static_cast<float>(width), static_cast<float>(height));
        gl.Uniform1ui(gl.GetUniformLocation(program_, "uProbe"), probe);
        gl.Uniform1ui(gl.GetUniformLocation(program_, "uPhase"), 0U);
        gl.Uniform1ui(gl.GetUniformLocation(program_, "uCount"), count);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, positions);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, buffers_[0]);
        std::uint32_t groups = (count + 255U) / 256U;
        gl.DispatchCompute(groups, 1, 1);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        unsigned input = 0U;
        while (groups > 1U) {
            const unsigned output = 1U - input;
            gl.Uniform1ui(gl.GetUniformLocation(program_, "uPhase"), 1U);
            gl.Uniform1ui(gl.GetUniformLocation(program_, "uCount"), groups);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, buffers_[input]);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, buffers_[output]);
            groups = (groups + 255U) / 256U;
            gl.DispatchCompute(groups, 1, 1);
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
            input = output;
        }
        resultBuffer_ = buffers_[input];
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.Flush();
        requested_ = std::chrono::steady_clock::now();
    }

    bool poll(GlApi& gl, PickResult& output, std::string& error) {
        if (fence_ == nullptr) {
            return false;
        }
        if (!fenceReady(gl, fence_, error)) {
            if (std::chrono::steady_clock::now() - requested_ > std::chrono::seconds(5)) {
                cancel(gl);
                error = "GPU picking exceeded its five-second deadline";
            }
            return false;
        }
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, resultBuffer_);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(PickResult), &output);
        cancel(gl);
        return true;
    }

    void destroy(GlApi& gl) {
        cancel(gl);
        gl.DeleteBuffers(2, buffers_.data());
        if (program_ != 0U) {
            gl.DeleteProgram(program_);
        }
    }
};

} // namespace cloth
