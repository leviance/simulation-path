#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "gl_api.hpp"
#include "pipeline.hpp"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

namespace lab {

// Checkpoint 2: shader compile và program link luôn trả diagnostics khi thất bại.
#if LAB_CHECKPOINT >= 2
inline constexpr const char* kTriangleVertexShader = R"glsl(#version 330 core
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec3 aColor;

uniform float uAngle;
uniform float uScale;
uniform vec2 uTranslation;

out vec3 vColor;

void main() {
    float cosine = cos(uAngle);
    float sine = sin(uAngle);
    vec2 rotated = vec2(
        aPosition.x * cosine - aPosition.y * sine,
        aPosition.x * sine + aPosition.y * cosine
    );
    vec2 ndc = rotated * uScale + uTranslation;
    gl_Position = vec4(ndc, 0.0, 1.0);
    vColor = aColor;
}
)glsl";

inline constexpr const char* kTriangleFragmentShader = R"glsl(#version 330 core
in vec3 vColor;
uniform int uSmoothColor;
out vec4 fragmentColor;

void main() {
    vec3 solidColor = vec3(0.38, 0.68, 0.94);
    vec3 selectedColor = solidColor;
    if (uSmoothColor != 0) {
        selectedColor = vColor;
    }
    fragmentColor = vec4(selectedColor, 1.0);
}
)glsl";

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

inline GLuint compileShader(
    GlApi& api,
    GLenum shaderType,
    const char* source,
    const char* stageName,
    std::string& diagnostics
) {
    const GLuint shader = api.CreateShader(shaderType);
    if (shader == 0U) {
        diagnostics = std::string(stageName) + ": glCreateShader returned 0";
        return 0U;
    }
    api.ShaderSource(shader, 1, &source, nullptr);
    api.CompileShader(shader);
    GLint compiled = GL_FALSE;
    api.GetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }
    diagnostics = std::string(stageName) + " compile failed:\n" + shaderInfoLog(api, shader);
    api.DeleteShader(shader);
    return 0U;
}

inline GLuint createProgram(
    GlApi& api,
    const char* vertexSource,
    const char* fragmentSource,
    std::string& diagnostics
) {
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
#endif

// Checkpoint 3: program, VBO và VAO tách riêng để từng resource có lifecycle nhìn thấy được.
#if LAB_CHECKPOINT >= 2
struct GpuTriangleRenderer {
    GLuint program{};
    GLuint vertexArray{};
    GLuint vertexBuffer{};
    GLint angleLocation{-1};
    GLint scaleLocation{-1};
    GLint translationLocation{-1};
    GLint smoothColorLocation{-1};

    bool initializeProgram(GlApi& api, std::string& diagnostics) {
        program = createProgram(api, kTriangleVertexShader, kTriangleFragmentShader, diagnostics);
        if (program == 0U) {
            return false;
        }
        angleLocation = api.GetUniformLocation(program, "uAngle");
        scaleLocation = api.GetUniformLocation(program, "uScale");
        translationLocation = api.GetUniformLocation(program, "uTranslation");
        smoothColorLocation = api.GetUniformLocation(program, "uSmoothColor");
        const bool locationsValid = angleLocation >= 0 && scaleLocation >= 0 && translationLocation >= 0 && smoothColorLocation >= 0;
        if (!locationsValid) {
            diagnostics = "triangle program is missing one or more required uniforms";
        }
        return locationsValid;
    }

#if LAB_CHECKPOINT >= 3
    bool initializeMesh(GlApi& api) {
        api.GenVertexArrays(1, &vertexArray);
        api.GenBuffers(1, &vertexBuffer);
        if (vertexArray == 0U || vertexBuffer == 0U) {
            return false;
        }
        api.BindVertexArray(vertexArray);
        api.BindBuffer(GL_ARRAY_BUFFER, vertexBuffer);
        api.BufferData(GL_ARRAY_BUFFER, GLsizeiptr(sizeof(kSourceTriangle)), kSourceTriangle.data(), GL_STATIC_DRAW);
        api.EnableVertexAttribArray(0U);
        api.VertexAttribPointer(
            0U,
            2,
            GL_FLOAT,
            GL_FALSE,
            GLsizei(sizeof(GpuVertex)),
            reinterpret_cast<const void*>(offsetof(GpuVertex, positionX))
        );
        api.EnableVertexAttribArray(1U);
        api.VertexAttribPointer(
            1U,
            3,
            GL_FLOAT,
            GL_FALSE,
            GLsizei(sizeof(GpuVertex)),
            reinterpret_cast<const void*>(offsetof(GpuVertex, red))
        );
        api.BindBuffer(GL_ARRAY_BUFFER, 0U);
        api.BindVertexArray(0U);
        return api.GetError() == GL_NO_ERROR;
    }

    void draw(GlApi& api, const Transform2D& transform, bool smoothColor) const {
        api.UseProgram(program);
        api.Uniform1f(angleLocation, transform.angleRadians);
        api.Uniform1f(scaleLocation, transform.scale);
        api.Uniform2f(translationLocation, transform.translation.x, transform.translation.y);
        int smoothColorFlag = 0;
        if (smoothColor) {
            smoothColorFlag = 1;
        }
        api.Uniform1i(smoothColorLocation, smoothColorFlag);
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLES, 0, 3);
        api.BindVertexArray(0U);
    }
#endif

    void destroy(GlApi& api) {
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

// Checkpoint 4: presenter chỉ upload framebuffer CPU và vẽ một texture quad.
#if LAB_CHECKPOINT >= 4
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
        api.TexSubImage2D(
            GL_TEXTURE_2D,
            0,
            0,
            0,
            framebuffer.width,
            framebuffer.height,
            GL_RGBA,
            GL_UNSIGNED_BYTE,
            framebuffer.rgba.data()
        );
    }

    void draw(GlApi& api) const {
        api.UseProgram(program);
        api.ActiveTexture(GL_TEXTURE0);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.Uniform1i(textureLocation, 0);
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLE_STRIP, 0, 4);
        api.BindVertexArray(0U);
        api.BindTexture(GL_TEXTURE_2D, 0U);
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

// Checkpoint 8: probe readback so màu nội thất, không dùng edge coverage làm pass/fail.
#if LAB_CHECKPOINT >= 8
struct GpuProbeReadback {
    bool inside{};
    int pixelX{};
    int pixelY{};
    Color expected{};
    Color actual{};
    float maximumDifference{std::numeric_limits<float>::infinity()};
};

inline GpuProbeReadback readGpuProbe(
    GlApi& api,
    const Viewport& viewport,
    const Transform2D& transform,
    Vec2 pointNdc,
    bool smoothColor
) {
    GpuProbeReadback result{};
    const BarycentricSample expectedSample = sampleTriangleAtNdc(kSourceTriangle, transform, pointNdc, smoothColor);
    result.inside = expectedSample.inside;
    result.expected = quantizeRgba8(expectedSample.color);
    const Vec2 windowPoint = ndcToGpuWindow(pointNdc, viewport);
    result.pixelX = std::clamp(int(std::floor(windowPoint.x)), viewport.x, viewport.x + viewport.width - 1);
    result.pixelY = std::clamp(int(std::floor(windowPoint.y)), viewport.y, viewport.y + viewport.height - 1);
    std::array<std::uint8_t, 4> pixel{};
    api.ReadPixels(result.pixelX, result.pixelY, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel.data());
    result.actual = {
        float(pixel[0]) / 255.0F,
        float(pixel[1]) / 255.0F,
        float(pixel[2]) / 255.0F,
    };
    result.maximumDifference = maximumColorDifference(result.expected, result.actual);
    return result;
}
#endif

} // namespace lab
