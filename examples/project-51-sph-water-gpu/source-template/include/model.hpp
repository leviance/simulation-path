#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <numbers>
#include <stdexcept>
#include <vector>

namespace water3 {
// CPU oracle uses double; GPU packets use four floats with an explicit 16-byte layout.
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;
};

struct alignas(16) Float4 {
    float x = 0;
    float y = 0;
    float z = 0;
    float w = 0;
};

static_assert(sizeof(Float4) == 16 && alignof(Float4) == 16);

inline Vec3 xyz(Float4 p) {
    return {p.x, p.y, p.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline double length(Vec3 p) {
    return std::sqrt(dot(p, p));
}

inline bool finite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

inline constexpr double restDensity = 1000;
inline constexpr double maxDt = 0.0005;
inline constexpr std::uint32_t candidateBudget = 4096;

inline std::uint32_t ceilDivide(std::uint32_t n, std::uint32_t block) {
    return (n + block - 1) / block;
}

struct ScanLevel {
    std::uint32_t input = 0;
    std::uint32_t groups = 0;
};

struct Plan {
    std::uint32_t side = 8;
    std::uint32_t count = 512;
    double spacing = 0;
    double h = 0;
    double support = 0;
    double mass = 0;
    std::uint32_t cellsAxis = 0;
    std::uint32_t cells = 0;
    std::uint64_t residentBytes = 0;
    std::uint64_t largestBlock = 0;
    std::vector<ScanLevel> levels;
};

inline Plan makePlan(std::uint32_t side = 8, std::uint32_t count = 0) {
    if (side < 4 || side > 100) {
        throw std::invalid_argument("Side must be in [4,100]");
    }
    Plan plan;
    plan.side = side;
    plan.count = count;
    if (count == 0) {
        plan.count = side * side * side;
    }
    if (plan.count > side * side * side) {
        throw std::invalid_argument("Invalid particle count");
    }
    plan.spacing = 0.4 / side;
    plan.h = 1.3 * plan.spacing;
    plan.support = 2 * plan.h;
    plan.mass = restDensity * plan.spacing * plan.spacing * plan.spacing;
    plan.cellsAxis = static_cast<std::uint32_t>(std::ceil(1 / plan.support));
    plan.cells = plan.cellsAxis * plan.cellsAxis * plan.cellsAxis;
    auto input = plan.cells;
    std::uint64_t scanBytes = 0;
    do {
        const auto groups = ceilDivide(input, 512);
        if (!plan.levels.empty()) {
            scanBytes += 4ULL * input;
        }
        scanBytes += 4ULL * groups;
        plan.levels.push_back({input, groups});
        input = groups;
    } while (input > 1);
    plan.residentBytes = 100ULL * plan.count + 12ULL * plan.cells + scanBytes + 32ULL * ceilDivide(plan.count, 256);
    plan.largestBlock = std::max(16ULL * plan.count, 4ULL * plan.cells);
    return plan;
}
#if LAB_CHECKPOINT >= 1
inline Vec3 initialPosition(const Plan& plan, std::uint32_t i) {
    return {0.08 + (i % plan.side + 0.5) * plan.spacing, 0.12 + ((i / plan.side) % plan.side + 0.5) * plan.spacing, 0.3 + (i / (plan.side * plan.side) + 0.5) * plan.spacing};
}
#endif

struct Settings {
    double soundSpeed = 12;
    double alpha = 0.15;
    double gravity = 9.81;
};

inline void validateSettings(const Settings& settings) {
    if (!std::isfinite(settings.soundSpeed) || settings.soundSpeed < 8 || settings.soundSpeed > 20 || !std::isfinite(settings.alpha) || settings.alpha < 0 || settings.alpha > 0.3 || !std::isfinite(settings.gravity) || settings.gravity < 0 || settings.gravity > 9.81) {
        throw std::invalid_argument("Invalid SPH settings");
    }
}

inline double chooseDt(const Plan& plan, double speed, double force, double c) {
    if (!std::isfinite(speed) || !std::isfinite(force) || speed < 0 || force < 0 || !std::isfinite(c) || c < 8 || c > 20) {
        throw std::invalid_argument("Nonfinite timestep input");
    }
    const double acoustic = 0.25 * plan.h / (c + speed);
    const double forceBound = 0.25 * std::sqrt(plan.h / std::max(force, 1e-12));
    const double dt = std::min({maxDt, acoustic, forceBound});
    if (dt < 1e-6) {
        throw std::runtime_error("Timestep below 1e-6; reset the state");
    }
    return dt;
}
} // namespace water3
