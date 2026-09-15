#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include "gl_api.hpp"
#include "particle_math.hpp"

#include <array>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <limits>
#include <sstream>
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
    gl.GetInteger64v(
        GL_MAX_SHADER_STORAGE_BLOCK_SIZE,
        &limits.maximumShaderStorageBlockBytes
    );
    return limits;
}
#endif

#if LAB_CHECKPOINT >= 4
inline bool readTextFile(
    const std::filesystem::path& path,
    std::string& source,
    std::string& diagnostics
) {
    std::ifstream input(path, std::ios::binary);
    if (!input) {
        diagnostics = "Cannot open shader: " + path.string();
        return false;
    }
    std::ostringstream stream{};
    stream << input.rdbuf();
    source = stream.str();
    if (source.empty()) {
        diagnostics = "Shader is empty: " + path.string();
        return false;
    }
    return true;
}

inline GLuint compileShader(
    GlApi& gl,
    GLenum stage,
    const std::filesystem::path& path,
    std::string& diagnostics
) {
    std::string source{};
    if (!readTextFile(path, source, diagnostics)) {
        return 0U;
    }

    const GLuint shader = gl.CreateShader(stage);
    const char* sourcePointer = source.c_str();
    gl.ShaderSource(shader, 1, &sourcePointer, nullptr);
    gl.CompileShader(shader);

    GLint compiled = GL_FALSE;
    gl.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }

    GLint logLength = 0;
    gl.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
    std::string log(static_cast<std::size_t>(std::max(1, logLength)), '\0');
    gl.GetShaderInfoLog(shader, logLength, nullptr, log.data());
    diagnostics = path.string() + ":\n" + log;
    gl.DeleteShader(shader);
    return 0U;
}

inline GLuint buildProgram(
    GlApi& gl,
    const std::vector<std::pair<GLenum, std::filesystem::path>>& stages,
    std::string& diagnostics
) {
    std::vector<GLuint> shaders{};
    for (const auto& [stage, path] : stages) {
        const GLuint shader = compileShader(gl, stage, path, diagnostics);
        if (shader == 0U) {
            for (const GLuint existing : shaders) {
                gl.DeleteShader(existing);
            }
            return 0U;
        }
        shaders.push_back(shader);
    }

    const GLuint program = gl.CreateProgram();
    for (const GLuint shader : shaders) {
        gl.AttachShader(program, shader);
    }
    gl.LinkProgram(program);

    GLint linked = GL_FALSE;
    gl.GetProgramiv(program, GL_LINK_STATUS, &linked);
    for (const GLuint shader : shaders) {
        gl.DeleteShader(shader);
    }
    if (linked == GL_TRUE) {
        return program;
    }

    GLint logLength = 0;
    gl.GetProgramiv(program, GL_INFO_LOG_LENGTH, &logLength);
    std::string log(static_cast<std::size_t>(std::max(1, logLength)), '\0');
    gl.GetProgramInfoLog(program, logLength, nullptr, log.data());
    diagnostics = "Program link failed:\n" + log;
    gl.DeleteProgram(program);
    return 0U;
}
#endif

#if LAB_CHECKPOINT >= 8
class TimerQueryRing {
    public:
    static constexpr std::size_t kSlotCount = 4U;
    static constexpr std::size_t kSampleLimit = 60U;

    void initialize(GlApi& gl) {
        gl.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    bool begin(GlApi& gl) {
        if (pending_[cursor_]) {
            return false;
        }
        gl.BeginQuery(GL_TIME_ELAPSED, queries_[cursor_]);
        activeSlot_ = cursor_;
        active_ = true;
        return true;
    }

    void end(GlApi& gl) {
        if (!active_) {
            return;
        }
        gl.EndQuery(GL_TIME_ELAPSED);
        pending_[activeSlot_] = true;
        cursor_ = (activeSlot_ + 1U) % kSlotCount;
        active_ = false;
    }

    void poll(GlApi& gl) {
        for (std::size_t slot = 0; slot < kSlotCount; ++slot) {
            if (!pending_[slot]) {
                continue;
            }
            GLint available = GL_FALSE;
            gl.GetQueryObjectiv(queries_[slot], GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE) {
                continue;
            }
            GLuint64 nanoseconds = 0U;
            gl.GetQueryObjectui64v(queries_[slot], GL_QUERY_RESULT, &nanoseconds);
            samples_.push_back(static_cast<double>(nanoseconds) / 1'000'000.0);
            if (samples_.size() > kSampleLimit) {
                samples_.erase(samples_.begin());
            }
            pending_[slot] = false;
        }
    }

    double median() const {
        return medianMilliseconds(samples_);
    }

    std::size_t pendingCount() const {
        std::size_t count = 0U;
        for (const bool pending : pending_) {
            if (pending) {
                ++count;
            }
        }
        return count;
    }

    void destroy(GlApi& gl) {
        if (queries_[0] != 0U) {
            gl.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        }
        queries_.fill(0U);
        pending_.fill(false);
        samples_.clear();
        active_ = false;
        cursor_ = 0U;
        activeSlot_ = 0U;
    }

    private:
    std::array<GLuint, kSlotCount> queries_{};
    std::array<bool, kSlotCount> pending_{};
    std::vector<double> samples_{};
    std::size_t cursor_{};
    std::size_t activeSlot_{};
    bool active_{};
};
#endif

#if LAB_CHECKPOINT >= 3
class ParticleGpuEngine {
    public:
    bool initialize(
        GlApi& gl,
        const std::filesystem::path& shaderDirectory,
        const std::vector<Particle>& particles,
        std::string& diagnostics
    ) {
        destroy(gl);
        shaderDirectory_ = shaderDirectory;

#if LAB_CHECKPOINT >= 4
        computeProgram_ = buildProgram(
            gl,
            {{GL_COMPUTE_SHADER, shaderDirectory_ / "particle_update.comp"}},
            diagnostics
        );
        if (computeProgram_ == 0U) {
            return false;
        }
        computeParticleCountLocation_ = gl.GetUniformLocation(computeProgram_, "uParticleCount");
        computeDtLocation_ = gl.GetUniformLocation(computeProgram_, "uDt");
        computeGravityLocation_ = gl.GetUniformLocation(computeProgram_, "uGravity");
        computeSpawnEpochLocation_ = gl.GetUniformLocation(computeProgram_, "uSpawnEpoch");
        if (computeParticleCountLocation_ < 0 ||
            computeDtLocation_ < 0 ||
            computeGravityLocation_ < 0 ||
            computeSpawnEpochLocation_ < 0) {
            diagnostics = "Compute program is missing a required uniform.";
            destroy(gl);
            return false;
        }
#endif

#if LAB_CHECKPOINT >= 5
        renderProgram_ = buildProgram(
            gl,
            {
                {GL_VERTEX_SHADER, shaderDirectory_ / "particle.vert"},
                {GL_FRAGMENT_SHADER, shaderDirectory_ / "particle.frag"},
            },
            diagnostics
        );
        if (renderProgram_ == 0U) {
            destroy(gl);
            return false;
        }
        renderParticleCountLocation_ = gl.GetUniformLocation(renderProgram_, "uParticleCount");
        renderHalfExtentLocation_ = gl.GetUniformLocation(renderProgram_, "uHalfExtent");
        renderPointScaleLocation_ = gl.GetUniformLocation(renderProgram_, "uPointScale");
        if (renderParticleCountLocation_ < 0 ||
            renderHalfExtentLocation_ < 0 ||
            renderPointScaleLocation_ < 0) {
            diagnostics = "Render program is missing a required uniform.";
            destroy(gl);
            return false;
        }
        gl.GenVertexArrays(1, &vertexArray_);
#endif

        gl.GenBuffers(1, &particleBuffer_);
        if (!replaceParticles(gl, particles, diagnostics)) {
            destroy(gl);
            return false;
        }

#if LAB_CHECKPOINT >= 8
        computeTimer_.initialize(gl);
        drawTimer_.initialize(gl);
#endif
        return true;
    }

    bool replaceParticles(
        GlApi& gl,
        const std::vector<Particle>& particles,
        std::string& diagnostics
    ) {
        if (particleBuffer_ == 0U || particles.empty()) {
            diagnostics = "Particle upload needs a buffer and at least one particle.";
            return false;
        }
        if (particles.size() > static_cast<std::size_t>(std::numeric_limits<GLsizei>::max())) {
            diagnostics = "Particle count exceeds GLsizei draw range.";
            return false;
        }

        const std::size_t requestedCount = particles.size();
        const std::size_t bytes = particleStorageBytes(requestedCount);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, particleBuffer_);
        static_cast<void>(gl.GetError());
        gl.BufferData(
            GL_SHADER_STORAGE_BUFFER,
            static_cast<GLsizeiptr>(bytes),
            particles.data(),
            GL_DYNAMIC_DRAW
        );
        const GLenum allocationError = gl.GetError();
        if (allocationError != GL_NO_ERROR) {
            diagnostics = "glBufferData failed for the requested particle preset.";
            return false;
        }
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, particleBuffer_);
        particleCount_ = requestedCount;
        return true;
    }

#if LAB_CHECKPOINT >= 4
    bool update(
        GlApi& gl,
        float dt,
        float gravity,
        std::uint32_t spawnEpoch,
        std::string& diagnostics
    ) {
        if (computeProgram_ == 0U || particleBuffer_ == 0U || particleCount_ == 0U) {
            diagnostics = "Particle update called before engine initialization.";
            return false;
        }
        if (!(dt > 0.0F) || !std::isfinite(dt)) {
            return true;
        }

        dispatchUpdate(gl, particleCount_, dt, gravity, spawnEpoch, true);
#if LAB_CHECKPOINT >= 6
        // Consumer kế tiếp là vertex shader đọc lại cùng shader storage block.
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
#endif
        return true;
    }

    void dispatchUpdate(
        GlApi& gl,
        std::size_t count,
        float dt,
        float gravity,
        std::uint32_t spawnEpoch,
        bool recordTiming
    ) {
        const DispatchPlan plan = makeDispatchPlan(count);
        gl.UseProgram(computeProgram_);
        gl.Uniform1i(computeParticleCountLocation_, static_cast<GLint>(count));
        gl.Uniform1f(computeDtLocation_, dt);
        gl.Uniform1f(computeGravityLocation_, gravity);
        gl.Uniform1ui(computeSpawnEpochLocation_, spawnEpoch);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, particleBuffer_);
#if LAB_CHECKPOINT >= 8
        bool timingStarted = false;
        if (recordTiming) {
            timingStarted = computeTimer_.begin(gl);
        }
#else
        static_cast<void>(recordTiming);
#endif
        gl.DispatchCompute(static_cast<GLuint>(plan.workgroupCount), 1U, 1U);
#if LAB_CHECKPOINT >= 8
        if (timingStarted) {
            computeTimer_.end(gl);
        }
#endif
    }
#endif

#if LAB_CHECKPOINT >= 5
    void render(GlApi& gl, int width, int height, float pointScale) {
        gl.Viewport(0, 0, width, height);
        gl.ClearColor(0.015F, 0.026F, 0.065F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);

        float aspect = 1.0F;
        if (height > 0) {
            aspect = static_cast<float>(width) / static_cast<float>(height);
        }
        const float halfHeight = 6.5F;
        const float halfWidth = halfHeight * aspect;

        gl.UseProgram(renderProgram_);
        gl.Uniform1i(renderParticleCountLocation_, static_cast<GLint>(particleCount_));
        gl.Uniform2f(renderHalfExtentLocation_, halfWidth, halfHeight);
        gl.Uniform1f(renderPointScaleLocation_, pointScale);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, particleBuffer_);
        gl.BindVertexArray(vertexArray_);
        gl.Enable(GL_PROGRAM_POINT_SIZE);
        gl.Enable(GL_BLEND);
        gl.BlendFunc(GL_SRC_ALPHA, GL_ONE);
#if LAB_CHECKPOINT >= 8
        const bool timingStarted = drawTimer_.begin(gl);
#endif
        gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(particleCount_));
#if LAB_CHECKPOINT >= 8
        if (timingStarted) {
            drawTimer_.end(gl);
        }
#endif
        gl.Disable(GL_BLEND);
        gl.BindVertexArray(0U);
    }
#endif

#if LAB_CHECKPOINT >= 8
    void pollTimers(GlApi& gl) {
        computeTimer_.poll(gl);
        drawTimer_.poll(gl);
    }

    double computeMedianMilliseconds() const {
        return computeTimer_.median();
    }

    double drawMedianMilliseconds() const {
        return drawTimer_.median();
    }

    std::size_t pendingTimingQueries() const {
        return computeTimer_.pendingCount() + drawTimer_.pendingCount();
    }
#endif

#if LAB_CHECKPOINT >= 9
    ParticleValidationReport runProbeValidation(GlApi& gl, std::string& diagnostics) {
        constexpr std::size_t probeCount = 64U;
        constexpr float probeDt = kSingleStepDt;
        constexpr std::uint32_t probeEpoch = 17U;

        std::vector<Particle> input = makeInitialParticles(probeCount, kParticleSeed);
        std::vector<Particle> expected = input;
        for (std::size_t index = 0; index < probeCount; ++index) {
            expected[index] = stepParticleCpu(
                expected[index],
                index,
                probeDt,
                kGravity,
                probeEpoch,
                kParticleSeed
            );
        }

        GLuint probeBuffer = 0U;
        gl.GenBuffers(1, &probeBuffer);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, probeBuffer);
        gl.BufferData(
            GL_SHADER_STORAGE_BUFFER,
            static_cast<GLsizeiptr>(particleStorageBytes(probeCount)),
            input.data(),
            GL_DYNAMIC_DRAW
        );
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, probeBuffer);

        const GLuint mainBuffer = particleBuffer_;
        particleBuffer_ = probeBuffer;
        dispatchUpdate(gl, probeCount, probeDt, kGravity, probeEpoch, false);
        particleBuffer_ = mainBuffer;

        // Probe consumer là glGetBufferSubData, nên bit khác main render path.
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        std::vector<Particle> actual(probeCount);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, probeBuffer);
        gl.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            0,
            static_cast<GLsizeiptr>(particleStorageBytes(probeCount)),
            actual.data()
        );
        gl.DeleteBuffers(1, &probeBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, particleBuffer_);

        const ParticleValidationReport report = validateParticles(expected, actual);
        if (!report.passed()) {
            diagnostics = "GPU probe validation failed.";
        } else {
            diagnostics = "GPU probe validation passed.";
        }
        return report;
    }
#endif

    std::size_t particleCount() const {
        return particleCount_;
    }

    void destroy(GlApi& gl) {
#if LAB_CHECKPOINT >= 8
        computeTimer_.destroy(gl);
        drawTimer_.destroy(gl);
#endif
#if LAB_CHECKPOINT >= 5
        if (vertexArray_ != 0U) {
            gl.DeleteVertexArrays(1, &vertexArray_);
            vertexArray_ = 0U;
        }
#endif
        if (particleBuffer_ != 0U) {
            gl.DeleteBuffers(1, &particleBuffer_);
            particleBuffer_ = 0U;
        }
#if LAB_CHECKPOINT >= 5
        if (renderProgram_ != 0U) {
            gl.DeleteProgram(renderProgram_);
            renderProgram_ = 0U;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (computeProgram_ != 0U) {
            gl.DeleteProgram(computeProgram_);
            computeProgram_ = 0U;
        }
#endif
        particleCount_ = 0U;
    }

    private:
    std::filesystem::path shaderDirectory_{};
    GLuint particleBuffer_{};
    std::size_t particleCount_{};

#if LAB_CHECKPOINT >= 4
    GLuint computeProgram_{};
    GLint computeParticleCountLocation_{-1};
    GLint computeDtLocation_{-1};
    GLint computeGravityLocation_{-1};
    GLint computeSpawnEpochLocation_{-1};
#endif

#if LAB_CHECKPOINT >= 5
    GLuint renderProgram_{};
    GLuint vertexArray_{};
    GLint renderParticleCountLocation_{-1};
    GLint renderHalfExtentLocation_{-1};
    GLint renderPointScaleLocation_{-1};
#endif

#if LAB_CHECKPOINT >= 8
    TimerQueryRing computeTimer_{};
    TimerQueryRing drawTimer_{};
#endif
};
#endif

} // namespace lab
