#pragma once

#include "city_overlay.hpp"
#include "city_scene.hpp"
#include "city_timing.hpp"
#include "city_validation_job.hpp"

#include <chrono>
#include <cstdio>
#include <iostream>
#include <limits>
#include <stdexcept>

namespace city {

struct RunOptions {
    bool hidden{};
    bool verify{};
    bool benchmark{};
    bool street{};
    int frames{};
    double seconds{};
    std::uint32_t count{};
    std::string capture{};
};

class Application {
    SDL_Window* window_{};
    SDL_GLContext context_{};
    bool sdlStarted_{}, loaded_{};
    GlApi gl_{};
    SceneRenderer renderer_{};
    CityGpu gpu_{};
    TimerRing timers_{}, benchmarkTimers_{};
    StatsReader stats_{};
    BenchmarkJob benchmark_{};
#if LAB_CHECKPOINT >= 11
    CityValidationJob validation_{};
#endif
    SceneBuilder builder_{};
    std::vector<Object> objects_{};
    Camera camera_{};
    std::uint32_t seed_{39U};
    std::uint32_t selected_{std::numeric_limits<std::uint32_t>::max()};
    bool culling_{true}, debug_{}, paused_{}, looking_{}, running_{true};
    std::string message_{"WASD move - right drag look - V validate - B benchmark"};
    TimingSample latestTiming_{};
    double frameMilliseconds_{};
    double wholeFrameMilliseconds_{};
    std::size_t pickCursor_{};
    bool picking_{};
    Vec3 pickOrigin_{}, pickRay_{};
    float pickDistance_{};
    int width_{1440}, height_{900};
    std::chrono::steady_clock::time_point launched_{};
    std::chrono::steady_clock::time_point frameStarted_{};
    std::filesystem::path shaders_{};
#if LAB_CHECKPOINT >= 12
    bool tour_{};
    float tourTime_{};
#endif

    public:
    ~Application() {
        // Cleanup follows the inverse of construction, while the GL context exists.
        if (loaded_) {
#if LAB_CHECKPOINT >= 11
            validation_.destroy(gl_);
#endif
            stats_.destroy(gl_);
            benchmarkTimers_.destroy(gl_);
            timers_.destroy(gl_);
            gpu_.destroy(gl_);
            renderer_.destroy(gl_);
        }
        if (window_ != nullptr) {
            SDL_CaptureMouse(false);
        }
        if (context_ != nullptr) {
            SDL_GL_DestroyContext(context_);
        }
        if (window_ != nullptr) {
            SDL_DestroyWindow(window_);
        }
        if (sdlStarted_) {
            SDL_Quit();
        }
    }

    int run(const RunOptions& options) {
        setup(options);
        std::uint32_t count = 16U;
#if LAB_CHECKPOINT >= 1
        count = 257U;
#endif
#if LAB_CHECKPOINT >= 2
        count = 1'000'003U;
#endif
        if (options.count != 0U) {
            count = options.count;
        }
        requestScene(count, seed_);
        if (options.street) {
            camera_.position = {0.0F, 2.5F, 180.0F};
            camera_.pitch = 0.03F;
        }
        launched_ = std::chrono::steady_clock::now();
        auto previous = launched_;
        int rendered = 0;
        bool commandStarted = false;
        while (running_) {
            const auto frameStart = std::chrono::steady_clock::now();
            frameStarted_ = frameStart;
            const float dt = std::clamp(std::chrono::duration<float>(frameStart - previous).count(), 0.0F, 0.05F);
            previous = frameStart;
            pumpEvents();
            if (options.seconds > 0.0 && std::chrono::duration<double>(frameStart - launched_).count() >= options.seconds) {
                if (!options.capture.empty() && rendered > 0 && width_ > 0 && height_ > 0) {
                    saveCapture(options.capture);
                }
                break;
            }
            updateScene();
            updatePicking();
            SDL_GetWindowSizeInPixels(window_, &width_, &height_);
            if (width_ <= 0 || height_ <= 0) {
                SDL_Delay(10);
                continue;
            }
            stats_.poll(gl_);
#if LAB_CHECKPOINT >= 11
            const bool wasValidating = validation_.active();
            validation_.poll(gl_);
            if (wasValidating || validation_.active()) {
                message_ = validation_.message();
            }
#endif
            TimingSample sample{};
            while (timers_.poll(gl_, sample)) {
                latestTiming_ = sample;
            }
            if (benchmarkTimers_.poll(gl_, sample)) {
                latestTiming_ = sample;
                benchmark_.accept(sample);
            }
            if (benchmark_.active && frameStart - benchmark_.started > std::chrono::seconds(25)) {
                benchmark_.cancel();
                message_ = "Benchmark cancelled: 25-second deadline";
            }
            if (benchmark_.active && benchmarkTimers_.pending()) {
                SDL_Delay(1);
                continue;
            }
            if (!builder_.active && !objects_.empty() && !commandStarted) {
                commandStarted = true;
                if (options.benchmark) {
                    startBenchmark();
                }
                if (options.verify) {
                    return verify();
                }
            }
            updateCamera(dt);
            renderFrame();
            if (!builder_.active && !objects_.empty()) {
                ++rendered;
            }
            frameMilliseconds_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - frameStart).count();
            const double elapsed = std::chrono::duration<double>(frameStart - launched_).count();
            const bool frameLimit = options.frames > 0 && rendered >= options.frames;
            const bool timeLimit = options.seconds > 0.0 && elapsed >= options.seconds;
            const bool benchmarkDone = options.benchmark && commandStarted && !benchmark_.active && !benchmarkTimers_.pending();
            if (frameLimit || timeLimit || benchmarkDone) {
                if (!options.capture.empty()) {
                    saveCapture(options.capture);
                }
                running_ = false;
            }
            SDL_GL_SwapWindow(window_);
            wholeFrameMilliseconds_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - frameStart).count();
            timers_.completePresent(wholeFrameMilliseconds_);
            benchmarkTimers_.completePresent(wholeFrameMilliseconds_);
        }
        return 0;
    }

    private:
    void setup(const RunOptions& options) {
        // Setup: SDL supplies window/input; the scaffold loads OpenGL 4.3 functions.
        if (!SDL_Init(SDL_INIT_VIDEO)) {
            throw std::runtime_error(SDL_GetError());
        }
        sdlStarted_ = true;
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (options.hidden || options.verify || options.benchmark) {
            flags |= SDL_WINDOW_HIDDEN;
        }
        window_ = SDL_CreateWindow("Project 39 - Million Object City", width_, height_, flags);
        if (window_ == nullptr) {
            throw std::runtime_error(SDL_GetError());
        }
        SDL_SetWindowMinimumSize(window_, 800, 600);
        context_ = SDL_GL_CreateContext(window_);
        if (context_ == nullptr || !gl_.load()) {
            throw std::runtime_error("OpenGL 4.3 required: " + gl_.missingFunction + SDL_GetError());
        }
        loaded_ = true;
        SDL_GL_SetSwapInterval(1);
        if (options.hidden || options.verify || options.benchmark) {
            SDL_GL_SetSwapInterval(0);
        }
        GLint shared{}, invocations{}, blockBindings{}, groupSize{}, groupCount{}, vertexBlocks{};
        gl_.GetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &shared);
        gl_.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
        gl_.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &blockBindings);
        gl_.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &groupSize);
        gl_.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groupCount);
        gl_.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
        if (shared < 16384 || invocations < 256 || blockBindings < 8 || groupSize < 256 || groupCount < 7813 || vertexBlocks < 3) {
            throw std::runtime_error("Need 16KiB shared memory, 256 invocations/group, 7813 groups, 8 SSBO bindings and 3 vertex-stage SSBOs");
        }
        std::cout << "GPU=" << gl_.GetString(GL_RENDERER) << " OpenGL=" << gl_.GetString(GL_VERSION) << " shared=" << shared << " budgetMiB=512\n";
        std::filesystem::path shaders{COURSE_SHADER_DIRECTORY};
        if (!std::filesystem::exists(shaders)) {
            shaders = std::filesystem::path(SDL_GetBasePath()) / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
        }
        shaders_ = shaders;
        std::string error{};
        if (!renderer_.initialize(gl_, shaders, error) || !gpu_.initialize(gl_, shaders, error)) {
            throw std::runtime_error(error);
        }
#if LAB_CHECKPOINT >= 11
        if (!validation_.initialize(gl_, shaders, error)) {
            throw std::runtime_error(error);
        }
#endif
        if (!gpu_.rebuild(gl_, {}, error)) {
            throw std::runtime_error(error);
        }
        timers_.initialize(gl_);
        benchmarkTimers_.initialize(gl_);
        stats_.initialize(gl_);
        gl_.Enable(GL_DEPTH_TEST);
    }

    void requestScene(std::uint32_t count, std::uint32_t seed) {
        if (benchmark_.active) {
            message_ = "Cancel the current benchmark before changing scene";
            return;
        }
        try {
            builder_.begin(count, seed);
            message_ = "Preparing candidate in bounded 8192-record chunks - X cancels";
        } catch (const std::exception& error) {
            message_ = error.what();
        }
    }

    void updateScene() {
        if (!builder_.active || !builder_.advance()) {
            return;
        }
        std::string error{};
        if (gpu_.rebuild(gl_, builder_.objects, error)) {
            objects_.swap(builder_.objects);
            seed_ = builder_.seed;
            selected_ = std::numeric_limits<std::uint32_t>::max();
            picking_ = false;
            stats_.invalidate(gl_);
            message_ = "Scene committed - bounds culling does not remove occluded buildings";
            std::cout << "SCENE resident=" << objects_.size() << " objectBytes=" << objects_.size() * sizeof(Object) << " gpuBytes=" << gpu_.bytes() << " seed=" << seed_ << '\n';
        } else {
            message_ = error;
        }
        builder_.cancel();
    }

    void startBenchmark() {
#if LAB_CHECKPOINT >= 11
        if (validation_.active()) {
            message_ = "Cancel validation before starting the benchmark";
            return;
        }
#endif
        if (benchmarkTimers_.pending()) {
            message_ = "Previous GPU sample is draining; retry after it completes";
            return;
        }
        if (builder_.active || objects_.empty()) {
            message_ = "Finish scene generation before benchmarking";
            return;
        }
        benchmark_.begin();
        message_ = "Benchmark: six camera snapshots, on/off, 2 warmups + 9 samples; X cancels";
        std::cout << "BENCH N=" << objects_.size() << " seed=" << seed_ << " configuration=";
#ifdef NDEBUG
        std::cout << "Release\n";
#else
        std::cout << "Debug (use Release for performance conclusions)\n";
#endif
    }

    void pumpEvents() {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running_ = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                looking_ = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                key(event.key.scancode);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_RIGHT) {
                looking_ = true;
                SDL_CaptureMouse(true);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_RIGHT) {
                looking_ = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && looking_ && !benchmark_.active) {
                camera_.look(event.motion.xrel, event.motion.yrel);
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL && !benchmark_.active) {
                camera_.fov = std::clamp(camera_.fov - event.wheel.y * 3.0F, 30.0F, 100.0F);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !benchmark_.active) {
                int logicalWidth{}, logicalHeight{};
                SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
                const float nx = 2.0F * event.button.x / std::max(logicalWidth, 1) - 1.0F;
                const float ny = 1.0F - 2.0F * event.button.y / std::max(logicalHeight, 1);
                const int insetWidth = width_ / 3;
                const int insetHeight = height_ / 3;
                const float pixelX = event.button.x * width_ / std::max(logicalWidth, 1);
                const float pixelY = event.button.y * height_ / std::max(logicalHeight, 1);
                const int insetLeft = width_ - insetWidth - 12;
                if (debug_ && pixelX >= insetLeft && pixelX < width_ - 12 && pixelY >= 12 && pixelY < 12 + insetHeight) {
                    const float insetX = 2.0F * (pixelX - insetLeft) / insetWidth - 1.0F;
                    const float insetY = 1.0F - 2.0F * (pixelY - 12) / insetHeight;
                    beginPicking(insetX, insetY, observerCamera(), static_cast<float>(insetWidth) / insetHeight);
                } else {
                    beginPicking(nx, ny, camera_, static_cast<float>(width_) / height_);
                }
            }
        }
    }

    void key(SDL_Scancode code) {
        if (code == SDL_SCANCODE_ESCAPE) {
            running_ = false;
        }
        if (code == SDL_SCANCODE_X) {
            builder_.cancel();
            benchmark_.cancel();
            picking_ = false;
#if LAB_CHECKPOINT >= 11
            validation_.cancel(gl_);
#endif
            message_ = "Pending work cancelled; current scene retained";
        }
        if (benchmark_.active) {
            return;
        }
        if (code == SDL_SCANCODE_SPACE) {
            paused_ = !paused_;
        }
#if LAB_CHECKPOINT >= 12
        if (code == SDL_SCANCODE_P) {
            tour_ = !tour_;
        }
#endif
        if (code == SDL_SCANCODE_C) {
            culling_ = !culling_;
        }
#if LAB_CHECKPOINT >= 10
        if (code == SDL_SCANCODE_TAB) {
            debug_ = !debug_;
        }
#endif
        if (code == SDL_SCANCODE_R) {
            camera_ = {};
#if LAB_CHECKPOINT >= 12
            tour_ = false;
            tourTime_ = 0.0F;
#endif
            paused_ = false;
            std::uint32_t count = static_cast<std::uint32_t>(objects_.size());
            std::uint32_t seed = seed_;
            if (objects_.empty() && builder_.active) {
                count = builder_.requested;
                seed = builder_.seed;
            }
            requestScene(count, seed);
        }
        if (code == SDL_SCANCODE_N) {
            std::uint32_t count = static_cast<std::uint32_t>(objects_.size());
            std::uint32_t seed = seed_;
            if (objects_.empty() && builder_.active) {
                count = builder_.requested;
                seed = builder_.seed;
            }
            requestScene(count, seed + 1U);
        }
        if (code == SDL_SCANCODE_1) {
            requestScene(257U, seed_);
        }
        if (code == SDL_SCANCODE_2) {
            requestScene(65'537U, seed_);
        }
        if (code == SDL_SCANCODE_3) {
            requestScene(1'000'003U, seed_);
        }
        if (code == SDL_SCANCODE_H) {
            camera_ = {};
        }
        if (code == SDL_SCANCODE_G) {
            camera_.position.y = 2.5F;
            camera_.pitch = 0.03F;
        }
        if (code == SDL_SCANCODE_LEFTBRACKET) {
            camera_.fov = std::max(30.0F, camera_.fov - 3.0F);
        }
        if (code == SDL_SCANCODE_RIGHTBRACKET) {
            camera_.fov = std::min(100.0F, camera_.fov + 3.0F);
        }
#if LAB_CHECKPOINT >= 11
        if (code == SDL_SCANCODE_B) {
            startBenchmark();
        }
        if (code == SDL_SCANCODE_V) {
            if (!benchmark_.active && validation_.begin()) {
                message_ = validation_.message();
            }
        }
#endif
        if (code == SDL_SCANCODE_RETURN) {
            beginPicking(0.0F, 0.0F, camera_, static_cast<float>(width_) / std::max(height_, 1));
        }
    }

    void updateCamera(float dt) {
        if (benchmark_.active) {
            return;
        }
        const bool* keys = SDL_GetKeyboardState(nullptr);
        const float front = static_cast<float>(keys[SDL_SCANCODE_W]) - static_cast<float>(keys[SDL_SCANCODE_S]);
        const float side = static_cast<float>(keys[SDL_SCANCODE_D]) - static_cast<float>(keys[SDL_SCANCODE_A]);
        const float vertical = static_cast<float>(keys[SDL_SCANCODE_E]) - static_cast<float>(keys[SDL_SCANCODE_Q]);
        camera_.move(front, side, vertical, dt, keys[SDL_SCANCODE_LSHIFT]);
#if LAB_CHECKPOINT >= 12
        if (front != 0.0F || side != 0.0F || vertical != 0.0F) {
            tour_ = false;
        }
        if (tour_ && !paused_) {
            tourTime_ += dt;
            const float angle = tourTime_ * 0.10F;
            camera_.position = {std::cos(angle) * 420.0F, 110.0F + 60.0F * std::sin(angle * 0.7F), std::sin(angle) * 420.0F};
            camera_.yaw = angle + 3.14159265F;
            camera_.pitch = -0.20F;
        }
#endif
        float horizontal{};
        float verticalLook{};
        if (keys[SDL_SCANCODE_LEFT]) {
            horizontal -= 100.0F * dt;
        }
        if (keys[SDL_SCANCODE_RIGHT]) {
            horizontal += 100.0F * dt;
        }
        if (keys[SDL_SCANCODE_UP]) {
            verticalLook -= 100.0F * dt;
        }
        if (keys[SDL_SCANCODE_DOWN]) {
            verticalLook += 100.0F * dt;
        }
        camera_.look(horizontal, verticalLook);
    }

    Camera observerCamera() const {
        Camera observer = camera_;
        observer.position = camera_.position + Vec3{350.0F, 850.0F, 450.0F};
        observer.yaw = -2.2F;
        observer.pitch = -0.95F;
        return observer;
    }

    void beginPicking(float x, float y, const Camera& view, float aspect) {
        pickOrigin_ = view.position;
        pickRay_ = view.ray(x, y, aspect);
        pickCursor_ = 0U;
        pickDistance_ = std::numeric_limits<float>::infinity();
        selected_ = std::numeric_limits<std::uint32_t>::max();
        picking_ = true;
    }

    void updatePicking() {
        if (!picking_) {
            return;
        }
        const std::size_t end = std::min(pickCursor_ + 8192U, objects_.size());
        for (; pickCursor_ < end; ++pickCursor_) {
            const float distance = raySphere(pickOrigin_, pickRay_, objects_[pickCursor_]);
            if (distance < pickDistance_) {
                pickDistance_ = distance;
                selected_ = static_cast<std::uint32_t>(pickCursor_);
            }
        }
        if (pickCursor_ == objects_.size()) {
            picking_ = false;
            message_ = "Picking uses bounding spheres (not exact mesh surfaces)";
        }
    }

    void renderFrame() {
        gl_.Viewport(0, 0, width_, height_);
        gl_.ClearColor(0.31F, 0.46F, 0.59F, 1.0F);
        gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        Camera activeCamera = camera_;
        bool activeCulling = culling_;
        TimerRing* timer = &timers_;
        bool measure = !benchmark_.active;
        if (benchmark_.active) {
            activeCamera = cameraSnapshot(benchmark_.cameraIndex);
            activeCulling = benchmark_.culling;
            timer = &benchmarkTimers_;
            measure = !benchmarkTimers_.pending();
        }
        if (measure) {
            timer->beginFrame();
        }
        const float aspect = static_cast<float>(width_) / std::max(height_, 1);
        const Frustum planes = activeCamera.frustum(aspect);
        CityGpu::StageHook hook{};
        if (measure) {
            hook = [&](int stage, bool begin) {
                timer->stage(gl_, stage, begin);
            };
        }
        gpu_.run(gl_, planes, activeCamera.position, activeCulling, hook);
        if (measure) {
            timer->stage(gl_, 5, true);
        }
        renderer_.draw(gl_, gpu_, activeCamera, planes, width_, height_, debug_, selected_);
#if LAB_CHECKPOINT >= 3
        if (selected_ < objects_.size()) {
            renderer_.drawBounds(gl_, objects_[selected_], activeCamera, width_, height_);
        }
#endif
        if (measure) {
            timer->stage(gl_, 5, false);
        }
        if (debug_ && !benchmark_.active) {
            const Camera observer = observerCamera();
            const int insetWidth = width_ / 3;
            const int insetHeight = height_ / 3;
            gl_.Enable(GL_SCISSOR_TEST);
            gl_.Scissor(width_ - insetWidth - 12, height_ - insetHeight - 12, insetWidth, insetHeight);
            gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            gl_.Viewport(width_ - insetWidth - 12, height_ - insetHeight - 12, insetWidth, insetHeight);
            renderer_.draw(gl_, gpu_, observer, planes, insetWidth, insetHeight, true, selected_, true);
            renderer_.drawFrustum(gl_, camera_, aspect, observer, insetWidth, insetHeight);
            gl_.Disable(GL_SCISSOR_TEST);
        }
        stats_.request(gl_, gpu_);
        drawHud();
        if (measure) {
            const double cpuFrame = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - frameStarted_).count();
            timer->endFrame(cpuFrame, frameStarted_);
        }
    }

    void drawHud() {
        Overlay overlay{};
        overlay.width = width_;
        overlay.height = height_;
        const float scale = std::max(1.25F, static_cast<float>(width_) / 1050.0F);
        overlay.rectangle(12, 12, 550.0F * scale, 118.0F * scale, {0.035F, 0.07F, 0.10F});
        overlay.text(22, 22, "39 / MILLION OBJECT CITY", {0.49F, 0.89F, 0.87F}, scale * 1.3F);
        char text[512]{};
        unsigned accepted{};
        if (stats_.valid) {
            accepted = stats_.latest.counts[3];
        }
        std::snprintf(text, sizeof(text), "RESIDENT %zu  TESTED %u  ACCEPTED %u  SUBMITTED %u", objects_.size(), stats_.latest.tested, accepted, accepted);
        overlay.text(22, 38 * scale, text, {0.88F, 0.91F, 0.95F}, scale);
        std::snprintf(text, sizeof(text), "GPU %.2f MS  CPU SUBMIT %.2f MS  CPU FRAME+PRESENT %.2f MS", latestTiming_.totalGpu, frameMilliseconds_, wholeFrameMilliseconds_);
        overlay.text(22, 50 * scale, text, {0.64F, 0.75F, 0.84F}, scale);
        std::snprintf(text, sizeof(text), "FOV %.0f  SEED %u  CULL %d  DEBUG %d  PAUSE %d", camera_.fov, seed_, static_cast<int>(culling_), static_cast<int>(debug_), static_cast<int>(paused_));
        overlay.text(22, 62 * scale, text, {0.64F, 0.75F, 0.84F}, scale);
        std::snprintf(text, sizeof(text), "CULL %.2f REDUCE %.2f SCAN %.2f COMPACT %.2f CMD %.2f DRAW %.2f MS", latestTiming_.milliseconds[0], latestTiming_.milliseconds[1], latestTiming_.milliseconds[2], latestTiming_.milliseconds[3], latestTiming_.milliseconds[4], latestTiming_.milliseconds[5]);
        overlay.text(22, 74 * scale, text, {0.64F, 0.75F, 0.84F}, scale);
        if (accepted != 0U && stats_.valid) {
            std::snprintf(text, sizeof(text), "ACCEPTED CENTER DISTANCE %.1f - %.1f WORLD UNITS", stats_.latest.minimumDistance, stats_.latest.maximumDistance);
        } else {
            std::snprintf(text, sizeof(text), "ACCEPTED CENTER DISTANCE EMPTY / PENDING");
        }
        overlay.text(22, 86 * scale, text, {0.64F, 0.75F, 0.84F}, scale);
        std::snprintf(text, sizeof(text), "OBJECT %.1f MASK %.1f PREFIX %.1f VISIBLE %.1f MIB COMMANDS 60 B", objects_.size() * 48.0 / 1048576.0, objects_.size() * 16.0 / 1048576.0, objects_.size() * 16.0 / 1048576.0, objects_.size() * 4.0 / 1048576.0);
        overlay.text(22, 98 * scale, text, {0.64F, 0.75F, 0.84F}, scale);
        if (builder_.active) {
            std::snprintf(text, sizeof(text), "BUILDING %zu / %u  X CANCEL", builder_.objects.size(), builder_.requested);
            overlay.text(22, 110 * scale, text, {1.0F, 0.78F, 0.35F}, scale);
        }
        if (selected_ < objects_.size()) {
            const Object& object = objects_[selected_];
            const int rejected = rejectedPlane(camera_.frustum(static_cast<float>(width_) / height_), object);
            std::snprintf(text, sizeof(text), "ID %u MESH %u CENTER %.1f %.1f %.1f R %.1f REJECT PLANE %d", object.id, object.mesh, object.centerRadius.x, object.centerRadius.y, object.centerRadius.z, object.centerRadius.w, rejected);
            overlay.rectangle(12, height_ - 70 * scale, width_ - 24.0F, 24 * scale, {0.035F, 0.07F, 0.10F});
            overlay.text(22, height_ - 62 * scale, text, {1.0F, 0.8F, 0.32F}, scale);
        }
        overlay.rectangle(12, height_ - 42 * scale, width_ - 24.0F, 32 * scale, {0.035F, 0.07F, 0.10F});
        overlay.text(22, height_ - 34 * scale, "WASD/QE MOVE - ARROWS/RIGHT DRAG LOOK - G STREET - H OVERVIEW - C CULL - TAB DEBUG", {0.77F, 0.84F, 0.9F}, scale);
        overlay.text(22, height_ - 22 * scale, "1/2/3 SIZE - N SEED - R RESET - [/] FOV - ENTER PICK - P TOUR - SPACE PAUSE TOUR - V CHECK - B BENCH - X CANCEL", {0.77F, 0.84F, 0.9F}, scale);
        overlay.draw(gl_, renderer_);
        std::string title = "Project 39 - " + message_;
        SDL_SetWindowTitle(window_, title.c_str());
    }

    void saveCapture(const std::string& file) {
        const std::size_t stride = static_cast<std::size_t>(width_) * 4U;
        std::vector<unsigned char> pixels(stride * height_);
        std::vector<unsigned char> flipped(pixels.size());
        gl_.PixelStorei(GL_PACK_ALIGNMENT, 1);
        gl_.ReadPixels(0, 0, width_, height_, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
        for (int y = 0; y < height_; ++y) {
            std::copy_n(pixels.data() + static_cast<std::size_t>(y) * stride, stride, flipped.data() + static_cast<std::size_t>(height_ - 1 - y) * stride);
        }
        SDL_Surface* surface = SDL_CreateSurfaceFrom(width_, height_, SDL_PIXELFORMAT_RGBA32, flipped.data(), static_cast<int>(stride));
        if (surface == nullptr || !SDL_SaveBMP(surface, file.c_str())) {
            SDL_DestroySurface(surface);
            throw std::runtime_error("Capture failed: " + std::string(SDL_GetError()));
        }
        SDL_DestroySurface(surface);
    }

    int verify();
    void verifyControls();
};

} // namespace city
