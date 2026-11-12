#pragma once
#include "bulb_window.hpp"
#include "bulb_display.hpp"
#include "bulb_panel.hpp"
#include <iostream>

namespace bulb {

class App {
    public:
    App(NativeWindow &window, GlApi &gl)
        : window_(window), gl_(gl), gpu_(gl), overlayRenderer_(gl) {
    }
    void start(Settings settings, Camera camera = {}) {
#if LAB_CHECKPOINT < 2
        settings.slice = true;
#endif
#if LAB_CHECKPOINT < 8
        settings.samples = 1;
#endif
        staged_ = settings;
        camera_ = camera;
        request();
    }
    void request() {
        try {
            plan_.request(staged_, camera_);
            changed_ = std::chrono::steady_clock::now();
            error_.clear();
        } catch (const std::exception &error) {
            error_ = error.what();
        }
    }
    void tick() {
        try {
            if (auto result = gpu_.poll()) {
                lastKernelMs_ = result->gpuMs;
                lastSubmitMs_ = result->submitMs;
                if (plan_.accept(result->snapshot, result->tile, result->counters)) {
                    gpu_.publishPreview(result->destination);
                    imageGpuMs_ = 0.0;
                } else if (plan_.active() && result->snapshot.generation == plan_.active()->generation)
                    imageGpuMs_ += result->gpuMs;
            }
            if (!gpu_.busy()) {
                const auto next = plan_.next();
                if (next) {
                    const auto idle = std::chrono::duration<double>(std::chrono::steady_clock::now() - changed_).count();
                    if (next->preview || idle > 0.16)
                        gpu_.submit(plan_.snapshotFor(*next), *next);
                }
            }
        } catch (const std::exception &error) {
            error_ = error.what();
            plan_.cancel();
            running_ = false;
            failed_ = true;
        }
    }
    void draw() {
        int width{}, height{}, logicalWidth{}, logicalHeight{};
        SDL_GetWindowSizeInPixels(window_.get(), &width, &height);
        SDL_GetWindowSize(window_.get(), &logicalWidth, &logicalHeight);
        if (width <= 0 || height <= 0 || logicalWidth <= 0 || logicalHeight <= 0)
            return;
        gl_.Viewport(0, 0, width, height);
        gl_.ClearColor(0.012F, 0.02F, 0.034F, 1);
        gl_.Clear(GL_COLOR_BUFFER_BIT);
        int sceneWidth = width;
        if (showPanel_)
            sceneWidth = static_cast<int>(width * static_cast<double>(std::max(1, logicalWidth - 310)) / logicalWidth);
        int fittedWidth = sceneWidth, fittedHeight = static_cast<int>(sceneWidth * 540.0 / 960.0);
        if (fittedHeight > height) {
            fittedHeight = height;
            fittedWidth = static_cast<int>(height * 960.0 / 540.0);
        }
        gpu_.display((sceneWidth - fittedWidth) / 2, (height - fittedHeight) / 2, fittedWidth, fittedHeight, plan_, view_);
        overlay_.reset(logicalWidth, logicalHeight);
        if (showPanel_)
            drawPanel(overlay_, panelLayout(logicalWidth, logicalHeight), plan_, staged_, selected_, view_, lastKernelMs_, lastSubmitMs_, imageGpuMs_, error_);
        else {
            overlay_.rect({8, 8, static_cast<float>(std::min(logicalWidth - 16, 650)), 29}, {0.035, 0.06, 0.09});
            std::string label = "F CONTROLS / SPACE PAUSE / H VIEW / ";
            if (plan_.complete())
                label += "960 X 540 COMPLETE";
            else
                label += "120 X 68 PREVIEW + PARTIAL REFINE";
            overlay_.text(17, 18, label, {0.70, 0.86, 0.90}, 1.4F, 630);
        }
        overlayRenderer_.draw(overlay_, width, height);
    }
    void event(const SDL_Event &e) {
        if (e.type == SDL_EVENT_QUIT) {
            running_ = false;
            return;
        }
        if (e.type == SDL_EVENT_WINDOW_FOCUS_LOST || e.type == SDL_EVENT_WINDOW_HIDDEN || e.type == SDL_EVENT_WINDOW_MINIMIZED) {
            release();
            plan_.pause(true);
            return;
        }
        if (e.type == SDL_EVENT_KEY_DOWN && !e.key.repeat)
            key(e.key.key);
#if LAB_CHECKPOINT >= 5
        if (e.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            int width{}, height{};
            SDL_GetWindowSize(window_.get(), &width, &height);
            const auto panel = panelLayout(width, height);
            if (showPanel_ && panel.panel.contains(e.button.x, e.button.y)) {
                for (int row = 0; row < 9; ++row)
                    if (panel.rows[row].contains(e.button.x, e.button.y)) {
                        selected_ = row;
                        int direction = 1;
                        if (e.button.x < panel.rows[row].x + 141)
                            direction = -1;
                        edit(direction);
                        return;
                    }
                for (int i = 0; i < 3; ++i)
                    if (panel.presets[i].contains(e.button.x, e.button.y)) {
                        preset(i);
                        return;
                    }
                const std::array<SDL_Keycode, 5> actions{SDLK_SPACE, SDLK_X, SDLK_RETURN, SDLK_F, SDLK_H};
                for (int i = 0; i < 5; ++i)
                    if (panel.buttons[i].contains(e.button.x, e.button.y)) {
                        key(actions[i]);
                        return;
                    }
                return;
            }
            if (e.button.button == SDL_BUTTON_LEFT || e.button.button == SDL_BUTTON_RIGHT || e.button.button == SDL_BUTTON_MIDDLE) {
                dragging_ = true;
                pan_ = e.button.button != SDL_BUTTON_LEFT;
                lastX_ = e.button.x;
                lastY_ = e.button.y;
                capture_ = SDL_CaptureMouse(true);
            }
        }
        if (e.type == SDL_EVENT_MOUSE_BUTTON_UP)
            release();
        if (e.type == SDL_EVENT_MOUSE_MOTION && dragging_) {
            if (e.motion.state == 0) {
                release();
                return;
            }
            const double dx = e.motion.x - lastX_, dy = e.motion.y - lastY_;
            lastX_ = e.motion.x;
            lastY_ = e.motion.y;
            if (pan_)
                camera_.pan(dx, dy);
            else
                camera_.orbit(dx, dy);
            request();
        }
        if (e.type == SDL_EVENT_MOUSE_WHEEL) {
            camera_.dolly(e.wheel.y);
            request();
        }
#endif
    }
    void preset(int preset) {
        preset_ = preset;
        staged_ = Settings{};
        camera_ = Camera{};
        if (preset == 1) {
            staged_.power = 6;
            camera_.yaw = 1.2;
        }
        if (preset == 2) {
            staged_.iterations = 24;
            staged_.raySteps = 256;
            staged_.epsilon = 0.0001;
            staged_.normalStep = 0.00025;
            camera_.target = {0.4, 0.2, 0.45};
            camera_.distance = 1.7;
        }
        release();
        request();
    }
    void key(SDL_Keycode code) {
        if (code == SDLK_Q || code == SDLK_ESCAPE) {
            release();
            running_ = false;
        }
        if (code == SDLK_SPACE)
            plan_.pause(!plan_.paused());
        if (code == SDLK_X)
            plan_.cancel();
        if (code == SDLK_RETURN)
            request();
        if (code == SDLK_F)
            showPanel_ = !showPanel_;
        if (code == SDLK_R)
            preset(preset_);
        if (code >= SDLK_1 && code <= SDLK_3)
            preset(static_cast<int>(code - SDLK_1));
        if (code == SDLK_TAB)
            selected_ = (selected_ + 1) % 9;
        if (code == SDLK_LEFT)
            edit(-1);
        if (code == SDLK_RIGHT)
            edit(1);
#if LAB_CHECKPOINT >= 6
        if (code == SDLK_H)
            view_ = (view_ + 1) % 5;
#endif
#if LAB_CHECKPOINT >= 5
        if (code == SDLK_HOME) {
            camera_ = Camera{};
            request();
        }
        if (code == SDLK_I) {
            camera_.orbit(0, -12);
            request();
        }
        if (code == SDLK_K) {
            camera_.orbit(0, 12);
            request();
        }
        if (code == SDLK_J) {
            camera_.orbit(-12, 0);
            request();
        }
        if (code == SDLK_L) {
            camera_.orbit(12, 0);
            request();
        }
        if (code == SDLK_PAGEUP) {
            camera_.dolly(1);
            request();
        }
        if (code == SDLK_PAGEDOWN) {
            camera_.dolly(-1);
            request();
        }
#endif
#if LAB_CHECKPOINT >= 2
        if (code == SDLK_S) {
            staged_.slice = !staged_.slice;
            request();
        }
#endif
    }
    bool running() const {
        return running_;
    }
    bool failed() const {
        return failed_;
    }
    bool pointerHeld() const {
        return dragging_ || capture_;
    }
    bool idle() const {
        return !gpu_.busy() && plan_.complete() && !plan_.needsPreview();
    }
    RenderPlan &plan() {
        return plan_;
    }
    GpuRenderer &gpu() {
        return gpu_;
    }
    Settings &settings() {
        return staged_;
    }
    Camera &camera() {
        return camera_;
    }
    const std::string &error() const {
        return error_;
    }
    double imageGpuMs() const {
        return imageGpuMs_;
    }

    private:
    void release() {
        dragging_ = false;
        if (capture_)
            SDL_CaptureMouse(false);
        capture_ = false;
    }
    void edit(int direction) {
        if (selected_ == 0)
            staged_.power = std::clamp(staged_.power + direction, 2, 12);
        if (selected_ == 1)
            staged_.bailout = std::clamp(staged_.bailout + direction, 2.0, 16.0);
        if (selected_ == 2)
            staged_.iterations = std::clamp(staged_.iterations + direction, 4, 24);
        if (selected_ == 3)
            staged_.raySteps = std::clamp(staged_.raySteps + direction * 16, 32, 256);
        double factor = 1.25;
        if (direction < 0)
            factor = 0.8;
        if (selected_ == 4)
            staged_.epsilon = std::clamp(staged_.epsilon * factor, 0.00001, 0.01);
        if (selected_ == 5)
            staged_.normalStep = std::clamp(staged_.normalStep * factor, 0.00002, 0.02);
#if LAB_CHECKPOINT >= 8
        if (selected_ == 6) {
            if (staged_.samples == 1)
                staged_.samples = 4;
            else
                staged_.samples = 1;
        }
#endif
        if (selected_ == 7)
            staged_.palette = (staged_.palette + 3 + direction) % 3;
        if (selected_ == 8)
            staged_.safety = std::clamp(staged_.safety + direction * 0.05, 0.2, 1.0);
        request();
    }
    NativeWindow &window_;
    GlApi &gl_;
    GpuRenderer gpu_;
    OverlayRenderer overlayRenderer_;
    Overlay overlay_;
    RenderPlan plan_;
    Settings staged_;
    Camera camera_;
    int view_{}, selected_{}, preset_{};
    bool showPanel_{true}, running_{true}, failed_{}, dragging_{}, pan_{}, capture_{};
    float lastX_{}, lastY_{};
    std::string error_;
    std::chrono::steady_clock::time_point changed_{std::chrono::steady_clock::now()};
    double lastKernelMs_{}, lastSubmitMs_{}, imageGpuMs_{};
};

} // namespace bulb
