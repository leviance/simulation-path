#pragma once
#include "lab.hpp"
#include <chrono>
#include <vector>

namespace lab {
#if LAB_CHECKPOINT >= 8
struct BenchmarkConfig {
    OscillatorParameters parameters{};
    OscillatorState initial{2.5, 0.0, 0.0};
    double dt = 1.0 / 30.0;
    int repetitions = 16;
    int samples = 5;
};

struct BenchmarkWork {
    double checksum = 0.0;
    std::size_t steps = 0;
    std::size_t forceEvaluations = 0;
    bool valid = false;
};

inline bool validBenchmarkConfig(const BenchmarkConfig& config) {
    return validStep(config.initial, config.parameters, config.dt) && config.dt >= 1.0 / 240.0 && config.dt <= 0.25 && config.repetitions >= 1 && config.repetitions <= 32 && config.samples >= 3 && config.samples <= 7;
}

// Mỗi trajectory bắt đầu lại từ cùng initial. Không nối hàng nghìn giây Euler.
inline BenchmarkWork runBenchmarkWork(IntegratorKind kind, const BenchmarkConfig& config, int repetitions) {
    BenchmarkWork work;
    if (!validBenchmarkConfig(config) || repetitions < 1 || repetitions > 32) {
        return work;
    }
    const auto expectedSteps = static_cast<std::size_t>(std::floor((2.0 + kIntegratorEpsilon) / config.dt));
    // Mỗi trajectory phải đọc đầu vào lại; tránh hoist cả phép tính ra ngoài vòng lặp.
    volatile double inputPosition = config.initial.position;
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        OscillatorState initial = config.initial;
        initial.position = inputPosition;
        const auto run = runIntegrator(kind, initial, config.parameters, 2.0, config.dt);
        if (run.steps != expectedSteps) {
            return {};
        }
        work.checksum += run.state.position + 0.125 * run.state.velocity;
        work.steps += run.steps;
        work.forceEvaluations += run.forceEvaluations;
    }
    work.valid = std::isfinite(work.checksum) && work.steps > 0;
    return work;
}

inline double median(std::vector<double> values) {
    if (values.empty()) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    for (const double value : values) {
        if (!std::isfinite(value) || value < 0.0) {
            return std::numeric_limits<double>::quiet_NaN();
        }
    }
    std::sort(values.begin(), values.end());
    const std::size_t middle = values.size() / 2;
    if (values.size() % 2 == 0) {
        return 0.5 * values[middle - 1] + 0.5 * values[middle];
    }
    return values[middle];
}

struct BenchmarkRow {
    IntegratorKind kind = IntegratorKind::explicitEuler;
    double microsecondsPerStep = 0.0;
    double phaseSpaceError = 0.0;
    BenchmarkWork work{};
};

struct BenchmarkJob {
    BenchmarkConfig config{};
    std::vector<BenchmarkRow> rows;
    std::vector<double> timings;
    bool running = false;
    bool warmed = false;
    bool failed = false;
    std::chrono::steady_clock::time_point deadline{};
};

inline BenchmarkJob makeBenchmark(const BenchmarkConfig& config) {
    BenchmarkJob job;
    job.config = config;
    job.running = validBenchmarkConfig(config);
    job.failed = !job.running;
    job.deadline = std::chrono::steady_clock::now() + std::chrono::seconds(5);
    return job;
}

// Dùng checksum SAU khoảng đo để compiler không loại phần tính toán.
inline volatile double benchmarkSink = 0.0;

inline void advanceBenchmark(BenchmarkJob& job) {
    if (!job.running) {
        return;
    }
    if (std::chrono::steady_clock::now() > job.deadline) {
        job.running = false;
        job.failed = true;
        return;
    }
    const IntegratorKind kind = kDefaultKinds[job.rows.size()];
    if (!job.warmed) {
        const auto warmup = runBenchmarkWork(kind, job.config, 3);
        benchmarkSink = warmup.checksum;
        job.warmed = warmup.valid;
        job.running = warmup.valid;
        job.failed = !warmup.valid;
        return;
    }
    const auto start = std::chrono::steady_clock::now();
    const auto work = runBenchmarkWork(kind, job.config, job.config.repetitions);
    const auto end = std::chrono::steady_clock::now();
    benchmarkSink = work.checksum;
    if (!work.valid) {
        job.running = false;
        job.failed = true;
        return;
    }
    const double microseconds = std::chrono::duration<double, std::micro>(end - start).count();
    job.timings.push_back(microseconds / static_cast<double>(work.steps));
    if (job.timings.size() == static_cast<std::size_t>(job.config.samples)) {
        const auto run = runIntegrator(kind, job.config.initial, job.config.parameters, 2.0, job.config.dt);
        const double error = integratorMetrics(run.state, job.config.initial, job.config.parameters).phaseSpaceError;
        job.rows.push_back({kind, median(job.timings), error, work});
        job.timings.clear();
        job.warmed = false;
        job.running = job.rows.size() < kDefaultKinds.size();
    }
    // Mỗi lần gọi chỉ đo một batch; vòng lặp SDL vẫn nhận được input giữa các batch.
}
#endif
} // namespace lab
