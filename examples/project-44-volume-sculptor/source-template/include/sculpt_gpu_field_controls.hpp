#pragma once

#include "sculpt_gpu_document.hpp"
#include "sculpt_overlay.hpp"
#include "sculpt_slice.hpp"

namespace sculpt {

// Supplied 2D editor for lesson 06: the chosen slice fixes the brush's third coordinate.
// GPU surface picking returns later; this viewer never pretends the slice is a 3D mesh.
class GpuFieldLessonControls {
    public:
    GpuFieldLessonControls(const GridSpec& grid, Brush brush)
        : brush_(brush) {
        slice_.enabled = true;
        slice_.layer = grid.samples / 2;
        slice_.u = 0.74F;
    }

    ~GpuFieldLessonControls() {
        releasePointer();
    }

    const SliceState& slice() const {
        return slice_;
    }

    const Brush& brush() const {
        return brush_;
    }

    const UiRect& rectangle() const {
        return rectangle_;
    }

    const std::string& notice() const {
        return notice_;
    }

    bool paused() const {
        return paused_;
    }

    bool quit() const {
        return quit_;
    }

    bool captured() const {
        return captured_;
    }

    std::optional<Shape> resetRequest() const {
        return reset_;
    }

    void resetAccepted() {
        reset_.reset();
        paused_ = false;
        notice_.clear();
    }

    void layout(int width, int height, bool countInspector = false) {
        float footer = 180;
        if (countInspector)
            footer = 300;
        const float size = std::max(1.0F, std::min(width - 396.0F, height - footer));
        rectangle_ = {24, 70, size, size};
    }

    void cancel(GpuFieldDocument& document) {
        document.abortStroke();
        releasePointer();
    }

    void event(const SDL_Event& event, GpuFieldDocument& document, const GridSpec& grid, Shape shape, bool canEdit = true) {
        try {
            route(event, document, grid, shape, canEdit);
        } catch (const std::exception& error) {
            cancel(document);
            notice_ = error.what();
        }
    }

    private:
    void select(float x, float y) {
        slice_.u = std::clamp((x - rectangle_.x) / rectangle_.width, 0.0F, 1.0F);
        slice_.v = std::clamp((y - rectangle_.y) / rectangle_.height, 0.0F, 1.0F);
    }

    void releasePointer() {
        if (captured_)
            SDL_CaptureMouse(false);
        captured_ = false;
        owner_.reset();
    }

    // snippet:sculpt-gpu-slice-stamp
    bool start(GpuFieldDocument& document, const GridSpec& grid, std::uint32_t owner, bool finishImmediately) {
        Brush stamp = brush_;
        stamp.center = sliceWorldPoint(grid, slice_);
        if (!document.beginStroke(owner, stamp))
            return false;
        if (finishImmediately)
            document.endStroke(owner);
        notice_.clear();
        return true;
    }

    // end-snippet:sculpt-gpu-slice-stamp

    void route(const SDL_Event& event, GpuFieldDocument& document, const GridSpec& grid, Shape shape, bool canEdit) {
        if (event.type == SDL_EVENT_QUIT) {
            cancel(document);
            quit_ = true;
            return;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
            cancel(document);
            paused_ = true;
            return;
        }
        if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
            cancel(document);
            return;
        }
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            const auto key = event.key.key;
            if (key == SDLK_Q) {
                cancel(document);
                quit_ = true;
                return;
            }
            if (key == SDLK_SPACE || key == SDLK_ESCAPE) {
                cancel(document);
                if (key == SDLK_SPACE)
                    paused_ = !paused_;
                return;
            }
            if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3) {
                cancel(document);
                paused_ = false;
                reset_ = shape;
                if (key == SDLK_1)
                    reset_ = Shape::sphere;
                if (key == SDLK_2)
                    reset_ = Shape::separatedSpheres;
                if (key == SDLK_3)
                    reset_ = Shape::torus;
                return;
            }
            // Freeze the slice and brush throughout capture, just as the CPU stroke did.
            if (captured_ || paused_ || reset_)
                return;
            if (!canEdit && (key == SDLK_RETURN || key == SDLK_Z || key == SDLK_Y))
                return;
            if (key == SDLK_X)
                slice_.axis = (slice_.axis + 1) % 3;
            else if (key == SDLK_UP)
                slice_.layer = std::min(grid.samples - 1, slice_.layer + 1);
            else if (key == SDLK_DOWN)
                slice_.layer = std::max(0, slice_.layer - 1);
            else if (key == SDLK_H)
                slice_.u = std::max(0.0F, slice_.u - 0.025F);
            else if (key == SDLK_L)
                slice_.u = std::min(1.0F, slice_.u + 0.025F);
            else if (key == SDLK_K)
                slice_.v = std::max(0.0F, slice_.v - 0.025F);
            else if (key == SDLK_J)
                slice_.v = std::min(1.0F, slice_.v + 0.025F);
            else if (key == SDLK_A)
                brush_.mode = BrushMode::add;
            else if (key == SDLK_D)
                brush_.mode = BrushMode::subtract;
            else if (key == SDLK_F2 || key == SDLK_F3) {
                BrushParameter parameter = BrushParameter::radius;
                if (key == SDLK_F3)
                    parameter = BrushParameter::strength;
                float unusedDepth = 0;
                adjustBrushParameter(brush_, unusedDepth, parameter, (event.key.mod & SDL_KMOD_SHIFT) == 0, (event.key.mod & SDL_KMOD_CTRL) != 0);
            } else if (key == SDLK_RETURN && document.stable())
                start(document, grid, 0xfffffffeU, true);
            else if (key == SDLK_Z && document.stable())
                document.undo();
            else if (key == SDLK_Y && document.stable())
                document.redo();
            return;
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !captured_ && !paused_ && !reset_ && rectangle_.contains(event.button.x, event.button.y)) {
            select(event.button.x, event.button.y);
            if (!document.stable() || !canEdit)
                return;
            if (!SDL_CaptureMouse(true))
                throw std::runtime_error(SDL_GetError());
            captured_ = true;
            owner_ = event.button.which;
            if (!start(document, grid, *owner_, false))
                releasePointer();
            return;
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION && captured_ && event.motion.which == owner_) {
            if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                cancel(document);
                return;
            }
            select(event.motion.x, event.motion.y);
            document.moveStroke(*owner_, sliceWorldPoint(grid, slice_));
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && captured_ && event.button.which == owner_ && event.button.button == SDL_BUTTON_LEFT) {
            document.endStroke(*owner_);
            releasePointer();
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL && !captured_ && !paused_ && !reset_) {
            if (event.wheel.y > 0)
                slice_.layer = std::min(grid.samples - 1, slice_.layer + 1);
            if (event.wheel.y < 0)
                slice_.layer = std::max(0, slice_.layer - 1);
        }
    }

    SliceState slice_;
    Brush brush_;
    UiRect rectangle_;
    std::optional<std::uint32_t> owner_;
    std::optional<Shape> reset_;
    std::string notice_;
    bool captured_{}, paused_{}, quit_{};
};

} // namespace sculpt
