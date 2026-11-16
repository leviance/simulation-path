#pragma once
#include "benchmark.hpp"

namespace water3 {
inline void reportRun(const Plan& plan, const Engine& engine, const View& view) {
    std::cout << "SCALE allocated=" << plan.count << " alive=" << plan.count << " updated=" << engine.lastDiagnostics.updated() << " drawn=" << view.drawn << " tick=" << engine.steps << " time=" << engine.time << " dt=" << engine.lastDt << '\n';
    std::cout << "DENSITY start-of-last-tick min=" << engine.lastDiagnostics.minimum() / restDensity << " median_bin=" << engine.lastDiagnostics.quantile(0.5) << " max=" << engine.lastDiagnostics.maximum() / restDensity << " p95_bin=" << engine.lastDiagnostics.quantile(0.95) << " poststep_leakage=" << engine.lastDiagnostics.leaked() << " invalid=" << engine.lastDiagnostics.invalid() << '\n';
    for (std::size_t i = 0; i < engine.queue.passCount; ++i) {
        std::cout << "GPU_PASS " << engine.queue.timings[i].label << " ms=" << engine.queue.timings[i].milliseconds << '\n';
    }
}
} // namespace water3
