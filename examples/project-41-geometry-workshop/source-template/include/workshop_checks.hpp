#pragma once

#include "surface_settings.hpp"

#if LAB_CHECKPOINT >= 9
#include "workshop_app.hpp"

namespace geometry {

// Synthetic SDL events exercise the app path in a hidden context, without OS input injection.
inline void WorkshopApp::exerciseKey(SDL_Keycode key) {
    SDL_Event event{};
    event.type = SDL_EVENT_KEY_DOWN;
    event.key.key = key;
    handleEvent(event);
}

inline void WorkshopApp::exerciseViewWithoutRebuild() {
    const Mesh* displayed = session_.lastGood();
    if (!displayed || session_.requested())
        throw std::runtime_error("View check requires a complete mesh");
    const auto builds = session_.buildCount();
    const auto publications = session_.publicationCount();
    const Mat4 before = camera_.viewProjection(1.5);
    const ViewOptions previousView = view_;
    for (const SDL_Keycode key : {SDLK_LEFT, SDLK_UP, SDLK_PAGEUP, SDLK_W, SDLK_U, SDLK_N, SDLK_S}) {
        exerciseKey(key);
        advanceMesh();
    }
    if (camera_.viewProjection(1.5) == before || view_.wireframe == previousView.wireframe ||
        view_.uv == previousView.uv || view_.normals == previousView.normals || view_.seams == previousView.seams) {
        throw std::runtime_error("Camera or display controls did not change the view");
    }
    if (session_.lastGood() != displayed || session_.buildCount() != builds ||
        session_.publicationCount() != publications) {
        throw std::runtime_error("Camera or display options rebuilt the mesh");
    }

    const SurfaceSettings original = displayed->settings;
    SurfaceSettings changed = original;
    changed.thickness = 0.04;
    if (changed.thickness == original.thickness)
        changed.thickness = thicknessLimit(changed.kind, changed.radius);
    request(changed);
    advanceMesh();
    const auto inFlightBuilds = session_.buildCount();
    const Vec3 oldTarget = camera_.target;
    camera_.pan(18.0, 7.0);
    exerciseKey(SDLK_RIGHT);
    if (!session_.requested() || session_.buildCount() != inFlightBuilds ||
        session_.lastGood() != displayed || length(camera_.target - oldTarget) <= 1e-9) {
        throw std::runtime_error("Camera must stay usable while a candidate is in flight");
    }
    exerciseKey(SDLK_X);
    if (session_.requested() || session_.displayedMesh() != displayed) {
        throw std::runtime_error("Cancel did not restore the last complete mesh");
    }

    request(changed);
    changed.uSegments = maxSegments + 1;
    request(changed);
    if (session_.requested() || session_.displayedMesh() != displayed) {
        throw std::runtime_error("Invalid settings discarded the last complete mesh");
    }
    exerciseKey(SDLK_R);
    const SurfaceSettings defaults = presetSettings(original.kind);
    if (editingSettings() != defaults || session_.lastGood() != displayed) {
        throw std::runtime_error("Reset must request preset defaults without dropping the last-good mesh");
    }
    request(original);
    if (session_.requested() || session_.publicationCount() != publications) {
        throw std::runtime_error("A cancelled candidate or reset published a stale mesh");
    }
}

inline SDL_Event panelClick(const UiRect& box) {
    SDL_Event event{};
    event.type = SDL_EVENT_MOUSE_BUTTON_DOWN;
    event.button.button = SDL_BUTTON_LEFT;
    event.button.x = box.x + 0.5F * box.width;
    event.button.y = box.y + 0.5F * box.height;
    return event;
}

inline void WorkshopApp::exercisePanelEvents() {
    const Mesh* retained = session_.lastGood();
    if (!panelVisible_ || !retained || session_.requested())
        throw std::runtime_error("Panel check requires a complete mesh");
    const SurfaceSettings original = retained->settings;
    const auto publications = session_.publicationCount();
    const WorkshopLayout layout = currentLayout();
    int presetIndex = 1;
    if (original.kind == SurfaceKind::shell)
        presetIndex = 0;
    handleEvent(panelClick(layout.presets[presetIndex]));
    if (!session_.requested() || session_.requested()->kind != panelPresets[presetIndex] ||
        session_.displayedMesh() != retained) {
        throw std::runtime_error("Preset click relabelled the previous mesh or failed to queue a request");
    }
    advanceMesh();
    if (!session_.showingPreview() || session_.displayedMesh()->settings.kind != panelPresets[presetIndex]) {
        throw std::runtime_error("Preset preview did not reach the renderer");
    }
    handleEvent(panelClick(layout.cancel));
    if (session_.displayedMesh() != retained || session_.requested())
        throw std::runtime_error("Panel cancel did not restore the retained mesh");

    // Assume ownership in this fixture only; no request is made to capture the OS mouse.
    pointerButton_ = SDL_BUTTON_LEFT;
    draggingParameter_ = ParameterId::radius;
    const UiRect& radiusTrack = layout.sliders[0];
    SDL_Event move{};
    move.type = SDL_EVENT_MOUSE_MOTION;
    move.motion.state = SDL_BUTTON_MASK(SDL_BUTTON_LEFT);
    move.motion.x = radiusTrack.x + 0.58F * radiusTrack.width;
    handleEvent(move);
    advanceMesh();
    if (!session_.waitingForRelease() || !session_.showingPreview() || session_.lastGood() != retained ||
        session_.displayedMesh()->settings.radius != session_.requested()->radius) {
        throw std::runtime_error("Held slider did not show the latest preview");
    }
    const double firstRadius = session_.requested()->radius;
    move.motion.x = radiusTrack.x + radiusTrack.width + 40.0F;
    handleEvent(move);
    advanceMesh();
    if (!session_.waitingForRelease() || session_.requested()->radius == firstRadius ||
        session_.requested()->radius != 4.0 || session_.displayedMesh()->settings.radius != 4.0) {
        throw std::runtime_error("Slider motion outside the track must clamp to the endpoint");
    }

    SDL_Event release{};
    release.type = SDL_EVENT_MOUSE_BUTTON_UP;
    release.button.button = SDL_BUTTON_LEFT;
    handleEvent(release);
    advanceMesh();
    if (pointerButton_ || draggingParameter_ || !session_.requested() || session_.waitingForRelease() ||
        session_.completedRows() != maxRowsPerBatch || session_.lastGood() != retained) {
        throw std::runtime_error("Release must refine in bounded batches while keeping last-good");
    }

    pointerButton_ = SDL_BUTTON_LEFT;
    draggingParameter_ = ParameterId::radius;
    move.motion.x = radiusTrack.x + 0.28F * radiusTrack.width;
    handleEvent(move);
    advanceMesh();
    SDL_Event blur{};
    blur.type = SDL_EVENT_WINDOW_FOCUS_LOST;
    handleEvent(blur);
    const auto requested = session_.requested();
    move.motion.x = radiusTrack.x;
    handleEvent(move);
    if (!requested || pointerButton_ || draggingParameter_ || session_.waitingForRelease() ||
        session_.requested() != requested) {
        throw std::runtime_error("Focus loss must release the slider and ignore late motion");
    }

    request(original);
    if (session_.requested() || session_.displayedMesh() != retained || session_.publicationCount() != publications) {
        throw std::runtime_error("Discarded slider work replaced the retained mesh");
    }
    const bool wireframe = view_.wireframe;
    handleEvent(panelClick(layout.display[0]));
    if (view_.wireframe == wireframe || session_.requested()) {
        throw std::runtime_error("Display click must not queue geometry");
    }
    handleEvent(panelClick(layout.display[0]));
}

} // namespace geometry
#endif
