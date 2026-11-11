#pragma once

#include "morph_panel.hpp"
#include "morph_timing.hpp"
#include "morph_window.hpp"

namespace morph {

class App {
    public:
    App(NativeWindow &window, GlApi &gl, Capabilities caps)
        : window_(window), gl_(gl), caps_(caps), renderer_(gl), timings_(gl)
#if LAB_CHECKPOINT >= 7
          ,
          compute_(std::make_unique<Program>(gl, "morph_update.comp"))
#endif
    {
    }
    ~App() {
        releasePointer();
    }

    void start(Settings settings) {
        staged_ = settings;
#if LAB_CHECKPOINT >= 1
        apply();
#else
        message_ = "STARTER / ADD TWO POINT CLOUDS";
#endif
    }
    void apply() {
        releasePointer();
        uploading_.reset();
        try {
            std::uint32_t count = 0;
            if (session_.active())
                count = session_.active()->settings.count;
            preflight(caps_, staged_.count, count);
            session_.request(staged_);
        } catch (const std::exception &error) {
            session_.reject(error.what());
        }
    }
    void advance(double dt) {
        timeline.advance(dt);
        session_.advance();
        try {
            if (session_.ready() && !uploading_) {
#if LAB_CHECKPOINT >= 6
                std::uint32_t count = 0;
                if (activeGpu_)
                    count = activeGpu_->data().settings.count;
                uploading_ = std::make_unique<GpuParticles>(gl_, caps_, session_.ready(), count);
#else
                publishCpu();
#endif
            }
            if (uploading_ && uploading_->uploadNext()) {
                if (session_.active())
                    timeline.reset();
                status_.uploadMs = uploading_->uploadSubmitMs();
                activeGpu_ = std::move(uploading_);
                session_.accept();
                dirty_ = true;
                message_ = "ACTIVE READY / SAME IDS FOR A AND B";
            }
        } catch (const std::exception &error) {
            uploading_.reset();
            session_.reject(error.what());
        }
    }
    void draw() {
        int width{};
        int height{};
        SDL_GetWindowSizeInPixels(window_.get(), &width, &height);
        if (width <= 0 || height <= 0)
            return;
        int logicalWidth{};
        int logicalHeight{};
        SDL_GetWindowSize(window_.get(), &logicalWidth, &logicalHeight);
        const PanelLayout layout = panelLayout(logicalWidth, 820);
        int sceneWidth = width;
        if (panelVisible_)
            sceneWidth = std::max(1, static_cast<int>(layout.panel.x * width / logicalWidth));
        const Prepared *data = session_.active().get();
        const double time = timeline.normalized();
        if (time != lastTime_)
            dirty_ = true;
        status_.updated = 0;
        timings_.beginUpdate(data && dirty_);
        if (data && dirty_) {
#if LAB_CHECKPOINT >= 7
            activeGpu_->update(*compute_, time, view.matching, view.easing, view.path);
#elif LAB_CHECKPOINT >= 6
            activeGpu_->updateOnCpu(time, view.matching, view.easing, view.path);
#else
            renderer_.uploadCpu(*data, time, view);
#endif
            status_.updated = data->settings.count;
            lastTime_ = time;
            dirty_ = false;
        }
        timings_.endUpdate();
        renderer_.clear(width, height);
        timings_.beginDraw();
        renderer_.scene(data, activeGpu_.get(), time, view, camera, sceneWidth, height);
        timings_.endDraw();
        status_.drawn = renderer_.drawn();
        status_.updateMs = timings_.updateMs();
        status_.drawMs = timings_.drawMs();
        status_.timersReady = timings_.available();
        if (panelVisible_) {
            // UI uses an 820-unit vertical design space; pointer y uses the same transform.
            overlay_.reset(logicalWidth, 820);
            drawPanel(overlay_, layout, staged_, session_, timeline, view, selectedRow_, status_, message_);
            renderer_.overlay(overlay_.vertices(), width, height);
        }
        if (data && data->generation != titleGeneration_) {
            const std::string title = "Project 42 - Particle Morph Studio | " + std::string(shapeName(data->settings.source)) + " -> " + std::string(shapeName(data->settings.target)) + " | N=" + std::to_string(data->settings.count);
            SDL_SetWindowTitle(window_.get(), title.c_str());
            titleGeneration_ = data->generation;
        }
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("OpenGL reported an update or draw error");
    }
    void event(const SDL_Event &event) {
        if (event.type == SDL_EVENT_QUIT || event.type == SDL_EVENT_WINDOW_CLOSE_REQUESTED)
            running_ = false;
        else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN) {
            releasePointer();
            timeline.paused = true;
        } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat)
            key(event.key.key, event.key.mod);
        else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN)
            beginPointer(event.button);
        else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == button_)
            releasePointer();
        else if (event.type == SDL_EVENT_MOUSE_MOTION && button_ != 0) {
            if (!(event.motion.state & SDL_BUTTON_MASK(button_))) {
                releasePointer();
                return;
            }
            if (scrubbing_)
                scrubAt(event.motion.x);
            else if (button_ == SDL_BUTTON_LEFT)
                camera.orbit(event.motion.xrel, event.motion.yrel);
            else
                camera.pan(event.motion.xrel, event.motion.yrel);
        } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
            if (!panelVisible_ || event.wheel.mouse_x < layout().panel.x)
                camera.zoom(event.wheel.y);
        }
    }
    void cancel() {
        uploading_.reset();
        session_.cancel();
        message_ = "CANCELLED / KEPT ACTIVE";
    }
    bool running() const {
        return running_;
    }
    bool ready() const {
        return session_.active() != nullptr && !session_.busy();
    }
    const PreparationSession &session() const {
        return session_;
    }
    GpuParticles *gpu() {
        return activeGpu_.get();
    }
    const Program *compute() const {
        return compute_.get();
    }
    const PanelStatus &status() const {
        return status_;
    }
    void frameMilliseconds(double value) {
        status_.frameMs = value;
    }
    void forceUpdate() {
        dirty_ = true;
    }
    Settings &staged() {
        return staged_;
    }
    bool pointerHeld() const {
        return button_ != 0;
    }
    Timeline timeline;
    View view;
    OrbitCamera camera;

    private:
    void publishCpu() {
        if (session_.active())
            timeline.reset();
        session_.accept();
        dirty_ = true;
        message_ = "CPU PREVIEW / COMPUTE ARRIVES IN LESSON 7";
    }
    PanelLayout layout() const {
        int width{};
        int height{};
        SDL_GetWindowSize(window_.get(), &width, &height);
        return panelLayout(width, 820);
    }
    float uiY(float logicalY) const {
        int width{};
        int height{};
        SDL_GetWindowSize(window_.get(), &width, &height);
        return logicalY * 820.0F / static_cast<float>(std::max(1, height));
    }
    void scrubAt(float x) {
        const auto track = layout().timeline;
        timeline.scrub((x - track.x) / track.width);
        dirty_ = true;
    }
    void releasePointer() {
        if (button_ != 0)
            SDL_CaptureMouse(false);
        button_ = 0;
        scrubbing_ = false;
    }
    void beginPointer(const SDL_MouseButtonEvent &event) {
        if (button_ != 0)
            return;
        const auto current = layout();
        const float y = uiY(event.y);
        if (panelVisible_ && current.panel.contains(event.x, y)) {
            if (event.button != SDL_BUTTON_LEFT)
                return;
            for (int index = 0; index < 3; ++index) {
                if (current.source[index].contains(event.x, y)) {
                    staged_.source = static_cast<Shape>(index);
                    return;
                }
                if (current.target[index].contains(event.x, y)) {
                    staged_.target = static_cast<Shape>(index);
                    return;
                }
                if (current.transport[index].contains(event.x, y)) {
                    if (index == 0)
                        timeline.paused = !timeline.paused;
                    if (index == 1)
                        timeline.reverse = !timeline.reverse;
                    if (index == 2)
                        timeline.reset();
                    return;
                }
            }
            for (int index = 0; index < 5; ++index) {
                if (current.rows[index].contains(event.x, y)) {
                    selectedRow_ = index;
                    adjust(1);
                    return;
                }
                if (current.views[index].contains(event.x, y)) {
                    constexpr std::array<SDL_Keycode, 5> keys{SDLK_M, SDLK_E, SDLK_C, SDLK_H, SDLK_P};
                    key(keys[index], SDL_KMOD_NONE);
                    return;
                }
            }
            if (current.apply.contains(event.x, y)) {
                apply();
                return;
            }
            if (current.cancel.contains(event.x, y)) {
                cancel();
                return;
            }
            if (current.timeline.contains(event.x, y)) {
                selectedRow_ = 5;
                scrubAt(event.x);
                if (SDL_CaptureMouse(true)) {
                    button_ = SDL_BUTTON_LEFT;
                    scrubbing_ = true;
                } else
                    message_ = "CAPTURE UNAVAILABLE / CLICK OR USE ARROWS";
            }
            return;
        }
        if (event.button == SDL_BUTTON_LEFT || event.button == SDL_BUTTON_RIGHT || event.button == SDL_BUTTON_MIDDLE) {
            if (SDL_CaptureMouse(true))
                button_ = event.button;
            else
                message_ = "CAPTURE UNAVAILABLE / IJKL CAMERA";
        }
    }
    void adjust(int direction) {
        if (selectedRow_ == 0) {
            constexpr std::array<std::uint32_t, 6> counts{1, 127, 2048, 65537, 1000003, 5000000};
            if (direction > 0) {
                for (const auto count : counts) {
                    if (count > staged_.count && count <= maximumCount) {
                        staged_.count = count;
                        return;
                    }
                }
                staged_.count = maximumCount;
            } else {
                for (auto item = counts.rbegin(); item != counts.rend(); ++item) {
                    if (*item < staged_.count && *item <= maximumCount) {
                        staged_.count = *item;
                        return;
                    }
                }
                staged_.count = 1;
            }
        } else if (selectedRow_ == 1) {
            if (direction > 0)
                ++staged_.seed;
            else
                --staged_.seed;
        } else if (selectedRow_ == 2) {
            if (staged_.sampling == Sampling::area)
                staged_.sampling = Sampling::triangleBiased;
            else
                staged_.sampling = Sampling::area;
        } else if (selectedRow_ == 3)
            key(SDLK_M, SDL_KMOD_NONE);
        else if (selectedRow_ == 4)
            key(SDLK_E, SDL_KMOD_NONE);
        else if (selectedRow_ == 5)
            timeline.scrub(timeline.normalized() + direction * 0.025);
    }
    void key(SDL_Keycode code, SDL_Keymod modifiers) {
        if (code >= SDLK_1 && code <= SDLK_3) {
            const auto shape = static_cast<Shape>(code - SDLK_1);
            if (modifiers & SDL_KMOD_SHIFT)
                staged_.source = shape;
            else
                staged_.target = shape;
            return;
        }
        switch (code) {
        case SDLK_Q:
        case SDLK_ESCAPE:
            running_ = false;
            return;
        case SDLK_RETURN:
            apply();
            return;
        case SDLK_X:
            cancel();
            return;
        case SDLK_SPACE:
            timeline.paused = !timeline.paused;
            return;
        case SDLK_R:
            timeline.reset();
            return;
        case SDLK_B:
            timeline.reverse = !timeline.reverse;
            return;
        case SDLK_O:
            timeline.loop = !timeline.loop;
            return;
        case SDLK_HOME:
            timeline.scrub(0);
            return;
        case SDLK_END:
            timeline.scrub(1);
            return;
        case SDLK_TAB:
            if (modifiers & SDL_KMOD_SHIFT)
                selectedRow_ = (selectedRow_ + 5) % 6;
            else
                selectedRow_ = (selectedRow_ + 1) % 6;
            return;
        case SDLK_LEFT:
            adjust(-1);
            return;
        case SDLK_RIGHT:
            adjust(1);
            return;
        case SDLK_M:
#if LAB_CHECKPOINT >= 4
            if (view.matching == Matching::spatial)
                view.matching = Matching::random;
            else
                view.matching = Matching::spatial;
#endif
            dirty_ = true;
            return;
        case SDLK_E:
#if LAB_CHECKPOINT >= 5
            if (view.easing == Easing::smooth)
                view.easing = Easing::linear;
            else
                view.easing = Easing::smooth;
#endif
            dirty_ = true;
            return;
        case SDLK_C:
#if LAB_CHECKPOINT >= 5
            if (view.path == Path::straight)
                view.path = Path::arc;
            else if (view.path == Path::arc)
                view.path = Path::flow;
            else
                view.path = Path::straight;
#endif
            dirty_ = true;
            return;
        case SDLK_H:
#if LAB_CHECKPOINT >= 3
            view.heatmap = !view.heatmap;
#endif
            return;
        case SDLK_P:
            view.paths = !view.paths;
            return;
        case SDLK_G:
            view.grid = !view.grid;
            return;
        case SDLK_F:
            releasePointer();
            panelVisible_ = !panelVisible_;
            return;
        case SDLK_I:
            camera.orbit(0, -9);
            return;
        case SDLK_K:
            camera.orbit(0, 9);
            return;
        case SDLK_J:
            camera.orbit(-9, 0);
            return;
        case SDLK_L:
            camera.orbit(9, 0);
            return;
        case SDLK_PAGEUP:
            camera.zoom(1);
            return;
        case SDLK_PAGEDOWN:
            camera.zoom(-1);
            return;
        default:
            return;
        }
    }
    NativeWindow &window_;
    GlApi &gl_;
    Capabilities caps_;
    Renderer renderer_;
    GpuTimings timings_;
    Overlay overlay_;
    PreparationSession session_;
    Settings staged_;
    std::unique_ptr<Program> compute_;
    std::unique_ptr<GpuParticles> activeGpu_;
    std::unique_ptr<GpuParticles> uploading_;
    PanelStatus status_;
    std::string message_;
    double lastTime_{-1};
    std::uint64_t titleGeneration_{};
    int selectedRow_{};
    Uint8 button_{};
    bool scrubbing_{};
    bool running_{true};
    bool dirty_{true};
    bool panelVisible_{true};
};

} // namespace morph
