#pragma once

#include "sculpt_camera.hpp"
#include "sculpt_gpu_pick.hpp"

namespace sculpt {

// One owner controls either the camera or one frozen brush stroke. No second button can steal it.
class SculptControls {
    public:
    SculptControls(GlApi& gl, GpuBudget& budget, Brush brush = {}, float depth = 0)
        : picker_(gl, budget), brush_(brush), depth_(depth) {
        brush_.validate();
        if (!std::isfinite(depth_) || std::abs(depth_) > 1)
            throw std::invalid_argument("Initial brush depth must stay inside [-1, 1]");
    }

    const Brush& brush() const {
        return brush_;
    }

    const std::string& notice() const {
        return notice_;
    }

    bool sculptMode() const {
        return sculptMode_;
    }

    float depth() const {
        return depth_;
    }

    const std::optional<PickAnswer>& probe() const {
        return preview_;
    }

    void cameraChanged() {
        invalidateView();
    }

    bool pointerCaptured() const {
        return capture_ != Capture::none || tapPending_;
    }

    bool adjust(BrushParameter parameter, bool increase, bool coarse) {
        if (pointerCaptured())
            return false;
        adjustBrushParameter(brush_, depth_, parameter, increase, coarse);
        needsPick_ = true;
        return true;
    }

    void suspendHover(bool value) {
        hoverSuppressed_ = value;
    }

    std::optional<Brush> previewBrush(const Camera& camera) const {
        if (capture_ == Capture::stroke)
            return frozenBrush_;
        if (!preview_ || !preview_->hit() || !sculptMode_ || hoverSuppressed_)
            return {};
        Brush result = brush_;
        result.center = preview_->point() + camera.forward() * depth_;
        return result;
    }

    void cancel(GpuMeshBuilder& model) {
        model.abortStroke();
        tapPending_ = false;
        ++clickRevision_;
        release();
        preview_.reset();
    }

    void event(const SDL_Event& event, GpuMeshBuilder& model, Camera& camera, int width, int height) {
        if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED)
            cancel(model);
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
            cancel(model);
            model.pause(true);
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && capture_ == Capture::none && !tapPending_ && event.button.x < width && event.button.y < height && event.button.x >= 0 && event.button.y >= 0)
            press(event.button, model, camera, width, height);
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.which == owner_ && event.button.button == button_) {
            if (capture_ == Capture::stroke)
                model.endStroke(owner_);
            const bool tap = capture_ == Capture::waiting;
            release();
            // A short click can finish before its asynchronous GPU pick. Preserve one finite tap.
            tapPending_ = tap;
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION)
            motion(event.motion, model, camera, width, height);
        if (event.type == SDL_EVENT_MOUSE_WHEEL && capture_ == Capture::none) {
            camera.zoom(event.wheel.y);
            invalidateView();
        }
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            auto command = event.key.key;
            // Shift changes punctuation on some layouts. A parameter key keeps its physical role.
            if (event.key.scancode == SDL_SCANCODE_LEFTBRACKET)
                command = SDLK_LEFTBRACKET;
            if (event.key.scancode == SDL_SCANCODE_RIGHTBRACKET)
                command = SDLK_RIGHTBRACKET;
            if (event.key.scancode == SDL_SCANCODE_MINUS)
                command = SDLK_MINUS;
            if (event.key.scancode == SDL_SCANCODE_EQUALS)
                command = SDLK_EQUALS;
            key(command, event.key.mod, model);
        }
    }

    void tick(GpuMeshBuilder& model, const Camera& camera, int width, int height) {
        try {
            if (width != previousWidth_ || height != previousHeight_) {
                previousWidth_ = width;
                previousHeight_ = height;
                invalidateView();
            }
            if (const auto answer = picker_.poll()) {
                if (answer->data.state[1] == model.document().revision() && queryView_ == viewRevision_ && model.ready()) {
                    if (queryClick_ != 0 && queryClick_ == clickRevision_ && (capture_ == Capture::waiting || tapPending_)) {
                        if (answer->hit()) {
                            const bool tap = tapPending_;
                            startStroke(*answer, model, camera, width, height, tap);
                            if (tap && capture_ == Capture::stroke) {
                                model.endStroke(owner_);
                                tapPending_ = false;
                                release();
                            }
                        } else {
                            notice_ = "NO SURFACE / START A STROKE ON THE MESH";
                            tapPending_ = false;
                            release();
                        }
                    } else if (!hoverSuppressed_ && capture_ == Capture::none && std::abs(pointerX_ - queryX_) < 1 && std::abs(pointerY_ - queryY_) < 1) {
                        preview_ = answer;
                        previewField_ = model.document().revision();
                        previewMesh_ = model.activeGeneration();
                    }
                }
            }
            if ((previewField_ != model.document().revision() || previewMesh_ != model.activeGeneration()) && capture_ != Capture::stroke) {
                preview_.reset();
                needsPick_ = true;
            }
            if (picker_.busy() || !model.ready() || model.paused() || width <= 0 || height <= 0)
                return;
            if (capture_ == Capture::waiting || tapPending_)
                request(model, camera, width, height, pressX_, pressY_, clickRevision_);
            else if (!hoverSuppressed_ && capture_ == Capture::none && sculptMode_ && needsPick_ && pointerX_ >= 0 && pointerX_ < width && pointerY_ >= 0 && pointerY_ < height)
                request(model, camera, width, height, pointerX_, pointerY_, 0);
        } catch (const std::exception& error) {
            notice_ = error.what();
            cancel(model);
        }
    }

    private:
    enum class Capture {
        none,
        orbit,
        pan,
        waiting,
        stroke
    };

    void release() {
        capture_ = Capture::none;
        button_ = 0;
        SDL_CaptureMouse(false);
        needsPick_ = true;
    }

    void invalidateView() {
        ++viewRevision_;
        tapPending_ = false;
        needsPick_ = true;
        preview_.reset();
    }

    void press(const SDL_MouseButtonEvent& event, GpuMeshBuilder& model, const Camera& camera, int width, int height) {
        if (event.button != SDL_BUTTON_LEFT && event.button != SDL_BUTTON_RIGHT && event.button != SDL_BUTTON_MIDDLE)
            return;
        if (event.button == SDL_BUTTON_LEFT && sculptMode_ && (!model.ready() || model.paused())) {
            notice_ = "WAIT FOR CURRENT MESH / RESUME JOBS BEFORE SCULPTING";
            return;
        }
        if (!SDL_CaptureMouse(true)) {
            notice_ = std::string("POINTER CAPTURE FAILED: ") + SDL_GetError();
            return;
        }
        owner_ = event.which;
        button_ = event.button;
        pointerX_ = pressX_ = event.x;
        pointerY_ = pressY_ = event.y;
        previousX_ = event.x;
        previousY_ = event.y;
        capture_ = Capture::orbit;
        if (button_ == SDL_BUTTON_MIDDLE)
            capture_ = Capture::pan;
        if (button_ == SDL_BUTTON_LEFT && sculptMode_) {
            capture_ = Capture::waiting;
            ++clickRevision_;
            strokeNormal_ = camera.forward();
            notice_.clear();
            if (preview_ && preview_->hit() && previewField_ == model.document().revision() && previewMesh_ == model.activeGeneration() && std::abs(queryX_ - pressX_) < 2 && std::abs(queryY_ - pressY_) < 2)
                startStroke(*preview_, model, camera, width, height);
        }
    }

    void startStroke(const PickAnswer& answer, GpuMeshBuilder& model, const Camera& camera, int width, int height, bool singleTap = false) {
        frozenBrush_ = brush_;
        frozenBrush_.center = answer.point() + camera.forward() * depth_;
        strokeAnchor_ = frozenBrush_.center;
        if (!model.beginStroke(owner_, frozenBrush_)) {
            notice_ = "FIELD IS NOT READY FOR A NEW STROKE";
            release();
            return;
        }
        capture_ = Capture::stroke;
        preview_.reset();
        if (!singleTap)
            moveStroke(model, camera, width, height);
    }

    void moveStroke(GpuMeshBuilder& model, const Camera& camera, int width, int height) {
        const Vec3 ray = camera.ray(pointerX_, pointerY_, static_cast<float>(width), static_cast<float>(height));
        const float denominator = dot(ray, strokeNormal_);
        if (std::abs(denominator) < 0.00001F)
            return;
        const float distance = dot(strokeAnchor_ - camera.eye(), strokeNormal_) / denominator;
        if (distance <= 0 || distance > 32)
            return;
        const Vec3 point = camera.eye() + ray * distance;
        try {
            if (model.moveStroke(owner_, point))
                frozenBrush_.center = point;
        } catch (const std::exception& error) {
            // Excessive input is rejected as a segment, not silently turned into a discontinuous stroke.
            notice_ = error.what();
            cancel(model);
        }
    }

    void motion(const SDL_MouseMotionEvent& event, GpuMeshBuilder& model, Camera& camera, int width, int height) {
        if (capture_ != Capture::none && event.which != owner_)
            return;
        pointerX_ = event.x;
        pointerY_ = event.y;
        needsPick_ = true;
        if (capture_ == Capture::none) {
            preview_.reset();
            return;
        }
        if ((event.state & SDL_BUTTON_MASK(button_)) == 0) {
            cancel(model);
            return;
        }
        const float dx = event.x - previousX_, dy = event.y - previousY_;
        previousX_ = event.x;
        previousY_ = event.y;
        if (capture_ == Capture::orbit) {
            camera.orbit(dx, dy);
            invalidateView();
        } else if (capture_ == Capture::pan) {
            camera.pan(dx, dy);
            invalidateView();
        } else if (capture_ == Capture::stroke)
            moveStroke(model, camera, width, height);
    }

    void key(SDL_Keycode key, SDL_Keymod modifiers, GpuMeshBuilder& model) {
        if (key == SDLK_ESCAPE) {
            cancel(model);
            return;
        }
        if (capture_ != Capture::none || tapPending_)
            return;
        if (key == SDLK_TAB)
            sculptMode_ = !sculptMode_;
        if (key == SDLK_A)
            brush_.mode = BrushMode::add;
        if (key == SDLK_D)
            brush_.mode = BrushMode::subtract;

        // Function-key alternatives remain usable when an IME consumes punctuation keys.
        if (key == SDLK_F2 || key == SDLK_F3 || key == SDLK_F4) {
            BrushParameter parameter = BrushParameter::radius;
            if (key == SDLK_F3)
                parameter = BrushParameter::strength;
            if (key == SDLK_F4)
                parameter = BrushParameter::depth;
            adjust(parameter, (modifiers & SDL_KMOD_SHIFT) == 0, (modifiers & SDL_KMOD_CTRL) != 0);
        }
        const bool coarse = (modifiers & SDL_KMOD_SHIFT) != 0;
        if (key == SDLK_LEFTBRACKET)
            adjust(BrushParameter::radius, false, coarse);
        if (key == SDLK_RIGHTBRACKET)
            adjust(BrushParameter::radius, true, coarse);
        if (key == SDLK_MINUS)
            adjust(BrushParameter::strength, false, coarse);
        if (key == SDLK_EQUALS)
            adjust(BrushParameter::strength, true, coarse);
        if (key == SDLK_PAGEUP)
            adjust(BrushParameter::depth, true, coarse);
        if (key == SDLK_PAGEDOWN)
            adjust(BrushParameter::depth, false, coarse);
        if (key == SDLK_Z && !model.undo())
            notice_ = "UNDO NEEDS AN IDLE CURRENT MESH AND A SAVED STROKE";
        if (key == SDLK_Y && !model.redo())
            notice_ = "REDO NEEDS AN IDLE CURRENT MESH AND AN UNDONE STROKE";
        needsPick_ = true;
    }

    void request(const GpuMeshBuilder& model, const Camera& camera, int width, int height, float x, float y, std::uint64_t click) {
        if (!picker_.request(model, camera.eye(), camera.ray(x, y, static_cast<float>(width), static_cast<float>(height)), ++queryTag_))
            return;
        queryX_ = x;
        queryY_ = y;
        queryClick_ = click;
        queryView_ = viewRevision_;
        needsPick_ = false;
    }

    GpuPicker picker_;
    Brush brush_, frozenBrush_;
    Capture capture_{Capture::none};
    std::optional<PickAnswer> preview_;
    std::string notice_;
    Vec3 strokeAnchor_, strokeNormal_;
    float pointerX_{-1}, pointerY_{-1}, previousX_{}, previousY_{}, pressX_{}, pressY_{};
    float queryX_{}, queryY_{}, depth_{};
    int previousWidth_{}, previousHeight_{};
    std::uint32_t owner_{}, previewField_{}, previewMesh_{};
    std::uint8_t button_{};
    std::uint64_t queryTag_{}, viewRevision_{}, queryView_{}, clickRevision_{}, queryClick_{};
    bool sculptMode_{true}, needsPick_{true}, tapPending_{}, hoverSuppressed_{};
};

} // namespace sculpt
