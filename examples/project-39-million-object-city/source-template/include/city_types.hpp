#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <string>
#include <vector>

namespace city {

struct Vec3 {
    float x{}, y{}, z{};
};

struct alignas(16) Vec4 {
    float x{}, y{}, z{}, w{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 value, float scale) {
    return {value.x * scale, value.y * scale, value.z * scale};
}

inline float dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline float length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline Vec3 normalized(Vec3 value) {
    const float magnitude = length(value);
    if (!(magnitude > 1.0e-8F) || !std::isfinite(magnitude)) {
        return {};
    }
    return value * (1.0F / magnitude);
}

inline bool finite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}

using Frustum = std::array<Vec4, 6>;
using Counts = std::array<std::uint32_t, 4>;

// Three 16-byte rows match the GLSL std430 Object declaration exactly.
struct alignas(16) Object {
    Vec4 centerRadius{};
    float halfX{}, halfY{}, halfZ{};
    std::uint32_t mesh{};
    float red{}, green{}, blue{};
    std::uint32_t id{};
};

static_assert(sizeof(Object) == 48);
static_assert(offsetof(Object, halfX) == 16);
static_assert(offsetof(Object, mesh) == 28);
static_assert(offsetof(Object, id) == 44);

struct IndirectCommand {
    std::uint32_t count{};
    std::uint32_t instanceCount{};
    std::uint32_t firstIndex{};
    std::int32_t baseVertex{};
    std::uint32_t baseInstance{};
};

static_assert(sizeof(IndirectCommand) == 20);

// Empty accepted sets keep +/-infinity distances and UINT_MAX/0 ID bounds.
// The UI labels that case "empty" instead of displaying a fictitious distance.
struct alignas(16) GpuStats {
    Counts counts{};
    float minimumDistance{std::numeric_limits<float>::infinity()};
    float maximumDistance{-std::numeric_limits<float>::infinity()};
    std::uint32_t tested{};
    std::uint32_t padding{};
    Counts integerStats{0U, std::numeric_limits<std::uint32_t>::max(), 0U, 0U};
};

static_assert(sizeof(GpuStats) == 48);
static_assert(offsetof(GpuStats, integerStats) == 32);

inline constexpr std::size_t kWorkgroupSize = 256;
inline constexpr std::size_t kScanSpan = 512;
inline constexpr std::size_t kMaximumObjects = 2'000'003;
inline constexpr std::array<std::uint32_t, 3> kMeshIndexCounts{36U, 36U, 18U};
inline constexpr std::array<std::uint32_t, 3> kMeshFirstIndices{0U, 36U, 72U};

inline std::size_t ceilDiv(std::size_t count, std::size_t span) {
    return count / span + static_cast<std::size_t>(count % span != 0);
}

inline Vec3 center(const Object& object) {
    return {object.centerRadius.x, object.centerRadius.y, object.centerRadius.z};
}

inline bool validObject(const Object& object) {
    const bool dimensions = object.halfX > 0.0F && object.halfY > 0.0F && object.halfZ > 0.0F;
    const bool validDimensions = finite({object.halfX, object.halfY, object.halfZ});
    const float enclosingRadius = length({object.halfX, object.halfY, object.halfZ});
    const bool radius = std::isfinite(object.centerRadius.w) && object.centerRadius.w + 1.0e-5F >= enclosingRadius;
    return finite(center(object)) && finite({object.red, object.green, object.blue}) && dimensions && validDimensions && radius && object.mesh < 3U;
}

inline float planeDistance(Vec4 plane, Vec3 point) {
    return plane.x * point.x + plane.y * point.y + plane.z * point.z + plane.w;
}

// Inward normalized planes: a sphere is outside only beyond a whole radius.
inline int rejectingPlane(const Frustum& planes, const Object& object) {
    for (std::size_t index = 0; index < planes.size(); ++index) {
        if (planeDistance(planes[index], center(object)) < -object.centerRadius.w) {
            return static_cast<int>(index);
        }
    }
    return -1;
}

inline bool sphereAccepted(const Frustum& planes, const Object& object) {
    return rejectingPlane(planes, object) < 0;
}

inline GpuStats cpuStatistics(std::span<const Object> objects, const Frustum& planes, Vec3 eye, bool culling) {
    GpuStats result{};
    result.tested = static_cast<std::uint32_t>(objects.size());
    for (const Object& object : objects) {
        if (culling && !sphereAccepted(planes, object)) {
            continue;
        }
        ++result.counts[object.mesh];
        ++result.counts[3];
        const float distance = length(center(object) - eye);
        result.minimumDistance = std::min(result.minimumDistance, distance);
        result.maximumDistance = std::max(result.maximumDistance, distance);
        ++result.integerStats[0];
        result.integerStats[1] = std::min(result.integerStats[1], object.id);
        result.integerStats[2] = std::max(result.integerStats[2], object.id);
        ++result.integerStats[3];
    }
    return result;
}

// Sequential CPU oracle: unlike Blelloch, this code never traverses a tree.
inline std::vector<Counts> cpuExclusiveScan(std::span<const Counts> input) {
    std::vector<Counts> output(input.size());
    Counts running{};
    for (std::size_t index = 0; index < input.size(); ++index) {
        output[index] = running;
        for (std::size_t channel = 0; channel < running.size(); ++channel) {
            running[channel] += input[index][channel];
        }
    }
    return output;
}

inline bool scanInputFits(std::span<const Counts> input) {
    std::array<std::uint64_t, 4> totals{};
    for (const Counts& value : input) {
        for (std::size_t channel = 0; channel < totals.size(); ++channel) {
            totals[channel] += value[channel];
            if (totals[channel] > std::numeric_limits<std::uint32_t>::max()) {
                return false;
            }
        }
    }
    return true;
}

inline std::vector<std::uint32_t> cpuVisibleIDs(std::span<const Object> objects, const Frustum& planes, bool culling) {
    std::vector<std::uint32_t> result{};
    // Group-major, then ascending record index. The stable object ID can be sparse.
    for (std::uint32_t group = 0; group < 3U; ++group) {
        for (std::size_t index = 0; index < objects.size(); ++index) {
            const Object& object = objects[index];
            if (object.mesh == group && (!culling || sphereAccepted(planes, object))) {
                result.push_back(static_cast<std::uint32_t>(index));
            }
        }
    }
    return result;
}

inline std::array<IndirectCommand, 3> makeCommands(Counts counts) {
    std::array<IndirectCommand, 3> commands{};
    for (std::size_t group = 0; group < commands.size(); ++group) {
        commands[group].count = kMeshIndexCounts[group];
        commands[group].instanceCount = counts[group];
        commands[group].firstIndex = kMeshFirstIndices[group];
    }
    return commands;
}

struct IntegerReduction {
    std::uint64_t sum{};
    std::uint32_t minimum{std::numeric_limits<std::uint32_t>::max()};
    std::uint32_t maximum{};
};

inline IntegerReduction cpuIntegerReduction(std::span<const std::uint32_t> input) {
    IntegerReduction result{};
    for (const std::uint32_t value : input) {
        result.sum += value;
        result.minimum = std::min(result.minimum, value);
        result.maximum = std::max(result.maximum, value);
    }
    return result;
}

// Distances have world units; integer counts/offsets are always exact.
inline bool distanceMatches(float actual, float expected) {
    if (!std::isfinite(expected)) {
        return actual == expected;
    }
    if (!std::isfinite(actual)) {
        return false;
    }
    return std::abs(actual - expected) <= 0.002F + 2.0e-5F * std::abs(expected);
}

struct GpuSnapshot {
    GpuStats stats{};
    std::array<IndirectCommand, 3> commands{};
    std::vector<Counts> masks{};
    std::vector<Counts> prefixes{};
    std::vector<std::uint32_t> visibleIDs{};
};

} // namespace city
