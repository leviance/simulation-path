#pragma once
#include "chamber_benchmark.hpp"
#include "chamber_panel.hpp"
#include "chamber_post.hpp"
#include "chamber_reference.hpp"
#include "chamber_validation.hpp"
#include "chamber_verify.hpp"

#include <iostream>

namespace chamber {

struct RunOptions {
    bool verify{};
    bool hidden{};
    int frames{};
    double seconds{};
    bool sideView{};
    std::size_t count{};
    std::string capture{};
};

class Application {
    SDL_Window* window_{};
    SDL_GLContext context_{};
    bool sdlStarted_{};
    bool glLoaded_{};
    GlApi gl_{};
    SceneRenderer renderer_{};
#if LAB_CHECKPOINT >= 12
    PostProcessor post_{};
#endif
#if LAB_CHECKPOINT >= 6
    ComputePipeline pipeline_{};
    GpuState current_{};
    PendingReset pending_{};
#endif
#if LAB_CHECKPOINT >= 9
    ProbeReader reader_{};
    ProbeSnapshot snapshot_{};
    TrailHistory history_{};
#endif
#if LAB_CHECKPOINT >= 10
    ValidationJob validation_{};
#endif
#if LAB_CHECKPOINT >= 11
    BenchmarkJob benchmark_{};
    TimerRing updateTimer_{}, drawTimer_{};
    Camera measuredCamera_{};
    int measuredWidth_{}, measuredHeight_{};
#endif

    public:
    ~Application() {
        if (glLoaded_) {
#if LAB_CHECKPOINT >= 12
            post_.destroy(gl_);
#endif
#if LAB_CHECKPOINT >= 11
            benchmark_.cancel(gl_);
            updateTimer_.destroy(gl_);
            drawTimer_.destroy(gl_);
#endif
#if LAB_CHECKPOINT >= 10
            validation_.cancel(gl_);
#endif
#if LAB_CHECKPOINT >= 9
            reader_.destroy(gl_);
#endif
#if LAB_CHECKPOINT >= 6
            pending_.cancel(gl_);
            current_.destroy(gl_);
            pipeline_.destroy(gl_);
#endif
            renderer_.destroy(gl_);
        }
        if (window_)
            SDL_CaptureMouse(false);
        if (context_)
            SDL_GL_DestroyContext(context_);
        if (window_)
            SDL_DestroyWindow(window_);
        if (sdlStarted_)
            SDL_Quit();
    }

    int run(const RunOptions& options) {
        if (!SDL_Init(SDL_INIT_VIDEO))
            throw std::runtime_error(SDL_GetError());
        sdlStarted_ = true;
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1) || !SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24))
            throw std::runtime_error(SDL_GetError());
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (options.hidden || options.verify)
            flags |= SDL_WINDOW_HIDDEN;
        window_ = SDL_CreateWindow("Project 38 - Charged Particle Chamber", 1440, 900, flags);
        if (!window_)
            throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window_, 1000, 760);
        context_ = SDL_GL_CreateContext(window_);
        if (!context_)
            throw std::runtime_error("OpenGL 4.3 context required: " + std::string(SDL_GetError()));
        if (!gl_.load())
            throw std::runtime_error("Missing OpenGL entry point: " + gl_.missingFunction);
        glLoaded_ = true;
        int swapInterval = 1;
        if (options.verify || options.hidden)
            swapInterval = 0;
        SDL_GL_SetSwapInterval(swapInterval);
        gl_.Enable(GL_PROGRAM_POINT_SIZE);
        gl_.Enable(GL_DEPTH_TEST);
        std::filesystem::path shaders{COURSE_SHADER_DIRECTORY};
        if (!std::filesystem::exists(shaders)) {
            const char* base = SDL_GetBasePath();
            if (!base)
                throw std::runtime_error(SDL_GetError());
            shaders = std::filesystem::path(base) / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
        }
        std::string error{};
        if (!renderer_.initialize(gl_, shaders, error))
            throw std::runtime_error(error);
#if LAB_CHECKPOINT >= 12
        if (!post_.initialize(gl_, shaders, error))
            throw std::runtime_error(error);
#endif
#if LAB_CHECKPOINT >= 6
        if (!pipeline_.initialize(gl_, shaders, error))
            throw std::runtime_error(error);
#endif
#if LAB_CHECKPOINT >= 9
        if (!reader_.initialize(gl_))
            throw std::runtime_error("Probe buffer allocation failed");
#endif
#if LAB_CHECKPOINT >= 11
        updateTimer_.initialize(gl_);
        drawTimer_.initialize(gl_);
#endif
#if LAB_CHECKPOINT >= 10
        if (options.verify) {
            std::size_t count = 1'000'003U;
            if (options.count != 0)
                count = options.count;
            verifyGpu(gl_, pipeline_, renderer_, window_, count, shaders);
            return 0;
        }
#else
        if (options.verify)
            throw std::runtime_error("GPU verification is introduced at checkpoint 10");
#endif
        Controls controls{};
        if (options.sideView) {
            controls.camera.yaw = 0.22F;
            controls.camera.pitch = 0.32F;
        }
        FrameInfo info{};
        const GLubyte* deviceName = gl_.GetString(GL_RENDERER);
        if (deviceName)
            info.device = reinterpret_cast<const char*>(deviceName);
#if LAB_CHECKPOINT >= 2
        Settings active = controls.staged;
#if LAB_CHECKPOINT <= 5
        controls.staged.count = 512;
#endif
        if (options.count != 0)
            controls.staged.count = options.count;
        active = controls.staged;
        FixedClock clock{};
        std::uint64_t generation = 1;
#if LAB_CHECKPOINT <= 5
        std::vector<Particle> preview{};
        const auto resetPreview = [&]() {
            preview.clear();
            const std::size_t count = std::min(active.count, std::size_t{4096});
            for (std::size_t id = 0; id < count; ++id)
                preview.push_back(initialParticle(static_cast<std::uint32_t>(id), active));
            clock.reset();
        };
        resetPreview();
        info.message = "CPU preview only; GPU scale is introduced later";
#endif
#if LAB_CHECKPOINT >= 6
        if (!pending_.request(gl_, pipeline_, controls.staged, generation, error))
            info.message = error;
#endif
#endif
        Uint64 previousCounter = SDL_GetPerformanceCounter();
        const Uint64 runStart = SDL_GetTicks();
        int renderedFrames = 0;
        while (controls.running) {
            const Uint64 frameStart = SDL_GetPerformanceCounter();
            const double wall = static_cast<double>(frameStart - previousCounter) / SDL_GetPerformanceFrequency();
            previousCounter = frameStart;
            int logicalWidth = 0, logicalHeight = 0, width = 0, height = 0;
            SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
            SDL_GetWindowSizeInPixels(window_, &width, &height);
            std::size_t activeCount = 1;
#if LAB_CHECKPOINT >= 2
            activeCount = std::max(std::size_t{1}, active.count);
#endif
            // Even a minimized window must process Quit and release pointer capture.
            SDL_Event event{};
            while (SDL_PollEvent(&event))
                controls.event(event, std::max(1, logicalWidth), activeCount);
            if (!controls.running)
                break;
            if (logicalWidth <= 0 || logicalHeight <= 0 || width <= 0 || height <= 0) {
                if (options.seconds > 0 && static_cast<double>(SDL_GetTicks() - runStart) >= options.seconds * 1000.0)
                    break;
                SDL_Delay(10);
                continue;
            }
            const float dpr = static_cast<float>(width) / logicalWidth;
            int sceneWidth = width;
            if (!controls.showcase)
                sceneWidth = std::max(1, width - static_cast<int>(384 * dpr));
#if LAB_CHECKPOINT >= 11
            if (benchmark_.busy() && (controls.camera.yaw != measuredCamera_.yaw || controls.camera.pitch != measuredCamera_.pitch || controls.camera.distance != measuredCamera_.distance || !sameVector(controls.camera.target, measuredCamera_.target) || sceneWidth != measuredWidth_ || height != measuredHeight_)) {
                benchmark_.cancel(gl_);
                benchmark_.status = "Camera/viewport changed: incomplete";
            }
#endif

#if LAB_CHECKPOINT >= 2
            if (controls.apply || controls.reset || controls.cancel) {
#if LAB_CHECKPOINT >= 10
                if (validation_.busy())
                    validation_.cancel(gl_);
#endif
#if LAB_CHECKPOINT >= 11
                if (benchmark_.busy())
                    benchmark_.cancel(gl_);
#endif
#if LAB_CHECKPOINT >= 6
                if (controls.cancel)
                    pending_.cancel(gl_);
#endif
            }
            if (controls.reset)
                controls.staged = active;
            if (controls.apply || controls.reset) {
                if (validSettings(controls.staged, error)) {
#if LAB_CHECKPOINT >= 6
                    if (!pending_.request(gl_, pipeline_, controls.staged, ++generation, error))
                        info.message = error;
#else
                    active = controls.staged;
                    resetPreview();
                    controls.stagedChanged = false;
#endif
                } else
                    info.message = error;
            }
            controls.apply = controls.reset = controls.cancel = false;
#if LAB_CHECKPOINT >= 6
            if (pending_.publishIfReady(gl_, current_, error)) {
#if LAB_CHECKPOINT >= 11
                if (!sameSettings(active, current_.settings)) {
                    benchmark_.cancel(gl_);
                    benchmark_.status = "New configuration: not measured";
                }
#endif
                active = current_.settings;
                clock.reset();
                controls.selectedParticle = std::min(controls.selectedParticle, static_cast<std::uint32_t>(active.count - 1U));
                controls.stagedChanged = !sameSettings(controls.staged, active);
                info.message = "Active state ready; normalized units, no walls/respawn";
#if LAB_CHECKPOINT >= 9
                reader_.cancel(gl_);
                snapshot_ = {};
                history_.reset();
#endif
#if LAB_CHECKPOINT >= 11
                updateTimer_.reset(gl_);
                drawTimer_.reset(gl_);
#endif
            }
            if (!error.empty()) {
                info.message = error;
                error.clear();
            }
#endif
            bool held = false;
#if LAB_CHECKPOINT >= 10
            if (controls.validate && !pending_.busy()) {
#if LAB_CHECKPOINT >= 11
                if (benchmark_.busy())
                    benchmark_.cancel(gl_);
#endif
                if (!validation_.start(gl_, pipeline_, active, 32, ++generation, error))
                    info.message = error;
            }
            controls.validate = false;
            validation_.poll(gl_);
            info.validation = validation_.status;
            held = validation_.busy();
#endif
#if LAB_CHECKPOINT >= 11
            if (controls.benchmark && !pending_.busy() && !validation_.busy()) {
                if (!benchmark_.start(gl_, pipeline_, active, ++generation, error))
                    info.message = error;
                else {
                    measuredCamera_ = controls.camera;
                    measuredWidth_ = sceneWidth;
                    measuredHeight_ = height;
                }
            }
            controls.benchmark = false;
            info.benchmark = benchmark_.status;
            if (benchmark_.complete) {
                char measured[180]{};
                std::snprintf(measured, sizeof(measured), "MEASURED N=%zu U %.3F/%.3F/%.3F D %.3F/%.3F/%.3F FRAME %.2F MS MIN/MED/MAX", benchmark_.measured.count, benchmark_.updateMs.minimum, benchmark_.updateMs.median, benchmark_.updateMs.maximum, benchmark_.drawMs.minimum, benchmark_.drawMs.median, benchmark_.drawMs.maximum, benchmark_.frameMs.median);
                info.benchmark = measured;
            }
            held = held || benchmark_.busy();
            updateTimer_.poll(gl_);
            drawTimer_.poll(gl_);
            info.updateMs = updateTimer_.median();
            info.drawMs = drawTimer_.median();
#endif
            const int steps = clock.advance(wall, active.dt, controls.paused || held, controls.singleStep && !held);
            controls.singleStep = false;
            info.updated = 0;
#if LAB_CHECKPOINT >= 7
            if (current_.buffer && steps > 0) {
#if LAB_CHECKPOINT >= 11
                updateTimer_.begin(gl_);
#endif
                pipeline_.step(gl_, current_, steps);
                info.updated = active.count * static_cast<std::size_t>(steps);
#if LAB_CHECKPOINT >= 11
                updateTimer_.end(gl_);
#endif
                clock.commit(steps, active.dt);
            }
#elif LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT <= 5
            for (int stepIndex = 0; stepIndex < steps; ++stepIndex) {
                for (Particle& p : preview) {
#if LAB_CHECKPOINT >= 4
                    stepBoris(p, active.fields, active.dt);
#else
                    stepEuler(p, active.fields, active.dt);
#endif
                }
            }
            clock.commit(steps, active.dt);
            info.updated = preview.size() * static_cast<std::size_t>(steps);
#endif
#endif
            info.tick = clock.tick;
            info.time = clock.simulatedSeconds;
#if LAB_CHECKPOINT >= 8
            // Publish completed work, not requested catch-up steps while a reset is pending.
            info.appliedSteps = static_cast<int>(info.updated / active.count);
            info.discarded = clock.discardedSeconds;
#endif
#if LAB_CHECKPOINT >= 5
            info.phaseSpan = preparedPhaseSpan(active);
#endif
#if LAB_CHECKPOINT >= 6
            info.allocated = 0;
            if (current_.buffer)
                info.allocated = current_.settings.count;
            info.stateMiB = static_cast<double>(current_.budget.stateBytes) / (1024.0 * 1024.0);
            info.reservedMiB = static_cast<double>(current_.budget.reservedBytes) / (1024.0 * 1024.0);
            info.blockMiB = static_cast<double>(pipeline_.limits.maximumBlockBytes) / (1024.0 * 1024.0);
#else
            info.allocated = preview.size();
#endif
#if LAB_CHECKPOINT >= 9
            if (reader_.poll(gl_, snapshot_, error) && snapshot_.generation == current_.generation)
                history_.append(snapshot_);
            info.selectedReady = snapshot_.generation == current_.generation && current_.buffer != 0 && snapshot_.selected == controls.selectedParticle;
            if (info.selectedReady) {
                const Particle& selected = snapshot_.particles[kProbeCount - 1U];
                info.selectedPosition = position(selected);
                info.selectedVelocity = velocity(selected);
                const auto exactState = analyticState(snapshotParticle(controls.selectedParticle, active), active.fields, snapshot_.time);
                info.selectedPositionError = positionError(selected, exactState);
                info.selectedVelocityError = velocityError(selected, exactState);
            }
            if (controls.focus && info.selectedReady)
                controls.camera.target = info.selectedPosition;
            controls.focus = false;
            reader_.request(gl_, pipeline_, current_, controls.selectedParticle);
#endif
#endif

            gl_.Disable(GL_SCISSOR_TEST);
            gl_.ClearColor(0.015F, 0.025F, 0.045F, 1);
            gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            gl_.Viewport(0, 0, sceneWidth, height);
            float renderDpr = dpr;
            info.renderWidth = sceneWidth;
            info.renderHeight = height;
#if LAB_CHECKPOINT >= 12
            const bool postActive = post_.resize(gl_, sceneWidth, height, error);
            if (postActive) {
                post_.begin(gl_);
                renderDpr *= post_.scale(sceneWidth);
                info.renderWidth = post_.width();
                info.renderHeight = post_.height();
            }
#endif
            const Mat4 matrix = controls.camera.viewProjection(static_cast<float>(sceneWidth) / height);
#if LAB_CHECKPOINT >= 1
            renderer_.grid(gl_, matrix);
#endif
#if LAB_CHECKPOINT >= 2
            info.drawn = 0;
#if LAB_CHECKPOINT >= 6
            bool benchmarkDrawn = false;
#if LAB_CHECKPOINT >= 11
            benchmarkDrawn = benchmark_.frame(gl_, pipeline_, renderer_, matrix, controls.camera.eye(), renderDpr);
#endif
            if (!benchmarkDrawn) {
#if LAB_CHECKPOINT >= 11
                drawTimer_.begin(gl_);
#endif
                info.drawn = renderer_.particles(gl_, current_, matrix, controls.camera.eye(), controls.bySpeed, renderDpr);
#if LAB_CHECKPOINT >= 11
                drawTimer_.end(gl_);
#endif
            } else
                info.drawn = active.count;
            info.haloSamples = SceneRenderer::haloSampleCount(info.drawn);
#else
            renderer_.previewParticles(gl_, preview, matrix);
            info.drawn = preview.size();
#endif
            if (controls.debug) {
                renderer_.fieldArrow(gl_, {-4, 0, 0}, active.fields.electric, {1, 0.4F, 0.85F}, matrix);
                renderer_.fieldArrow(gl_, {-4, 0, 1}, active.fields.magnetic, {0.3F, 1, 0.65F}, matrix);
            }
#if LAB_CHECKPOINT >= 9
            if (controls.showTrails)
                renderer_.trails(gl_, history_, active.count, active.fields.chargeScale, controls.camera, matrix);
            if (info.selectedReady)
                renderer_.selectedMarker(gl_, info.selectedPosition, controls.camera, matrix);
            if (controls.picking && snapshot_.generation == current_.generation) {
                float nearest = 18.0F * dpr;
                for (std::size_t id = 0; id < std::min(std::size_t{32}, snapshot_.count); ++id) {
                    const ScreenPoint projected = projectPoint(position(snapshot_.particles[id]), matrix, sceneWidth, height);
                    const float dx = projected.x - controls.pickX * dpr;
                    const float dy = projected.y - controls.pickY * dpr;
                    const float distance = std::sqrt(dx * dx + dy * dy);
                    if (projected.visible && distance < nearest) {
                        controls.selectedParticle = static_cast<std::uint32_t>(id);
                        nearest = distance;
                    }
                }
            }
            controls.picking = false;
#endif
#endif
#if LAB_CHECKPOINT >= 12
            if (postActive)
                post_.end(gl_, sceneWidth, height);
#endif
            Overlay overlay{width, height, {}};
#if LAB_CHECKPOINT >= 2
            if (controls.showcase)
                drawShowcase(overlay, controls, active, info, dpr);
            else
                drawPanel(overlay, controls, active, info, dpr);
            if (controls.debug) {
                const ScreenPoint electricEnd = projectPoint(Vec3{-4, 0, 0} + active.fields.electric * 0.8F, matrix, sceneWidth, height);
                const ScreenPoint magneticEnd = projectPoint(Vec3{-4, 0, 1} + active.fields.magnetic * 0.8F, matrix, sceneWidth, height);
                if (electricEnd.visible)
                    overlay.text(electricEnd.x, electricEnd.y - 14 * dpr, "E", {1, 0.4F, 0.85F}, 2 * dpr);
                if (magneticEnd.visible)
                    overlay.text(magneticEnd.x, magneticEnd.y - 14 * dpr, "B", {0.3F, 1, 0.65F}, 2 * dpr);
            }
#else
            scaffoldPanel(overlay, dpr, width);
#endif
            overlay.draw(gl_, renderer_);
            ++renderedFrames;
            const bool frameLimit = options.frames > 0 && renderedFrames >= options.frames;
            const bool timeLimit = options.seconds > 0 && static_cast<double>(SDL_GetTicks() - runStart) >= options.seconds * 1000.0;
            if (frameLimit || timeLimit) {
                if (!options.capture.empty() && !saveCapture(gl_, width, height, options.capture))
                    throw std::runtime_error(SDL_GetError());
                controls.running = false;
            }
            SDL_GL_SwapWindow(window_);
            info.frameMs = 1000.0 * static_cast<double>(SDL_GetPerformanceCounter() - frameStart) / SDL_GetPerformanceFrequency();
#if LAB_CHECKPOINT >= 11
            benchmark_.recordFrame(info.frameMs);
#endif
        }
        return 0;
    }
};

} // namespace chamber
