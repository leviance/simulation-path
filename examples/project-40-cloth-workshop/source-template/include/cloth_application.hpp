#pragma once

#include "cloth_pick.hpp"
#include "cloth_ui.hpp"
#include "cloth_verify.hpp"

#include <chrono>
#include <iostream>
#include <memory>

namespace cloth {

struct RunOptions {
    bool hidden{}, verify{}, benchmark{};
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
    ControlPanel panel_{};
    UiState ui_{};
    Input input_{};
    PickResult probe_{};
    Camera pickCamera_{};
    bool leftHeld_{}, rightHeld_{}, middleHeld_{}, pickForPin_{}, resetAnnounced_{};
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
            SDL_GetWindowSizeInPixels(window_, &width_, &height_);
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
            if (!ui_.paused) { accumulator_ = std::min(accumulator_ + elapsed, 0.1); }
            const bool targetReached = options.steps > 0U && stepCount() >= options.steps;
            const bool stepDue = ui_.singleStep || (!ui_.paused && (fastRun_ || accumulator_ >= ui_.settings.dt));
            if (!targetReached && stepDue && !gpu_->busy() && !ui_.resetRequested) {
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
            if (done) {
                printStats();
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
        if (options.hidden || options.verify || options.benchmark) {
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
        if (!renderer_.initialize(gl_, directory_, error) || !picker_.initialize(gl_, directory_, error)) {
            throw std::runtime_error(error);
        }
        gpu_ = std::make_unique<GpuCloth>(gl_);
        if (!gpu_->initialize(directory_, error)) {
            throw std::runtime_error(error);
        }
        ui_.settings.side = 17U;
#if LAB_CHECKPOINT >= 13
        ui_.settings.side = 321U;
#endif
        if (options.side != 0U) {
            ui_.settings.side = options.side;
        }
        ui_.settings.preset = options.preset;
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
        std::cout << "STEP steps=" << stepCount() << " dynamic=" << stats.dynamic << " pinned=" << stats.pinned << " updated=" << stats.updated << " normals=" << stats.normals << " constraintVisits=" << stats.constraints << " candidates=" << stats.candidates << " contacts=" << stats.contacts << " maxStrain=" << stats.maxStrain << " maxResidualM=" << stats.maxResidual << " penetrationM=" << stats.maxPenetration << " invalid=" << stats.invalid << " overflow=" << stats.overflow << " gpuMs=" << stats.totalMs << '\n';
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

    void releaseInput() {
        leftHeld_ = rightHeld_ = middleHeld_ = false;
        input_.dragging = false;
        if (loaded_) {
            picker_.cancel(gl_);
        }
        if (window_ != nullptr) {
            SDL_CaptureMouse(false);
        }
    }

    void processRequests() {
        if (ui_.cancelRequested) {
            releaseInput();
            ui_.resetRequested = ui_.validateRequested = ui_.benchmarkRequested = false;
            ui_.cancelRequested = false;
            ui_.message = "Pending input/job cancelled; current cloth retained";
        }
        if (ui_.resetRequested) {
            releaseInput();
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
            ui_.message = "Use --verify for the bounded full GPU fixture suite";
        }
        if (ui_.benchmarkRequested) {
            ui_.benchmarkRequested = false;
            ui_.message = "Benchmark job is not started while a topology change is pending";
        }
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
#endif
        input_.pinId = noVertex;
        input_.pinAction = -1;
    }

    void key(SDL_Scancode code, bool shift) {
        const auto command = [&](Command positive, Command negative) {
            if (shift) { applyCommand(ui_, negative); }
            else { applyCommand(ui_, positive); }
        };
        if (code == SDL_SCANCODE_ESCAPE) { running_ = false; }
        if (code == SDL_SCANCODE_SPACE) { applyCommand(ui_, Command::Pause); }
        if (code == SDL_SCANCODE_N) { applyCommand(ui_, Command::Step); }
        if (code == SDL_SCANCODE_R) { applyCommand(ui_, Command::Reset); }
        if (code == SDL_SCANCODE_1) { applyCommand(ui_, Command::Hanging); }
        if (code == SDL_SCANCODE_2) { applyCommand(ui_, Command::Drape); }
        if (code == SDL_SCANCODE_3) { applyCommand(ui_, Command::Drop); }
        if (code == SDL_SCANCODE_4) { applyCommand(ui_, Command::Small); }
        if (code == SDL_SCANCODE_5) { applyCommand(ui_, Command::Medium); }
        if (code == SDL_SCANCODE_6) { applyCommand(ui_, Command::Large); }
        if (code == SDL_SCANCODE_7) { applyCommand(ui_, Command::Million); }
        if (code == SDL_SCANCODE_TAB) { ui_.tool = static_cast<Tool>((static_cast<int>(ui_.tool) + 1) % 3); releaseInput(); }
        if (code == SDL_SCANCODE_W) { applyCommand(ui_, Command::Wire); }
        if (code == SDL_SCANCODE_S) { applyCommand(ui_, Command::Strain); }
        if (code == SDL_SCANCODE_C) { applyCommand(ui_, Command::Cells); }
        if (code == SDL_SCANCODE_G) { command(Command::GravityUp, Command::GravityDown); }
        if (code == SDL_SCANCODE_F) { command(Command::WindUp, Command::WindDown); }
        if (code == SDL_SCANCODE_K) { command(Command::ComplianceUp, Command::ComplianceDown); }
        if (code == SDL_SCANCODE_D) { command(Command::DampingUp, Command::DampingDown); }
        if (code == SDL_SCANCODE_J) { command(Command::FrictionUp, Command::FrictionDown); }
        if (code == SDL_SCANCODE_T) { command(Command::ThicknessUp, Command::ThicknessDown); }
        if (code == SDL_SCANCODE_LEFTBRACKET) { applyCommand(ui_, Command::SphereLeft); }
        if (code == SDL_SCANCODE_RIGHTBRACKET) { applyCommand(ui_, Command::SphereRight); }
        if (code == SDL_SCANCODE_PAGEUP) { applyCommand(ui_, Command::SphereUp); }
        if (code == SDL_SCANCODE_PAGEDOWN) { applyCommand(ui_, Command::SphereDown); }
        if (code == SDL_SCANCODE_HOME) { applyCommand(ui_, Command::SphereForward); }
        if (code == SDL_SCANCODE_END) { applyCommand(ui_, Command::SphereBack); }
        if (code == SDL_SCANCODE_COMMA) { applyCommand(ui_, Command::CapsuleLeft); }
        if (code == SDL_SCANCODE_PERIOD) { applyCommand(ui_, Command::CapsuleRight); }
        if (code == SDL_SCANCODE_V) { applyCommand(ui_, Command::Validate); }
        if (code == SDL_SCANCODE_B) { applyCommand(ui_, Command::Benchmark); }
        if (code == SDL_SCANCODE_X) { applyCommand(ui_, Command::Cancel); }
        if (code == SDL_SCANCODE_P && probe_.valid()) {
            input_.pinId = probe_.key[0];
            input_.pinAction = 1;
            if (probe_.position.w == 0.0F) { input_.pinAction = 0; }
            ui_.message = "Pin edit staged for the next simulation step";
        }
        if (code == SDL_SCANCODE_LEFT) { ui_.camera.orbit(-10, 0); }
        if (code == SDL_SCANCODE_RIGHT) { ui_.camera.orbit(10, 0); }
        if (code == SDL_SCANCODE_UP) { ui_.camera.orbit(0, -10); }
        if (code == SDL_SCANCODE_DOWN) { ui_.camera.orbit(0, 10); }
        if (code == SDL_SCANCODE_Q) { ui_.camera.zoom(-1); }
        if (code == SDL_SCANCODE_E) { ui_.camera.zoom(1); }
    }

    void events() {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) { running_ = false; }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) { releaseInput(); ui_.paused = true; }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) { key(event.key.scancode, (event.key.mod & SDL_KMOD_SHIFT) != 0); }
            if (event.type == SDL_EVENT_MOUSE_WHEEL) { ui_.camera.zoom(event.wheel.y); }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
                float x{}, y{}; coordinates(event.button.x, event.button.y, x, y);
                if (x >= sceneWidth_) { panel_.hit(x, y, ui_); continue; }
                if (event.button.button == SDL_BUTTON_RIGHT) { rightHeld_ = true; }
                if (event.button.button == SDL_BUTTON_MIDDLE) { middleHeld_ = true; }
                if (event.button.button == SDL_BUTTON_LEFT) {
                    leftHeld_ = true;
                    if (ui_.tool != Tool::Camera) {
                        pickCamera_ = ui_.camera;
                        pickForPin_ = ui_.tool == Tool::Pin;
                        picker_.request(gl_, gpu_->positionBuffer(), ui_.settings.side * ui_.settings.side, ui_.camera, sceneWidth_, height_, 2.0F * x / sceneWidth_ - 1.0F, 1.0F - 2.0F * y / height_);
                    }
                }
                SDL_CaptureMouse(true);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (event.button.button == SDL_BUTTON_LEFT) { leftHeld_ = false; input_.dragging = false; }
                if (event.button.button == SDL_BUTTON_RIGHT) { rightHeld_ = false; }
                if (event.button.button == SDL_BUTTON_MIDDLE) { middleHeld_ = false; }
                if (!leftHeld_ && !rightHeld_ && !middleHeld_) { SDL_CaptureMouse(false); }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (rightHeld_ || (leftHeld_ && ui_.tool == Tool::Camera)) { ui_.camera.orbit(event.motion.xrel, event.motion.yrel); }
                if (middleHeld_) { ui_.camera.pan(event.motion.xrel, event.motion.yrel); }
                if (input_.dragging && leftHeld_) {
                    float x{}, y{}; coordinates(event.motion.x, event.motion.y, x, y);
                    const Vec3 ray = ui_.camera.ray(2.0F * x / sceneWidth_ - 1.0F, 1.0F - 2.0F * y / height_, static_cast<float>(sceneWidth_) / height_);
                    const float denominator = dot(ray, dragPlaneNormal_);
                    if (std::abs(denominator) > 0.001F) {
                        const float t = dot(dragPlanePoint_ - ui_.camera.eye(), dragPlaneNormal_) / denominator;
                        if (t > 0.0F) { input_.dragTarget = ui_.camera.eye() + ray * t; }
                    }
                }
            }
        }
    }

    void coordinates(float logicalX, float logicalY, float& x, float& y) const {
        int logicalWidth{}, logicalHeight{};
        SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
        x = logicalX * width_ / std::max(logicalWidth, 1);
        y = logicalY * height_ / std::max(logicalHeight, 1);
    }

    void pollPick() {
        std::string error{};
        if (picker_.poll(gl_, probe_, error) && probe_.valid()) {
            ui_.selected = probe_.key[0];
            if (pickForPin_) {
                input_.pinId = ui_.selected;
                input_.pinAction = 1;
                if (probe_.position.w == 0.0F) { input_.pinAction = 0; }
                ui_.message = "Pin edit staged; Pause leaves positions unchanged until Step";
            } else if (leftHeld_) {
                input_.dragId = ui_.selected;
                input_.dragTarget = xyz(probe_.position);
                input_.dragging = true;
                dragPlanePoint_ = input_.dragTarget;
                dragPlaneNormal_ = pickCamera_.forward();
                ui_.message = "Dragging a 5x5 vertex region; target displacement is bounded per substep";
            }
        }
        if (!error.empty()) { ui_.message = error; }
    }

    void render() {
        gl_.Viewport(0, 0, width_, height_);
        gl_.ClearColor(0.055F, 0.10F, 0.15F, 1.0F);
        gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        gl_.Viewport(0, 0, sceneWidth_, height_);
        renderer_.draw(gl_, *gpu_, ui_.settings, ui_.camera, sceneWidth_, height_, ui_.wire, ui_.strain, ui_.cells, ui_.selected);
        panel_.draw(gl_, renderer_, ui_, gpu_->stats(), gpu_->memoryBytes(), width_, height_, 0.0, cpuFrameMs_);
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

    int verify() {
        std::string report{}, error{};
        if (!runGpuFixtures(gl_, directory_, report, error, 15000)) {
            throw std::runtime_error(error);
        }
        std::cout << report << '\n';
        return 0;
    }
};

} // namespace cloth
