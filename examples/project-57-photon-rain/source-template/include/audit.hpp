#pragma once
#include "statistics.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 8
inline double audit() {
    Settings settings;
    settings.muA = 0.4;
    settings.muS = 0;
    settings.count = 4096;
    auto experiment = makeExperiment(settings);
    for (int batch = 0; batch < 128; ++batch) {
        advance(experiment, 32);
    }
    const auto counts = experiment.counts;
    const double expected = expectedBallistic(settings);
    const double observed = static_cast<double>(counts.ballistic) / counts.completed;
    const double tolerance = 5 * std::sqrt(expected * (1 - expected) / counts.completed) + 1.0 / counts.completed;

    // Đây là fixture seed cố định, không phải bảo đảm mọi lượt nằm trong CI 95%.
    if (counts.completed != 4096 || counts.censored != 0 || counts.escaped != counts.ballistic || std::abs(observed - expected) > tolerance) {
        throw std::runtime_error("Pure absorption fixture failed");
    }

    return std::abs(observed - expected);
}
#endif
} // namespace photon
