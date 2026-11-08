#pragma once

#include "city_compute.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <functional>
#include <iostream>
#include <vector>

namespace city {

struct TimingSample {
    std::array<double, 6> milliseconds{};
    double totalGpu{};
    double cpuFrameMilliseconds{};
    double wholeFrameMilliseconds{};
    double frameToGpuReadyMilliseconds{};
};

class TimerRing {
    struct Slot {
        std::array<GLuint, 6> queries{};
        std::array<bool, 6> used{};
        bool pending{};
        double cpuFrameMilliseconds{};
        double wholeFrameMilliseconds{};
        std::chrono::steady_clock::time_point frameStarted{};
    };

    std::array<Slot, 4> slots_{};
    unsigned cursor_{};
    bool recording_{};
    unsigned submittedSlot_{};
    bool needsPresent_{};

    public:
    void initialize(GlApi& gl) {
        for (auto& slot : slots_) {
            gl.GenQueries(static_cast<GLsizei>(slot.queries.size()), slot.queries.data());
        }
    }

    bool beginFrame() {
        recording_ = !slots_[cursor_].pending;
        if (recording_) {
            slots_[cursor_].used.fill(false);
        }
        return recording_;
    }

    void stage(GlApi& gl, int stageIndex, bool begin) {
        if (!recording_) {
            return;
        }
        if (begin) {
            slots_[cursor_].used[stageIndex] = true;
            gl.BeginQuery(GL_TIME_ELAPSED, slots_[cursor_].queries[stageIndex]);
        } else {
            gl.EndQuery(GL_TIME_ELAPSED);
        }
    }

    void endFrame(double cpuFrameMilliseconds, std::chrono::steady_clock::time_point frameStarted) {
        if (recording_) {
            slots_[cursor_].cpuFrameMilliseconds = cpuFrameMilliseconds;
            slots_[cursor_].frameStarted = frameStarted;
            submittedSlot_ = cursor_;
            needsPresent_ = true;
            slots_[cursor_].pending = true;
            cursor_ = (cursor_ + 1U) % static_cast<unsigned>(slots_.size());
        }
        recording_ = false;
    }

    void completePresent(double wholeFrameMilliseconds) {
        if (needsPresent_) {
            slots_[submittedSlot_].wholeFrameMilliseconds = wholeFrameMilliseconds;
            needsPresent_ = false;
        }
    }

    bool poll(GlApi& gl, TimingSample& sample) {
        // Query results are never requested before all six stages are available.
        for (auto& slot : slots_) {
            if (!slot.pending) {
                continue;
            }
            GLint available = GL_FALSE;
            gl.GetQueryObjectiv(slot.queries.back(), GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE) {
                return false;
            }
            sample = {};
            sample.cpuFrameMilliseconds = slot.cpuFrameMilliseconds;
            sample.wholeFrameMilliseconds = slot.wholeFrameMilliseconds;
            sample.frameToGpuReadyMilliseconds = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - slot.frameStarted).count();
            for (std::size_t i = 0; i < slot.queries.size(); ++i) {
                if (!slot.used[i]) {
                    continue;
                }
                GLuint64 nanoseconds{};
                gl.GetQueryObjectui64v(slot.queries[i], GL_QUERY_RESULT, &nanoseconds);
                sample.milliseconds[i] = static_cast<double>(nanoseconds) / 1.0e6;
                sample.totalGpu += sample.milliseconds[i];
            }
            slot.pending = false;
            return true;
        }
        return false;
    }

    bool pending() const {
        return std::any_of(slots_.begin(), slots_.end(), [](const Slot& slot) {
            return slot.pending;
        });
    }

    void destroy(GlApi& gl) {
        for (const auto& slot : slots_) {
            gl.DeleteQueries(static_cast<GLsizei>(slot.queries.size()), slot.queries.data());
        }
    }
};

class StatsReader {
    GLuint buffer_{};
    GLsync fence_{};
    std::chrono::steady_clock::time_point submitted_{};

    public:
    GpuStats latest{};
    bool valid{};

    void invalidate(GlApi& gl) {
        // A pending copy belongs to the old scene; never relabel it with the new N/seed.
        if (fence_ != nullptr) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
        latest = {};
        valid = false;
    }

    void initialize(GlApi& gl) {
        gl.GenBuffers(1, &buffer_);
        gl.BindBuffer(GL_COPY_WRITE_BUFFER, buffer_);
        gl.BufferData(GL_COPY_WRITE_BUFFER, sizeof(GpuStats), nullptr, GL_STREAM_READ);
    }

    void request(GlApi& gl, CityGpu& gpu) {
        if (fence_ != nullptr) {
            return;
        }
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        gl.BindBuffer(GL_COPY_READ_BUFFER, gpu.statsBuffer());
        gl.BindBuffer(GL_COPY_WRITE_BUFFER, buffer_);
        gl.CopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, sizeof(GpuStats));
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        submitted_ = std::chrono::steady_clock::now();
        gl.Flush();
    }

    void poll(GlApi& gl) {
        if (fence_ == nullptr) {
            return;
        }
        const GLenum state = gl.ClientWaitSync(fence_, 0, 0);
        if (state == GL_WAIT_FAILED) {
            throw std::runtime_error("Stats fence failed");
        }
        if (state == GL_ALREADY_SIGNALED || state == GL_CONDITION_SATISFIED) {
            gl.BindBuffer(GL_COPY_READ_BUFFER, buffer_);
            gl.GetBufferSubData(GL_COPY_READ_BUFFER, 0, sizeof(GpuStats), &latest);
            gl.DeleteSync(fence_);
            fence_ = nullptr;
            valid = true;
        } else if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(5)) {
            throw std::runtime_error("Stats fence exceeded its five-second deadline");
        }
    }

    void destroy(GlApi& gl) {
        if (fence_ != nullptr) {
            gl.DeleteSync(fence_);
        }
        if (buffer_ != 0U) {
            gl.DeleteBuffers(1, &buffer_);
        }
    }
};

inline double median(std::vector<double> values) {
    if (values.empty()) {
        return 0.0;
    }
    std::sort(values.begin(), values.end());
    return values[values.size() / 2U];
}

// The app submits one sample, polls on later frames and can cancel between batches.
struct BenchmarkJob {
    bool active{};
    unsigned cameraIndex{};
    bool culling{true};
    unsigned warmup{};
    std::vector<TimingSample> samples{};
    std::chrono::steady_clock::time_point started{};

    void begin() {
        *this = {};
        active = true;
        culling = true;
        started = std::chrono::steady_clock::now();
    }

    bool accept(const TimingSample& sample) {
        if (!active) {
            return false;
        }
        if (warmup < 2U) {
            ++warmup;
            return false;
        }
        samples.push_back(sample);
        if (samples.size() < 9U) {
            return false;
        }
        std::vector<double> total{};
        for (const auto& value : samples) {
            total.push_back(value.totalGpu);
        }
        std::cout << "BENCH camera=" << cameraIndex << " culling=" << culling << " warmup=2 samples=9 medianGpuMs=" << median(total);
        std::vector<double> deviation{};
        const double middle = median(total);
        for (double value : total) {
            deviation.push_back(std::abs(value - middle));
        }
        std::cout << " MAD=" << median(deviation);
        std::vector<double> frameTimes{};
        for (const auto& value : samples) {
            frameTimes.push_back(value.cpuFrameMilliseconds);
        }
        std::cout << " medianCpuSubmitFrameMs=" << median(frameTimes);
        std::vector<double> wholeFrameTimes{};
        for (const auto& value : samples) {
            wholeFrameTimes.push_back(value.wholeFrameMilliseconds);
        }
        std::cout << " medianWholeFrameMs=" << median(wholeFrameTimes);
        std::vector<double> readyTimes{};
        for (const auto& value : samples) {
            readyTimes.push_back(value.frameToGpuReadyMilliseconds);
        }
        std::cout << " medianFrameToGpuReadyMs=" << median(readyTimes);
        for (unsigned stage = 0; stage < 6U; ++stage) {
            std::vector<double> values{};
            for (const auto& value : samples) {
                values.push_back(value.milliseconds[stage]);
            }
            std::cout << " stage" << stage << "Ms=" << median(values);
        }
        std::cout << '\n';
        samples.clear();
        warmup = 0U;
        if (culling) {
            culling = false;
        } else {
            culling = true;
            ++cameraIndex;
        }
        if (cameraIndex == 6U) {
            active = false;
        }
        return true;
    }

    void cancel() {
        active = false;
        samples.clear();
    }
};

} // namespace city
