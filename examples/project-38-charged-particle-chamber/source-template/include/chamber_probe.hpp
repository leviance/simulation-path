#pragma once
#include "chamber_gpu.hpp"

#if LAB_CHECKPOINT >= 9
namespace chamber {

struct ProbeSnapshot {
    std::array<Particle, kProbeCount> particles{};
    std::size_t count{};
    std::uint32_t selected{};
    std::uint64_t generation{};
    std::uint64_t tick{};
    double time{};
};

class ProbeReader {
    GLuint buffer_{};
    GLsync fence_{};
    Uint64 deadline_{};
    ProbeSnapshot capture_{};

    public:
    bool initialize(GlApi& gl) {
        gl.GenBuffers(1, &buffer_);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer_);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, sizeof(capture_.particles), nullptr, GL_DYNAMIC_READ);
        return buffer_ != 0 && gl.GetError() == GL_NO_ERROR;
    }

    void cancel(GlApi& gl) {
        if (fence_)
            gl.DeleteSync(fence_);
        fence_ = nullptr;
    }

    void request(GlApi& gl, const ComputePipeline& pipeline, const GpuState& state, std::uint32_t selected) {
        if (fence_ || buffer_ == 0 || state.buffer == 0)
            return;
        capture_.count = state.settings.count;
        capture_.selected = std::min(selected, static_cast<std::uint32_t>(state.settings.count - 1U));
        capture_.generation = state.generation;
        capture_.tick = state.tick;
        capture_.time = state.time();
        gl.UseProgram(pipeline.probeProgram);
        gl.Uniform1ui(gl.GetUniformLocation(pipeline.probeProgram, "uCount"), static_cast<GLuint>(state.settings.count));
        gl.Uniform1ui(gl.GetUniformLocation(pipeline.probeProgram, "uSelected"), capture_.selected);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, state.buffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, buffer_);
        gl.DispatchCompute(1, 1, 1);
        // This consumer is a later CPU buffer read, not a shader load.
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        deadline_ = SDL_GetTicks() + 2000;
        gl.Flush();
    }

    bool poll(GlApi& gl, ProbeSnapshot& output, std::string& error) {
        if (!fence_)
            return false;
        std::string fenceError{};
        if (fenceReady(gl, fence_, fenceError)) {
            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer_);
            gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(capture_.particles), capture_.particles.data());
            cancel(gl);
            if (gl.GetError() != GL_NO_ERROR) {
                error = "Probe read failed";
                return false;
            }
            output = capture_;
            return true;
        }
        if (!fenceError.empty() || SDL_GetTicks() > deadline_) {
            error = fenceError;
            if (error.empty())
                error = "Probe timeout; snapshot not published";
            cancel(gl);
        }
        return false;
    }

    void destroy(GlApi& gl) {
        cancel(gl);
        if (buffer_ != 0)
            gl.DeleteBuffers(1, &buffer_);
        buffer_ = 0;
    }
};

struct TrailHistory {
    std::array<std::array<Vec3, kTrailCapacity>, kTrailCount> points{};
    std::size_t head{};
    std::size_t size{};
    std::uint64_t generation{};
    std::uint64_t lastTick{std::numeric_limits<std::uint64_t>::max()};
    double lastSampleTime{-std::numeric_limits<double>::infinity()};
    std::uint32_t selected{};

    void reset() {
        head = 0;
        size = 0;
        lastTick = std::numeric_limits<std::uint64_t>::max();
        lastSampleTime = -std::numeric_limits<double>::infinity();
    }

    void append(const ProbeSnapshot& snapshot) {
        if (generation != snapshot.generation || selected != snapshot.selected)
            reset();
        generation = snapshot.generation;
        selected = snapshot.selected;
        if (lastTick == snapshot.tick)
            return;
        // History covers about 8.5 simulation seconds, not an arbitrary number of fast GPU frames.
        if (snapshot.time - lastSampleTime < 1.0 / 30.0 - 1.0e-9)
            return;
        lastTick = snapshot.tick;
        lastSampleTime = snapshot.time;
        for (std::size_t track = 0; track < kTrailCount; ++track) {
            std::size_t slot = track;
            if (track == kTrailCount - 1U)
                slot = kProbeCount - 1U;
            points[track][head] = position(snapshot.particles[slot]);
        }
        head = (head + 1U) % kTrailCapacity;
        size = std::min(size + 1U, kTrailCapacity);
    }
};

} // namespace chamber
#endif
