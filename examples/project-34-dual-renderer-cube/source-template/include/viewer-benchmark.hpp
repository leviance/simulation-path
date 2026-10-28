#pragma once
#include "viewer-backends.hpp"
#include <iostream>

namespace lab {
#if LAB_CHECKPOINT >= 9
inline void benchmarkViewer(GlApi& gl, SDL_Window* window, const std::array<ViewerMesh, 3>& models, ViewerBackends& renderers, std::size_t selected) {
    int interval = -1;
    if (!SDL_GL_SetSwapInterval(0) || !SDL_GL_GetSwapInterval(&interval) || interval != 0) {
        throw std::runtime_error("Benchmark requires confirmed swap interval 0");
    }
    ViewerScene scene{};
    scene.meshIndex = selected;
    scene.view.grid = false;
    const auto frozen = scene;
    const auto started = SDL_GetTicks();
    constexpr int warmup = 3, samples = 12, width = 640, height = 480;
    std::uint64_t frame = 1;
    std::cout << "BENCHMARK: frozen scene; viewport=640x480; VSync=0; warmup=3; samples=12; explicit glFinish before swap\n"
              << "model=" << models[selected].name << " triangles=" << models[selected].triangleCount() << '\n'
              << "All columns are mean milliseconds. CPU submit != GPU geometry. CPU mode includes texture upload/presenter. No speedup ratio.\n"
              << "backend,prepare_cpu,cpu_geometry,upload_cpu,submit_cpu,gpu_geometry,sync_wait_cpu,present_cpu,frame_wall_cpu\n";
    for (const auto backend : {RendererKind::cpu, RendererKind::gpu}) {
        std::array<double, 8> sums{};
        int gpuSamples = 0;
        for (int sample = -warmup; sample < samples; ++sample) {
            if (SDL_GetTicks() - started > 15000)
                throw std::runtime_error("Benchmark deadline");
            const auto frameStart = ViewerClock::now();
            auto stats = renderers.render(gl, models, scene, backend, width, height, frame++);
            auto stage = ViewerClock::now();
            // Phép so có đồng bộ cố ý. Đừng thêm glFinish vào vòng lặp tương tác.
            gl.Finish();
            const double syncWait = viewerMilliseconds(stage);
            renderers.timer.poll(gl);
            stage = ViewerClock::now();
            if (!SDL_GL_SwapWindow(window))
                throw std::runtime_error(SDL_GetError());
            stats.presentMs = viewerMilliseconds(stage);
            stats.frameMs = viewerMilliseconds(frameStart);
            if (!(scene == frozen) || gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("Benchmark changed scene or GL error");
            if (sample < 0)
                continue;
            const std::array<double, 8> values{stats.prepareMs, stats.cpuRenderMs, stats.uploadMs, stats.submitMs, 0, syncWait, stats.presentMs, stats.frameMs};
            for (std::size_t index = 0; index < sums.size(); ++index)
                sums[index] += values[index];
            if (backend == RendererKind::gpu && renderers.timer.hasSample && renderers.timer.sampleFrame == stats.frame) {
                sums[4] += renderers.timer.milliseconds;
                ++gpuSamples;
            }
        }
        std::cout << (backend == RendererKind::cpu ? "CPU" : "GPU");
        for (std::size_t index = 0; index < sums.size(); ++index) {
            std::cout << ',';
            if ((backend == RendererKind::cpu && index == 4) || (backend == RendererKind::gpu && (index == 1 || index == 2)))
                std::cout << "N/A";
            else if (index == 4 && gpuSamples == 0)
                std::cout << "unavailable";
            else
                std::cout << sums[index] / (index == 4 ? gpuSamples : samples);
        }
        std::cout << '\n';
    }
}
#endif
} // namespace lab
