#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <vector>

namespace lab {

// Mỗi checkpoint mở thêm đúng phần dữ liệu và thuật toán được giải thích trong bài tương ứng.
#if LAB_CHECKPOINT >= 1
struct Vec2 {
    double x{};
    double y{};
};

struct Particle {
    Vec2 position{};
};

struct Bounds2D {
    Vec2 minimum{};
    Vec2 maximum{};
};

inline bool validBounds(const Bounds2D& bounds) {
    return std::isfinite(bounds.minimum.x) && std::isfinite(bounds.minimum.y) && std::isfinite(bounds.maximum.x) && std::isfinite(bounds.maximum.y) && bounds.minimum.x < bounds.maximum.x && bounds.minimum.y < bounds.maximum.y;
}

class XorShift32 {
    public:
    explicit XorShift32(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0U) {
            state_ = 0x6d2b79f5U;
        }
    }

    std::uint32_t nextU32() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return state_;
    }

    double nextUnit() {
        return double(nextU32()) / double(std::numeric_limits<std::uint32_t>::max());
    }

    private:
    std::uint32_t state_{};
};

inline std::vector<Particle> makeParticleCloud(std::size_t count, const Bounds2D& bounds, std::uint32_t seed) {
    std::vector<Particle> particles{};
    if (!validBounds(bounds)) {
        return particles;
    }

    particles.reserve(count);
    XorShift32 random{seed};
    const double width = bounds.maximum.x - bounds.minimum.x;
    const double height = bounds.maximum.y - bounds.minimum.y;
    for (std::size_t index = 0; index < count; ++index) {
        const double x = bounds.minimum.x + random.nextUnit() * width;
        const double y = bounds.minimum.y + random.nextUnit() * height;
        particles.push_back({{x, y}});
    }
    return particles;
}
#endif

#if LAB_CHECKPOINT >= 2
struct CircleQuery {
    Vec2 center{};
    double radius{};
};

inline bool validQuery(const CircleQuery& query) {
    return std::isfinite(query.center.x) && std::isfinite(query.center.y) && std::isfinite(query.radius) && query.radius >= 0.0;
}

inline double distanceSquared(Vec2 first, Vec2 second) {
    const double deltaX = first.x - second.x;
    const double deltaY = first.y - second.y;
    return deltaX * deltaX + deltaY * deltaY;
}

inline bool insideCircleWithDistance(Vec2 point, const CircleQuery& query) {
    if (!validQuery(query)) {
        return false;
    }
    const double deltaX = point.x - query.center.x;
    const double deltaY = point.y - query.center.y;
    return std::hypot(deltaX, deltaY) <= query.radius;
}
#endif

#if LAB_CHECKPOINT >= 3
inline constexpr std::size_t kNoParticle = std::numeric_limits<std::size_t>::max();

struct BruteForceResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t nearestIndex{kNoParticle};
    double nearestDistanceSquared{std::numeric_limits<double>::infinity()};
    std::size_t scanned{};
};

inline BruteForceResult queryBruteForce(std::span<const Particle> particles, const CircleQuery& query) {
    BruteForceResult result{};
    if (!validQuery(query)) {
        return result;
    }

    for (std::size_t index = 0; index < particles.size(); ++index) {
        const double candidateDistanceSquared = distanceSquared(particles[index].position, query.center);
        ++result.scanned;
        if (candidateDistanceSquared < result.nearestDistanceSquared) {
            result.nearestDistanceSquared = candidateDistanceSquared;
            result.nearestIndex = index;
        }
        if (insideCircleWithDistance(particles[index].position, query)) {
            result.hitIndices.push_back(index);
        }
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 4
struct QueryWorkspace {
    std::vector<std::size_t> hitIndices{};
    std::size_t nearestIndex{kNoParticle};
    double nearestDistanceSquared{std::numeric_limits<double>::infinity()};
    std::size_t scanned{};
};

inline void reserveQueryWorkspace(QueryWorkspace& workspace, std::size_t maximumExpectedHits) {
    workspace.hitIndices.reserve(maximumExpectedHits);
}

inline void queryBruteForceSquared(std::span<const Particle> particles, const CircleQuery& query, QueryWorkspace& workspace) {
    workspace.hitIndices.clear();
    workspace.nearestIndex = kNoParticle;
    workspace.nearestDistanceSquared = std::numeric_limits<double>::infinity();
    workspace.scanned = 0;
    if (!validQuery(query)) {
        return;
    }

    const double radiusSquared = query.radius * query.radius;
    for (std::size_t index = 0; index < particles.size(); ++index) {
        const double candidateDistanceSquared = distanceSquared(particles[index].position, query.center);
        ++workspace.scanned;
        if (candidateDistanceSquared < workspace.nearestDistanceSquared) {
            workspace.nearestDistanceSquared = candidateDistanceSquared;
            workspace.nearestIndex = index;
        }
        if (candidateDistanceSquared <= radiusSquared) {
            workspace.hitIndices.push_back(index);
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 5
struct BatchMetrics {
    std::size_t queryCount{};
    std::size_t totalScanned{};
    std::size_t totalHits{};
    std::uint32_t checksum{2166136261U};
    double elapsedMicroseconds{};
};

inline std::uint32_t updateChecksum(std::uint32_t checksum, const QueryWorkspace& workspace) {
    constexpr std::uint32_t prime = 16777619U;
    checksum = (checksum ^ std::uint32_t(workspace.hitIndices.size())) * prime;
    std::size_t encodedNearest = 0U;
    if (workspace.nearestIndex != kNoParticle) {
        encodedNearest = workspace.nearestIndex + 1U;
    }
    checksum = (checksum ^ std::uint32_t(encodedNearest)) * prime;
    return checksum;
}

inline std::vector<CircleQuery> makeProbeQueries(std::size_t count, const Bounds2D& bounds, double radius, std::uint32_t seed) {
    std::vector<CircleQuery> queries{};
    if (!validBounds(bounds) || !std::isfinite(radius) || radius < 0.0) {
        return queries;
    }

    const std::vector<Particle> centers = makeParticleCloud(count, bounds, seed);
    queries.reserve(centers.size());
    for (const Particle& center : centers) {
        queries.push_back({center.position, radius});
    }
    return queries;
}

inline BatchMetrics benchmarkBruteForce(std::span<const Particle> particles, std::span<const CircleQuery> queries, int repetitions, QueryWorkspace& workspace) {
    BatchMetrics metrics{};
    if (repetitions <= 0 || queries.empty()) {
        return metrics;
    }

    reserveQueryWorkspace(workspace, particles.size());
    for (const CircleQuery& query : queries) {
        queryBruteForceSquared(particles, query, workspace);
    }

    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        for (const CircleQuery& query : queries) {
            queryBruteForceSquared(particles, query, workspace);
            ++metrics.queryCount;
            metrics.totalScanned += workspace.scanned;
            metrics.totalHits += workspace.hitIndices.size();
            metrics.checksum = updateChecksum(metrics.checksum, workspace);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}
#endif

#if LAB_CHECKPOINT >= 6
struct ScalingRow {
    std::size_t particleCount{};
    BatchMetrics metrics{};
};

inline std::vector<ScalingRow> makeScalingStudy(std::span<const Particle> particles, std::span<const CircleQuery> queries, std::span<const std::size_t> requestedCounts, int repetitions) {
    std::vector<ScalingRow> rows{};
    rows.reserve(requestedCounts.size());
    QueryWorkspace workspace{};
    for (const std::size_t requestedCount : requestedCounts) {
        const std::size_t particleCount = std::min(requestedCount, particles.size());
        const std::span<const Particle> prefix = particles.first(particleCount);
        rows.push_back({particleCount, benchmarkBruteForce(prefix, queries, repetitions, workspace)});
    }
    return rows;
}
#endif

#if LAB_CHECKPOINT >= 7
enum class ParticlePreset {
    thousand,
    tenThousand,
    hundredThousand,
};

inline std::size_t particleCountForPreset(ParticlePreset preset) {
    if (preset == ParticlePreset::thousand) {
        return 1'000;
    }
    if (preset == ParticlePreset::tenThousand) {
        return 10'000;
    }
    return 100'000;
}

struct ValidationReport {
    bool deterministic{};
    bool optimizedMatchesReference{};
    bool workIsLinear{};
    bool finiteTiming{};
};

inline ValidationReport validateBruteForceExperiment(const Bounds2D& bounds, std::uint32_t seed) {
    const std::vector<Particle> first = makeParticleCloud(2'000, bounds, seed);
    const std::vector<Particle> second = makeParticleCloud(2'000, bounds, seed);
    bool deterministic = first.size() == second.size();
    for (std::size_t index = 0; deterministic && index < first.size(); ++index) {
        deterministic = first[index].position.x == second[index].position.x && first[index].position.y == second[index].position.y;
    }

    const CircleQuery query{{0.5, 0.5}, 0.12};
    const BruteForceResult reference = queryBruteForce(first, query);
    QueryWorkspace workspace{};
    queryBruteForceSquared(first, query, workspace);
    const bool matches = reference.hitIndices == workspace.hitIndices && reference.nearestIndex == workspace.nearestIndex;

    const std::vector<CircleQuery> probes = makeProbeQueries(4, bounds, 0.08, seed ^ 0x9e3779b9U);
    const BatchMetrics benchmark = benchmarkBruteForce(first, probes, 2, workspace);
    const bool linearWork = benchmark.totalScanned == first.size() * probes.size() * 2U;
    return {deterministic, matches, linearWork, std::isfinite(benchmark.elapsedMicroseconds) && benchmark.elapsedMicroseconds >= 0.0};
}
#endif

} // namespace lab
