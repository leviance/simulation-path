#pragma once

#include "cloth_camera.hpp"
#include "cloth_gpu.hpp"
#include "cloth_program.hpp"

#include <cstddef>
#include <filesystem>
#include <vector>

namespace cloth {

struct DrawVertex {
    Vec3 position{};
    Vec3 color{};
};

struct SceneMesh {
    GLuint vao{};
    GLuint buffer{};
    GLsizei count{};
};

class SceneRenderer {
    GLuint clothProgram_{}, sceneProgram_{}, overlayProgram_{};
    GLuint clothVao_{}, overlayVao_{}, overlayBuffer_{};
    SceneMesh floor_{}, sphere_{}, capsule_{};
    Settings cached_{};
    bool cacheValid_{};

    void upload(GlApi& gl, SceneMesh& mesh, const std::vector<DrawVertex>& vertices) {
        if (mesh.vao == 0U) {
            gl.GenVertexArrays(1, &mesh.vao);
            gl.GenBuffers(1, &mesh.buffer);
            gl.BindVertexArray(mesh.vao);
            gl.BindBuffer(GL_ARRAY_BUFFER, mesh.buffer);
            gl.EnableVertexAttribArray(0);
            gl.EnableVertexAttribArray(1);
            gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), nullptr);
            gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, color)));
        }
        gl.BindBuffer(GL_ARRAY_BUFFER, mesh.buffer);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(DrawVertex)), vertices.data(), GL_STATIC_DRAW);
        mesh.count = static_cast<GLsizei>(vertices.size());
    }

    std::vector<DrawVertex> roundMesh(Vec3 a, Vec3 b, float radius, bool capsule) {
        const Vec3 axis = normalized(b - a);
        Vec3 right = cross(axis, {0.0F, 1.0F, 0.0F});
        if (length(right) < 0.1F) {
            right = cross(axis, {1.0F, 0.0F, 0.0F});
        }
        right = normalized(right);
        const Vec3 forward = cross(right, axis);
        std::vector<DrawVertex> rings{};
        constexpr unsigned segments = 32U;
        constexpr unsigned latitude = 12U;
        for (unsigned half = 0U; half < 2U; ++half) {
            for (unsigned row = 0U; row <= latitude; ++row) {
                const float theta = (half + static_cast<float>(row) / latitude) * 1.57079633F;
                Vec3 center = a;
                if (capsule && half == 0U) {
                    center = b;
                }
                for (unsigned column = 0U; column <= segments; ++column) {
                    const float phi = column * 6.2831853F / segments;
                    const Vec3 normal = axis * std::cos(theta) + (right * std::cos(phi) + forward * std::sin(phi)) * std::sin(theta);
                    rings.push_back({center + normal * radius, normal});
                }
            }
        }
        std::vector<DrawVertex> vertices{};
        const unsigned rows = 2U * (latitude + 1U);
        for (unsigned row = 0U; row + 1U < rows; ++row) {
            for (unsigned column = 0U; column < segments; ++column) {
                const unsigned index = row * (segments + 1U) + column;
                for (unsigned offset : {0U, segments + 1U, 1U, 1U, segments + 1U, segments + 2U}) {
                    vertices.push_back(rings[index + offset]);
                }
            }
        }
        return vertices;
    }

    void updateObstacles(GlApi& gl, const Settings& settings) {
        if (!cacheValid_ || settings.floorHeight != cached_.floorHeight) {
            const float y = settings.floorHeight - 0.001F;
            const std::vector<DrawVertex> floor{{{-12, y, -12}, {0, 1, 0}}, {{12, y, 12}, {0, 1, 0}}, {{12, y, -12}, {0, 1, 0}}, {{-12, y, -12}, {0, 1, 0}}, {{-12, y, 12}, {0, 1, 0}}, {{12, y, 12}, {0, 1, 0}}};
            upload(gl, floor_, floor);
        }
        if (!cacheValid_ || length(settings.sphereCenter - cached_.sphereCenter) != 0.0F || settings.sphereRadius != cached_.sphereRadius) {
            upload(gl, sphere_, roundMesh(settings.sphereCenter, settings.sphereCenter + Vec3{0, 1, 0}, settings.sphereRadius, false));
        }
        if (!cacheValid_ || length(settings.capsuleA - cached_.capsuleA) != 0.0F || length(settings.capsuleB - cached_.capsuleB) != 0.0F || settings.capsuleRadius != cached_.capsuleRadius) {
            upload(gl, capsule_, roundMesh(settings.capsuleA, settings.capsuleB, settings.capsuleRadius, true));
        }
        cached_ = settings;
        cacheValid_ = true;
    }

    public:
    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        clothProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "cloth.vert"}, {GL_FRAGMENT_SHADER, directory / "cloth.frag"}}, error);
        sceneProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "scene.vert"}, {GL_FRAGMENT_SHADER, directory / "scene.frag"}}, error);
        overlayProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "overlay.vert"}, {GL_FRAGMENT_SHADER, directory / "overlay.frag"}}, error);
        if (clothProgram_ == 0U || sceneProgram_ == 0U || overlayProgram_ == 0U) {
            return false;
        }
        gl.GenVertexArrays(1, &clothVao_);
        gl.GenVertexArrays(1, &overlayVao_);
        gl.GenBuffers(1, &overlayBuffer_);
        gl.BindVertexArray(overlayVao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, overlayBuffer_);
        gl.EnableVertexAttribArray(0);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), nullptr);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, color)));
        return gl.GetError() == GL_NO_ERROR;
    }

    void drawVertices(GlApi& gl, const std::vector<DrawVertex>& vertices, GLenum kind, const Mat4& matrix) {
        if (vertices.empty()) {
            return;
        }
        gl.UseProgram(overlayProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(overlayProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.BindVertexArray(overlayVao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, overlayBuffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(DrawVertex)), vertices.data(), GL_STREAM_DRAW);
        gl.DrawArrays(kind, 0, static_cast<GLsizei>(vertices.size()));
    }

    void draw(GlApi& gl, GpuCloth& gpu, const Settings& settings, const Camera& camera, int width, int height, bool wire, bool strain, bool points, unsigned selected) {
        const Mat4 matrix = camera.viewProjection(static_cast<float>(width) / std::max(height, 1));
        updateObstacles(gl, settings);
        gl.UseProgram(sceneProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(sceneProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.Uniform1i(gl.GetUniformLocation(sceneProgram_, "uGrid"), 1);
        gl.Uniform3f(gl.GetUniformLocation(sceneProgram_, "uColor"), 0.2F, 0.28F, 0.33F);
        gl.BindVertexArray(floor_.vao);
        gl.DrawArrays(GL_TRIANGLES, 0, floor_.count);
        gl.Uniform1i(gl.GetUniformLocation(sceneProgram_, "uGrid"), 0);
        gl.Uniform3f(gl.GetUniformLocation(sceneProgram_, "uColor"), 0.55F, 0.48F, 0.32F);
        gl.BindVertexArray(sphere_.vao);
        gl.DrawArrays(GL_TRIANGLES, 0, sphere_.count);
        gl.Uniform3f(gl.GetUniformLocation(sceneProgram_, "uColor"), 0.38F, 0.41F, 0.47F);
        gl.BindVertexArray(capsule_.vao);
        gl.DrawArrays(GL_TRIANGLES, 0, capsule_.count);

        gl.UseProgram(clothProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(clothProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        const Vec3 eye = camera.eye();
        gl.Uniform3f(gl.GetUniformLocation(clothProgram_, "uEye"), eye.x, eye.y, eye.z);
        gl.Uniform1ui(gl.GetUniformLocation(clothProgram_, "uSide"), settings.side);
        gl.Uniform1ui(gl.GetUniformLocation(clothProgram_, "uSelected"), selected);
        gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uStrain"), static_cast<int>(strain));
        gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uUseNormals"), 0);
#if LAB_CHECKPOINT >= 11
        gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uUseNormals"), 1);
#endif
        gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uWire"), 0);
        gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uPoints"), 0);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, gpu.positionBuffer());
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, gpu.normalBuffer());
        gl.BindVertexArray(clothVao_);
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, gpu.indexBuffer());
        if (wire) {
            gl.Enable(GL_POLYGON_OFFSET_FILL);
            gl.PolygonOffset(1.0F, 1.0F);
        }
        gl.DrawElements(GL_TRIANGLES, static_cast<GLsizei>(gpu.topology().indices.size()), GL_UNSIGNED_INT, nullptr);
        gl.Disable(GL_POLYGON_OFFSET_FILL);
        if (wire) {
            gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uWire"), 1);
            gl.PolygonMode(GL_FRONT_AND_BACK, GL_LINE);
            gl.DrawElements(GL_TRIANGLES, static_cast<GLsizei>(gpu.topology().indices.size()), GL_UNSIGNED_INT, nullptr);
            gl.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
        }
        if (points) {
            gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uPoints"), 1);
            const unsigned count = settings.side * settings.side;
            const unsigned stride = std::max(1U, count / 2048U);
            gl.Uniform1ui(gl.GetUniformLocation(clothProgram_, "uPointStride"), stride);
            gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>((count - 1U) / stride + 1U));
        }
    }

    void destroy(GlApi& gl) {
        // All names are released before the context, including partially built scenes.
        for (const SceneMesh mesh : {floor_, sphere_, capsule_}) {
            gl.DeleteVertexArrays(1, &mesh.vao);
            gl.DeleteBuffers(1, &mesh.buffer);
        }
        gl.DeleteVertexArrays(1, &clothVao_);
        gl.DeleteVertexArrays(1, &overlayVao_);
        gl.DeleteBuffers(1, &overlayBuffer_);
        for (GLuint program : {clothProgram_, sceneProgram_, overlayProgram_}) {
            if (program != 0U) {
                gl.DeleteProgram(program);
            }
        }
    }
};

} // namespace cloth
