#pragma once

#include "sculpt_camera.hpp"
#include "sculpt_cpu_mesh.hpp"
#include "sculpt_cpu_pick.hpp"
#include "sculpt_document.hpp"
#include <SDL3/SDL.h>
#include <string>

namespace sculpt {

// SDL capture/camera plumbing is supplied. Brush placement and the document calls are lesson code.
class CpuLessonControls {
    public:
    CpuLessonControls(Brush brush = {}, float depth = 0)
        : brush_(brush), depth_(depth) {
        brush_.validate();
        if (!std::isfinite(depth_) || std::abs(depth_) > 1)
            throw std::invalid_argument("Initial CPU brush depth must stay inside [-1, 1]");
#if LAB_CHECKPOINT >= 4
        sculptMode_ = true;
#endif
    }

    bool captured() const {
        return capture_ != Capture::none;
    }

    bool sculptMode() const {
        return sculptMode_;
    }

    bool paused() const {
        return paused_;
    }

    const Brush& brush() const {
        return brush_;
    }

    float depth() const {
        return depth_;
    }

    const std::string& notice() const {
        return notice_;
    }

    std::optional<Brush> preview(const Camera& camera) const {
        if (capture_ == Capture::stroke || capture_ == Capture::singleStamp)
            return frozenBrush_;
        if (!sculptMode_ || paused_ || !pick_ || !pick_->hit)
            return {};
        Brush result = brush_;
        result.center = pick_->point + camera.forward() * depth_;
        return result;
    }

    void cancel(CpuDocument& document) {
        if (document.strokeActive())
            document.abortStroke(owner_);
        release();
        pick_.reset();
        needsPick_ = true;
    }

    void reset(CpuDocument& document) {
        cancel(document);
        paused_ = false;
        notice_.clear();
    }

    void cameraChanged() {
        pick_.reset();
        needsPick_ = true;
    }

    // snippet:sculpt-cpu-input-routing
    void event(const SDL_Event& event, CpuDocument& document, Camera& camera, float isovalue, int width, int height) {
        try {
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED)
                cancel(document);
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN) {
                cancel(document);
                paused_ = true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !captured() && event.button.x >= 0 && event.button.y >= 0 && event.button.x < width && event.button.y < height)
                press(event.button, document, camera, isovalue, width, height);
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.which == owner_ && event.button.button == button_) {
#if LAB_CHECKPOINT >= 5
                if (capture_ == Capture::stroke)
                    document.endStroke(owner_);
#endif
                release();
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION)
                motion(event.motion, document, camera, width, height);
            if (event.type == SDL_EVENT_MOUSE_WHEEL && !captured() && event.wheel.mouse_x < width) {
                camera.zoom(event.wheel.y);
                cameraChanged();
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat)
                key(event.key, document);
        } catch (const std::exception& error) {
            notice_ = error.what();
            cancel(document);
        }
    }

    // end-snippet:sculpt-cpu-input-routing

    void tick(const CpuDocument& document, const Camera& camera, float isovalue, int width, int height) {
        if (width <= 0 || height <= 0 || !finite(camera.eye()))
            return;
        if (fieldRevision_ != document.generation() || sampledIso_ != isovalue) {
            needsPick_ = true;
            pick_.reset();
        }
#if LAB_CHECKPOINT >= 4
        if (!captured() && !paused_ && sculptMode_ && needsPick_ && pointerX_ >= 0 && pointerY_ >= 0 && pointerX_ < width && pointerY_ < height) {
            pick_ = pickCpuField(document.field(), camera.eye(), camera.ray(pointerX_, pointerY_, static_cast<float>(width), static_cast<float>(height)), isovalue);
            fieldRevision_ = document.generation();
            sampledIso_ = isovalue;
            needsPick_ = false;
        }
#endif
    }

    private:
    enum class Capture {
        none,
        orbit,
        pan,
        singleStamp,
        stroke
    };

    void release() {
        if (captured())
            SDL_CaptureMouse(false);
        capture_ = Capture::none;
        button_ = 0;
        needsPick_ = true;
    }

    // snippet:sculpt-cpu-press
    void press(const SDL_MouseButtonEvent& event, CpuDocument& document, const Camera& camera, float isovalue, int width, int height) {
        if (width <= 0 || height <= 0 || !finite(camera.eye()) || !std::isfinite(isovalue) || document.strokeActive())
            return;
        if (event.button != SDL_BUTTON_LEFT && event.button != SDL_BUTTON_RIGHT && event.button != SDL_BUTTON_MIDDLE)
            return;
        if (event.button == SDL_BUTTON_LEFT && sculptMode_ && paused_) {
            notice_ = "RESUME BEFORE EDITING THE FIELD";
            return;
        }
        if (!SDL_CaptureMouse(true)) {
            notice_ = std::string("POINTER CAPTURE FAILED: ") + SDL_GetError();
            return;
        }
        owner_ = event.which;
        button_ = event.button;
        pointerX_ = previousX_ = event.x;
        pointerY_ = previousY_ = event.y;
        capture_ = Capture::orbit;
        if (button_ == SDL_BUTTON_MIDDLE)
            capture_ = Capture::pan;
#if LAB_CHECKPOINT >= 4
        if (button_ == SDL_BUTTON_LEFT && sculptMode_) {
            const Vec3 direction = camera.ray(event.x, event.y, static_cast<float>(width), static_cast<float>(height));
            const auto hit = pickCpuField(document.field(), camera.eye(), direction, isovalue);
            if (!hit.hit) {
                notice_ = "NO SURFACE / START ON THE MESH";
                release();
                return;
            }
            frozenBrush_ = brush_;
            frozenBrush_.center = hit.point + camera.forward() * depth_;
            strokeAnchor_ = frozenBrush_.center;
            strokeNormal_ = camera.forward();
#if LAB_CHECKPOINT >= 5
            // snippet:sculpt-cpu-stroke-start-call
            document.beginStroke(owner_, frozenBrush_);
            capture_ = Capture::stroke;
            // end-snippet:sculpt-cpu-stroke-start-call
#else
            document.applyStamp(frozenBrush_);
            capture_ = Capture::singleStamp;
#endif
            notice_.clear();
        }
#endif
    }

    // end-snippet:sculpt-cpu-press

    // snippet:sculpt-cpu-drag
    void motion(const SDL_MouseMotionEvent& event, CpuDocument& document, Camera& camera, int width, int height) {
        if (width <= 0 || height <= 0) {
            cancel(document);
            return;
        }
        if (captured() && event.which != owner_)
            return;
        pointerX_ = event.x;
        pointerY_ = event.y;
        needsPick_ = true;
        pick_.reset();
        if (!captured())
            return;
        if ((event.state & SDL_BUTTON_MASK(button_)) == 0) {
            cancel(document);
            return;
        }
        if (capture_ == Capture::orbit) {
            camera.orbit(event.x - previousX_, event.y - previousY_);
            cameraChanged();
        } else if (capture_ == Capture::pan) {
            camera.pan(event.x - previousX_, event.y - previousY_);
            cameraChanged();
        }
#if LAB_CHECKPOINT >= 5
        else if (capture_ == Capture::stroke) {
            const Vec3 direction = camera.ray(event.x, event.y, static_cast<float>(width), static_cast<float>(height));
            const auto point = brushPlanePoint(camera.eye(), direction, strokeAnchor_, strokeNormal_);
            if (point && document.moveStroke(owner_, *point))
                frozenBrush_.center = *point;
        }
#endif
        previousX_ = event.x;
        previousY_ = event.y;
    }

    // end-snippet:sculpt-cpu-drag

    void key(const SDL_KeyboardEvent& event, CpuDocument& document) {
        const auto key = event.key;
        if (key == SDLK_ESCAPE) {
            cancel(document);
            return;
        }
        if (key == SDLK_SPACE) {
            cancel(document);
            paused_ = !paused_;
            return;
        }
        if (captured())
            return;
#if LAB_CHECKPOINT >= 4
        if (key == SDLK_TAB) {
            sculptMode_ = !sculptMode_;
            cameraChanged();
        }
        if (key == SDLK_A)
            brush_.mode = BrushMode::add;
        if (key == SDLK_D)
            brush_.mode = BrushMode::subtract;
        if (key == SDLK_F2 || key == SDLK_F3 || key == SDLK_F4) {
            BrushParameter parameter = BrushParameter::radius;
            if (key == SDLK_F3)
                parameter = BrushParameter::strength;
            if (key == SDLK_F4)
                parameter = BrushParameter::depth;
            adjustBrushParameter(brush_, depth_, parameter, (event.mod & SDL_KMOD_SHIFT) == 0, (event.mod & SDL_KMOD_CTRL) != 0);
            needsPick_ = true;
        }
#endif
#if LAB_CHECKPOINT >= 5
        if (key == SDLK_Z && !paused_ && !document.undo())
            notice_ = "NO STROKE TO UNDO";
        if (key == SDLK_Y && !paused_ && !document.redo())
            notice_ = "NO STROKE TO REDO";
#endif
    }

    Brush brush_, frozenBrush_;
    std::optional<CpuPick> pick_;
    Vec3 strokeAnchor_, strokeNormal_;
    std::string notice_;
    Capture capture_{Capture::none};
    std::uint32_t owner_{};
    std::uint8_t button_{};
    std::uint64_t fieldRevision_{};
    float depth_{}, pointerX_{-1}, pointerY_{-1}, previousX_{}, previousY_{}, sampledIso_{};
    bool sculptMode_{}, paused_{}, needsPick_{true};
};

} // namespace sculpt
