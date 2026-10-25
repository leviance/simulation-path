#pragma once
// Cùng 16 vùng, hai warm-up và năm mẫu; không sort/render trong thời gian query.
#include "validation.hpp"

namespace survey {
// [snippet:startBenchmark]
inline Job startBenchmark(const Scene& scene) {
    Job job{};
    job.active = true;
    job.benchmark = true;
    job.regions = validationRegions(scene.tree.nodes[0].bounds);
    job.regions.resize(16);
    job.errors = topologyErrors(scene.tree, scene.points);
    if (job.errors != 0) {
        job.active = false;
        job.report = "Topology errors; benchmark not started.";
    }
    return job;
}

// [/snippet:startBenchmark]

// [snippet:tickBenchmark]
inline void tickBenchmark(Job& job, const Scene& scene) {
#if LAB_CHECKPOINT >= 10
    if (!job.active || job.paused) {
        return;
    }
    const auto start = Clock::now();
    do {
        const Region& region = job.regions.at(job.queryIndex);
        Result result{};
        if (job.useTree) {
            result = scene.tree.query(scene.points, region);
        } else {
            result = brute(scene.points, region);
        }
        job.batchMilliseconds += result.milliseconds;
        for (auto index : result.indices) {
            job.checksum += scene.points[index].id + std::uint64_t{1};
        }
        ++job.queryIndex;
        if (job.queryIndex == job.regions.size()) {
            if (job.iteration >= 2) {
                job.samples.push_back(job.batchMilliseconds);
            }
            job.batchMilliseconds = 0;
            job.queryIndex = 0;
            ++job.iteration;
            if (job.iteration == 7) {
                auto sorted = job.samples;
                std::sort(sorted.begin(), sorted.end());
                std::string method = "Brute";
                if (job.useTree) {
                    method = "Tree";
                }
                job.report += method + " median/min/max ms per 16 queries: " + std::to_string(sorted[2]) + "/" + std::to_string(sorted[0]) + "/" + std::to_string(sorted[4]) + "; checksum " + std::to_string(job.checksum) + "\n";
                if (!job.useTree) {
                    job.active = false;
                }
                job.useTree = false;
                job.iteration = 0;
                job.samples.clear();
                job.checksum = 0;
            }
        }
    } while (job.active && elapsedMs(start) < 6.0);
#else
    static_cast<void>(job);
    static_cast<void>(scene);
#endif
}

// [/snippet:tickBenchmark]
} // namespace survey
