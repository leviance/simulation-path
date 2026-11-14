#pragma once

#include "atom_app.hpp"

namespace atom {

// Keyboard and buttons call the same actions, so neither bypasses a stage gate.
inline void Application::command(Command requested) {
    auto& sampling = requestedConfig(selected_);
    const Action action = requested.action;
    if (action == Action::none)
        return;
    try {
        message_.clear();
        if (action == Action::preset) {
            sampling.orbital = presets.at(static_cast<std::size_t>(requested.value)).id;
            sampling.radius = defaultRadius(sampling.orbital);
            refreshSelected();
        } else if (action == Action::pane) {
#if LAB_CHECKPOINT >= 9
            if (config_.comparison)
                selected_ = 1 - selected_;
#else
            message_ = "COMPARISON STARTS AT CHECKPOINT 9";
#endif
        } else if (action == Action::count) {
            sampling.count = nextPointCount(sampling.count);
            refreshSelected();
        } else if (action == Action::seed) {
            ++sampling.seed;
            refreshSelected();
        } else if (action == Action::reset) {
            // snippet:atom-reproducible-reset
            // Same model, table resolution and seed recreate the same records.
            pointer_.release();
            config_.probeCenter = {};
            ++probeRevision_;
            resetCamera();
            refresh();
            // end-snippet:atom-reproducible-reset
        } else if (action == Action::cancel) {
            primary_.cancel();
            secondary_.cancel();
        } else if (action == Action::pause) {
            paused_ = !paused_;
            primary_.pause();
            secondary_.pause();
            message_ = "PAUSE AFFECTS GENERATION / CAMERA STAYS LIVE";
        } else if (action == Action::camera) {
            failedWidth_ = 0;
            resetCamera();
        } else if (action == Action::debug) {
            config_.debug = !config_.debug;
#if LAB_CHECKPOINT >= 6
        } else if (action == Action::palette) {
            config_.palette = (config_.palette + 1) % 3;
        } else if (action == Action::opacityLess) {
            config_.opacity = std::max(0.0001F, config_.opacity / 1.25F);
        } else if (action == Action::opacityMore) {
            config_.opacity = std::min(1.0F, config_.opacity * 1.25F);
        } else if (action == Action::sizeLess) {
            config_.pointSize = std::max(0.5F, config_.pointSize - 0.25F);
        } else if (action == Action::sizeMore) {
            config_.pointSize = std::min(12.0F, config_.pointSize + 0.25F);
        } else if (action == Action::boost) {
            config_.densityBoost = !config_.densityBoost;
#endif
#if LAB_CHECKPOINT >= 7
            // snippet:atom-display-only-clip
        } else if (action == Action::clip) {
            config_.clipEnabled = !config_.clipEnabled;
            ++probeRevision_;
        } else if (action == Action::axis) {
            config_.clipAxis = (config_.clipAxis + 1) % 3;
            ++probeRevision_;
        } else if (action == Action::clipLess || action == Action::clipMore) {
            float direction = -1;
            if (action == Action::clipMore)
                direction = 1;
            config_.clipOffset = std::clamp(config_.clipOffset + direction * sampling.radius / 32, -128.0F, 128.0F);
            ++probeRevision_;
            // No requestPane call: SSBO records and density field stay unchanged.
            // end-snippet:atom-display-only-clip
#endif
#if LAB_CHECKPOINT >= 8
        } else if (action == Action::probe) {
            placeProbe_ = !placeProbe_;
            pointer_.release();
        } else if (action == Action::probeLess) {
            config_.probeRadius = std::max(0.0F, config_.probeRadius - sampling.radius / 64);
            ++probeRevision_;
        } else if (action == Action::probeMore) {
            config_.probeRadius = std::min(128.0F, config_.probeRadius + sampling.radius / 64);
            ++probeRevision_;
#endif
#if LAB_CHECKPOINT >= 9
            // snippet:atom-comparison
        } else if (action == Action::compare) {
            config_.comparison = !config_.comparison;
            selected_ = 0;
            pointer_.release();
            if (config_.comparison && !secondary_.active())
                requestPane(1);
            resetCamera();
        } else if (action == Action::fit) {
            config_.autoFit = !config_.autoFit;
            // Only the camera changes. Both clouds retain their original units.
            // end-snippet:atom-comparison
#endif
#if LAB_CHECKPOINT >= 10
            // snippet:atom-config-io
        } else if (action == Action::save) {
            std::ofstream output("atomic-playground.cfg");
            if (!output)
                throw std::runtime_error("Could not open configuration output");
            writeConfig(output, config_);
            message_ = "SAVED PARAMETERS / NO POSITION DATA";
        } else if (action == Action::load) {
            std::ifstream input("atomic-playground.cfg");
            if (!input)
                throw std::runtime_error("Could not open atomic-playground.cfg");
            const auto candidate = readConfig(input);
            pointer_.release();
            config_ = candidate;
            selected_ = 0;
            ++probeRevision_;
            refresh();
            message_ = "CONFIG VALIDATED / LAST-GOOD UNTIL READY";
            // end-snippet:atom-config-io
#endif
#if LAB_CHECKPOINT >= 3
        } else if (action == Action::mode) {
            const auto next = (static_cast<std::uint32_t>(config_.mode) + 1) % 3;
            config_.mode = static_cast<SamplingMode>(next);
            if (config_.mode != SamplingMode::weighted) {
                config_.primary.count = std::min<std::uint32_t>(config_.primary.count, 16384);
                config_.secondary.count = std::min<std::uint32_t>(config_.secondary.count, 16384);
            }
            refresh();
#endif
        } else {
            message_ = "THIS CONTROL IS ADDED IN A LATER CHECKPOINT";
        }
    } catch (const std::exception& error) {
        message_ = error.what();
    }
}

inline void Application::pollEvents() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        SDL_GetWindowSize(window_.get(), &width_, &height_);
        if (event.type == SDL_EVENT_QUIT)
            running_ = false;
        else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_RESIZED)
            pointer_.release();
        else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            if (event.key.key == SDLK_ESCAPE || event.key.key == SDLK_Q)
                running_ = false;
            else if (event.key.key == SDLK_F8)
                camera_.zoom(1);
            else if (event.key.key == SDLK_F9)
                camera_.zoom(-1);
            else if (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT || event.key.key == SDLK_UP || event.key.key == SDLK_DOWN) {
                float dx = 0, dy = 0;
                if (event.key.key == SDLK_LEFT)
                    dx = -12;
                if (event.key.key == SDLK_RIGHT)
                    dx = 12;
                if (event.key.key == SDLK_UP)
                    dy = -12;
                if (event.key.key == SDLK_DOWN)
                    dy = 12;
                if ((event.key.mod & SDL_KMOD_SHIFT) != 0)
                    camera_.pan(dx, dy);
                else
                    camera_.orbit(dx, dy);
            } else
                command(keyCommand(event.key.key));
        } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            if (event.button.button != SDL_BUTTON_LEFT && event.button.button != SDL_BUTTON_RIGHT &&
                event.button.button != SDL_BUTTON_MIDDLE)
                continue;
            const int sceneWidth = width_ - nativePanelWidth;
            if (event.button.x >= sceneWidth) {
                if (event.button.button == SDL_BUTTON_LEFT)
                    command(panel_.hit(event.button.x, event.button.y));
                continue;
            }
#if LAB_CHECKPOINT >= 8
            if (placeProbe_ && event.button.button == SDL_BUTTON_LEFT) {
                int paneCount = 1;
                if (config_.comparison)
                    paneCount = 2;
                const float paneWidth = static_cast<float>(sceneWidth) / paneCount;
                selected_ = std::min(paneCount - 1, static_cast<int>(event.button.x / paneWidth));
                const auto camera = viewCamera(selected_);
                const auto ray = camera.ray(event.button.x - selected_ * paneWidth, event.button.y, paneWidth, static_cast<float>(height_));
                const auto normal = camera.forward();
                const float depth = dot(config_.probeCenter - camera.eye(), normal);
                if (depth > 0) {
                    config_.probeCenter = camera.eye() + ray * (depth / dot(ray, normal));
                    config_.probeCenter.x = std::clamp(config_.probeCenter.x, -128.0F, 128.0F);
                    config_.probeCenter.y = std::clamp(config_.probeCenter.y, -128.0F, 128.0F);
                    config_.probeCenter.z = std::clamp(config_.probeCenter.z, -128.0F, 128.0F);
                    ++probeRevision_;
                }
                continue;
            }
#endif
            pointer_.begin(event.button.button, event.button.x, event.button.y);
        } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
            if (pointer_.button && *pointer_.button == event.button.button)
                pointer_.release();
        } else if (event.type == SDL_EVENT_MOUSE_MOTION) {
            pointer_.move(camera_, event.motion.x, event.motion.y);
        } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
            if (event.wheel.mouse_x < width_ - nativePanelWidth)
                camera_.zoom(event.wheel.y);
        }
    }
}

// A bounded run reports scopes separately; screenshot resemblance is no oracle.
// snippet:atom-benchmark-report
inline void Application::report(std::uint64_t frames, double elapsed) {
    std::cout << "RENDER frames=" << frames << " wall_seconds=" << elapsed
        << " drawable=" << drawableWidth_ << 'x' << drawableHeight_
        << " vsync_configured=" << window_.vsync()
        << " draw_gpu_ms=" << renderer_.drawMs()
        << " reserved_mib=" << budget_.reserved / 1048576.0
        << " peak_mib=" << budget_.peak / 1048576.0 << '\n';
    std::cout << currentDrawWorkload() << '\n';
    int paneCount = 1;
    if (config_.comparison)
        paneCount = 2;
    for (int index = 0; index < paneCount; ++index) {
        const auto* cloud = pane(index).active();
        if (!cloud)
            continue;
        std::cout << "SAMPLE pane=" << index << " orbital=" << preset(cloud->config().orbital).name
            << " mode=" << samplingModeName(cloud->mode())
            << " seed=" << cloud->config().seed << " rMax=" << cloud->config().radius
            << " table=" << cloud->config().radialBins << 'x' << cloud->config().muBins << 'x' << cloud->config().phiBins
            << " requested=" << cloud->config().count << " generated=" << cloud->generated()
            << " accepted=" << cloud->accepted() << " submitted=" << submitted_[index]
            << " table_cpu_ms=" << cloud->tableMs() << " sample_gpu_ms=" << cloud->sampleMs()
            << " allocate_upload_submit_cpu_ms=" << cloud->allocateUploadSubmitMs()
            << " generation_wall_ms=" << cloud->generationWallMs()
            << " tail=" << cloud->tables().tailMass;
        writeProbeMetrics(std::cout, probe(index), probeCurrent(index));
        if (evaluations_[index] && evaluations_[index]->ready() && evaluationGeneration_[index] == pane(index).generation())
            std::cout << " evaluate_gpu_ms=" << evaluations_[index]->gpuMs()
                << " evaluate_examined=" << evaluations_[index]->values()[0]
                << " evaluate_invalid=" << evaluations_[index]->values()[1];
        std::cout << '\n';
    }
    if (options_.benchmark) {
        if (drawSamples_.size() < 5)
            throw std::runtime_error("Benchmark has fewer than five post-warmup GPU queries; increase --seconds");
        auto sorted = drawSamples_;
        std::sort(sorted.begin(), sorted.end());
        const auto middle = sorted.size() / 2;
        double median = sorted[middle];
        if (sorted.size() % 2 == 0)
            median = (sorted[middle - 1] + sorted[middle]) / 2;
        const auto p95 = sorted[static_cast<std::size_t>(0.95 * (sorted.size() - 1))];
        std::cout << "DRAW_BENCHMARK warmup_queries=10 samples=" << sorted.size()
            << " capacity=8192 median_gpu_ms=" << median << " p95_gpu_ms=" << p95 << '\n';
        std::cout << "DRAW_RAW_MS";
        for (const auto value : drawSamples_)
            std::cout << ' ' << value;
        std::cout << '\n';
    }
}

// end-snippet:atom-benchmark-report

} // namespace atom
