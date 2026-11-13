#pragma once

#include "sculpt_controls.hpp"
#include "sculpt_file_tasks.hpp"
#include "sculpt_frame_timer.hpp"
#include "sculpt_overlay.hpp"
#include "sculpt_scene_tasks.hpp"
#include <iomanip>
#include <sstream>

namespace sculpt {

struct PanelData {
    const GpuMeshBuilder& model;
    const GpuBudget& budget;
    const SculptControls& controls;
    const NativeFileTasks& files;
    const NativeSceneTasks& scenes;
    const FrameTimer& timer;
    std::uint64_t epoch;
    float requestedIso;
    std::string_view notice;
};

struct PanelBrushAdjustment {
    BrushParameter parameter;
    bool increase{}, coarse{};
};

inline std::string panelNumber(double value, int precision = 2) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(precision) << value;
    return text.str();
}

// Supplied UI scaffold. Tabs/focus mode keep diagnostic text away from the model.
class NativePanel {
    public:
    int width() const {
        if (compact_)
            return 48;
        return nativePanelWidth;
    }

    bool captured() const {
        return captured_;
    }

    void cancel() {
        release();
        adjustment_.reset();
    }

    std::optional<PanelBrushAdjustment> takeAdjustment() {
        const auto result = adjustment_;
        adjustment_.reset();
        return result;
    }

    bool pointerInside() const {
        return rectangle_.contains(pointerX_, pointerY_);
    }

    void layout(int width, int height) {
        rectangle_ = {static_cast<float>(width - this->width()), 0, static_cast<float>(this->width()), static_cast<float>(height)};
    }

    bool event(const SDL_Event& event, bool otherOwner) {
        if (event.type == SDL_EVENT_MOUSE_MOTION) {
            pointerX_ = event.motion.x;
            pointerY_ = event.motion.y;
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
            pointerX_ = event.button.x;
            pointerY_ = event.button.y;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
            release();
            return false;
        }
        if (otherOwner)
            return false;
        if (captured_ && event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
            release();
            return true;
        }
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && (event.key.key == SDLK_F1 || event.key.key == SDLK_F10)) {
            release();
            if (event.key.key == SDLK_F10)
                compact_ = !compact_;
            else {
                compact_ = false;
                page_ = (page_ + 1) % 3;
            }
            return true;
        }
        if (captured_) {
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (event.button.which == owner_ && event.button.button == button_) {
                    const int selected = targetAt(pointerX_, pointerY_);
                    if (selected == pressed_) {
                        if (selected == -2)
                            compact_ = !compact_;
                        else if (selected >= 10)
                            adjustment_ = PanelBrushAdjustment{static_cast<BrushParameter>((selected - 10) / 2), (selected - 10) % 2 != 0, coarse_};
                        else
                            page_ = selected;
                    }
                    release();
                }
                return true;
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (event.motion.which == owner_ && (event.motion.state & SDL_BUTTON_MASK(button_)) == 0)
                    release();
                return true;
            }
            return event.type == SDL_EVENT_MOUSE_BUTTON_DOWN;
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && pointerInside()) {
            const int target = targetAt(pointerX_, pointerY_);
            const bool parameterClick = target >= 10 && event.button.button == SDL_BUTTON_RIGHT;
            if ((event.button.button == SDL_BUTTON_LEFT || parameterClick) && target != -1 && SDL_CaptureMouse(true)) {
                pressed_ = target;
                owner_ = event.button.which;
                captured_ = true;
                button_ = event.button.button;
                coarse_ = parameterClick;
            }
            return true;
        }
        return pointerInside() && (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_WHEEL);
    }

    void draw(Overlay& overlay, const PanelData& data, int width, int height) {
        layout(width, height);
        const float left = rectangle_.x;
        const float bottom = static_cast<float>(height);
        overlay.rect(rectangle_, {0.028F, 0.045F, 0.065F});
        if (compact_) {
            overlay.text(left + 8, 20, "F10", {0.45F, 0.95F, 0.8F}, 1.6F, 38);
            overlay.text(left + 7, 43, "MENU", {0.65F, 0.8F, 0.86F}, 1.4F, 38);
            std::string mode = "CAM";
            if (data.controls.sculptMode()) {
                mode = "ADD";
                if (data.controls.brush().mode == BrushMode::subtract)
                    mode = "SUB";
            }
            overlay.text(left + 6, 80, mode, {0.6F, 0.95F, 0.8F}, 2, 38);
            overlay.text(left + 16, bottom - 32, "Q", {0.65F, 0.8F, 0.86F}, 2, 32);
            toast(overlay, data, width - this->width());
            return;
        }
        overlay.text(left + 16, 18, "VOLUME SCULPTOR", {0.5F, 0.95F, 0.83F}, 2.2F, 280);
        overlay.text(left + 16, 43, "PROJECT 44 / NATIVE DRAFT", {0.55F, 0.68F, 0.76F}, 1.4F, 306);
        overlay.text(left + 300, 23, "F10", {0.6F, 0.8F, 0.85F}, 1.1F, 36);
        std::string state = "READY TO SCULPT";
        if (!data.model.ready())
            state = "WAITING FOR CURRENT MESH";
        if (data.model.state() == MeshJobState::initializing)
            state = "INITIALIZING STORED FIELD";
        if (data.model.state() == MeshJobState::editing)
            state = "STROKE / RELEASE TO REMESH";
        if (data.model.state() == MeshJobState::failed)
            state = "JOB FAILED / LAST-GOOD";
        if (data.model.state() == MeshJobState::cancelled)
            state = "JOB CANCELLED / ENTER RETRY";
        if (data.model.paused())
            state = "JOBS PAUSED / CAMERA LIVE";
        if (data.files.busy())
            state = "FILE JOB " + panelNumber(data.files.progress() * 100, 0) + "% / C CANCEL";
        if (data.scenes.busy()) {
            state = "GRID " + std::to_string(data.scenes.requestedSamples()) + " / " + panelNumber(data.scenes.progress() * 100, 0) + "% / C CANCEL";
            if (data.scenes.paused())
                state = "GRID PAUSED / SPACE RESUME";
        }
        overlay.rect({left + 12, 65, 326, 28}, {0.055F, 0.12F, 0.14F});
        overlay.text(left + 20, 72, state, {0.65F, 0.95F, 0.85F}, 1.5F, 310);
        overlay.text(left + 16, 103, "SCENE " + std::to_string(data.epoch) + " / FIELD " + std::to_string(data.model.document().revision()) + " / MESH FIELD " + std::to_string(data.model.activeFieldRevision()), {0.6F, 0.76F, 0.82F}, 1.3F, 318);
        overlay.text(left + 16, 123, "ISO " + panelNumber(data.requestedIso, 3) + " / MESH ISO " + panelNumber(data.model.activeSettings().isovalue, 3), {0.6F, 0.76F, 0.82F}, 1.3F, 318);
        const std::array<std::string, 3> tabs{"TOOLS", "STATS", "FILES"};
        for (int page = 0; page < 3; ++page) {
            const auto rect = tab(page);
            Vec3 color{0.07F, 0.09F, 0.12F};
            if (page == page_)
                color = {0.08F, 0.22F, 0.23F};
            overlay.rect(rect, color);
            overlay.text(rect.x + 13, rect.y + 7, tabs[page], {0.75F, 0.88F, 0.9F}, 1.5F, rect.width - 16);
        }
        y_ = 190;
        if (page_ == 0)
            tools(overlay, data);
        else if (page_ == 1)
            stats(overlay, data);
        else
            files(overlay, data);
        overlay.text(left + 16, bottom - 56, "RMB ORBIT / MMB PAN / WHEEL ZOOM", {0.5F, 0.66F, 0.75F}, 1.3F, 318);
        overlay.text(left + 16, bottom - 39, "TAB LMB MODE / ESC ABORT STROKE", {0.5F, 0.66F, 0.75F}, 1.3F, 318);
        overlay.text(left + 16, bottom - 22, "F1 TABS / F10 FOCUS VIEW / Q EXIT", {0.5F, 0.66F, 0.75F}, 1.3F, 318);
        toast(overlay, data, width - this->width());
    }

    private:
    UiRect tab(int index) const {
        return {rectangle_.x + 12 + index * 109.0F, 148, 106, 29};
    }

    int targetAt(float x, float y) const {
        if (compact_) {
            if (UiRect{rectangle_.x + 3, 10, 42, 60}.contains(x, y))
                return -2;
            return -1;
        }
        if (UiRect{rectangle_.x + 296, 12, 42, 38}.contains(x, y))
            return -2;
        for (int page = 0; page < 3; ++page)
            if (tab(page).contains(x, y))
                return page;
        if (page_ == 0)
            for (int parameter = 0; parameter < 3; ++parameter)
                for (int direction = 0; direction < 2; ++direction)
                    if (parameterButton(parameter, direction).contains(x, y))
                        return 10 + parameter * 2 + direction;
        return -1;
    }

    UiRect parameterButton(int parameter, int direction) const {
        return {rectangle_.x + 268 + direction * 34.0F, 230 + parameter * 22.0F, 28, 21};
    }

    void release() {
        if (captured_)
            SDL_CaptureMouse(false);
        captured_ = false;
        pressed_ = -1;
        button_ = 0;
    }

    void row(Overlay& overlay, const std::string& text, Vec3 color = {0.75F, 0.84F, 0.88F}) {
        overlay.text(rectangle_.x + 16, y_, text, color, 2, 318);
        y_ += 22;
    }

    void tools(Overlay& overlay, const PanelData& data) {
        std::string pointerMode = "CAMERA";
        if (data.controls.sculptMode())
            pointerMode = "SCULPT";
        row(overlay, "TAB LMB MODE: " + pointerMode, {0.65F, 0.95F, 0.85F});
        std::string mode = "ADD";
        if (data.controls.brush().mode == BrushMode::subtract)
            mode = "SUBTRACT";
        row(overlay, "A / D BRUSH: " + mode, {0.5F, 0.95F, 0.8F});
        row(overlay, "RADIUS    " + panelNumber(data.controls.brush().radius, 3));
        row(overlay, "STRENGTH  " + panelNumber(data.controls.brush().strength, 3));
        row(overlay, "DEPTH     " + panelNumber(data.controls.depth(), 2));
        for (int parameter = 0; parameter < 3; ++parameter)
            for (int direction = 0; direction < 2; ++direction) {
                const auto button = parameterButton(parameter, direction);
                overlay.rect(button, {0.075F, 0.17F, 0.19F});
                std::string label = "-";
                if (direction != 0)
                    label = "+";
                overlay.text(button.x + 8, button.y + 4, label, {0.7F, 0.96F, 0.88F}, 2, 16);
            }
        overlay.text(rectangle_.x + 16, y_, "F2/F3/F4 +; SHIFT -; CTRL LARGE", {0.55F, 0.75F, 0.82F}, 1.3F, 318);
        y_ += 16;
        overlay.text(rectangle_.x + 16, y_, "BUTTONS: LMB SMALL / RMB LARGE", {0.55F, 0.75F, 0.82F}, 1.3F, 318);
        y_ += 16;
        row(overlay, "Z UNDO " + std::to_string(data.model.document().undoCount()) + " / Y REDO " + std::to_string(data.model.document().redoCount()));
        y_ += 8;
        row(overlay, "R RESET CHOSEN PRESET");
        row(overlay, "1 SPHERE / 2 TWO SPHERES");
        row(overlay, "3 TORUS / STORED FIELD");
        row(overlay, "F5 32 / F6 64 SAMPLES");
        row(overlay, "F7 128 / F8 192 SAMPLES");
        row(overlay, "F9 SLICE / X AXIS");
        row(overlay, "UP/DOWN LAYER HJKL PROBE");
        row(overlay, "F11 WIRE / F12 NORMALS");
        row(overlay, "LEFT/RIGHT ISOVALUE");
        row(overlay, "SPACE PAUSE/RESUME JOBS");
        row(overlay, "C CANCEL / ENTER REMESH");
    }

    void stats(Overlay& overlay, const PanelData& data) {
        std::uint64_t active = 0, vertices = 0;
        for (const auto& chunk : data.model.active()) {
            active += chunk.stats.activeCells;
            vertices += chunk.stats.vertices;
        }
        const auto times = data.model.times();
        row(overlay, "GRID " + std::to_string(data.model.settings().grid.samples) + " SAMPLES PER AXIS");
        if (data.scenes.busy())
            row(overlay, "REQUEST " + std::to_string(data.scenes.requestedSamples()) + " SAMPLES/AXIS");
        row(overlay, "SAMPLES " + std::to_string(data.model.settings().grid.sampleCount()));
        row(overlay, "CELLS " + std::to_string(data.model.settings().grid.cellCount()));
        row(overlay, "ACTIVE CELLS " + std::to_string(active));
        row(overlay, "VERTICES " + std::to_string(vertices));
        row(overlay, "TRIANGLES " + std::to_string(vertices / 3));
        row(overlay, "BUFFERS " + panelNumber(data.budget.used / 1048576.0) + " MIB");
        row(overlay, "REBUILT " + std::to_string(data.model.lastRebuiltChunks()) + " / " + std::to_string(chunkCount(data.model.settings().grid)) + " CHUNKS");
        row(overlay, "BRUSH WRITES " + std::to_string(data.model.document().changedSampleWrites()));
        y_ += 8;
        row(overlay, "GPU BRUSH   " + panelNumber(times.brush) + " MS");
        row(overlay, "GPU COUNT   " + panelNumber(times.count) + " MS");
        row(overlay, "GPU SCAN    " + panelNumber(times.scan) + " MS");
        row(overlay, "GPU EMIT    " + panelNumber(times.emit) + " MS");
        row(overlay, "GPU NORMALS " + panelNumber(times.normals) + " MS");
        if (data.timer.samples() != 0 && data.timer.sceneEpoch() == data.epoch)
            row(overlay, "GPU DRAW    " + panelNumber(data.timer.milliseconds()) + " MS");
        else
            row(overlay, "GPU DRAW WAITING");
        row(overlay, "DRAW MESH GENERATION " + std::to_string(data.timer.meshGeneration()));
    }

    void files(Overlay& overlay, const PanelData& data) {
        row(overlay, "S SAVE FROZEN GPU FIELD");
        row(overlay, "O REOPEN SAVED FIELD");
        row(overlay, "E EXPORT PUBLISHED MESH");
        row(overlay, "C CANCEL ACTIVE FILE JOB");
        y_ += 8;
        row(overlay, "NEW FILES / NO OVERWRITE");
        row(overlay, ".runtime/volume-sculptor");
        row(overlay, "FIELD: .SCL + CHECKSUM");
        row(overlay, "MESH: OBJ + NORMALS");
        row(overlay, "READ-BACK BEFORE PUBLISH");
        row(overlay, "PARTIAL FILES ARE KEPT");
        row(overlay, "CUSTOM FILE: --load PATH");
        y_ += 8;
        if (!data.files.status().empty())
            paragraph(overlay, data.files.status());
        if (!data.scenes.status().empty())
            paragraph(overlay, data.scenes.status());
    }

    void paragraph(Overlay& overlay, std::string_view text) {
        for (int line = 0; line < 3 && !text.empty(); ++line) {
            auto count = std::min<std::size_t>(26, text.size());
            if (count < text.size()) {
                const auto space = text.substr(0, count).find_last_of(' ');
                if (space != std::string_view::npos && space != 0)
                    count = space;
            }
            row(overlay, std::string(text.substr(0, count)), {0.55F, 0.83F, 0.88F});
            text.remove_prefix(count);
            while (!text.empty() && text.front() == ' ')
                text.remove_prefix(1);
        }
    }

    void toast(Overlay& overlay, const PanelData& data, int sceneWidth) const {
        std::string message(data.notice);
        if (message.empty())
            message = data.controls.notice();
        if (!message.empty())
            message = "LAST INPUT: " + message;
        if (!data.files.error().empty())
            message = "FILE: " + data.files.error();
        if (!data.scenes.error().empty())
            message = "GRID: " + data.scenes.error();
        if (!data.model.error().empty())
            message = data.model.error();
        if (message.empty())
            message = data.timer.error();
        if (message.empty())
            return;
        const float width = static_cast<float>(std::max(180, sceneWidth - 32));
        overlay.rect({16, 16, width, 46}, {0.08F, 0.11F, 0.14F});
        const auto columns = static_cast<std::size_t>((width - 20) / 8);
        overlay.text(26, 25, message.substr(0, columns), {1, 0.78F, 0.5F}, 1.3F, width - 20);
        if (message.size() > columns)
            overlay.text(26, 42, message.substr(columns, columns), {1, 0.78F, 0.5F}, 1.3F, width - 20);
    }

    UiRect rectangle_;
    int page_{}, pressed_{-1};
    std::uint32_t owner_{};
    std::uint8_t button_{};
    float pointerX_{-1}, pointerY_{-1}, y_{};
    std::optional<PanelBrushAdjustment> adjustment_;
    bool compact_{}, captured_{}, coarse_{};
};

} // namespace sculpt
