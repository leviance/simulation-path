#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <span>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        std::cout << "[PASS] " << label << '\n';
        return;
    }
    std::cerr << "[FAIL] " << label << '\n';
    ++failures;
}

bool allTopologyChecksPass(const lab::OctreeTopologyReport& report) {
    return report.everyPointStoredOnce && report.internalNodesEmpty &&
        report.childIndicesValid && report.childBoundsValid &&
        report.capacityHonored && report.statisticsMatch;
}

} // namespace

int main() {
    const lab::Bounds3D bounds{{0.0, 0.0, 0.0}, {1.0, 1.0, 1.0}};
    const lab::OctreeConfig config{bounds, 16, 10, 1.0 / 1024.0};

    // AABB 3D và split-plane policy.
    const lab::Bounds3D reversed =
        lab::normalizeVolume({0.8, 0.7, 0.9}, {0.2, 0.1, 0.3});
    check(
        reversed.minimum.x == 0.2 && reversed.minimum.y == 0.1 &&
            reversed.minimum.z == 0.3 && reversed.maximum.x == 0.8 &&
            reversed.maximum.y == 0.7 && reversed.maximum.z == 0.9,
        "normalizeVolume handles all drag directions in 3D"
    );
    check(
        lab::pointInsideVolume(reversed.minimum, reversed) &&
            lab::pointInsideVolume(reversed.maximum, reversed),
        "volume boundaries are inclusive"
    );
    check(
        lab::octreeOctant({0.49, 0.49, 0.49}, bounds) == 0 &&
            lab::octreeOctant({0.50, 0.49, 0.49}, bounds) == 1 &&
            lab::octreeOctant({0.49, 0.50, 0.49}, bounds) == 2 &&
            lab::octreeOctant({0.49, 0.49, 0.50}, bounds) == 4 &&
            lab::octreeOctant({0.50, 0.50, 0.50}, bounds) == 7,
        "split-plane points choose the positive x y z octant"
    );

    // Storage và topology.
    const std::vector<lab::PointSample> points =
        lab::makePointCloud(30'000, bounds, 0x30c0ffeeU, true);
    const lab::Octree rootOnly = lab::createRootOctree(points, config);
    lab::OctreeQueryResult rootResult{};
    const lab::Bounds3D centerVolume =
        lab::normalizeVolume({0.44, 0.44, 0.44}, {0.56, 0.56, 0.56});
    lab::queryOctree(rootOnly, points, centerVolume, rootResult);
    check(
        rootOnly.nodes.size() == 1U && rootResult.candidatesChecked == points.size(),
        "root-only checkpoint remains an N-candidate baseline"
    );

    const lab::Octree tree = lab::buildOctree(points, config);
    const lab::OctreeTopologyReport topology =
        lab::inspectOctreeTopology(tree, points.size());
    check(topology.everyPointStoredOnce, "each point index appears in exactly one leaf");
    check(topology.internalNodesEmpty, "internal nodes keep no redistributed point indices");
    check(topology.childIndicesValid, "all eight child indices are valid");
    check(topology.childBoundsValid, "every child has the documented octant bounds");
    check(topology.capacityHonored, "leaf capacity is honored until a split guard stops recursion");
    check(topology.statisticsMatch, "node and leaf statistics match stored topology");

    // Query probes có chủ đích đi qua world corner, face và ba split planes.
    const std::vector<lab::PointSample> edgePoints{
        {{0.0, 0.0, 0.0}},
        {{0.0, 0.5, 0.5}},
        {{0.5, 0.0, 0.5}},
        {{0.5, 0.5, 0.0}},
        {{0.5, 0.5, 0.5}},
        {{1.0, 0.5, 0.5}},
        {{1.0, 1.0, 1.0}},
    };
    const lab::Octree edgeTree =
        lab::buildOctree(edgePoints, {bounds, 1, 10, 1.0 / 1024.0});
    const std::array<lab::Bounds3D, 5> edgeVolumes{
        lab::normalizeVolume({0.0, 0.0, 0.0}, {0.1, 0.1, 0.1}),
        lab::normalizeVolume({0.0, 0.25, 0.25}, {0.0, 0.75, 0.75}),
        lab::normalizeVolume({0.5, 0.0, 0.0}, {0.5, 1.0, 1.0}),
        lab::normalizeVolume({0.0, 0.5, 0.0}, {1.0, 0.5, 1.0}),
        lab::normalizeVolume({0.0, 0.0, 0.5}, {1.0, 1.0, 0.5}),
    };
    lab::OctreeQueryResult edgeOctreeResult{};
    lab::BruteVolumeResult edgeBruteResult{};
    for (const lab::Bounds3D& edgeVolume : edgeVolumes) {
        lab::queryOctree(edgeTree, edgePoints, edgeVolume, edgeOctreeResult);
        lab::queryVolumeBruteForce(edgePoints, edgeVolume, edgeBruteResult);
        check(
            lab::octreeMatchesBruteForce(edgeOctreeResult, edgeBruteResult),
            "corner, face and split-plane volume matches brute force"
        );
    }

    // Exact query và brute-force oracle.
    const std::vector<lab::Bounds3D> probes = lab::makeVolumeQueries(
        32,
        bounds,
        {0.14, 0.12, 0.10},
        0x300030U
    );
    lab::OctreeQueryResult octreeWorkspace{};
    lab::BruteVolumeResult bruteWorkspace{};
    bool allQueriesMatch = true;
    for (const lab::Bounds3D& probe : probes) {
        lab::queryOctree(tree, points, probe, octreeWorkspace);
        lab::queryVolumeBruteForce(points, probe, bruteWorkspace);
        allQueriesMatch =
            allQueriesMatch && lab::octreeMatchesBruteForce(octreeWorkspace, bruteWorkspace);
    }
    check(allQueriesMatch, "Octree hit sets match the brute-force oracle");

    const lab::BatchMetrics octreeMetrics =
        lab::benchmarkOctree(tree, points, probes, 2, octreeWorkspace);
    const lab::BatchMetrics bruteMetrics =
        lab::benchmarkBruteVolumes(points, probes, 2, bruteWorkspace);
    check(
        octreeMetrics.checksum == bruteMetrics.checksum,
        "Octree and brute benchmark checksums match"
    );
    check(
        bruteMetrics.totalScanned == points.size() * probes.size() * 2U,
        "brute benchmark reports N times Q times repetitions scans"
    );
    check(
        octreeMetrics.totalCandidates < bruteMetrics.totalScanned,
        "Octree reduces exact candidate work for the default workload"
    );

    // Capacity study và phép chiếu phục vụ visualization.
    const std::array<std::size_t, 4> capacities{8, 16, 32, 64};
    const std::vector<lab::CapacityStudyRow> rows =
        lab::makeCapacityStudy(points, bounds, probes, capacities, 1);
    check(rows.size() == capacities.size(), "capacity study returns one row per preset");
    check(
        rows.front().nodeCount > rows.back().nodeCount,
        "smaller capacity creates more Octree nodes"
    );
    check(
        rows.front().metrics.totalCandidates <= rows.back().metrics.totalCandidates,
        "smaller capacity does not increase exact candidates on the fixed workload"
    );

    const lab::ProjectedPoint projected =
        lab::projectPointWithOrbit({0.5, 0.5, 0.5}, lab::OrbitCamera{});
    check(
        projected.visible && std::isfinite(projected.x) &&
            std::isfinite(projected.y) && std::isfinite(projected.depth),
        "orbit projection produces finite visible coordinates"
    );

    const lab::ValidationReport validation =
        lab::validateOctreeExperiment(bounds, 0x30c0ffeeU);
    check(allTopologyChecksPass(topology), "all topology checks pass together");
    check(validation.topologyValid, "final validation accepts topology");
    check(validation.resultMatchesOracle, "final validation accepts query output");
    check(validation.candidateWorkReduced, "final validation sees candidate reduction");
    check(validation.checksumMatches, "final validation sees equal checksums");
    check(validation.finiteTiming, "final validation sees finite timing");
    check(validation.projectionFinite, "final validation accepts orbit projection");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed.\n";
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
