#pragma once
#include "state.hpp"
#include <chrono>

namespace volume54 {
struct Measurement {
    double step = 0;
    double maximumError = 0;
    double medianMs = 0;
    double lowerMs = 0;
    double upperMs = 0;
};

// Finite, cancellable job. One GPU draw is submitted per tick; no busy waiting.
class Benchmark {
#if LAB_CHECKPOINT >= 9
    GlApi& gl_;
    std::unique_ptr<Renderer> renderer_;
    Camera camera_;
    Settings settings_;
    std::vector<std::array<double, 4>> reference_;
    std::vector<double> times_;
    int stepIndex_ = 0;
    int repetition_ = -1;
    bool waiting_ = false;
    Uint64 started_ = 0;
    const std::array<double, 4> steps_{0.08, 0.04, 0.02, 0.008};
#endif
    public:
    bool active = false;
    std::vector<Measurement> results;
    std::string message = "B: compare four steps; 320x240, warm-up + 5 GPU samples.";

    explicit Benchmark([[maybe_unused]] GlApi& gl)
#if LAB_CHECKPOINT >= 9
        : gl_(gl)
#endif
    {
    }

    void cancel() {
        active = false;
#if LAB_CHECKPOINT >= 9
        waiting_ = false;
        renderer_.reset();
#endif
    }

    void invalidate() {
        cancel();
        results.clear();
        message = "Parameters changed; measure again for this camera/dataset.";
    }
#if LAB_CHECKPOINT >= 9
    void start(const State& state) {
        cancel();
        results.clear();
        renderer_ = std::make_unique<Renderer>(gl_);
        renderer_->open();
        renderer_->resize(320, 240);
        renderer_->upload(*state.volume);
        camera_ = state.camera;
        settings_ = state.settings;
        settings_.early = false;
        reference_.clear();
        // Fine CPU integration is an error estimate, not an analytic ground truth.
        for (int gy = 0; gy < 6; ++gy) {
            for (int gx = 0; gx < 8; ++gx) {
                const int x = 20 + gx * 40;
                const int y = 20 + gy * 40;
                const Ray ray = cameraRay(camera_, (x + 0.5) / 320, 1 - (y + 0.5) / 240, 4.0 / 3.0);
                reference_.push_back(rawOutput(integrate(ray, *state.volume, settings_, 0.002, 4096, false), settings_.mode));
            }
        }
        times_.clear();
        stepIndex_ = 0;
        repetition_ = -1;
        active = true;
        started_ = SDL_GetTicks();
        message = "Measuring fixed camera/dataset; Esc cancels. Early OFF.";
    }

    // [snippet benchmark-tick]
    void tick() {
        if (!active)
            return;
        if (SDL_GetTicks() - started_ > 15000) {
            cancel();
            message = "Benchmark cancelled: total 15-second budget.";
            return;
        }
        if (waiting_) {
            if (!renderer_->pollGpu())
                return;
            if (repetition_ >= 0)
                times_.push_back(renderer_->gpuMilliseconds);
            ++repetition_;
            waiting_ = false;
            if (repetition_ == 5)
                finishStep();
        }
        if (!active)
            return;
        settings_.stepLength = steps_[stepIndex_];
        renderer_->render(camera_, settings_, true);
        waiting_ = true;
    }

    // [/snippet benchmark-tick]

    void finishStep() {
        const auto image = renderer_->read();
        double error = 0;
        for (int gy = 0; gy < 6; ++gy)
            for (int gx = 0; gx < 8; ++gx) {
                const std::size_t address = static_cast<std::size_t>(20 + gx * 40 + (20 + gy * 40) * 320) * 4;
                const auto& expected = reference_[gx + gy * 8];
                for (int component = 0; component < 4; ++component) {
                    const double actual = image[address + component];
                    if (!std::isfinite(actual))
                        throw std::runtime_error("Nonfinite benchmark output");
                    error = std::max(error, std::abs(actual - expected[component]));
                }
            }
        std::sort(times_.begin(), times_.end());
        results.push_back({steps_[stepIndex_], error, times_[2], times_[1], times_[3]});
        ++stepIndex_;
        repetition_ = -1;
        times_.clear();
        if (stepIndex_ == static_cast<int>(steps_.size())) {
            cancel();
            message = "Done: GPU median / IQR; max error at 48 rays vs CPU step .002.";
        }
    }
#else
    void tick() {}
#endif
};
} // namespace volume54
