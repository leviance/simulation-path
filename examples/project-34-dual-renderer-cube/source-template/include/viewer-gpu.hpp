#pragma once
#include "gpu_renderer.hpp"
#include "viewer-mesh.hpp"
#include "viewer-scene.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 4
inline constexpr const char* viewerVertexShader = R"glsl(#version 330 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uMvp;
uniform mat4 uModel;
flat out vec3 worldNormal;
void main() {
    gl_Position = uMvp * vec4(aPosition, 1.0);
    worldNormal = mat3(uModel) * aNormal;
}
)glsl";

inline constexpr const char* viewerFragmentShader = R"glsl(#version 330 core
flat in vec3 worldNormal;
uniform vec3 uLight;
uniform vec3 uBaseColor;
uniform int uLit;
out vec4 fragmentColor;
void main() {
    float intensity = 1.0;
    if (uLit != 0) {
        intensity = 0.22 + 0.78 * max(0.0, dot(normalize(worldNormal), normalize(uLight)));
    }
    fragmentColor = vec4(uBaseColor * intensity, 1.0);
}
)glsl";

struct GpuViewerProgram {
    GLuint program{};
    GLint mvp{-1}, model{-1}, light{-1}, baseColor{-1}, lit{-1};

    bool initialize(GlApi& gl, std::string& diagnostics, const char* feedbackVarying = nullptr) {
        program = createProgram(gl, viewerVertexShader, viewerFragmentShader, diagnostics, feedbackVarying);
        if (!program)
            return false;
        mvp = gl.GetUniformLocation(program, "uMvp");
        model = gl.GetUniformLocation(program, "uModel");
        light = gl.GetUniformLocation(program, "uLight");
        baseColor = gl.GetUniformLocation(program, "uBaseColor");
        lit = gl.GetUniformLocation(program, "uLit");
        if (mvp < 0 || model < 0 || light < 0 || baseColor < 0 || lit < 0) {
            diagnostics = "Viewer shader is missing a required uniform";
            return false;
        }
        return gl.GetError() == GL_NO_ERROR;
    }

    void bind(GlApi& gl, const ViewerMatrices& matrices, const ViewerScene& scene) const {
        gl.UseProgram(program);
        gl.UniformMatrix4fv(mvp, 1, GL_FALSE, matrices.mvp.values.data());
        gl.UniformMatrix4fv(model, 1, GL_FALSE, matrices.model.values.data());
        gl.Uniform3f(light, scene.lightX, scene.lightY, scene.lightZ);
        gl.Uniform3f(baseColor, scene.baseRed, scene.baseGreen, scene.baseBlue);
        gl.Uniform1i(lit, scene.lit ? 1 : 0);
    }

    void bindLine(GlApi& gl, const Mat4& matrix, Vec3 color) const {
        const auto identity = identityMatrix();
        gl.UseProgram(program);
        gl.UniformMatrix4fv(mvp, 1, GL_FALSE, matrix.values.data());
        gl.UniformMatrix4fv(model, 1, GL_FALSE, identity.values.data());
        gl.Uniform3f(baseColor, color.x, color.y, color.z);
        gl.Uniform1i(lit, 0);
    }

    void destroy(GlApi& gl) {
        if (program)
            gl.DeleteProgram(program);
        program = 0;
    }
};

struct GpuViewerLines {
    GLuint vao{}, buffer{};
    GLsizei count{};

    bool initialize(GlApi& gl, const std::vector<Vec3>& points) {
        gl.GenVertexArrays(1, &vao);
        gl.GenBuffers(1, &buffer);
        if (!vao || !buffer)
            return false;
        count = static_cast<GLsizei>(points.size());
        gl.BindVertexArray(vao);
        gl.BindBuffer(GL_ARRAY_BUFFER, buffer);
        gl.BufferData(GL_ARRAY_BUFFER, GLsizeiptr(points.size() * sizeof(Vec3)), points.data(), GL_STATIC_DRAW);
        gl.EnableVertexAttribArray(0);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(Vec3)), nullptr);
        gl.BindVertexArray(0);
        gl.BindBuffer(GL_ARRAY_BUFFER, 0);
        return gl.GetError() == GL_NO_ERROR;
    }

    void draw(GlApi& gl) const {
        gl.Disable(GL_CULL_FACE);
        gl.BindVertexArray(vao);
        gl.DrawArrays(GL_LINES, 0, count);
        gl.BindVertexArray(0);
    }

    void destroy(GlApi& gl) {
        if (vao)
            gl.DeleteVertexArrays(1, &vao);
        if (buffer)
            gl.DeleteBuffers(1, &buffer);
        vao = buffer = 0;
    }
};

struct GpuViewerMesh {
    GLuint vao{}, vertices{}, elements{}, reversedElements{};
    GLsizei indexCount{};
    GpuViewerLines normals{};

    bool initialize(GlApi& gl, const ViewerMesh& mesh) {
        if (!validViewerMesh(mesh))
            return false;
        gl.GenVertexArrays(1, &vao);
        gl.GenBuffers(1, &vertices);
        gl.GenBuffers(1, &elements);
        gl.GenBuffers(1, &reversedElements);
        if (!vao || !vertices || !elements || !reversedElements)
            return false;
        indexCount = static_cast<GLsizei>(mesh.indices.size());
        gl.BindVertexArray(vao);
        gl.BindBuffer(GL_ARRAY_BUFFER, vertices);
        gl.BufferData(GL_ARRAY_BUFFER, GLsizeiptr(mesh.vertices.size() * sizeof(MeshVertex)), mesh.vertices.data(), GL_STATIC_DRAW);
        gl.EnableVertexAttribArray(0);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(MeshVertex)), nullptr);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, GLsizei(sizeof(MeshVertex)), reinterpret_cast<const void*>(offsetof(MeshVertex, normalX)));
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, elements);
        gl.BufferData(GL_ELEMENT_ARRAY_BUFFER, GLsizeiptr(mesh.indices.size() * sizeof(std::uint32_t)), mesh.indices.data(), GL_STATIC_DRAW);
        std::vector<std::uint32_t> reversed;
        reversed.reserve(mesh.indices.size());
        std::vector<Vec3> normalLines;
        normalLines.reserve(mesh.triangleCount() * 2);
        for (std::size_t triangle = 0; triangle < mesh.triangleCount(); ++triangle) {
            const auto offset = (mesh.triangleCount() - 1 - triangle) * 3;
            reversed.push_back(mesh.indices[offset]);
            reversed.push_back(mesh.indices[offset + 1]);
            reversed.push_back(mesh.indices[offset + 2]);
            const auto& a = mesh.vertices[mesh.indices[triangle * 3]];
            const auto& b = mesh.vertices[mesh.indices[triangle * 3 + 1]];
            const auto& c = mesh.vertices[mesh.indices[triangle * 3 + 2]];
            const Vec3 center{(a.positionX + b.positionX + c.positionX) / 3, (a.positionY + b.positionY + c.positionY) / 3, (a.positionZ + b.positionZ + c.positionZ) / 3};
            normalLines.push_back(center);
            normalLines.push_back({center.x + a.normalX * 0.12F, center.y + a.normalY * 0.12F, center.z + a.normalZ * 0.12F});
        }
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, reversedElements);
        gl.BufferData(GL_ELEMENT_ARRAY_BUFFER, GLsizeiptr(reversed.size() * sizeof(std::uint32_t)), reversed.data(), GL_STATIC_DRAW);
        gl.BindVertexArray(0);
        gl.BindBuffer(GL_ARRAY_BUFFER, 0);
        return normals.initialize(gl, normalLines) && gl.GetError() == GL_NO_ERROR;
    }

    void draw(GlApi& gl, const GpuViewerProgram& program, const ViewerScene& scene, const ViewerMatrices& matrices) const {
        if (scene.depthEnabled) {
            gl.Enable(GL_DEPTH_TEST);
            gl.DepthFunc(GL_LESS);
        } else
            gl.Disable(GL_DEPTH_TEST);
        if (scene.view.cullBackfaces) {
            gl.Enable(GL_CULL_FACE);
            gl.CullFace(GL_BACK);
            gl.FrontFace(GL_CCW);
        } else
            gl.Disable(GL_CULL_FACE);
        gl.PolygonMode(GL_FRONT_AND_BACK, scene.view.wireframe ? GL_LINE : GL_FILL);
        program.bind(gl, matrices, scene);
        gl.BindVertexArray(vao);
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, scene.view.reverseOrder ? reversedElements : elements);
        gl.DrawElements(GL_TRIANGLES, indexCount, GL_UNSIGNED_INT, nullptr);
        gl.BindVertexArray(0);
        gl.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
        if (scene.view.normals) {
            program.bindLine(gl, matrices.mvp, {1, 201.0F / 255, 107.0F / 255});
            normals.draw(gl);
        }
    }

    void destroy(GlApi& gl) {
        normals.destroy(gl);
        if (vao)
            gl.DeleteVertexArrays(1, &vao);
        for (GLuint buffer : {vertices, elements, reversedElements}) {
            if (buffer)
                gl.DeleteBuffers(1, &buffer);
        }
        vao = vertices = elements = reversedElements = 0;
    }
};

inline std::vector<Vec3> viewerGridPoints() {
    std::vector<Vec3> result;
    for (int index = -6; index <= 6; ++index) {
        const float position = index * 0.5F;
        result.push_back({position, -1.1F, -3});
        result.push_back({position, -1.1F, 3});
        result.push_back({-3, -1.1F, position});
        result.push_back({3, -1.1F, position});
    }
    return result;
}
#endif
} // namespace lab
