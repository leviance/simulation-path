#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

// Không dùng assert để validation vẫn hoạt động khi Release định nghĩa NDEBUG.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

bool closeEnough(double actual, double expected, double tolerance = 1e-12) {
    return std::abs(actual - expected) <= tolerance;
}

} // namespace

int main() {
    failures = 0;
    const lab::Bounds2D bounds{{0.0, 0.0}, {1.0, 1.0}};

    const std::vector<lab::Particle> first = lab::makeParticleCloud(100'000, bounds, 0x00c0ffeeU);
    const std::vector<lab::Particle> second = lab::makeParticleCloud(100'000, bounds, 0x00c0ffeeU);
    check(first.size() == 100'000, "particle cloud contains exactly one hundred thousand particles");
    check(first.front().position.x == second.front().position.x && first.back().position.y == second.back().position.y, "same seed reproduces the same cloud");
    bool insideBounds = true;
    for (const lab::Particle& particle : first) {
        insideBounds = insideBounds && particle.position.x >= bounds.minimum.x && particle.position.x <= bounds.maximum.x;
        insideBounds = insideBounds && particle.position.y >= bounds.minimum.y && particle.position.y <= bounds.maximum.y;
    }
    check(insideBounds, "every generated particle stays inside the world bounds");

    const lab::CircleQuery boundaryQuery{{0.0, 0.0}, 1.0};
    check(lab::insideCircleWithDistance({1.0, 0.0}, boundaryQuery), "circle query includes a particle exactly on its boundary");
    check(!lab::insideCircleWithDistance({1.01, 0.0}, boundaryQuery), "circle query rejects a particle outside its boundary");

    const std::vector<lab::Particle> known{{{0.5, 0.5}}, {{0.6, 0.5}}, {{0.4, 0.5}}, {{0.9, 0.9}}};
    const lab::CircleQuery knownQuery{{0.5, 0.5}, 0.1};
    const lab::BruteForceResult readable = lab::queryBruteForce(known, knownQuery);
    check(readable.hitIndices == std::vector<std::size_t>({0, 1, 2}), "readable brute-force scan collects every hit in stable index order");
    check(readable.nearestIndex == 0, "nearest particle uses the first index when distance is tied");
    check(readable.scanned == known.size(), "readable brute force scans every particle once");

    lab::QueryWorkspace workspace{};
    lab::reserveQueryWorkspace(workspace, known.size());
    const std::size_t capacityBefore = workspace.hitIndices.capacity();
    lab::queryBruteForceSquared(known, knownQuery, workspace);
    check(workspace.hitIndices == readable.hitIndices && workspace.nearestIndex == readable.nearestIndex, "squared-distance query matches the readable reference");
    lab::queryBruteForceSquared(known, {{0.5, 0.5}, 0.5}, workspace);
    check(workspace.hitIndices.capacity() == capacityBefore, "reserved query workspace avoids capacity growth across queries");

    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(8, bounds, 0.05, 0x27182818U);
    const lab::BatchMetrics benchmarkA = lab::benchmarkBruteForce(first, probes, 2, workspace);
    const lab::BatchMetrics benchmarkB = lab::benchmarkBruteForce(first, probes, 2, workspace);
    check(benchmarkA.queryCount == 16, "bounded benchmark runs the requested query count");
    check(benchmarkA.totalScanned == 100'000U * 16U, "benchmark work equals particle count times query count");
    check(benchmarkA.checksum == benchmarkB.checksum, "benchmark checksum is deterministic across repeated runs");
    check(std::isfinite(benchmarkA.elapsedMicroseconds) && benchmarkA.elapsedMicroseconds >= 0.0, "benchmark timing remains finite and non-negative");

    const std::vector<std::size_t> counts{1'000, 10'000, 100'000};
    const std::vector<lab::ScalingRow> rows = lab::makeScalingStudy(first, probes, counts, 1);
    check(rows.size() == counts.size(), "scaling study produces one row for every requested count");
    check(rows[0].metrics.totalScanned == 1'000U * probes.size(), "one-thousand row reports exact scan work");
    check(rows[1].metrics.totalScanned == 10'000U * probes.size(), "ten-thousand row reports exact scan work");
    check(rows[2].metrics.totalScanned == 100'000U * probes.size(), "one-hundred-thousand row reports exact scan work");

    const lab::ValidationReport validation = lab::validateBruteForceExperiment(bounds, 0x00c0ffeeU);
    check(validation.deterministic, "validation confirms deterministic generation");
    check(validation.optimizedMatchesReference, "validation confirms optimized and reference queries agree");
    check(validation.workIsLinear, "validation confirms linear scan work");
    check(validation.finiteTiming, "validation confirms finite benchmark timing");
    check(lab::particleCountForPreset(lab::ParticlePreset::hundredThousand) == 100'000, "dense preset selects one hundred thousand particles");
    check(closeEnough(lab::distanceSquared({0.0, 0.0}, {3.0, 4.0}), 25.0), "squared distance preserves the three-four-five triangle");

    if (failures != 0) {
        std::cerr << failures << " Project 27 validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 27 validation passed\n";
    return EXIT_SUCCESS;
}
