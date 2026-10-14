#pragma once
#include "gl_api.hpp"
#include <filesystem>
#include <fstream>
#include <sstream>

namespace fog {
// Compile/link failures include the actual shader filename and driver log.
inline GLuint loadProgram(GlApi& gl, const std::filesystem::path& directory, const char* fragment) {
    const GLuint program = gl.CreateProgram();
    try {
        for (const auto& [type, file] : {std::pair{GL_VERTEX_SHADER, "fullscreen.vert"}, std::pair{GL_FRAGMENT_SHADER, fragment}}) {
            std::ifstream input(directory / file);
            if (!input) {
                throw std::runtime_error(std::string("Missing shader: ") + file);
            }
            std::ostringstream buffer;
            buffer << input.rdbuf();
            const std::string source = buffer.str();
            const char* pointer = source.c_str();
            const GLuint shader = gl.CreateShader(type);
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

inline std::filesystem::path shaderDirectory() {
#ifdef COURSE_SHADER_DIRECTORY
    if (std::filesystem::exists(std::filesystem::path(COURSE_SHADER_DIRECTORY) / "volume.frag")) {
        return COURSE_SHADER_DIRECTORY;
    }
#endif
    const char* base = SDL_GetBasePath();
    if (!base) {
        throw std::runtime_error("SDL_GetBasePath failed");
    }
    return std::filesystem::path(base) / "shaders";
}
} // namespace fog
