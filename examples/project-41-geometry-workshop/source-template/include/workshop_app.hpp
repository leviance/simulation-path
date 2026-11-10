#pragma once

#include "geometry_renderer.hpp"
#include "native_window.hpp"
#if LAB_CHECKPOINT >= 8
#include "obj_file.hpp"
#endif
#include "workshop_panel.hpp"

#include <iostream>

namespace geometry {

class WorkshopApp {
    public:
    WorkshopApp(NativeWindow& window, GeometryRenderer& renderer)
        : window_(window), renderer_(renderer) {}

    ~WorkshopApp() {
        releasePointer();
    }

    void request(const SurfaceSettings& settings, bool interactive = false) {
#if LAB_CHECKPOINT == 0
        (void)settings;
        (void)interactive;
        status_ = "Starter / add the patch evaluator first";
#else
        status_.clear();
        session_.request(settings, interactive);
#endif
    }

    void advanceMesh() {
        session_.advance();
        const Mesh* ready = session_.readyMesh();
        if (!ready)
            return;
        try {
            renderer_.upload(*ready, session_.readyPass());
            session_.acceptReady();
        } catch (const std::exception& error) {
            session_.reject(error.what());
        }
    }

    void handleEvent(const SDL_Event& event) {
        if (event.type == SDL_EVENT_QUIT || event.type == SDL_EVENT_WINDOW_CLOSE_REQUESTED) {
            running_ = false;
        } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
            releasePointer();
        } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            handleKey(event.key.key);
        } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            beginPointer(event.button);
        } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == pointerButton_) {
            releasePointer();
        } else if (event.type == SDL_EVENT_MOUSE_MOTION && pointerButton_ != 0) {
            movePointer(event.motion);
        } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
            if (!panelVisible_ || !currentLayout().panel.contains(event.wheel.mouse_x, event.wheel.mouse_y)) {
                camera_.zoom(event.wheel.y);
            }
        }
    }

    void draw(int width, int height) {
        if (!panelVisible_) {
            renderer_.draw(session_, camera_, view_, width, height, width);
        } else {
            const auto [logicalWidth, logicalHeight] = logicalSize();
            const WorkshopLayout layout = layoutWorkshop(logicalWidth, logicalHeight);
            const int viewport = scenePixelWidth(layout, logicalWidth, width);
            renderer_.draw(session_, camera_, view_, width, height, viewport);
            overlay_.reset(logicalWidth, logicalHeight);
            std::string_view message = session_.message();
            if (!status_.empty())
                message = status_;
            drawWorkshopPanel(overlay_, layout, session_, editingSettings(), view_, message);
            renderer_.drawOverlay(overlay_.vertices(), width, height);
        }
        updateTitle();
    }

    bool running() const {
        return running_;
    }

    const MeshSession& session() const {
        return session_;
    }

    ViewOptions& view() {
        return view_;
    }

    void setPanelVisible(bool visible) {
        releasePointer();
        panelVisible_ = visible;
    }

#if LAB_CHECKPOINT >= 8
    std::filesystem::path exportTo(const std::filesystem::path& newDirectory) const {
        if (session_.requested() || !session_.lastGood()) {
            throw std::runtime_error("Finish or cancel the candidate before exporting");
        }
        return exportVerifiedObj(*session_.lastGood(), newDirectory);
    }
#endif

#if LAB_CHECKPOINT >= 9
    void exerciseViewWithoutRebuild();
    void exercisePanelEvents();
#endif

    private:
#if LAB_CHECKPOINT >= 9
    void exerciseKey(SDL_Keycode key);
#endif

    SurfaceSettings editingSettings() const {
        if (session_.requested())
            return *session_.requested();
        if (session_.lastGood())
            return session_.lastGood()->settings;
        return presetSettings(lessonPreset());
    }

    std::array<int, 2> logicalSize() const {
        int width{};
        int height{};
        if (!SDL_GetWindowSize(window_.window(), &width, &height) || width <= 0 || height <= 0) {
            throw std::runtime_error("Could not read the workshop window size");
        }
        return {width, height};
    }

    WorkshopLayout currentLayout() const {
        const auto [width, height] = logicalSize();
        return layoutWorkshop(width, height);
    }

    bool capturePointer(Uint8 button) {
        if (!SDL_CaptureMouse(true)) {
            status_ = "Mouse capture unavailable";
            return false;
        }
        pointerButton_ = button;
        osCaptured_ = true;
        return true;
    }

    void beginPointer(const SDL_MouseButtonEvent& event) {
        if (pointerButton_ != 0)
            return;
        if (panelVisible_) {
            const WorkshopLayout layout = currentLayout();
            if (layout.panel.contains(event.x, event.y)) {
                if (event.button == SDL_BUTTON_LEFT)
                    beginPanelPointer(layout, event.x, event.y);
                return;
            }
        }
        if (event.button == SDL_BUTTON_LEFT || event.button == SDL_BUTTON_RIGHT ||
            event.button == SDL_BUTTON_MIDDLE) {
            capturePointer(event.button);
        }
    }

    void beginPanelPointer(const WorkshopLayout& layout, float x, float y) {
        for (std::size_t index = 0; index < panelPresets.size(); ++index) {
            if (layout.presets[index].contains(x, y)) {
                choosePreset(panelPresets[index]);
                return;
            }
        }
        for (std::size_t index = 0; index < panelViews.size(); ++index) {
            if (layout.display[index].contains(x, y)) {
                const PanelView view = panelViews[index];
                if (view == PanelView::wireframe)
                    handleKey(SDLK_W);
                if (view == PanelView::uv)
                    handleKey(SDLK_U);
                if (view == PanelView::vectors)
                    handleKey(SDLK_N);
                if (view == PanelView::seams)
                    handleKey(SDLK_S);
                return;
            }
        }
        if (layout.reset.contains(x, y)) {
            handleKey(SDLK_R);
            return;
        }
#if LAB_CHECKPOINT >= 7
        if (layout.cancel.contains(x, y)) {
            handleKey(SDLK_X);
            return;
        }
#endif
#if LAB_CHECKPOINT >= 8
        if (layout.exportMesh.contains(x, y)) {
            handleKey(SDLK_E);
            return;
        }
#endif
        const ParameterList controls = shapeParameters(editingSettings());
        for (int index = 0; index < controls.count; ++index) {
            const UiRect& track = layout.sliders[index];
            if (!track.contains(x, y))
                continue;
            const ParameterId id = controls.items[index].id;
            const bool captured = capturePointer(SDL_BUTTON_LEFT);
            if (captured)
                draggingParameter_ = id;
            applySlider(id, (x - track.x) / track.width, captured);
            if (!captured)
                status_ = "Capture unavailable / click or use keys";
            return;
        }
    }

    void applySlider(ParameterId id, double fraction, bool interactive) {
        SurfaceSettings settings = editingSettings();
        if (applyParameter(settings, id, fraction))
            request(settings, interactive);
    }

    void moveSlider(float x) {
        const WorkshopLayout layout = currentLayout();
        const ParameterList controls = shapeParameters(editingSettings());
        for (int index = 0; index < controls.count; ++index) {
            if (controls.items[index].id != *draggingParameter_)
                continue;
            const UiRect& track = layout.sliders[index];
            applySlider(*draggingParameter_, (x - track.x) / track.width, true);
            return;
        }
        releasePointer();
    }

    void releasePointer() {
        if (draggingParameter_)
            session_.finishInteraction();
        draggingParameter_.reset();
        pointerButton_ = 0;
        if (osCaptured_)
            SDL_CaptureMouse(false);
        osCaptured_ = false;
    }

    void movePointer(const SDL_MouseMotionEvent& motion) {
        if (!(motion.state & SDL_BUTTON_MASK(pointerButton_))) {
            releasePointer();
            return;
        }
        if (draggingParameter_)
            moveSlider(motion.x);
        else if (pointerButton_ == SDL_BUTTON_LEFT)
            camera_.orbit(motion.xrel, motion.yrel);
        else
            camera_.pan(motion.xrel, motion.yrel);
    }

    void choosePreset(SurfaceKind kind) {
        releasePointer();
        request(presetSettings(kind));
    }

    void handleKey(SDL_Keycode key) {
        if (key >= SDLK_1 && key <= SDLK_4) {
            const auto index = static_cast<std::size_t>(key - SDLK_1);
            if (index < panelPresets.size())
                choosePreset(panelPresets[index]);
            return;
        }
        switch (key) {
        case SDLK_ESCAPE:
            running_ = false;
            return;
        case SDLK_TAB:
            setPanelVisible(!panelVisible_);
            return;
#if LAB_CHECKPOINT >= 2
        case SDLK_W:
            view_.wireframe = !view_.wireframe;
            return;
#endif
#if LAB_CHECKPOINT >= 3
        case SDLK_U:
            view_.uv = !view_.uv;
            return;
        case SDLK_S:
            view_.seams = !view_.seams;
            return;
#endif
#if LAB_CHECKPOINT >= 1
        case SDLK_N:
            view_.normals = !view_.normals;
            return;
#endif
        case SDLK_B:
            view_.grid = !view_.grid;
            return;
        case SDLK_LEFT:
            camera_.orbit(-10, 0);
            return;
        case SDLK_RIGHT:
            camera_.orbit(10, 0);
            return;
        case SDLK_UP:
            camera_.orbit(0, 10);
            return;
        case SDLK_DOWN:
            camera_.orbit(0, -10);
            return;
        case SDLK_PAGEUP:
            camera_.zoom(1);
            return;
        case SDLK_PAGEDOWN:
            camera_.zoom(-1);
            return;
#if LAB_CHECKPOINT >= 8
        case SDLK_E:
            exportNext();
            return;
#endif
#if LAB_CHECKPOINT >= 7
        case SDLK_X:
            releasePointer();
            session_.cancel();
            status_.clear();
            return;
#endif
        case SDLK_R:
            camera_ = {};
            choosePreset(editingSettings().kind);
            return;
        default:
            break;
        }

        SurfaceSettings settings = editingSettings();
        if (key == SDLK_A || key == SDLK_D) {
            double delta = 0.1;
            if (key == SDLK_A)
                delta = -delta;
            if (settings.kind == SurfaceKind::patch) {
                settings.patchHeight = std::clamp(settings.patchHeight + delta, 0.0, 1.6);
            } else {
                settings.radius = std::clamp(settings.radius + delta, 0.6, 4.0);
                settings.thickness = std::min(settings.thickness, thicknessLimit(settings.kind, settings.radius));
            }
        } else if ((key == SDLK_J || key == SDLK_L) && settings.kind != SurfaceKind::patch) {
            double delta = 0.02;
            if (key == SDLK_J)
                delta = -delta;
            settings.thickness = std::clamp(settings.thickness + delta, 0.04, thicknessLimit(settings.kind, settings.radius));
#if LAB_CHECKPOINT >= 2
        } else if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
            const bool increase = key == SDLK_RIGHTBRACKET;
            setResolution(settings, increase);
#endif
        } else if (key == SDLK_COMMA || key == SDLK_PERIOD) {
            changeTwist(settings, key == SDLK_PERIOD);
        } else if ((key == SDLK_G || key == SDLK_H) && settings.kind == SurfaceKind::shell) {
            double delta = 0.1;
            if (key == SDLK_G)
                delta = -delta;
            settings.shellGrowth = std::clamp(settings.shellGrowth + delta, 0.8, 2.5);
        } else if ((key == SDLK_T || key == SDLK_Y) && settings.kind == SurfaceKind::shell) {
            double delta = 0.1;
            if (key == SDLK_T)
                delta = -delta;
            settings.shellTurns = std::clamp(settings.shellTurns + delta, 1.25, 3.25);
        } else if (key == SDLK_K && settings.kind == SurfaceKind::knot) {
            if (settings.knotLobes == 3)
                settings.knotLobes = 5;
            else
                settings.knotLobes = 3;
        } else {
            return;
        }
        releasePointer();
        request(settings);
    }

#if LAB_CHECKPOINT >= 2
    static void setResolution(SurfaceSettings& settings, bool increase) {
        constexpr std::array levels{32, 64, 128, 256};
        int minimum = 32;
        if (usesSweep(settings.kind))
            minimum = minSweepSegments;
        int next = minimum;
        if (increase) {
            next = maxSegments;
            for (const int level : levels) {
                if (level > maxSegments)
                    break;
                if (level > settings.uSegments && level >= minimum) {
                    next = level;
                    break;
                }
            }
        } else {
            for (const int level : levels) {
                if (level >= minimum && level < settings.uSegments)
                    next = level;
            }
        }
        settings.uSegments = next;
        settings.vSegments = next;
    }
#endif

    static void changeTwist(SurfaceSettings& settings, bool increase) {
        int direction = 1;
        if (!increase)
            direction = -1;
        if (settings.kind == SurfaceKind::mobius) {
            settings.halfTwists = std::clamp(settings.halfTwists + 2 * direction, 1, 5);
        } else if (settings.kind == SurfaceKind::shell) {
            settings.sectionTurns = std::clamp(settings.sectionTurns + 0.125 * direction, -2.0, 2.0);
        } else if (settings.kind == SurfaceKind::knot) {
            settings.sectionTurns = std::clamp(settings.sectionTurns + direction, -2.0, 2.0);
        }
    }

#if LAB_CHECKPOINT >= 8
    void exportNext() {
        try {
            if (session_.requested() || !session_.lastGood()) {
                throw std::runtime_error("Finish or cancel the candidate before exporting");
            }
            std::unique_ptr<char, decltype(&SDL_free)> base(
                SDL_GetPrefPath("SimulationPath", "GeometryWorkshop"), SDL_free
            );
            if (!base)
                throw std::runtime_error(SDL_GetError());
            const auto directory = pathFromUtf8(base.get());
            // Select a bounded, fresh destination inside the user-owned application directory.
            for (int number = 1; number <= 1000; ++number) {
                const auto next = directory / ("export-" + std::to_string(number));
                if (std::filesystem::exists(next))
                    continue;
                const auto path = exportTo(next);
                std::cout << "OBJ verified: " << path << '\n';
                status_ = "OBJ saved to export-" + std::to_string(number) + "/geometry.obj";
                return;
            }
            throw std::runtime_error("Export directory limit reached");
        } catch (const std::exception& error) {
            status_ = error.what();
        }
    }
#endif

    void updateTitle() {
        std::string title = "Project 41 - Geometry Workshop";
        const Mesh* mesh = session_.displayedMesh();
        if (mesh) {
            title += " | ";
            title += presetName(mesh->settings.kind);
            if (session_.showingPreview())
                title += " preview";
            title += " - " + std::to_string(mesh->vertices.size()) + " vertices";
            title += ", " + std::to_string(mesh->indices.size() / 3) + " triangles";
            title += ", " + std::to_string(mesh->payloadBytes()) + " bytes";
        }
        if (session_.requested()) {
            title += " | building ";
            title += presetName(session_.requested()->kind);
            title += " " + std::to_string(session_.completedRows()) + "/" + std::to_string(session_.totalRows());
        } else if (!status_.empty()) {
            title += " | " + status_;
        } else if (!session_.message().empty()) {
            title += " | " + session_.message();
        }
        if (title == title_)
            return;
        title_ = std::move(title);
        SDL_SetWindowTitle(window_.window(), title_.c_str());
    }

    NativeWindow& window_;
    GeometryRenderer& renderer_;
    MeshSession session_;
    OrbitCamera camera_;
    ViewOptions view_;
    WorkshopOverlay overlay_;
    std::string title_;
    std::string status_;
    bool running_{true};
    bool panelVisible_{true};
    bool osCaptured_{};
    Uint8 pointerButton_{};
    std::optional<ParameterId> draggingParameter_;
};

} // namespace geometry
