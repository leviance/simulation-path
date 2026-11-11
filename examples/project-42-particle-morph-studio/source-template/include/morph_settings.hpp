#pragma once

#include "surface_sampler.hpp"
#include "morph_timeline.hpp"
#include <limits>

namespace morph {

#if LAB_CHECKPOINT >= 10
constexpr std::uint32_t maximumCount = 5000000;
constexpr std::uint32_t defaultCount = 1000003;
#elif LAB_CHECKPOINT >= 8
constexpr std::uint32_t maximumCount = 1000003;
constexpr std::uint32_t defaultCount = 100003;
#elif LAB_CHECKPOINT >= 6
constexpr std::uint32_t maximumCount = 65536;
constexpr std::uint32_t defaultCount = 8192;
#else
constexpr std::uint32_t maximumCount = 8192;
constexpr std::uint32_t defaultCount = 2048;
#endif

struct Settings {
    Shape source{Shape::sphere};
#if LAB_CHECKPOINT >= 4
    Shape target{Shape::knot};
#else
    Shape target{Shape::torus};
#endif
    std::uint32_t count{defaultCount};
    std::uint32_t seed{42};
#if LAB_CHECKPOINT >= 2
    Sampling sampling{Sampling::area};
#else
    Sampling sampling{Sampling::triangleBiased};
#endif
    bool operator==(const Settings &) const = default;
};

inline void validateSettings(const Settings &settings) {
    if (settings.count == 0 || settings.count > maximumCount)
        throw std::invalid_argument("N is outside this checkpoint's declared range");
    if (settings.source < Shape::sphere || settings.source > Shape::knot || settings.target < Shape::sphere || settings.target > Shape::knot)
        throw std::invalid_argument("Unknown source or target shape");
    if (settings.sampling != Sampling::area && settings.sampling != Sampling::triangleBiased)
        throw std::invalid_argument("Unknown sampling mode");
}

struct MemoryPlan {
    std::uint64_t sourceBytes{};
    std::uint64_t targetBytes{};
    std::uint64_t currentBytes{};
    std::uint64_t pathBytes{};
    std::uint64_t mappingBytes{};
    std::uint64_t gpuPeakBytes{};
    std::uint64_t cpuPeakBytes{};
};

inline MemoryPlan planMemory(std::uint32_t count, std::uint32_t activeCount = 0) {
    if (count == 0 || count > maximumCount)
        throw std::invalid_argument("Cannot preflight an unsupported particle count");
    const std::uint64_t n = count;
    MemoryPlan plan{16 * n, 16 * n, 16 * (n + 1), 16 * n, 8 * n};
    const std::uint64_t candidate = plan.sourceBytes + plan.targetBytes + plan.currentBytes + plan.pathBytes + plan.mappingBytes;
    // ACTIVE and candidate coexist. Allow staging, histogram, mesh, and renderer overhead.
    plan.gpuPeakBytes = candidate + 72ULL * activeCount + 16 + 32ULL * 1024 * 1024;
    plan.cpuPeakBytes = 64 * n + 56ULL * activeCount + 8ULL * 1024 * 1024;
    constexpr std::uint64_t budget = 768ULL * 1024 * 1024;
    if (plan.gpuPeakBytes > budget || plan.cpuPeakBytes > budget)
        throw std::invalid_argument("Candidate plus ACTIVE exceeds the application memory budget");
    return plan;
}

} // namespace morph
