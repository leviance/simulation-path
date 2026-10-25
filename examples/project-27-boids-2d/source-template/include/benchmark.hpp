#pragma once
#include "simulation.hpp"
#include <array>

namespace lab {
#if LAB_CHECKPOINT >= 8
struct BenchmarkRow {
    std::size_t count{};
    std::size_t samples{};
    std::size_t comparisons{};
    double medianMs{};
    double minMs{};
    double maxMs{};
    double queryMs{};
    double updateMs{};
    std::uint32_t checksum{};
};

struct BenchmarkJob {
    bool active{};
    std::size_t row{};
    std::size_t warmup{};
    Params params{};
    std::vector<Boid> source;
    std::vector<Metrics> samples;
    std::vector<BenchmarkRow> rows;
    std::uint32_t checksum{};
};

inline double median(std::vector<double> values) {
    std::sort(values.begin(), values.end());
    const std::size_t middle = values.size() / 2;
    if (values.size() % 2 == 1) {
        return values.at(middle);
    }
    return (values.at(middle - 1) + values.at(middle)) / 2.0;
}

inline BenchmarkJob createBenchmark(std::uint32_t seed, const Params& params) {
    BenchmarkJob job{};
    job.active = true;
    job.params = params;
    job.source = makeFlock(1024, seed, params);
    return job;
}

// Một bước đầy đủ mỗi frame; caller có thể hủy trước frame kế tiếp.
// [snippet:tickBenchmark]
inline void tickBenchmark(BenchmarkJob& job) {
    if (!job.active) {
        return;
    }
    constexpr std::array<std::size_t, 3> counts{256, 512, 1024};
    const std::size_t count = counts.at(job.row);
    const std::vector<Boid> snapshot(job.source.begin(), job.source.begin() + static_cast<std::ptrdiff_t>(count));
    std::vector<Boid> output;
    const Metrics metrics = stepBoids(snapshot, output, job.params, fixedDt);
    if (job.warmup < 2) {
        ++job.warmup;
        return;
    }
    job.samples.push_back(metrics);
    for (const Boid& boid : output) {
        job.checksum += static_cast<std::uint32_t>(std::llround(boid.position.x * 1000.0));
        job.checksum += static_cast<std::uint32_t>(std::llround(boid.position.y * 1000.0));
        job.checksum += boid.id;
    }
    if (job.samples.size() < 7) {
        return;
    }
    std::vector<double> total;
    std::vector<double> query;
    std::vector<double> update;
    for (const Metrics& sample : job.samples) {
        total.push_back(sample.totalMs);
        query.push_back(sample.queryMs);
        update.push_back(sample.updateMs);
    }
    const double minimum = *std::min_element(total.begin(), total.end());
    const double maximum = *std::max_element(total.begin(), total.end());
    job.rows.push_back({count, job.samples.size(), metrics.comparisons, median(total), minimum, maximum, median(query), median(update), job.checksum});
    ++job.row;
    job.samples.clear();
    job.warmup = 0;
    if (job.row == counts.size()) {
        job.active = false;
    }
}
// [/snippet:tickBenchmark]
#endif
} // namespace lab
