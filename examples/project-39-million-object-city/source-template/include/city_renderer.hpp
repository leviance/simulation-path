#pragma once

#include "city_camera.hpp"
#include "city_compute.hpp"
#include "city_mesh.hpp"
#include "city_program.hpp"

#include <array>
#include <cstddef>
#include <filesystem>
#include <vector>

namespace city {

struct DrawVertex {
    Vec3 position{};
    Vec3 color{};
};

class SceneRenderer {
    GLuint program_{};
    GLuint floorProgram_{};
    GLuint overlayProgram_{};
    GLuint vao_{}, vertexBuffer_{}, indexBuffer_{};
    GLuint lineVao_{}, lineBuffer_{};

    void appendTriangle(std::vector<DrawVertex>& vertices, Vec3 a, Vec3 b, Vec3 c) {
        const Vec3 normal = normalized(cross(b - a, c - a));
        for (Vec3 point : {a, b, c}) {
            vertices.push_back({point, normal});
        }
    }

    void appendBox(std::vector<DrawVertex>& vertices, float taper) {
        const auto corners = boxCorners(taper);
        const auto& indices = kBoxIndices;
        for (std::size_t i = 0; i < indices.size(); i += 3U) {
            appendTriangle(vertices, corners[indices[i]], corners[indices[i + 1U]], corners[indices[i + 2U]]);
        }
    }

    public:
    bool initialize(GlApi& gl, const std::filesystem::path& shaders, std::string& error) {
        program_ = buildProgram(gl, {{GL_VERTEX_SHADER, shaders / "city.vert"}, {GL_FRAGMENT_SHADER, shaders / "city.frag"}}, error);
        if (program_ == 0U) {
            return false;
        }
        floorProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, shaders / "floor.vert"}, {GL_FRAGMENT_SHADER, shaders / "floor.frag"}}, error);
        if (floorProgram_ == 0U) {
            return false;
        }
        overlayProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, shaders / "overlay.vert"}, {GL_FRAGMENT_SHADER, shaders / "overlay.frag"}}, error);
        if (overlayProgram_ == 0U) {
            return false;
        }
        std::vector<DrawVertex> vertices{};
        appendBox(vertices, 1.0F);
        appendBox(vertices, 0.55F);
        const auto& pyramid = kPyramidCorners;
        const auto& pyramidIndices = kPyramidIndices;
        for (std::size_t i = 0; i < pyramidIndices.size(); i += 3U) {
            appendTriangle(vertices, pyramid[pyramidIndices[i]], pyramid[pyramidIndices[i + 1U]], pyramid[pyramidIndices[i + 2U]]);
        }
        // One mesh atlas: 36 cube, 36 tapered tower and 18 pyramid indices.
        std::vector<unsigned> indices(vertices.size());
        for (unsigned i = 0; i < indices.size(); ++i) {
            indices[i] = i;
        }
        gl.GenVertexArrays(1, &vao_);
        gl.GenBuffers(1, &vertexBuffer_);
        gl.GenBuffers(1, &indexBuffer_);
        gl.BindVertexArray(vao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, vertexBuffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(DrawVertex)), vertices.data(), GL_STATIC_DRAW);
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffer_);
        gl.BufferData(GL_ELEMENT_ARRAY_BUFFER, static_cast<GLsizeiptr>(indices.size() * sizeof(unsigned)), indices.data(), GL_STATIC_DRAW);
        gl.EnableVertexAttribArray(0);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), nullptr);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, color)));
        gl.GenVertexArrays(1, &lineVao_);
        gl.GenBuffers(1, &lineBuffer_);
        gl.BindVertexArray(lineVao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl.EnableVertexAttribArray(0);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), nullptr);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, color)));
        return gl.GetError() == GL_NO_ERROR;
    }

    void drawVertices(GlApi& gl, const std::vector<DrawVertex>& vertices, GLenum kind, Mat4 matrix) {
        if (vertices.empty()) {
            return;
        }
        gl.UseProgram(overlayProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(overlayProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.BindVertexArray(lineVao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(DrawVertex)), vertices.data(), GL_STREAM_DRAW);
        gl.DrawArrays(kind, 0, static_cast<GLsizei>(vertices.size()));
    }

    void draw(GlApi& gl, CityGpu& gpu, const Camera& view, const Frustum& mainFrustum, int width, int height, bool debug, unsigned selected, bool observer = false) {
        const Mat4 matrix = view.viewProjection(static_cast<float>(width) / std::max(height, 1));
        const float side = std::ceil(std::sqrt(static_cast<float>(std::max(gpu.count(), std::size_t{1}))));
        const std::vector<DrawVertex> floor{{{-30000, -0.05F, -30000}, {}}, {{30000, -0.05F, -30000}, {}}, {{30000, -0.05F, 30000}, {}}, {{-30000, -0.05F, -30000}, {}}, {{30000, -0.05F, 30000}, {}}, {{-30000, -0.05F, 30000}, {}}};
        gl.UseProgram(floorProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(floorProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.Uniform1f(gl.GetUniformLocation(floorProgram_, "uCityOffset"), side * 10.875F);
        gl.BindVertexArray(lineVao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(floor.size() * sizeof(DrawVertex)), floor.data(), GL_STREAM_DRAW);
        gl.DrawArrays(GL_TRIANGLES, 0, 6);
        gl.UseProgram(program_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(program_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.Uniform3f(gl.GetUniformLocation(program_, "uEye"), view.position.x, view.position.y, view.position.z);
        gl.Uniform4fv(gl.GetUniformLocation(program_, "uPlanes"), 6, &mainFrustum[0].x);
        gl.Uniform1i(gl.GetUniformLocation(program_, "uDebug"), static_cast<int>(debug));
        gl.Uniform1ui(gl.GetUniformLocation(program_, "uSelected"), selected);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, gpu.objectsBuffer());
        GLuint visible = gpu.visibleBuffer();
        GLuint statistics = gpu.drawStatsBuffer();
        GLuint commands = gpu.commandsBuffer();
        if (observer) {
            visible = gpu.identityVisibleBuffer();
            statistics = gpu.identityStatsBuffer();
            commands = gpu.identityCommandsBuffer();
        }
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, visible);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, statistics);
        gl.BindVertexArray(vao_);
        gl.BindBuffer(GL_DRAW_INDIRECT_BUFFER, commands);
        for (unsigned group = 0; group < 3U; ++group) {
            gl.Uniform1ui(gl.GetUniformLocation(program_, "uGroup"), group);
            gl.DrawElementsIndirect(GL_TRIANGLES, GL_UNSIGNED_INT, reinterpret_cast<void*>(static_cast<std::uintptr_t>(group) * sizeof(IndirectCommand)));
        }
    }

    void destroy(GlApi& gl) {
        // Delete while the context is still current, before SDL destroys the window.
        for (const GLuint buffer : {vertexBuffer_, indexBuffer_, lineBuffer_}) {
            if (buffer != 0U) {
                gl.DeleteBuffers(1, &buffer);
            }
        }
        for (const GLuint vao : {vao_, lineVao_}) {
            if (vao != 0U) {
                gl.DeleteVertexArrays(1, &vao);
            }
        }
        for (const GLuint program : {program_, floorProgram_, overlayProgram_}) {
            if (program != 0U) {
                gl.DeleteProgram(program);
            }
        }
    }

    void drawBounds(GlApi& gl, const Object& object, const Camera& camera, int width, int height) {
        std::vector<DrawVertex> lines{};
        const Vec3 color{1.0F, 0.8F, 0.2F};
        const Vec3 middle = center(object);
        for (int axis = 0; axis < 3; ++axis) {
            for (int edge = 0; edge < 4; ++edge) {
                Vec3 a{-object.halfX, -object.halfY, -object.halfZ};
                Vec3 b = a;
                if (axis == 0) {
                    a.y = b.y = object.halfY * (2 * (edge & 1) - 1);
                    a.z = b.z = object.halfZ * (2 * ((edge >> 1) & 1) - 1);
                    b.x = object.halfX;
                }
                if (axis == 1) {
                    a.x = b.x = object.halfX * (2 * (edge & 1) - 1);
                    a.z = b.z = object.halfZ * (2 * ((edge >> 1) & 1) - 1);
                    b.y = object.halfY;
                }
                if (axis == 2) {
                    a.x = b.x = object.halfX * (2 * (edge & 1) - 1);
                    a.y = b.y = object.halfY * (2 * ((edge >> 1) & 1) - 1);
                    b.z = object.halfZ;
                }
                lines.push_back({middle + a, color});
                lines.push_back({middle + b, color});
            }
        }
        // Three circles display the actual conservative sphere used by culling/picking.
        for (unsigned ring = 0; ring < 3U; ++ring) {
            for (unsigned step = 0; step < 48U; ++step) {
                for (unsigned endpoint = 0; endpoint < 2U; ++endpoint) {
                    const float angle = (step + endpoint) * 6.2831853F / 48.0F;
                    Vec3 point{std::cos(angle) * object.centerRadius.w, std::sin(angle) * object.centerRadius.w, 0.0F};
                    if (ring == 1U) {
                        std::swap(point.x, point.z);
                    }
                    if (ring == 2U) {
                        std::swap(point.y, point.z);
                    }
                    lines.push_back({middle + point, color});
                }
            }
        }
        drawVertices(gl, lines, GL_LINES, camera.viewProjection(static_cast<float>(width) / std::max(height, 1)));
    }

    void drawFrustum(GlApi& gl, const Camera& main, float mainAspect, const Camera& observer, int width, int height) {
        const float reach = main.farPlane;
        const Vec3 origin = main.position;
        std::vector<DrawVertex> lines{};
        std::array<Vec3, 4> corners{};
        std::array<Vec3, 4> nearCorners{};
        const std::array<Vec3, 4> screen{{{-1, -1, 0}, {1, -1, 0}, {1, 1, 0}, {-1, 1, 0}}};
        for (std::size_t i = 0; i < corners.size(); ++i) {
            const Vec3 direction = main.ray(screen[i].x, screen[i].y, mainAspect);
            corners[i] = origin + direction * (reach / dot(direction, main.forward()));
            nearCorners[i] = origin + direction * (0.5F / dot(direction, main.forward()));
            lines.push_back({nearCorners[i], {1.0F, 0.77F, 0.3F}});
            lines.push_back({corners[i], {1.0F, 0.77F, 0.3F}});
        }
        for (std::size_t i = 0; i < corners.size(); ++i) {
            lines.push_back({corners[i], {1.0F, 0.77F, 0.3F}});
            lines.push_back({corners[(i + 1U) % corners.size()], {1.0F, 0.77F, 0.3F}});
            lines.push_back({nearCorners[i], {1.0F, 0.77F, 0.3F}});
            lines.push_back({nearCorners[(i + 1U) % corners.size()], {1.0F, 0.77F, 0.3F}});
        }
        gl.Disable(GL_DEPTH_TEST);
        drawVertices(gl, lines, GL_LINES, observer.viewProjection(static_cast<float>(width) / std::max(height, 1)));
        gl.Enable(GL_DEPTH_TEST);
    }
};

} // namespace city
