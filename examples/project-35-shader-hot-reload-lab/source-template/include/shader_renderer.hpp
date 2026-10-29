#pragma once
#include "gl_api.hpp"
#include "shader_defaults.hpp"
#include <vector>

namespace lab {
struct ProgramBuildAudit {
    std::vector<GLuint> shaders{};
    std::vector<GLuint> programs{};
};

#if LAB_CHECKPOINT >= 2
inline std::string shaderInfoLog(GlApi& gl, GLuint shader) {
    GLint length = 0;
    gl.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    const auto limit = std::clamp(length, 1, 65536);
    std::vector<GLchar> text(std::size_t(limit), '\0');
    gl.GetShaderInfoLog(shader, limit, nullptr, text.data());
    std::string result(text.data());
    if (length > limit)
        result += "\n[Driver log truncated at 64 KiB]";
    if (result.empty())
        result = "Driver supplied no shader info log.";
    return result;
}
#endif

#if LAB_CHECKPOINT >= 3
inline std::string programInfoLog(GlApi& gl, GLuint program) {
    GLint length = 0;
    gl.GetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    const auto limit = std::clamp(length, 1, 65536);
    std::vector<GLchar> text(std::size_t(limit), '\0');
    gl.GetProgramInfoLog(program, limit, nullptr, text.data());
    std::string result(text.data());
    if (length > limit)
        result += "\n[Driver log truncated at 64 KiB]";
    if (result.empty())
        result = "Driver supplied no program info log.";
    return result;
}
#endif

inline GLuint compileShader(GlApi& gl, GLenum stage, const std::string& source, const std::string& file, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    const auto shader = gl.CreateShader(stage);
    if (!shader) {
        diagnostics = file + ": glCreateShader failed";
        return 0;
    }
    if (audit)
        audit->shaders.push_back(shader);
    const char* bytes = source.c_str();
    const GLint length = static_cast<GLint>(source.size());
    gl.ShaderSource(shader, 1, &bytes, &length);
    gl.CompileShader(shader);
    GLint compiled = GL_FALSE;
    gl.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE)
        return shader;
#if LAB_CHECKPOINT >= 2
    const std::string label = stage == GL_VERTEX_SHADER ? "vertex" : "fragment";
    diagnostics = "[" + label + " compile] " + file + "\n" + shaderInfoLog(gl, shader);
#else
    diagnostics = "Shader compile failed: " + file;
#endif
    gl.DeleteShader(shader);
    return 0;
}

// This helper does not assume a gallery interface, so the debug overlay can
// use it too. All intermediate shader objects are detached/deleted after link.
inline GLuint linkShaderProgram(GlApi& gl, const ShaderSources& sources, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    const auto vertex = compileShader(gl, GL_VERTEX_SHADER, sources.vertex, sources.vertexLabel, diagnostics, audit);
    if (!vertex)
        return 0;
    const auto fragment = compileShader(gl, GL_FRAGMENT_SHADER, sources.fragment, sources.fragmentLabel, diagnostics, audit);
    if (!fragment) {
        gl.DeleteShader(vertex);
        return 0;
    }
    const auto program = gl.CreateProgram();
    if (audit && program)
        audit->programs.push_back(program);
    if (!program) {
        gl.DeleteShader(vertex);
        gl.DeleteShader(fragment);
        diagnostics = "glCreateProgram failed";
        return 0;
    }
    gl.AttachShader(program, vertex);
    gl.AttachShader(program, fragment);
    gl.LinkProgram(program);
    GLint linked = GL_FALSE;
    gl.GetProgramiv(program, GL_LINK_STATUS, &linked);
    gl.DetachShader(program, vertex);
    gl.DetachShader(program, fragment);
    gl.DeleteShader(vertex);
    gl.DeleteShader(fragment);
    if (linked != GL_TRUE) {
#if LAB_CHECKPOINT >= 3
        diagnostics = "[link] " + sources.vertexLabel + " + " + sources.fragmentLabel + "\n" + programInfoLog(gl, program);
#else
        diagnostics = "Program link failed: " + sources.vertexLabel + " + " + sources.fragmentLabel;
#endif
        gl.DeleteProgram(program);
        return 0;
    }
    diagnostics.clear();
    return program;
}

struct UniformLocations {
    GLint resolution{-1}, time{-1}, mouse{-1}, zoom{-1};
    bool operator==(const UniformLocations&) const = default;
};

#if LAB_CHECKPOINT >= 3
inline bool findUniform(GlApi& gl, GLuint program, const char* name, GLenum requiredType, bool required, GLint& location, std::string& diagnostics) {
    location = gl.GetUniformLocation(program, name);
    if (location < 0) {
        if (!required)
            return true;
        diagnostics = std::string("[interface] Missing active uniform ") + name + " (it may be unused and optimized out).";
        return false;
    }
    GLint count = 0;
    gl.GetProgramiv(program, GL_ACTIVE_UNIFORMS, &count);
    for (GLint index = 0; index < count; ++index) {
        std::array<GLchar, 256> uniformName{};
        GLsizei written = 0;
        GLint size = 0;
        GLenum type = 0;
        gl.GetActiveUniform(program, GLuint(index), GLsizei(uniformName.size()), &written, &size, &type, uniformName.data());
        if (std::string_view(uniformName.data()) == name) {
            if (type == requiredType && size == 1)
                return true;
            diagnostics = std::string("[interface] Wrong type/array size for ") + name;
            return false;
        }
    }
    diagnostics = std::string("[interface] Cannot find scalar/non-array uniform ") + name;
    return false;
}
#endif

struct ProgramCandidate {
    GLuint program{};
    UniformLocations locations{};
};

inline void destroyProgramCandidate(GlApi& gl, ProgramCandidate& candidate) {
    if (candidate.program)
        gl.DeleteProgram(candidate.program);
    candidate = {};
}

inline bool buildProgramCandidate(GlApi& gl, const ShaderSources& sources, ProgramCandidate& candidate, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    candidate = {};
    candidate.program = linkShaderProgram(gl, sources, diagnostics, audit);
    if (!candidate.program)
        return false;
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT >= 6
    const bool requireLive = true;
#else
    const bool requireLive = false;
#endif
    const auto program = candidate.program;
    auto& locations = candidate.locations;
    const bool valid = findUniform(gl, program, "uResolution", GL_FLOAT_VEC2, true, locations.resolution, diagnostics) &&
        findUniform(gl, program, "uTime", GL_FLOAT, requireLive, locations.time, diagnostics) &&
        findUniform(gl, program, "uMouse", GL_FLOAT_VEC2, requireLive, locations.mouse, diagnostics) &&
        findUniform(gl, program, "uZoom", GL_FLOAT, requireLive, locations.zoom, diagnostics);
    if (!valid) {
        diagnostics = sources.fragmentLabel + "\n" + diagnostics;
        destroyProgramCandidate(gl, candidate);
        return false;
    }
#else
    // First learn location lookup. Type/array reflection is added in lesson 3.
    auto& locations = candidate.locations;
    locations.resolution = gl.GetUniformLocation(candidate.program, "uResolution");
    locations.time = gl.GetUniformLocation(candidate.program, "uTime");
    locations.mouse = gl.GetUniformLocation(candidate.program, "uMouse");
    locations.zoom = gl.GetUniformLocation(candidate.program, "uZoom");
    if (locations.resolution < 0) {
        diagnostics = sources.fragmentLabel + ": uResolution is not active";
        destroyProgramCandidate(gl, candidate);
        return false;
    }
#endif
    return true;
}

// Scene data does not live here. This class owns one VAO and the last-good
// program; uniforms are uploaded again after every successful relink.
struct ShaderLabRenderer {
    GLuint activeProgram{}, vertexArray{};
    UniformLocations locations{};
    ReloadState reloadState{};

    ShaderLabRenderer() = default;
    ShaderLabRenderer(const ShaderLabRenderer&) = delete;
    ShaderLabRenderer& operator=(const ShaderLabRenderer&) = delete;

    bool initialize(GlApi& gl, std::string& diagnostics) {
        ProgramCandidate candidate{};
        const auto sources = embeddedShaderSources();
        if (!buildProgramCandidate(gl, sources, candidate, diagnostics))
            return false;
        activeProgram = std::exchange(candidate.program, 0);
        locations = candidate.locations;
        reloadState.activeFingerprint = fingerprintShaderSources(sources);
        gl.GenVertexArrays(1, &vertexArray);
        gl.BindVertexArray(vertexArray);
        gl.BindVertexArray(0);
        return vertexArray != 0 && gl.GetError() == GL_NO_ERROR;
    }

    bool reload(GlApi& gl, const ShaderSources& sources, std::size_t effect, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
        ProgramCandidate candidate{};
        const auto fingerprint = fingerprintShaderSources(sources);
        if (!buildProgramCandidate(gl, sources, candidate, diagnostics, audit)) {
            recordReloadAttempt(reloadState, fingerprint, effect, false, diagnostics);
            return false;
        }
        const GLuint previousProgram = activeProgram;
        activeProgram = std::exchange(candidate.program, 0);
        locations = candidate.locations;
        // A currently bound old program is only flagged for deletion. Bind
        // the replacement first so deleting previousProgram really releases it.
        gl.UseProgram(activeProgram);
        if (previousProgram)
            gl.DeleteProgram(previousProgram);
        diagnostics = "Reload OK: " + sources.fragmentLabel;
        recordReloadAttempt(reloadState, fingerprint, effect, true, diagnostics);
        return true;
    }

    void draw(GlApi& gl, const UniformSnapshot& uniform) const {
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_CULL_FACE);
        gl.Disable(GL_SCISSOR_TEST);
        gl.Viewport(0, 0, int(uniform.width), int(uniform.height));
        gl.UseProgram(activeProgram);
        gl.Uniform2f(locations.resolution, uniform.width, uniform.height);
        gl.Uniform1f(locations.time, uniform.time);
        gl.Uniform2f(locations.mouse, uniform.mouseX, uniform.mouseY);
        gl.Uniform1f(locations.zoom, uniform.zoom);
        gl.BindVertexArray(vertexArray);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
        gl.BindVertexArray(0);
    }

    void destroy(GlApi& gl) {
        gl.UseProgram(0);
        if (activeProgram)
            gl.DeleteProgram(activeProgram);
        if (vertexArray)
            gl.DeleteVertexArrays(1, &vertexArray);
        activeProgram = vertexArray = 0;
    }
};
} // namespace lab
