#pragma once
#include "dataset.hpp"
#include "step.hpp"

namespace lab {
struct BenchmarkCase {
    std::size_t count{};
    double cellSize{};
    Method method = Method::Grid;
    Layout layout = Layout::Uniform;
};

struct BenchmarkRow {
    BenchmarkCase config{};
    std::size_t samples{};
    double medianMs{};
    double minMs{};
    double maxMs{};
    double buildMs{};
    double queryMs{};
    double updateMs{};
    std::size_t candidates{};
    std::size_t neighbors{};
    std::uint32_t checksum{};
};

struct GridBenchmark {
    std::vector<BenchmarkCase> cases;
    Params params{};
    std::uint32_t seed{};
    bool active{};
    std::size_t row{};
    std::size_t iteration{};
    std::vector<Boid> input;
    std::optional<StepJob> step;
    std::vector<GridMetrics> samples;
    std::vector<BenchmarkRow> rows;
    std::uint32_t checksum{};
};

#if LAB_CHECKPOINT >= 9
// [snippet:createBenchmark]
inline GridBenchmark createGridBenchmark(const Params& params, std::uint32_t seed, double cellSize, Layout layout, bool studyCells) {
    GridBenchmark job{};
    job.params = params;
    job.seed = seed;
    job.active = true;
    if (studyCells) {
        job.cases.push_back({1024, cellSize, Method::Brute, layout});
        for (double size : {16.0, 32.0, 64.0, 100.0, 128.0, 240.0}) {
            job.cases.push_back({1024, size, Method::Grid, layout});
        }
    } else {
        for (std::size_t count : {std::size_t{256}, std::size_t{1024}, std::size_t{10000}}) {
            if (count <= 1024) {
                job.cases.push_back({count, cellSize, Method::Brute, Layout::Uniform});
            }
            job.cases.push_back({count, cellSize, Method::Grid, Layout::Uniform});
        }
    }
    return job;
}

// [/snippet:createBenchmark]

inline double median(std::vector<double> values) {
    std::sort(values.begin(), values.end());
    return values.at(values.size() / 2);
}

// [snippet:tickBenchmark]
inline void tickGridBenchmark(GridBenchmark& job) {
    if (!job.active) {
        return;
    }
    const auto& config = job.cases.at(job.row);
    if (!job.step) {
        if (job.input.empty()) {
            job.input = makeDataset(config.count, job.seed, job.params, config.layout);
        }
        job.step = createStep(job.input, job.params, config.cellSize, config.method);
    }
    if (!advanceStep(*job.step)) {
        return;
    }
    // Checksum nằm ngoài thời gian kernel, không thay phép so sánh toàn state.
    for (const Boid& boid : job.step->output) {
        job.checksum += static_cast<std::uint32_t>(std::llround(boid.position.x * 1024));
        job.checksum += static_cast<std::uint32_t>(std::llround(boid.position.y * 1024));
    }
    if (job.iteration >= 2) {
        job.samples.push_back(job.step->metrics);
    }
    ++job.iteration;
    job.step.reset();
    if (job.iteration == 7) {
        std::vector<double> totals;
        std::vector<double> builds;
        std::vector<double> queries;
        std::vector<double> updates;
        for (const auto& sample : job.samples) {
            totals.push_back(sample.totalMs);
            builds.push_back(sample.buildMs);
            queries.push_back(sample.queryMs);
            updates.push_back(sample.updateMs);
        }
        const auto limits = std::minmax_element(totals.begin(), totals.end());
        const auto& work = job.samples.front();
        job.rows.push_back({config, job.samples.size(), median(totals), *limits.first, *limits.second, median(builds), median(queries), median(updates), work.candidates, work.neighbors, job.checksum});
        ++job.row;
        job.iteration = 0;
        job.input.clear();
        job.samples.clear();
        job.checksum = 0;
        if (job.row == job.cases.size()) {
            job.active = false;
        }
    }
}

// [/snippet:tickBenchmark]
#endif

inline void cancelBenchmark(GridBenchmark& job) {
    job.active = false;
    job.step.reset();
    job.input.clear();
}
} // namespace lab
