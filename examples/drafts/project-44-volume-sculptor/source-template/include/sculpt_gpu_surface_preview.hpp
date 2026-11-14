#pragma once

#include "sculpt_gpu_emit_verify.hpp"
#include "sculpt_gpu_surface_overlay.hpp"
#include "sculpt_guides.hpp"
#include "sculpt_renderer.hpp"
#include "sculpt_scene_tasks.hpp"
#include "sculpt_window.hpp"
#if LAB_CHECKPOINT >= 9
#include "sculpt_chunk_inspector.hpp"
#include "sculpt_gpu_job_verify.hpp"
#endif
#include <charconv>

namespace sculpt {

struct GpuSurfaceOptions {
    ModelSettings settings;
    int seconds{};
    bool hidden{}, verify{}, verifyEdits{}, verifyNormals{}, plane{}, wireframe{}, normalView{};
#if LAB_CHECKPOINT >= 9
    bool verifyJobs{};
#endif
    std::filesystem::path capture;
};

inline GpuSurfaceOptions gpuSurfaceOptions(int argc, char** argv) {
    GpuSurfaceOptions options;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing GPU-surface preview option value");
            return argv[++index];
        };
        if (option == "--hidden")
            options.hidden = true;
        else if (option == "--verify")
            options.verify = true;
        else if (option == "--verify-edits")
            options.verifyEdits = true;
        else if (option == "--verify-normals")
            options.verifyNormals = true;
#if LAB_CHECKPOINT >= 9
        else if (option == "--verify-jobs")
            options.verifyJobs = true;
#endif
        else if (option == "--plane")
            options.plane = true;
        else if (option == "--wire")
            options.wireframe = true;
        else if (option == "--normal-view")
            options.normalView = true;
        else if (option == "--capture")
            options.capture = pathFromUtf8(next());
        else if (option == "--grid" || option == "--seconds") {
            const auto text = next();
            int value{};
            const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
            if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size())
                throw std::invalid_argument("GPU-surface preview integer is not exact");
            if (option == "--grid")
                options.settings.grid.samples = value;
            else {
                if (value < 1 || value > 120)
                    throw std::invalid_argument("GPU-surface preview duration must be 1..120 seconds");
                options.seconds = value;
            }
        } else
            throw std::invalid_argument("Unknown GPU-surface preview option");
    }
    options.settings.validate();
    if (options.plane && !options.verify)
        throw std::invalid_argument("The plane is an analytic verification fixture");
    if (options.verifyEdits && (options.verify || options.plane || !options.capture.empty()))
        throw std::invalid_argument("Emit/edit fixtures run separately from analytic verification and capture");
    if (options.verifyNormals && (options.verify || options.verifyEdits || options.plane || !options.capture.empty()))
        throw std::invalid_argument("Critical-normal fixture runs separately at its fixed binary-spaced 32 grid");
    bool finiteFixture = options.verify || options.verifyEdits || options.verifyNormals;
#if LAB_CHECKPOINT >= 9
    if (options.verifyJobs && (finiteFixture || options.plane || !options.capture.empty()))
        throw std::invalid_argument("Mesh job fixture runs separately from other verifiers and capture");
    finiteFixture = finiteFixture || options.verifyJobs;
#endif
    if (options.hidden && !finiteFixture && options.seconds == 0 && options.capture.empty())
        throw std::invalid_argument("A hidden GPU-surface preview needs a finite end condition");
    return options;
}

inline int runGpuSurfacePreview(int argc, char** argv) {
    const auto options = gpuSurfaceOptions(argc, argv);
    NativeWindow window(options.hidden);
    GlApi gl;
    gl.loadAll();
    preflightSculpt(gl, options.settings);
    SDL_GL_SetSwapInterval(0);
    GpuBudget budget;
    if (options.verifyNormals) {
        verifyCriticalGpuNormals(gl, budget);
        return 0;
    }
    // snippet:sculpt-gpu-surface-wiring
    auto current = std::make_unique<GpuMeshBuilder>(gl, budget, options.settings, options.plane);
    MeshRenderer renderer(gl);
    Camera camera;
    SculptControls controls(gl, budget);
    // end-snippet:sculpt-gpu-surface-wiring
    GuideRenderer guides(gl);
    OverlayRenderer ui(gl);
    NativeSceneTasks scenes(gl, budget);
    if (options.verifyEdits) {
#if LAB_CHECKPOINT >= 9
        verifyGpuEditing(*current, budget, gl);
#else
        verifyGpuEmitLesson(*current, budget);
#endif
        return 0;
    }
#if LAB_CHECKPOINT >= 9
    if (options.verifyJobs) {
        verifyGpuMeshJobs(*current, budget);
        return 0;
    }
    ChunkInspection inspection;
#endif
    bool running = true, compact = false, verified = false, captured = false;
    bool wireframe = options.wireframe, normalView = options.normalView;
    std::string reportedError;
    const auto begin = std::chrono::steady_clock::now();
    auto nextFrame = begin;
#if LAB_CHECKPOINT >= 9
    std::cout << "P44 CHECKPOINT 09 / DIRTY CHUNKS / GENERATION AND LAST-GOOD\n";
#else
    std::cout << "P44 CHECKPOINT 08 / GPU EMIT / FULL VOLUME REBUILD / NO DIRTY REUSE\n";
#endif
    std::cout << "GPU=" << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << '\n';
    while (running) {
        const auto now = std::chrono::steady_clock::now();
        const auto elapsed = std::chrono::duration<double>(now - begin).count();
        if ((options.seconds > 0 && elapsed >= options.seconds) || (options.hidden && elapsed >= 60))
            break;
        if (auto replacement = scenes.takeModel()) {
            controls.cancel(*current);
            current = std::move(replacement);
            camera = {};
            controls.cameraChanged();
#if LAB_CHECKPOINT >= 9
            inspection = {};
#endif
        }
        auto& model = *current;
        int logicalWidth{}, logicalHeight{};
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
        int panelWidth = nativePanelWidth;
        if (compact)
            panelWidth = 48;
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (!options.hidden)
                controls.event(event, model, camera, logicalWidth - panelWidth, logicalHeight);
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN)
                scenes.pause(true);
            if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat)
                continue;
            const auto key = event.key.key;
            if (key == SDLK_Q)
                running = false;
            if (key == SDLK_F11)
                wireframe = !wireframe;
            if (key == SDLK_F12)
                normalView = !normalView;
#if LAB_CHECKPOINT >= 9
            // snippet:sculpt-dirty-preview-keys
            if (key == SDLK_F5 && !scenes.busy()) {
                controls.cancel(model);
                model.requestIsovalue(model.settings().isovalue);
            }
            if (key == SDLK_I)
                inspection.enabled = !inspection.enabled;
            if (key == SDLK_F6 && !model.workChunks().empty()) {
                inspection.enabled = true;
                inspection.selected = (inspection.selected + 1) % model.workChunks().size();
            }
            // end-snippet:sculpt-dirty-preview-keys
#endif
            if (key == SDLK_F10) {
                controls.cancel(model);
                compact = !compact;
                panelWidth = nativePanelWidth;
                if (compact)
                    panelWidth = 48;
                controls.cameraChanged();
            }
            if (key == SDLK_HOME) {
                controls.cancel(model);
                camera = {};
                controls.cameraChanged();
            }
            if (key == SDLK_R) {
                controls.cancel(model);
                scenes.reset(model, Shape::sphere);
            }
            if (key == SDLK_SPACE) {
                controls.cancel(model);
                if (scenes.busy())
                    scenes.pause(!scenes.paused());
                else
                    model.pause(!model.paused());
            }
            if (key == SDLK_C) {
                controls.cancel(model);
                if (scenes.busy())
                    scenes.cancel();
                else
                    model.cancel();
            }
            if (key == SDLK_RETURN && !scenes.busy()) {
                controls.cancel(model);
                model.resumeLastGood();
            }
        }
        if (!running)
            break;
        // snippet:sculpt-gpu-surface-tick
        model.tick();
        controls.tick(model, camera, logicalWidth - panelWidth, logicalHeight);
        // end-snippet:sculpt-gpu-surface-tick
        scenes.tick(model);
        if (scenes.takeRetained())
            model.resumeLastGood();
        if (model.state() == MeshJobState::failed && model.error() != reportedError) {
            reportedError = model.error();
            std::cerr << "GPU surface / LAST-GOOD KEPT: " << reportedError << '\n';
        }
        if (model.state() == MeshJobState::failed && (options.verify || !options.capture.empty()))
            throw std::runtime_error(model.error());
        const bool outputReady = model.ready() && (options.verify || !options.capture.empty());
        if (options.verify && outputReady && !verified) {
            verifyGpuShape(model, options.plane);
            if (!options.plane && model.settings().grid.samples <= 64)
                verifyGpuLayout(model);
            verified = true;
        }
        if (now >= nextFrame || outputReady) {
            int width{}, height{};
            SDL_GetWindowSizeInPixels(window.get(), &width, &height);
            if (width > 0 && height > 0 && logicalWidth > panelWidth && logicalHeight > 0) {
                const int sceneWidth = static_cast<int>(static_cast<double>(width) * (logicalWidth - panelWidth) / logicalWidth);
                gl.Viewport(0, 0, width, height);
                gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
                gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
                // snippet:sculpt-gpu-surface-draw
                renderer.draw(model.active(), camera, 0, 0, sceneWidth, height, wireframe, normalView);
                // end-snippet:sculpt-gpu-surface-draw
#if LAB_CHECKPOINT >= 9
                const auto selectedChunk = inspection.chunk(model.workChunks());
                std::array<LineVertex, 24> lines{};
                std::span<const LineVertex> extra;
                if (selectedChunk) {
                    lines = chunkBoxLines(model.settings().grid, *selectedChunk);
                    extra = lines;
                }
                guides.draw(camera, sceneWidth, height, controls.previewBrush(camera), model.settings().grid, SliceState{}, extra);
#else
                guides.draw(camera, sceneWidth, height, controls.previewBrush(camera), model.settings().grid, SliceState{});
#endif
                Overlay overlay;
                overlay.reset(logicalWidth, logicalHeight);
#if LAB_CHECKPOINT >= 9
                gpuSurfaceOverlay(overlay, model, budget, controls, logicalWidth, logicalHeight, compact, scenes.status(), selectedChunk);
#else
                gpuSurfaceOverlay(overlay, model, budget, controls, logicalWidth, logicalHeight, compact, scenes.status());
#endif
                ui.draw(overlay, width, height);
                if (outputReady && !options.capture.empty()) {
                    captureFrame(gl, width, height, options.capture);
                    captured = true;
                }
                SDL_GL_SwapWindow(window.get());
            }
            nextFrame = now + std::chrono::milliseconds(16);
        }
        if (outputReady && (options.capture.empty() || captured))
            break;
        SDL_Delay(1);
    }
    controls.cancel(*current);
    if ((options.verify && !verified) || (!options.capture.empty() && !captured))
        throw std::runtime_error("Finite surface preview ended before verification/capture completed");
    return 0;
}

} // namespace sculpt
