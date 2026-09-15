#include "lab.hpp"

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAIL: " << label << '\n';
    ++failures;
}

} // namespace

int main() {
    // Address và insertion tests bảo vệ topology trước khi kiểm query output.
    const lab::Bounds2D bounds{{0.0, 0.0}, {1.0, 1.0}};
    const std::vector<lab::Particle> particles = lab::makeParticleCloud(100'000, bounds, 0x00c0ffeeU);
    check(particles.size() == 100'000, "particle cloud contains one hundred thousand entries");

    const lab::SpatialGridConfig config{bounds, 0.05};
    const lab::GridDimensions dimensions = lab::spatialGridDimensions(config);
    check(dimensions.columns == 20 && dimensions.rows == 20, "cell size creates a twenty by twenty grid");

    lab::GridAddress minimumAddress{};
    lab::GridAddress maximumAddress{};
    check(lab::spatialGridAddress(bounds.minimum, config, dimensions, minimumAddress), "minimum bound has a cell address");
    check(lab::spatialGridAddress(bounds.maximum, config, dimensions, maximumAddress), "maximum bound has a cell address");
    check(minimumAddress.index == 0, "minimum bound maps to first row-major cell");
    check(maximumAddress.index == 399, "maximum bound clamps to last row-major cell");

    const lab::GridDimensions rejectedDimensions =
        lab::spatialGridDimensions({bounds, 1e-12});
    check(
        rejectedDimensions.columns == 0 && rejectedDimensions.rows == 0,
        "pathological cell size is rejected before dimensions overflow"
    );
    const lab::SpatialGrid rejectedGrid =
        lab::buildSpatialGrid(particles, {bounds, 1e-12});
    check(rejectedGrid.buckets.empty(), "rejected grid does not allocate an unbounded bucket array");

    const lab::SpatialGrid grid = lab::buildSpatialGrid(particles, config);
    std::vector<int> insertionCounts(particles.size(), 0);
    std::size_t bucketEntries = 0;
    for (const std::vector<std::size_t>& bucket : grid.buckets) {
        bucketEntries += bucket.size();
        for (const std::size_t particleIndex : bucket) {
            if (particleIndex < insertionCounts.size()) {
                ++insertionCounts[particleIndex];
            }
        }
    }
    check(grid.insertedCount == particles.size(), "grid inserts every valid particle");
    check(bucketEntries == particles.size(), "bucket entry count equals particle count");
    check(std::isfinite(grid.rebuildMicroseconds), "grid rebuild timing is finite");
    for (const int count : insertionCounts) {
        check(count == 1, "each particle index appears in exactly one bucket");
    }

    // Scene nhỏ phân biệt candidate rectangle với exact circle hits.
    const std::vector<lab::Particle> handBuilt{{{0.5, 0.5}}, {{0.6, 0.5}}, {{0.6, 0.6}}, {{0.9, 0.9}}};
    const lab::SpatialGrid handGrid = lab::buildSpatialGrid(handBuilt, {bounds, 0.25});
    const lab::CircleQuery handQuery{{0.5, 0.5}, 0.1};
    lab::GridQueryWorkspace handResult{};
    lab::querySpatialGrid(handGrid, handBuilt, handQuery, handResult);
    const std::vector<std::size_t> canonicalHandHits = lab::canonicalHitIndices(handResult.hitIndices);
    check(canonicalHandHits == std::vector<std::size_t>{0, 1}, "candidate rectangle still applies an exact circle filter");
    check(handResult.candidatesChecked > handResult.hitIndices.size(), "candidate cells may contain false positives");
    check(handResult.nearestIndex == 0, "nearest hit keeps the stable lowest index");

    // Oracle comparison dùng cùng deterministic probes cho cả hai thuật toán.
    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(32, bounds, 0.08, 0x280028U);
    lab::GridQueryWorkspace gridWorkspace{};
    lab::BruteForceNeighborResult bruteWorkspace{};
    for (const lab::CircleQuery& query : probes) {
        lab::querySpatialGrid(grid, particles, query, gridWorkspace);
        lab::queryNeighborsBruteForce(particles, query, bruteWorkspace);
        check(lab::spatialGridMatchesBruteForce(gridWorkspace, bruteWorkspace), "Spatial Grid hit set matches brute-force oracle");
        check(gridWorkspace.candidatesChecked <= particles.size(), "one grid query never checks more candidates than particles");
    }

    const lab::CircleQuery edgeQuery{{0.0, 0.0}, 0.1};
    lab::querySpatialGrid(grid, particles, edgeQuery, gridWorkspace);
    check(gridWorkspace.visitedCells == 9, "edge query clamps to nine cells without duplicates");
    lab::queryNeighborsBruteForce(particles, edgeQuery, bruteWorkspace);
    check(lab::spatialGridMatchesBruteForce(gridWorkspace, bruteWorkspace), "edge query still matches brute-force oracle");

    // Benchmark assertions dựa vào checksum và exact work, không khóa timing theo tốc độ máy.
    const lab::BatchMetrics gridMetrics = lab::benchmarkSpatialGrid(grid, particles, probes, 2, gridWorkspace);
    const lab::BatchMetrics bruteMetrics = lab::benchmarkBruteForceNeighbors(particles, probes, 2, bruteWorkspace);
    check(gridMetrics.queryCount == probes.size() * 2U, "grid benchmark reports exact query count");
    check(bruteMetrics.totalScanned == particles.size() * bruteMetrics.queryCount, "brute benchmark reports exact scan work");
    check(gridMetrics.totalCandidates < bruteMetrics.totalScanned, "grid benchmark reduces candidate work");
    check(gridMetrics.checksum == bruteMetrics.checksum, "grid and brute benchmark checksums match");
    check(std::isfinite(gridMetrics.elapsedMicroseconds), "grid benchmark timing is finite");

    // Cell-size study kiểm trade-off bằng counters có thể lặp lại.
    const std::vector<lab::CircleQuery> studyQueries = lab::makeProbeQueries(8, bounds, 0.08, 0x12345678U);
    const std::vector<double> cellSizes{0.025, 0.05, 0.1, 0.2};
    const std::vector<lab::CellSizeStudyRow> rows = lab::makeCellSizeStudy(particles, bounds, studyQueries, cellSizes, 1);
    check(rows.size() == cellSizes.size(), "cell-size study keeps every requested preset");
    check(rows.front().metrics.totalVisitedCells > rows.back().metrics.totalVisitedCells, "fine cells visit more cells than coarse cells");
    check(rows.front().metrics.totalCandidates < rows.back().metrics.totalCandidates, "fine cells reject more candidates than coarse cells");
    check(std::isfinite(rows.front().rebuildMicroseconds), "cell-size row keeps rebuild timing separate");

    const lab::ValidationReport report = lab::validateSpatialGridExperiment(bounds, 0x00c0ffeeU);
    check(report.addressBoundaryCorrect, "validation accepts the maximum-bound address");
    check(report.everyParticleInsertedOnce, "validation sees every particle exactly once");
    check(report.resultMatchesOracle, "validation result matches the oracle");
    check(report.candidateWorkReduced, "validation observes reduced candidate work");
    check(report.finiteTiming, "validation timing stays finite");

    if (failures != 0) {
        std::cerr << failures << " Project 28 validation checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 28 validation passed\n";
    return EXIT_SUCCESS;
}
