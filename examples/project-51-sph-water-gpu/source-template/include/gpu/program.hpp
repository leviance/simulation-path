#pragma once
#include "fluid/math.hpp"
#include "gpu/api.hpp"
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <initializer_list>
#include <sstream>
#include <utility>
#include <vector>

namespace water51 {
// Compile rooted shader files and release GL programs before their context is destroyed.

inline std::string shaderText(const std::filesystem::path& root, const std::filesystem::path& relative, int depth = 0) {
    if (depth > 4 || relative.is_absolute())
        throw std::runtime_error("Invalid shader include");
    for (const auto& part : relative)
        if (part == "..")
            throw std::runtime_error("Shader include leaves its root");
    std::ifstream input(root / relative);
    if (!input)
        throw std::runtime_error("Cannot read shader: " + (root / relative).string());
    std::ostringstream output;
    std::string line;
    while (std::getline(input, line)) {
        const auto first = line.find_first_not_of(" \t");
        if (first != std::string::npos && line.compare(first, 8, "#include") == 0) {
            const auto a = line.find('"', first + 8);
            const auto b = line.find('"', a + 1);
            if (a == std::string::npos || b == std::string::npos)
                throw std::runtime_error("Malformed shader include");
            output << shaderText(root, line.substr(a + 1, b - a - 1), depth + 1) << '\n';
        } else
            output << line << '\n';
    }
    return output.str();
}

class Program {
    Gl* gl_ = nullptr;
    GLuint id_ = 0;

    public:
    Program() = default;

    Program(Gl& gl, const std::filesystem::path& root, std::initializer_list<std::pair<GLenum, const char*>> files)
        : gl_(&gl) {
        id_ = gl.CreateProgram();
        std::vector<GLuint> shaders;
        try {
            for (const auto& [kind, file] : files) {
                const auto source = shaderText(root, file);
                const char* text = source.c_str();
                const GLuint shader = gl.CreateShader(kind);
                shaders.push_back(shader);
                gl.ShaderSource(shader, 1, &text, nullptr);
                gl.CompileShader(shader);
                GLint success = 0;
                gl.GetShaderiv(shader, GL_COMPILE_STATUS, &success);
                if (!success) {
                    char log[16384]{};
                    gl.GetShaderInfoLog(shader, sizeof(log), nullptr, log);
                    throw std::runtime_error(std::string(file) + "\n" + log);
                }
                gl.AttachShader(id_, shader);
            }
            gl.LinkProgram(id_);
            GLint success = 0;
            gl.GetProgramiv(id_, GL_LINK_STATUS, &success);
            if (!success) {
                char log[16384]{};
                gl.GetProgramInfoLog(id_, sizeof(log), nullptr, log);
                throw std::runtime_error(std::string("Shader link: ") + log);
            }
            for (GLuint shader : shaders)
                gl.DeleteShader(shader);
        } catch (...) {
            for (GLuint shader : shaders)
                gl.DeleteShader(shader);
            gl.DeleteProgram(id_);
            id_ = 0;
            throw;
        }
    }

    ~Program() {
        if (id_ != 0)
            gl_->DeleteProgram(id_);
    }

    Program(const Program&) = delete;
    Program& operator=(const Program&) = delete;

    Program(Program&& other) noexcept
        : gl_(other.gl_), id_(std::exchange(other.id_, 0)) {}

    Program& operator=(Program&& other) noexcept {
        if (this == &other)
            return *this;
        if (id_ != 0)
            gl_->DeleteProgram(id_);
        gl_ = other.gl_;
        id_ = std::exchange(other.id_, 0);
        return *this;
    }

    void use() const {
        gl_->UseProgram(id_);
    }

    GLint location(const char* name) const {
        return gl_->GetUniformLocation(id_, name);
    }

    void setFloat(const char* name, float value) const {
        gl_->Uniform1f(location(name), value);
    }

    void setInt(const char* name, int value) const {
        gl_->Uniform1i(location(name), value);
    }

    void setUnsigned(const char* name, std::uint32_t value) const {
        gl_->Uniform1ui(location(name), value);
    }

    void setVec2(const char* name, float x, float y) const {
        gl_->Uniform2f(location(name), x, y);
    }

    void setVec3(const char* name, Vec3 value) const {
        gl_->Uniform3f(location(name), static_cast<float>(value.x), static_cast<float>(value.y), static_cast<float>(value.z));
    }

    void setVec4(const char* name, Vec3 value, float w) const {
        gl_->Uniform4f(location(name), static_cast<float>(value.x), static_cast<float>(value.y), static_cast<float>(value.z), w);
    }

    void setIntegers(const char* name, int x, int y, int z) const {
        gl_->Uniform3i(location(name), x, y, z);
    }
};
} // namespace water51
