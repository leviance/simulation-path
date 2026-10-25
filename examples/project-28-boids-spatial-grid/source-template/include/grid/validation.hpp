#pragma once
#include "step.hpp"

namespace lab {
struct ValidationJob {
    std::vector<Boid> snapshot;
    Params params{};
    std::optional<Grid> grid;
    std::size_t checked{};
    std::size_t failures{};
    bool active{};
};

#if LAB_CHECKPOINT >= 6
inline bool nearVector(Vec2 a, Vec2 b) {
    return std::abs(a.x - b.x) <= 1e-9 && std::abs(a.y - b.y) <= 1e-9;
}

inline ValidationJob createValidation(const std::vector<Boid>& flock, const Params& params, double cellSize) {
    if (flock.size() > 1024) {
        throw std::invalid_argument("Validate at most 1024 agents");
    }
    ValidationJob job{};
    job.snapshot = flock;
    job.params = params;
    job.grid = buildGrid(job.snapshot, params, cellSize);
    job.active = true;
    return job;
}

inline void tickValidation(ValidationJob& job, double budgetMs = 6.0) {
    if (!job.active) {
        return;
    }
    const auto start = Clock::now();
    while (job.checked < job.snapshot.size()) {
        const std::size_t index = job.checked;
        GridQuery query;
        queryGrid(job.snapshot, index, job.params, *job.grid, query);
        std::vector<std::size_t> brute;
        findNeighbors(job.snapshot, index, job.params, brute);
        // So sánh tập chỉ số vì cả hai cách cùng đọc đúng một snapshot.
        auto ordered = query.neighbors;
        std::sort(ordered.begin(), ordered.end());
        std::sort(brute.begin(), brute.end());
        bool equal = ordered == brute;
        const auto gridSteering = computeSteering(job.snapshot, index, query.neighbors, job.params);
        const auto bruteSteering = computeSteering(job.snapshot, index, brute, job.params);
        equal = equal && nearVector(gridSteering.separation, bruteSteering.separation);
        equal = equal && nearVector(gridSteering.alignment, bruteSteering.alignment);
        equal = equal && nearVector(gridSteering.cohesion, bruteSteering.cohesion);
        equal = equal && nearVector(gridSteering.acceleration, bruteSteering.acceleration);
        const auto gridState = integrateBoid(job.snapshot[index], gridSteering.acceleration, job.params, fixedDt);
        const auto bruteState = integrateBoid(job.snapshot[index], bruteSteering.acceleration, job.params, fixedDt);
        equal = equal && nearVector(gridState.position, bruteState.position);
        equal = equal && nearVector(gridState.velocity, bruteState.velocity);
        if (!equal) {
            ++job.failures;
        }
        ++job.checked;
        if (milliseconds(start, Clock::now()) >= budgetMs) {
            break;
        }
    }
    if (job.checked == job.snapshot.size()) {
        job.active = false;
    }
}
#endif
} // namespace lab
