#pragma once

#include "morph_app.hpp"
#include <iostream>

namespace morph {

inline void waitForGpu(GlApi &gl) {
    const GLsync fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence)
        throw std::runtime_error("Could not allocate verification fence");
    gl.Flush();
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(3);
    try {
        for (;;) {
            const GLenum state = gl.ClientWaitSync(fence, 0, 0);
            if (state == GL_ALREADY_SIGNALED || state == GL_CONDITION_SATISFIED)
                break;
            if (state == GL_WAIT_FAILED)
                throw std::runtime_error("GPU verification fence failed");
            if (std::chrono::steady_clock::now() >= deadline)
                throw std::runtime_error("GPU verification fence timed out");
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT)
                    throw std::runtime_error("Verification cancelled");
            }
            SDL_Delay(1);
        }
    } catch (...) {
        gl.DeleteSync(fence);
        throw;
    }
    gl.DeleteSync(fence);
}

inline void verifyGpu(App &app, GlApi &gl) {
#if LAB_CHECKPOINT >= 7
    if (!app.gpu() || !app.compute())
        throw std::logic_error("Verification needs a complete GPU generation");
    const Prepared &data = app.gpu()->data();
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
    std::uint64_t comparisons = 0;
    for (const Matching matching : {Matching::random, Matching::spatial}) {
        for (const Easing easing : {Easing::linear, Easing::smooth}) {
            for (const Path path : {Path::straight, Path::arc, Path::flow}) {
                for (const double t : {0.0, 0.27, 0.73, 1.0}) {
                    app.gpu()->update(*app.compute(), t, matching, easing, path);
                    gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
                    waitForGpu(gl);
                    for (std::uint32_t first = 0; first < data.settings.count; first += 16384) {
                        if (std::chrono::steady_clock::now() >= deadline)
                            throw std::runtime_error("Full-state verification deadline reached");
                        const auto count = std::min(16384U, data.settings.count - first);
                        const auto actual = app.gpu()->readCurrent(first, count);
                        for (std::uint32_t offset = 0; offset < count; ++offset) {
                            const std::uint32_t id = first + offset;
                            const Vec3 expected = positionAt(data, id, t, matching, easing, path);
                            if (!finite(xyz(actual[offset])) || length(xyz(actual[offset]) - expected) > 8e-5 || actual[offset].w != static_cast<float>(id))
                                throw std::runtime_error("GPU position or sample ID differs at " + std::to_string(id));
                            if (t == 0.0) {
                                const auto &endpoint = data.source[id];
                                if (actual[offset].x != endpoint.x || actual[offset].y != endpoint.y || actual[offset].z != endpoint.z)
                                    throw std::runtime_error("Source endpoint was not copied exactly");
                            }
                            if (t == 1.0) {
                                std::uint32_t target = data.mapping[id].random;
                                if (matching == Matching::spatial)
                                    target = data.mapping[id].spatial;
                                const auto &endpoint = data.target[target];
                                if (actual[offset].x != endpoint.x || actual[offset].y != endpoint.y || actual[offset].z != endpoint.z)
                                    throw std::runtime_error("Target endpoint was not copied exactly");
                            }
                            ++comparisons;
                        }
                    }
                    const auto sentinel = app.gpu()->readCurrent(data.settings.count, 1);
                    if (!(sentinel.front() == tailCanary))
                        throw std::runtime_error("A tail invocation overwrote the canary");
                }
            }
        }
    }
    std::cout << "GPU MORPH PASS N=" << data.settings.count << " compared=" << comparisons << " combinations=48 tail=INTACT\n";
    app.forceUpdate();
#else
    (void)app;
    (void)gl;
    throw std::invalid_argument("GPU validation is introduced at checkpoint 7");
#endif
}

inline void verifyControls(App &app) {
    if (!app.ready())
        throw std::logic_error("Controls fixture needs ACTIVE");
    const auto generation = app.session().active()->generation;
    const auto key = [&](SDL_Keycode code) {
        SDL_Event event{};
        event.type = SDL_EVENT_KEY_DOWN;
        event.key.key = code;
        app.event(event);
    };
    app.timeline.paused = true;
    key(SDLK_END);
    if (app.timeline.normalized() != 1.0)
        throw std::runtime_error("End did not scrub to the target");
    key(SDLK_HOME);
    if (app.timeline.normalized() != 0.0)
        throw std::runtime_error("Home did not scrub to the source");
    key(SDLK_M);
    key(SDLK_E);
    key(SDLK_C);
    key(SDLK_I);
    key(SDLK_PAGEUP);
    app.draw();
    if (app.session().active()->generation != generation || app.session().busy())
        throw std::runtime_error("Camera or live A/B rebuilt the sample generation");
    const auto active = app.session().active();
    app.staged().seed += 1;
    key(SDLK_RETURN);
    app.advance(0.0);
    key(SDLK_X);
    if (app.session().active() != active || app.session().busy())
        throw std::runtime_error("Cancel did not keep last-good");
    app.staged().count = 0;
    key(SDLK_RETURN);
    if (app.session().active() != active || app.session().error().empty())
        throw std::runtime_error("Invalid configuration did not preserve ACTIVE");
    app.staged() = active->settings;
    SDL_Event focus{};
    focus.type = SDL_EVENT_WINDOW_FOCUS_LOST;
    app.event(focus);
    if (app.pointerHeld() || !app.timeline.paused)
        throw std::runtime_error("Focus loss did not clear pointer and pause");
    key(SDLK_R);
    std::cout << "NATIVE EVENT PASS: scrub, camera/no rebuild, A/B, cancel, invalid/last-good, focus cleanup (not manual OS input)\n";
}

} // namespace morph
