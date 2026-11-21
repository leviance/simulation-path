#pragma once
#include "gl_api.hpp"
#include "pipeline.hpp"
#include <vector>

namespace lab {
struct ProgramBuildAudit {
    std::vector<GLuint> shaders{};
    std::vector<GLuint> programs{};
};

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
    std::string label = "fragment";
    if (stage == GL_VERTEX_SHADER) {
        label = "vertex";
    }
    diagnostics = "[" + label + " compile] " + file + "\n" + shaderInfoLog(gl, shader);
    gl.DeleteShader(shader);
    return 0;
}

// Cảnh, ảnh độ sâu và HUD dùng chung khâu liên kết; shader trung gian được giải phóng sau đó.
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
        diagnostics = "[link] " + sources.vertexLabel + " + " + sources.fragmentLabel + "\n" + programInfoLog(gl, program);
        gl.DeleteProgram(program);
        return 0;
    }
    diagnostics.clear();
    return program;
}

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

struct UniformLocations {
    GLint model{-1}, camera{-1}, color{-1}, material{-1}, sun{-1}, light{-1};
    GLint shadow{-1}, shadows{-1}, bias{-1}, filter{-1}, mode{-1};
};
inline bool resolveRoomUniforms(GlApi& gl, GLuint program, UniformLocations& at, std::string& log) {
    auto need = [&](const char* name, GLenum type, GLint& location) {
        return findUniform(gl, program, name, type, true, location, log);
    };
    if (!need("uModel", GL_FLOAT_MAT4, at.model) || !need("uCameraVP", GL_FLOAT_MAT4, at.camera) ||
        !need("uColor", GL_FLOAT_VEC3, at.color) || !need("uMaterial", GL_INT, at.material)) return false;
#if LAB_CHECKPOINT >= 2
    if (!need("uSun", GL_FLOAT_VEC3, at.sun)) return false;
#endif
#if LAB_CHECKPOINT >= 4
    if (!need("uLightVP", GL_FLOAT_MAT4, at.light) || !need("uShadow", GL_SAMPLER_2D, at.shadow) ||
        !need("uShadows", GL_INT, at.shadows)) return false;
#endif
#if LAB_CHECKPOINT >= 5
    if (!need("uBias", GL_FLOAT, at.bias) || !need("uFilter", GL_INT, at.filter)) return false;
#endif
#if LAB_CHECKPOINT >= 7
    if (!need("uMode", GL_INT, at.mode)) return false;
#endif
    return true;
}
struct RoomProgram {
    GLuint active{};
    UniformLocations locations{};
    ReloadState reload{};
    bool replace(GlApi& gl, const ShaderSources& sources) {
        ++reload.attempts;
        GLuint candidate = linkShaderProgram(gl, sources, reload.diagnostics);
        UniformLocations next{};
        if (candidate && !resolveRoomUniforms(gl, candidate, next, reload.diagnostics)) {
            reload.diagnostics = sources.fragmentLabel + " / " + sources.vertexLabel + "\n" + reload.diagnostics;
            gl.DeleteProgram(candidate);
            candidate = 0;
        }
        reload.lastReloadSucceeded = candidate != 0;
        if (!candidate) return false;
        // Không xóa chương trình tốt cho tới khi chương trình mới vẽ được cùng giao diện.
        // [snippet commit-program]
        const GLuint previous = std::exchange(active, candidate);
        locations = next;
        gl.UseProgram(active);
        if (previous) gl.DeleteProgram(previous);
        ++reload.generation;
        reload.diagnostics.clear();
        return true;
        // [/snippet commit-program]
    }
    void destroy(GlApi& gl) {
        gl.UseProgram(0);
        if (active) gl.DeleteProgram(active);
        active = 0;
    }
};
} // namespace lab
