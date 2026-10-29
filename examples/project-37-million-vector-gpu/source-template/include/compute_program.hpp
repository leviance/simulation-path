#pragma once

#include "vector_compute_engine.hpp"

#include <filesystem>
#include <fstream>

namespace lab {

inline std::string readComputeSource(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) {
        throw std::runtime_error("Cannot open compute shader: " + path.string());
    }
    const std::streamoff size = file.tellg();
    if (size <= 0 || size > 256 * 1024) {
        throw std::runtime_error("Compute source must contain 1..262144 bytes.");
    }
    std::string source(static_cast<std::size_t>(size), '\0');
    file.seekg(0);
    if (!file.read(source.data(), size)) {
        throw std::runtime_error("Cannot read the entire compute source.");
    }
    return source;
}

#if LAB_CHECKPOINT >= 4
inline std::string computeInfoLog(GlApi& api, GLuint object, bool shader) {
    GLint length = 0;
    if (shader) {
        api.GetShaderiv(object, GL_INFO_LOG_LENGTH, &length);
    } else {
        api.GetProgramiv(object, GL_INFO_LOG_LENGTH, &length);
    }
    length = std::clamp(length, 1, 64 * 1024);
    std::string log(static_cast<std::size_t>(length), '\0');
    GLsizei written = 0;
    if (shader) {
        api.GetShaderInfoLog(object, length, &written, log.data());
    } else {
        api.GetProgramInfoLog(object, length, &written, log.data());
    }
    log.resize(static_cast<std::size_t>(std::clamp(written, 0, length)));
    return log;
}

inline GLint requireUniform(GlApi& api, GLuint program, const char* name, GLint expectedType) {
    const GLint location = api.GetUniformLocation(program, name);
    GLuint index = GL_INVALID_INDEX;
    api.GetUniformIndices(program, 1, &name, &index);
    if (location < 0 || index == GL_INVALID_INDEX) {
        throw std::runtime_error(std::string("Missing active uniform: ") + name);
    }
    GLint type = 0;
    GLint count = 0;
    api.GetActiveUniformsiv(program, 1, &index, GL_UNIFORM_TYPE, &type);
    api.GetActiveUniformsiv(program, 1, &index, GL_UNIFORM_SIZE, &count);
    if (type != expectedType || count != 1) {
        throw std::runtime_error(std::string("Wrong uniform type/array size: ") + name);
    }
    return location;
}

inline void requireStorageBlock(GlApi& api, GLuint program, const char* block, const char* array, GLint binding) {
    const GLuint blockIndex = api.GetProgramResourceIndex(program, GL_SHADER_STORAGE_BLOCK, block);
    if (blockIndex == GL_INVALID_INDEX) {
        throw std::runtime_error(std::string("Missing SSBO block: ") + block);
    }
    const GLenum bindingProperty = GL_BUFFER_BINDING;
    GLint actualBinding = -1;
    api.GetProgramResourceiv(program, GL_SHADER_STORAGE_BLOCK, blockIndex, 1, &bindingProperty, 1, nullptr, &actualBinding);
    const GLuint variable = api.GetProgramResourceIndex(program, GL_BUFFER_VARIABLE, array);
    if (variable == GL_INVALID_INDEX) {
        throw std::runtime_error(std::string("Missing SSBO array: ") + array);
    }
    const std::array<GLenum, 4> properties{GL_TYPE, GL_ARRAY_STRIDE, GL_OFFSET, GL_BLOCK_INDEX};
    std::array<GLint, 4> values{};
    api.GetProgramResourceiv(program, GL_BUFFER_VARIABLE, variable, 4, properties.data(), 4, nullptr, values.data());
    if (actualBinding != binding || values[0] != GL_FLOAT_VEC4 || values[1] != 16 || values[2] != 0 || values[3] != static_cast<GLint>(blockIndex)) {
        throw std::runtime_error(std::string("SSBO binding/type/stride/offset mismatch: ") + block);
    }
}

inline void VectorComputeEngine::loadProgram(GlApi& api, const std::string& shaderSource) {
    if (shaderSource.empty() || shaderSource.size() > 256U * 1024U) {
        throw std::invalid_argument("Compute source exceeds its file budget.");
    }
    const GLuint shader = api.CreateShader(GL_COMPUTE_SHADER);
    GLuint candidate = 0;
    try {
        if (shader == 0) {
            throw std::runtime_error("Cannot create compute shader.");
        }
        const GLchar* sourcePointer = shaderSource.c_str();
        const GLint sourceLength = static_cast<GLint>(shaderSource.size());
        api.ShaderSource(shader, 1, &sourcePointer, &sourceLength);
        api.CompileShader(shader);
        GLint compiled = GL_FALSE;
        api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if (compiled != GL_TRUE) {
            throw std::runtime_error("Compute compile failed: " + computeInfoLog(api, shader, true));
        }
        candidate = api.CreateProgram();
        if (candidate == 0) {
            throw std::runtime_error("Cannot create compute program.");
        }
        api.AttachShader(candidate, shader);
        api.LinkProgram(candidate);
        GLint linked = GL_FALSE;
        api.GetProgramiv(candidate, GL_LINK_STATUS, &linked);
        if (linked != GL_TRUE) {
            throw std::runtime_error("Compute link failed: " + computeInfoLog(api, candidate, false));
        }

        std::array<GLint, 3> localSize{};
        api.GetProgramiv(candidate, GL_COMPUTE_WORK_GROUP_SIZE, localSize.data());
        if (localSize != std::array<GLint, 3>{256, 1, 1}) {
            throw std::runtime_error("Compute program must use local_size = (256, 1, 1).");
        }
        requireStorageBlock(api, candidate, "InputA", "inputA[0]", 0);
        requireStorageBlock(api, candidate, "InputB", "inputB[0]", 1);
        requireStorageBlock(api, candidate, "Output", "outputData[0]", 2);
        const GLint operationLocation = requireUniform(api, candidate, "uOperation", GL_INT);
        const GLint scalarLocation = requireUniform(api, candidate, "uScalar", GL_FLOAT);
#if LAB_CHECKPOINT >= 5
        const GLint countLocation = requireUniform(api, candidate, "uElementCount", GL_INT);
#endif
        requireNoGlError(api, "Compute interface reflection");

        // Chỉ thay program sau khi toàn bộ interface đã hợp lệ.
        if (program_ != 0) {
            api.DeleteProgram(program_);
        }
        program_ = candidate;
        candidate = 0;
        operationLocation_ = operationLocation;
        scalarLocation_ = scalarLocation;
#if LAB_CHECKPOINT >= 5
        elementCountLocation_ = countLocation;
#endif
        api.DeleteShader(shader);
    } catch (...) {
        if (shader != 0) {
            api.DeleteShader(shader);
        }
        if (candidate != 0) {
            api.DeleteProgram(candidate);
        }
        throw;
    }
}
#endif

} // namespace lab
