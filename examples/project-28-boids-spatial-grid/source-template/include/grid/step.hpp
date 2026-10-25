#pragma once
#include "boids/simulation.hpp"
#include "query.hpp"
#include <optional>

namespace lab {
using Clock = std::chrono::steady_clock;
enum class Method { Brute,
                    Grid };

struct GridMetrics {
    double buildMs{};
    double queryMs{};
    double updateMs{};
    double totalMs{};
    double wallMs{};
    std::size_t candidates{};
    std::size_t neighbors{};
    std::size_t visitedCells{};
    std::size_t occupiedCells{};
    std::size_t maximumOccupancy{};
};

struct StepJob {
    std::vector<Boid> snapshot;
    std::vector<Boid> output;
    Params params{};
    Method method = Method::Brute;
    std::optional<Grid> grid;
    GridQuery query;
    std::size_t nextIndex{};
    Clock::time_point startedAt{};
    GridMetrics metrics{};
    bool cancelled{};
};

// [snippet:createStep]
inline StepJob createStep(const std::vector<Boid>& flock, const Params& params, double cellSize, Method method) {
    const auto start = Clock::now();
    validateBoids(flock, params);
    if (method == Method::Brute && flock.size() > 1024) {
        throw std::invalid_argument("Use Grid for counts above 1024");
    }
    StepJob job{};
    job.snapshot = flock;
    job.output.resize(flock.size());
    job.params = params;
    job.method = method;
    job.startedAt = start;
#if LAB_CHECKPOINT >= 1
    static_cast<void>(gridGeometry(params, cellSize));
#else
    static_cast<void>(cellSize);
#endif
#if LAB_CHECKPOINT >= 5
    if (method == Method::Grid) {
        const auto buildStart = Clock::now();
        job.grid = buildGrid(job.snapshot, params, cellSize);
        job.metrics.buildMs = milliseconds(buildStart, Clock::now());
        job.metrics.occupiedCells = job.grid->occupiedCells;
        job.metrics.maximumOccupancy = job.grid->maximumOccupancy;
    }
#else
    if (method == Method::Grid) {
        throw std::invalid_argument("Grid stepping is introduced in checkpoint 5");
    }
#endif
    job.metrics.totalMs = milliseconds(start, Clock::now());
    return job;
}

// [/snippet:createStep]

// [snippet:advanceStep]
inline bool advanceStep(StepJob& job, std::size_t maximumAgents = 10000, double budgetMs = 6.0) {
    if (maximumAgents == 0 || maximumAgents > 10000 || !std::isfinite(budgetMs) || budgetMs <= 0 || budgetMs > 1000) {
        throw std::invalid_argument("Invalid batch budget");
    }
    if (job.cancelled) {
        return false;
    }
    const auto start = Clock::now();
    const std::size_t stopIndex = std::min(job.snapshot.size(), job.nextIndex + maximumAgents);
    while (job.nextIndex < stopIndex) {
        const std::size_t index = job.nextIndex;
        const auto queryStart = Clock::now();
#if LAB_CHECKPOINT >= 5
        if (job.grid) {
            queryGrid(job.snapshot, index, job.params, *job.grid, job.query);
            job.metrics.candidates += job.query.candidates.size();
            job.metrics.visitedCells += job.query.cells.size();
        } else {
#endif
            findNeighbors(job.snapshot, index, job.params, job.query.neighbors);
            job.metrics.candidates += job.snapshot.size() - 1;
#if LAB_CHECKPOINT >= 5
        }
#endif
        const auto queryEnd = Clock::now();
        job.metrics.queryMs += milliseconds(queryStart, queryEnd);
        job.metrics.neighbors += job.query.neighbors.size();
        const auto steering = computeSteering(job.snapshot, index, job.query.neighbors, job.params);
        job.output[index] = integrateBoid(job.snapshot[index], steering.acceleration, job.params, fixedDt);
        job.metrics.updateMs += milliseconds(queryEnd, Clock::now());
        ++job.nextIndex;
#if LAB_CHECKPOINT >= 8
        // Chỉ ngắt giữa hai cá thể: không cắt vòng hàng xóm đang tính dở.
        if (milliseconds(start, Clock::now()) >= budgetMs) {
            break;
        }
#endif
    }
    job.metrics.totalMs += milliseconds(start, Clock::now());
    job.metrics.wallMs = milliseconds(job.startedAt, Clock::now());
    return job.nextIndex == job.snapshot.size();
}

// [/snippet:advanceStep]

inline void cancelStep(StepJob& job) {
    job.cancelled = true;
    job.output.clear();
}

inline bool stepComplete(const StepJob& job) {
    return !job.cancelled && job.nextIndex == job.snapshot.size();
}
} // namespace lab
