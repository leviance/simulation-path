#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "gl_api.hpp"
#include "vector_compute_math.hpp"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <fstream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

namespace lab {

#if LAB_CHECKPOINT >= 2

inline ComputeLimits queryComputeLimits(GlApi& api) {
    ComputeLimits limits{};
    api.GetIntegerv(GL_MAJOR_VERSION, &limits.majorVersion);
    api.GetIntegerv(GL_MINOR_VERSION, &limits.minorVersion);
    api.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.maximumInvocations);
    api.GetInteger64v(
        GL_MAX_SHADER_STORAGE_BLOCK_SIZE,
        &limits.maximumShaderStorageBlockBytes
    );
    for (GLuint axis = 0; axis < 3; ++axis) {
        api.GetIntegeri_v(
            GL_MAX_COMPUTE_WORK_GROUP_COUNT,
            axis,
            &limits.maximumWorkgroupCount[axis]
        );
        api.GetIntegeri_v(
            GL_MAX_COMPUTE_WORK_GROUP_SIZE,
            axis,
            &limits.maximumWorkgroupSize[axis]
        );
    }
    return limits;
}

#endif

inline bool readTextFile(
    const std::string& path,
    std::string& source,
    std::string& diagnostics
) {
    std::ifstream input(path, std::ios::binary);
    if (!input) {
        diagnostics = "Cannot open compute shader: " + path;
        return false;
    }
    std::ostringstream buffer{};
    buffer << input.rdbuf();
    source = buffer.str();
    if (source.empty()) {
        diagnostics = "Compute shader is empty: " + path;
        return false;
    }
    return true;
}

inline std::string shaderInfoLog(GlApi& api, GLuint shader) {
    GLint length = 0;
    api.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::string log(static_cast<std::size_t>(length), '\0');
    GLsizei written = 0;
    api.GetShaderInfoLog(shader, length, &written, log.data());
    log.resize(static_cast<std::size_t>(std::max(0, int(written))));
    return log;
}

inline std::string programInfoLog(GlApi& api, GLuint program) {
    GLint length = 0;
    api.GetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::string log(static_cast<std::size_t>(length), '\0');
    GLsizei written = 0;
    api.GetProgramInfoLog(program, length, &written, log.data());
    log.resize(static_cast<std::size_t>(std::max(0, int(written))));
    return log;
}

class VectorComputeEngine {
    public:
    bool uploadInputs(
        GlApi& api,
        const VectorInputs& inputs,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 3
        if (inputs.a.empty() || inputs.a.size() != inputs.b.size()) {
            diagnostics = "Input A/B must have the same non-zero element count.";
            return false;
        }
        if (buffers_[0] == 0) {
            api.GenBuffers(3, buffers_);
        }
        if (buffers_[0] == 0 || buffers_[1] == 0 || buffers_[2] == 0) {
            diagnostics = "glGenBuffers did not create all three SSBOs.";
            return false;
        }

        elementCount_ = inputs.a.size();
        const GLsizeiptr bytes = static_cast<GLsizeiptr>(elementCount_ * sizeof(Vec4));
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[0]);
        api.BufferData(GL_SHADER_STORAGE_BUFFER, bytes, inputs.a.data(), GL_STATIC_DRAW);
        api.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, buffers_[0]);

        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[1]);
        api.BufferData(GL_SHADER_STORAGE_BUFFER, bytes, inputs.b.data(), GL_STATIC_DRAW);
        api.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, buffers_[1]);

        const float sentinel = std::numeric_limits<float>::quiet_NaN();
        const std::vector<Vec4> unwritten(
            elementCount_,
            Vec4{sentinel, sentinel, sentinel, sentinel}
        );
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
        api.BufferData(GL_SHADER_STORAGE_BUFFER, bytes, unwritten.data(), GL_DYNAMIC_COPY);
        api.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, buffers_[2]);
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
        diagnostics = "Uploaded input A/B and initialized output sentinel.";
        return true;
#else
        (void)api;
        (void)inputs;
        diagnostics = "SSBO upload appears in checkpoint 3.";
        return true;
#endif
    }

    bool loadProgram(
        GlApi& api,
        const std::string& shaderPath,
        std::string& diagnostics
    ) {
#if LAB_CHECKPOINT >= 4
        std::string source{};
        if (!readTextFile(shaderPath, source, diagnostics)) {
            return false;
        }

        const GLuint shader = api.CreateShader(GL_COMPUTE_SHADER);
        const GLchar* sourcePointer = source.c_str();
        const GLint sourceLength = static_cast<GLint>(source.size());
        api.ShaderSource(shader, 1, &sourcePointer, &sourceLength);
        api.CompileShader(shader);
        GLint compiled = GL_FALSE;
        api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if (compiled != GL_TRUE) {
            diagnostics = "Compute shader compile failed:\n" + shaderInfoLog(api, shader);
            api.DeleteShader(shader);
            return false;
        }

        const GLuint candidate = api.CreateProgram();
        api.AttachShader(candidate, shader);
        api.LinkProgram(candidate);
        api.DeleteShader(shader);
        GLint linked = GL_FALSE;
        api.GetProgramiv(candidate, GL_LINK_STATUS, &linked);
        if (linked != GL_TRUE) {
            diagnostics = "Compute program link failed:\n" + programInfoLog(api, candidate);
            api.DeleteProgram(candidate);
            return false;
        }

#if LAB_CHECKPOINT >= 5
        const GLint elementCountLocation = api.GetUniformLocation(candidate, "uElementCount");
        if (elementCountLocation < 0) {
            diagnostics = "Compute program is missing active uniform uElementCount.";
            api.DeleteProgram(candidate);
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 9
        const GLint operationLocation = api.GetUniformLocation(candidate, "uOperation");
        const GLint scalarLocation = api.GetUniformLocation(candidate, "uScalar");
        if (operationLocation < 0 || scalarLocation < 0) {
            diagnostics = "Compute program is missing uOperation or uScalar.";
            api.DeleteProgram(candidate);
            return false;
        }
#endif

        if (program_ != 0) {
            api.DeleteProgram(program_);
        }
        program_ = candidate;
#if LAB_CHECKPOINT >= 5
        elementCountLocation_ = elementCountLocation;
#endif
#if LAB_CHECKPOINT >= 9
        operationLocation_ = operationLocation;
        scalarLocation_ = scalarLocation;
#endif
        diagnostics = "Compute shader compiled and linked.";
        return true;
#else
        (void)api;
        (void)shaderPath;
        diagnostics = "Compute program appears in checkpoint 4.";
        return true;
#endif
    }

    bool execute(
        GlApi& api,
        std::size_t requestedCount,
        VectorOperation operation,
        float scalar,
        std::vector<Vec4>& output,
        double& gpuMilliseconds,
        std::string& diagnostics,
        bool* timingAvailable = nullptr
    ) {
#if LAB_CHECKPOINT >= 4
        if (program_ == 0 || buffers_[0] == 0 || requestedCount > elementCount_) {
            diagnostics = "Compute program/buffers are not ready for this element count.";
            return false;
        }
        api.UseProgram(program_);
        for (GLuint binding = 0; binding < 3; ++binding) {
            api.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers_[binding]);
        }

#if LAB_CHECKPOINT >= 5
        const DispatchPlan plan = makeDispatchPlan(requestedCount, 256U);
        api.Uniform1i(elementCountLocation_, static_cast<GLint>(requestedCount));
        const GLuint workgroupCount = plan.workgroupCount;
#else
        const GLuint workgroupCount = 1;
#endif
#if LAB_CHECKPOINT >= 9
        api.Uniform1i(operationLocation_, static_cast<GLint>(operation));
        api.Uniform1f(scalarLocation_, scalar);
#else
        (void)operation;
        (void)scalar;
#endif

#if LAB_CHECKPOINT >= 8
        if (timerQuery_ == 0) {
            api.GenQueries(1, &timerQuery_);
        }
        api.BeginQuery(GL_TIME_ELAPSED, timerQuery_);
#endif
        api.DispatchCompute(workgroupCount, 1, 1);
#if LAB_CHECKPOINT >= 8
        api.EndQuery(GL_TIME_ELAPSED);
#endif

#if LAB_CHECKPOINT >= 6
        // Consumer kế tiếp là glGetBufferSubData, vì vậy barrier bit mô tả buffer update/readback.
        api.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        output.resize(requestedCount);
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
        api.GetBufferSubData(
            GL_SHADER_STORAGE_BUFFER,
            0,
            static_cast<GLsizeiptr>(requestedCount * sizeof(Vec4)),
            output.data()
        );
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
#else
        output.clear();
#endif

#if LAB_CHECKPOINT >= 8
        GLint available = GL_FALSE;
        api.GetQueryObjectiv(timerQuery_, GL_QUERY_RESULT_AVAILABLE, &available);
        if (timingAvailable) {
            *timingAvailable = available == GL_TRUE;
        }
        if (available == GL_TRUE) {
            GLuint64 elapsedNanoseconds = 0;
            api.GetQueryObjectui64v(timerQuery_, GL_QUERY_RESULT, &elapsedNanoseconds);
            gpuMilliseconds = double(elapsedNanoseconds) / 1'000'000.0;
        }
#else
        if (timingAvailable) {
            *timingAvailable = false;
        }
        gpuMilliseconds = 0.0;
#endif
        diagnostics = "Compute dispatch completed.";
        return true;
#else
        (void)api;
        (void)requestedCount;
        (void)operation;
        (void)scalar;
        if (timingAvailable) {
            *timingAvailable = false;
        }
        output.clear();
        gpuMilliseconds = 0.0;
        diagnostics = "Compute dispatch appears in checkpoint 4.";
        return true;
#endif
    }

    void destroy(GlApi& api) {
        if (timerQuery_ != 0) {
            api.DeleteQueries(1, &timerQuery_);
            timerQuery_ = 0;
        }
        if (buffers_[0] != 0 || buffers_[1] != 0 || buffers_[2] != 0) {
            api.DeleteBuffers(3, buffers_);
            buffers_[0] = 0;
            buffers_[1] = 0;
            buffers_[2] = 0;
        }
        if (program_ != 0) {
            api.DeleteProgram(program_);
            program_ = 0;
        }
        elementCount_ = 0;
    }

    private:
    GLuint buffers_[3]{};
    GLuint program_{};
    GLuint timerQuery_{};
    std::size_t elementCount_{};
    GLint elementCountLocation_{-1};
    GLint operationLocation_{-1};
    GLint scalarLocation_{-1};
};

} // namespace lab
