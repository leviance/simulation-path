#pragma once
// Giữ cùng workload cho Tree/Brute, bỏ warm-up và trả quyền điều khiển giữa các query.
#include "validation.hpp"

namespace maplab {
struct BenchmarkRow {
    bool useTree{};
    std::size_t objects{};
    std::size_t queries{};
    std::size_t samples{};
    double medianMs{};
    double minimumMs{};
    double maximumMs{};
    std::size_t candidates{};
    std::uint32_t checksum{};
};

struct BenchmarkJob {
    const Quadtree* tree{};
    std::uint64_t revision{};
    std::vector<Box> boxes;
    bool active{};
    bool stale{};
    bool useTree = true;
    std::size_t iteration{};
    std::size_t queryIndex{};
    double elapsed{};
    std::size_t candidates{};
    std::uint32_t checksum{};
    std::vector<double> samples;
    std::vector<BenchmarkRow> rows;
};

#if LAB_CHECKPOINT >= 10
inline BenchmarkJob createBenchmark(const Quadtree& tree, const Box& view) {
    BenchmarkJob job{};
    job.tree = &tree;
    job.revision = tree.revision;
    job.active = true;
    job.boxes.push_back(view);
    const auto fixtures = queryFixtures(tree.config.root);
    for (std::size_t index = 4; index < 19; ++index) {
        job.boxes.push_back(fixtures[index]);
    }
    return job;
}

// [snippet:tickBenchmark]
inline void tickBenchmark(BenchmarkJob& job) {
    if (!job.active) {
        return;
    }
    if (job.tree->revision != job.revision) {
        job.active = false;
        job.stale = true;
        return;
    }
    const auto start = Clock::now();
    do {
        const auto& box = job.boxes.at(job.queryIndex);
        Query result{};
        if (job.useTree) {
            result = job.tree->query(box);
        } else {
            result = queryBrute(*job.tree, box);
        }
        job.elapsed += result.milliseconds;
        job.candidates += result.candidates;
        for (std::uint32_t id : result.ids) {
            job.checksum += id + 1U;
        }
        ++job.queryIndex;
        if (job.queryIndex == job.boxes.size()) {
            if (job.iteration >= 2) {
                job.samples.push_back(job.elapsed);
            }
            ++job.iteration;
            job.queryIndex = 0;
            job.elapsed = 0;
            if (job.iteration == 7) {
                auto ordered = job.samples;
                std::sort(ordered.begin(), ordered.end());
                job.rows.push_back({job.useTree, job.tree->objects.size(), job.boxes.size(), ordered.size(), ordered[2], ordered[0], ordered[4], job.candidates / 7, job.checksum});
                if (!job.useTree) {
                    job.active = false;
                } else {
                    job.useTree = false;
                    job.iteration = 0;
                    job.samples.clear();
                    job.candidates = 0;
                    job.checksum = 0;
                }
            }
        }
    } while (job.active && milliseconds(start, Clock::now()) < 6.0);
}

// [/snippet:tickBenchmark]
#endif
} // namespace maplab
