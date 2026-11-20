#pragma once
#include "gl_api.hpp"
#include <filesystem>
#include <fstream>
#include <sstream>

namespace volume54 {
// Compile/link failures include the actual shader filename and driver log.
inline GLuint loadProgram(GlApi& gl, const std::filesystem::path& directory, const char* fragment, const char* vertex = "fullscreen.vert") {
    const GLuint program = gl.CreateProgram();
    if (!program)
        throw std::runtime_error("Could not create GL program");
    try {
        for (const auto& [type, file] : {std::pair{GL_VERTEX_SHADER, vertex}, std::pair{GL_FRAGMENT_SHADER, fragment}}) {
            std::ifstream input(directory / file);
            if (!input) {
                throw std::runtime_error(std::string("Missing shader: ") + file);
            }
            std::ostringstream buffer;
            buffer << input.rdbuf();
            const std::string source = buffer.str();
            const char* pointer = source.c_str();
            const GLuint shader = gl.CreateShader(type);
            if (!shader)
                throw std::runtime_error("Could not create GL shader");
            gl.ShaderSource(shader, 1, &pointer, nullptr);
            gl.CompileShader(shader);
            GLint success = 0;
            gl.GetShaderiv(shader, GL_COMPILE_STATUS, &success);
            if (!success) {
                char log[8192]{};
                gl.GetShaderInfoLog(shader, 8192, nullptr, log);
                gl.DeleteShader(shader);
                throw std::runtime_error(std::string(file) + ": " + log);
            }
            gl.AttachShader(program, shader);
            gl.DeleteShader(shader);
        }
        gl.LinkProgram(program);
        GLint success = 0;
        gl.GetProgramiv(program, GL_LINK_STATUS, &success);
        if (!success) {
            char log[8192]{};
            gl.GetProgramInfoLog(program, 8192, nullptr, log);
            throw std::runtime_error(std::string("Link: ") + log);
        }
        return program;
    } catch (...) {
        gl.DeleteProgram(program);
        throw;
    }
}

inline GLint uniform(GlApi& gl, GLuint program, const char* name) {
    const GLint location = gl.GetUniformLocation(program, name);
    if (location < 0) {
        throw std::runtime_error(std::string("Missing active uniform: ") + name);
    }
    return location;
}

inline std::filesystem::path shaderDirectory([[maybe_unused]] const char* entry = "volume.frag") {
#ifdef COURSE_SHADER_DIRECTORY
    if (std::filesystem::exists(std::filesystem::path(COURSE_SHADER_DIRECTORY) / entry)) {
        return COURSE_SHADER_DIRECTORY;
    }
#endif
    const char* base = SDL_GetBasePath();
    if (!base) {
        throw std::runtime_error("SDL_GetBasePath failed");
    }
#ifdef COURSE_SHADER_FALLBACK_SUBDIRECTORY
    return std::filesystem::path(base) / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
#else
    return std::filesystem::path(base) / "shaders";
#endif
}
} // namespace volume54
