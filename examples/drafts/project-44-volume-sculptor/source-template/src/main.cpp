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
#else
#include "sculpt_controls.hpp"
#include "sculpt_file_tasks.hpp"
#include "sculpt_frame_timer.hpp"
#include "sculpt_gpu_edit_verify.hpp"
#include "sculpt_gpu_file_verify.hpp"
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
#include <charconv>

namespace {
using namespace sculpt;

struct Options {
    int samples{128};
    int seconds{};
    bool hidden{}, verify{}, verifyEdits{}, verifyFiles{}, verifySlice{}, verifyScene{}, verifyProducts{}, plane{}, showSlice{}, traceInput{};
    std::filesystem::path capture, load;
    Brush startingBrush;
    float brushDepth{};
};

int integer(std::string_view text, int minimum, int maximum) {
    int result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid integer option");
    return result;
}

float realOption(std::string_view text, float minimum, float maximum) {
    float result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || !std::isfinite(result) || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid finite numeric option");
    return result;
}

Options parse(int argc, char** argv) {
    Options result;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing option value");
            return argv[++index];
        };
        if (option == "--grid")
            result.samples = integer(next(), 32, 192);
        else if (option == "--seconds")
            result.seconds = integer(next(), 1, 120);
        else if (option == "--hidden")
            result.hidden = true;
        else if (option == "--verify")
            result.verify = true;
        else if (option == "--verify-edits")
            result.verifyEdits = true;
        else if (option == "--verify-files")
            result.verifyFiles = true;
        else if (option == "--verify-slice") {
            result.verifySlice = true;
            result.showSlice = true;
        } else if (option == "--verify-scene")
            result.verifyScene = true;
        else if (option == "--verify-products")
            result.verifyProducts = true;
        else if (option == "--trace-input")
            result.traceInput = true;
        else if (option == "--radius")
            result.startingBrush.radius = realOption(next(), 0.03F, 0.6F);
        else if (option == "--strength")
            result.startingBrush.strength = realOption(next(), 0.01F, 0.8F);
        else if (option == "--depth")
            result.brushDepth = realOption(next(), -1, 1);
        else if (option == "--subtract")
            result.startingBrush.mode = BrushMode::subtract;
        else if (option == "--plane")
            result.plane = true;
        else if (option == "--show-slice")
            result.showSlice = true;
        else if (option == "--capture")
            result.capture = pathFromUtf8(next());
        else if (option == "--load")
            result.load = pathFromUtf8(next());
        else
            throw std::invalid_argument("Unknown sculpt option");
    }
    if (result.verifyEdits && result.plane)
        throw std::invalid_argument("Editing fixtures require the sphere field preset");
    if (result.verifyFiles && (result.plane || result.verifyEdits))
        throw std::invalid_argument("File fixtures require their own unedited sphere preset");
    if ((result.verifyEdits || result.verifyFiles) && (result.verify || result.verifySlice))
        throw std::invalid_argument("Editing/file fixtures run separately from analytic/slice fixtures");
    if (result.verifyScene && (result.samples != 128 || result.plane || result.verify || result.verifySlice || result.verifyEdits || result.verifyFiles))
        throw std::invalid_argument("Scene lifecycle fixture starts at 128 samples and runs separately");
    if (result.verifyProducts && (result.plane || result.verify || result.verifySlice || result.verifyEdits || result.verifyFiles || result.verifyScene))
        throw std::invalid_argument("Brush product fixtures require their own sphere preset and run separately");
    if (!result.load.empty() && (result.plane || result.verify || result.verifyEdits || result.verifyFiles || result.verifySlice || result.verifyScene || result.verifyProducts))
        throw std::invalid_argument("Analytic field fixtures cannot validate an arbitrary loaded field");
    if (result.hidden && !result.verify && !result.verifyEdits && !result.verifyFiles && !result.verifySlice && !result.verifyScene && !result.verifyProducts && result.capture.empty() && result.seconds == 0)
        throw std::invalid_argument("Hidden run needs a finite verify/capture/seconds condition");
    return result;
}

int run(const Options& options) {
    ModelSettings settings;
    settings.grid.samples = options.samples;
    settings.validate();
    NativeWindow window(options.hidden);
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
    if (options.verifyFiles) {
        verifyGpuFiles(*current, gl, budget);
        return 0;
    }
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
    NativeFileTasks files(gl, budget);
    NativeSceneTasks scenes(gl, budget);
    NativePanel panel;
    SliceInspector slice;
    slice.enabled(options.showSlice);
    SliceRenderer sliceRenderer(gl);
    FrameTimer timer(gl);
    std::uint64_t sceneEpoch = 1;
    std::string actionNotice;
    if (!options.load.empty()) {
        if (!files.load(options.load))
            throw std::runtime_error(files.status());
        current->cancel();
    }
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
        guides.draw(camera, sceneWidth, height, controls.previewBrush(camera), current->settings().grid, slice.state());
        sliceRenderer.draw(*current, slice, width, height, logicalWidth, logicalHeight);
        Overlay overlay;
        overlay.reset(logicalWidth, logicalHeight);
        const PanelData data{*current, budget, controls, files, scenes, timer, sceneEpoch, requestedIso, actionNotice};
        panel.draw(overlay, data, logicalWidth, logicalHeight);
        slice.overlay(overlay, *current);
        ui.draw(overlay, width, height);
        timer.end(sceneEpoch, current->activeGeneration());
    };
    while (running) {
        if (auto loaded = files.takeLoaded()) {
            panel.cancel();
            controls.cancel(*current);
            current = std::move(loaded);
            initialLoadComplete = true;
            requestedIso = current->settings().isovalue;
            camera.centerOn(current->settings().grid.origin + Vec3{1, 1, 1} * (current->settings().grid.extent * 0.5F));
            controls.cameraChanged();
            slice.modelChanged();
            ++sceneEpoch;
        }
        if (auto replacement = scenes.takeModel()) {
            panel.cancel();
            controls.cancel(*current);
            slice.modelChanged();
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
            if (!options.hidden) {
                const bool panelEvent = panel.event(event, controls.pointerCaptured() || slice.captured());
                if (const auto adjustment = panel.takeAdjustment())
                    controls.adjust(adjustment->parameter, adjustment->increase, adjustment->coarse);
                if (!panelEvent) {
                    const bool sliceEvent = slice.event(event, controls.pointerCaptured());
                    if (!sliceEvent)
                        controls.event(event, model, camera, logicalWidth - panel.width(), logicalHeight);
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
                    else if (files.busy())
                        files.cancel();
                    else
                        model.cancel();
                }
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
                if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3 || key == SDLK_F5 || key == SDLK_F6 || key == SDLK_F7 || key == SDLK_F8) {
                    if (files.busy()) {
                        actionNotice = "FINISH OR CANCEL THE FILE JOB FIRST";
                        continue;
                    }
                    bool accepted = false;
                    if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3) {
                        Shape shape = scenes.selectedShape(model);
                        if (key == SDLK_1)
                            shape = Shape::sphere;
                        if (key == SDLK_2)
                            shape = Shape::separatedSpheres;
                        if (key == SDLK_3)
                            shape = Shape::torus;
                        accepted = scenes.reset(model, shape);
                        if (accepted)
                            requestedIso = 0;
                    } else {
                        int samples = 32;
                        if (key == SDLK_F6)
                            samples = 64;
                        if (key == SDLK_F7)
                            samples = 128;
                        if (key == SDLK_F8)
                            samples = 192;
                        accepted = scenes.resolution(model, samples, requestedIso);
                    }
                    if (accepted) {
                        panel.cancel();
                        controls.cancel(model);
                        slice.modelChanged();
                        actionNotice.clear();
                    }
                }
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
                if (key == SDLK_RETURN) {
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
        files.tick();
        if (files.takeRetainedLoad()) {
            if (!initialLoadComplete && options.hidden)
                throw std::runtime_error(files.status());
            model.resumeLastGood();
        }
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
        return run(parse(argc, argv));
    } catch (const std::exception& error) {
        std::cerr << "Volume Sculptor: " << error.what() << '\n';
        return 1;
    }
}
#endif
