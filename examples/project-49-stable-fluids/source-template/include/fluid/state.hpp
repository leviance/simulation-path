#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 15
#endif
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <stdexcept>
#include <vector>

namespace fluid {
// Dữ liệu số của solver không phụ thuộc SDL hoặc kích thước cửa sổ.
inline constexpr double fixedDt = 1.0 / 60.0;

struct Vec2 {
    double x = 0;
    double y = 0;
};

struct Ink {
    double r = 1;
    double g = 1;
    double b = 1;
};

inline constexpr Ink cyan{0.15, 0.78, 1.0};
inline constexpr Ink amber{1.0, 0.36, 0.10};
inline constexpr Ink white{0.93, 0.96, 1.0};
enum class Scene {
    TwinJets,
    Vortex,
    Compression,
    Empty,
    JacobiPair,
};
enum class Layer {
    Smoke,
    Velocity,
    Pressure,
    Divergence,
};
enum class PressureMethod {
    Jacobi,
    CG,
    PCG,
};

struct Parameters {
    double viscosity = 0;
    double buoyancy = 0.8;
    bool emit = true;
#if LAB_CHECKPOINT >= 12
    bool highOrder = true;
#else
    bool highOrder = false;
#endif
#if LAB_CHECKPOINT >= 13
    double confinement = 8;
#else
    double confinement = 0;
#endif
#if LAB_CHECKPOINT >= 14
    PressureMethod method = PressureMethod::PCG;
    int pressureBudget = 384;
#elif LAB_CHECKPOINT >= 11
    PressureMethod method = PressureMethod::CG;
    int pressureBudget = 384;
#else
    PressureMethod method = PressureMethod::Jacobi;
    int pressureBudget = 160;
#endif
};

inline bool availablePressureMethod(PressureMethod method) {
    if (method == PressureMethod::Jacobi) {
        return true;
    }
#if LAB_CHECKPOINT >= 11
    if (method == PressureMethod::CG) {
        return true;
    }
#endif
#if LAB_CHECKPOINT >= 14
    if (method == PressureMethod::PCG) {
        return true;
    }
#endif
    return false;
}

struct Projection {
    PressureMethod method = PressureMethod::Jacobi;
    int budget = 0;
    double before = 0;
    double after = 0;
    double residual = 0;
    double target = 0;
    int iterations = 0;
    bool available = false;
    bool converged = false;
};

#if LAB_CHECKPOINT >= 14
struct MultigridLevel {
    int n;
    std::vector<double> value, rhs, residual;

    explicit MultigridLevel(int size)
        : n(size), value(size * size), rhs(size * size), residual(size * size) {}
};
#endif

struct Grid {
    int n;
    double h;
    std::vector<double> density;
    std::vector<double> densityNext;
#if LAB_CHECKPOINT >= 4
    std::vector<double> u, uNext, v, vNext, divergence;
#endif
#if LAB_CHECKPOINT >= 5
    std::vector<double> pressure, pressureNext, rhs;
    bool pressureReady = false;
    int iterations = 0;
#endif
#if LAB_CHECKPOINT >= 8
    std::array<std::vector<double>, 3> pigment, pigmentNext;
#endif
#if LAB_CHECKPOINT >= 11
    std::vector<double> residualWork, direction, matrixDirection;
#endif
#if LAB_CHECKPOINT >= 12
    std::vector<double> scalarForward, scalarBackward;
    std::vector<Vec2> forwardOrigin, backwardOrigin;
#endif
#if LAB_CHECKPOINT >= 13
    std::vector<double> curl, forceX, forceY;
#endif
#if LAB_CHECKPOINT >= 14
    std::vector<double> preconditioned;
    std::vector<MultigridLevel> hierarchy;
#endif
    Projection projection;
    int tick = 0;

    explicit Grid(int resolution)
        : n(resolution) {
        if (n < 8 || n > 256 || (n & (n - 1)) != 0) {
            throw std::invalid_argument("Resolution must be a power of two in [8,256]");
        }
        h = 1.0 / n;
        density.assign(static_cast<std::size_t>(n * n), 0);
        densityNext = density;
#if LAB_CHECKPOINT >= 4
        u.assign(static_cast<std::size_t>((n + 1) * n), 0);
        uNext = u;
        v.assign(static_cast<std::size_t>(n * (n + 1)), 0);
        vNext = v;
        divergence = density;
#endif
#if LAB_CHECKPOINT >= 5
        pressure = density;
        pressureNext = density;
        rhs = density;
#endif
#if LAB_CHECKPOINT >= 8
        for (int channel = 0; channel < 3; ++channel) {
            pigment[channel] = density;
            pigmentNext[channel] = density;
        }
#endif
#if LAB_CHECKPOINT >= 11
        residualWork = density;
        direction = density;
        matrixDirection = density;
#endif
#if LAB_CHECKPOINT >= 12
        scalarForward = density;
        scalarBackward = density;
        forwardOrigin.resize(density.size());
        backwardOrigin.resize(density.size());
#endif
#if LAB_CHECKPOINT >= 13
        curl = density;
        forceX = density;
        forceY = density;
#endif
#if LAB_CHECKPOINT >= 14
        preconditioned = density;
        for (int size = n; size >= 4; size /= 2) {
            hierarchy.emplace_back(size);
        }
#endif
    }
};

inline int startingResolution() {
#if LAB_CHECKPOINT >= 11
    return 128;
#else
    return 32;
#endif
}

inline bool inside(Vec2 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

inline bool finiteValues(const std::vector<double>& values) {
    for (const double value : values) {
        if (!std::isfinite(value)) {
            return false;
        }
    }
    return true;
}

inline bool finiteState(const Grid& grid) {
    if (!finiteValues(grid.density)) {
        return false;
    }
#if LAB_CHECKPOINT >= 4
    if (!finiteValues(grid.u) || !finiteValues(grid.v)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!finiteValues(grid.pressure)) {
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 8
    for (const auto& channel : grid.pigment) {
        if (!finiteValues(channel)) {
            return false;
        }
    }
#endif
    return true;
}
} // namespace fluid
