#include "lab.hpp"

#include <cmath>
#include <cstddef>
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
    const lab::Bounds2D bounds{{0.0, 0.0}, {1.0, 1.0}};

    // Quy ước selection và split line phải ổn định trước khi kiểm cả tree.
    const lab::SelectionBox normalized = lab::normalizeSelectionBox({0.8, 0.7}, {0.2, 0.1});
    check(normalized.minimum.x == 0.2 && normalized.minimum.y == 0.1, "reverse drag normalizes the minimum corner");
    check(normalized.maximum.x == 0.8 && normalized.maximum.y == 0.7, "reverse drag normalizes the maximum corner");
    check(lab::pointInsideSelection(normalized.minimum, normalized), "selection includes its minimum boundary");
    check(lab::pointInsideSelection(normalized.maximum, normalized), "selection includes its maximum boundary");
    check(lab::quadtreeQuadrant({0.49, 0.49}, bounds) == 0, "south-west point chooses quadrant zero");
    check(lab::quadtreeQuadrant({0.5, 0.49}, bounds) == 1, "vertical split line chooses the east child");
    check(lab::quadtreeQuadrant({0.49, 0.5}, bounds) == 2, "horizontal split line chooses the north child");
    check(lab::quadtreeQuadrant({0.5, 0.5}, bounds) == 3, "center chooses the north-east child exactly once");

    // Rebuild test đếm leaf storage thay vì suy luận từ số đường vẽ.
    const std::vector<lab::Particle> particles = lab::makeParticleCloud(100'000, bounds, 0x29c0ffeeU, true);
    const lab::QuadtreeConfig config{bounds, 8, 12, 1.0 / 4096.0};
    const lab::Quadtree tree = lab::buildQuadtree(particles, config);
    const lab::QuadtreeTopologyReport topology = lab::inspectQuadtreeTopology(tree, particles.size());
    check(tree.insertedCount == particles.size(), "Quadtree inserts every valid particle");
    check(tree.nodes.size() == tree.leafCount + tree.internalNodeCount, "node statistics partition leaves and internal nodes");
    check(tree.maximumObservedDepth > 3, "clustered cloud creates visibly different depths");
    check(topology.everyParticleStoredOnce, "each particle index appears in exactly one leaf");
    check(topology.internalNodesEmpty, "internal nodes release redistributed particle indices");
    check(topology.childIndicesValid, "every internal child index resolves to a node");
    check(topology.capacityHonored, "leaf capacity only overflows behind a split guard");
    check(topology.statisticsMatch, "stored topology statistics match an independent traversal");
    check(std::isfinite(tree.rebuildMicroseconds), "Quadtree rebuild timing is finite");

    // Scene nhỏ phân biệt node overlap với exact point-in-selection test.
    const std::vector<lab::Particle> handBuilt{{{0.2, 0.2}}, {{0.4, 0.4}}, {{0.5, 0.5}}, {{0.8, 0.8}}};
    const lab::Quadtree handTree = lab::buildQuadtree(handBuilt, {bounds, 1, 8, 1.0 / 1024.0});
    const lab::SelectionBox handSelection = lab::normalizeSelectionBox({0.2, 0.2}, {0.5, 0.5});
    lab::QuadtreeQueryResult handResult{};
    lab::queryQuadtree(handTree, handBuilt, handSelection, handResult);
    check(lab::canonicalSelectionHits(handResult.hitIndices) == std::vector<std::size_t>{0, 1, 2}, "rectangle query includes exact boundary hits");
    check(handResult.prunedNodes > 0U, "rectangle query prunes non-overlapping subtrees");
    check(handResult.candidatesChecked >= handResult.hitIndices.size(), "leaf candidates still pass an exact point test");

    // Oracle comparison giữ nguyên selection set cho hai thuật toán.
    std::vector<lab::SelectionBox> probes = lab::makeSelectionQueries(32, bounds, 0.12, 0.09, 0x290029U);
    probes.push_back(lab::normalizeSelectionBox({0.0, 0.0}, {0.12, 0.12}));
    probes.push_back(lab::normalizeSelectionBox({0.88, 0.88}, {1.0, 1.0}));
    lab::QuadtreeQueryResult treeWorkspace{};
    lab::BruteSelectionResult bruteWorkspace{};
    for (const lab::SelectionBox& selection : probes) {
        lab::queryQuadtree(tree, particles, selection, treeWorkspace);
        lab::querySelectionBruteForce(particles, selection, bruteWorkspace);
        check(lab::quadtreeMatchesBruteForce(treeWorkspace, bruteWorkspace), "Quadtree hit set matches brute-force oracle");
        check(treeWorkspace.candidatesChecked <= particles.size(), "one Quadtree query never checks more candidates than particles");
    }

    // Benchmark assertions khóa checksum và exact work, không khóa tốc độ máy.
    const lab::BatchMetrics treeMetrics = lab::benchmarkQuadtree(tree, particles, probes, 2, treeWorkspace);
    const lab::BatchMetrics bruteMetrics = lab::benchmarkBruteSelections(particles, probes, 2, bruteWorkspace);
    check(treeMetrics.queryCount == probes.size() * 2U, "Quadtree benchmark reports exact query count");
    check(bruteMetrics.totalScanned == particles.size() * bruteMetrics.queryCount, "brute benchmark reports N times Q scans");
    check(treeMetrics.totalCandidates < bruteMetrics.totalScanned / 4U, "Quadtree benchmark reduces candidate work substantially");
    check(treeMetrics.checksum == bruteMetrics.checksum, "Quadtree and brute benchmark checksums match");
    check(std::isfinite(treeMetrics.elapsedMicroseconds), "Quadtree query timing is finite");

    // Capacity study làm lộ trade-off topology thay vì tìm một preset thần kỳ.
    const std::array<std::size_t, 4> capacities{4, 8, 16, 32};
    const std::vector<lab::CapacityStudyRow> rows = lab::makeCapacityStudy(particles, bounds, probes, capacities, 1);
    check(rows.size() == capacities.size(), "capacity study keeps every requested preset");
    check(rows.front().nodeCount > rows.back().nodeCount, "small capacity creates more nodes");
    check(rows.front().metrics.totalCandidates <= rows.back().metrics.totalCandidates, "small capacity does not increase candidate work for this workload");
    check(rows.front().metrics.checksum == rows.back().metrics.checksum, "capacity presets preserve the selected hit set");
    check(std::isfinite(rows.front().rebuildMicroseconds), "capacity row keeps rebuild timing separate");

    const lab::ValidationReport report = lab::validateQuadtreeExperiment(bounds, 0x29c0ffeeU);
    check(report.topologyValid, "final validation accepts the Quadtree topology");
    check(report.resultMatchesOracle, "final validation result matches the oracle");
    check(report.candidateWorkReduced, "final validation observes reduced candidate work");
    check(report.checksumMatches, "final validation checksum matches brute force");
    check(report.finiteTiming, "final validation timings remain finite");

    if (failures != 0) {
        std::cerr << failures << " Project 29 validation checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 29 validation passed\n";
    return EXIT_SUCCESS;
}
