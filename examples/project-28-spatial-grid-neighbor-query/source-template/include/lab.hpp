#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
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

struct CircleQuery {
    Vec2 center{};
    double radius{};
};

inline constexpr std::size_t kNoParticle = std::numeric_limits<std::size_t>::max();

inline bool validBounds(const Bounds2D& bounds) {
    return std::isfinite(bounds.minimum.x) && std::isfinite(bounds.minimum.y) && std::isfinite(bounds.maximum.x) && std::isfinite(bounds.maximum.y) && bounds.minimum.x < bounds.maximum.x && bounds.minimum.y < bounds.maximum.y;
}

inline bool validQuery(const CircleQuery& query) {
    return std::isfinite(query.center.x) && std::isfinite(query.center.y) && std::isfinite(query.radius) && query.radius >= 0.0;
}

inline double distanceSquared(Vec2 first, Vec2 second) {
    const double deltaX = first.x - second.x;
    const double deltaY = first.y - second.y;
    return deltaX * deltaX + deltaY * deltaY;
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

struct BruteForceNeighborResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t nearestIndex{kNoParticle};
    double nearestDistanceSquared{std::numeric_limits<double>::infinity()};
    std::size_t scanned{};
};

inline void resetBruteForceNeighborResult(BruteForceNeighborResult& result) {
    result.hitIndices.clear();
    result.nearestIndex = kNoParticle;
    result.nearestDistanceSquared = std::numeric_limits<double>::infinity();
    result.scanned = 0;
}

inline void recordNeighborHit(BruteForceNeighborResult& result, std::size_t particleIndex, double candidateDistanceSquared) {
    result.hitIndices.push_back(particleIndex);
    const bool isCloser = candidateDistanceSquared < result.nearestDistanceSquared;
    const bool winsTie = candidateDistanceSquared == result.nearestDistanceSquared && particleIndex < result.nearestIndex;
    if (isCloser || winsTie) {
        result.nearestIndex = particleIndex;
        result.nearestDistanceSquared = candidateDistanceSquared;
    }
}

inline void queryNeighborsBruteForce(std::span<const Particle> particles, const CircleQuery& query, BruteForceNeighborResult& result) {
    resetBruteForceNeighborResult(result);
    if (!validQuery(query)) {
        return;
    }

    const double radiusSquared = query.radius * query.radius;
    for (std::size_t particleIndex = 0; particleIndex < particles.size(); ++particleIndex) {
        const double candidateDistanceSquared = distanceSquared(particles[particleIndex].position, query.center);
        ++result.scanned;
        if (candidateDistanceSquared <= radiusSquared) {
            recordNeighborHit(result, particleIndex, candidateDistanceSquared);
        }
    }
}

// Checkpoint 1: biến world position thành địa chỉ cell row-major.
#if LAB_CHECKPOINT >= 1
struct SpatialGridConfig {
    Bounds2D bounds{};
    double cellSize{};
};

struct GridDimensions {
    int columns{};
    int rows{};
};

inline constexpr int kMaximumGridDimension = 4096;
inline constexpr std::size_t kMaximumGridCellCount = 1'000'000U;

struct GridAddress {
    int column{};
    int row{};
    std::size_t index{};
};

inline bool validSpatialGridConfig(const SpatialGridConfig& config) {
    return validBounds(config.bounds) && std::isfinite(config.cellSize) && config.cellSize > 0.0;
}

inline GridDimensions spatialGridDimensions(const SpatialGridConfig& config) {
    GridDimensions dimensions{};
    if (!validSpatialGridConfig(config)) {
        return dimensions;
    }

    const double width = config.bounds.maximum.x - config.bounds.minimum.x;
    const double height = config.bounds.maximum.y - config.bounds.minimum.y;
    const double requestedColumns = std::ceil(width / config.cellSize);
    const double requestedRows = std::ceil(height / config.cellSize);
    if (!std::isfinite(requestedColumns) || !std::isfinite(requestedRows) ||
        requestedColumns < 1.0 || requestedRows < 1.0 ||
        requestedColumns > double(kMaximumGridDimension) ||
        requestedRows > double(kMaximumGridDimension) ||
        requestedColumns * requestedRows > double(kMaximumGridCellCount)) {
        return dimensions;
    }
    dimensions.columns = int(requestedColumns);
    dimensions.rows = int(requestedRows);
    return dimensions;
}

inline bool pointInsideBounds(Vec2 point, const Bounds2D& bounds) {
    return std::isfinite(point.x) && std::isfinite(point.y) && point.x >= bounds.minimum.x && point.x <= bounds.maximum.x && point.y >= bounds.minimum.y && point.y <= bounds.maximum.y;
}

inline bool spatialGridAddress(Vec2 point, const SpatialGridConfig& config, GridDimensions dimensions, GridAddress& address) {
    if (dimensions.columns <= 0 || dimensions.rows <= 0 || !pointInsideBounds(point, config.bounds)) {
        return false;
    }

    const int rawColumn = int(std::floor((point.x - config.bounds.minimum.x) / config.cellSize));
    const int rawRow = int(std::floor((point.y - config.bounds.minimum.y) / config.cellSize));
    address.column = std::clamp(rawColumn, 0, dimensions.columns - 1);
    address.row = std::clamp(rawRow, 0, dimensions.rows - 1);
    address.index = std::size_t(address.row * dimensions.columns + address.column);
    return true;
}
#endif

// Checkpoint 2: mỗi bucket giữ index của particles nằm trong cell tương ứng.
#if LAB_CHECKPOINT >= 2
struct SpatialGrid {
    SpatialGridConfig config{};
    int columns{};
    int rows{};
    std::vector<std::vector<std::size_t>> buckets{};
    std::size_t particleCount{};
    std::size_t insertedCount{};
    std::size_t nonEmptyCells{};
    std::size_t maximumBucketSize{};
    double rebuildMicroseconds{};
};

inline SpatialGrid buildSpatialGrid(std::span<const Particle> particles, const SpatialGridConfig& config) {
    const auto started = std::chrono::steady_clock::now();
    SpatialGrid grid{};
    grid.config = config;
    grid.particleCount = particles.size();
    const GridDimensions dimensions = spatialGridDimensions(config);
    grid.columns = dimensions.columns;
    grid.rows = dimensions.rows;
    if (grid.columns <= 0 || grid.rows <= 0) {
        const auto finished = std::chrono::steady_clock::now();
        grid.rebuildMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
        return grid;
    }

    const std::size_t cellCount = std::size_t(grid.columns) * std::size_t(grid.rows);
    grid.buckets.resize(cellCount);
    for (std::size_t particleIndex = 0; particleIndex < particles.size(); ++particleIndex) {
        GridAddress address{};
        if (!spatialGridAddress(particles[particleIndex].position, config, dimensions, address)) {
            continue;
        }
        grid.buckets[address.index].push_back(particleIndex);
        ++grid.insertedCount;
    }

    for (const std::vector<std::size_t>& bucket : grid.buckets) {
        if (!bucket.empty()) {
            ++grid.nonEmptyCells;
        }
        grid.maximumBucketSize = std::max(grid.maximumBucketSize, bucket.size());
    }
    const auto finished = std::chrono::steady_clock::now();
    grid.rebuildMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return grid;
}
#endif

// Checkpoint 3: tìm hình chữ nhật cell bao trọn circle query.
#if LAB_CHECKPOINT >= 3
struct GridCellRange {
    int minimumColumn{};
    int maximumColumn{};
    int minimumRow{};
    int maximumRow{};
};

inline bool spatialGridQueryCellRange(const SpatialGrid& grid, const CircleQuery& query, GridCellRange& range) {
    if (grid.columns <= 0 || grid.rows <= 0 || !validQuery(query)) {
        return false;
    }

    const Bounds2D& bounds = grid.config.bounds;
    const double queryMinimumX = query.center.x - query.radius;
    const double queryMaximumX = query.center.x + query.radius;
    const double queryMinimumY = query.center.y - query.radius;
    const double queryMaximumY = query.center.y + query.radius;
    if (queryMaximumX < bounds.minimum.x || queryMinimumX > bounds.maximum.x || queryMaximumY < bounds.minimum.y || queryMinimumY > bounds.maximum.y) {
        return false;
    }

    const int rawMinimumColumn = int(std::floor((queryMinimumX - bounds.minimum.x) / grid.config.cellSize));
    const int rawMaximumColumn = int(std::floor((queryMaximumX - bounds.minimum.x) / grid.config.cellSize));
    const int rawMinimumRow = int(std::floor((queryMinimumY - bounds.minimum.y) / grid.config.cellSize));
    const int rawMaximumRow = int(std::floor((queryMaximumY - bounds.minimum.y) / grid.config.cellSize));
    range.minimumColumn = std::clamp(rawMinimumColumn, 0, grid.columns - 1);
    range.maximumColumn = std::clamp(rawMaximumColumn, 0, grid.columns - 1);
    range.minimumRow = std::clamp(rawMinimumRow, 0, grid.rows - 1);
    range.maximumRow = std::clamp(rawMaximumRow, 0, grid.rows - 1);
    return true;
}
#endif

// Checkpoint 4: chỉ kiểm tra particles trong candidate cells, sau đó lọc chính xác bằng circle.
#if LAB_CHECKPOINT >= 4
struct GridQueryWorkspace {
    std::vector<std::size_t> hitIndices{};
    std::size_t nearestIndex{kNoParticle};
    double nearestDistanceSquared{std::numeric_limits<double>::infinity()};
    std::size_t visitedCells{};
    std::size_t candidatesChecked{};
};

inline void resetGridQueryWorkspace(GridQueryWorkspace& workspace) {
    workspace.hitIndices.clear();
    workspace.nearestIndex = kNoParticle;
    workspace.nearestDistanceSquared = std::numeric_limits<double>::infinity();
    workspace.visitedCells = 0;
    workspace.candidatesChecked = 0;
}

inline void recordGridHit(GridQueryWorkspace& workspace, std::size_t particleIndex, double candidateDistanceSquared) {
    workspace.hitIndices.push_back(particleIndex);
    const bool isCloser = candidateDistanceSquared < workspace.nearestDistanceSquared;
    const bool winsTie = candidateDistanceSquared == workspace.nearestDistanceSquared && particleIndex < workspace.nearestIndex;
    if (isCloser || winsTie) {
        workspace.nearestIndex = particleIndex;
        workspace.nearestDistanceSquared = candidateDistanceSquared;
    }
}

inline void querySpatialGrid(const SpatialGrid& grid, std::span<const Particle> particles, const CircleQuery& query, GridQueryWorkspace& workspace) {
    resetGridQueryWorkspace(workspace);
    GridCellRange range{};
    if (!spatialGridQueryCellRange(grid, query, range)) {
        return;
    }

    const double radiusSquared = query.radius * query.radius;
    for (int row = range.minimumRow; row <= range.maximumRow; ++row) {
        for (int column = range.minimumColumn; column <= range.maximumColumn; ++column) {
            const std::size_t cellIndex = std::size_t(row * grid.columns + column);
            const std::vector<std::size_t>& bucket = grid.buckets[cellIndex];
            ++workspace.visitedCells;
            for (const std::size_t particleIndex : bucket) {
                if (particleIndex >= particles.size()) {
                    continue;
                }
                const double candidateDistanceSquared = distanceSquared(particles[particleIndex].position, query.center);
                ++workspace.candidatesChecked;
                if (candidateDistanceSquared <= radiusSquared) {
                    recordGridHit(workspace, particleIndex, candidateDistanceSquared);
                }
            }
        }
    }
}
#endif

// Checkpoint 5: canonicalize output để so hit set với brute-force oracle.
#if LAB_CHECKPOINT >= 5
inline std::vector<std::size_t> canonicalHitIndices(std::span<const std::size_t> hitIndices) {
    std::vector<std::size_t> canonical{hitIndices.begin(), hitIndices.end()};
    std::sort(canonical.begin(), canonical.end());
    return canonical;
}

inline bool spatialGridMatchesBruteForce(const GridQueryWorkspace& gridResult, const BruteForceNeighborResult& bruteForceResult) {
    if (gridResult.nearestIndex != bruteForceResult.nearestIndex) {
        return false;
    }
    return canonicalHitIndices(gridResult.hitIndices) == canonicalHitIndices(bruteForceResult.hitIndices);
}
#endif

// Checkpoint 6: benchmark grid và baseline trên cùng particle/query set.
#if LAB_CHECKPOINT >= 6
struct BatchMetrics {
    std::size_t queryCount{};
    std::size_t totalScanned{};
    std::size_t totalVisitedCells{};
    std::size_t totalCandidates{};
    std::size_t totalHits{};
    std::uint32_t checksum{2166136261U};
    double elapsedMicroseconds{};
};

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

inline std::uint32_t updateNeighborChecksum(std::uint32_t checksum, std::size_t hitCount, std::size_t nearestIndex) {
    constexpr std::uint32_t prime = 16777619U;
    checksum = (checksum ^ std::uint32_t(hitCount)) * prime;
    std::size_t encodedNearest = 0U;
    if (nearestIndex != kNoParticle) {
        encodedNearest = nearestIndex + 1U;
    }
    checksum = (checksum ^ std::uint32_t(encodedNearest)) * prime;
    return checksum;
}

inline BatchMetrics benchmarkSpatialGrid(const SpatialGrid& grid, std::span<const Particle> particles, std::span<const CircleQuery> queries, int repetitions, GridQueryWorkspace& workspace) {
    BatchMetrics metrics{};
    if (repetitions <= 0 || queries.empty()) {
        return metrics;
    }

    workspace.hitIndices.reserve(particles.size());
    for (const CircleQuery& query : queries) {
        querySpatialGrid(grid, particles, query, workspace);
    }

    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        for (const CircleQuery& query : queries) {
            querySpatialGrid(grid, particles, query, workspace);
            ++metrics.queryCount;
            metrics.totalVisitedCells += workspace.visitedCells;
            metrics.totalCandidates += workspace.candidatesChecked;
            metrics.totalScanned += workspace.candidatesChecked;
            metrics.totalHits += workspace.hitIndices.size();
            metrics.checksum = updateNeighborChecksum(metrics.checksum, workspace.hitIndices.size(), workspace.nearestIndex);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}

inline BatchMetrics benchmarkBruteForceNeighbors(std::span<const Particle> particles, std::span<const CircleQuery> queries, int repetitions, BruteForceNeighborResult& workspace) {
    BatchMetrics metrics{};
    if (repetitions <= 0 || queries.empty()) {
        return metrics;
    }

    workspace.hitIndices.reserve(particles.size());
    for (const CircleQuery& query : queries) {
        queryNeighborsBruteForce(particles, query, workspace);
    }

    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        for (const CircleQuery& query : queries) {
            queryNeighborsBruteForce(particles, query, workspace);
            ++metrics.queryCount;
            metrics.totalCandidates += workspace.scanned;
            metrics.totalScanned += workspace.scanned;
            metrics.totalHits += workspace.hitIndices.size();
            metrics.checksum = updateNeighborChecksum(metrics.checksum, workspace.hitIndices.size(), workspace.nearestIndex);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}
#endif

// Checkpoint 7: đổi cellSize và ghi riêng số cells cùng candidates.
#if LAB_CHECKPOINT >= 7
struct CellSizeStudyRow {
    double cellSize{};
    int columns{};
    int rows{};
    std::size_t nonEmptyCells{};
    std::size_t maximumBucketSize{};
    double rebuildMicroseconds{};
    BatchMetrics metrics{};
};

inline std::vector<CellSizeStudyRow> makeCellSizeStudy(std::span<const Particle> particles, const Bounds2D& bounds, std::span<const CircleQuery> queries, std::span<const double> cellSizes, int repetitions) {
    std::vector<CellSizeStudyRow> rows{};
    rows.reserve(cellSizes.size());
    GridQueryWorkspace workspace{};
    for (const double cellSize : cellSizes) {
        const SpatialGrid grid = buildSpatialGrid(particles, {bounds, cellSize});
        const BatchMetrics metrics = benchmarkSpatialGrid(grid, particles, queries, repetitions, workspace);
        rows.push_back({
            cellSize,
            grid.columns,
            grid.rows,
            grid.nonEmptyCells,
            grid.maximumBucketSize,
            grid.rebuildMicroseconds,
            metrics,
        });
    }
    return rows;
}
#endif

// Checkpoint 8: final gom preset và validation thuần, không cần SDL window.
#if LAB_CHECKPOINT >= 8
enum class GridPreset {
    coarse,
    balanced,
    fine,
};

inline double cellSizeForPreset(GridPreset preset) {
    if (preset == GridPreset::coarse) {
        return 0.2;
    }
    if (preset == GridPreset::fine) {
        return 0.025;
    }
    return 0.05;
}

struct ValidationReport {
    bool addressBoundaryCorrect{};
    bool everyParticleInsertedOnce{};
    bool resultMatchesOracle{};
    bool candidateWorkReduced{};
    bool finiteTiming{};
};

inline ValidationReport validateSpatialGridExperiment(const Bounds2D& bounds, std::uint32_t seed) {
    const std::vector<Particle> particles = makeParticleCloud(10'000, bounds, seed);
    const SpatialGrid grid = buildSpatialGrid(particles, {bounds, 0.05});

    GridAddress maximumAddress{};
    const bool addressValid = spatialGridAddress(bounds.maximum, grid.config, {grid.columns, grid.rows}, maximumAddress);
    const bool boundaryCorrect = addressValid && maximumAddress.column == grid.columns - 1 && maximumAddress.row == grid.rows - 1;

    std::size_t bucketEntries = 0;
    for (const std::vector<std::size_t>& bucket : grid.buckets) {
        bucketEntries += bucket.size();
    }
    const bool insertedOnce = grid.insertedCount == particles.size() && bucketEntries == particles.size();

    const CircleQuery query{{0.5, 0.5}, 0.08};
    GridQueryWorkspace gridWorkspace{};
    BruteForceNeighborResult bruteWorkspace{};
    querySpatialGrid(grid, particles, query, gridWorkspace);
    queryNeighborsBruteForce(particles, query, bruteWorkspace);
    const bool matches = spatialGridMatchesBruteForce(gridWorkspace, bruteWorkspace);

    const std::vector<CircleQuery> queries{{{0.25, 0.25}, 0.08}, {{0.5, 0.5}, 0.08}, {{0.75, 0.75}, 0.08}};
    const BatchMetrics metrics = benchmarkSpatialGrid(grid, particles, queries, 1, gridWorkspace);
    const bool reduced = metrics.totalCandidates < particles.size() * metrics.queryCount;
    const bool finite = std::isfinite(metrics.elapsedMicroseconds) && metrics.elapsedMicroseconds >= 0.0;
    return {boundaryCorrect, insertedOnce, matches, reduced, finite};
}
#endif

} // namespace lab
