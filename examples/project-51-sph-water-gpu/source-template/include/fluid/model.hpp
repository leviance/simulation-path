#pragma once
#include "fluid/math.hpp"
#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 13
#endif

namespace water51 {
#if LAB_CHECKPOINT == 0
inline constexpr int lessonStage = 0;
#elif LAB_CHECKPOINT == 1
inline constexpr int lessonStage = 1;
#elif LAB_CHECKPOINT == 2
inline constexpr int lessonStage = 2;
#elif LAB_CHECKPOINT == 3
inline constexpr int lessonStage = 3;
#elif LAB_CHECKPOINT == 4
inline constexpr int lessonStage = 4;
#elif LAB_CHECKPOINT == 5
inline constexpr int lessonStage = 5;
#elif LAB_CHECKPOINT == 6
inline constexpr int lessonStage = 6;
#elif LAB_CHECKPOINT == 7
inline constexpr int lessonStage = 7;
#elif LAB_CHECKPOINT == 8
inline constexpr int lessonStage = 8;
#elif LAB_CHECKPOINT == 9
inline constexpr int lessonStage = 9;
#elif LAB_CHECKPOINT == 10
inline constexpr int lessonStage = 10;
#elif LAB_CHECKPOINT == 11
inline constexpr int lessonStage = 11;
#elif LAB_CHECKPOINT == 12
inline constexpr int lessonStage = 12;
#elif LAB_CHECKPOINT == 13
inline constexpr int lessonStage = 13;
#endif
inline constexpr Vec3 tank{1.65, 0.825, 1.1};
inline constexpr double referenceDensity = 1000;
inline constexpr double blockWidth = 0.55;
inline constexpr double maximumDt = 0.00075;
inline constexpr std::size_t bufferBudget = 192ULL * 1024 * 1024;
enum class Preset {
    Dam,
    Pool,
    Obstacle
};

struct Parameters {
    float soundSpeed = 18;
    float alpha = 0.25f;
    float gravity = 9.81f;
};

struct Body {
    bool enabled = false;
    Vec3 position{0.92, 0.22, 0.55};
    Vec3 target = position;
    Vec3 velocity{};
    double radius = 0.14;
};

// [snippet layout]
// The GPU buffer has vec4 records, not packed C++ Vec3 objects.
struct alignas(16) Float4 {
    float x = 0;
    float y = 0;
    float z = 0;
    float w = 0;
};

struct alignas(8) DensityPressure {
    float density = 0;
    float pressure = 0;
};

static_assert(sizeof(Float4) == 16);
static_assert(sizeof(DensityPressure) == 8);

// [/snippet layout]

struct Model {
    int side = 48;
    std::uint32_t count = 110592;
    float spacing = static_cast<float>(blockWidth / 48);
    float h = 1.3f * spacing;
    float mass = static_cast<float>(referenceDensity) * spacing * spacing * spacing;
    std::array<int, 3> cells{};
    std::uint32_t cellCount = 0;
    Preset preset = Preset::Dam;
};

inline std::size_t checkedProduct(std::size_t a, std::size_t b) {
    if (b != 0 && a > std::numeric_limits<std::size_t>::max() / b)
        throw std::overflow_error("Allocation size overflow");
    return a * b;
}

// [snippet model]
inline Model makeModel(int side, Preset preset = Preset::Dam, std::uint32_t partialCount = 0) {
    if (side < 4 || side > 100 || side % 4 != 0)
        throw std::invalid_argument("Side must be a multiple of four in [4,100]");
    Model model;
    model.side = side;
    model.count = static_cast<std::uint32_t>(side * side * side);
    if (partialCount > model.count)
        throw std::invalid_argument("Fixture exceeds its lattice");
    if (partialCount > 0)
        model.count = partialCount;
    model.spacing = static_cast<float>(blockWidth / side);
    model.h = 1.3f * model.spacing;
    model.mass = static_cast<float>(referenceDensity) * model.spacing * model.spacing * model.spacing;
    model.preset = preset;
    std::size_t cellCount = 1;
    for (int axis = 0; axis < 3; ++axis) {
        model.cells[axis] = static_cast<int>(std::ceil(tank[axis] / (2 * model.h)));
        cellCount = checkedProduct(cellCount, static_cast<std::size_t>(model.cells[axis]));
    }
    if (cellCount > 2000000)
        throw std::length_error("Grid budget exceeded");
    model.cellCount = static_cast<std::uint32_t>(cellCount);
    return model;
}

// [/snippet model]

// [snippet parameter-bounds]
inline void validate(const Parameters& p) {
    if (!std::isfinite(p.soundSpeed) || p.soundSpeed < 10 || p.soundSpeed > 40 || !std::isfinite(p.alpha) || p.alpha < 0 || p.alpha > 1 || !std::isfinite(p.gravity) || p.gravity < 0 || p.gravity > 20) {
        throw std::invalid_argument("c=10..40 m/s, alpha=0..1, gravity=0..20 m/s2");
    }
}

// [/snippet parameter-bounds]

// [snippet seed-point]
inline Vec3 seedPoint(const Model& m, std::uint32_t id) {
    if (id >= m.count)
        throw std::out_of_range("Seed id");
    int nx = m.side;
    int ny = m.side;
    Vec3 origin{0, 0, blockWidth / 2};
    if (m.preset == Preset::Pool) {
        nx = 2 * m.side;
        ny = m.side / 4;
        origin = {blockWidth / 2, 0, 0};
    }
    const int x = static_cast<int>(id) % nx;
    const int y = (static_cast<int>(id) / nx) % ny;
    const int z = static_cast<int>(id) / (nx * ny);
    return {origin.x + (x + 0.5) * m.spacing, origin.y + (y + 0.5) * m.spacing, origin.z + (z + 0.5) * m.spacing};
}

// [/snippet seed-point]

// [snippet memory-plan]
inline std::size_t plannedBytes(const Model& m) {
    // Three banks keep the committed scene untouched while a finite batch is pending.
    const auto particles = checkedProduct(m.count, 3 * (2 * sizeof(Float4) + sizeof(DensityPressure)) + sizeof(Float4) + sizeof(std::uint32_t));
    const auto grid = checkedProduct(m.cellCount + 1, 4 * sizeof(std::uint32_t));
    const auto reductions = checkedProduct((m.count + 127) / 128, 2 * sizeof(Float4));
    return particles + grid + reductions + 4096;
}

// [/snippet memory-plan]
} // namespace water51
