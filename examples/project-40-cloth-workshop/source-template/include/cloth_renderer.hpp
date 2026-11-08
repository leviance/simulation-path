#pragma once

#include "cloth_camera.hpp"
#include "cloth_debug.hpp"
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

struct InteractionPreview {
    bool hasProbe{};
    Vec4 lastProbe{};
    std::uint32_t selected{noVertex};
    std::uint64_t probeStep{};
    std::uint64_t currentStep{};
    bool refreshPending{};
    bool dragging{};
    std::uint32_t dragId{noVertex};
    Vec3 dragTarget{};
    std::uint32_t pinId{noVertex};
    int pinAction{-1};
    bool contactRings{};

    bool valid() const {
        return hasProbe && selected != noVertex && finite(xyz(lastProbe))
            && std::isfinite(lastProbe.w);
    }

    std::uint64_t ageSteps() const {
        if (currentStep < probeStep) {
            return 0U;
        }
        return currentStep - probeStep;
    }

    bool stale() const {
        return refreshPending || currentStep != probeStep;
    }
};

inline void appendContactRadiusRings(std::vector<DrawVertex>& lines, Vec3 center, float thickness) {
    if (!finite(center) || !std::isfinite(thickness) || thickness <= 0.0F) {
        return;
    }
    // This radius is a world-space contact distance in metres, never enlarged for readability.
    // Three orthogonal circles show the vertex-pair predicate distance 2t, not a force radius.
    constexpr unsigned segments = 48U;
    const float radius = 2.0F * thickness;
    const Vec3 color{0.97F, 0.74F, 0.34F};
    for (unsigned plane = 0U; plane < 3U; ++plane) {
        const auto point = [center, radius, plane](float angle) {
            const float first = radius * std::cos(angle);
            const float second = radius * std::sin(angle);
            if (plane == 0U) {
                return center + Vec3{first, second, 0.0F};
            }
            if (plane == 1U) {
                return center + Vec3{first, 0.0F, second};
            }
            return center + Vec3{0.0F, first, second};
        };
        for (unsigned segment = 0U; segment < segments; ++segment) {
            const float first = 6.283185307F * static_cast<float>(segment) / segments;
            const float second = 6.283185307F * static_cast<float>(segment + 1U) / segments;
            lines.push_back({point(first), color});
            lines.push_back({point(second), color});
        }
    }
}

inline void appendDragTargetVector(std::vector<DrawVertex>& lines,
    const InteractionPreview& preview, const Camera& camera) {
    if (!preview.valid() || !preview.dragging || preview.dragId != preview.selected
        || !finite(preview.dragTarget)) {
        return;
    }
    const Vec3 probe = xyz(preview.lastProbe);
    const Vec3 target = preview.dragTarget;
    const Vec3 color{0.98F, 0.55F, 0.86F};
    lines.push_back({probe, color});
    lines.push_back({target, color});
    const Vec3 delta = target - probe;
    const float distance = length(delta);
    if (distance > 1.0e-7F) {
        const Vec3 direction = delta / distance;
        const Vec3 side = normalized(cross(direction, camera.forward()), camera.up());
        const float headLength = std::min(0.12F, distance * 0.2F);
        const Vec3 base = target - direction * headLength;
        lines.push_back({target, color});
        lines.push_back({base + side * (headLength * 0.4F), color});
        lines.push_back({target, color});
        lines.push_back({base - side * (headLength * 0.4F), color});
    }
}

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

    void drawDebug(GlApi& gl, const DebugSnapshot& debug, const Camera& camera, const Mat4& matrix, bool cellDebug, bool contactDebug) {
        if (!debug.valid || !finite(xyz(debug.selectedPosition))) {
            return;
        }
        std::vector<DrawVertex> lines{};
        lines.reserve(27U * 24U + 2U * debugPreviewCapacity * 6U + 3U * 48U * 2U + 6U);
        const Vec3 selected = xyz(debug.selectedPosition);
        const auto line = [&lines](Vec3 first, Vec3 second, Vec3 color) {
            lines.push_back({first, color});
            lines.push_back({second, color});
        };
        if (cellDebug) {
            for (const auto& cell : debug.cells) {
                const auto& coordinate = cell.coordinateAndCount;
                if (coordinate[3] < 0) {
                    continue;
                }
                const Vec3 minimum = debug.grid.minimum + Vec3{static_cast<float>(coordinate[0]) * debug.grid.cellSize, static_cast<float>(coordinate[1]) * debug.grid.cellSize, static_cast<float>(coordinate[2]) * debug.grid.cellSize};
                std::array<Vec3, 8> corners{};
                for (unsigned corner = 0U; corner < corners.size(); ++corner) {
                    corners[corner] = minimum + Vec3{static_cast<float>(corner & 1U) * debug.grid.cellSize, static_cast<float>((corner >> 1U) & 1U) * debug.grid.cellSize, static_cast<float>((corner >> 2U) & 1U) * debug.grid.cellSize};
                }
                Vec3 color{0.25F, 0.39F, 0.46F};
                const auto id = cellIndex(coordinate[0], coordinate[1], coordinate[2], debug.grid);
                if (id == debug.sourceCell) {
                    color = {0.92F, 0.69F, 0.30F};
                }
                for (unsigned corner = 0U; corner < corners.size(); ++corner) {
                    for (const unsigned axis : {1U, 2U, 4U}) {
                        if ((corner & axis) == 0U) {
                            line(corners[corner], corners[corner | axis], color);
                        }
                    }
                }
            }
        }
        // Debug is deliberately an X-ray overlay. It does not modify depth or cloth state.
        // The ordinary shaded surface above remains the primary viewport output.
        gl.Disable(GL_DEPTH_TEST);
        gl.DepthMask(GL_FALSE);
        const float markerSize = std::max(0.015F, camera.distance * 0.0018F);
        const Vec3 markerRight = camera.right() * markerSize;
        const Vec3 markerUp = camera.up() * markerSize;
        const auto marker = [&line, markerRight, markerUp](Vec3 point, Vec3 color) {
            line(point - markerRight, point + markerRight, color);
            line(point - markerUp, point + markerUp, color);
        };
        if (contactDebug) {
            appendContactRadiusRings(lines, selected, debug.thickness);
            const auto candidates = std::min(debug.candidateCount, debugPreviewCapacity);
            for (std::uint32_t index = 0U; index < candidates; ++index) {
                const Vec3 point = xyz(debug.candidates[index].position);
                if (finite(point)) {
                    line(selected, point, {0.20F, 0.72F, 0.83F});
                    marker(point, {0.33F, 0.88F, 0.94F});
                }
            }
            const auto contacts = std::min(debug.contactCount, debugPreviewCapacity);
            for (std::uint32_t index = 0U; index < contacts; ++index) {
                const Vec3 point = xyz(debug.contacts[index].position);
                if (finite(point)) {
                    line(selected, point, {1.0F, 0.28F, 0.20F});
                    marker(point, {1.0F, 0.43F, 0.30F});
                }
            }
        }
        marker(selected, {1.0F, 0.84F, 0.40F});
        drawVertices(gl, lines, GL_LINES, matrix);
        gl.DepthMask(GL_TRUE);
        gl.Enable(GL_DEPTH_TEST);
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

    void draw(GlApi& gl, GpuCloth& gpu, const Settings& settings, const Camera& camera,
        int width, int height, bool wire, bool strain, bool points, unsigned selected,
        const DebugSnapshot* debug = nullptr, bool cellDebug = true, bool contactDebug = true,
        const InteractionPreview* interaction = nullptr) {
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

#if LAB_CHECKPOINT >= 1
        // Starter is the scene/camera scaffold. Checkpoint 01 adds the actual cloth mesh draw.
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
        // Draw the exact selected GPU ID, even when the optional subset stride skips that ID.
        if (selected < settings.side * settings.side) {
            gl.Disable(GL_DEPTH_TEST);
            gl.DepthMask(GL_FALSE);
            gl.Uniform1i(gl.GetUniformLocation(clothProgram_, "uPoints"), 1);
            gl.Uniform1ui(gl.GetUniformLocation(clothProgram_, "uPointStride"), 1U);
            gl.DrawArrays(GL_POINTS, static_cast<GLint>(selected), 1);
            gl.DepthMask(GL_TRUE);
            gl.Enable(GL_DEPTH_TEST);
        }
        if (debug != nullptr && debug->selected == selected && debug->side == settings.side) {
            drawDebug(gl, *debug, camera, matrix, cellDebug, contactDebug);
        }
        if (interaction != nullptr) {
            std::vector<DrawVertex> targetLines{};
            targetLines.reserve(6U);
            appendDragTargetVector(targetLines, *interaction, camera);
            gl.Disable(GL_DEPTH_TEST);
            gl.DepthMask(GL_FALSE);
            drawVertices(gl, targetLines, GL_LINES, matrix);
            gl.DepthMask(GL_TRUE);
            gl.Enable(GL_DEPTH_TEST);
        }
#else
        (void)gpu;
        (void)wire;
        (void)strain;
        (void)points;
        (void)selected;
        (void)debug;
        (void)cellDebug;
        (void)contactDebug;
        (void)interaction;
#endif
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
