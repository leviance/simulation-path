#pragma once
#include "simulation.hpp"
#include <limits>

namespace fluid {
#if LAB_CHECKPOINT >= 1
struct Statistics {
    double minimum = 0;
    double maximum = 0;
    double sum = 0;
    double energy = 0;
    double courant = 0;
};

inline Statistics measure(const Grid& grid) {
    Statistics report;
    report.minimum = std::numeric_limits<double>::infinity();
    report.maximum = -std::numeric_limits<double>::infinity();
    for (const double value : grid.density) {
        report.minimum = std::min(report.minimum, value);
        report.maximum = std::max(report.maximum, value);
        report.sum += value;
    }
    double maxSpeed = 0;
    for (const double value : grid.u) {
        report.energy += value * value;
        maxSpeed = std::max(maxSpeed, std::abs(value));
    }
    for (const double value : grid.v) {
        report.energy += value * value;
        maxSpeed = std::max(maxSpeed, std::abs(value));
    }
    // Chỉ số L2 của vận tốc trên cạnh, chưa gán đơn vị Joule cho mô hình này.
    report.energy *= grid.h * grid.h / 2;
    report.courant = dt * maxSpeed / grid.h;
    return report;
}
#endif

#if LAB_CHECKPOINT >= 11
struct ValidationReport {
    ProjectionReport projection;
    double constantError = 0;
    double beforeEnergy = 0;
    double afterEnergy = 0;
    bool passed = false;
};

inline ValidationReport validateFluid() {
    // Ca chuẩn dùng lưới riêng, không thay dữ liệu người dùng đang xem.
    ValidationReport report;
    auto projected = makeGrid(16, Preset::Compressing);
    report.projection = project(projected, 160);
    auto still = makeGrid(8, Preset::Empty);
    std::fill(still.density.begin(), still.density.end(), 0.4);
    Settings settings;
    settings.buoyancy = 0;
    step(still, settings);
    for (const double value : still.density) {
        report.constantError = std::max(report.constantError, std::abs(value - 0.4));
    }
    auto viscous = makeGrid(16, Preset::Vortex);
    report.beforeEnergy = measure(viscous).energy;
    diffuseVelocity(viscous, 0.003);
    report.afterEnergy = measure(viscous).energy;
    report.passed = report.projection.after < report.projection.before * 0.08 && std::abs(report.projection.after - dt * report.projection.residual) < 1e-10 && report.constantError < 1e-12 && report.afterEnergy < report.beforeEnergy;
    return report;
}
#endif
} // namespace fluid
