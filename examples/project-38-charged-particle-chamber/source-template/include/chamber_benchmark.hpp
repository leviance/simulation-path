#pragma once
#include "chamber_renderer.hpp"
#include "chamber_timing.hpp"

#if LAB_CHECKPOINT >= 11
namespace chamber {

struct TimingRange {
    double minimum{};
    double median{};
    double maximum{};
};

inline TimingRange summarize(std::vector<double> samples) {
    if (samples.empty())
        return {};
    std::sort(samples.begin(), samples.end());
    const std::size_t middle = samples.size() / 2U;
    double median = samples[middle];
    if (samples.size() % 2U == 0U)
        median = 0.5 * (samples[middle - 1U] + samples[middle]);
    return {samples.front(), median, samples.back()};
}

class BenchmarkJob {
    // A private state/configuration keeps one measured workload separate from the live scene.
    GpuState state_{};
    GLsync fence_{};
    Uint64 deadline_{};
    TimerRing update_{};
    TimerRing draw_{};
    int warmups_{};
    bool running_{};
    bool pendingPair_{};
    std::size_t pairs_{};
    std::vector<double> frameSamples_{};
    bool captureFrame_{};

    public:
    static constexpr std::size_t kSamples = 20U;
    static constexpr int kWarmups = 4;
    Settings measured{};
    TimingRange updateMs{}, drawMs{}, frameMs{};
    bool complete{};
    std::string status{"Not run"};

    bool busy() const {
        return running_;
    }

    std::size_t progress() const {
        return pairs_;
    }

    void release(GlApi& gl) {
        if (fence_)
            gl.DeleteSync(fence_);
        fence_ = nullptr;
        state_.destroy(gl);
        update_.destroy(gl);
        draw_.destroy(gl);
        running_ = false;
    }

    void cancel(GlApi& gl) {
        release(gl);
        complete = false;
        captureFrame_ = false;
        status = "Cancelled: incomplete, no measured result";
    }

    void recordFrame(double milliseconds) {
        if (captureFrame_)
            frameSamples_.push_back(milliseconds);
        captureFrame_ = false;
    }

    bool start(GlApi& gl, const ComputePipeline& pipeline, const Settings& settings, std::uint64_t generation, std::string& error) {
        if (busy()) {
            error = "Cancel the running benchmark first";
            return false;
        }
        cancel(gl);
        measured = settings;
        updateMs = drawMs = frameMs = {};
        frameSamples_.clear();
        pairs_ = 0;
        warmups_ = 0;
        pendingPair_ = false;
        if (!pipeline.createState(gl, settings, generation, state_, error)) {
            status = error;
            return false;
        }
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence_) {
            release(gl);
            error = "Benchmark fence allocation failed";
            return false;
        }
        update_.initialize(gl);
        draw_.initialize(gl);
        deadline_ = SDL_GetTicks() + 30000;
        running_ = true;
        status = "Warm-up/job buffer; main simulation held";
        gl.Flush();
        return true;
    }

    bool frame(GlApi& gl, const ComputePipeline& pipeline, SceneRenderer& renderer, const Mat4& matrix, Vec3 eye, float dpr) {
        captureFrame_ = false;
        if (!running_)
            return false;
        if (SDL_GetTicks() > deadline_) {
            cancel(gl);
            status = "Benchmark deadline: incomplete";
            return false;
        }
        if (fence_) {
            std::string error{};
            if (!fenceReady(gl, fence_, error)) {
                if (!error.empty()) {
                    cancel(gl);
                    status = error;
                }
                return false;
            }
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
        update_.poll(gl);
        draw_.poll(gl);
        if (pendingPair_) {
            if (update_.samples.size() > pairs_ && draw_.samples.size() > pairs_) {
                ++pairs_;
                pendingPair_ = false;
            }
            if (pairs_ == kSamples) {
                updateMs = summarize(update_.samples);
                drawMs = summarize(draw_.samples);
                frameMs = summarize(frameSamples_);
                release(gl);
                complete = true;
                status = "MEASURED: 4 warm-ups, 20 paired GPU samples";
                return false;
            }
            renderer.particles(gl, state_, matrix, eye, false, dpr);
            return true;
        }
        if (warmups_ < kWarmups) {
            pipeline.step(gl, state_, 1);
            renderer.particles(gl, state_, matrix, eye, false, dpr);
            ++warmups_;
            return true;
        }
        if (!update_.begin(gl))
            return false;
        pipeline.step(gl, state_, 1);
        update_.end(gl);
        if (!draw_.begin(gl)) {
            cancel(gl);
            status = "Timing slot unavailable: incomplete";
            return false;
        }
        renderer.particles(gl, state_, matrix, eye, false, dpr);
        draw_.end(gl);
        captureFrame_ = true;
        pendingPair_ = true;
        status = "GPU samples " + std::to_string(pairs_) + "/20; configuration frozen";
        gl.Flush();
        return true;
    }
};

} // namespace chamber
#endif
