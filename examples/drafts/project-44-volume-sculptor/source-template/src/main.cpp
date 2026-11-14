#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif

#if LAB_CHECKPOINT <= 1
#include "sculpt_tetra_preview.hpp"

int main(int argc, char** argv) {
    try {
        return sculpt::runTetraPreview(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "Tetra preview: " << error.what() << '\n';
        return 1;
    }
}
#elif LAB_CHECKPOINT <= 5
#include "sculpt_cpu_preview.hpp"

// snippet:sculpt-cpu-entry
int main(int argc, char** argv) {
    try {
        return sculpt::runCpuPreview(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "CPU preview: " << error.what() << '\n';
        return 1;
    }
}

// end-snippet:sculpt-cpu-entry
#elif LAB_CHECKPOINT <= 7
#include "sculpt_gpu_field_preview.hpp"

// snippet:sculpt-gpu-field-entry
int main(int argc, char** argv) {
    try {
        return sculpt::runGpuFieldPreview(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "GPU field preview: " << error.what() << '\n';
        return 1;
    }
}

// end-snippet:sculpt-gpu-field-entry
#elif LAB_CHECKPOINT <= 9
#include "sculpt_gpu_surface_preview.hpp"

// snippet:sculpt-gpu-surface-entry
int main(int argc, char** argv) {
    try {
        return sculpt::runGpuSurfacePreview(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "GPU surface preview: " << error.what() << '\n';
        return 1;
    }
}

// end-snippet:sculpt-gpu-surface-entry
#else
#include "sculpt_chunk_inspector.hpp"
#include "sculpt_controls.hpp"
#include "sculpt_editor_keys.hpp"
#include "sculpt_editor_options.hpp"
#if LAB_CHECKPOINT >= 11
#include "sculpt_file_tasks.hpp"
#include "sculpt_gpu_file_verify.hpp"
#endif
#include "sculpt_frame_timer.hpp"
#include "sculpt_gpu_edit_verify.hpp"
#include "sculpt_gpu_layout_verify.hpp"
#include "sculpt_gpu_product_verify.hpp"
#include "sculpt_gpu_scene_verify.hpp"
#include "sculpt_gpu_slice_verify.hpp"
#include "sculpt_gpu_verify.hpp"
#include "sculpt_guides.hpp"
#include "sculpt_panel.hpp"
#include "sculpt_renderer.hpp"
#include "sculpt_scene_tasks.hpp"
#include "sculpt_slice_inspector.hpp"
#include "sculpt_window.hpp"

namespace {
using namespace sculpt;

int run(const EditorOptions& options) {
    ModelSettings settings;
    settings.grid.samples = options.samples;
    settings.validate();
    NativeWindow window(options.hidden);
#if LAB_CHECKPOINT == 10
    SDL_SetWindowTitle(window.get(), "Project 44 - Volume Sculptor / Checkpoint 10");
#endif
    GlApi gl;
    gl.loadAll();
    preflightSculpt(gl, settings);
    SDL_GL_SetSwapInterval(0);
    GpuBudget budget;
    auto current = std::make_unique<GpuMeshBuilder>(gl, budget, settings, options.plane);
    MeshRenderer renderer(gl);
    OverlayRenderer ui(gl);
    Camera camera;
    if (options.verifyEdits) {
        verifyGpuEditing(*current, budget, gl);
        return 0;
    }
#if LAB_CHECKPOINT >= 11
    if (options.verifyFiles) {
        verifyGpuFiles(*current, gl, budget);
        return 0;
    }
#endif
    if (options.verifyScene) {
        verifyGpuSceneChanges(*current, gl, budget);
        return 0;
    }
    if (options.verifyProducts) {
        verifyGpuProducts(*current, gl, budget);
        return 0;
    }
    SculptControls controls(gl, budget, options.startingBrush, options.brushDepth);
    GuideRenderer guides(gl);
#if LAB_CHECKPOINT >= 11
    NativeFileTasks files(gl, budget);
#endif
    NativeSceneTasks scenes(gl, budget);
    NativePanel panel;
    // snippet:sculpt-editor-slice-setup
    SliceInspector slice;
    slice.enabled(options.showSlice);
    SliceRenderer sliceRenderer(gl);
    // end-snippet:sculpt-editor-slice-setup
    FrameTimer timer(gl);
    ChunkInspection inspection;
    std::uint64_t sceneEpoch = 1;
    std::string actionNotice;
#if LAB_CHECKPOINT >= 11
    if (!options.load.empty()) {
        if (!files.load(options.load))
            throw std::runtime_error(files.status());
        current->cancel();
    }
#endif
    bool running = true, wireframe = false, normals = false, reportedFailure = false;
    float requestedIso = 0;
    bool verified = false, verifiedSlice = false, captured = false, initialLoadComplete = options.load.empty();
    const auto begin = std::chrono::steady_clock::now();
    auto nextFrame = begin;
    std::cout << "P44 DRAFT native tool; course/checkpoints, Canvas and final acceptance remain pending\nGPU=" << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << " GL=" << reinterpret_cast<const char*>(gl.GetString(GL_VERSION)) << '\n';
    const auto draw = [&]() {
        int width{}, height{}, logicalWidth{}, logicalHeight{};
        SDL_GetWindowSizeInPixels(window.get(), &width, &height);
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
        if (width <= 0 || height <= 0 || logicalWidth <= panel.width() || logicalHeight <= 0)
            return;
        timer.begin();
        gl.Viewport(0, 0, width, height);
        gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        const int sceneWidth = static_cast<int>(static_cast<double>(width) * (logicalWidth - panel.width()) / logicalWidth);
        renderer.draw(current->active(), camera, 0, 0, sceneWidth, height, wireframe, normals);
        const auto selectedChunk = inspection.chunk(current->workChunks());
        std::array<LineVertex, 24> lines{};
        std::span<const LineVertex> extra;
        if (selectedChunk) {
            lines = chunkBoxLines(current->settings().grid, *selectedChunk);
            extra = lines;
        }
        guides.draw(camera, sceneWidth, height, controls.previewBrush(camera), current->settings().grid, slice.state(), extra);
        sliceRenderer.draw(*current, slice, width, height, logicalWidth, logicalHeight);
        Overlay overlay;
        overlay.reset(logicalWidth, logicalHeight);
#if LAB_CHECKPOINT >= 11
        const PanelData data{*current, budget, controls, files, scenes, timer, sceneEpoch, requestedIso, actionNotice};
#else
        const PanelData data{*current, budget, controls, scenes, timer, sceneEpoch, requestedIso, actionNotice};
#endif
        panel.draw(overlay, data, logicalWidth, logicalHeight);
        slice.overlay(overlay, *current);
        ui.draw(overlay, width, height);
        timer.end(sceneEpoch, current->activeGeneration());
    };
    while (running) {
#if LAB_CHECKPOINT >= 11
        if (auto loaded = files.takeLoaded()) {
            panel.cancel();
            controls.cancel(*current);
            current = std::move(loaded);
            initialLoadComplete = true;
            requestedIso = current->settings().isovalue;
            camera.centerOn(current->settings().grid.origin + Vec3{1, 1, 1} * (current->settings().grid.extent * 0.5F));
            controls.cameraChanged();
            slice.modelChanged();
            inspection = {};
            ++sceneEpoch;
        }
#endif
        // snippet:sculpt-editor-grid-handoff
        if (auto replacement = scenes.takeModel()) {
            panel.cancel();
            controls.cancel(*current);
            slice.modelChanged();
            inspection = {};
            current = std::move(replacement);
            requestedIso = current->settings().isovalue;
            if (scenes.resetsCamera()) {
                camera = {};
                camera.centerOn(current->settings().grid.origin + Vec3{1, 1, 1} * (current->settings().grid.extent * 0.5F));
                if (current->settings().shape == Shape::separatedSpheres)
                    camera.yaw = 1.57079632679F;
            }
            controls.cameraChanged();
            ++sceneEpoch;
        }
        // end-snippet:sculpt-editor-grid-handoff
        auto& model = *current;
        const auto now = std::chrono::steady_clock::now();
        const auto elapsed = std::chrono::duration<double>(now - begin).count();
        if ((options.seconds > 0 && elapsed >= options.seconds) || (options.hidden && elapsed > 90))
            break;
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (options.traceInput && (event.type == SDL_EVENT_KEY_DOWN || event.type == SDL_EVENT_KEY_UP))
                std::cout << "INPUT type=" << event.type << " key=" << event.key.key << " scan=" << event.key.scancode << " modifiers=" << event.key.mod << " repeat=" << event.key.repeat << '\n';
            int logicalWidth{}, logicalHeight{};
            SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
            panel.layout(logicalWidth, logicalHeight);
            slice.layout(model.settings().grid, logicalWidth - panel.width(), logicalHeight);
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED)
                scenes.pause(true);
            if (!options.hidden) {
                const bool panelEvent = panel.event(event, controls.pointerCaptured() || slice.captured());
                if (const auto adjustment = panel.takeAdjustment())
                    controls.adjust(adjustment->parameter, adjustment->increase, adjustment->coarse);
                if (!panelEvent) {
                    // snippet:sculpt-editor-slice-routing
                    const bool sliceEvent = slice.event(event, controls.pointerCaptured());
                    if (!sliceEvent)
                        controls.event(event, model, camera, logicalWidth - panel.width(), logicalHeight);
                    // end-snippet:sculpt-editor-slice-routing
                }
            }
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_Q)
                    running = false;
                if (key == SDLK_W || key == SDLK_F11)
                    wireframe = !wireframe;
                if (key == SDLK_N || key == SDLK_F12)
                    normals = !normals;
                if (key == SDLK_I)
                    inspection.enabled = !inspection.enabled;
                if (key == SDLK_F6 && !model.workChunks().empty()) {
                    inspection.enabled = true;
                    inspection.selected = (inspection.selected + 1) % model.workChunks().size();
                }
                if (key == SDLK_HOME) {
                    panel.cancel();
                    controls.cancel(model);
                    slice.cancel();
                    camera = {};
                    camera.centerOn(model.settings().grid.origin + Vec3{1, 1, 1} * (model.settings().grid.extent * 0.5F));
                    controls.cameraChanged();
                }
                if (key == SDLK_SPACE) {
                    panel.cancel();
                    controls.cancel(model);
                    if (scenes.busy())
                        scenes.pause(!scenes.paused());
                    else
                        model.pause(!model.paused());
                }
                if (key == SDLK_C) {
                    panel.cancel();
                    controls.cancel(model);
                    slice.cancel();
                    if (scenes.busy())
                        scenes.cancel();
#if LAB_CHECKPOINT >= 11
                    else if (files.busy())
                        files.cancel();
#endif
                    else
                        model.cancel();
                }
#if LAB_CHECKPOINT >= 11
                if ((key == SDLK_S || key == SDLK_E || key == SDLK_O) && scenes.busy()) {
                    actionNotice = "WAIT OR CANCEL GRID CHANGE FIRST";
                    continue;
                }
                if (key == SDLK_S)
                    files.save(model);
                if (key == SDLK_E)
                    files.exportMesh(model);
                if (key == SDLK_O && files.load(files.lastSaved())) {
                    panel.cancel();
                    controls.cancel(model);
                    slice.cancel();
                    model.cancel();
                }
#endif
                int digit = 0;
                if (key >= SDLK_1 && key <= SDLK_4)
                    digit = static_cast<int>(key - SDLK_0);
                const auto selection = editorDigitAction(digit, (event.key.mod & SDL_KMOD_CTRL) != 0);
                if (key == SDLK_R || selection.preset || selection.samples) {
#if LAB_CHECKPOINT >= 11
                    if (files.busy()) {
                        actionNotice = "FINISH OR CANCEL THE FILE JOB FIRST";
                        continue;
                    }
#endif
                    bool accepted = false;
                    if (!selection.samples) {
                        Shape shape = scenes.selectedShape(model);
                        if (selection.preset)
                            shape = *selection.preset;
                        accepted = scenes.reset(model, shape);
                        if (accepted)
                            requestedIso = 0;
                    } else {
                        accepted = scenes.resolution(model, *selection.samples, requestedIso);
                    }
                    if (accepted) {
                        panel.cancel();
                        controls.cancel(model);
                        slice.modelChanged();
                        actionNotice.clear();
                    }
                }
                // snippet:sculpt-editor-isovalue
                if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    if (scenes.busy()) {
                        actionNotice = "WAIT OR CANCEL GRID CHANGE FIRST";
                        continue;
                    }
                    controls.cancel(model);
                    float change = 0.025F;
                    if (key == SDLK_LEFT)
                        change = -change;
                    requestedIso = std::clamp(requestedIso + change, -0.25F, 0.25F);
                    model.requestIsovalue(requestedIso);
                }
                // end-snippet:sculpt-editor-isovalue
                if (key == SDLK_RETURN || key == SDLK_F5) {
                    if (scenes.busy()) {
                        actionNotice = "GRID CHANGE ALREADY RUNNING";
                        continue;
                    }
                    controls.cancel(model);
                    model.requestIsovalue(requestedIso);
                }
            }
        }
        if (!running)
            break;
        model.tick();
        scenes.tick(model);
        if (scenes.takeRetained())
            model.resumeLastGood();
#if LAB_CHECKPOINT >= 11
        files.tick();
        if (files.takeRetainedLoad()) {
            if (!initialLoadComplete && options.hidden)
                throw std::runtime_error(files.status());
            model.resumeLastGood();
        }
#endif
        if (model.state() == MeshJobState::failed && !reportedFailure) {
            controls.cancel(model);
            reportedFailure = true;
        } else if (model.state() != MeshJobState::failed)
            reportedFailure = false;
        if (model.state() == MeshJobState::failed && (options.verify || options.verifySlice || !options.capture.empty()))
            throw std::runtime_error(model.error());
        int logicalWidth{}, logicalHeight{};
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
        panel.layout(logicalWidth, logicalHeight);
        slice.layout(model.settings().grid, logicalWidth - panel.width(), logicalHeight);
        slice.update(model);
        controls.suspendHover(slice.pointerInside() || slice.captured() || panel.pointerInside() || panel.captured());
        controls.tick(model, camera, logicalWidth - panel.width(), logicalHeight);
        if (now >= nextFrame) {
            draw();
            SDL_GL_SwapWindow(window.get());
            nextFrame = now + std::chrono::milliseconds(16);
        }
        if (initialLoadComplete && model.ready() && (options.verify || options.verifySlice || !options.capture.empty())) {
            if (options.verify) {
                verifyGpuShape(model, options.plane);
                if (!options.plane && model.settings().grid.samples <= 64)
                    verifyGpuLayout(model);
                verified = true;
            }
            if (options.verifySlice) {
                verifySliceProbes(model, options.plane);
                int width{}, height{};
                SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
                verifySlicePixels(model, slice, sliceRenderer, gl, width, height, logicalWidth, logicalHeight);
                verifySliceCacheLifecycle(model, slice);
                verifiedSlice = true;
            }
            if (!options.capture.empty()) {
                draw();
                int width{}, height{};
                SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                captureFrame(gl, width, height, options.capture);
                captured = true;
            }
            break;
        }
        SDL_Delay(1);
    }
    controls.cancel(*current);
    panel.cancel();
    slice.cancel();
    if ((options.verify && !verified) || (options.verifySlice && !verifiedSlice) || (!options.capture.empty() && !captured) || (options.hidden && !initialLoadComplete))
        throw std::runtime_error("Finite run stopped before the requested verification/capture completed");
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    try {
        return run(parseEditorOptions(argc, argv));
    } catch (const std::exception& error) {
        std::cerr << "Volume Sculptor: " << error.what() << '\n';
        return 1;
    }
}
#endif
