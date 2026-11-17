#pragma once
#include "fluid/statistics.hpp"
#include "gpu/engine.hpp"
#include <iostream>
#include <vector>

namespace water51 {
enum class BenchmarkPhase { Idle,
                            Warmup,
                            Compute,
                            Render,
                            Complete,
                            Cancelled };

class Benchmark {
    std::uint64_t lastTick_ = 0;
    int warmed_ = 0;
    std::chrono::steady_clock::time_point started_{};

    public:
    BenchmarkPhase phase = BenchmarkPhase::Idle;
    std::vector<double> compute, render, enqueue, completion;
    std::array<std::vector<double>, 5> passes;

    bool active() const {
        return phase == BenchmarkPhase::Warmup || phase == BenchmarkPhase::Compute || phase == BenchmarkPhase::Render;
    }

    void start(const Engine& e) {
        if (e.pending() || !e.ready())
            throw std::runtime_error("Pause and wait for the current batch before benchmarking");
        compute.clear();
        render.clear();
        enqueue.clear();
        completion.clear();
        for (auto& samples : passes)
            samples.clear();
        warmed_ = 0;
        lastTick_ = e.ticks;
        started_ = std::chrono::steady_clock::now();
        phase = BenchmarkPhase::Warmup;
    }

    void cancel() {
        if (active())
            phase = BenchmarkPhase::Cancelled;
    }

    // [snippet benchmark]
    void service(Engine& e) {
        if (!active())
            return;
        if (std::chrono::steady_clock::now() - started_ > std::chrono::seconds(50)) {
            cancel();
            throw std::runtime_error("Benchmark exceeded 50 seconds");
        }
        if (e.pending())
            return;
        if (e.ticks != lastTick_) {
            if (e.ticks - lastTick_ != 1)
                throw std::runtime_error("Benchmark sample must contain exactly one tick");
            lastTick_ = e.ticks;
            if (phase == BenchmarkPhase::Warmup) {
                warmed_++;
                if (warmed_ == 30)
                    phase = BenchmarkPhase::Compute;
            } else if (phase == BenchmarkPhase::Compute) {
                compute.push_back(e.timing.total);
                enqueue.push_back(e.enqueueMs);
                completion.push_back(e.completionMs);
                for (std::size_t i = 0; i < 5; ++i)
                    passes[i].push_back(e.timing.milliseconds[i]);
                if (compute.size() == 8)
                    phase = BenchmarkPhase::Render;
            }
        }
        if (phase == BenchmarkPhase::Warmup || phase == BenchmarkPhase::Compute)
            e.submit(1);
    }

    void rendered(double milliseconds) {
        if (phase != BenchmarkPhase::Render)
            return;
        render.push_back(milliseconds);
        if (render.size() == 8) {
            phase = BenchmarkPhase::Complete;
            const auto c = distribution(compute), r = distribution(render);
            std::cout << "BENCHMARK PASS warmup=30 compute=8 renderFrozen=8 GPU-compute median/min/max=" << c.median << '/' << c.minimum << '/' << c.maximum << " ms GPU-render=" << r.median << '/' << r.minimum << '/' << r.maximum << " ms CPU-enqueue-median=" << distribution(enqueue).median << " ms full-completion-median=" << distribution(completion).median << " ms\n";
            for (std::size_t i = 0; i < 5; ++i) {
                const auto values = distribution(passes[i]);
                std::cout << phaseNames[i] << " median/min/max=" << values.median << '/' << values.minimum << '/' << values.maximum << " ms\n";
            }
        }
    }

    // [/snippet benchmark]
};
} // namespace water51
