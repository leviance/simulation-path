#pragma once

#include "gl_api.hpp"

#include <fstream>
#include <initializer_list>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>

namespace molecular {

// Dùng lại quy trình compile/link từ Project 35–40; lỗi luôn kèm tên file.
inline GLuint loadProgram(lab::GlApi& gl, const std::string& directory, std::initializer_list<std::pair<GLenum, std::string>> stages) {
    const GLuint program = gl.CreateProgram();
    if (program == 0) {
        throw std::runtime_error("Cannot create GL program.");
    }
    try {
        for (const auto& [type, file] : stages) {
            std::ifstream input(directory + "/" + file);
            if (!input) {
                throw std::runtime_error("Cannot open shader: " + file);
            }
            std::ostringstream text{};
            text << input.rdbuf();
            const std::string source = text.str();
            const char* pointer = source.c_str();
            const GLuint shader = gl.CreateShader(type);
            gl.ShaderSource(shader, 1, &pointer, nullptr);
            gl.CompileShader(shader);
            GLint success = GL_FALSE;
            gl.GetShaderiv(shader, GL_COMPILE_STATUS, &success);
            if (success != GL_TRUE) {
                char log[8192]{};
                gl.GetShaderInfoLog(shader, 8192, nullptr, log);
                gl.DeleteShader(shader);
                throw std::runtime_error(file + ": " + log);
            }
            gl.AttachShader(program, shader);
            gl.DeleteShader(shader);
        }
        gl.LinkProgram(program);
        GLint success = GL_FALSE;
        gl.GetProgramiv(program, GL_LINK_STATUS, &success);
        if (success != GL_TRUE) {
            char log[8192]{};
            gl.GetProgramInfoLog(program, 8192, nullptr, log);
            throw std::runtime_error(std::string("Program link: ") + log);
        }
        return program;
    } catch (...) {
        gl.DeleteProgram(program);
        throw;
    }
}

// Mọi uniform được kiểm ngay lúc load; -1 không bị âm thầm bỏ qua.
inline GLint requireUniform(lab::GlApi& gl, GLuint program, const char* name) {
    const GLint location = gl.GetUniformLocation(program, name);
    if (location < 0) {
        throw std::runtime_error(std::string("Missing active uniform: ") + name);
    }
    return location;
}

} // namespace molecular
