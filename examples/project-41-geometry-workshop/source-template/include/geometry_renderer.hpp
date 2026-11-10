#pragma once

#include "geometry_camera.hpp"
#include "geometry_gl.hpp"
#include "mesh_session.hpp"

namespace geometry {

class GpuMesh {
    public:
    explicit GpuMesh(GlApi& gl)
        : gl_(gl) {}

    ~GpuMesh() {
        if (elements_)
            gl_.DeleteBuffers(1, &elements_);
        if (vertices_)
            gl_.DeleteBuffers(1, &vertices_);
        if (array_)
            gl_.DeleteVertexArrays(1, &array_);
    }

    GpuMesh(const GpuMesh&) = delete;
    GpuMesh& operator=(const GpuMesh&) = delete;

    void upload(const Mesh& mesh) {
        // Stage separate buffers. A failed allocation cannot destroy the drawable last-good mesh.
        GpuMesh staged(gl_);
        staged.allocate(mesh);
        std::swap(array_, staged.array_);
        std::swap(vertices_, staged.vertices_);
        std::swap(elements_, staged.elements_);
        std::swap(indexCount_, staged.indexCount_);
        std::swap(floorHeight_, staged.floorHeight_);
    }

    double floorHeight() const {
        return floorHeight_;
    }

    void draw() const {
        gl_.BindVertexArray(array_);
        gl_.DrawElements(GL_TRIANGLES, indexCount_, GL_UNSIGNED_INT, nullptr);
    }

    private:
    void allocate(const Mesh& mesh) {
        if (mesh.vertices.empty() || mesh.indices.empty())
            throw std::invalid_argument("Cannot upload an empty mesh");
        const auto vertexBytes = static_cast<GLsizeiptr>(mesh.vertices.size() * sizeof(Vertex));
        const auto indexBytes = static_cast<GLsizeiptr>(mesh.indices.size() * sizeof(std::uint32_t));
        gl_.GenVertexArrays(1, &array_);
        gl_.GenBuffers(1, &vertices_);
        gl_.GenBuffers(1, &elements_);
        if (!array_ || !vertices_ || !elements_)
            throw std::runtime_error("Could not allocate mesh buffers");
        gl_.BindVertexArray(array_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, vertices_);
        gl_.BufferData(GL_ARRAY_BUFFER, vertexBytes, mesh.vertices.data(), GL_STATIC_DRAW);
        gl_.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, elements_);
        gl_.BufferData(GL_ELEMENT_ARRAY_BUFFER, indexBytes, mesh.indices.data(), GL_STATIC_DRAW);

        const auto stride = static_cast<GLsizei>(sizeof(Vertex));
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride, reinterpret_cast<const void*>(offsetof(Vertex, position)));
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride, reinterpret_cast<const void*>(offsetof(Vertex, normal)));
        gl_.VertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, stride, reinterpret_cast<const void*>(offsetof(Vertex, uv)));
        for (GLuint location = 0; location < 3; ++location)
            gl_.EnableVertexAttribArray(location);
        GLint storedVertexBytes{};
        GLint storedIndexBytes{};
        gl_.GetBufferParameteriv(GL_ARRAY_BUFFER, GL_BUFFER_SIZE, &storedVertexBytes);
        gl_.GetBufferParameteriv(GL_ELEMENT_ARRAY_BUFFER, GL_BUFFER_SIZE, &storedIndexBytes);
        gl_.BindVertexArray(0);
        if (gl_.GetError() != GL_NO_ERROR || storedVertexBytes != vertexBytes || storedIndexBytes != indexBytes) {
            throw std::runtime_error("OpenGL could not store the full mesh payload");
        }
        indexCount_ = static_cast<GLsizei>(mesh.indices.size());
        double minimumY = mesh.vertices.front().position[1];
        for (const Vertex& vertex : mesh.vertices) {
            minimumY = std::min(minimumY, static_cast<double>(vertex.position[1]));
        }
        floorHeight_ = minimumY - 0.34;
    }

    GlApi& gl_;
    GLuint array_{};
    GLuint vertices_{};
    GLuint elements_{};
    GLsizei indexCount_{};
    double floorHeight_{-0.8};
};

struct LineVertex {
    std::array<float, 3> position;
    std::array<float, 3> color;
};

struct ViewOptions {
    bool grid{true};
    bool wireframe{};
    bool uv{};
    bool normals{};
    bool seams{};
};

inline Vec3 toVec3(const std::array<float, 3>& value) {
    return {value[0], value[1], value[2]};
}

inline Vec3 surfacePigment(SurfaceKind kind) {
    if (kind == SurfaceKind::patch)
        return {0.26, 0.75, 0.68};
    if (kind == SurfaceKind::shell)
        return {0.91, 0.51, 0.23};
    if (kind == SurfaceKind::mobius)
        return {0.19, 0.76, 0.70};
    if (kind == SurfaceKind::knot)
        return {0.72, 0.38, 0.78};
    return {0.25, 0.56, 0.95};
}

class GeometryRenderer {
    public:
    explicit GeometryRenderer(GlApi& gl)
        : gl_(gl), surfaceProgram_(gl, "surface.vert", "surface.frag"), lineProgram_(gl, "lines.vert", "lines.frag"), final_(gl), preview_(gl) {
        matrixUniform_ = surfaceProgram_.uniform("viewProjection");
        cameraUniform_ = surfaceProgram_.uniform("cameraPosition");
        pigmentUniform_ = surfaceProgram_.uniform("pigment");
        modeUniform_ = surfaceProgram_.uniform("displayMode");
        lineMatrixUniform_ = lineProgram_.uniform("transform");

        gl_.GenVertexArrays(1, &lineArray_);
        gl_.GenBuffers(1, &lineBuffer_);
        if (!lineArray_ || !lineBuffer_) {
            releaseLines();
            throw std::runtime_error("Could not allocate debug line buffers");
        }
        gl_.BindVertexArray(lineArray_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        const auto stride = static_cast<GLsizei>(sizeof(LineVertex));
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride, reinterpret_cast<const void*>(offsetof(LineVertex, position)));
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride, reinterpret_cast<const void*>(offsetof(LineVertex, color)));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
        gl_.BindVertexArray(0);
    }

    ~GeometryRenderer() {
        releaseLines();
    }

    GeometryRenderer(const GeometryRenderer&) = delete;
    GeometryRenderer& operator=(const GeometryRenderer&) = delete;

    void upload(const Mesh& mesh, MeshPass pass) {
        if (pass == MeshPass::preview)
            preview_.upload(mesh);
        else
            final_.upload(mesh);
    }

    void draw(const MeshSession& session, const OrbitCamera& camera, const ViewOptions& options, int width, int height, int sceneWidth) {
        gl_.Viewport(0, 0, width, height);
        gl_.ClearColor(0.035F, 0.049F, 0.079F, 1.0F);
        gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        gl_.Viewport(0, 0, sceneWidth, height);
        gl_.Enable(GL_DEPTH_TEST);
#if LAB_CHECKPOINT >= 4
        gl_.Disable(GL_CULL_FACE);
#else
        gl_.Enable(GL_CULL_FACE);
#endif
        const Mat4 matrix = camera.viewProjection(static_cast<double>(sceneWidth) / height);
        const Mesh* displayed = session.displayedMesh();
        const GpuMesh* uploaded = &final_;
        if (session.showingPreview())
            uploaded = &preview_;

        if (options.grid) {
            double floor = -0.8;
            if (displayed)
                floor = uploaded->floorHeight();
            drawGrid(matrix, floor);
        }
        if (!displayed)
            return;

        const Vec3 eye = camera.eye();
        const Vec3 pigment = surfacePigment(displayed->settings.kind);
        surfaceProgram_.use();
        gl_.UniformMatrix4fv(matrixUniform_, 1, GL_FALSE, matrix.data());
        gl_.Uniform3f(cameraUniform_, static_cast<float>(eye.x), static_cast<float>(eye.y), static_cast<float>(eye.z));
        gl_.Uniform3f(pigmentUniform_, static_cast<float>(pigment.x), static_cast<float>(pigment.y), static_cast<float>(pigment.z));
        gl_.Uniform1i(modeUniform_, options.uv);
        if (options.wireframe || options.seams) {
            gl_.Enable(GL_POLYGON_OFFSET_FILL);
            gl_.PolygonOffset(1.0F, 1.0F);
        }
        uploaded->draw();
        gl_.Disable(GL_POLYGON_OFFSET_FILL);
        if (options.wireframe) {
            gl_.Uniform1i(modeUniform_, 2);
            gl_.PolygonMode(GL_FRONT_AND_BACK, GL_LINE);
            uploaded->draw();
            gl_.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
        }
        drawDebug(matrix, *displayed, options);
        gl_.BindVertexArray(0);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("OpenGL reported a drawing error");
    }

    void drawOverlay(const std::vector<LineVertex>& triangles, int width, int height) {
        constexpr Mat4 identity{1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
        gl_.Viewport(0, 0, width, height);
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Disable(GL_CULL_FACE);
        drawBatch(triangles, identity, GL_TRIANGLES);
        gl_.BindVertexArray(0);
        gl_.Enable(GL_DEPTH_TEST);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("OpenGL overlay draw failed");
    }

    private:
    void releaseLines() {
        if (lineBuffer_)
            gl_.DeleteBuffers(1, &lineBuffer_);
        if (lineArray_)
            gl_.DeleteVertexArrays(1, &lineArray_);
    }

    void appendLine(Vec3 a, Vec3 b, Vec3 color) {
        const auto tint = vertexVector(color);
        lines_.push_back({vertexVector(a), tint});
        lines_.push_back({vertexVector(b), tint});
    }

    void flushLines(const Mat4& matrix) {
        drawBatch(lines_, matrix, GL_LINES);
        lines_.clear();
    }

    void drawBatch(const std::vector<LineVertex>& vertices, const Mat4& matrix, GLenum primitive) {
        if (vertices.empty())
            return;
        lineProgram_.use();
        gl_.UniformMatrix4fv(lineMatrixUniform_, 1, GL_FALSE, matrix.data());
        gl_.BindVertexArray(lineArray_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(LineVertex)), vertices.data(), GL_STREAM_DRAW);
        gl_.DrawArrays(primitive, 0, static_cast<GLsizei>(vertices.size()));
    }

    void drawGrid(const Mat4& matrix, double height) {
        constexpr double reach = 8.0;
        for (int tick = -8; tick <= 8; ++tick) {
            const double coordinate = tick;
            Vec3 color{0.077, 0.112, 0.157};
            if (tick == 0)
                color = {0.15, 0.25, 0.31};
            appendLine({coordinate, height, -reach}, {coordinate, height, reach}, color);
            appendLine({-reach, height, coordinate}, {reach, height, coordinate}, color);
        }
        flushLines(matrix);
    }

    void drawDebug(const Mat4& matrix, const Mesh& mesh, const ViewOptions& options) {
        const int u = mesh.settings.uSegments;
        const int v = mesh.settings.vSegments;
        const int columns = v + 1;
        if (options.normals) {
            const int rowStep = std::max(1, u / 18);
            const int columnStep = std::max(1, v / 9);
            const double length = 0.085 * mesh.settings.radius;
            for (int row = 0; row < u; row += rowStep) {
                for (int column = 0; column <= v; column += columnStep) {
                    const Vertex& vertex = mesh.vertices[row * columns + column];
                    const Vec3 position = toVec3(vertex.position);
                    appendLine(position, position + toVec3(vertex.normal) * length, {0.45, 0.94, 0.89});
                    appendLine(position, position + toVec3(vertex.tangent) * length, {0.95, 0.72, 0.35});
                }
            }
        }
        if (options.seams) {
            for (int column = 0; column < v; ++column) {
                appendLine(toVec3(mesh.vertices[column].position), toVec3(mesh.vertices[column + 1].position), {1.0, 0.76, 0.26});
                if (mesh.settings.kind == SurfaceKind::shell) {
                    const int index = u * columns + column;
                    appendLine(toVec3(mesh.vertices[index].position), toVec3(mesh.vertices[index + 1].position), {1.0, 0.59, 0.24});
                }
            }
            for (int row = 0; row < u; ++row) {
                const int index = row * columns;
                appendLine(toVec3(mesh.vertices[index].position), toVec3(mesh.vertices[index + columns].position), {0.31, 0.86, 0.94});
            }
        }
        flushLines(matrix);
    }

    GlApi& gl_;
    Program surfaceProgram_;
    Program lineProgram_;
    GpuMesh final_;
    GpuMesh preview_;
    GLint matrixUniform_{};
    GLint cameraUniform_{};
    GLint pigmentUniform_{};
    GLint modeUniform_{};
    GLint lineMatrixUniform_{};
    GLuint lineArray_{};
    GLuint lineBuffer_{};
    std::vector<LineVertex> lines_;
};

} // namespace geometry
