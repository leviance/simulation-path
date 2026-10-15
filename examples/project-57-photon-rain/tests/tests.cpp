#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// Kiểm tra tường minh vẫn hoạt động khi Release định nghĩa NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool close(double a, double b, double epsilon = 1e-10) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= epsilon;
}

template <typename Action>
void rejects(Action action, std::string_view label) {
    bool rejected = false;
    try {
        action();
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, label);
}

photon::Experiment run(photon::Settings settings, int budget) {
    auto result = photon::makeExperiment(settings);
    for (int batch = 0; batch < settings.count; ++batch) {
        photon::advance(result, budget);
        if (result.counts.completed == settings.count) {
            break;
        }
    }
    return result;
}
} // namespace

int main() {
    using namespace photon;
    Random random(1);
    check(random.next() == 270369u && random.next() == 67634689u && random.next() == 2647435461u, "xorshift uint32 oracle");
    check(photonSeed(42, 0) == 939911724u && photonSeed(42, 1) == 3948730756u, "mixed ID seed fixture shared with TS");
    Random zero(0);
    for (int i = 0; i < 1024; ++i) {
        const double u = zero.uniform();
        check(u > 0 && u < 1, "uniform is open including zero-seed fallback");
    }
    check(close(freePath(2, 0.5), std::log(2.0) / 2), "independent inverse CDF fixture");
    check(std::isinf(freePath(0, 0.5)), "vacuum has infinite free path");
    check(close(freePath(1, 0.75), 2 * freePath(2, 0.75)), "inverse coefficient scaling");
    check(close(exitDistance({{left, 0}, {1, 0}}), 3), "inward launch distance");
    check(exitDistance({{left, 0}, {-1, 0}}) == 0, "outward boundary distance zero");
    check(close(exitDistance({{0, 0}, {0, 1}}), 1), "parallel x avoids division by zero");
    check(close(exitDistance({{0, 0}, {std::sqrt(0.5), std::sqrt(0.5)}}), std::sqrt(2.0)), "diagonal selects top boundary");
    check(close(exitDistance({{0, top}, {1, 0}}), 1.5), "tangent boundary can move along surface");
    const auto direction = scatterDirection(0.25);
    check(close(direction[0], 0) && close(direction[1], 1), "2D angular direction");
    Settings settings;
    settings.muA = 0;
    settings.muS = 0;
    settings.count = 512;
    const auto vacuum = run(settings, 32);
    check(vacuum.counts == Counts{512, 0, 512, 0, 512, 0, 0}, "vacuum all escape without interaction");
    const auto trace = tracePhoton(settings, 0);
    check(trace.vertices.size() == 2 && trace.vertices.back().position[0] == right && trace.collisions == 0, "vacuum endpoint and no collisions");
    Random vacuumRandom(7);
    Random untouched(7);
    const auto flight = sampleFlight({{left, 0}, {1, 0}}, vacuumRandom, settings);
    check(flight.escaped && close(flight.boundary, 3) && vacuumRandom.next() == untouched.next(), "vacuum flight does not consume a distance draw");

    settings.muA = 0.4;
    const auto absorption = run(settings, 32);
    check(absorption.counts == Counts{512, 338, 174, 0, 174, 0, 0}, "pure absorption counts shared with TS");
    check(run(settings, 1).counts == absorption.counts, "batch1 and32 agree");
    settings.muS = 0.9;
    const auto mixed = run(settings, 32);
    check(mixed.counts == Counts{512, 259, 253, 0, 8, 368, 681}, "mixed counts shared with TS");
    check(mixed.recent.size() == 24, "recent history is bounded");
    check(run(settings, 1).counts == mixed.counts, "mixed batch invariance");
    auto experiment = makeExperiment(settings);
    const auto originalSettings = experiment.settings;
    const auto previewOnly = tracePhoton(settings, 100);
    (void)previewOnly;
    check(experiment.counts.completed == 0 && advance(experiment, 0) == 0, "preview and pause do not tally");
    settings.seed = 1;
    check(experiment.settings == originalSettings, "experiment settings snapshot");
    const auto oldCounts = mixed.counts;
    auto complete = mixed;
    check(advance(complete, 32) == 0 && complete.counts == oldCounts, "completed experiment is stable");

    settings = {};
    settings.muA = 0;
    settings.muS = 2;
    settings.count = 512;
    settings.eventLimit = 1;
    const auto limited = run(settings, 32);
    check(limited.counts == Counts{512, 0, 0, 512, 0, 512, 512}, "event cap never becomes absorption");
    for (int id = 0; id < 128; ++id) {
        const auto shortTrace = tracePhoton(settings, id);
        settings.eventLimit = 64;
        const auto longTrace = tracePhoton(settings, id);
        settings.eventLimit = 1;
        check(shortTrace.vertices.size() <= 2 && longTrace.vertices.size() <= 65, "vertex budget");
        check(longTrace.vertices[1].position == shortTrace.vertices[1].position, "increased limit retains path prefix");
        for (const auto& vertex : longTrace.vertices) {
            check(vertex.position[0] >= left - 1e-10 && vertex.position[0] <= right + 1e-10 && vertex.position[1] >= bottom - 1e-10 && vertex.position[1] <= top + 1e-10, "all vertices stay inside supported medium");
        }
    }
    for (const auto counts : {vacuum.counts, absorption.counts, mixed.counts, limited.counts}) {
        check(counts.completed == counts.absorbed + counts.escaped + counts.censored && counts.ballistic <= counts.escaped && counts.scatteredPhotons <= counts.completed && counts.scatterEvents >= counts.scatteredPhotons, "conservation and subset invariants");
    }
    const auto interval = wilson(5, 10);
    check(close(interval[0], 0.236593090512564) && close(interval[1], 0.7634069094874361), "Wilson numeric fixture");
    check(close(wilson(0, 10)[0], 0) && wilson(0, 10)[1] > 0 && close(wilson(10, 10)[1], 1) && wilson(10, 10)[0] < 1, "Wilson boundary cases do not collapse");
    check(audit() < 0.04, "finite absorption statistical fixture");

    for (double invalid : {-1.0, 7.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) {
        rejects([&] {
            (void)freePath(invalid, 0.5);
        },
                "invalid attenuation rejected");
    }
    for (double invalid : {0.0, 1.0, -0.01, std::numeric_limits<double>::quiet_NaN()}) {
        rejects([&] {
            (void)freePath(1, invalid);
        },
                "invalid uniform rejected");
    }
    rejects([] {
        (void)exitDistance({{0, 0}, {2, 0}});
    },
            "nonunit ray rejected");
    rejects([] {
        (void)exitDistance({{2, 0}, {1, 0}});
    },
            "outside origin rejected");
    rejects([] {
        (void)photonSeed(42, 8192);
    },
            "out of range id rejected");
    rejects([] {
        (void)wilson(0, 0);
    },
            "empty CI rejected");
    rejects([] {
        (void)wilson(2, 1);
    },
            "invalid CI counts rejected");
    rejects([&] {
        advance(experiment, 33);
    },
            "excessive batch rejected");
    rejects([&] {
        tally(experiment.counts, {});
    },
            "unfinished preview rejected");
    auto stopped = trace;
    Photon value;
    Random stoppedRandom(7);
    rejects([&] {
        advancePhoton(value, stoppedRandom, {}, stopped);
    },
            "terminal trace cannot advance");
    settings.count = 1000000;
    rejects([&] {
        (void)makeExperiment(settings);
    },
            "huge allocation rejected");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Photon rain tests passed\n";
    return EXIT_SUCCESS;
}
