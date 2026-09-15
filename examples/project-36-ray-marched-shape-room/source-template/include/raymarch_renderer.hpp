#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "gl_api.hpp"
#include "raymarch_math.hpp"

#include <cstdint>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

namespace lab {

struct ShaderSources {
    std::string vertex{};
    std::string fragment{};
};

inline bool readTextFile(
    const std::filesystem::path& path,
    std::string& output,
    std::string& diagnostics
) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream) {
        diagnostics = "Cannot open shader file: " + path.string();
        return false;
    }
    std::ostringstream buffer{};
    buffer << stream.rdbuf();
    if (stream.bad()) {
        diagnostics = "Cannot read shader file: " + path.string();
        return false;
    }
    output = buffer.str();
    return true;
}

inline bool readRayMarchShaders(
    const std::filesystem::path& directory,
    ShaderSources& sources,
    std::string& diagnostics
) {
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

inline std::string shaderInfoLog(GlApi& api, GLuint shader) {
    GLint length = 0;
    api.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return "Driver returned no shader info log.";
    }
    std::vector<GLchar> characters(static_cast<std::size_t>(length), '\0');
    api.GetShaderInfoLog(shader, length, nullptr, characters.data());
    return std::string(characters.data());
}

inline std::string programInfoLog(GlApi& api, GLuint program) {
    GLint length = 0;
    api.GetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return "Driver returned no program info log.";
    }
    std::vector<GLchar> characters(static_cast<std::size_t>(length), '\0');
    api.GetProgramInfoLog(program, length, nullptr, characters.data());
    return std::string(characters.data());
}

inline GLuint compileShader(
    GlApi& api,
    GLenum type,
    const std::string& source,
    std::string_view label,
    std::string& diagnostics
) {
    const GLuint shader = api.CreateShader(type);
    if (shader == 0U) {
        diagnostics = std::string(label) + ": glCreateShader returned 0.";
        return 0U;
    }
    const GLchar* sourcePointer = source.c_str();
    api.ShaderSource(shader, 1, &sourcePointer, nullptr);
    api.CompileShader(shader);
    GLint compiled = GL_FALSE;
    api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }
    diagnostics = std::string(label) + " compile failed:\n" + shaderInfoLog(api, shader);
    api.DeleteShader(shader);
    return 0U;
}

struct ProgramCandidate {
    GLuint program{};
    GLint resolutionLocation{-1};
    GLint cameraPositionLocation{-1};
    GLint cameraTargetLocation{-1};
    GLint maximumStepsLocation{-1};
    GLint hitEpsilonLocation{-1};
    GLint timeLocation{-1};
    GLint debugViewLocation{-1};
};

inline void destroyCandidate(GlApi& api, ProgramCandidate& candidate) {
    if (candidate.program != 0U) {
        api.DeleteProgram(candidate.program);
    }
    candidate = {};
}

inline bool requireUniform(
    GlApi& api,
    ProgramCandidate& candidate,
    const char* name,
    GLint& location,
    std::string& diagnostics
) {
    location = api.GetUniformLocation(candidate.program, name);
    if (location >= 0) {
        return true;
    }
    diagnostics = std::string("Linked program does not expose required uniform ") + name + ".";
    return false;
}

inline bool buildProgramCandidate(
    GlApi& api,
    const ShaderSources& sources,
    ProgramCandidate& candidate,
    std::string& diagnostics
) {
    const GLuint vertexShader =
        compileShader(api, GL_VERTEX_SHADER, sources.vertex, "raymarch.vert", diagnostics);
    if (vertexShader == 0U) {
        return false;
    }
    const GLuint fragmentShader =
        compileShader(api, GL_FRAGMENT_SHADER, sources.fragment, "raymarch.frag", diagnostics);
    if (fragmentShader == 0U) {
        api.DeleteShader(vertexShader);
        return false;
    }

    candidate.program = api.CreateProgram();
    if (candidate.program == 0U) {
        diagnostics = "glCreateProgram returned 0.";
        api.DeleteShader(fragmentShader);
        api.DeleteShader(vertexShader);
        return false;
    }
    api.AttachShader(candidate.program, vertexShader);
    api.AttachShader(candidate.program, fragmentShader);
    api.LinkProgram(candidate.program);
    api.DeleteShader(fragmentShader);
    api.DeleteShader(vertexShader);

    GLint linked = GL_FALSE;
    api.GetProgramiv(candidate.program, GL_LINK_STATUS, &linked);
    if (linked != GL_TRUE) {
        diagnostics = "Program link failed:\n" + programInfoLog(api, candidate.program);
        destroyCandidate(api, candidate);
        return false;
    }

#if LAB_CHECKPOINT >= 1
    if (!requireUniform(
            api,
            candidate,
            "uResolution",
            candidate.resolutionLocation,
            diagnostics
        )) {
        destroyCandidate(api, candidate);
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (!requireUniform(
            api,
            candidate,
            "uCameraPosition",
            candidate.cameraPositionLocation,
            diagnostics
        ) ||
        !requireUniform(
            api,
            candidate,
            "uCameraTarget",
            candidate.cameraTargetLocation,
            diagnostics
        )) {
        destroyCandidate(api, candidate);
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (!requireUniform(
            api,
            candidate,
            "uMaximumSteps",
            candidate.maximumStepsLocation,
            diagnostics
        ) ||
        !requireUniform(
            api,
            candidate,
            "uHitEpsilon",
            candidate.hitEpsilonLocation,
            diagnostics
        )) {
        destroyCandidate(api, candidate);
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (!requireUniform(api, candidate, "uTime", candidate.timeLocation, diagnostics)) {
        destroyCandidate(api, candidate);
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (!requireUniform(api, candidate, "uDebugView", candidate.debugViewLocation, diagnostics)) {
        destroyCandidate(api, candidate);
        return false;
    }
#endif
    return true;
}

struct RayMarchFrame {
    OrbitCamera camera{};
    float elapsedSeconds{};
    int maximumSteps{96};
    float hitEpsilon{0.0015F};
    int debugView{};
};

struct RayMarchRenderer {
    GLuint vertexArray{};
    ProgramCandidate activeProgram{};
    std::uint64_t generation{1U};

    bool initialize(
        GlApi& api,
        const ShaderSources& sources,
        std::string& diagnostics
    ) {
        api.GenVertexArrays(1, &vertexArray);
        if (vertexArray == 0U) {
            diagnostics = "Cannot create the fullscreen VAO.";
            return false;
        }
        if (!buildProgramCandidate(api, sources, activeProgram, diagnostics)) {
            return false;
        }
        return true;
    }

    bool reload(GlApi& api, const ShaderSources& sources, std::string& diagnostics) {
        // Candidate chỉ thay active program sau khi compile, link và uniform validation đều đạt.
        ProgramCandidate candidate{};
        if (!buildProgramCandidate(api, sources, candidate, diagnostics)) {
            return false;
        }
        const GLuint previousProgram = activeProgram.program;
        activeProgram = candidate;
        ++generation;
        if (previousProgram != 0U) {
            api.DeleteProgram(previousProgram);
        }
        diagnostics = "Ray-march shader reload succeeded.";
        return true;
    }

    void draw(
        GlApi& api,
        const RayMarchFrame& frame,
        int framebufferWidth,
        int framebufferHeight
    ) {
        api.UseProgram(activeProgram.program);
#if LAB_CHECKPOINT >= 1
        api.Uniform2f(
            activeProgram.resolutionLocation,
            float(framebufferWidth),
            float(framebufferHeight)
        );
#endif
#if LAB_CHECKPOINT >= 2
        const Vec3 position = cameraPosition(frame.camera);
        api.Uniform3f(
            activeProgram.cameraPositionLocation,
            float(position.x),
            float(position.y),
            float(position.z)
        );
        api.Uniform3f(
            activeProgram.cameraTargetLocation,
            float(frame.camera.target.x),
            float(frame.camera.target.y),
            float(frame.camera.target.z)
        );
#endif
#if LAB_CHECKPOINT >= 4
        api.Uniform1i(activeProgram.maximumStepsLocation, frame.maximumSteps);
        api.Uniform1f(activeProgram.hitEpsilonLocation, frame.hitEpsilon);
#endif
#if LAB_CHECKPOINT >= 8
        api.Uniform1f(activeProgram.timeLocation, frame.elapsedSeconds);
#endif
#if LAB_CHECKPOINT >= 9
        api.Uniform1i(activeProgram.debugViewLocation, frame.debugView);
#endif
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLES, 0, 3);
        api.BindVertexArray(0);
    }

    void destroy(GlApi& api) {
        destroyCandidate(api, activeProgram);
        if (vertexArray != 0U) {
            api.DeleteVertexArrays(1, &vertexArray);
        }
        vertexArray = 0U;
    }
};

} // namespace lab
