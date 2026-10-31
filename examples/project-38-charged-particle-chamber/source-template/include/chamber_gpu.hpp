#pragma once
#include "chamber_math.hpp"
#include "chamber_program.hpp"
#include "chamber_reference.hpp"

#if LAB_CHECKPOINT >= 6
namespace chamber {

inline ComputeLimits queryLimits(GlApi& gl) {
    ComputeLimits limits{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &limits.major);
    gl.GetIntegerv(GL_MINOR_VERSION, &limits.minor);
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &limits.maximumBlockBytes);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &limits.maximumGroupsX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &limits.maximumLocalX);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.maximumInvocations);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &limits.storageBindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &limits.computeStorageBlocks);
    return limits;
}

struct GpuState {
    GLuint buffer{};
    Settings settings{};
    Budget budget{};
    std::uint64_t tick{};
    std::uint64_t generation{};

    double time() const {
        return static_cast<double>(tick) * static_cast<double>(settings.dt);
    }

    void destroy(GlApi& gl) {
        if (buffer != 0)
            gl.DeleteBuffers(1, &buffer);
        buffer = 0;
    }
};

struct ComputePipeline {
    ComputeLimits limits{};
    GLuint initializeProgram{};
    GLuint updateProgram{};
    GLuint probeProgram{};

    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        limits = queryLimits(gl);
        initializeProgram = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / "particle_init.comp"}}, error);
        if (initializeProgram == 0)
            return false;
#if LAB_CHECKPOINT >= 7
        updateProgram = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / "particle_update.comp"}}, error);
        if (updateProgram == 0)
            return false;
#endif
#if LAB_CHECKPOINT >= 9
        probeProgram = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / "particle_probe.comp"}}, error);
        if (probeProgram == 0)
            return false;
#endif
        return true;
    }

    bool createState(GlApi& gl, const Settings& settings, std::uint64_t generation, GpuState& destination, std::string& error) const {
        Budget budget{};
        if (!makeBudget(settings, limits, budget, error))
            return false;
        // A candidate is a separate allocation. A failed request cannot replace the current SSBO.
        GpuState candidate{};
        candidate.settings = settings;
        candidate.budget = budget;
        candidate.generation = generation;
        for (int attempt = 0; attempt < 16; ++attempt) {
            if (gl.GetError() == GL_NO_ERROR)
                break;
        }
        gl.GenBuffers(1, &candidate.buffer);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, candidate.buffer);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(budget.stateBytes), nullptr, GL_DYNAMIC_COPY);
        GLint64 allocated = 0;
        gl.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &allocated);
        if (candidate.buffer == 0 || gl.GetError() != GL_NO_ERROR || allocated != static_cast<GLint64>(budget.stateBytes)) {
            candidate.destroy(gl);
            error = "GPU allocation failed; previous state kept";
            return false;
        }
        gl.UseProgram(initializeProgram);
        gl.Uniform1ui(gl.GetUniformLocation(initializeProgram, "uCount"), static_cast<GLuint>(settings.count));
        gl.Uniform1ui(gl.GetUniformLocation(initializeProgram, "uSeed"), settings.seed);
        gl.Uniform3f(gl.GetUniformLocation(initializeProgram, "uInitialVelocity"), settings.initialVelocity.x, settings.initialVelocity.y, settings.initialVelocity.z);
        gl.Uniform3f(gl.GetUniformLocation(initializeProgram, "uMagnetic"), settings.fields.magnetic.x, settings.fields.magnetic.y, settings.fields.magnetic.z);
        gl.Uniform1f(gl.GetUniformLocation(initializeProgram, "uChargeScale"), settings.fields.chargeScale);
        gl.Uniform1f(gl.GetUniformLocation(initializeProgram, "uPhaseSpan"), preparedPhaseSpan(settings));
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, candidate.buffer);
        gl.DispatchCompute(budget.groups, 1, 1);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        if (gl.GetError() != GL_NO_ERROR) {
            candidate.destroy(gl);
            error = "GPU initialization failed; previous state kept";
            return false;
        }
        destination = candidate;
        return true;
    }

#if LAB_CHECKPOINT >= 7
    void step(GlApi& gl, GpuState& state, int steps) const {
        if (state.buffer == 0 || steps < 1 || steps > 512)
            return;
        const Settings& settings = state.settings;
        gl.UseProgram(updateProgram);
        gl.Uniform1ui(gl.GetUniformLocation(updateProgram, "uCount"), static_cast<GLuint>(settings.count));
        gl.Uniform1f(gl.GetUniformLocation(updateProgram, "uDt"), settings.dt);
        gl.Uniform1f(gl.GetUniformLocation(updateProgram, "uChargeScale"), settings.fields.chargeScale);
        gl.Uniform3f(gl.GetUniformLocation(updateProgram, "uElectric"), settings.fields.electric.x, settings.fields.electric.y, settings.fields.electric.z);
        gl.Uniform3f(gl.GetUniformLocation(updateProgram, "uMagnetic"), settings.fields.magnetic.x, settings.fields.magnetic.y, settings.fields.magnetic.z);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, state.buffer);
        for (int stepIndex = 0; stepIndex < steps; ++stepIndex) {
            gl.DispatchCompute(state.budget.groups, 1, 1);
            // The next consumer is another compute step or a vertex shader reading an SSBO.
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
            ++state.tick;
        }
    }
#endif

    void destroy(GlApi& gl) {
        for (GLuint* program : {&initializeProgram, &updateProgram, &probeProgram}) {
            if (*program != 0)
                gl.DeleteProgram(*program);
            *program = 0;
        }
    }
};

struct PendingReset {
    GpuState candidate{};
    GLsync fence{};
    Uint64 deadline{};

    bool busy() const {
        return fence != nullptr;
    }

    void cancel(GlApi& gl) {
        if (fence)
            gl.DeleteSync(fence);
        fence = nullptr;
        candidate.destroy(gl);
    }

    bool request(GlApi& gl, const ComputePipeline& pipeline, const Settings& settings, std::uint64_t generation, std::string& error) {
        // createState itself does not mutate a live buffer. Input validation happens before allocation.
        GpuState next{};
        if (!pipeline.createState(gl, settings, generation, next, error))
            return false;
        cancel(gl);
        candidate = next;
        fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence) {
            candidate.destroy(gl);
            error = "Cannot create initialization fence";
            return false;
        }
        deadline = SDL_GetTicks() + 5000;
        gl.Flush();
        return true;
    }

    bool publishIfReady(GlApi& gl, GpuState& current, std::string& error) {
        if (!fence)
            return false;
        std::string fenceError{};
        if (fenceReady(gl, fence, fenceError)) {
            gl.DeleteSync(fence);
            fence = nullptr;
            current.destroy(gl);
            current = candidate;
            candidate.buffer = 0;
            return true;
        }
        if (!fenceError.empty() || SDL_GetTicks() > deadline) {
            error = fenceError;
            if (error.empty())
                error = "Initialization deadline reached; previous state kept";
            cancel(gl);
        }
        return false;
    }
};

} // namespace chamber
#endif
