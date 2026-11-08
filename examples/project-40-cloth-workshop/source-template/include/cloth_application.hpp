#pragma once

#include "cloth_debug.hpp"
#include "cloth_pick.hpp"
#include "cloth_timing.hpp"
#include "cloth_ui.hpp"
#include "cloth_validation.hpp"
#include "cloth_verify.hpp"

#include <chrono>
#include <iostream>
#include <memory>

namespace cloth {

struct RunOptions {
    bool hidden{}, verify{}, benchmark{}, exerciseControls{};
    std::uint32_t side{}, steps{}, frames{};
    double seconds{};
    Preset preset{Preset::SphereDrape};
    std::string capture{};
};

class Application {
    SDL_Window* window_{};
    SDL_GLContext context_{};
    bool started_{}, loaded_{}, running_{true};
    GlApi gl_{};
    std::unique_ptr<GpuCloth> gpu_{};
    SceneRenderer renderer_{};
    GpuPicker picker_{};
    GpuClothDebug debug_{};
    ValidationJob validation_{};
    BenchmarkJob benchmark_{};
    DrawTimer drawTimer_{};
    ControlPanel panel_{};
    UiState ui_{};
    Input input_{};
    PickResult probe_{};
    enum class PickKind { None,
                        Drag,
                        Pin,
                        Probe };
    PickKind pickKind_{PickKind::None};
    Camera pickCamera_{};
    Camera benchmarkCamera_{};
    bool leftHeld_{}, rightHeld_{}, middleHeld_{}, resetAnnounced_{}, probeDirty_{};
    std::uint64_t probeStep_{}, requestedProbeStep_{}, debugStep_{noVertex};
    Vec3 dragPlanePoint_{}, dragPlaneNormal_{};
    int width_{1440}, height_{900}, sceneWidth_{1080};
    double cpuFrameMs_{};
    double accumulator_{};
    bool fastRun_{};
    std::filesystem::path directory_{};
#if LAB_CHECKPOINT == 4
    CpuState cpu_{};
    std::uint64_t cpuSteps_{};
#endif

    public:
    ~Application() {
        // Cleanup: GPU owners must die before the OpenGL context, not afterwards.
        if (loaded_) {
            releaseInput();
            debug_.destroy(gl_);
            validation_.destroy();
            benchmark_.destroy();
            drawTimer_.destroy();
            picker_.destroy(gl_);
            gpu_.reset();
            renderer_.destroy(gl_);
        }
        if (context_ != nullptr) {
            SDL_GL_DestroyContext(context_);
        }
        if (window_ != nullptr) {
            SDL_DestroyWindow(window_);
        }
        if (started_) {
            SDL_Quit();
        }
    }

    int run(const RunOptions& options) {
        setup(options);
        if (options.verify) {
            return verify();
        }
        if (options.exerciseControls) {
            return exerciseControls();
        }
        if (options.benchmark) {
            ui_.benchmarkRequested = true;
        }
        const auto start = std::chrono::steady_clock::now();
        auto previous = start;
        std::uint32_t frames{};
        while (running_) {
            const auto frameStart = std::chrono::steady_clock::now();
            const double elapsed = std::clamp(std::chrono::duration<double>(frameStart - previous).count(), 0.0, 0.1);
            previous = frameStart;
            events();
            if (options.seconds > 0.0 && std::chrono::duration<double>(frameStart - start).count() >= options.seconds) {
                break;
            }
            const int previousWidth = width_;
            const int previousHeight = height_;
            SDL_GetWindowSizeInPixels(window_, &width_, &height_);
            if ((previousWidth != width_ || previousHeight != height_) && benchmark_.active()) {
                benchmark_.cancel();
                ui_.message = "Benchmark canceled: viewport changed; no PASS";
            }
            if (width_ <= 0 || height_ <= 0) {
                SDL_Delay(10);
                continue;
            }
            sceneWidth_ = width_ - panel_.width(width_);
            std::string error{};
            if (!gpu_->poll(error)) {
                ui_.paused = true;
                ui_.message = error;
                if (options.hidden) {
                    throw std::runtime_error(error);
                }
            }
            pollPick();
            processRequests();
            pollJobs();
            pollDebug();
            if (!ui_.paused) {
                accumulator_ = std::min(accumulator_ + elapsed, 0.1);
            }
            const bool targetReached = options.steps > 0U && stepCount() >= options.steps;
            const bool stepDue = ui_.singleStep || (!ui_.paused && (fastRun_ || accumulator_ >= ui_.settings.dt));
            if (!targetReached && stepDue && !gpu_->busy() && !ui_.resetRequested && !jobActive()) {
                advance();
                accumulator_ = std::max(0.0, accumulator_ - ui_.settings.dt);
                ui_.singleStep = false;
            }
            render();
            ++frames;
            bool done = options.frames > 0U && frames >= options.frames;
            if (options.steps > 0U) {
                done = targetReached;
            }
            if (options.benchmark && !benchmark_.active() && !ui_.benchmarkRequested) {
                if (!benchmark_.passed()) {
                    throw std::runtime_error(benchmark_.message());
                }
                done = true;
            }
            if (done) {
                if (!options.benchmark) {
                    printStats();
                }
                if (!options.capture.empty()) {
                    saveCapture(options.capture);
                }
                running_ = false;
            }
            SDL_GL_SwapWindow(window_);
            cpuFrameMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - frameStart).count();
            if (ui_.paused && !gpu_->busy()) {
                SDL_Delay(5);
            }
        }
        if (!options.capture.empty() && options.frames == 0U && options.steps == 0U) {
            saveCapture(options.capture);
        }
        return 0;
    }

    private:
    void setup(const RunOptions& options) {
        // Setup creates only the SDL/OpenGL scaffold; physics state belongs to GpuCloth.
        if (!SDL_Init(SDL_INIT_VIDEO)) {
            throw std::runtime_error(SDL_GetError());
        }
        started_ = true;
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (options.hidden || options.verify || options.benchmark || options.exerciseControls) {
            flags |= SDL_WINDOW_HIDDEN;
        }
        window_ = SDL_CreateWindow("Project 40 - Cloth Workshop", width_, height_, flags);
        if (window_ == nullptr) {
            throw std::runtime_error(SDL_GetError());
        }
        SDL_SetWindowMinimumSize(window_, 1000, 700);
        context_ = SDL_GL_CreateContext(window_);
        if (context_ == nullptr || !gl_.load()) {
            throw std::runtime_error("OpenGL 4.3 context/functions required: " + gl_.missingFunction + SDL_GetError());
        }
        loaded_ = true;
        fastRun_ = options.hidden || options.benchmark;
        SDL_GL_SetSwapInterval(1);
        if (options.hidden || options.verify || options.benchmark) {
            SDL_GL_SetSwapInterval(0);
        }
        gl_.Enable(GL_DEPTH_TEST);
        gl_.Enable(GL_PROGRAM_POINT_SIZE);
        GLint invocations{}, shared{}, vertexBlocks{};
        gl_.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
        gl_.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &shared);
        gl_.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
        if (invocations < 256 || shared < 8192 || vertexBlocks < 2) {
            throw std::runtime_error("Need 256 compute invocations, 8KiB shared memory and 2 vertex SSBOs");
        }
        directory_ = std::filesystem::path(COURSE_SHADER_DIRECTORY);
        if (!std::filesystem::exists(directory_)) {
            directory_ = std::filesystem::path(SDL_GetBasePath()) / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
        }
        std::string error{};
        if (!renderer_.initialize(gl_, directory_, error) || !picker_.initialize(gl_, directory_, error) || !drawTimer_.initialize(gl_, error)) {
            throw std::runtime_error(error);
        }
#if LAB_CHECKPOINT >= 11
        if (!debug_.initialize(gl_, directory_, error)) {
            throw std::runtime_error(error);
        }
#endif
#if LAB_CHECKPOINT >= 13
        if (!validation_.initialize(gl_, directory_, error) || !benchmark_.initialize(gl_, directory_, error)) {
            throw std::runtime_error(error);
        }
#endif
        gpu_ = std::make_unique<GpuCloth>(gl_);
        if (!gpu_->initialize(directory_, error)) {
            throw std::runtime_error(error);
        }
        ui_.settings.side = 17U;
#if LAB_CHECKPOINT >= 14
        ui_.settings.side = 321U;
#endif
        if (options.side != 0U) {
            ui_.settings.side = options.side;
        }
        ui_.settings = presetSettings(ui_.settings, options.preset);
        framePreset();
        if (!gpu_->reset(ui_.settings, error)) {
            throw std::runtime_error(error);
        }
#if LAB_CHECKPOINT == 4
        cpu_ = makeCpuState(ui_.settings);
#endif
        ui_.requested = ui_.settings;
        ui_.desiredSphere = ui_.settings.sphereCenter;
        ui_.desiredCapsuleA = ui_.settings.capsuleA;
        ui_.desiredCapsuleB = ui_.settings.capsuleB;
        ui_.paused = false;
        std::cout << "GPU=" << gl_.GetString(GL_RENDERER) << " OpenGL=" << gl_.GetString(GL_VERSION) << '\n';
        printScene();
        SDL_GetWindowSizeInPixels(window_, &width_, &height_);
        sceneWidth_ = width_ - panel_.width(width_);
    }

    void printScene() {
        const auto& topology = gpu_->topology();
        std::cout << "SCENE vertices=" << topology.positions.size() << " pinned=" << topology.pinned << " dynamic=" << topology.positions.size() - topology.pinned << " triangles=" << topology.indices.size() / 3U << " constraints=" << topology.constraints.size() << " GPUbytes=" << gpu_->memoryBytes() << '\n';
    }

    std::uint64_t stepCount() const {
#if LAB_CHECKPOINT == 4
        return cpuSteps_;
#else
        return gpu_->stats().steps;
#endif
    }

    void printStats() const {
        const Stats& stats = gpu_->stats();
        std::cout << "STEP steps=" << stepCount() << " dynamic=" << stats.dynamic << " pinned=" << stats.pinned << " updated=" << stats.updated << " normals=" << stats.normals << " constraintVisits=" << stats.constraints << " candidates=" << stats.candidates << " contacts=" << stats.contacts << " maxStrain=" << stats.maxStrain << " maxStretch=" << stats.maxStretch << " maxResidualM=" << stats.maxResidual << " penetrationM=" << stats.maxPenetration << " invalid=" << stats.invalid << " overflow=" << stats.overflow << " gpuMs=" << stats.totalMs << '\n';
    }

    void framePreset() {
        ui_.camera = {};
        ui_.camera.distance = 10.5F;
        ui_.camera.target = {0.0F, 1.7F, 0.0F};
        ui_.camera.pitch = 0.35F;
        if (ui_.settings.preset == Preset::Hanging) {
            ui_.camera.target = {0.0F, 4.5F, 1.8F};
            ui_.camera.distance = 12.0F;
            ui_.camera.pitch = 0.12F;
        }
        if (ui_.settings.preset == Preset::DropTable) {
            ui_.camera.target = {0.0F, 1.2F, 0.0F};
            ui_.camera.distance = 12.0F;
            ui_.camera.pitch = 0.55F;
        }
    }

    void releaseInput();

    void processRequests() {
        if (ui_.cancelRequested) {
            releaseInput();
            validation_.cancel();
            benchmark_.cancel();
            debug_.cancel(gl_);
            debugStep_ = noVertex;
            ui_.resetRequested = ui_.validateRequested = ui_.benchmarkRequested = false;
            ui_.cancelRequested = false;
            ui_.message = "Pending input/job cancelled; current cloth retained";
        }
        if (ui_.resetRequested) {
            releaseInput();
            validation_.cancel();
            benchmark_.cancel();
            debug_.cancel(gl_);
            // Refusal keeps the old scene, but its canceled diagnostic still needs a fresh query.
            debugStep_ = noVertex;
            drawTimer_.cancel();
            if (!resetAnnounced_) {
                resetAnnounced_ = true;
                return;
            }
            if (!gpu_->busy()) {
                std::string error{};
#if LAB_CHECKPOINT == 4
                if (ui_.requested.side > 65U) {
                    ui_.message = "Checkpoint 4 is a small CPU baseline; choose 17 or 65";
                    ui_.resetRequested = false;
                    resetAnnounced_ = false;
                    return;
                }
#endif
                if (gpu_->reset(ui_.requested, error)) {
                    ui_.settings = ui_.requested;
                    framePreset();
                    accumulator_ = 0.0;
                    ui_.desiredSphere = ui_.settings.sphereCenter;
                    ui_.desiredCapsuleA = ui_.settings.capsuleA;
                    ui_.desiredCapsuleB = ui_.settings.capsuleB;
                    ui_.selected = noVertex;
                    input_ = {};
                    probe_ = {};
                    probeStep_ = 0U;
                    debugStep_ = noVertex;
                    ui_.message = "New topology committed. Pin/drag while paused waits for Step.";
#if LAB_CHECKPOINT == 4
                    cpu_ = makeCpuState(ui_.settings);
                    cpuSteps_ = 0U;
#endif
                    printScene();
                } else {
                    ui_.message = error + " Previous cloth retained.";
                }
                ui_.resetRequested = false;
                resetAnnounced_ = false;
            }
        }
        if (ui_.validateRequested) {
            ui_.validateRequested = false;
#if LAB_CHECKPOINT >= 13
            releaseInput();
            benchmark_.cancel();
            validation_.begin();
            ui_.paused = true;
            ui_.message = validation_.message();
#else
            ui_.message = "Validation is introduced in checkpoint 13; --verify is for the final application";
#endif
        }
        if (ui_.benchmarkRequested) {
            ui_.benchmarkRequested = false;
#if LAB_CHECKPOINT >= 13
            releaseInput();
            validation_.cancel();
            ui_.paused = true;
            benchmarkCamera_ = ui_.camera;
            std::string error{};
            const std::uint64_t resident = gpu_->memoryBytes() + gpu_->hostMemoryBytes();
            if (!benchmark_.begin(ui_.settings, resident, sceneWidth_, height_, error)) {
                ui_.message = error;
            } else {
                ui_.message = benchmark_.message();
            }
#else
            ui_.message = "Finite GPU benchmark is introduced in checkpoint 13";
#endif
        }
    }

    bool jobActive() const {
        return validation_.active() || benchmark_.active();
    }

    void pollJobs() {
        const bool wasActive = jobActive();
        if (validation_.active()) {
            validation_.poll();
            ui_.message = validation_.message();
        }
        if (benchmark_.active()) {
            benchmark_.poll();
            benchmark_.tick();
            ui_.message = benchmark_.message();
        }
        if (wasActive && !jobActive()) {
            ui_.singleStep = false;
            accumulator_ = 0.0;
            if (validation_.passed()) {
                std::cout << validation_.message() << '\n';
            }
            if (benchmark_.passed()) {
                std::cout << benchmark_.message() << '\n';
            }
        }
    }

    void pollDebug() {
#if LAB_CHECKPOINT >= 11
        std::string error{};
        debug_.poll(gl_, error);
        if (!error.empty()) {
            ui_.message = error;
        }
        // The packet is a labeled subset from the most recent CSR window, not a contact replay.
        if (ui_.cells && ui_.selected != noVertex && !jobActive() && !gpu_->busy() && !debug_.busy() && debugStep_ != gpu_->stats().steps) {
            if (debug_.request(gl_, *gpu_, ui_.selected)) {
                debugStep_ = gpu_->stats().steps;
            }
        }
#endif
    }

    void advance() {
        // Obstacle commands are targets, never instantaneous jumps through the cloth.
        constexpr float obstacleSpeed = 0.5F;
        const float distance = obstacleSpeed * ui_.settings.dt;
        ui_.settings.sphereCenter = ui_.settings.sphereCenter + limited(ui_.desiredSphere - ui_.settings.sphereCenter, distance);
        ui_.settings.capsuleA = ui_.settings.capsuleA + limited(ui_.desiredCapsuleA - ui_.settings.capsuleA, distance);
        ui_.settings.capsuleB = ui_.settings.capsuleB + limited(ui_.desiredCapsuleB - ui_.settings.capsuleB, distance);
        std::string error{};
#if LAB_CHECKPOINT == 4
        cpuStep(cpu_, ui_.settings);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, gpu_->positionBuffer());
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(cpu_.positions.size() * sizeof(Vec4)), cpu_.positions.data());
        const auto normals = meshNormals(cpu_.positions, ui_.settings.side);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, gpu_->normalBuffer());
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(normals.size() * sizeof(Vec4)), normals.data());
        ++cpuSteps_;
#else
        if (!gpu_->step(ui_.settings, input_, error)) {
            ui_.paused = true;
            ui_.message = error;
        }
        if (input_.pinId != noVertex) {
            // An older readback must never acknowledge an edit submitted after that probe.
            picker_.cancel(gl_);
            pickKind_ = PickKind::None;
            probeDirty_ = true;
        }
#endif
        input_.pinId = noVertex;
        input_.pinAction = -1;
    }

    void key(SDL_Scancode code, bool shift);
    void events();
    void coordinates(float logicalX, float logicalY, float& x, float& y) const;
    void pollPick();

    void render() {
        InteractionPreview interaction{};
        interaction.selected = ui_.selected;
        interaction.hasProbe = probe_.valid() && probe_.key[0] == ui_.selected;
        interaction.lastProbe = probe_.position;
        interaction.probeStep = probeStep_;
        interaction.currentStep = gpu_->stats().steps;
        interaction.refreshPending = probeDirty_ || picker_.busy() || gpu_->busy();
        interaction.dragging = input_.dragging;
        interaction.dragId = input_.dragId;
        interaction.dragTarget = input_.dragTarget;
        interaction.pinId = input_.pinId;
        interaction.pinAction = input_.pinAction;
        interaction.contactRings = ui_.cells && debug_.getSnapshot().valid
            && debug_.getSnapshot().selected == ui_.selected
            && debug_.getSnapshot().side == ui_.settings.side;
        gl_.Viewport(0, 0, width_, height_);
        gl_.ClearColor(0.055F, 0.10F, 0.15F, 1.0F);
        gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        gl_.Viewport(0, 0, sceneWidth_, height_);
        if (benchmark_.active()) {
            bool measuredDraw = false;
            if (benchmark_.readyForDraw()) {
                measuredDraw = benchmark_.beginDraw();
            }
            renderer_.draw(gl_, benchmark_.cloth(), benchmark_.settings(), benchmarkCamera_, sceneWidth_, height_, false, false, false, noVertex);
            if (measuredDraw) {
                benchmark_.finishDraw();
            }
        } else {
            drawTimer_.poll();
            const bool timingDraw = drawTimer_.begin();
            const DebugSnapshot* snapshot = nullptr;
            if (ui_.cells) {
                snapshot = &debug_.getSnapshot();
            }
            renderer_.draw(gl_, *gpu_, ui_.settings, ui_.camera, sceneWidth_, height_, ui_.wire,
                ui_.strain, ui_.cells, ui_.selected, snapshot, true, true, &interaction);
            if (timingDraw) {
                drawTimer_.end();
            }
        }
        const Stats* stats = &gpu_->stats();
        if (benchmark_.active()) {
            stats = &benchmark_.cloth().stats();
        }
        double drawMs = -1.0;
        if (drawTimer_.valid()) {
            drawMs = drawTimer_.milliseconds();
        }
        if (benchmark_.active()) {
            drawMs = -1.0;
            if (benchmark_.drawTimingValid()) {
                drawMs = benchmark_.lastDrawMs();
            }
        }
        std::string displayMessage = ui_.message;
        if (ui_.cells && debug_.getSnapshot().valid && !jobActive()) {
            displayMessage = debug_.getSnapshot().status(gpu_->stats().steps);
        }
        UiState display = ui_;
        if (benchmark_.active()) {
            display.settings = benchmark_.settings();
        }
        const InteractionPreview* inspector = &interaction;
        if (benchmark_.active()) {
            inspector = nullptr;
        }
        panel_.draw(gl_, renderer_, display, *stats, gpu_->memoryBytes(), width_, height_,
            drawMs, cpuFrameMs_, jobActive(), displayMessage, inspector);
        const std::string title = "Project 40 - " + ui_.message;
        SDL_SetWindowTitle(window_, title.c_str());
    }

    void saveCapture(const std::string& file) {
        const std::size_t stride = static_cast<std::size_t>(width_) * 4U;
        std::vector<unsigned char> pixels(stride * height_), flipped(pixels.size());
        gl_.PixelStorei(GL_PACK_ALIGNMENT, 1);
        gl_.ReadPixels(0, 0, width_, height_, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
        for (int row = 0; row < height_; ++row) {
            std::copy_n(pixels.data() + static_cast<std::size_t>(row) * stride, stride, flipped.data() + static_cast<std::size_t>(height_ - row - 1) * stride);
        }
        SDL_Surface* surface = SDL_CreateSurfaceFrom(width_, height_, SDL_PIXELFORMAT_RGBA32, flipped.data(), static_cast<int>(stride));
        if (surface == nullptr || !SDL_SaveBMP(surface, file.c_str())) {
            SDL_DestroySurface(surface);
            throw std::runtime_error("Capture failed: " + std::string(SDL_GetError()));
        }
        SDL_DestroySurface(surface);
    }

    int verify();
    int exerciseControls();
};

} // namespace cloth

#include "cloth_acceptance.hpp"
#include "cloth_control_checks.hpp"
#include "cloth_input.hpp"
