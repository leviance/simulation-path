#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

namespace lab {

#if LAB_CHECKPOINT >= 1
// Các hằng số này giữ bản cập nhật CPU nhất quán với shader và tests ở các bài sau.
constexpr std::uint32_t kParticleSeed = 0x38c0ffeeU;
#if LAB_CHECKPOINT >= 3
constexpr std::uint32_t kLocalSize = 256U;
#endif
constexpr float kGravity = -9.81F;
constexpr float kFloorY = -2.0F;
constexpr float kMaximumFrameDt = 1.0F / 30.0F;
constexpr float kSingleStepDt = 1.0F / 120.0F;

struct alignas(16) Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

struct alignas(16) Particle {
    Vec4 positionAge{};
    Vec4 velocityLife{};
};

// Layout checks làm sai lệch C++/std430 dừng ngay từ lúc compile.
static_assert(sizeof(Vec4) == 16);
static_assert(alignof(Vec4) == 16);
static_assert(sizeof(Particle) == 32);
static_assert(alignof(Particle) == 16);
static_assert(offsetof(Particle, velocityLife) == 16);

#if LAB_CHECKPOINT >= 3
struct DispatchPlan {
    std::size_t particleCount{};
    std::uint32_t localSize{};
    std::size_t workgroupCount{};
    std::size_t launchedInvocations{};
    std::size_t unusedInvocations{};
};

struct ComputeLimits {
    int majorVersion{};
    int minorVersion{};
    int maximumWorkgroupCountX{};
    int maximumWorkgroupSizeX{};
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

#if LAB_CHECKPOINT >= 9
struct ParticleValidationReport {
    bool sameSize{};
    bool allFinite{true};
    std::size_t mismatchCount{};
    std::size_t firstMismatch{std::numeric_limits<std::size_t>::max()};
    float maximumAbsoluteError{};

    bool passed() const {
        return sameSize && allFinite && mismatchCount == 0U;
    }
};
#endif

#if LAB_CHECKPOINT >= 2
inline std::uint32_t mixBits(std::uint32_t value) {
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    value ^= value >> 16U;
    return value;
}

// Hash theo index/channel giúp CPU và GPU tái tạo cùng particle mà không chia sẻ RNG state.
inline float random01(
    std::size_t index,
    std::uint32_t channel,
    std::uint32_t seed = kParticleSeed
) {
    const std::uint32_t lowIndex = static_cast<std::uint32_t>(index);
    const std::uint32_t bits = mixBits(lowIndex ^ (channel * 0x9e3779b9U) ^ seed);
    return static_cast<float>(bits & 0x00ffffffU) / 16777215.0F;
}

inline Particle makeSpawnParticle(
    std::size_t index,
    std::uint32_t spawnEpoch,
    std::uint32_t seed = kParticleSeed
) {
    const std::uint32_t epochSeed = seed ^ mixBits(spawnEpoch + 0x632be59bU);
    const float emitterX = -0.32F + random01(index, 0U, epochSeed) * 0.64F;
    const float velocityX = -1.45F + random01(index, 1U, epochSeed) * 2.90F;
    const float velocityY = 5.7F + random01(index, 2U, epochSeed) * 4.6F;
    const float lifetime = 1.8F + random01(index, 3U, epochSeed) * 2.8F;

    Particle particle{};
    particle.positionAge = {emitterX, 0.0F, 0.0F, 0.0F};
    particle.velocityLife = {velocityX, velocityY, 0.0F, lifetime};
    return particle;
}
#else
inline Particle makeSpawnParticle(
    std::size_t index,
    std::uint32_t spawnEpoch,
    std::uint32_t seed = kParticleSeed
) {
    (void)spawnEpoch;
    (void)seed;
    const float lane = static_cast<float>(index % 9U) / 8.0F;

    Particle particle{};
    particle.positionAge = {-0.32F + lane * 0.64F, 0.0F, 0.0F, 0.0F};
    particle.velocityLife = {-1.0F + lane * 2.0F, 7.0F, 0.0F, 2.5F};
    return particle;
}
#endif

inline Particle makeInitialParticle(
    std::size_t index,
    std::uint32_t seed = kParticleSeed
) {
    Particle particle = makeSpawnParticle(index, 0U, seed);
#if LAB_CHECKPOINT >= 2
    const float ageFraction = random01(index, 4U, seed) * 0.92F;
    const float age = particle.velocityLife.w * ageFraction;

    particle.positionAge.x += particle.velocityLife.x * age;
    particle.positionAge.y +=
        particle.velocityLife.y * age + 0.5F * kGravity * age * age;
    particle.velocityLife.y += kGravity * age;
    particle.positionAge.w = age;
#endif
    return particle;
}

inline std::vector<Particle> makeInitialParticles(
    std::size_t count,
    std::uint32_t seed = kParticleSeed
) {
    std::vector<Particle> particles(count);
    for (std::size_t index = 0; index < count; ++index) {
        particles[index] = makeInitialParticle(index, seed);
    }
    return particles;
}

inline Particle stepParticleCpu(
    Particle particle,
    std::size_t index,
    float dt,
    float gravity,
    std::uint32_t spawnEpoch,
    std::uint32_t seed = kParticleSeed
) {
    if (!(dt > 0.0F) || !std::isfinite(dt)) {
        return particle;
    }

    particle.velocityLife.y += gravity * dt;
    particle.positionAge.x += particle.velocityLife.x * dt;
    particle.positionAge.y += particle.velocityLife.y * dt;
    particle.positionAge.z += particle.velocityLife.z * dt;
    particle.positionAge.w += dt;

    const bool lifetimeEnded = particle.positionAge.w >= particle.velocityLife.w;
    const bool fellBelowFloor = particle.positionAge.y < kFloorY;
    if (lifetimeEnded || fellBelowFloor) {
        return makeSpawnParticle(index, spawnEpoch, seed);
    }

    return particle;
}
#endif

#if LAB_CHECKPOINT >= 3
inline DispatchPlan makeDispatchPlan(
    std::size_t particleCount,
    std::uint32_t localSize = kLocalSize
) {
    DispatchPlan plan{};
    plan.particleCount = particleCount;
    plan.localSize = localSize;
    if (particleCount == 0U || localSize == 0U) {
        return plan;
    }

    plan.workgroupCount = 1U + (particleCount - 1U) / std::size_t(localSize);
    plan.launchedInvocations = plan.workgroupCount * std::size_t(localSize);
    plan.unusedInvocations = plan.launchedInvocations - particleCount;
    return plan;
}

inline std::size_t particleStorageBytes(std::size_t particleCount) {
    if (particleCount > std::numeric_limits<std::size_t>::max() / sizeof(Particle)) {
        return std::numeric_limits<std::size_t>::max();
    }
    return particleCount * sizeof(Particle);
}

inline CapabilityReport validateCapabilities(
    const ComputeLimits& limits,
    const DispatchPlan& plan
) {
    CapabilityReport report{};
    report.version43OrNewer = limits.majorVersion > 4 ||
        (limits.majorVersion == 4 && limits.minorVersion >= 3);
    report.localSizeSupported =
        limits.maximumWorkgroupSizeX >= static_cast<int>(plan.localSize) &&
        limits.maximumInvocations >= static_cast<int>(plan.localSize);
    report.groupCountSupported = plan.workgroupCount <=
        static_cast<std::size_t>(std::max(0, limits.maximumWorkgroupCountX));
    report.storageBlockLargeEnough = particleStorageBytes(plan.particleCount) <=
        static_cast<std::size_t>(std::max<std::int64_t>(0, limits.maximumShaderStorageBlockBytes));
    return report;
}

inline std::size_t chooseLargestSupportedCount(
    const ComputeLimits& limits,
    const std::vector<std::size_t>& ascendingPresets
) {
    for (auto iterator = ascendingPresets.rbegin(); iterator != ascendingPresets.rend(); ++iterator) {
        const DispatchPlan plan = makeDispatchPlan(*iterator);
        if (validateCapabilities(limits, plan).allPassed()) {
            return *iterator;
        }
    }
    return 0U;
}
#endif

#if LAB_CHECKPOINT >= 7
inline float selectSimulationDt(float rawDt, bool paused, bool singleStepRequested) {
    if (singleStepRequested) {
        return kSingleStepDt;
    }
    if (paused || !std::isfinite(rawDt) || rawDt <= 0.0F) {
        return 0.0F;
    }
    return std::min(rawDt, kMaximumFrameDt);
}
#endif

#if LAB_CHECKPOINT >= 9
inline void compareFloat(
    float expected,
    float actual,
    float absoluteTolerance,
    float relativeTolerance,
    bool& particleMatches,
    ParticleValidationReport& report
) {
    if (!std::isfinite(expected) || !std::isfinite(actual)) {
        report.allFinite = false;
        particleMatches = false;
        return;
    }

    const float error = std::abs(expected - actual);
    report.maximumAbsoluteError = std::max(report.maximumAbsoluteError, error);
    const float scale = std::max(std::abs(expected), std::abs(actual));
    if (error > absoluteTolerance + relativeTolerance * scale) {
        particleMatches = false;
    }
}

inline ParticleValidationReport validateParticles(
    const std::vector<Particle>& expected,
    const std::vector<Particle>& actual,
    float absoluteTolerance = 3.0e-5F,
    float relativeTolerance = 3.0e-5F
) {
    ParticleValidationReport report{};
    report.sameSize = expected.size() == actual.size();
    const std::size_t count = std::min(expected.size(), actual.size());

    for (std::size_t index = 0; index < count; ++index) {
        const float expectedValues[8] = {
            expected[index].positionAge.x,
            expected[index].positionAge.y,
            expected[index].positionAge.z,
            expected[index].positionAge.w,
            expected[index].velocityLife.x,
            expected[index].velocityLife.y,
            expected[index].velocityLife.z,
            expected[index].velocityLife.w,
        };
        const float actualValues[8] = {
            actual[index].positionAge.x,
            actual[index].positionAge.y,
            actual[index].positionAge.z,
            actual[index].positionAge.w,
            actual[index].velocityLife.x,
            actual[index].velocityLife.y,
            actual[index].velocityLife.z,
            actual[index].velocityLife.w,
        };

        bool particleMatches = true;
        for (int component = 0; component < 8; ++component) {
            compareFloat(
                expectedValues[component],
                actualValues[component],
                absoluteTolerance,
                relativeTolerance,
                particleMatches,
                report
            );
        }
        if (!particleMatches) {
            if (report.firstMismatch == std::numeric_limits<std::size_t>::max()) {
                report.firstMismatch = index;
            }
            ++report.mismatchCount;
        }
    }

    if (!report.sameSize) {
        if (report.firstMismatch == std::numeric_limits<std::size_t>::max()) {
            report.firstMismatch = count;
        }
        const std::size_t longer = std::max(expected.size(), actual.size());
        report.mismatchCount += longer - count;
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
    if (samples.size() % 2U == 1U) {
        return samples[middle];
    }
    return (samples[middle - 1U] + samples[middle]) * 0.5;
}
#endif

} // namespace lab
