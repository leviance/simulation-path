#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "gl_api.hpp"
#include "pipeline.hpp"

#include <cstddef>
#include <string>
#include <vector>

namespace lab {

inline std::string shaderInfoLog(GlApi& api, GLuint shader) {
    GLint length = 0;
    api.GetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::vector<GLchar> characters(std::size_t(length), '\0');
    api.GetShaderInfoLog(shader, length, nullptr, characters.data());
    return std::string(characters.data());
}

inline std::string programInfoLog(GlApi& api, GLuint program) {
    GLint length = 0;
    api.GetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
    if (length <= 1) {
        return {};
    }
    std::vector<GLchar> characters(std::size_t(length), '\0');
    api.GetProgramInfoLog(program, length, nullptr, characters.data());
    return std::string(characters.data());
}

inline GLuint compileShader(GlApi& api, GLenum type, const char* source, const char* label, std::string& diagnostics) {
    const GLuint shader = api.CreateShader(type);
    if (shader == 0U) {
        diagnostics = std::string(label) + ": glCreateShader returned 0";
        return 0U;
    }
    api.ShaderSource(shader, 1, &source, nullptr);
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

inline GLuint createProgram(GlApi& api, const char* vertexSource, const char* fragmentSource, std::string& diagnostics) {
    const GLuint vertexShader = compileShader(api, GL_VERTEX_SHADER, vertexSource, "vertex shader", diagnostics);
    if (vertexShader == 0U) {
        return 0U;
    }
    const GLuint fragmentShader = compileShader(api, GL_FRAGMENT_SHADER, fragmentSource, "fragment shader", diagnostics);
    if (fragmentShader == 0U) {
        api.DeleteShader(vertexShader);
        return 0U;
    }
    const GLuint program = api.CreateProgram();
    if (program == 0U) {
        diagnostics = "glCreateProgram returned 0";
        api.DeleteShader(vertexShader);
        api.DeleteShader(fragmentShader);
        return 0U;
    }
    api.AttachShader(program, vertexShader);
    api.AttachShader(program, fragmentShader);
    api.LinkProgram(program);
    api.DeleteShader(vertexShader);
    api.DeleteShader(fragmentShader);

    GLint linked = GL_FALSE;
    api.GetProgramiv(program, GL_LINK_STATUS, &linked);
    if (linked == GL_TRUE) {
        diagnostics.clear();
        return program;
    }
    diagnostics = "program link failed:\n" + programInfoLog(api, program);
    api.DeleteProgram(program);
    return 0U;
}

inline constexpr const char* kTextureVertexShader = R"glsl(#version 330 core
out vec2 vUv;

void main() {
    vec2 positions[4] = vec2[4](
        vec2(-1.0, -1.0),
        vec2( 1.0, -1.0),
        vec2(-1.0,  1.0),
        vec2( 1.0,  1.0)
    );
    vec2 uvs[4] = vec2[4](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0)
    );
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
    vUv = vec2(uvs[gl_VertexID].x, 1.0 - uvs[gl_VertexID].y);
}
)glsl";

inline constexpr const char* kTextureFragmentShader = R"glsl(#version 330 core
in vec2 vUv;
uniform sampler2D uTexture;
out vec4 fragmentColor;

void main() {
    fragmentColor = texture(uTexture, vUv);
}
)glsl";

#if LAB_CHECKPOINT >= 4
inline constexpr const char* kCubeVertexShader = R"glsl(#version 330 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;

uniform mat4 uMvp;
out vec3 vColor;

void main() {
    gl_Position = uMvp * vec4(aPosition, 1.0);
    vColor = aColor;
}
)glsl";

inline constexpr const char* kCubeFragmentShader = R"glsl(#version 330 core
in vec3 vColor;
out vec4 fragmentColor;

void main() {
    fragmentColor = vec4(vColor, 1.0);
}
)glsl";

struct GpuCubeRenderer {
    GLuint program{};
    GLuint vertexArray{};
    GLuint vertexBuffer{};
    GLuint elementBuffer{};
    GLint mvpLocation{-1};

    bool initialize(GlApi& api, std::string& diagnostics) {
        program = createProgram(api, kCubeVertexShader, kCubeFragmentShader, diagnostics);
        if (program == 0U) {
            return false;
        }
        mvpLocation = api.GetUniformLocation(program, "uMvp");
        if (mvpLocation < 0) {
            diagnostics = "cube program is missing uMvp";
            return false;
        }

        api.GenVertexArrays(1, &vertexArray);
        api.GenBuffers(1, &vertexBuffer);
        api.GenBuffers(1, &elementBuffer);
        if (vertexArray == 0U || vertexBuffer == 0U || elementBuffer == 0U) {
            diagnostics = "VBO, EBO or VAO creation returned 0";
            return false;
        }

        api.BindVertexArray(vertexArray);
        api.BindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
        api.BufferData(GL_ARRAY_BUFFER, GLsizeiptr(sizeof(kCubeVertices)), kCubeVertices.data(), GL_STATIC_DRAW);
        api.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, elementBuffer);
        api.BufferData(GL_ELEMENT_ARRAY_BUFFER, GLsizeiptr(sizeof(kCubeIndices)), kCubeIndices.data(), GL_STATIC_DRAW);
        api.EnableVertexAttribArray(0U);
        api.VertexAttribPointer(0U, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(GpuCubeVertex)), reinterpret_cast<const void*>(offsetof(GpuCubeVertex, positionX)));
        api.EnableVertexAttribArray(1U);
        api.VertexAttribPointer(1U, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(GpuCubeVertex)), reinterpret_cast<const void*>(offsetof(GpuCubeVertex, red)));
        api.BindVertexArray(0U);
        api.BindBuffer(GL_ARRAY_BUFFER, 0U);
        return api.GetError() == GL_NO_ERROR;
    }

    void draw(GlApi& api, const Mat4& mvp, bool depthEnabled, bool cullingEnabled) const {
        if (depthEnabled) {
            api.Enable(GL_DEPTH_TEST);
            api.DepthFunc(GL_LESS);
        } else {
            api.Disable(GL_DEPTH_TEST);
        }
        if (cullingEnabled) {
            api.Enable(GL_CULL_FACE);
            api.CullFace(GL_BACK);
            api.FrontFace(GL_CCW);
        } else {
            api.Disable(GL_CULL_FACE);
        }
        api.UseProgram(program);
        api.UniformMatrix4fv(mvpLocation, 1, GL_FALSE, mvp.values.data());
        api.BindVertexArray(vertexArray);
        api.DrawElements(GL_TRIANGLES, GLsizei(kCubeIndices.size()), GL_UNSIGNED_INT, nullptr);
        api.BindVertexArray(0U);
    }

    void destroy(GlApi& api) {
        if (elementBuffer != 0U) {
            api.DeleteBuffers(1, &elementBuffer);
            elementBuffer = 0U;
        }
        if (vertexBuffer != 0U) {
            api.DeleteBuffers(1, &vertexBuffer);
            vertexBuffer = 0U;
        }
        if (vertexArray != 0U) {
            api.DeleteVertexArrays(1, &vertexArray);
            vertexArray = 0U;
        }
        if (program != 0U) {
            api.DeleteProgram(program);
            program = 0U;
        }
    }
};
#endif

#if LAB_CHECKPOINT >= 3
// CPU presenter chỉ upload framebuffer đã rasterize; nó không sở hữu mesh hay depth test.
struct CpuTexturePresenter {
    GLuint program{};
    GLuint vertexArray{};
    GLuint texture{};
    GLint textureLocation{-1};
    int width{};
    int height{};

    bool initialize(GlApi& api, std::string& diagnostics) {
        program = createProgram(api, kTextureVertexShader, kTextureFragmentShader, diagnostics);
        if (program == 0U) {
            return false;
        }
        textureLocation = api.GetUniformLocation(program, "uTexture");
        api.GenVertexArrays(1, &vertexArray);
        api.GenTextures(1, &texture);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        api.BindTexture(GL_TEXTURE_2D, 0U);
        return textureLocation >= 0 && vertexArray != 0U && texture != 0U;
    }

    void resize(GlApi& api, int nextWidth, int nextHeight) {
        width = std::max(1, nextWidth);
        height = std::max(1, nextHeight);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.PixelStorei(GL_UNPACK_ALIGNMENT, 1);
        api.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
        api.BindTexture(GL_TEXTURE_2D, 0U);
    }

    void upload(GlApi& api, const Framebuffer& framebuffer) const {
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.PixelStorei(GL_UNPACK_ALIGNMENT, 1);
        api.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, framebuffer.width, framebuffer.height, GL_RGBA, GL_UNSIGNED_BYTE, framebuffer.rgba.data());
    }

    void draw(GlApi& api) const {
        api.Disable(GL_DEPTH_TEST);
        api.Disable(GL_CULL_FACE);
        api.UseProgram(program);
        api.ActiveTexture(GL_TEXTURE0);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.Uniform1i(textureLocation, 0);
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLE_STRIP, 0, 4);
        api.BindVertexArray(0U);
    }

    void destroy(GlApi& api) {
        if (texture != 0U) {
            api.DeleteTextures(1, &texture);
            texture = 0U;
        }
        if (vertexArray != 0U) {
            api.DeleteVertexArrays(1, &vertexArray);
            vertexArray = 0U;
        }
        if (program != 0U) {
            api.DeleteProgram(program);
            program = 0U;
        }
    }
};
#endif

} // namespace lab
