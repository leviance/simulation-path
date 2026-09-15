#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

namespace lab {

enum class VectorOperation : int {
    add = 0,
    axpy = 1,
    difference = 2,
};

// Một phần tử SSBO là đúng bốn float liên tiếp trong layout std430.
struct alignas(16) Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

static_assert(sizeof(Vec4) == 16);
static_assert(alignof(Vec4) == 16);

inline const char* operationName(VectorOperation operation) {
    switch (operation) {
    case VectorOperation::add:
        return "Add";
    case VectorOperation::axpy:
        return "AXPY";
    case VectorOperation::difference:
        return "Difference";
    }
    return "Unknown";
}

inline Vec4 applyOperation(
    const Vec4& a,
    const Vec4& b,
    VectorOperation operation,
    float scalar
) {
    if (operation == VectorOperation::axpy) {
        return {
            a.x * scalar + b.x,
            a.y * scalar + b.y,
            a.z * scalar + b.z,
            a.w * scalar + b.w,
        };
    }
    if (operation == VectorOperation::difference) {
        return {a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w};
    }
    return {a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w};
}

struct VectorInputs {
    std::vector<Vec4> a{};
    std::vector<Vec4> b{};
};

#if LAB_CHECKPOINT >= 1

inline std::uint32_t mixBits(std::uint32_t value) {
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    value ^= value >> 16U;
    return value;
}

inline float deterministicComponent(
    std::size_t index,
    std::uint32_t channel,
    std::uint32_t seed
) {
    const std::uint32_t lowIndex = static_cast<std::uint32_t>(index);
    const std::uint32_t bits = mixBits(
        lowIndex ^ (channel * 0x9e3779b9U) ^ seed
    );
    const float unit = static_cast<float>(bits & 0x00ffffffU) / 16777215.0F;
    return unit * 2.0F - 1.0F;
}

inline VectorInputs makeVectorInputs(
    std::size_t elementCount,
    std::uint32_t seed = 0x37c0ffeeU
) {
    VectorInputs inputs{};
    inputs.a.resize(elementCount);
    inputs.b.resize(elementCount);
    for (std::size_t index = 0; index < elementCount; ++index) {
        inputs.a[index] = {
            deterministicComponent(index, 0U, seed),
            deterministicComponent(index, 1U, seed),
            deterministicComponent(index, 2U, seed),
            deterministicComponent(index, 3U, seed),
        };
        inputs.b[index] = {
            deterministicComponent(index, 4U, seed ^ 0xa511e9b3U),
            deterministicComponent(index, 5U, seed ^ 0xa511e9b3U),
            deterministicComponent(index, 6U, seed ^ 0xa511e9b3U),
            deterministicComponent(index, 7U, seed ^ 0xa511e9b3U),
        };
    }
    return inputs;
}

inline std::vector<Vec4> computeCpu(
    const VectorInputs& inputs,
    VectorOperation operation,
    float scalar
) {
    const std::size_t count = std::min(inputs.a.size(), inputs.b.size());
    std::vector<Vec4> output(count);
    for (std::size_t index = 0; index < count; ++index) {
        output[index] = applyOperation(inputs.a[index], inputs.b[index], operation, scalar);
    }
    return output;
}

inline double checksum(const std::vector<Vec4>& values) {
    double result = 0.0;
    for (std::size_t index = 0; index < values.size(); ++index) {
        const double weight = 1.0 + double(index % 17U) * 0.03125;
        result += weight * (double(values[index].x) + double(values[index].y) * 0.5 + double(values[index].z) * 0.25 + double(values[index].w) * 0.125);
    }
    return result;
}

#endif

#if LAB_CHECKPOINT >= 2

struct ComputeLimits {
    int majorVersion{};
    int minorVersion{};
    std::array<int, 3> maximumWorkgroupCount{};
    std::array<int, 3> maximumWorkgroupSize{};
    int maximumInvocations{};
    std::int64_t maximumShaderStorageBlockBytes{};
};

struct CapabilityReport {
    bool version43OrNewer{};
    bool localSizeSupported{};
    bool groupCountSupported{};
    bool storageBlockLargeEnough{};

    bool allPassed() const {
        return version43OrNewer &&
            localSizeSupported &&
            groupCountSupported &&
            storageBlockLargeEnough;
    }
};

#endif

#if LAB_CHECKPOINT >= 5

struct DispatchPlan {
    std::size_t elementCount{};
    std::uint32_t localSize{};
    std::uint32_t workgroupCount{};
    std::size_t launchedInvocations{};
    std::size_t unusedInvocations{};
};

inline std::uint32_t ceilDiv(std::size_t value, std::uint32_t divisor) {
    if (value == 0 || divisor == 0) {
        return 0;
    }
    return static_cast<std::uint32_t>(1U + (value - 1U) / divisor);
}

inline DispatchPlan makeDispatchPlan(
    std::size_t elementCount,
    std::uint32_t localSize
) {
    const std::uint32_t workgroups = ceilDiv(elementCount, localSize);
    const std::size_t launched = std::size_t(workgroups) * localSize;
    return {
        elementCount,
        localSize,
        workgroups,
        launched,
        launched - elementCount,
    };
}

#if LAB_CHECKPOINT >= 2
inline CapabilityReport validateCapabilities(
    const ComputeLimits& limits,
    const DispatchPlan& plan
) {
    const bool versionSupported =
        limits.majorVersion > 4 ||
        (limits.majorVersion == 4 && limits.minorVersion >= 3);
    const std::int64_t requiredBytes =
        static_cast<std::int64_t>(plan.elementCount * sizeof(Vec4));
    return {
        versionSupported,
        plan.localSize > 0 &&
            int(plan.localSize) <= limits.maximumWorkgroupSize[0] &&
            int(plan.localSize) <= limits.maximumInvocations,
        int(plan.workgroupCount) <= limits.maximumWorkgroupCount[0],
        requiredBytes <= limits.maximumShaderStorageBlockBytes,
    };
}
#endif

#endif

#if LAB_CHECKPOINT >= 7

struct OutputValidationReport {
    bool sameSize{};
    bool allFinite{};
    std::size_t mismatchCount{};
    std::size_t firstMismatch{std::numeric_limits<std::size_t>::max()};
    float maximumAbsoluteError{};

    bool allPassed() const {
        return sameSize && allFinite && mismatchCount == 0;
    }
};

inline bool finite(const Vec4& value) {
    return std::isfinite(value.x) &&
        std::isfinite(value.y) &&
        std::isfinite(value.z) &&
        std::isfinite(value.w);
}

inline OutputValidationReport validateOutput(
    const std::vector<Vec4>& expected,
    const std::vector<Vec4>& actual,
    float absoluteTolerance = 2.0e-6F,
    float relativeTolerance = 2.0e-6F
) {
    OutputValidationReport report{};
    report.sameSize = expected.size() == actual.size();
    report.allFinite = true;
    const std::size_t count = std::min(expected.size(), actual.size());
    for (std::size_t index = 0; index < count; ++index) {
        const std::array<float, 4> expectedComponents{
            expected[index].x,
            expected[index].y,
            expected[index].z,
            expected[index].w,
        };
        const std::array<float, 4> actualComponents{
            actual[index].x,
            actual[index].y,
            actual[index].z,
            actual[index].w,
        };
        bool elementMatches = true;
        for (std::size_t component = 0; component < 4; ++component) {
            const float expectedValue = expectedComponents[component];
            const float actualValue = actualComponents[component];
            if (!std::isfinite(expectedValue) || !std::isfinite(actualValue)) {
                report.allFinite = false;
                elementMatches = false;
                continue;
            }
            const float error = std::abs(expectedValue - actualValue);
            report.maximumAbsoluteError = std::max(report.maximumAbsoluteError, error);
            const float scale = std::max(std::abs(expectedValue), std::abs(actualValue));
            if (error > absoluteTolerance + relativeTolerance * scale) {
                elementMatches = false;
            }
        }
        if (!elementMatches) {
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
    return report;
}

#endif

#if LAB_CHECKPOINT >= 8

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
