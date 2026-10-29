#pragma once
#include "viewer-backends.hpp"
#include "viewer-comparison.hpp"
#include "viewer-fixtures.hpp"
#include <iostream>

namespace lab {
#if LAB_CHECKPOINT >= 9
inline void requireViewer(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error(message);
}

struct ViewerResourceProof {
    std::vector<GLuint> buffers{}, arrays{}, programs{}, textures{};
    bool operator==(const ViewerResourceProof&) const = default;
};

inline ViewerResourceProof viewerResourceProof(const ViewerBackends& renderer) {
    ViewerResourceProof proof{};
    proof.programs = {renderer.program.program, renderer.presenter.program};
    proof.textures = {renderer.presenter.texture};
    proof.arrays = {renderer.grid.vao, renderer.presenter.vertexArray};
    proof.buffers = {renderer.grid.buffer};
    for (const auto& mesh : renderer.meshes) {
        proof.arrays.insert(proof.arrays.end(), {mesh.vao, mesh.normals.vao});
        proof.buffers.insert(proof.buffers.end(), {mesh.vertices, mesh.elements, mesh.reversedElements, mesh.normals.buffer});
    }
    return proof;
}

inline void requireViewerResources(GlApi& gl, const ViewerResourceProof& proof, bool alive) {
    for (auto id : proof.buffers)
        requireViewer(bool(gl.IsBuffer(id)) == alive, "Buffer lifetime mismatch");
    for (auto id : proof.arrays)
        requireViewer(bool(gl.IsVertexArray(id)) == alive, "VAO lifetime mismatch");
    for (auto id : proof.programs)
        requireViewer(bool(gl.IsProgram(id)) == alive, "Program lifetime mismatch");
    for (auto id : proof.textures)
        requireViewer(bool(gl.IsTexture(id)) == alive, "Texture lifetime mismatch");
}

// Readback là đồng bộ và CHỈ dùng trong kiểm chứng, không nằm trong frame tương tác.
inline ViewerComparison readViewerComparison(GlApi& gl, const Framebuffer& frame, const ViewerMesh& mesh, const ViewerMatrices& matrices, int originY) {
    std::vector<std::uint8_t> rgba(frame.rgba.size());
    std::vector<float> depth(frame.depth.size());
    gl.ReadPixels(0, originY, frame.width, frame.height, GL_RGBA, GL_UNSIGNED_BYTE, rgba.data());
    gl.ReadPixels(0, originY, frame.width, frame.height, GL_DEPTH_COMPONENT, GL_FLOAT, depth.data());
    return compareViewerImage(frame, rgba, depth, viewerEdgeMask(mesh, matrices, frame.width, frame.height));
}

inline void verifyViewerVertexTrace(GlApi& gl, const ViewerMesh& mesh, const GpuViewerMesh& gpu, const ViewerScene& scene, int width, int height) {
    GpuViewerProgram tracer{};
    GLuint output = 0;
    try {
        std::string diagnostics;
        requireViewer(tracer.initialize(gl, diagnostics, "gl_Position"), "Transform feedback shader: " + diagnostics);
        const auto matrices = viewerMatrices(scene, float(width) / height);
        std::vector<Vec4> clips(mesh.vertices.size());
        gl.GenBuffers(1, &output);
        gl.BindBuffer(GL_TRANSFORM_FEEDBACK_BUFFER, output);
        gl.BufferData(GL_TRANSFORM_FEEDBACK_BUFFER, GLsizeiptr(clips.size() * sizeof(Vec4)), nullptr, GL_STREAM_READ);
        gl.BindBufferBase(GL_TRANSFORM_FEEDBACK_BUFFER, 0, output);
        tracer.bind(gl, matrices, scene);
        gl.BindVertexArray(gpu.vao);
        gl.Enable(GL_RASTERIZER_DISCARD);
        gl.BeginTransformFeedback(GL_POINTS);
        gl.DrawArrays(GL_POINTS, 0, GLsizei(mesh.vertices.size()));
        gl.EndTransformFeedback();
        gl.Disable(GL_RASTERIZER_DISCARD);
        gl.GetBufferSubData(GL_TRANSFORM_FEEDBACK_BUFFER, 0, GLsizeiptr(clips.size() * sizeof(Vec4)), clips.data());
        for (const auto index : {std::size_t(0), mesh.vertices.size() / 2, mesh.vertices.size() - 1}) {
            const auto& v = mesh.vertices[index];
            const auto expected = transform(matrices.mvp, {v.positionX, v.positionY, v.positionZ, 1});
            const auto actual = clips[index];
            for (const float error : {actual.x - expected.x, actual.y - expected.y, actual.z - expected.z, actual.w - expected.w}) {
                requireViewer(std::isfinite(error) && std::abs(error) <= 2e-5F, "GPU clip trace exceeds 2e-5");
            }
            if (expected.w > 1e-4F) {
                requireViewer(std::abs(actual.x / actual.w - expected.x / expected.w) <= 2e-5F && std::abs(actual.y / actual.w - expected.y / expected.w) <= 2e-5F && std::abs(actual.z / actual.w - expected.z / expected.w) <= 2e-5F, "GPU NDC trace exceeds 2e-5");
                const auto a = viewerScreenVertex(expected, width, height), b = viewerScreenVertex(actual, width, height);
                requireViewer(std::abs(a.x - b.x) <= 0.01F && std::abs(a.y - b.y) <= 0.01F && std::abs(a.depth - b.depth) <= 1e-5F, "GPU NDC/screen/depth trace differs");
            }
        }
        requireViewer(gl.GetError() == GL_NO_ERROR, "Vertex trace GL error");
    } catch (...) {
        gl.Disable(GL_RASTERIZER_DISCARD);
        gl.BindVertexArray(0);
        if (output)
            gl.DeleteBuffers(1, &output);
        tracer.destroy(gl);
        throw;
    }
    gl.BindVertexArray(0);
    gl.BindBufferBase(GL_TRANSFORM_FEEDBACK_BUFFER, 0, 0);
    gl.DeleteBuffers(1, &output);
    tracer.destroy(gl);
}

inline void verifyViewerFixture(GlApi& gl, const GpuViewerProgram& program, const ViewerMesh& mesh, bool nearPlane) {
    GpuViewerMesh gpu{};
    try {
        requireViewer(gpu.initialize(gl, mesh), "Fixture GPU upload failed");
        ViewerScene scene{};
        scene.view.angleX = scene.view.angleY = 0;
        scene.view.distance = 3.2;
        if (nearPlane) {
            scene.view.distance = 1.2;
        }
        scene.view.grid = false;
        scene.lit = false;
        Framebuffer frame{};
        frame.resize(320, 240);
        CpuViewerRenderer cpu{};
        std::size_t culledPixels = 0;
        for (bool cull : {true, false}) {
            scene.view.cullBackfaces = cull;
            const auto matrices = viewerMatrices(scene, 320.0F / 240);
            const auto stats = cpu.render(frame, mesh, scene, matrices);
            if (cull)
                culledPixels = stats.passed;
            else if (!nearPlane)
                requireViewer(stats.passed > culledPixels * 1.8, "Front/back fixture must expose both windings with culling off");
            gl.Viewport(0, 0, frame.width, frame.height);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            gpu.draw(gl, program, scene, matrices);
            const auto comparison = readViewerComparison(gl, frame, mesh, matrices, 0);
            requireViewer(comparison.passed(frame.depth.size()) && comparison.interiorCovered > 100, "Front/back/near fixture image differs");
            if (nearPlane)
                requireViewer(stats.clipped > 0, "Near fixture must exercise homogeneous clipping");
        }
    } catch (...) {
        gpu.destroy(gl);
        throw;
    }
    gpu.destroy(gl);
}

inline void verifyViewer(GlApi& gl, SDL_Window* window, const std::array<ViewerMesh, 3>& models, ViewerBackends& renderers) {
    const auto started = SDL_GetTicks();
    const auto resources = viewerResourceProof(renderers);
    requireViewerResources(gl, resources, true);
    ViewerScene scene{};
    scene.view.grid = false;
    scene.view.cameraYaw = 0.27;
    scene.targetX = 0.08F;
    scene.lightX = -0.3F;
    RendererKind backend = RendererKind::gpu;
    std::uint64_t frameNumber = 1;
    std::size_t switches = 0, interiorFailures = 0, edgeDifferences = 0, interiorPixels = 0;
    for (int repeat = 0; repeat < 24; ++repeat) {
        requireViewer(SDL_GetTicks() - started < 15000, "Viewer verification deadline");
        if (repeat == 20)
            requireViewer(SDL_SetWindowSize(window, 760, 560), "Verification resize failed");
        if (repeat >= 20)
            scene.meshIndex = std::size_t(repeat - 20) % models.size();
        int width = 401;
        int height = 301;
        if (repeat < 20) {
            width = 320;
            height = 240;
        }
        const auto frozen = scene;
        if (backend == RendererKind::cpu) {
            backend = RendererKind::gpu;
        } else {
            backend = RendererKind::cpu;
        }
        ++switches;
        renderers.render(gl, models, scene, backend, width, height, frameNumber++, 32);
        requireViewer(scene == frozen, "Switch/render changed camera/object/shading/model state");
        // Đối chiếu một snapshot ở cả hai nhánh thật; CPU presenter cũng phải giữ đúng origin.
        renderers.render(gl, models, scene, RendererKind::cpu, width, height, frameNumber++, 32);
        std::vector<std::uint8_t> presented(renderers.frame.rgba.size());
        gl.ReadPixels(0, 32, width, height, GL_RGBA, GL_UNSIGNED_BYTE, presented.data());
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                for (int c = 0; c < 3; ++c) {
                    const auto a = (std::size_t(y) * width + x) * 4 + c;
                    const auto b = (std::size_t(height - 1 - y) * width + x) * 4 + c;
                    requireViewer(std::abs(int(presented[b]) - int(renderers.frame.rgba[a])) <= 1, "CPU presenter flipped/altered framebuffer");
                }
            }
        }
        renderers.render(gl, models, scene, RendererKind::gpu, width, height, frameNumber++, 32);
        const auto matrices = viewerMatrices(scene, float(width) / height);
        const auto comparison = readViewerComparison(gl, renderers.frame, models[scene.meshIndex], matrices, 32);
        requireViewer(comparison.passed(renderers.frame.depth.size()), "Real mesh CPU/GPU coverage/color/depth mismatch");
        interiorFailures += comparison.interiorFailures;
        interiorPixels += comparison.interiorCovered;
        edgeDifferences += comparison.edgeDifferences;
        requireViewer(viewerResourceProof(renderers) == resources, "Switch/resize/model change recreated GPU resources");
        requireViewerResources(gl, resources, true);
        requireViewer(gl.GetError() == GL_NO_ERROR, "OpenGL verification error");
    }
    for (std::size_t index = 0; index < models.size(); ++index) {
        requireViewer(SDL_GetTicks() - started < 15000, "Viewer verification deadline");
        scene.meshIndex = index;
        verifyViewerVertexTrace(gl, models[index], renderers.meshes[index], scene, 401, 301);
        // Quan sát từ phía sau và kiểm cả nhánh depth tắt / thứ tự đảo.
        for (bool depth : {true, false}) {
            requireViewer(SDL_GetTicks() - started < 15000, "Viewer verification deadline");
            scene.depthEnabled = depth;
            scene.view.reverseOrder = true;
            scene.view.cullBackfaces = false;
            scene.view.cameraYaw = 2.8;
            renderers.render(gl, models, scene, RendererKind::cpu, 320, 240, frameNumber++);
            renderers.render(gl, models, scene, RendererKind::gpu, 320, 240, frameNumber++);
            const auto comparison = readViewerComparison(gl, renderers.frame, models[index], viewerMatrices(scene, 320.0F / 240), 0);
            requireViewer(comparison.passed(renderers.frame.depth.size()), "Back-view/depth-off image differs");
        }
    }
    verifyViewerFixture(gl, renderers.program, viewerVisibilityFixture(), false);
    verifyViewerFixture(gl, renderers.program, viewerNearFixture(), true);
    requireViewer(SDL_GetTicks() - started < 15000, "Viewer verification deadline");
    renderers.destroy(gl);
    requireViewerResources(gl, resources, false);
    requireViewer(gl.GetError() == GL_NO_ERROR, "GPU cleanup failed");
    std::cout << "VERIFY PASS: " << switches << " switches, resize + 3 cached models, transform feedback clip/NDC/screen/depth; interiorFailures=" << interiorFailures << " interiorCovered=" << interiorPixels << " edgeDifferences=" << edgeDifferences << "; resources deleted\n";
}
#endif
} // namespace lab
