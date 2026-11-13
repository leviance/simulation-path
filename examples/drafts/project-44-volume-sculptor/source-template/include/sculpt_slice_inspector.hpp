#pragma once

#include "sculpt_gpu_mesh.hpp"
#include "sculpt_overlay.hpp"
#include "sculpt_slice.hpp"
#include <iomanip>
#include <sstream>

namespace sculpt {

struct FieldProbe {
    Vec3 gridCoordinate, worldPoint;
    float value{};
    std::uint32_t fieldRevision{}, meshGeneration{};
};

inline FieldProbe probeSliceField(const GpuMeshBuilder& model, const SliceState& slice) {
    if (!model.ready())
        throw std::logic_error("Numeric probe readback requires a stable current field/mesh pair");
    const auto& grid = model.settings().grid;
    const auto coordinate = sliceGridCoordinate(grid, slice);
    const int x = std::min(static_cast<int>(std::floor(coordinate.x)), grid.samples - 2);
    const int y = std::min(static_cast<int>(std::floor(coordinate.y)), grid.samples - 2);
    const int z = std::min(static_cast<int>(std::floor(coordinate.z)), grid.samples - 2);
    const Vec3 t = coordinate - Vec3{static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)};
    std::array<float, 4> rows{};
    // Exactly eight scalars (32 bytes), not a full volume readback or CPU extraction.
    for (int dz = 0; dz < 2; ++dz)
        for (int dy = 0; dy < 2; ++dy) {
            const auto values = model.readField(grid.sampleIndex(x, y + dy, z + dz), 2);
            rows[dz * 2 + dy] = interpolate(values[0], values[1], t.x);
        }
    const float value = interpolate(interpolate(rows[0], rows[1], t.y), interpolate(rows[2], rows[3], t.y), t.z);
    if (!std::isfinite(value))
        throw std::runtime_error("Numeric field probe is not finite");
    return {coordinate, grid.worldFromGrid(coordinate), value, model.document().revision(), model.activeGeneration()};
}

class SliceInspector {
    public:
    const SliceState& state() const {
        return state_;
    }

    const UiRect& rectangle() const {
        return rectangle_;
    }

    bool pointerInside() const {
        return state_.enabled && rectangle_.contains(pointerX_, pointerY_);
    }

    bool captured() const {
        return captured_;
    }

    void enabled(bool value) {
        if (!value)
            cancel();
        state_.enabled = value;
        dirtyProbe_ = true;
        probe_.reset();
    }

    void axis(int value) {
        if (value < 0 || value > 2)
            throw std::invalid_argument("Slice axis must be X, Y or Z");
        cancel();
        state_.axis = value;
        dirtyProbe_ = true;
        probe_.reset();
    }

    void modelChanged() {
        cancel();
        probe_.reset();
        dirtyProbe_ = true;
    }

    void layout(const GridSpec& grid, int sceneWidth, int sceneHeight) {
        if (samples_ != grid.samples) {
            float fraction = 0.5F;
            if (samples_ > 1)
                fraction = static_cast<float>(state_.layer) / (samples_ - 1);
            state_.layer = std::clamp(static_cast<int>(std::lround(fraction * (grid.samples - 1))), 0, grid.samples - 1);
            samples_ = grid.samples;
            probe_.reset();
            dirtyProbe_ = true;
        }
        const float size = std::clamp(sceneWidth * 0.42F, 160.0F, 230.0F);
        rectangle_ = {16, std::max(48.0F, sceneHeight - size - 94.0F), size, size};
    }

    void cancel() {
        if (captured_)
            SDL_CaptureMouse(false);
        captured_ = false;
    }

    bool event(const SDL_Event& event, bool otherOwner) {
        if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
            cancel();
            return false;
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION) {
            pointerX_ = event.motion.x;
            pointerY_ = event.motion.y;
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            pointerX_ = event.button.x;
            pointerY_ = event.button.y;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
            cancel();
            return false;
        }
        if (otherOwner)
            return false;
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            const auto key = event.key.key;
            if (key == SDLK_V || key == SDLK_F9) {
                cancel();
                state_.enabled = !state_.enabled;
                return true;
            }
            if (state_.enabled) {
                if (key == SDLK_ESCAPE) {
                    cancel();
                    return true;
                }
                if (key == SDLK_X)
                    axis((state_.axis + 1) % 3);
                else if (key == SDLK_UP)
                    state_.layer = std::min(samples_ - 1, state_.layer + 1);
                else if (key == SDLK_DOWN)
                    state_.layer = std::max(0, state_.layer - 1);
                else if (key == SDLK_H)
                    state_.u = std::max(0.0F, state_.u - 0.025F);
                else if (key == SDLK_L)
                    state_.u = std::min(1.0F, state_.u + 0.025F);
                else if (key == SDLK_K)
                    state_.v = std::max(0.0F, state_.v - 0.025F);
                else if (key == SDLK_J)
                    state_.v = std::min(1.0F, state_.v + 0.025F);
                else
                    return false;
                dirtyProbe_ = true;
                probe_.reset();
                return true;
            }
        }
        if (!state_.enabled)
            return false;
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && pointerInside()) {
            if (event.button.button == SDL_BUTTON_LEFT && !captured_) {
                if (SDL_CaptureMouse(true)) {
                    owner_ = event.button.which;
                    captured_ = true;
                    select(pointerX_, pointerY_);
                } else
                    notice_ = "SLICE POINTER CAPTURE FAILED";
            }
            return true;
        }
        if (captured_) {
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (event.motion.which == owner_) {
                    if ((event.motion.state & SDL_BUTTON_LMASK) == 0)
                        cancel();
                    else
                        select(event.motion.x, event.motion.y);
                }
                return true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (event.button.which == owner_ && event.button.button == SDL_BUTTON_LEFT)
                    cancel();
                return true;
            }
        }
        if (pointerInside() && event.type == SDL_EVENT_MOUSE_WHEEL) {
            if (event.wheel.y > 0)
                state_.layer = std::min(samples_ - 1, state_.layer + 1);
            if (event.wheel.y < 0)
                state_.layer = std::max(0, state_.layer - 1);
            dirtyProbe_ = true;
            probe_.reset();
            return true;
        }
        return pointerInside() && event.type == SDL_EVENT_MOUSE_MOTION;
    }

    void update(const GpuMeshBuilder& model) {
        if (!state_.enabled || !model.ready())
            return;
        if (!dirtyProbe_ && probe_ && probe_->fieldRevision == model.document().revision())
            return;
        try {
            probe_ = probeSliceField(model, state_);
            dirtyProbe_ = false;
            notice_.clear();
        } catch (const std::exception& error) {
            notice_ = error.what();
        }
    }

    void overlay(Overlay& overlay, const GpuMeshBuilder& model) const {
        if (!state_.enabled)
            return;
        const auto r = rectangle_;
        const Vec3 background{0.025F, 0.04F, 0.06F}, frame{0.25F, 0.52F, 0.55F};
        overlay.rect({r.x - 2, r.y - 27, r.width + 4, 25}, background);
        overlay.rect({r.x - 2, r.y + r.height + 2, r.width + 4, 76}, background);
        overlay.rect({r.x - 2, r.y - 2, r.width + 4, 2}, frame);
        overlay.rect({r.x - 2, r.y + r.height, r.width + 4, 2}, frame);
        overlay.rect({r.x - 2, r.y, 2, r.height}, frame);
        overlay.rect({r.x + r.width, r.y, 2, r.height}, frame);
        const std::array<std::string, 3> axes{"X", "Y", "Z"};
        overlay.text(r.x + 6, r.y - 20, "SLICE " + axes[state_.axis] + " / " + std::to_string(state_.layer) + " OF " + std::to_string(samples_ - 1), {0.65F, 0.95F, 0.9F}, 1.4F, r.width - 8);
        overlay.text(r.x + 4, r.y + r.height + 8, axes[(state_.axis + 1) % 3] + " RIGHT / " + axes[(state_.axis + 2) % 3] + " UP / X AXIS", {0.7F, 0.8F, 0.85F}, 1.2F, r.width - 8);
        if (probe_) {
            std::ostringstream text;
            text << std::fixed << std::setprecision(3) << "WORLD " << probe_->worldPoint.x << ' ' << probe_->worldPoint.y << ' ' << probe_->worldPoint.z;
            overlay.text(r.x + 4, r.y + r.height + 25, text.str(), {0.9F, 0.88F, 0.65F}, 1.2F, r.width - 8);
            text.str("");
            text << std::setprecision(5) << "F(P) " << probe_->value << " / FIELD " << probe_->fieldRevision;
            overlay.text(r.x + 4, r.y + r.height + 42, text.str(), {0.9F, 0.88F, 0.65F}, 1.2F, r.width - 8);
        }
        std::string status = "UP/DOWN LAYER / HJKL PROBE";
        if (!model.ready())
            status = "PROBE HELD / FIELD JOB PENDING";
        if (model.document().strokeOpen())
            status = "FIELD EDITING / MESH IS LAST-GOOD";
        if (!notice_.empty())
            status = notice_;
        overlay.text(r.x + 4, r.y + r.height + 59, status, {0.55F, 0.75F, 0.85F}, 1.1F, r.width - 8);
    }

    private:
    void select(float x, float y) {
        state_.u = std::clamp((x - rectangle_.x) / rectangle_.width, 0.0F, 1.0F);
        state_.v = std::clamp((y - rectangle_.y) / rectangle_.height, 0.0F, 1.0F);
        dirtyProbe_ = true;
        probe_.reset();
    }

    SliceState state_;
    UiRect rectangle_;
    std::optional<FieldProbe> probe_;
    std::string notice_;
    int samples_{};
    float pointerX_{-1}, pointerY_{-1};
    std::uint32_t owner_{};
    bool captured_{}, dirtyProbe_{true};
};

class SliceRenderer {
    public:
    explicit SliceRenderer(GlApi& gl)
        : gl_(gl), program_(gl, "sculpt_slice.vert", "sculpt_slice.frag") {
        gl_.GenVertexArrays(1, &vao_);
        if (!vao_)
            throw std::runtime_error("Could not allocate slice VAO");
    }

    ~SliceRenderer() {
        gl_.DeleteVertexArrays(1, &vao_);
    }

    void draw(const GpuMeshBuilder& model, const SliceInspector& inspector, int width, int height, int logicalWidth, int logicalHeight) {
        if (!inspector.state().enabled || !model.document().hasCompleteField())
            return;
        const auto& slice = inspector.state();
        const auto& r = inspector.rectangle();
        const float sx = static_cast<float>(width) / logicalWidth, sy = static_cast<float>(height) / logicalHeight;
        gl_.Viewport(static_cast<int>(r.x * sx), static_cast<int>((logicalHeight - r.y - r.height) * sy), static_cast<int>(r.width * sx), static_cast<int>(r.height * sy));
        gl_.Disable(GL_DEPTH_TEST);
        program_.use();
        gl_.Uniform1i(program_.uniform("gridN"), model.settings().grid.samples);
        gl_.Uniform1i(program_.uniform("sliceAxis"), slice.axis);
        gl_.Uniform1i(program_.uniform("sliceLayer"), slice.layer);
        gl_.Uniform1f(program_.uniform("isovalue"), model.settings().isovalue);
        gl_.Uniform2f(program_.uniform("probeUV"), slice.u, slice.v);
        model.document().field().bind(0);
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 6);
    }

    private:
    GlApi& gl_;
    Program program_;
    GLuint vao_{};
};

} // namespace sculpt
