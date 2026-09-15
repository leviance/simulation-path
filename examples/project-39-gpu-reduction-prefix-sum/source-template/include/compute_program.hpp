#pragma once

#include "gl_api.hpp"

#include <algorithm>
#include <fstream>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace lab {

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

inline std::string shaderInfoLog(GlApi& gl, GLuint shader) {
    GLint length = 0;
    gl.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::string log(static_cast<std::size_t>(length), '\0');
    GLsizei written = 0;
    gl.GetShaderInfoLog(shader, length, &written, log.data());
    log.resize(static_cast<std::size_t>(std::max(0, static_cast<int>(written))));
    return log;
}

inline std::string programInfoLog(GlApi& gl, GLuint program) {
    GLint length = 0;
    gl.GetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::string log(static_cast<std::size_t>(length), '\0');
    GLsizei written = 0;
    gl.GetProgramInfoLog(program, length, &written, log.data());
    log.resize(static_cast<std::size_t>(std::max(0, static_cast<int>(written))));
    return log;
}

// Program chỉ được commit sau khi cả compile, link và uniform contract đều đạt.
class ComputeProgram {
    public:
    bool load(
        GlApi& gl,
        const std::string& path,
        const std::vector<std::string>& requiredUniforms,
        std::string& diagnostics
    ) {
        std::string source{};
        if (!readTextFile(path, source, diagnostics)) {
            return false;
        }

        const GLuint shader = gl.CreateShader(GL_COMPUTE_SHADER);
        const GLchar* sourcePointer = source.c_str();
        const GLint sourceLength = static_cast<GLint>(source.size());
        gl.ShaderSource(shader, 1, &sourcePointer, &sourceLength);
        gl.CompileShader(shader);
        GLint compiled = GL_FALSE;
        gl.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if (compiled != GL_TRUE) {
            diagnostics = "Compute shader compile failed for " + path + ":\n" + shaderInfoLog(gl, shader);
            gl.DeleteShader(shader);
            return false;
        }

        const GLuint candidate = gl.CreateProgram();
        gl.AttachShader(candidate, shader);
        gl.LinkProgram(candidate);
        gl.DeleteShader(shader);
        GLint linked = GL_FALSE;
        gl.GetProgramiv(candidate, GL_LINK_STATUS, &linked);
        if (linked != GL_TRUE) {
            diagnostics = "Compute program link failed for " + path + ":\n" + programInfoLog(gl, candidate);
            gl.DeleteProgram(candidate);
            return false;
        }

        std::vector<GLint> locations{};
        locations.reserve(requiredUniforms.size());
        for (const std::string& name : requiredUniforms) {
            const GLint location = gl.GetUniformLocation(candidate, name.c_str());
            if (location < 0) {
                diagnostics = "Compute program is missing active uniform " + name + ".";
                gl.DeleteProgram(candidate);
                return false;
            }
            locations.push_back(location);
        }

        destroy(gl);
        id_ = candidate;
        uniformNames_ = requiredUniforms;
        uniformLocations_ = std::move(locations);
        diagnostics = "Loaded compute program: " + path;
        return true;
    }

    void use(GlApi& gl) const {
        gl.UseProgram(id_);
    }

    GLint uniform(const std::string& name) const {
        for (std::size_t index = 0; index < uniformNames_.size(); ++index) {
            if (uniformNames_[index] == name) {
                return uniformLocations_[index];
            }
        }
        return -1;
    }

    bool ready() const {
        return id_ != 0U;
    }

    void destroy(GlApi& gl) {
        if (id_ != 0U) {
            gl.DeleteProgram(id_);
            id_ = 0U;
        }
        uniformNames_.clear();
        uniformLocations_.clear();
    }

    private:
    GLuint id_{};
    std::vector<std::string> uniformNames_{};
    std::vector<GLint> uniformLocations_{};
};

} // namespace lab
