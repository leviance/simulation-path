#pragma once
#include "gl_api.hpp"
#include <algorithm>
#include <array>
#include <filesystem>
#include <fstream>
#include <string_view>
#include <vector>

namespace lab {

// File loader/compile/link là scaffold kế thừa Project 35, không phải ray marcher.
struct ShaderSources {
    std::string vertex{};
    std::string fragment{};
};

inline bool readTextFile(const std::filesystem::path& path, std::string& output, std::string& diagnostics) {
    std::error_code error{};
    const auto bytes = std::filesystem::file_size(path, error);
    if (error || bytes == 0 || bytes > 2 * 1024 * 1024) {
        diagnostics = "Cannot read shader (missing, empty or >2 MiB): " + path.string();
        return false;
    }
    std::ifstream stream(path, std::ios::binary);
    std::string candidate(static_cast<std::size_t>(bytes), '\0');
    if (!stream.read(candidate.data(), static_cast<std::streamsize>(bytes)) || candidate.find('\0') != std::string::npos) {
        diagnostics = "Incomplete shader read or embedded NUL: " + path.string();
        return false;
    }
    output = std::move(candidate);
    return true;
}

inline bool readRayMarchShaders(const std::filesystem::path& directory, ShaderSources& sources, std::string& diagnostics) {
    ShaderSources candidate{};
    if (!readTextFile(directory / "raymarch.vert", candidate.vertex, diagnostics)) {
        return false;
    }
    if (!readTextFile(directory / "raymarch.frag", candidate.fragment, diagnostics)) {
        return false;
    }
    sources = std::move(candidate);
    diagnostics.clear();
    return true;
}

inline std::string driverLog(GlApi& api, GLuint object, bool program) {
    GLint length = 0;
    if (program) {
        api.GetProgramiv(object, GL_INFO_LOG_LENGTH, &length);
    } else {
        api.GetShaderiv(object, GL_INFO_LOG_LENGTH, &length);
    }
    const GLint capacity = std::clamp(length, 1, 65536);
    std::vector<GLchar> text(static_cast<std::size_t>(capacity), '\0');
    GLsizei written = 0;
    if (program) {
        api.GetProgramInfoLog(object, capacity, &written, text.data());
    } else {
        api.GetShaderInfoLog(object, capacity, &written, text.data());
    }
    return std::string(text.data(), static_cast<std::size_t>(std::max(0, written)));
}

struct ProgramBuildAudit {
    std::vector<GLuint> shaders{};
    std::vector<GLuint> programs{};
};

inline GLuint compileShader(GlApi& api, GLenum type, const std::string& source, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    const GLuint shader = api.CreateShader(type);
    if (shader == 0) {
        diagnostics = "glCreateShader failed";
        return 0;
    }
    if (audit) {
        audit->shaders.push_back(shader);
    }
    const char* data = source.c_str();
    const GLint bytes = static_cast<GLint>(source.size());
    api.ShaderSource(shader, 1, &data, &bytes);
    api.CompileShader(shader);
    GLint compiled = GL_FALSE;
    api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }
    diagnostics = "Shader compile failed:\n" + driverLog(api, shader, false);
    api.DeleteShader(shader);
    return 0;
}

inline GLuint linkShaderProgram(GlApi& api, const ShaderSources& sources, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    const GLuint vertex = compileShader(api, GL_VERTEX_SHADER, sources.vertex, diagnostics, audit);
    if (!vertex) {
        return 0;
    }
    const GLuint fragment = compileShader(api, GL_FRAGMENT_SHADER, sources.fragment, diagnostics, audit);
    if (!fragment) {
        api.DeleteShader(vertex);
        return 0;
    }
    const GLuint program = api.CreateProgram();
    if (audit && program) {
        audit->programs.push_back(program);
    }
    if (!program) {
        api.DeleteShader(vertex);
        api.DeleteShader(fragment);
        diagnostics = "glCreateProgram failed";
        return 0;
    }
    api.AttachShader(program, vertex);
    api.AttachShader(program, fragment);
    api.LinkProgram(program);
    GLint linked = GL_FALSE;
    api.GetProgramiv(program, GL_LINK_STATUS, &linked);
    api.DetachShader(program, vertex);
    api.DetachShader(program, fragment);
    api.DeleteShader(vertex);
    api.DeleteShader(fragment);
    if (linked != GL_TRUE) {
        diagnostics = "Program link failed:\n" + driverLog(api, program, true);
        api.DeleteProgram(program);
        return 0;
    }
    diagnostics.clear();
    return program;
}

inline bool findUniform(GlApi& api, GLuint program, const char* name, GLenum requiredType, bool required, GLint& location, std::string& diagnostics) {
    location = api.GetUniformLocation(program, name);
    if (location < 0 && !required) {
        return true;
    }
    GLint count = 0;
    api.GetProgramiv(program, GL_ACTIVE_UNIFORMS, &count);
    for (GLint index = 0; index < count && index < 256; ++index) {
        std::array<char, 128> activeName{};
        GLsizei written = 0;
        GLint size = 0;
        GLenum type = 0;
        api.GetActiveUniform(program, static_cast<GLuint>(index), static_cast<GLsizei>(activeName.size()), &written, &size, &type, activeName.data());
        if (std::string_view(activeName.data()) == name && location >= 0 && size == 1 && type == requiredType) {
            return true;
        }
    }
    diagnostics = std::string("Missing uniform or wrong type/array size: ") + name;
    return false;
}

} // namespace lab
