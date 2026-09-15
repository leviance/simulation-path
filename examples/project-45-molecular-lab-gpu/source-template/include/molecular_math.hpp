#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

namespace molecular {

// Mỗi phần tử khớp một vec4 trong std430, không phụ thuộc alignment của Vec2.
struct alignas(16) Float4 {
    float x = 0;
    float y = 0;
    float z = 0;
    float w = 0;
};

static_assert(sizeof(Float4) == 16);
static_assert(alignof(Float4) == 16);

constexpr std::uint32_t cellCapacity = 16;
constexpr std::uint32_t groupSize = 256;
constexpr std::uint32_t cheapBatch = 65536;
constexpr std::uint32_t forceBatch = 2048;
constexpr float cutoff = 2.5F;
constexpr float skin = 0.4F;
constexpr float timeStep = 0.001F;
constexpr std::uint64_t residentBudget = 1024ULL * 1024 * 1024;
constexpr std::uint64_t peakBudget = 1536ULL * 1024 * 1024;

inline std::uint32_t ceilDivide(std::uint32_t count, std::uint32_t span) {
    return count / span + static_cast<std::uint32_t>(count % span != 0);
}

struct Plan {
    std::uint32_t count = 0;
    std::uint32_t columns = 0;
    std::uint32_t rows = 0;
    std::uint32_t cellsX = 0;
    std::uint32_t cellsY = 0;
    std::uint32_t cells = 0;
    float width = 0;
    float height = 0;
    std::uint64_t particleBytes = 0;
    std::uint64_t indexBytes = 0;
    std::uint64_t reductionBytes = 0;
    std::uint64_t largestBlock = 0;
    std::uint64_t residentBytes = 0;
};

inline Plan makePlan(std::uint32_t count) {
    if (count < 2 || count > 5000000) {
        throw std::invalid_argument("Particle count must be in [2, 5000000].");
    }
    Plan plan{};
    plan.count = count;
    plan.columns = static_cast<std::uint32_t>(std::ceil(std::sqrt(static_cast<double>(count))));
    plan.rows = ceilDivide(count, plan.columns);
    plan.width = std::max(12.0F, static_cast<float>(plan.columns) * 1.6F);
    plan.height = std::max(12.0F, static_cast<float>(plan.rows) * 1.6F);
    plan.cellsX = static_cast<std::uint32_t>(std::floor(plan.width / (cutoff + skin)));
    plan.cellsY = static_cast<std::uint32_t>(std::floor(plan.height / (cutoff + skin)));
    plan.cells = plan.cellsX * plan.cellsY;
    plan.particleBytes = static_cast<std::uint64_t>(count) * sizeof(Float4);
    plan.indexBytes = static_cast<std::uint64_t>(plan.cells) * cellCapacity * sizeof(std::uint32_t);
    plan.reductionBytes = static_cast<std::uint64_t>(ceilDivide(count, groupSize)) * sizeof(Float4);
    plan.largestBlock = std::max(plan.particleBytes, plan.indexBytes);
    // Hai bank p/v/f, mốc reference, bucket indices/counts, hai scratch và control.
    plan.residentBytes = 7 * plan.particleBytes + plan.indexBytes + 4ULL * plan.cells + 2 * plan.reductionBytes + 16;
    return plan;
}

struct Limits {
    std::uint64_t maximumBlockBytes = 0;
    int storageBindings = 0;
    int computeBlocks = 0;
    int vertexBlocks = 0;
    int invocations = 0;
    int groupSizeX = 0;
    int groupCountX = 0;
    int sharedBytes = 0;
};

inline std::string rejectPlan(const Plan& plan, const Limits& limits, std::uint64_t oldResidentBytes = 0) {
    if (limits.storageBindings < 8 || limits.computeBlocks < 8 || limits.vertexBlocks < 2) {
        return "Need 8 SSBO bindings / compute blocks and 2 vertex blocks.";
    }
    if (limits.invocations < 256 || limits.groupSizeX < 256 || limits.groupCountX < 256 || limits.sharedBytes < 4096) {
        return "Compute workgroup or shared-memory limits are insufficient.";
    }
    if (plan.largestBlock > limits.maximumBlockBytes) {
        return "One SSBO exceeds GL_MAX_SHADER_STORAGE_BLOCK_SIZE.";
    }
    if (plan.residentBytes > residentBudget || plan.residentBytes + oldResidentBytes > peakBudget) {
        return "Resident or replacement peak exceeds the application's memory budget.";
    }
    return {};
}

inline std::uint32_t mixBits(std::uint32_t value) {
    value ^= value >> 16;
    value *= 0x7feb352dU;
    value ^= value >> 15;
    value *= 0x846ca68bU;
    return value ^ (value >> 16);
}

inline Float4 initialPosition(const Plan& plan, std::uint32_t index) {
    return {(static_cast<float>(index % plan.columns) + 0.5F) * 1.6F, (static_cast<float>(index / plan.columns) + 0.5F) * 1.6F, 0, 0};
}

inline Float4 initialVelocity(std::uint32_t count, std::uint32_t index) {
    if (count % 2 != 0 && index + 1 == count) {
        return {};
    }
    const auto bits = mixBits(index / 2 + 45U);
    float x = (static_cast<float>(bits & 65535U) / 65535.0F - 0.5F) * 0.2F;
    float y = (static_cast<float>(bits >> 16) / 65535.0F - 0.5F) * 0.2F;
    if (index % 2 != 0) {
        x = -x;
        y = -y;
    }
    return {x, y, 0, 0};
}

struct DriftAxis {
    float position = 0;
    float displacement = 0;
    float residual = 0;
};

// Giữ phần dịch chuyển chưa biểu diễn được ở tọa độ float lớn, kể cả khi wrap.
inline DriftAxis compensatedDrift(float position, float displacement, float residual, float extent) {
    const float corrected = displacement + residual;
    const float moved = position + corrected;
    float turns = std::floor(moved / extent);
    float wrapped = moved - extent * turns;
    if (wrapped >= extent) {
        wrapped = 0;
        turns += 1;
    }
    const float applied = (wrapped - position) + turns * extent;
    return {wrapped, applied, corrected - applied};
}

inline double minimumImage(double delta, double extent) {
    return delta - extent * std::floor(delta / extent + 0.5);
}

struct PairValue {
    double potential = 0;
    double slope = 0;
};

inline PairValue rawPair(double radius) {
    const double inverse2 = 1.0 / (radius * radius);
    const double inverse6 = inverse2 * inverse2 * inverse2;
    return {4.0 * (inverse6 * inverse6 - inverse6), 24.0 * (inverse6 - 2.0 * inverse6 * inverse6) / radius};
}

inline PairValue shiftedPair(double radius) {
    if (radius >= cutoff) {
        return {};
    }
    const auto value = rawPair(radius);
    const auto edge = rawPair(cutoff);
    return {value.potential - edge.potential - (radius - cutoff) * edge.slope, value.slope - edge.slope};
}

// Oracle double chỉ dành cho ca nhỏ. Không gọi N² trên các preset lớn.
inline std::vector<Float4> referenceForces(const Plan& plan, const std::vector<Float4>& positions) {
    if (positions.size() != plan.count || plan.count > 1024) {
        throw std::invalid_argument("The CPU oracle is limited to 1024 particles.");
    }
    std::vector<Float4> forces(plan.count);
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        double forceX = 0;
        double forceY = 0;
        double potential = 0;
        for (std::uint32_t j = 0; j < plan.count; ++j) {
            if (i == j) {
                continue;
            }
            const double dx = minimumImage(static_cast<double>(positions[j].x) - positions[i].x, plan.width);
            const double dy = minimumImage(static_cast<double>(positions[j].y) - positions[i].y, plan.height);
            const double radius = std::hypot(dx, dy);
            if (!std::isfinite(radius) || radius < 0.5) {
                throw std::runtime_error("Invalid separation in CPU oracle.");
            }
            const auto pair = shiftedPair(radius);
            forceX += pair.slope * dx / radius;
            forceY += pair.slope * dy / radius;
            potential += 0.5 * pair.potential;
        }
        forces[i] = {static_cast<float>(forceX), static_cast<float>(forceY), static_cast<float>(potential), 0};
    }
    return forces;
}

inline bool closeEnough(double actual, double expected) {
    return std::isfinite(actual) && std::abs(actual - expected) <= 0.002 + 0.002 * std::abs(expected);
}

} // namespace molecular
