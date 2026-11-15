#pragma once
#include "metrics.hpp"
#include <numbers>

namespace water {
#if LAB_CHECKPOINT >= 12
struct Reference {
    bool passed = false;
    double integral = 0;
    double forceError = 0;
    double equilibriumDrift = 0;
    double gridError = 0;
};

// Ca nhỏ độc lập với bể đang xem; không gọi reset trên dữ liệu của người dùng.
// [snippet reference]
inline Reference reference() {
    Reference report;
    const int intervals = 10000;
    const double dr = support / intervals;
    for (int i = 0; i < intervals; ++i) {
        const double r = (i + 0.5) * dr;
        report.integral += 2 * std::numbers::pi * r * kernel(r) * dr;
    }
    State fixture;
    for (int y = 0; y < 10; ++y) {
        for (int x = 0; x < 10; ++x) {
            fixture.particles.push_back({2 + (x + 0.5) * spacing, 2 + (y + 0.5) * spacing});
        }
    }
    Settings settings;
    settings.gravity = 0;
    const auto grid = buildNeighbors(fixture, true);
    const auto all = buildNeighbors(fixture, false);
    State slow = fixture;
    computeDensity(fixture, grid);
    computeDensity(slow, all);
    computePressure(fixture, settings);
    computePressure(slow, settings);
    computeForces(fixture, grid, settings);
    computeForces(slow, all, settings);
    double netX = 0;
    double netY = 0;
    for (std::size_t i = 0; i < fixture.particles.size(); ++i) {
        const auto& a = fixture.particles[i];
        const auto& b = slow.particles[i];
        report.gridError = std::max({report.gridError, std::abs(a.density - b.density), std::abs(a.ax - b.ax), std::abs(a.ay - b.ay)});
        netX += mass * a.ax;
        netY += mass * a.ay;
    }
    report.forceError = std::hypot(netX, netY);
    const auto initial = fixture.particles;
    for (int i = 0; i < 50; ++i) {
        step(fixture, settings);
    }
    for (std::size_t i = 0; i < initial.size(); ++i) {
        report.equilibriumDrift = std::max(report.equilibriumDrift, std::hypot(fixture.particles[i].x - initial[i].x, fixture.particles[i].y - initial[i].y));
    }
    report.passed = std::abs(report.integral - 1) < 1e-6 && report.gridError < 1e-10 && report.forceError < 1e-8 && report.equilibriumDrift < 1e-4 && grid.lists == all.lists;
    return report;
}

// [/snippet reference]
#endif
} // namespace water
