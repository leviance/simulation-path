#pragma once

#include "sculpt_gpu_field_controls.hpp"
#include "sculpt_gpu_field_overlay.hpp"
#include "sculpt_gpu_field_verify.hpp"
#if LAB_CHECKPOINT == 7
#include "sculpt_gpu_count_overlay.hpp"
#include "sculpt_gpu_count_verify.hpp"
#include "sculpt_gpu_scan_verify.hpp"
#endif
#include "sculpt_renderer.hpp"
#include "sculpt_window.hpp"
#include <charconv>

namespace sculpt {

struct GpuFieldPreviewOptions {
    ModelSettings settings;
    Brush brush;
    int seconds{};
    bool hidden{}, verify{}, plane{}, customBrush{};
    std::filesystem::path capture;
};

inline GpuFieldPreviewOptions gpuFieldPreviewOptions(int argc, char** argv) {
    GpuFieldPreviewOptions options;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing GPU-field preview option value");
            return argv[++index];
        };
        if (option == "--hidden")
            options.hidden = true;
        else if (option == "--verify")
            options.verify = true;
        else if (option == "--plane")
            options.plane = true;
        else if (option == "--capture")
            options.capture = pathFromUtf8(next());
        else if (option == "--grid" || option == "--seconds") {
            const auto text = next();
            int value{};
            const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
            if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size())
                throw std::invalid_argument("GPU-field preview integer is not exact");
            if (option == "--grid")
                options.settings.grid.samples = value;
            else {
                if (value < 1 || value > 120)
                    throw std::invalid_argument("GPU-field preview duration must be 1..120 seconds");
                options.seconds = value;
            }
        } else if (option == "--radius" || option == "--strength") {
            const auto text = next();
            float value{};
            const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
            if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || !std::isfinite(value))
                throw std::invalid_argument("GPU-field brush parameter must be finite");
            if (option == "--radius")
                options.brush.radius = value;
            else
                options.brush.strength = value;
            options.customBrush = true;
        } else if (option == "--subtract") {
            options.brush.mode = BrushMode::subtract;
            options.customBrush = true;
        } else
            throw std::invalid_argument("Unknown GPU-field preview option");
    }
    options.settings.validate();
    options.brush.validate();
    if (options.plane && !options.verify)
        throw std::invalid_argument("The plane is a verification fixture, not an interactive sculpting preset");
    if (options.verify && options.customBrush)
        throw std::invalid_argument("The verifier owns its fixed brush; UI brush options run separately");
    if (options.hidden && !options.verify && options.seconds == 0 && options.capture.empty())
        throw std::invalid_argument("A hidden GPU-field preview needs a finite end condition");
    return options;
}

inline void gpuFieldPreviewOverlay(Overlay& overlay, const GpuFieldDocument& document, const ModelSettings& settings, const GpuBudget& budget, const GpuFieldLessonControls& controls, std::optional<float> value, std::uint32_t probeRevision, int width, int height) {
    const Vec3 text{0.7F, 0.84F, 0.9F};
    const float left = static_cast<float>(width - 348);
    overlay.rect({left, 0, 348, static_cast<float>(height)}, {0.028F, 0.045F, 0.065F});
    float y = 20;
    const auto row = [&](const std::string& label) {
        overlay.text(left + 14, y, label, text, 1.6F, 320);
        y += 22;
    };
    row("PROJECT 44 / CHECKPOINT 06");
    std::string state = "FIELD READY / NO MESH";
    if (!document.hasCompleteField())
        state = "INITIALIZING GPU FIELD";
    else if (document.strokeOpen())
        state = "EDITING / PARTIAL PREVIEW";
    if (controls.paused())
        state = "PAUSED / ROLLBACK STILL POLLED";
    row(state);
    row("N " + std::to_string(settings.grid.samples));
    row("SAMPLES " + std::to_string(settings.grid.sampleCount()));
    row("CELLS " + std::to_string(settings.grid.cellCount()));
    row("ACTIVE CELLS NOT COUNTED");
    row("FIELD BYTES " + std::to_string(settings.grid.sampleCount() * sizeof(float)));
    row("TRACKED SSBO BYTES " + std::to_string(budget.used));
    row("FIELD REV " + std::to_string(document.revision()));
    row("UNDO " + std::to_string(document.undoCount()) + " / REDO " + std::to_string(document.redoCount()));
    row("CHANGED WRITES " + std::to_string(document.changedSampleWrites()));
    row("QUEUED STAMPS " + std::to_string(document.queuedStamps()));
    row("GPU INIT MS " + std::to_string(document.times().field).substr(0, 8));
    row("BRUSH MS " + std::to_string(document.times().brush).substr(0, 8));
    row("GPU QUERY / NOT A BENCHMARK");
    y += 8;
    std::string mode = "ADD";
    if (controls.brush().mode == BrushMode::subtract)
        mode = "SUBTRACT";
    row(mode + " / A OR D");
    row("RADIUS " + std::to_string(controls.brush().radius).substr(0, 5) + " / F2");
    row("STRENGTH " + std::to_string(controls.brush().strength).substr(0, 5) + " / F3");
    row("SHIFT - / CTRL COARSE");
    row("DRAG SLICE / ENTER STAMP");
    row("X AXIS / UP DOWN LAYER");
    row("HJKL PROBE / Z Y HISTORY");
    row("SPACE PAUSE / ESC ROLLBACK");
    row("1 2 3 PRESET / R RESET");
    row("Q QUIT");
    gpuFieldSliceOverlay(overlay, document, settings, controls, value, probeRevision, width, height);
}

inline int runGpuFieldPreview(int argc, char** argv) {
    const auto options = gpuFieldPreviewOptions(argc, argv);
    // snippet:sculpt-gpu-field-create
    NativeWindow window(options.hidden);
#if LAB_CHECKPOINT == 7
    SDL_SetWindowTitle(window.get(), "Project 44 - GPU Count and Scan Lesson 07");
#else
    SDL_SetWindowTitle(window.get(), "Project 44 - GPU Field Lesson 06");
#endif
    GlApi gl;
    gl.loadAll();
    GpuBudget budget;
    auto settings = options.settings;
    preflightSculpt(gl, settings);
    auto document = std::make_unique<GpuFieldDocument>(gl, budget, settings, options.plane);
    // end-snippet:sculpt-gpu-field-create
    FieldSliceRenderer renderer(gl);
    OverlayRenderer ui(gl);
    GpuFieldLessonControls controls(settings.grid, options.brush);
#if LAB_CHECKPOINT == 7
    // snippet:sculpt-count-preview-create
    GpuCountLessonJob countJob(gl, budget, settings);
    // end-snippet:sculpt-count-preview-create
    GpuCountLessonVerifier verifier;
    std::optional<GpuScanVerifier> scanVerifier;
    bool scanVerified = !options.verify;
    if (options.verify)
        scanVerifier.emplace(gl, budget);
#else
    GpuFieldLessonVerifier verifier(options.plane);
#endif
    std::optional<float> probe;
    std::optional<SliceState> probedSlice;
    std::uint32_t probeRevision{};
    bool running = true, captured = false, rendered = false;
    const auto started = std::chrono::steady_clock::now();
    auto nextFrame = started;
    while (running) {
        const auto now = std::chrono::steady_clock::now();
        if ((options.seconds > 0 && now - started >= std::chrono::seconds(options.seconds)) || (options.verify && now - started >= std::chrono::seconds(20)))
            break;
        SDL_Event event;
        int eventBudget = 0;
        while (eventBudget++ < 32 && SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (!options.hidden && !options.verify) {
#if LAB_CHECKPOINT == 7
                if (!controls.captured())
                    countJob.event(event);
                // snippet:sculpt-count-input-gate
                controls.event(event, *document, settings.grid, settings.shape, !countJob.blocksEdits());
                // end-snippet:sculpt-count-input-gate
#else
                controls.event(event, *document, settings.grid, settings.shape);
#endif
            }
        }
        if (!running || controls.quit())
            break;
        // snippet:sculpt-gpu-field-tick
        document->tick(controls.paused());
        if (document->state() == FieldState::failed)
            throw std::runtime_error("GPU field job failed; no CPU extraction fallback was run");
        // end-snippet:sculpt-gpu-field-tick
        bool canReplaceField = true;
#if LAB_CHECKPOINT == 7
        if (controls.resetRequest())
            countJob.cancel();
        canReplaceField = !countJob.gpuBusy();
#endif
        if (const auto reset = controls.resetRequest(); reset && document->stable() && canReplaceField) {
            auto next = settings;
            next.shape = *reset;
            auto candidate = std::make_unique<GpuFieldDocument>(gl, budget, next, options.plane);
            document = std::move(candidate);
            settings = next;
            controls.resetAccepted();
            probe.reset();
            probedSlice.reset();
#if LAB_CHECKPOINT == 7
            countJob.resetForField();
#endif
        }
#if LAB_CHECKPOINT == 7
        // snippet:sculpt-count-preview-tick
        countJob.tick(*document, controls.paused());
        // end-snippet:sculpt-count-preview-tick
        if (scanVerifier) {
            scanVerifier->tick();
            if (scanVerifier->done()) {
                scanVerified = true;
                scanVerifier.reset();
            }
        }
        if (options.verify)
            verifier.tick(countJob, *document, controls);
        countJob.updateInspection(*document);
#else
        if (options.verify)
            verifier.tick(*document, settings.grid);
#endif
        int width{}, height{}, logicalWidth{}, logicalHeight{};
        SDL_GetWindowSizeInPixels(window.get(), &width, &height);
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
#if LAB_CHECKPOINT == 7
        controls.layout(logicalWidth, logicalHeight, true);
#else
        controls.layout(logicalWidth, logicalHeight);
#endif
        const auto& slice = controls.slice();
        const bool selectedChanged = !probedSlice || probedSlice->axis != slice.axis || probedSlice->layer != slice.layer || probedSlice->u != slice.u || probedSlice->v != slice.v;
        if (selectedChanged)
            probe.reset();
        if (document->stable() && (selectedChanged || probeRevision != document->revision())) {
            probe = readSliceValue(document->field(), settings.grid, slice);
            probedSlice = slice;
            probeRevision = document->revision();
        }
        if (now >= nextFrame && width > 0 && height > 0 && logicalWidth > 396 && logicalHeight > 180) {
            gl.Viewport(0, 0, width, height);
            gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            if (document->hasCompleteField())
                renderer.draw(document->field(), settings.grid, settings.isovalue, slice, controls.rectangle(), width, height, logicalWidth, logicalHeight);
            Overlay overlay;
            overlay.reset(logicalWidth, logicalHeight);
#if LAB_CHECKPOINT == 7
            gpuCountPreviewOverlay(overlay, *document, settings, budget, controls, countJob, probe, probeRevision, logicalWidth, logicalHeight);
#else
            gpuFieldPreviewOverlay(overlay, *document, settings, budget, controls, probe, probeRevision, logicalWidth, logicalHeight);
#endif
            ui.draw(overlay, width, height);
            if (gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("GPU field preview returned a GL error");
            rendered = true;
#if LAB_CHECKPOINT == 7
            const bool finished = countJob.current(*document) && (!options.verify || (verifier.done() && scanVerified));
#else
            const bool finished = document->stable() && (!options.verify || verifier.done());
#endif
            if (!options.capture.empty() && finished) {
                captureFrame(gl, width, height, options.capture);
                captured = true;
            }
            SDL_GL_SwapWindow(window.get());
            nextFrame = now + std::chrono::milliseconds(16);
            // Verification keeps every data check; its bitmap UI only needs progress at 10 Hz.
            if (options.verify)
                nextFrame = now + std::chrono::milliseconds(100);
            if (finished && (options.verify || captured))
                break;
        }
        SDL_Delay(1);
    }
    controls.cancel(*document);
#if LAB_CHECKPOINT == 7
    if ((!options.capture.empty() && !captured) || (options.verify && (!rendered || !verifier.done() || !scanVerified || !countJob.current(*document))))
        throw std::runtime_error("GPU count preview stopped before completing its requested check/capture");
    std::cout << "P44 GPU COUNT CHECKPOINT FINISHED samples=" << settings.grid.sampleCount() << " cells=" << settings.grid.cellCount() << " countedVertices=" << countJob.vertices() << " emittedVertices=" << countJob.emittedVertices() << " countFieldRevision=" << countJob.publishedRevision() << " fieldRevision=" << document->revision() << " generation=" << countJob.generation() << " trackedGpuBytes=" << budget.used << " runtimeGpuCount=1\n";
#else
    if ((!options.capture.empty() && !captured) || (options.verify && (!rendered || !verifier.done())))
        throw std::runtime_error("GPU field preview stopped before its requested check/capture");
    std::cout << "P44 GPU FIELD CHECKPOINT FINISHED samples=" << settings.grid.sampleCount() << " cells=" << settings.grid.cellCount() << " initialized=" << document->initializedSamples() << " fieldBytes=" << settings.grid.sampleCount() * sizeof(float) << " trackedGpuBytes=" << budget.used << " noCpuExtraction=1\n";
#endif
    return 0;
}

} // namespace sculpt
