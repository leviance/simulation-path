#pragma once
#include "sph/metrics.hpp"
#include "sph/surface.hpp"
#include <chrono>
#include <iostream>
#include <string>

namespace benchmark {
using Clock = std::chrono::steady_clock;

inline double milliseconds(Clock::time_point start, Clock::time_point finish) {
    return std::chrono::duration<double, std::milli>(finish - start).count();
}

inline void distribution(const std::string& label, std::vector<double> values) {
    std::sort(values.begin(), values.end());
    std::cout << label << " median=" << 0.5 * (values[3] + values[4]) << " min=" << values.front() << " max=" << values.back() << " ms\n";
}

// Cùng state sau warm-up cho mọi mẫu trong một N; copy nằm ngoài khoảng đo.
// [snippet benchmark]
inline int run() {
    for (const std::size_t count : {1000, 5000}) {
        auto warmed = water::makeState(water::Preset::Dam, count);
        water::Settings settings;
        for (int k = 0; k < 30; ++k) {
            water::step(warmed, settings);
        }
        std::vector<double> searchTimes, densityTimes, forceTimes, updateTimes, fullTimes, renderTimes;
        for (int sample = 0; sample < 8; ++sample) {
            auto state = warmed;
            auto started = Clock::now();
            const auto search = water::buildNeighbors(state, true);
            auto a = Clock::now();
            water::computeDensity(state, search);
            water::computePressure(state, settings);
            auto b = Clock::now();
            water::computeForces(state, search, settings);
            auto c = Clock::now();
            const double dt = water::chooseDt(state, settings);
            water::movePaddle(state, dt);
            water::integrate(state, dt);
            water::requireFinite(state);
            auto d = Clock::now();
            searchTimes.push_back(milliseconds(started, a));
            densityTimes.push_back(milliseconds(a, b));
            forceTimes.push_back(milliseconds(b, c));
            updateTimes.push_back(milliseconds(c, d));

            // Đo thêm step thật: có validate/finite/allocation/destruction của chính solver.
            state = warmed;
            started = Clock::now();
            water::step(state, settings);
            a = Clock::now();
            fullTimes.push_back(milliseconds(started, a));

            water::Surface surface;
            started = Clock::now();
            water::reconstruct(state, surface);
            water::shade(surface);
            a = Clock::now();
            renderTimes.push_back(milliseconds(started, a));
            if (state.updated != count || surface.drawn != count) {
                return 2;
            }
        }
        std::cout << "CONFIG Release-required N=" << count << " warmup=30 samples=8 c=20 alpha=0.3 g=9.81 maxDt=0.001 grid=2h\n";
        distribution("grid/search", searchTimes);
        distribution("density/EOS", densityTimes);
        distribution("forces", forceTimes);
        distribution("dt/integrate/finite", updateTimes);
        distribution("full-step", fullTimes);
        distribution("CPU surface720x432, no SDL", renderTimes);
    }
    return 0;
}

// [/snippet benchmark]
} // namespace benchmark
