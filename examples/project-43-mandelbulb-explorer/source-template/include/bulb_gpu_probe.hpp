#pragma once
#include "bulb_gl.hpp"
#include "bulb_settings.hpp"
#include <chrono>
#include <cstring>
#include <span>
#include <vector>

namespace bulb {

#if LAB_CHECKPOINT >= 6
// Executes the SAME evaluate()/sphericalPower() GLSL used by the image renderer.
// Only the output adapter differs. N=19 deliberately leaves most lanes inactive.
class GpuFieldProbe {
    public:
    explicit GpuFieldProbe(GlApi& gl)
        : gl_(gl), program_(gl, "bulb.comp") {
        gl_.GenBuffers(2, buffers_.data());
        if (!buffers_[0] || !buffers_[1]) {
            gl_.DeleteBuffers(2, buffers_.data());
            throw std::runtime_error("Could not allocate bounded probe buffers");
        }
    }

    ~GpuFieldProbe() {
        if (fence_)
            gl_.DeleteSync(fence_);
        gl_.DeleteBuffers(2, buffers_.data());
    }

    GpuFieldProbe(const GpuFieldProbe&) = delete;
    GpuFieldProbe& operator=(const GpuFieldProbe&) = delete;

    std::vector<Pixel> run(std::span<const Float4> points, Settings settings) {
        validate(settings);
        if (points.empty() || points.size() > 64 || fence_)
            throw std::invalid_argument("Probe count must be 1..64 and no batch may overlap");
        const Pixel sentinel{{-31, -47, -59, -71}, {127, 251, 509, 1021}, {-83, -97, -109, -113}};
        std::vector<Pixel> result(points.size() + 1, sentinel);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[0]);
        gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(result.size() * sizeof(Pixel)), result.data(), GL_DYNAMIC_DRAW);
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, buffers_[0]);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[1]);
        gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(points.size_bytes()), points.data(), GL_DYNAMIC_DRAW);
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 3, buffers_[1]);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Probe SSBO allocation failed");

        program_.use();
        gl_.Uniform1i(program_.uniform("validationMode"), 1);
        gl_.Uniform1ui(program_.uniform("probeCount"), static_cast<GLuint>(points.size()));
        gl_.Uniform1i(program_.uniform("power"), settings.power);
        gl_.Uniform1i(program_.uniform("iterationLimit"), settings.iterations);
        gl_.Uniform1f(program_.uniform("bailout"), static_cast<float>(settings.bailout));
        gl_.DispatchCompute(1, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence_)
            throw std::runtime_error("Could not fence finite probe batch");
        gl_.Flush();
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(3);
        for (;;) {
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE))
                    throw std::runtime_error("GPU verification cancelled");
            }
            const GLenum status = gl_.ClientWaitSync(fence_, 0, 0);
            if (status == GL_ALREADY_SIGNALED || status == GL_CONDITION_SATISFIED)
                break;
            if (status == GL_WAIT_FAILED || std::chrono::steady_clock::now() > deadline)
                throw std::runtime_error("Probe failed or exceeded three-second deadline");
            SDL_Delay(1);
        }
        gl_.DeleteSync(fence_);
        fence_ = nullptr;
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[0]);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(result.size() * sizeof(Pixel)), result.data());
        if (gl_.GetError() != GL_NO_ERROR || std::memcmp(&result.back(), &sentinel, sizeof(Pixel)) != 0)
            throw std::runtime_error("Probe readback failed or inactive lanes overwrote the canary");
        result.pop_back();
        return result;
    }

    private:
    GlApi& gl_;
    Program program_;
    std::array<GLuint, 2> buffers_{};
    GLsync fence_{};
};
#endif

} // namespace bulb
