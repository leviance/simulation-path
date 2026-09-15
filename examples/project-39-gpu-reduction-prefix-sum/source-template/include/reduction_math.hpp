#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
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

#if LAB_CHECKPOINT >= 2
constexpr std::uint32_t kWorkgroupSize = 256U;
constexpr std::size_t kBlockSpan = std::size_t(kWorkgroupSize) * 2U;
#endif

#if LAB_CHECKPOINT >= 1
enum class Operation {
    reduction,
    exclusiveScan,
};

inline const char* operationName(Operation operation) {
    if (operation == Operation::reduction) {
        return "Reduction";
    }
    return "Exclusive Scan";
}
#endif

#if LAB_CHECKPOINT >= 2
// Ceil division giữ toàn bộ dispatch plan trong miền số nguyên.
inline std::size_t ceilDiv(std::size_t value, std::size_t divisor) {
    if (value == 0U || divisor == 0U) {
        return 0U;
    }
    return 1U + (value - 1U) / divisor;
}
#endif

#if LAB_CHECKPOINT >= 1
inline std::uint32_t mixBits(std::uint32_t value) {
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    value ^= value >> 16U;
    return value;
}

inline float deterministicValue(
    std::size_t index,
    std::uint32_t seed = 0x39c0ffeeU
) {
    const std::uint32_t lowIndex = static_cast<std::uint32_t>(index);
    const std::uint32_t bits = mixBits(lowIndex ^ seed ^ 0x9e3779b9U);
    const float unit = static_cast<float>(bits & 0x00ffffffU) / 16777215.0F;
    return 0.0005F + unit * 0.0015F;
}

inline std::vector<float> makeDeterministicInput(
    std::size_t count,
    std::uint32_t seed = 0x39c0ffeeU
) {
    std::vector<float> input(count);
    for (std::size_t index = 0; index < count; ++index) {
        input[index] = deterministicValue(index, seed);
    }
    return input;
}

// Oracle dùng double để không sao chép chính roundoff order của cây float trên GPU.
inline double cpuReduction(const std::vector<float>& input) {
    double total = 0.0;
    for (float value : input) {
        total += static_cast<double>(value);
    }
    return total;
}

inline std::vector<double> cpuExclusiveScan(const std::vector<float>& input) {
    std::vector<double> output(input.size());
    double runningTotal = 0.0;
    for (std::size_t index = 0; index < input.size(); ++index) {
        output[index] = runningTotal;
        runningTotal += static_cast<double>(input[index]);
    }
    return output;
}
#endif

#if LAB_CHECKPOINT >= 2
struct HierarchyLevel {
    std::size_t level{};
    std::size_t inputCount{};
    std::size_t blockCount{};
    std::size_t launchedValues{};
    std::size_t zeroPadding{};
};

inline std::vector<HierarchyLevel> makeHierarchy(
    std::size_t inputCount,
    std::size_t blockSpan = kBlockSpan
) {
    std::vector<HierarchyLevel> levels{};
    if (blockSpan == 0U) {
        return levels;
    }

    std::size_t currentCount = inputCount;
    std::size_t levelIndex = 0U;
    while (currentCount > 0U) {
        const std::size_t blockCount = ceilDiv(currentCount, blockSpan);
        const std::size_t launchedValues = blockCount * blockSpan;
        levels.push_back({
            levelIndex,
            currentCount,
            blockCount,
            launchedValues,
            launchedValues - currentCount,
        });
        if (blockCount == 1U) {
            break;
        }
        currentCount = blockCount;
        ++levelIndex;
    }
    return levels;
}

inline std::size_t reductionDispatchCount(std::size_t inputCount) {
    return makeHierarchy(inputCount).size();
}

inline std::size_t scanDispatchCount(std::size_t inputCount) {
    const std::size_t levelCount = makeHierarchy(inputCount).size();
    if (levelCount == 0U) {
        return 0U;
    }
    return levelCount + levelCount - 1U;
}
#endif

#if LAB_CHECKPOINT >= 3
struct ComputeLimits {
    int majorVersion{};
    int minorVersion{};
    int maximumWorkgroupCountX{};
    int maximumWorkgroupSizeX{};
    int maximumInvocations{};
    std::int64_t maximumShaderStorageBlockBytes{};
    std::int64_t maximumSharedMemoryBytes{};
};

struct CapabilityReport {
    bool version43OrNewer{};
    bool localSizeSupported{};
    bool groupCountSupported{};
    bool storageBlockLargeEnough{};
    bool sharedMemoryLargeEnough{};

    bool allPassed() const {
        return version43OrNewer &&
            localSizeSupported &&
            groupCountSupported &&
            storageBlockLargeEnough &&
            sharedMemoryLargeEnough;
    }
};

inline CapabilityReport validateCapabilities(
    const ComputeLimits& limits,
    std::size_t inputCount
) {
    const bool versionSupported = limits.majorVersion > 4 ||
        (limits.majorVersion == 4 && limits.minorVersion >= 3);
    const std::size_t firstLevelBlocks = ceilDiv(inputCount, kBlockSpan);
    const std::int64_t requiredBytes = static_cast<std::int64_t>(inputCount * sizeof(float));
    const std::int64_t requiredSharedBytes = static_cast<std::int64_t>(kBlockSpan * sizeof(float));
    return {
        versionSupported,
        static_cast<int>(kWorkgroupSize) <= limits.maximumWorkgroupSizeX &&
            static_cast<int>(kWorkgroupSize) <= limits.maximumInvocations,
        firstLevelBlocks <= static_cast<std::size_t>(std::max(0, limits.maximumWorkgroupCountX)),
        requiredBytes <= limits.maximumShaderStorageBlockBytes,
        requiredSharedBytes <= limits.maximumSharedMemoryBytes,
    };
}
#endif

#if LAB_CHECKPOINT >= 9
struct ValidationReport {
    bool sameSize{};
    bool allFinite{};
    bool startsAtZero{};
    bool adjacentDeltasMatch{};
    bool totalMatches{};
    std::size_t mismatchCount{};
    std::size_t firstMismatch{std::numeric_limits<std::size_t>::max()};
    double maximumAbsoluteError{};

    bool passed() const {
        return sameSize &&
            allFinite &&
            startsAtZero &&
            adjacentDeltasMatch &&
            totalMatches &&
            mismatchCount == 0U;
    }
};

inline bool withinTolerance(
    double actual,
    double expected,
    double absoluteTolerance,
    double relativeTolerance
) {
    const double scale = std::max(std::abs(actual), std::abs(expected));
    return std::abs(actual - expected) <= absoluteTolerance + relativeTolerance * scale;
}

inline ValidationReport validateReduction(
    const std::vector<float>& input,
    float actual,
    double absoluteTolerance = 2.0e-4,
    double relativeTolerance = 5.0e-5
) {
    const double expected = cpuReduction(input);
    const bool finite = std::isfinite(actual);
    double error = std::numeric_limits<double>::infinity();
    if (finite) {
        error = std::abs(static_cast<double>(actual) - expected);
    }
    const bool totalMatches = finite && withinTolerance(static_cast<double>(actual), expected, absoluteTolerance, relativeTolerance);

    ValidationReport report{};
    report.sameSize = true;
    report.allFinite = finite;
    report.startsAtZero = true;
    report.adjacentDeltasMatch = true;
    report.totalMatches = totalMatches;
    report.maximumAbsoluteError = error;
    if (!totalMatches) {
        report.mismatchCount = 1U;
        report.firstMismatch = 0U;
    }
    return report;
}

inline ValidationReport validateExclusiveScan(
    const std::vector<float>& input,
    const std::vector<float>& actual,
    double absoluteTolerance = 3.0e-4,
    double relativeTolerance = 8.0e-5
) {
    const std::vector<double> expected = cpuExclusiveScan(input);
    ValidationReport report{};
    report.sameSize = expected.size() == actual.size();
    report.allFinite = true;
    report.startsAtZero = actual.empty() || std::abs(actual.front()) <= absoluteTolerance;
    report.adjacentDeltasMatch = true;

    const std::size_t count = std::min(expected.size(), actual.size());
    for (std::size_t index = 0; index < count; ++index) {
        const double actualValue = static_cast<double>(actual[index]);
        const bool finite = std::isfinite(actualValue);
        report.allFinite = report.allFinite && finite;
        double error = std::numeric_limits<double>::infinity();
        if (finite) {
            error = std::abs(actualValue - expected[index]);
        }
        report.maximumAbsoluteError = std::max(report.maximumAbsoluteError, error);
        if (!finite || !withinTolerance(actualValue, expected[index], absoluteTolerance, relativeTolerance)) {
            if (report.firstMismatch == std::numeric_limits<std::size_t>::max()) {
                report.firstMismatch = index;
            }
            ++report.mismatchCount;
        }
    }

    if (!report.sameSize) {
        if (expected.size() > count) {
            report.mismatchCount += expected.size() - count;
        } else {
            report.mismatchCount += actual.size() - count;
        }
        if (report.firstMismatch == std::numeric_limits<std::size_t>::max()) {
            report.firstMismatch = count;
        }
    }
    for (std::size_t index = 0; index + 1U < count; ++index) {
        const double delta = static_cast<double>(actual[index + 1U]) - actual[index];
        if (!withinTolerance(delta, input[index], absoluteTolerance * 2.0, relativeTolerance * 2.0)) {
            report.adjacentDeltasMatch = false;
            break;
        }
    }

    double actualTotal = 0.0;
    if (count > 0U) {
        actualTotal = static_cast<double>(actual[count - 1U]) + input[count - 1U];
    }
    const double expectedTotal = std::accumulate(
        input.begin(),
        input.begin() + static_cast<std::ptrdiff_t>(count),
        0.0
    );
    report.totalMatches = withinTolerance(
        actualTotal,
        expectedTotal,
        absoluteTolerance * 2.0,
        relativeTolerance * 2.0
    );
    return report;
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
