#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <numeric>
#include <string>
#include <vector>

namespace lab {

constexpr std::uint32_t kWorkgroupSize = 256U;
constexpr std::size_t kScanBlockSpan = std::size_t(kWorkgroupSize) * 2U;
constexpr float kWorldWidth = 1'024.0F;
constexpr float kWorldHeight = 576.0F;
constexpr std::uint32_t kNoNeighbor = std::numeric_limits<std::uint32_t>::max();
constexpr long double kMaximumEstimatedCandidateVisits = 1'500'000'000.0L;

struct Vec2 {
    float x{};
    float y{};

    bool operator==(const Vec2&) const = default;
};

static_assert(sizeof(Vec2) == 8U, "Vec2 must match a std430 vec2 array element.");

struct GridSpec {
    float worldWidth{kWorldWidth};
    float worldHeight{kWorldHeight};
    float cellSize{8.0F};
    std::uint32_t columns{128U};
    std::uint32_t rows{72U};

    std::size_t cellCount() const {
        return std::size_t(columns) * std::size_t(rows);
    }
};

struct ComputeLimits {
    int majorVersion{};
    int minorVersion{};
    int maximumWorkgroupCountX{};
    int maximumWorkgroupSizeX{};
    int maximumInvocations{};
    int maximumStorageBindings{};
    std::int64_t maximumShaderStorageBlockBytes{};
    std::int64_t maximumSharedMemoryBytes{};
};

struct CapabilityReport {
    bool version43OrNewer{};
    bool localSizeSupported{};
    bool groupCountSupported{};
    bool storageBindingsSupported{};
    bool positionBufferSupported{};
    bool summaryBufferSupported{};
    bool sharedMemorySupported{};
    bool candidateWorkSupported{};

    bool allPassed() const {
        return version43OrNewer &&
            localSizeSupported &&
            groupCountSupported &&
            storageBindingsSupported &&
            positionBufferSupported &&
            summaryBufferSupported &&
            sharedMemorySupported &&
            candidateWorkSupported;
    }
};

struct WorkloadEstimate {
    std::size_t maximumCandidateCellsPerQuery{};
    long double estimatedCandidateVisits{};

    bool withinBudget() const {
        return maximumCandidateCellsPerQuery > 0U &&
            estimatedCandidateVisits <= kMaximumEstimatedCandidateVisits;
    }
};

struct CellCoordinate {
    std::uint32_t column{};
    std::uint32_t row{};
};

struct CellRange {
    std::uint32_t minimumColumn{};
    std::uint32_t maximumColumn{};
    std::uint32_t minimumRow{};
    std::uint32_t maximumRow{};

    std::size_t visitedCellCount() const {
        const std::size_t width = std::size_t(maximumColumn - minimumColumn) + 1U;
        const std::size_t height = std::size_t(maximumRow - minimumRow) + 1U;
        return width * height;
    }
};

// GPU ghi đúng 16 byte cho mỗi particle; CPU có cùng layout để readback trực tiếp.
struct NeighborSummary {
    std::uint32_t neighborCount{};
    std::uint32_t nearestIndex{kNoNeighbor};
    float nearestDistanceSquared{std::numeric_limits<float>::infinity()};
    std::uint32_t visitedCandidates{};
};

static_assert(sizeof(NeighborSummary) == 16U, "NeighborSummary must match four std430 scalars.");

inline std::size_t ceilDiv(std::size_t value, std::size_t divisor) {
    if (value == 0U || divisor == 0U) {
        return 0U;
    }
    return 1U + (value - 1U) / divisor;
}

inline std::uint32_t mixBits(std::uint32_t value) {
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    value ^= value >> 16U;
    return value;
}

inline GridSpec makeGridSpec(float cellSize) {
    GridSpec spec{};
    if (std::isfinite(cellSize) && cellSize >= 1.0F) {
        spec.cellSize = cellSize;
    }
    spec.columns = static_cast<std::uint32_t>(std::ceil(spec.worldWidth / spec.cellSize));
    spec.rows = static_cast<std::uint32_t>(std::ceil(spec.worldHeight / spec.cellSize));
    return spec;
}

inline WorkloadEstimate estimateNeighborWork(
    std::size_t particleCount,
    const GridSpec& spec,
    float radius
) {
    if (
        particleCount == 0U ||
        spec.cellCount() == 0U ||
        !(spec.cellSize > 0.0F) ||
        !std::isfinite(radius) ||
        radius < 0.0F
    ) {
        return {};
    }

    const long double diameterInCells =
        (2.0L * static_cast<long double>(radius)) /
        static_cast<long double>(spec.cellSize);
    const std::size_t maximumColumns = std::min<std::size_t>(
        spec.columns,
        static_cast<std::size_t>(std::floor(diameterInCells)) + 2U
    );
    const std::size_t maximumRows = std::min<std::size_t>(
        spec.rows,
        static_cast<std::size_t>(std::floor(diameterInCells)) + 2U
    );
    const std::size_t maximumCells = maximumColumns * maximumRows;
    const long double averageOccupancy =
        static_cast<long double>(particleCount) /
        static_cast<long double>(spec.cellCount());
    const long double estimatedVisits =
        static_cast<long double>(particleCount) *
        static_cast<long double>(maximumCells) *
        averageOccupancy;
    return {maximumCells, estimatedVisits};
}

inline CapabilityReport validateCapabilities(
    const ComputeLimits& limits,
    std::size_t particleCount,
    const GridSpec& spec,
    float radius = 6.0F
) {
    const bool versionSupported = limits.majorVersion > 4 ||
        (limits.majorVersion == 4 && limits.minorVersion >= 3);
    const std::size_t maximumDomain = std::max(particleCount, spec.cellCount());
    const std::size_t requiredGroups = ceilDiv(maximumDomain, kWorkgroupSize);
    const std::int64_t positionBytes = static_cast<std::int64_t>(particleCount * sizeof(Vec2));
    const std::int64_t summaryBytes = static_cast<std::int64_t>(particleCount * sizeof(NeighborSummary));
    const std::int64_t sharedBytes = static_cast<std::int64_t>(kScanBlockSpan * sizeof(std::uint32_t));
    const WorkloadEstimate work = estimateNeighborWork(particleCount, spec, radius);
    return {
        versionSupported,
        static_cast<int>(kWorkgroupSize) <= limits.maximumWorkgroupSizeX &&
            static_cast<int>(kWorkgroupSize) <= limits.maximumInvocations,
        requiredGroups <= static_cast<std::size_t>(std::max(0, limits.maximumWorkgroupCountX)),
        limits.maximumStorageBindings >= 6,
        positionBytes <= limits.maximumShaderStorageBlockBytes,
        summaryBytes <= limits.maximumShaderStorageBlockBytes,
        sharedBytes <= limits.maximumSharedMemoryBytes,
        work.withinBudget(),
    };
}

inline float clampInside(float value, float maximum) {
    const float lastInside = std::nextafter(maximum, 0.0F);
    return std::clamp(value, 0.0F, lastInside);
}

inline CellCoordinate cellCoordinate(const GridSpec& spec, Vec2 position) {
    const float x = clampInside(position.x, spec.worldWidth);
    const float y = clampInside(position.y, spec.worldHeight);
    CellCoordinate coordinate{};
    coordinate.column = static_cast<std::uint32_t>(std::floor(x / spec.cellSize));
    coordinate.row = static_cast<std::uint32_t>(std::floor(y / spec.cellSize));
    coordinate.column = std::min(coordinate.column, spec.columns - 1U);
    coordinate.row = std::min(coordinate.row, spec.rows - 1U);
    return coordinate;
}

inline std::uint32_t cellId(const GridSpec& spec, Vec2 position) {
    const CellCoordinate coordinate = cellCoordinate(spec, position);
    return coordinate.row * spec.columns + coordinate.column;
}

#if LAB_CHECKPOINT >= 1

inline Vec2 deterministicPosition(std::size_t index, std::uint32_t seed = 40U) {
    const std::uint32_t lowIndex = static_cast<std::uint32_t>(index);
    const std::uint32_t xBits = mixBits(lowIndex ^ seed ^ 0x9e3779b9U);
    const std::uint32_t yBits = mixBits(lowIndex ^ seed ^ 0x85ebca6bU);
    const float xUnit = static_cast<float>(xBits & 0x00ffffffU) / 16777216.0F;
    const float yUnit = static_cast<float>(yBits & 0x00ffffffU) / 16777216.0F;
    return {xUnit * kWorldWidth, yUnit * kWorldHeight};
}

inline std::vector<Vec2> makeDeterministicPositions(
    std::size_t count,
    std::uint32_t seed = 40U
) {
    std::vector<Vec2> positions(count);
    for (std::size_t index = 0; index < count; ++index) {
        positions[index] = deterministicPosition(index, seed);
    }
    return positions;
}

inline float distanceSquared(Vec2 left, Vec2 right) {
    const float dx = left.x - right.x;
    const float dy = left.y - right.y;
    return dx * dx + dy * dy;
}

inline bool betterNeighbor(
    float candidateDistanceSquared,
    std::uint32_t candidateIndex,
    float currentDistanceSquared,
    std::uint32_t currentIndex
) {
    constexpr float tieEpsilon = 1.0e-6F;
    if (candidateDistanceSquared + tieEpsilon < currentDistanceSquared) {
        return true;
    }
    const bool distancesTie = std::abs(candidateDistanceSquared - currentDistanceSquared) <= tieEpsilon;
    return distancesTie && candidateIndex < currentIndex;
}

inline NeighborSummary bruteForceNeighbor(
    const std::vector<Vec2>& positions,
    std::size_t queryIndex,
    float radius
) {
    NeighborSummary summary{};
    if (queryIndex >= positions.size() || radius < 0.0F) {
        return summary;
    }

    const float radiusSquared = radius * radius;
    const Vec2 query = positions[queryIndex];
    for (std::size_t index = 0; index < positions.size(); ++index) {
        if (index == queryIndex) {
            continue;
        }
        ++summary.visitedCandidates;
        const float candidateDistance = distanceSquared(query, positions[index]);
        if (candidateDistance > radiusSquared) {
            continue;
        }
        ++summary.neighborCount;
        const std::uint32_t candidateIndex = static_cast<std::uint32_t>(index);
        if (betterNeighbor(
                candidateDistance,
                candidateIndex,
                summary.nearestDistanceSquared,
                summary.nearestIndex
            )) {
            summary.nearestDistanceSquared = candidateDistance;
            summary.nearestIndex = candidateIndex;
        }
    }
    return summary;
}

#endif

#if LAB_CHECKPOINT >= 2

inline std::vector<std::uint32_t> countCellsCpu(
    const std::vector<Vec2>& positions,
    const GridSpec& spec
) {
    std::vector<std::uint32_t> counts(spec.cellCount(), 0U);
    for (Vec2 position : positions) {
        ++counts[cellId(spec, position)];
    }
    return counts;
}

#endif

#if LAB_CHECKPOINT >= 3

inline std::vector<std::uint32_t> exclusiveScanCpu(
    const std::vector<std::uint32_t>& input
) {
    std::vector<std::uint32_t> output(input.size(), 0U);
    std::uint64_t runningTotal = 0U;
    for (std::size_t index = 0; index < input.size(); ++index) {
        output[index] = static_cast<std::uint32_t>(runningTotal);
        runningTotal += input[index];
    }
    return output;
}

struct ScanLevel {
    std::size_t inputCount{};
    std::size_t blockCount{};
};

inline std::vector<ScanLevel> makeScanHierarchy(std::size_t inputCount) {
    std::vector<ScanLevel> levels{};
    std::size_t currentCount = inputCount;
    while (currentCount > 0U) {
        const std::size_t blockCount = ceilDiv(currentCount, kScanBlockSpan);
        levels.push_back({currentCount, blockCount});
        if (blockCount == 1U) {
            break;
        }
        currentCount = blockCount;
    }
    return levels;
}

#endif

#if LAB_CHECKPOINT >= 4

struct CpuCsrGrid {
    GridSpec spec{};
    std::vector<std::uint32_t> counts{};
    std::vector<std::uint32_t> offsets{};
    std::vector<std::uint32_t> sortedIndices{};
};

inline CpuCsrGrid buildCsrCpu(
    const std::vector<Vec2>& positions,
    const GridSpec& spec
) {
    CpuCsrGrid grid{};
    grid.spec = spec;
    grid.counts = countCellsCpu(positions, spec);
    grid.offsets = exclusiveScanCpu(grid.counts);
    grid.sortedIndices.resize(positions.size());
    std::vector<std::uint32_t> cursors = grid.offsets;
    for (std::size_t index = 0; index < positions.size(); ++index) {
        const std::uint32_t cell = cellId(spec, positions[index]);
        const std::uint32_t slot = cursors[cell]++;
        grid.sortedIndices[slot] = static_cast<std::uint32_t>(index);
    }
    return grid;
}

#endif

#if LAB_CHECKPOINT >= 5

inline CellRange candidateCellRange(
    const GridSpec& spec,
    Vec2 center,
    float radius
) {
    const Vec2 minimum{center.x - radius, center.y - radius};
    const Vec2 maximum{center.x + radius, center.y + radius};
    const CellCoordinate minimumCell = cellCoordinate(spec, minimum);
    const CellCoordinate maximumCell = cellCoordinate(spec, maximum);
    return {
        minimumCell.column,
        maximumCell.column,
        minimumCell.row,
        maximumCell.row,
    };
}

#endif

#if LAB_CHECKPOINT >= 6

inline NeighborSummary queryCsrNeighbor(
    const std::vector<Vec2>& positions,
    const CpuCsrGrid& grid,
    std::size_t queryIndex,
    float radius
) {
    NeighborSummary summary{};
    if (queryIndex >= positions.size() || radius < 0.0F) {
        return summary;
    }

    const Vec2 query = positions[queryIndex];
    const float radiusSquared = radius * radius;
    const CellRange range = candidateCellRange(grid.spec, query, radius);
    for (std::uint32_t row = range.minimumRow; row <= range.maximumRow; ++row) {
        for (std::uint32_t column = range.minimumColumn; column <= range.maximumColumn; ++column) {
            const std::uint32_t cell = row * grid.spec.columns + column;
            const std::uint32_t begin = grid.offsets[cell];
            const std::uint32_t end = begin + grid.counts[cell];
            for (std::uint32_t slot = begin; slot < end; ++slot) {
                const std::uint32_t candidateIndex = grid.sortedIndices[slot];
                if (candidateIndex == queryIndex) {
                    continue;
                }
                ++summary.visitedCandidates;
                const float candidateDistance = distanceSquared(query, positions[candidateIndex]);
                if (candidateDistance > radiusSquared) {
                    continue;
                }
                ++summary.neighborCount;
                if (betterNeighbor(
                        candidateDistance,
                        candidateIndex,
                        summary.nearestDistanceSquared,
                        summary.nearestIndex
                    )) {
                    summary.nearestDistanceSquared = candidateDistance;
                    summary.nearestIndex = candidateIndex;
                }
            }
        }
    }
    return summary;
}

#endif

struct GridValidationReport {
    bool sizesMatch{};
    bool countsTotalMatches{};
    bool offsetsMonotonic{};
    bool rangesInsideStorage{};
    bool particlePermutation{};
    std::size_t firstInvalidCell{std::numeric_limits<std::size_t>::max()};
    std::size_t duplicateOrMissingIndices{};
    std::uint32_t maximumOccupancy{};

    bool passed() const {
        return sizesMatch &&
            countsTotalMatches &&
            offsetsMonotonic &&
            rangesInsideStorage &&
            particlePermutation &&
            duplicateOrMissingIndices == 0U;
    }
};

#if LAB_CHECKPOINT >= 8

inline GridValidationReport validateCsr(
    std::size_t particleCount,
    const GridSpec& spec,
    const std::vector<std::uint32_t>& counts,
    const std::vector<std::uint32_t>& offsets,
    const std::vector<std::uint32_t>& sortedIndices
) {
    GridValidationReport report{};
    report.sizesMatch = counts.size() == spec.cellCount() &&
        offsets.size() == spec.cellCount() &&
        sortedIndices.size() == particleCount;
    if (!report.sizesMatch) {
        return report;
    }

    const std::uint64_t total = std::accumulate(counts.begin(), counts.end(), std::uint64_t{0U});
    report.countsTotalMatches = total == particleCount;
    report.offsetsMonotonic = offsets.empty() || offsets.front() == 0U;
    report.rangesInsideStorage = true;
    for (std::size_t cell = 0; cell < counts.size(); ++cell) {
        report.maximumOccupancy = std::max(report.maximumOccupancy, counts[cell]);
        if (cell > 0U && offsets[cell] < offsets[cell - 1U]) {
            report.offsetsMonotonic = false;
        }
        if (cell > 0U && offsets[cell] != offsets[cell - 1U] + counts[cell - 1U]) {
            report.rangesInsideStorage = false;
            if (report.firstInvalidCell == std::numeric_limits<std::size_t>::max()) {
                report.firstInvalidCell = cell;
            }
        }
        const std::uint64_t end = std::uint64_t{offsets[cell]} + counts[cell];
        if (end > particleCount) {
            report.rangesInsideStorage = false;
            if (report.firstInvalidCell == std::numeric_limits<std::size_t>::max()) {
                report.firstInvalidCell = cell;
            }
        }
    }

    std::vector<std::uint8_t> seen(particleCount, 0U);
    for (std::uint32_t index : sortedIndices) {
        if (index >= particleCount || seen[index] != 0U) {
            ++report.duplicateOrMissingIndices;
            continue;
        }
        seen[index] = 1U;
    }
    for (std::uint8_t marker : seen) {
        if (marker == 0U) {
            ++report.duplicateOrMissingIndices;
        }
    }
    report.particlePermutation = report.duplicateOrMissingIndices == 0U;
    return report;
}

inline bool summariesMatch(const NeighborSummary& actual, const NeighborSummary& expected) {
    if (actual.neighborCount != expected.neighborCount || actual.nearestIndex != expected.nearestIndex) {
        return false;
    }
    if (actual.nearestIndex == kNoNeighbor) {
        return true;
    }
    return std::abs(actual.nearestDistanceSquared - expected.nearestDistanceSquared) <= 1.0e-4F;
}

inline std::vector<std::size_t> validationSampleIndices(
    std::size_t particleCount,
    std::size_t maximumSamples = 32U
) {
    std::vector<std::size_t> indices{};
    if (particleCount == 0U) {
        return indices;
    }
    const std::size_t sampleCount = std::min(particleCount, maximumSamples);
    indices.reserve(sampleCount);
    for (std::size_t sample = 0; sample < sampleCount; ++sample) {
        const std::uint32_t mixed = mixBits(static_cast<std::uint32_t>(sample) ^ 0x40c0ffeeU);
        indices.push_back(std::size_t(mixed) % particleCount);
    }
    return indices;
}

inline double medianMilliseconds(std::vector<double> samples) {
    if (samples.empty()) {
        return 0.0;
    }
    std::sort(samples.begin(), samples.end());
    const std::size_t middle = samples.size() / 2U;
    if ((samples.size() % 2U) == 1U) {
        return samples[middle];
    }
    return (samples[middle - 1U] + samples[middle]) * 0.5;
}

#endif

} // namespace lab
