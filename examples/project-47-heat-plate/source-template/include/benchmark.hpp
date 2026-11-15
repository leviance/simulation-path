#pragma once

#if LAB_CHECKPOINT >= 9
#include "diffusion.hpp"
#include "metrics.hpp"
#include "options.hpp"
#include <chrono>
#include <cstdlib>
#include <iomanip>
#include <iostream>

namespace heat {

inline std::string processorDescription() {
#if defined(_MSC_VER)
    char* value = nullptr;
    std::size_t length = 0;
    if (_dupenv_s(&value, &length, "PROCESSOR_IDENTIFIER") == 0 && value) {
        const std::string description(value);
        std::free(value);
        return description;
    }
#else
    const char* value = std::getenv("PROCESSOR_IDENTIFIER");
    if (value) {
        return value;
    }
#endif
    return "not reported; record CPU/OS alongside raw results";
}

// Mỗi batch bắt đầu từ cùng dữ liệu; reset và stats nằm ngoài vùng đo update.
inline void benchmarkPlate(const Options& options) {
    using Clock = std::chrono::steady_clock;
    const auto deadline = Clock::now() + std::chrono::seconds(20);
    const Field initial = makeField(options.preset, options.size);
    std::vector<double> samples;
    double checksum = 0;
    std::cout << "CPU " << processorDescription() << '\n';
#if defined(_MSC_VER)
    std::cout << "MSVC " << _MSC_VER << '\n';
#endif
#if defined(NDEBUG)
    std::cout << "BUILD Release\n";
#else
    std::cout << "BUILD Debug: use Release for reported performance\n";
#endif
    std::cout << std::setprecision(10) << "N=" << options.size << 'x' << options.size << " D=" << options.settings.diffusivity << " dt=" << options.settings.dt << " dx=" << options.settings.dx << " dy=" << options.settings.dy << " preset=" << presetName(options.preset) << '\n';
    std::cout << "boundary=" << static_cast<int>(options.settings.boundary) << " warmup=32 steps_per_repeat=" << options.steps << " repeats=" << options.repeats << " timing=diffuse + deadline/check loop; no draw/upload/stats/reset\n";
    Field warm = initial;
    applyBoundary(warm, options.settings);
    for (int step = 0; step < 32; ++step) {
        if (!diffuse(warm, options.settings).advanced || Clock::now() >= deadline) {
            throw std::runtime_error("Warmup failed or exceeded the finite benchmark deadline");
        }
    }
    for (int repeat = 0; repeat < options.repeats; ++repeat) {
        Field field = initial;
        applyBoundary(field, options.settings);
        const auto start = Clock::now();
        for (int step = 0; step < options.steps; ++step) {
            if (!diffuse(field, options.settings).advanced || Clock::now() >= deadline) {
                throw std::runtime_error("Benchmark step failed or exceeded the 20-second CPU budget");
            }
        }
        const double milliseconds = std::chrono::duration<double, std::milli>(Clock::now() - start).count() / options.steps;
        samples.push_back(milliseconds);
        const Stats stats = measure(field, options.settings);
        if (!stats.finite) {
            throw std::runtime_error("Non-finite benchmark output");
        }
        checksum += stats.integral;
        std::cout << "RAW repeat=" << repeat + 1 << " ms_per_step=" << milliseconds << " integral=" << stats.integral << '\n';
    }
    std::sort(samples.begin(), samples.end());
    const std::size_t middle = samples.size() / 2;
    double median = samples[middle];
    if (samples.size() % 2 == 0) {
        median = (samples[middle - 1] + samples[middle]) / 2;
    }
    const std::size_t p95 = static_cast<std::size_t>(std::ceil(samples.size() * 0.95)) - 1;
    std::cout << "RESULT median_ms=" << median << " p95_ms=" << samples[p95] << " min_ms=" << samples.front() << " max_ms=" << samples.back() << " checksum=" << checksum << '\n';
    std::cout << "allocated_current=" << initial.current.size() << " next=" << initial.next.size() << " pins=" << initial.pins.size() << " actual_visited_per_step=" << initial.current.size() << " drawn=0 (CPU-only)\n";
}

} // namespace heat
#endif
