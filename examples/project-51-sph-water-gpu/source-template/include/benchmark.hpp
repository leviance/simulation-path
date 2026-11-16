#pragma once
#include "benchmark-data.hpp"
#include "engine.hpp"
#include "view.hpp"
#include <iostream>
#include <string>

namespace water3 {
enum class BenchmarkPhase { Idle,
                            Warmup,
                            Compute,
                            Render,
                            Done,
                            Cancelled };

class Benchmark {
    public:
    BenchmarkPhase phase = BenchmarkPhase::Idle;
    std::vector<double> total, enqueue, commit, rendering;
    std::array<std::vector<double>, 16> pass;
    std::array<std::string, 16> labels;
    std::size_t passCount = 0;
    std::uint32_t warmups = 0;
    std::string message;

    bool active() const {
        return phase == BenchmarkPhase::Warmup || phase == BenchmarkPhase::Compute || phase == BenchmarkPhase::Render;
    }

    bool wantsStep() const {
        return phase == BenchmarkPhase::Warmup || phase == BenchmarkPhase::Compute;
    }

    void cancel() {
        if (active()) {
            phase = BenchmarkPhase::Cancelled;
            message = "BENCH CANCELLED - NO FUTURE TICKS";
        }
    }

    void start(lab::GlApi& gl, Engine& engine, View& view) {
        if (engine.queue.pending())
            throw std::runtime_error("Wait for pending batch before benchmark");
        *this = Benchmark{};
        engine.grid = true;
        engine.reset(gl, engine.storage.plan);
        view.camera = Camera{};
        view.mode = 0;
        phase = BenchmarkPhase::Warmup;
        message = "BENCH: 30 WARMUP + 8 STEPS + 8 RENDERS";
        started_ = std::chrono::steady_clock::now();
    }

    // [snippet benchmark-completion]
    void completedStep(const Engine& engine, const View& view, bool completed) {
        if (!active())
            return;
        if (std::chrono::steady_clock::now() - started_ > std::chrono::seconds(20)) {
            cancel();
            message = "BENCH DEADLINE - RESULT INCOMPLETE";
            return;
        }
        if (!completed || engine.steps == 0 || engine.steps == lastStep_)
            return;
        lastStep_ = engine.steps;
        if (phase == BenchmarkPhase::Warmup) {
            ++warmups;
            if (warmups == 30)
                phase = BenchmarkPhase::Compute;
            return;
        }
        if (phase != BenchmarkPhase::Compute)
            return;
        passCount = engine.queue.passCount;
        total.push_back(engine.queue.milliseconds);
        enqueue.push_back(engine.enqueueMilliseconds);
        commit.push_back(engine.commitMilliseconds);
        for (std::size_t i = 0; i < passCount; ++i) {
            labels[i] = engine.queue.timings[i].label;
            pass[i].push_back(engine.queue.timings[i].milliseconds);
        }
        if (total.size() == 8) {
            phase = BenchmarkPhase::Render;
            // Loại timestamp của frame trước khi state cuối được đóng băng.
            renderBaseline_ = view.timer.sequence;
            if (view.timer.pending())
                ++renderBaseline_;
        }
    }

    // [/snippet benchmark-completion]

    void completedRender(const View& view) {
        if (phase != BenchmarkPhase::Render || view.timer.sequence <= renderBaseline_)
            return;
        renderBaseline_ = view.timer.sequence;
        rendering.push_back(view.timer.milliseconds);
        if (rendering.size() == 8) {
            phase = BenchmarkPhase::Done;
            message = "BENCH DONE - FROZEN FINAL STATE";
        }
    }

    void print(const Engine& engine) const {
        if (phase != BenchmarkPhase::Done)
            throw std::runtime_error("Incomplete benchmark");
        std::cout << "BENCH N=" << engine.storage.plan.count << " warmup=30 samples=8 render_samples=8 grid=1 c=" << engine.settings.soundSpeed << " alpha=" << engine.settings.alpha << " gravity=" << engine.settings.gravity << " model_time=" << engine.time << '\n';
        const auto row = [](const std::string& name, const std::vector<double>& values) {
            const auto d = distribution(values);
            std::cout << name << " median=" << d.median << " min=" << d.minimum << " max=" << d.maximum << " ms\n";
        };
        for (std::size_t i = 0; i < passCount; ++i)
            row(labels[i], pass[i]);
        row("GPU compute batch", total);
        row("CPU enqueue", enqueue);
        row("Submit-to-commit including poll cadence", commit);
        row("GPU frozen-scene render, no UI/swap", rendering);
    }

    private:
    std::chrono::steady_clock::time_point started_{};
    std::uint64_t lastStep_ = 0, renderBaseline_ = 0;
};
} // namespace water3
