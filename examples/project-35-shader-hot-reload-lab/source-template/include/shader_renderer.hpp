#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include "gl_api.hpp"
#include "pipeline.hpp"

#include <array>
#include <cstddef>
#include <string>
#include <string_view>
#include <vector>

namespace lab {

// This renderer owns both the cube mesh and the last program that linked
// successfully. A failed edit is compiled into a temporary candidate and must
// never replace activeProgram, which keeps the window useful while debugging.
inline constexpr std::string_view kEmbeddedVertexShader = R"GLSL(#version 330 core
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aColor;
uniform mat4 uMvp;
out vec3 vColor;
out vec3 vLocalPosition;
void main() {
    vColor = aColor;
    vLocalPosition = aPosition;
    gl_Position = uMvp * vec4(aPosition, 1.0);
}
)GLSL";

inline constexpr std::string_view kEmbeddedFragmentShader = R"GLSL(#version 330 core
in vec3 vColor;
in vec3 vLocalPosition;
out vec4 fragColor;
void main() {
    fragColor = vec4(vColor, 1.0);
}
)GLSL";

#if LAB_CHECKPOINT >= 2
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
#endif

#if LAB_CHECKPOINT >= 3
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
#endif

inline GLuint compileShader(GlApi& api, GLenum type, const std::string& source, std::string_view label, std::string& diagnostics) {
    const GLuint shader = api.CreateShader(type);
    if (shader == 0U) {
        diagnostics = std::string(label) + ": glCreateShader returned 0.";
        return 0;
    }
    const GLchar* sourcePointer = source.c_str();
    api.ShaderSource(shader, 1, &sourcePointer, nullptr);
    api.CompileShader(shader);
    GLint compiled = GL_FALSE;
    api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }
#if LAB_CHECKPOINT >= 2
    diagnostics = std::string(label) + " compile failed:\n" + shaderInfoLog(api, shader);
#else
    diagnostics = std::string(label) + " compile failed.";
#endif
    api.DeleteShader(shader);
    return 0;
}

struct ProgramCandidate {
    GLuint program{};
    GLint mvpLocation{-1};
    GLint timeLocation{-1};
    GLint resolutionLocation{-1};
    GLint mouseLocation{-1};
};

inline void destroyProgramCandidate(GlApi& api, ProgramCandidate& candidate) {
    if (candidate.program != 0U) {
        api.DeleteProgram(candidate.program);
    }
    candidate = {};
}

inline bool buildProgramCandidate(GlApi& api, const ShaderSources& sources, ProgramCandidate& candidate, std::string& diagnostics) {
    diagnostics.clear();
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT >= 6
    const bool requireLiveUniforms = true;
#else
    const bool requireLiveUniforms = false;
#endif
    diagnostics = validateShaderInterface(sources, requireLiveUniforms);
    if (!diagnostics.empty()) {
        return false;
    }
#endif

    const GLuint vertexShader = compileShader(api, GL_VERTEX_SHADER, sources.vertex, "lab.vert", diagnostics);
    if (vertexShader == 0U) {
        return false;
    }
    const GLuint fragmentShader = compileShader(api, GL_FRAGMENT_SHADER, sources.fragment, "lab.frag", diagnostics);
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
#if LAB_CHECKPOINT >= 3
        diagnostics = "Program link failed:\n" + programInfoLog(api, candidate.program);
#else
        diagnostics = "Program link failed.";
#endif
        destroyProgramCandidate(api, candidate);
        return false;
    }

    candidate.mvpLocation = api.GetUniformLocation(candidate.program, "uMvp");
    candidate.timeLocation = api.GetUniformLocation(candidate.program, "uTime");
    candidate.resolutionLocation = api.GetUniformLocation(candidate.program, "uResolution");
    candidate.mouseLocation = api.GetUniformLocation(candidate.program, "uMouse");
    if (candidate.mvpLocation < 0) {
        diagnostics = "Linked program does not expose required uniform uMvp.";
        destroyProgramCandidate(api, candidate);
        return false;
    }
#if LAB_CHECKPOINT >= 6
    if (candidate.timeLocation < 0 || candidate.resolutionLocation < 0 || candidate.mouseLocation < 0) {
        diagnostics = "Linked program does not expose uTime, uResolution and uMouse.";
        destroyProgramCandidate(api, candidate);
        return false;
    }
#endif
    return true;
}

struct ShaderLabRenderer {
    GLuint vertexArray{};
    GLuint vertexBuffer{};
    GLuint elementBuffer{};
    ProgramCandidate activeProgram{};
#if LAB_CHECKPOINT >= 4
    ReloadState reloadState{};
#endif

    bool initializeMesh(GlApi& api, std::string& diagnostics) {
        api.GenVertexArrays(1, &vertexArray);
        api.GenBuffers(1, &vertexBuffer);
        api.GenBuffers(1, &elementBuffer);
        if (vertexArray == 0U || vertexBuffer == 0U || elementBuffer == 0U) {
            diagnostics = "Cannot create cube VAO, VBO or EBO.";
            return false;
        }
        api.BindVertexArray(vertexArray);
        api.BindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
        api.BufferData(GL_ARRAY_BUFFER, GLsizeiptr(sizeof(kCubeVertices)), kCubeVertices.data(), GL_STATIC_DRAW);
        api.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, elementBuffer);
        api.BufferData(GL_ELEMENT_ARRAY_BUFFER, GLsizeiptr(sizeof(kCubeIndices)), kCubeIndices.data(), GL_STATIC_DRAW);
        api.EnableVertexAttribArray(0);
        api.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(ShaderVertex)), reinterpret_cast<void*>(offsetof(ShaderVertex, positionX)));
        api.EnableVertexAttribArray(1);
        api.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(ShaderVertex)), reinterpret_cast<void*>(offsetof(ShaderVertex, red)));
        api.BindVertexArray(0);
        return true;
    }

    bool initialize(GlApi& api, const ShaderSources& sources, std::string& diagnostics) {
        if (!initializeMesh(api, diagnostics)) {
            return false;
        }
        if (!buildProgramCandidate(api, sources, activeProgram, diagnostics)) {
            return false;
        }
#if LAB_CHECKPOINT >= 4
        reloadState.activeFingerprint = fingerprintShaderSources(sources);
        reloadState.candidateFingerprint = reloadState.activeFingerprint;
#endif
        return true;
    }

    bool initializeEmbedded(GlApi& api, std::string& diagnostics) {
        const ShaderSources sources{std::string(kEmbeddedVertexShader), std::string(kEmbeddedFragmentShader)};
        return initialize(api, sources, diagnostics);
    }

#if LAB_CHECKPOINT >= 4
    bool reload(GlApi& api, const ShaderSources& sources, std::string& diagnostics) {
        // Treat reload as a transaction: prepare everything first, commit only
        // after compile, link and interface validation have all succeeded.
        ProgramCandidate candidate{};
        const std::uint64_t fingerprint = fingerprintShaderSources(sources);
        if (!buildProgramCandidate(api, sources, candidate, diagnostics)) {
            recordReloadAttempt(reloadState, fingerprint, false);
            return false;
        }

        const GLuint previousProgram = activeProgram.program;
        activeProgram = candidate;
        recordReloadAttempt(reloadState, fingerprint, true);
        if (previousProgram != 0U) {
            api.DeleteProgram(previousProgram);
        }
        diagnostics = "Reload succeeded; candidate became the active program.";
        return true;
    }
#endif

    void draw(GlApi& api, const Mat4& mvp, const ShaderScene& scene, int framebufferWidth, int framebufferHeight) {
        api.Enable(GL_DEPTH_TEST);
        api.DepthFunc(GL_LESS);
        api.Enable(GL_CULL_FACE);
        api.CullFace(GL_BACK);
        api.FrontFace(GL_CCW);
        api.UseProgram(activeProgram.program);
        api.UniformMatrix4fv(activeProgram.mvpLocation, 1, GL_FALSE, mvp.values.data());
#if LAB_CHECKPOINT >= 6
        api.Uniform1f(activeProgram.timeLocation, scene.elapsedSeconds);
        api.Uniform2f(activeProgram.resolutionLocation, float(framebufferWidth), float(framebufferHeight));
        api.Uniform2f(activeProgram.mouseLocation, scene.mouseX, scene.mouseY);
#else
        static_cast<void>(scene);
        static_cast<void>(framebufferWidth);
        static_cast<void>(framebufferHeight);
#endif
        api.BindVertexArray(vertexArray);
        api.DrawElements(GL_TRIANGLES, GLsizei(kCubeIndices.size()), GL_UNSIGNED_INT, nullptr);
        api.BindVertexArray(0);
    }

    void destroy(GlApi& api) {
        if (activeProgram.program != 0U) {
            api.DeleteProgram(activeProgram.program);
        }
        if (elementBuffer != 0U) {
            api.DeleteBuffers(1, &elementBuffer);
        }
        if (vertexBuffer != 0U) {
            api.DeleteBuffers(1, &vertexBuffer);
        }
        if (vertexArray != 0U) {
            api.DeleteVertexArrays(1, &vertexArray);
        }
        activeProgram = {};
        elementBuffer = 0;
        vertexBuffer = 0;
        vertexArray = 0;
    }
};

} // namespace lab
