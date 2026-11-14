#pragma once

#include "atom_evaluate.hpp"
#include "atom_guides.hpp"
#include "atom_options.hpp"
#include "atom_panel.hpp"
#include "atom_probe.hpp"
#include "atom_render.hpp"
#include "atom_report.hpp"
#include "atom_scene.hpp"
#include "atom_window.hpp"
#include <fstream>
#include <iostream>

namespace atom {

class Application {
    public:
    Application(GlApi& gl, NativeWindow& window, Options options) :
        gl_(gl),
        window_(window),
        options_(std::move(options)),
        config_(options_.config),
        primary_(gl, budget_),
        secondary_(gl, budget_),
        primaryProbe_(gl, budget_),
        secondaryProbe_(gl, budget_),
        renderer_(gl, budget_),
        overlayRenderer_(gl) {
        if (!options_.load.empty()) {
            std::ifstream input(options_.load);
            if (!input)
                throw std::runtime_error("Could not open --load configuration");
            config_ = readConfig(input);
        }
        config_.validate();
#if LAB_CHECKPOINT >= 11
        for (auto& evaluation : evaluations_)
            evaluation = std::make_unique<GpuEvaluation>(gl_, budget_);
#endif
#if LAB_CHECKPOINT < 9
        if (config_.comparison)
            throw std::invalid_argument("Comparison is introduced at checkpoint 9");
#endif
#if LAB_CHECKPOINT < 4
        if (options_.verify)
            throw std::invalid_argument("GPU verification is available from checkpoint 4");
#endif
        refresh();
        resetCamera();
    }

    // snippet:atom-app-loop
    int run() {
        const auto started = std::chrono::steady_clock::now();
        std::uint64_t frames{};
        while (running_) {
            const auto frameStart = std::chrono::steady_clock::now();
            pollEvents();
            update();
            draw();
            collectDrawTiming();
            ++frames;
            const double elapsed = std::chrono::duration<double>(frameStart - started).count();
            bool finished = options_.seconds > 0 && elapsed >= options_.seconds;
            if (options_.verify && options_.seconds == 0 && frames >= 8 &&
                !primary_.pending() && !secondary_.pending() && probesFinished() && evaluationsFinished())
                finished = true;
            if (options_.verify && options_.seconds == 0 && !finished && elapsed >= 30)
                throw std::runtime_error("Interactive verification did not reach a current measured state within thirty seconds");
            if (finished) {
                if ((!options_.capture.empty() || options_.verify || options_.benchmark) && !renderTargetReady_)
                    throw std::runtime_error("Bounded validation ended without a usable render target");
#if LAB_CHECKPOINT >= 4
                if (!primary_.current() || (config_.comparison && !secondary_.current()))
                    throw std::runtime_error("Bounded run ended without the requested current GPU cloud");
                if ((options_.verify || options_.benchmark) && !probesFinished())
                    throw std::runtime_error("Bounded validation ended before the current probe revision completed");
#if LAB_CHECKPOINT >= 11
                if ((options_.verify || options_.benchmark) && !evaluationsFinished())
                    throw std::runtime_error("Bounded validation ended before field evaluation completed");
#endif
#endif
                if (!options_.capture.empty()) {
                    if (primary_.pending() || (config_.comparison && secondary_.pending()))
                        throw std::runtime_error("Capture deadline reached before the requested cloud was ready");
                    captureFrame(gl_, drawableWidth_, drawableHeight_, options_.capture);
                }
                report(frames, elapsed);
                running_ = false;
            }
            SDL_GL_SwapWindow(window_.get());
            if (!window_.vsync()) {
                const auto frameEnd = std::chrono::steady_clock::now();
                const auto spent = std::chrono::duration_cast<std::chrono::milliseconds>(frameEnd - frameStart);
                if (spent.count() < 16)
                    SDL_Delay(static_cast<Uint32>(16 - spent.count()));
            }
        }
        pointer_.release();
        return 0;
    }

    // end-snippet:atom-app-loop

    private:
    CloudPane& pane(int index) {
        if (index == 0)
            return primary_;
        return secondary_;
    }

    GpuProbe& probe(int index) {
        if (index == 0)
            return primaryProbe_;
        return secondaryProbe_;
    }

    SamplingConfig& requestedConfig(int index) {
        if (index == 0)
            return config_.primary;
        return config_.secondary;
    }

    void resetCamera() {
        camera_.centerOn({});
        camera_.yaw = 0.1F;
        camera_.pitch = 0.18F;
        cameraScaleRadius_ = config_.primary.radius;
        float aspect = static_cast<float>(width_ - nativePanelWidth) / height_;
        if (config_.comparison) {
            cameraScaleRadius_ = std::max(cameraScaleRadius_, config_.secondary.radius);
            aspect /= 2;
        }
        camera_.distance = cameraScaleRadius_ / std::min(1.0F, aspect);
    }

    // A small CPU checkpoint is a reference, not the final million-point path.
    // snippet:atom-cpu-reference
    void refresh() {
        config_.validate();
#if LAB_CHECKPOINT >= 4
        requestPane(0);
#if LAB_CHECKPOINT >= 9
        if (config_.comparison)
            requestPane(1);
#endif
#elif LAB_CHECKPOINT >= 2
        const auto started = std::chrono::steady_clock::now();
        previewTables_ = buildTables(config_.primary);
        previewTableMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
#if LAB_CHECKPOINT >= 3
        config_.primary.count = std::min<std::uint32_t>(config_.primary.count, 16384);
        std::vector<PointRecord> points;
        points.reserve(config_.primary.count);
        for (std::uint32_t index = 0; index < config_.primary.count; ++index)
            points.push_back(sampleCpu(*previewTables_, index, config_.mode));
        cpuPoints_ = std::make_unique<Buffer>(gl_, budget_, points.size() * sizeof(PointRecord), points.data());
        cpuCount_ = static_cast<std::uint32_t>(points.size());
#endif
#endif
    }

    // end-snippet:atom-cpu-reference

    void refreshSelected() {
#if LAB_CHECKPOINT >= 4
        requestPane(selected_);
#else
        refresh();
#endif
    }

    // snippet:atom-app-request
    void requestPane(int index) {
        auto request = requestedConfig(index);
#if LAB_CHECKPOINT < 5
        request.count = std::min<std::uint32_t>(request.count, 16384);
#endif
        if (config_.mode != SamplingMode::weighted)
            request.count = std::min<std::uint32_t>(request.count, 16384);
        pane(index).request(request, config_.mode);
    }

    // end-snippet:atom-app-request

    void update() {
#if LAB_CHECKPOINT >= 4
        for (int index = 0; index < 2; ++index) {
            auto& measurement = probe(index);
            measurement.tick();
            auto* evaluation = evaluations_[index].get();
            if (evaluation)
                evaluation->tick();
            // A probe holds its active SSBO until its finite job has drained.
            const bool evaluationIdle = !evaluation || !evaluation->busy();
            const bool published = pane(index).tick(!measurement.busy() && evaluationIdle);
            if (published) {
                const auto* cloud = pane(index).active();
                std::cout << "CLOUD pane=" << index << " orbital=" << preset(cloud->config().orbital).name
                    << " requested=" << cloud->config().count << " generated=" << cloud->generated()
                    << " accepted=" << cloud->accepted() << " sample_gpu_ms=" << cloud->sampleMs() << '\n';
            }
#if LAB_CHECKPOINT >= 8
            if (index == 1 && !config_.comparison)
                continue;
            if (pane(index).active() && !measurement.busy() &&
                (probeJobRevision_[index] != probeRevision_ || probeJobGeneration_[index] != pane(index).generation())) {
                ProbeSettings settings;
                settings.center = config_.probeCenter;
                settings.radius = config_.probeRadius;
                if (config_.clipEnabled)
                    settings.clipAxis = config_.clipAxis;
                settings.clipOffset = config_.clipOffset;
                measurement.request(*pane(index).active(), settings);
                probeJobRevision_[index] = probeRevision_;
                probeJobGeneration_[index] = pane(index).generation();
            }
#endif
#if LAB_CHECKPOINT >= 11
            if (pane(index).active() && !evaluation->busy() && evaluationGeneration_[index] != pane(index).generation()) {
                evaluation->request(*pane(index).active());
                evaluationGeneration_[index] = pane(index).generation();
            }
#endif
        }
#endif
    }

    ViewStyle style() const {
        ViewStyle result;
        result.palette = config_.palette;
        result.pointSize = config_.pointSize;
        result.opacity = config_.opacity;
        result.exposure = config_.exposure;
        result.densityBoost = config_.densityBoost;
#if LAB_CHECKPOINT >= 7
        if (config_.clipEnabled)
            result.clipAxis = config_.clipAxis;
        result.clipOffset = config_.clipOffset;
#endif
#if LAB_CHECKPOINT >= 8
        result.showProbe = config_.debug || placeProbe_;
        result.probeCenter = config_.probeCenter;
        result.probeRadius = config_.probeRadius;
#endif
        return result;
    }

    Camera viewCamera(int index) {
        Camera result = camera_;
        if (config_.autoFit) {
            float radius = requestedConfig(index).radius;
            if (pane(index).active())
                radius = pane(index).active()->config().radius;
            result.distance *= radius / cameraScaleRadius_;
        }
        return result;
    }

    // snippet:atom-app-render
    void draw() {
        submitted_.fill(0);
        if (!SDL_GetWindowSize(window_.get(), &width_, &height_) ||
            !SDL_GetWindowSizeInPixels(window_.get(), &drawableWidth_, &drawableHeight_))
            throw std::runtime_error(SDL_GetError());
        if (drawableWidth_ < 1 || drawableHeight_ < 1)
            return;
#if LAB_CHECKPOINT >= 1
        const int sceneWidth = static_cast<int>(static_cast<double>(width_ - nativePanelWidth) * drawableWidth_ / width_);
        int count = 1;
#if LAB_CHECKPOINT >= 9
        if (config_.comparison)
            count = 2;
#endif
#endif
        if (!beginRenderTarget()) {
            drawTargetFailure();
            return;
        }
        const auto display = style();
#if LAB_CHECKPOINT >= 1
        for (int index = 0; index < count; ++index) {
            const int left = index * sceneWidth / count;
            const int right = (index + 1) * sceneWidth / count;
            renderer_.draw(pane(index).active(), requestedConfig(index), viewCamera(index), display, left, right - left, drawableHeight_, cpuPoints_.get(), cpuCount_);
            submitted_[index] = 48 * 48 * 48;
            if (pane(index).active())
                submitted_[index] = pane(index).active()->accepted();
            if (cpuPoints_)
                submitted_[index] = cpuCount_;
        }
#endif
        renderer_.finish(display);
        PanelState state = panelState();
        panel_.build(overlay_, width_, height_, state);
#if LAB_CHECKPOINT >= 8
        const float logicalPaneWidth = static_cast<float>(width_ - nativePanelWidth) / count;
        if (config_.debug || placeProbe_)
            for (int index = 0; index < count; ++index)
                sphereGuide(overlay_, config_.probeCenter, config_.probeRadius, viewCamera(index), index * logicalPaneWidth, logicalPaneWidth, static_cast<float>(height_));
#endif
        overlayRenderer_.draw(overlay_, drawableWidth_, drawableHeight_);
    }

    // end-snippet:atom-app-render

    // A refused framebuffer must not turn into an app exit or an allocation
    // retry on every frame. Keep cloud ownership and all controls alive; retry
    // only after the size, tracked budget, or explicit Home retry changes.
    bool beginRenderTarget() {
        if (!renderTargetReady_ && failedWidth_ == drawableWidth_ && failedHeight_ == drawableHeight_ &&
            failedBudget_ == budget_.reserved)
            return false;
        try {
            renderer_.begin(drawableWidth_, drawableHeight_);
            renderTargetReady_ = true;
            return true;
        } catch (const std::exception& error) {
            failedWidth_ = drawableWidth_;
            failedHeight_ = drawableHeight_;
            failedBudget_ = budget_.reserved;
            renderTargetReady_ = false;
            renderError_ = error.what();
            return false;
        }
    }

    void drawTargetFailure() {
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl_.Viewport(0, 0, drawableWidth_, drawableHeight_);
        gl_.ClearColor(0.015F, 0.02F, 0.03F, 1);
        gl_.Clear(GL_COLOR_BUFFER_BIT);
        auto state = panelState();
        state.message = "RESIZE OR HOME TO RETRY / CLOUD RETAINED";
        panel_.build(overlay_, width_, height_, state);
        const float available = static_cast<float>(width_ - nativePanelWidth - 32);
        overlay_.text(16, 144, "RENDER TARGET REFUSED", {1, 0.65F, 0.3F}, 2, available);
        overlay_.text(16, 176, "NO CLOUD DRAWN / LAST-GOOD DATA IS STILL ON GPU", {0.7F, 0.8F, 0.9F}, 1, available);
        overlay_.text(16, 198, renderError_, {0.7F, 0.8F, 0.9F}, 1, available);
        overlayRenderer_.draw(overlay_, drawableWidth_, drawableHeight_);
    }

    PanelState panelState() {
        PanelState state;
        state.config = config_;
        state.selected = selected_;
        state.paused = paused_;
        state.placeProbe = placeProbe_;
        state.message = message_;
        state.drawMs = renderer_.drawMs();
        state.memoryMiB = budget_.reserved / 1048576.0;
        state.peakMiB = budget_.peak / 1048576.0;
        for (int index = 0; index < 2; ++index) {
            auto& readout = state.panes[index];
            readout.config = requestedConfig(index);
            readout.mode = config_.mode;
            readout.requested = readout.config.count;
            readout.label = std::string(preset(readout.config.orbital).name) + " FIELD LATTICE / NOT RANDOM";
#if LAB_CHECKPOINT >= 1
            readout.drawSubmitted = 48 * 48 * 48;
#else
            readout.label = "STARTER / CONNECT FIELD DRAW";
#endif
            if (cpuPoints_) {
                readout.label = std::string(preset(readout.config.orbital).name) + " CPU REFERENCE / <=16384";
                readout.accepted = cpuCount_;
                readout.generated = cpuCount_;
                readout.drawSubmitted = cpuCount_;
                readout.activeBufferMiB = cpuPoints_->byteSize() / 1048576.0;
            }
            if (previewTables_) {
                readout.tableMs = previewTableMs_;
                readout.tail = previewTables_->tailMass;
            }
            if (const auto* active = pane(index).active()) {
                readout.config = active->config();
                readout.requested = active->config().count;
                readout.generated = active->generated();
                readout.accepted = active->accepted();
                readout.drawSubmitted = active->accepted();
                readout.tableMs = active->tableMs();
                readout.sampleMs = active->sampleMs();
                readout.tail = active->tables().tailMass;
                readout.label = std::string(preset(active->config().orbital).name) + " / CURRENT GPU CLOUD";
                if (!pane(index).current())
                    readout.label = std::string(preset(active->config().orbital).name) + " / LAST-GOOD GPU CLOUD";
                readout.mode = active->mode();
                readout.activeBufferMiB = active->ownedBufferBytes() / 1048576.0;
            }
            const auto& desired = pane(index).desiredConfig();
            readout.desiredLabel = "WANT " + std::string(preset(desired.orbital).name) + " N" + std::to_string(desired.count) + " SEED " + std::to_string(desired.seed);
            if (pane(index).pending())
                readout.pendingRequested = desired.count;
            if (const auto* candidate = pane(index).candidate()) {
                readout.pendingGenerated = candidate->generated();
                readout.pendingRequested = candidate->config().count;
                readout.candidateBufferMiB = candidate->ownedBufferBytes() / 1048576.0;
            }
            auto& measurement = probe(index);
            if (evaluations_[index] && evaluations_[index]->ready() && evaluationGeneration_[index] == pane(index).generation()) {
                readout.evaluateMs = evaluations_[index]->gpuMs();
                readout.evaluated = true;
            }
            readout.measured = probeCurrent(index);
            readout.measuring = measurement.busy();
            if (readout.measured) {
                readout.measurement = measurement.values();
                readout.probeMs = measurement.gpuMs();
            }
            if (index == selected_ && !pane(index).notice().empty())
                state.message = pane(index).notice();
            readout.drawSubmitted = submitted_[index];
        }
        return state;
    }

    void pollEvents();
    void command(Command command);
    void report(std::uint64_t frames, double elapsed);

    std::string currentDrawWorkload() {
        const std::array<Camera, 2> cameras{viewCamera(0), viewCamera(1)};
        const std::array<const GpuCloud*, 2> clouds{primary_.active(), secondary_.active()};
        const std::array<std::uint64_t, 2> generations{primary_.generation(), secondary_.generation()};
        return renderWorkload(config_, style(), cameras, clouds, generations, width_, height_, drawableWidth_, drawableHeight_, width_ - nativePanelWidth);
    }

    void collectDrawTiming() {
        if (!options_.benchmark)
            return;
        const auto workload = currentDrawWorkload();
        if (workload != drawWorkload_) {
            drawWorkload_ = workload;
            drawSamples_.clear();
            drawWarmup_ = 0;
            lastDrawSerial_ = renderer_.drawSerial();
            return;
        }
        if (!renderTargetReady_ || !primary_.current() ||
            (config_.comparison && !secondary_.current()) || renderer_.drawSerial() == lastDrawSerial_)
            return;
        lastDrawSerial_ = renderer_.drawSerial();
        // Camera, appearance, clipping, resize, comparison or cloud changes
        // restart warmup. Never mix different workloads in one median/p95.
        if (drawWarmup_++ < 10)
            return;
        if (drawSamples_.size() < 8192)
            drawSamples_.push_back(renderer_.drawMs());
    }

    bool probeCurrent(int index) {
#if LAB_CHECKPOINT >= 8
        const auto* cloud = pane(index).active();
        const auto& measurement = probe(index);
        if (!cloud || !measurement.ready() || measurement.busy() ||
            probeJobRevision_[index] != probeRevision_ || probeJobGeneration_[index] != pane(index).generation())
            return false;
        return measurement.values()[0] == cloud->accepted() && measurement.values()[1] == cloud->accepted() && measurement.values()[21] == 0;
#else
        (void)index;
        return false;
#endif
    }

    bool probesFinished() {
#if LAB_CHECKPOINT >= 8
        if (!probeCurrent(0) || (config_.comparison && !probeCurrent(1)))
            return false;
#endif
        return true;
    }

    bool evaluationsFinished() const {
#if LAB_CHECKPOINT >= 11
        if (!evaluations_[0] || !evaluations_[0]->ready() || evaluations_[0]->busy() ||
            evaluationGeneration_[0] != primary_.generation())
            return false;
        if (config_.comparison && (!evaluations_[1] || !evaluations_[1]->ready() || evaluations_[1]->busy() || evaluationGeneration_[1] != secondary_.generation()))
            return false;
#endif
        return true;
    }

    GlApi& gl_;
    NativeWindow& window_;
    Options options_;
    PlaygroundConfig config_;
    // Declaration order matters: probes/renderers die before the clouds they use.
    MemoryBudget budget_;
    CloudPane primary_, secondary_;
    GpuProbe primaryProbe_, secondaryProbe_;
    std::array<std::unique_ptr<GpuEvaluation>, 2> evaluations_;
    std::array<std::uint64_t, 2> evaluationGeneration_{};
    CloudRenderer renderer_;
    OverlayRenderer overlayRenderer_;
    std::unique_ptr<Buffer> cpuPoints_;
    std::optional<SamplingTables> previewTables_;
    double previewTableMs_{};
    std::uint32_t cpuCount_{};
    Camera camera_;
    float cameraScaleRadius_{32};
    PointerDrag pointer_;
    Panel panel_;
    Overlay overlay_;
    std::string message_;
    std::uint64_t probeRevision_{1};
    std::array<std::uint64_t, 2> probeJobRevision_{};
    std::array<std::uint64_t, 2> probeJobGeneration_{};
    int width_{1280}, height_{820}, drawableWidth_{1280}, drawableHeight_{820}, selected_{};
    bool running_{true}, paused_{}, placeProbe_{};
    std::vector<double> drawSamples_;
    std::string drawWorkload_;
    std::uint64_t lastDrawSerial_{};
    std::uint32_t drawWarmup_{};
    std::array<std::uint32_t, 2> submitted_{};
    bool renderTargetReady_{true};
    int failedWidth_{}, failedHeight_{};
    std::size_t failedBudget_{};
    std::string renderError_;
};

} // namespace atom
