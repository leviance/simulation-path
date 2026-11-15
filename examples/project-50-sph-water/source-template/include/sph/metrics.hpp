#pragma once
#include "solver.hpp"
#include <numeric>

namespace water {
struct Metrics {
    double minimum = 0;
    double median = 0;
    double maximum = 0;
    double p95Compression = 0;
    double maxSpeed = 0;
    double kinetic = 0;
    std::size_t leaked = 0;
};

// Phân phối đọc tại vị trí hiện tại sau inspectCurrent, không chỉ chọn một hạt đẹp.
inline Metrics measure(const State& state) {
    Metrics result;
    if (state.particles.empty()) {
        return result;
    }
    std::vector<double> ratios;
    for (const auto& p : state.particles) {
        ratios.push_back(p.density / restDensity);
        result.maxSpeed = std::max(result.maxSpeed, std::hypot(p.vx, p.vy));
        result.kinetic += 0.5 * mass * (p.vx * p.vx + p.vy * p.vy);
        if (p.x < spacing / 2 - 1e-9 || p.x > width - spacing / 2 + 1e-9 || p.y < spacing / 2 - 1e-9 || p.y > height - spacing / 2 + 1e-9) {
            ++result.leaked;
        }
    }
    std::sort(ratios.begin(), ratios.end());
    result.minimum = ratios.front();
    result.median = ratios[ratios.size() / 2];
    result.maximum = ratios.back();
    result.p95Compression = std::max(0.0, ratios[static_cast<std::size_t>(0.95 * (ratios.size() - 1))] - 1);
    return result;
}
} // namespace water
