#pragma once
#include "gl_api.hpp"

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <utility>
#include <vector>

namespace chamber {

// Supplied OpenGL scaffold from Project 37. Errors stay readable; the caller owns cleanup.
inline GLuint compileStage(GlApi& gl, GLenum stage, const std::filesystem::path& file, std::string& error) {
    std::ifstream input(file, std::ios::binary);
    if (!input) {
        error = "Cannot open shader: " + file.string();
        return 0;
    }
    std::ostringstream stream{};
    stream << input.rdbuf();
    const std::string source = stream.str();
    if (source.empty()) {
        error = "Empty shader: " + file.string();
        return 0;
    }
    const char* pointer = source.c_str();
    const GLuint shader = gl.CreateShader(stage);
    gl.ShaderSource(shader, 1, &pointer, nullptr);
    gl.CompileShader(shader);
    GLint success = GL_FALSE;
    gl.GetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (success == GL_TRUE)
        return shader;
    GLint size = 0;
    gl.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &size);
    std::string log(static_cast<std::size_t>(std::max(size, 1)), '\0');
    gl.GetShaderInfoLog(shader, size, nullptr, log.data());
    gl.DeleteShader(shader);
    error = file.string() + ": " + log;
    return 0;
}

inline GLuint buildProgram(GlApi& gl, const std::vector<std::pair<GLenum, std::filesystem::path>>& files, std::string& error) {
    std::vector<GLuint> stages{};
    const GLuint program = gl.CreateProgram();
    bool success = true;
    for (const auto& [kind, file] : files) {
        const GLuint shader = compileStage(gl, kind, file, error);
        if (shader == 0) {
            success = false;
            break;
        }
        stages.push_back(shader);
        gl.AttachShader(program, shader);
    }
    if (success) {
        gl.LinkProgram(program);
        GLint linked = GL_FALSE;
        gl.GetProgramiv(program, GL_LINK_STATUS, &linked);
        success = linked == GL_TRUE;
        if (!success) {
            GLint size = 0;
            gl.GetProgramiv(program, GL_INFO_LOG_LENGTH, &size);
            error.assign(static_cast<std::size_t>(std::max(size, 1)), '\0');
            gl.GetProgramInfoLog(program, size, nullptr, error.data());
        }
    }
    for (const GLuint shader : stages)
        gl.DeleteShader(shader);
    if (success)
        return program;
    gl.DeleteProgram(program);
    return 0;
}

inline bool fenceReady(GlApi& gl, GLsync fence, std::string& error) {
    // Zero timeout is deliberate. No loop waits for a pending driver command on the UI thread.
    const GLenum result = gl.ClientWaitSync(fence, 0, 0);
    if (result == GL_WAIT_FAILED)
        error = "GPU fence wait failed";
    return result == GL_ALREADY_SIGNALED || result == GL_CONDITION_SATISFIED;
}

} // namespace chamber
