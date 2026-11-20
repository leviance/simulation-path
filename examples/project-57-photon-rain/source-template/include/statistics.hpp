#pragma once
#include "transport.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 6
// [snippet tank-counts]
struct Counts {
    int completed = 0;
    int absorbed = 0;
    int escaped = 0;
    int censored = 0;
    int ballistic = 0;
    int scatteredPhotons = 0;
    int scatterEvents = 0;
    std::array<int, 24> detectorBins{};
    std::array<int, 48 * 32> absorptionMap{};
    std::array<int, 48 * 32> scatterMap{};
    bool operator==(const Counts&) const = default;
};
// [/snippet tank-counts]

struct Experiment {
    Settings settings;
    Counts counts;
    std::vector<Trace> recent;
};

inline Experiment makeExperiment(Settings settings) {
    validate(settings);
    return {settings, {}, {}};
}

// Tọa độ biên phải và biên trên thuộc ô cuối chứ không nằm ngoài mảng.
inline int binAt(double coordinate, double minimum, double maximum, int bins) {
    return std::clamp(static_cast<int>((coordinate - minimum) * bins / (maximum - minimum)), 0, bins - 1);
}

inline void tally(Counts& counts, const Trace& trace) {
    if (trace.status == Status::Alive) {
        throw std::invalid_argument("Cannot tally an unfinished preview");
    }
    ++counts.completed;
    // [snippet tank-events]
    for (const Vertex& vertex : trace.vertices) {
        const int x = binAt(vertex.position[0], left, right, 48);
        const int y = binAt(vertex.position[1], bottom, top, 32);
        const int cell = x + 48 * y;
        if (vertex.event == Event::Absorption) {
            ++counts.absorptionMap[cell];
        } else if (vertex.event == Event::Scatter) {
            ++counts.scatterMap[cell];
        } else if (vertex.event == Event::Escape && std::abs(vertex.position[0] - right) < 1e-9) {
            const int strip = binAt(vertex.position[1], bottom, top, 24);
            ++counts.detectorBins[strip];
        }
    }
    // [/snippet tank-events]
    if (trace.status == Status::Absorbed) {
        ++counts.absorbed;
    }
    if (trace.status == Status::Escaped) {
        ++counts.escaped;
        if (trace.scatters == 0) {
            ++counts.ballistic;
        }
    }
    if (trace.status == Status::Censored) {
        ++counts.censored;
    }
    if (trace.scatters > 0) {
        ++counts.scatteredPhotons;
    }
    counts.scatterEvents += trace.scatters;
}

// Ngân sách cố định: tối đa 32 photon, mỗi photon tối đa 64 tương tác.
inline int advance(Experiment& experiment, int budget) {
    if (budget < 0 || budget > 32) {
        throw std::invalid_argument("At most 32 photons per batch");
    }
    int completed = 0;
    while (completed < budget && experiment.counts.completed < experiment.settings.count) {
        const int id = experiment.counts.completed;
        const auto trace = tracePhoton(experiment.settings, id);
        tally(experiment.counts, trace);
        experiment.recent.push_back(trace);
        if (experiment.recent.size() > 24) {
            experiment.recent.erase(experiment.recent.begin());
        }
        ++completed;
    }
    return completed;
}
#endif

#if LAB_CHECKPOINT >= 7
inline std::array<double, 2> wilson(int successes, int count) {
    if (count < 1 || count > maximumPhotons || successes < 0 || successes > count) {
        throw std::invalid_argument("Wilson interval needs valid nonempty counts");
    }
    constexpr double z = 1.959963984540054;
    const double p = static_cast<double>(successes) / count;
    const double denominator = 1 + z * z / count;
    const double centre = (p + z * z / (2 * count)) / denominator;
    const double halfWidth = z * std::sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / denominator;
    return {std::max(0.0, centre - halfWidth), std::min(1.0, centre + halfWidth)};
}

// [snippet no-event-probability]
inline double expectedBallistic(Settings settings) {
    validate(settings);
    return std::exp(-(settings.muA + settings.muS) * (right - left));
}
// [/snippet no-event-probability]
#endif
} // namespace photon
