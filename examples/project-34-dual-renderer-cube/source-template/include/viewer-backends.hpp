#pragma once
#include "viewer-cpu.hpp"
#include "viewer-gpu.hpp"
#include "viewer-timing.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
// Một chủ sở hữu tài nguyên; cả app, phép đối chiếu và benchmark dùng nhánh vẽ này.
// Scene chỉ được đọc. Không tạo VBO/EBO hoặc nạp OBJ trong render().
struct ViewerBackends {
    Framebuffer frame{};
    CpuViewerRenderer cpu{};
    CpuTexturePresenter presenter{};
#if LAB_CHECKPOINT >= 4
    std::array<GpuViewerMesh, 3> meshes{};
    GpuViewerProgram program{};
    GpuViewerLines grid{};
#endif
    ViewerGpuTimer timer{};

    ViewerBackends() = default;
    ViewerBackends(const ViewerBackends&) = delete;
    ViewerBackends& operator=(const ViewerBackends&) = delete;

    bool initialize(GlApi& gl, const std::array<ViewerMesh, 3>& models, std::string& diagnostics) {
        if (!presenter.initialize(gl, diagnostics)) {
            return false;
        }
        std::size_t largest = 0;
        for (const auto& model : models) {
            largest = std::max(largest, model.vertices.size());
        }
        cpu.clipVertices.reserve(largest);
#if LAB_CHECKPOINT >= 4
        if (!program.initialize(gl, diagnostics)) {
            return false;
        }
        for (std::size_t index = 0; index < models.size(); ++index) {
            if (!meshes[index].initialize(gl, models[index])) {
                diagnostics = "Cannot upload model " + models[index].name;
                return false;
            }
        }
        if (!grid.initialize(gl, viewerGridPoints())) {
            diagnostics = "Cannot upload grid";
            return false;
        }
#endif
#if LAB_CHECKPOINT >= 9
        timer.initialize(gl);
#endif
        return gl.GetError() == GL_NO_ERROR;
    }

    ViewerFrameStats render(GlApi& gl, const std::array<ViewerMesh, 3>& models, const ViewerScene& scene, RendererKind backend, int width, int height, std::uint64_t number, int originY = 0) {
        if (width <= 0 || height <= 0 || std::size_t(width) * std::size_t(height) > 16'000'000 || scene.meshIndex >= models.size()) {
            throw std::invalid_argument("Invalid viewer render dimensions or model");
        }
        ViewerFrameStats stats{};
        stats.frame = number;
        auto started = ViewerClock::now();
        const auto matrices = viewerMatrices(scene, float(width) / height);
        stats.prepareMs = viewerMilliseconds(started);
        if (frame.width != width || frame.height != height) {
            frame.resize(width, height);
            presenter.resize(gl, width, height);
        }
        gl.Disable(GL_SCISSOR_TEST);
        gl.Viewport(0, originY, width, height);
        gl.ClearColor(13.0F / 255, 21.0F / 255, 38.0F / 255, 1);
        gl.ClearDepth(1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        timer.poll(gl);
        if (backend == RendererKind::cpu) {
            stats.cpuPathExecuted = true;
            started = ViewerClock::now();
            cpu.render(frame, models[scene.meshIndex], scene, matrices);
            stats.cpuRenderMs = viewerMilliseconds(started);
            started = ViewerClock::now();
            presenter.upload(gl, frame);
            stats.uploadMs = viewerMilliseconds(started);
            started = ViewerClock::now();
            gl.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
            presenter.draw(gl);
            stats.submitMs = viewerMilliseconds(started);
        }
#if LAB_CHECKPOINT >= 4
        else {
            started = ViewerClock::now();
            timer.begin(gl, number);
            meshes[scene.meshIndex].draw(gl, program, scene, matrices);
            if (scene.view.grid) {
                program.bindLine(gl, multiply(matrices.projection, matrices.view), {37.0F / 255, 51.0F / 255, 74.0F / 255});
                grid.draw(gl);
            }
            timer.end(gl);
            stats.submitMs = viewerMilliseconds(started);
        }
#endif
        return stats;
    }

    void destroy(GlApi& gl) {
        gl.UseProgram(0);
        timer.destroy(gl);
        presenter.destroy(gl);
#if LAB_CHECKPOINT >= 4
        grid.destroy(gl);
        for (auto& mesh : meshes) {
            mesh.destroy(gl);
        }
        program.destroy(gl);
#endif
    }
};
#endif
} // namespace lab
