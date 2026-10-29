#pragma once

#include "vector_compute_math.hpp"

#include <array>
#include <chrono>
#include <cstdint>
#include <vector>

namespace lab {

// Một job giữ một bản sao cấu hình. UI không sửa dữ liệu mà worker đang đo.
struct WorkloadConfig {
    std::size_t elementCount{256U};
    VectorOperation operation{VectorOperation::add};
    float scalar{1.25F};
    std::uint32_t seed{0x37c0ffeeU};

    bool operator==(const WorkloadConfig&) const = default;
};

using ComputeClock = std::chrono::steady_clock;

inline double elapsedMilliseconds(ComputeClock::time_point begin, ComputeClock::time_point end) {
    return std::chrono::duration<double, std::milli>(end - begin).count();
}

#if LAB_CHECKPOINT >= 8
struct TimingSample {
    double cpuMilliseconds{};
    double kernelMilliseconds{};
    double endToEndMilliseconds{};
    double checksum{};
};

struct SampleSpread {
    double minimum{};
    double median{};
    double maximum{};
};

inline SampleSpread summarizeSamples(const std::vector<double>& values) {
    if (values.empty()) {
        throw std::invalid_argument("A timing summary needs at least one sample.");
    }
    const double median = medianMilliseconds(values);
    return {*std::min_element(values.begin(), values.end()), median, *std::max_element(values.begin(), values.end())};
}

struct BenchmarkRow {
    WorkloadConfig config{};
    std::vector<TimingSample> samples{};
    std::size_t warmupsCompleted{};

    SampleSpread cpu{};
    SampleSpread kernel{};
    SampleSpread endToEnd{};

    void summarize() {
        std::vector<double> cpuValues{};
        std::vector<double> kernelValues{};
        std::vector<double> totalValues{};
        for (const TimingSample& sample : samples) {
            cpuValues.push_back(sample.cpuMilliseconds);
            kernelValues.push_back(sample.kernelMilliseconds);
            totalValues.push_back(sample.endToEndMilliseconds);
        }
        cpu = summarizeSamples(cpuValues);
        kernel = summarizeSamples(kernelValues);
        endToEnd = summarizeSamples(totalValues);
    }
};

constexpr std::size_t benchmarkWarmupCount = 2U;
constexpr std::size_t benchmarkSampleCount = 9U;
constexpr std::array<std::size_t, 3> benchmarkCounts{256U, 65'537U, 1'000'003U};
#endif

} // namespace lab
