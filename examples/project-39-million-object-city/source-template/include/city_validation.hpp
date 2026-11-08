#pragma once

#include "city_application.hpp"
#include "city_gpu_validation.hpp"

#include <iostream>

namespace city {

inline bool waitForGpu(GlApi& gl, double seconds) {
    // CLI verification only. The interactive job polls once per event-loop tick instead.
    GLsync fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.Flush();
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::duration<double>(seconds);
    bool complete = false;
    while (std::chrono::steady_clock::now() < deadline) {
        const GLenum state = gl.ClientWaitSync(fence, 0, 0);
        if (state == GL_ALREADY_SIGNALED || state == GL_CONDITION_SATISFIED) {
            complete = true;
            break;
        }
        if (state == GL_WAIT_FAILED) {
            break;
        }
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                gl.DeleteSync(fence);
                return false;
            }
        }
        SDL_Delay(1);
    }
    gl.DeleteSync(fence);
    return complete;
}

inline int Application::verify() {
#if LAB_CHECKPOINT >= 11
    std::string fixtureError{};
    if (!verifyCityGpuFixtures(gl_, shaders_, fixtureError)) {
        throw std::runtime_error(fixtureError);
    }
    // Full scene readback is allowed here, not in the per-frame drawing path.
    const Frustum planes = camera_.frustum(static_cast<float>(width_) / height_);
    gpu_.run(gl_, planes, camera_.position, true);
    if (!waitForGpu(gl_, 10.0)) {
        throw std::runtime_error("Scene verification exceeded its GPU deadline");
    }
    const GpuSnapshot snapshot = gpu_.readSnapshot(gl_, objects_.size());
    const GpuStats expected = cpuStatistics(objects_, planes, camera_.position, true);
    if (snapshot.stats.counts != expected.counts || snapshot.stats.tested != objects_.size()) {
        throw std::runtime_error("GPU culling did not test the entire resident scene");
    }
    if (!distanceMatches(snapshot.stats.minimumDistance, expected.minimumDistance) || !distanceMatches(snapshot.stats.maximumDistance, expected.maximumDistance)) {
        throw std::runtime_error("GPU distance reduction differs from the CPU reference");
    }
    const auto expectedIDs = cpuVisibleIDs(objects_, planes, true);
    if (snapshot.visibleIDs != expectedIDs || !gpu_.guardRecordsIntact(gl_)) {
        throw std::runtime_error("Compaction lost/duplicated an ID or wrote beyond a buffer");
    }
    Counts running{};
    for (std::size_t index = 0; index < objects_.size(); ++index) {
        Counts mask{};
        if (sphereAccepted(planes, objects_[index])) {
            mask[objects_[index].mesh] = 1U;
            mask[3] = 1U;
        }
        if (snapshot.masks[index] != mask || snapshot.prefixes[index] != running) {
            throw std::runtime_error("Mask/prefix mismatch at record " + std::to_string(index));
        }
        for (unsigned channel = 0; channel < 4U; ++channel) {
            running[channel] += mask[channel];
        }
    }
    const auto expectedCommands = makeCommands(expected.counts);
    for (std::size_t group = 0; group < 3U; ++group) {
        const auto a = snapshot.commands[group];
        const auto b = expectedCommands[group];
        if (a.count != b.count || a.instanceCount != b.instanceCount || a.firstIndex != b.firstIndex || a.baseVertex != 0 || a.baseInstance != 0U) {
            throw std::runtime_error("Indirect command range/group mismatch");
        }
    }
    // Compare actual framebuffer bytes without HUD/fog masking a missing building.
    std::vector<unsigned char> reference(static_cast<std::size_t>(width_) * height_ * 4U);
    std::vector<unsigned char> candidate(reference.size());
    for (unsigned cameraIndex = 0; cameraIndex < 6U; ++cameraIndex) {
        const Camera view = cameraSnapshot(cameraIndex);
        const Frustum viewPlanes = view.frustum(static_cast<float>(width_) / height_);
        for (int toggle = 0; toggle < 2; ++toggle) {
            gpu_.run(gl_, viewPlanes, view.position, toggle == 1);
            gl_.Viewport(0, 0, width_, height_);
            gl_.ClearColor(0.31F, 0.46F, 0.59F, 1.0F);
            gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            renderer_.draw(gl_, gpu_, view, viewPlanes, width_, height_, false, std::numeric_limits<unsigned>::max());
            if (!waitForGpu(gl_, 10.0)) {
                throw std::runtime_error("Render A/B deadline exceeded");
            }
            gl_.PixelStorei(GL_PACK_ALIGNMENT, 1);
            unsigned char* destination = reference.data();
            if (toggle == 1) {
                destination = candidate.data();
            }
            gl_.ReadPixels(0, 0, width_, height_, GL_RGBA, GL_UNSIGNED_BYTE, destination);
        }
        if (reference != candidate) {
            throw std::runtime_error("Culling on/off changes framebuffer at camera " + std::to_string(cameraIndex));
        }
    }
    if (!validation_.begin()) {
        throw std::runtime_error("Runtime validation job could not start");
    }
    validation_.poll(gl_);
    validation_.cancel(gl_);
    if (validation_.active() || validation_.passed()) {
        throw std::runtime_error("Cancelled validation must be incomplete, not PASS");
    }
    validation_.begin();
    while (validation_.active()) {
        validation_.poll(gl_);
        SDL_PumpEvents();
        SDL_Delay(1);
    }
    if (!validation_.passed()) {
        throw std::runtime_error(validation_.message());
    }
    std::cout << "RUNTIME VALIDATION PASS 12/12 and cancel-incomplete; FRAMEBUFFER PASS six cameras on/off\n";
    stats_.request(gl_, gpu_);
    stats_.invalidate(gl_);
    if (stats_.valid || stats_.latest.tested != 0U) {
        throw std::runtime_error("Old stats survived scene-generation invalidation");
    }
    stats_.request(gl_, gpu_);
    if (!waitForGpu(gl_, 5.0)) {
        throw std::runtime_error("Stats replacement fence deadline exceeded");
    }
    stats_.poll(gl_);
    if (!stats_.valid || stats_.latest.tested != objects_.size()) {
        throw std::runtime_error("New stats snapshot did not replace discarded generation");
    }
#if LAB_CHECKPOINT >= 12
    verifyControls();
#endif
    std::string label = "CORRECTNESS PASS";
    if (objects_.size() >= 1'000'000U) {
        label = "SCALE PASS";
    }
    std::cout << label << " resident=" << objects_.size() << " tested=" << snapshot.stats.tested << " accepted=" << expected.counts[3] << " submitted=" << expectedIDs.size() << " commands=3 gpuBytes=" << gpu_.bytes() << " all-mask-prefix-ID checks=exact framebuffer=identical\n";
    return 0;
#else
    throw std::runtime_error("Use final or checkpoint 11+ for GPU verification");
#endif
}

} // namespace city
