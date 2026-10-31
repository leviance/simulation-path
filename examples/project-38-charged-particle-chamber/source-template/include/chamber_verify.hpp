#pragma once
#include "chamber_benchmark.hpp"
#include "chamber_controls.hpp"
#include "chamber_post.hpp"
#include "chamber_renderer.hpp"
#include "chamber_validation.hpp"

#include <iostream>
#include <stdexcept>

namespace chamber {

inline bool saveCapture(GlApi& gl, int width, int height, const std::filesystem::path& path) {
    std::vector<unsigned char> pixels(static_cast<std::size_t>(width) * height * 4U);
    gl.PixelStorei(GL_PACK_ALIGNMENT, 1);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    const std::size_t stride = static_cast<std::size_t>(width) * 4U;
    for (int row = 0; row < height / 2; ++row) {
        for (std::size_t byte = 0; byte < stride; ++byte) {
            std::swap(pixels[static_cast<std::size_t>(row) * stride + byte], pixels[static_cast<std::size_t>(height - row - 1) * stride + byte]);
        }
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), width * 4);
    if (!surface)
        return false;
    const bool saved = SDL_SaveBMP(surface, path.string().c_str());
    SDL_DestroySurface(surface);
    return saved;
}

#if LAB_CHECKPOINT >= 10
inline void requireGpu(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error("GPU verification: " + message);
}

inline void waitVerificationFence(GlApi& gl, GLsync fence) {
    requireGpu(fence != nullptr, "Cannot allocate verification fence");
    const Uint64 deadline = SDL_GetTicks() + 5000;
    gl.Flush();
    while (SDL_GetTicks() < deadline) {
        std::string error{};
        if (fenceReady(gl, fence, error)) {
            gl.DeleteSync(fence);
            return;
        }
        if (!error.empty()) {
            gl.DeleteSync(fence);
            throw std::runtime_error(error);
        }
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                gl.DeleteSync(fence);
                throw std::runtime_error("Verification cancelled");
            }
        }
        SDL_Delay(1);
    }
    gl.DeleteSync(fence);
    throw std::runtime_error("Verification fence deadline");
}

inline ValidationReport verifyCase(GlApi& gl, const ComputePipeline& pipeline, Settings settings, int steps) {
    ValidationJob job{};
    std::string error{};
    requireGpu(job.start(gl, pipeline, settings, steps, 1000, error), error);
    const Uint64 deadline = SDL_GetTicks() + 32000;
    while (job.busy() && SDL_GetTicks() < deadline) {
        job.poll(gl);
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                job.cancel(gl);
        }
        SDL_Delay(1);
    }
    if (job.busy())
        job.cancel(gl, "Outer verification deadline");
    std::cout << "CASE N=" << settings.count << " seed=" << settings.seed << " steps=" << steps
        << " dt=" << settings.dt << " checked=" << job.report.checked << " mirror=" << job.report.mismatchCount
        << " analytic=" << job.analyticFailures << " maxX=" << job.report.maximumPositionError
        << " maxV=" << job.report.maximumVelocityError << '\n';
    requireGpu(job.passed(), job.status);
    requireGpu(job.report.checked == settings.count, "Output coverage does not equal requested N");
    return job.report;
}

inline void verifyTail(GlApi& gl, const ComputePipeline& pipeline) {
    Settings settings = presetSettings(Preset::Helix);
    settings.count = 257;
    GpuState state{};
    std::string error{};
    requireGpu(pipeline.createState(gl, settings, 2000, state, error), error);
    const Particle sentinel{{123, 456, 789, 17}, {29, 31, 37, 41}};
    std::vector<Particle> records(513, sentinel);
    for (std::uint32_t id = 0; id < 257; ++id)
        records[id] = initialParticle(id, settings);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, state.buffer);
    gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(records.size() * sizeof(Particle)), records.data(), GL_DYNAMIC_COPY);
    pipeline.step(gl, state, 32);
    gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
    waitVerificationFence(gl, gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0));
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(records.size() * sizeof(Particle)), records.data());
    state.destroy(gl);
    requireGpu(gl.GetError() == GL_NO_ERROR, "Tail readback GL error");
    for (std::size_t id = 257; id < records.size(); ++id)
        requireGpu(sameParticle(records[id], sentinel, 0, 0), "Tail guard overwritten");
    std::cout << "TAIL PASS: 255 excess invocations and one additional guard record unchanged\n";
}

inline void verifyGpu(GlApi& gl, const ComputePipeline& pipeline, SceneRenderer& renderer, SDL_Window* window, std::size_t largeCount, const std::filesystem::path& shaderDirectory) {
    requireGpu(largeCount >= 1'000'000U && largeCount <= 5'000'000U, "Acceptance scale must be 1000000..5000000");
    std::cout << "DEVICE " << gl.GetString(GL_VENDOR) << " / " << gl.GetString(GL_RENDERER)
        << " / " << gl.GetString(GL_VERSION) << '\n';
    for (const Preset preset : {Preset::Straight, Preset::Circle, Preset::Helix, Preset::Electric}) {
        Settings settings = presetSettings(preset);
        settings.count = 257;
        verifyCase(gl, pipeline, settings, 32);
    }
    Settings single = presetSettings(Preset::Straight);
    single.count = 1;
    verifyCase(gl, pipeline, single, 1);
    Settings resting = presetSettings(Preset::Helix);
    resting.initialVelocity = {};
    resting.count = 17;
    verifyCase(gl, pipeline, resting, 32);
    Settings neutral = presetSettings(Preset::Helix);
    neutral.fields.electric = {0.3F, -0.7F, 0.2F};
    neutral.fields.chargeScale = 0;
    neutral.count = 257;
    verifyCase(gl, pipeline, neutral, 32);
    Settings coarse = presetSettings(Preset::Helix);
    coarse.count = 257;
    coarse.dt = 1.0F / 60.0F;
    const auto coarseReport = verifyCase(gl, pipeline, coarse, 32);
    Settings fine = coarse;
    fine.dt = 1.0F / 240.0F;
    const auto fineReport = verifyCase(gl, pipeline, fine, 128);
    requireGpu(fineReport.maximumVelocityError < coarseReport.maximumVelocityError * 0.4, "GPU phase error did not decrease at the same observation time");
    verifyTail(gl, pipeline);

    Settings large = presetSettings(Preset::Electric);
    large.count = largeCount;
    verifyCase(gl, pipeline, large, 1);

    // Render an actual million-element state and compare pixels with the grid-only baseline.
    GpuState scene{};
    std::string error{};
    large = presetSettings(Preset::Helix);
    large.count = largeCount;
    requireGpu(pipeline.createState(gl, large, 3000, scene, error), error);
    pipeline.step(gl, scene, 32);
    Camera camera{};
    int width = 0, height = 0;
    SDL_GetWindowSizeInPixels(window, &width, &height);
    gl.Viewport(0, 0, width, height);
    gl.Enable(GL_DEPTH_TEST);
    gl.ClearColor(0.015F, 0.025F, 0.045F, 1);
    gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    const Mat4 matrix = camera.viewProjection(static_cast<float>(width) / height);
#if LAB_CHECKPOINT >= 12
    PostProcessor post{};
    requireGpu(post.initialize(gl, shaderDirectory, error), error);
    requireGpu(post.resize(gl, width, height, error), error);
    post.begin(gl);
#else
    (void)shaderDirectory;
#endif
    renderer.grid(gl, matrix);
#if LAB_CHECKPOINT >= 12
    post.end(gl, width, height);
#endif
    std::vector<unsigned char> before(static_cast<std::size_t>(width) * height * 4U);
    auto after = before;
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, before.data());
#if LAB_CHECKPOINT >= 12
    post.begin(gl);
    renderer.grid(gl, matrix);
#endif
    const std::size_t drawn = renderer.particles(gl, scene, matrix, camera.eye(), false, 1.0F);
#if LAB_CHECKPOINT >= 12
    post.end(gl, width, height);
#endif
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, after.data());
    std::size_t changed = 0;
    for (std::size_t pixel = 0; pixel < before.size(); pixel += 4U) {
        if (before[pixel] != after[pixel] || before[pixel + 1U] != after[pixel + 1U] || before[pixel + 2U] != after[pixel + 2U])
            ++changed;
    }
    // Camera/input adapters can change the view, never the particle records.
    Particle beforeCamera{}, afterCamera{};
    gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
    waitVerificationFence(gl, gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0));
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, scene.buffer);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(Particle), &beforeCamera);
    Controls controls{};
    SDL_Event key{};
    key.type = SDL_EVENT_KEY_DOWN;
    key.key.key = SDLK_SPACE;
    controls.event(key, width, largeCount);
    requireGpu(controls.paused, "Space input adapter did not pause");
    key.key.key = SDLK_N;
    controls.event(key, width, largeCount);
    requireGpu(controls.singleStep, "Single-step input adapter");
    key.key.key = SDLK_J;
    controls.event(key, width, largeCount);
    key.key.key = SDLK_PAGEUP;
    controls.event(key, width, largeCount);
    camera = controls.camera;
    renderer.particles(gl, scene, camera.viewProjection(static_cast<float>(width) / height), camera.eye(), false, 1);
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, scene.buffer);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(Particle), &afterCamera);
    requireGpu(sameParticle(beforeCamera, afterCamera, 0, 0), "Camera modified physical state");
    PendingReset invalidReset{};
    Settings invalidSettings = large;
    invalidSettings.fields.electric.x = std::numeric_limits<float>::quiet_NaN();
    requireGpu(!invalidReset.request(gl, pipeline, invalidSettings, 4000, error), "Non-finite reset was accepted");
    requireGpu(!invalidReset.busy() && scene.buffer != 0, "Failed reset destroyed current buffer");
    ValidationJob cancelled{};
    Settings small = large;
    small.count = 257;
    requireGpu(cancelled.start(gl, pipeline, small, 32, 4001, error), error);
    cancelled.cancel(gl);
    requireGpu(!cancelled.busy() && !cancelled.complete, "Cancelled validation became PASS");
#if LAB_CHECKPOINT >= 11
    BenchmarkJob benchmark{};
    requireGpu(benchmark.start(gl, pipeline, large, 5000, error), error);
    const Uint64 benchmarkDeadline = SDL_GetTicks() + 32000;
    while (benchmark.busy() && SDL_GetTicks() < benchmarkDeadline) {
        const Uint64 frameStart = SDL_GetPerformanceCounter();
        gl.Viewport(0, 0, width, height);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
#if LAB_CHECKPOINT >= 12
        post.begin(gl);
#endif
        renderer.grid(gl, matrix);
        benchmark.frame(gl, pipeline, renderer, matrix, Camera{}.eye(), 1);
#if LAB_CHECKPOINT >= 12
        post.end(gl, width, height);
#endif
        SDL_GL_SwapWindow(window);
        const double frameMs = 1000.0 * static_cast<double>(SDL_GetPerformanceCounter() - frameStart) / SDL_GetPerformanceFrequency();
        benchmark.recordFrame(frameMs);
        SDL_Delay(1);
    }
    if (benchmark.busy())
        benchmark.cancel(gl);
    requireGpu(benchmark.complete && benchmark.progress() == BenchmarkJob::kSamples, "Finite benchmark not completed");
    requireGpu(benchmark.updateMs.minimum <= benchmark.updateMs.median && benchmark.updateMs.median <= benchmark.updateMs.maximum, "Invalid GPU update timing distribution");
    std::cout << "BENCHMARK N=" << largeCount << " warmups=4 samples=20 update_gpu_ms="
        << benchmark.updateMs.minimum << '/' << benchmark.updateMs.median << '/' << benchmark.updateMs.maximum
        << " draw_gpu_ms=" << benchmark.drawMs.minimum << '/' << benchmark.drawMs.median << '/' << benchmark.drawMs.maximum
        << " frame_cpu_present_ms=" << benchmark.frameMs.minimum << '/' << benchmark.frameMs.median << '/' << benchmark.frameMs.maximum << '\n';
    requireGpu(benchmark.start(gl, pipeline, small, 5001, error), error);
    benchmark.cancel(gl);
    requireGpu(!benchmark.complete && !benchmark.busy(), "Cancelled benchmark retained completion");
#endif
    scene.destroy(gl);
#if LAB_CHECKPOINT >= 12
    requireGpu(!post.resize(gl, 0, 0, error), "Zero-size render target accepted");
    requireGpu(post.resize(gl, width, height, error), "Last valid render target lost");
    post.destroy(gl);
#endif
    requireGpu(drawn == largeCount && changed > 100U, "Large state did not produce visible particle pixels");
    requireGpu(gl.GetError() == GL_NO_ERROR, "OpenGL error at the end of verification");
    std::cout << "SCALE PASS allocated/updated/drawn=" << largeCount << " changed_pixels=" << changed
        << "; full verification readback occurs only in explicit bounded job, never regular frame path\n";
}
#endif

} // namespace chamber
