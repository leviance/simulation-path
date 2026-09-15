#include "lab.hpp"

#include <array>
#include <cmath>
#include <cstddef>
#include <cstdlib>
#include <iostream>
#include <span>
#include <string_view>
#include <vector>

namespace {

// Bộ test gọi code thuần; không khởi tạo SDL hoặc mở window.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(double a, double b, double tolerance = 1.0e-9) {
    return std::abs(a - b) <= tolerance;
}

void testDeterministicGalaxy() {
    const std::vector<lab::Body> first = lab::makeGalaxyBodies(256, 0x31c0ffeeU);
    const std::vector<lab::Body> second = lab::makeGalaxyBodies(256, 0x31c0ffeeU);
    check(first.size() == 256U, "galaxy contains the requested number of bodies");
    check(first[0].mass == 120.0, "body zero is the central mass");
    for (std::size_t index = 0; index < first.size(); ++index) {
        check(
            near(first[index].position.x, second[index].position.x) &&
                near(first[index].position.y, second[index].position.y) &&
                near(first[index].position.z, second[index].position.z) &&
                near(first[index].velocity.x, second[index].velocity.x) &&
                near(first[index].velocity.y, second[index].velocity.y) &&
                near(first[index].velocity.z, second[index].velocity.z) &&
                near(first[index].mass, second[index].mass),
            "the same seed recreates every body"
        );
    }
    check(
        lab::length(lab::totalMomentum(first)) < 1.0e-10,
        "initial total momentum is balanced"
    );
}

void testSoftenedPairForce() {
    const lab::Vec3 position{1.0, 2.0, 3.0};
    const lab::Vec3 same = lab::softenedAcceleration(position, position, 4.0, 1.0, 0.1);
    check(lab::length(same) == 0.0, "softening keeps coincident bodies finite");
    const lab::Vec3 light = lab::softenedAcceleration(
        position,
        {2.0, 2.0, 3.0},
        2.0,
        1.0,
        0.1
    );
    const lab::Vec3 heavy = lab::softenedAcceleration(
        position,
        {2.0, 2.0, 3.0},
        6.0,
        1.0,
        0.1
    );
    check(near(heavy.x / light.x, 3.0), "acceleration scales with source mass");
    check(lab::finiteVector(heavy), "softened acceleration remains finite");
}

void testDirectOracle() {
    const std::vector<lab::Body> bodies = lab::makeGalaxyBodies(64, 0x31c0ffeeU);
    const lab::AccelerationResult result = lab::directAcceleration(
        bodies,
        17,
        0.001,
        0.02
    );
    check(result.metrics.exactInteractions == 63U, "direct oracle performs N-1 interactions");
    const std::vector<lab::Body> oneBody = lab::makeGalaxyBodies(1, 0x31c0ffeeU);
    check(
        lab::length(lab::directAcceleration(oneBody, 0, 0.001, 0.02).acceleration) == 0.0,
        "direct oracle skips self force by target index"
    );
}

void testFixedStepPlan() {
    const lab::FixedStepPlan plan = lab::planFixedSteps(0.0, 1.0 / 60.0, 1.0 / 240.0, 8);
    check(plan.steps == 4, "one 60 Hz frame produces four 240 Hz physics steps");
    check(plan.remainingSeconds < 1.0e-12, "exact frame split leaves no remainder");
    const lab::FixedStepPlan guarded = lab::planFixedSteps(0.0, 1.0, 1.0 / 240.0, 4);
    check(guarded.steps == 4, "step guard caps work after a long frame");
    check(guarded.droppedBacklog, "step guard reports dropped backlog");
    const lab::FixedStepPlan fractional =
        lab::planFixedSteps(0.0, 0.021, 1.0 / 240.0, 4);
    check(fractional.droppedBacklog, "guard reports a fifth pending full step");
    check(
        fractional.remainingSeconds > 0.0 &&
            fractional.remainingSeconds < 1.0 / 240.0,
        "step guard preserves the fractional remainder after dropping full backlog steps"
    );
}

void testMassOctreeTopology() {
    const std::vector<lab::Body> bodies = lab::makeGalaxyBodies(512, 0x31c0ffeeU);
    const lab::BarnesHutTree tree = lab::buildMassOctree(bodies);
    const lab::BarnesHutTopologyReport report = lab::inspectMassOctree(tree, bodies);
    check(report.everyBodyStoredOnce, "each body index appears in exactly one leaf");
    check(report.internalNodesEmpty, "internal nodes do not retain body indices");
    check(report.childIndicesValid, "every child index points to an existing node");
    check(report.childBoundsValid, "child bounds match their octant bits");
    check(report.aggregateMassValid, "each internal mass equals the sum of child masses");
    check(report.centerOfMassValid, "each center of mass is a mass-weighted child average");
    check(report.statisticsMatch, "stored topology matches reported tree statistics");
    check(
        near(tree.nodes[0].totalMass, lab::totalMass(bodies)),
        "root aggregate mass equals total system mass"
    );
}

void testSelfForceAndOpeningCriterion() {
    const std::vector<lab::Body> oneBody = lab::makeGalaxyBodies(1, 0x31c0ffeeU);
    const lab::BarnesHutTree oneBodyTree = lab::buildMassOctree(oneBody);
    const lab::AccelerationResult self = lab::barnesHutAcceleration(
        oneBodyTree,
        oneBody,
        0,
        1.2,
        0.001,
        0.02
    );
    check(lab::length(self.acceleration) == 0.0, "one-body Barnes-Hut has zero self force");
    check(self.metrics.approximatedNodes == 0U, "a node containing target is never approximated");

    const std::vector<lab::Body> bodies = lab::makeGalaxyBodies(192, 0x31c0ffeeU);
    const lab::BarnesHutTree tree = lab::buildMassOctree(bodies);
    for (const std::size_t targetIndex : {0U, 1U, 17U, 63U, 127U, 191U}) {
        const lab::Vec3 exact = lab::directAcceleration(bodies, targetIndex, 0.001, 0.02).acceleration;
        const lab::Vec3 approximate = lab::barnesHutAcceleration(tree, bodies, targetIndex, 1.0e-9, 0.001, 0.02).acceleration;
        check(
            lab::length(approximate - exact) < 1.0e-10,
            "near-zero theta agrees with the direct oracle"
        );
    }
}

void testThetaAccuracyTradeoff() {
    const std::vector<lab::Body> bodies = lab::makeGalaxyBodies(384, 0x31c0ffeeU);
    const std::array<double, 4> thetaValues{0.25, 0.5, 0.8, 1.1};
    const std::vector<lab::AccuracyRow> rows = lab::measureThetaAccuracy(
        bodies,
        thetaValues,
        24,
        0.001,
        0.02
    );
    check(rows.size() == thetaValues.size(), "theta sweep returns one row per preset");
    check(
        rows.front().meanRelativeError <= rows.back().meanRelativeError + 1.0e-12,
        "smaller theta does not increase mean force error for the fixed workload"
    );
    check(
        rows.front().metrics.exactInteractions >= rows.back().metrics.exactInteractions,
        "smaller theta performs at least as many exact interactions"
    );
    check(rows[1].meanRelativeError < 0.08, "default theta keeps mean error under 8 percent");
}

void testIntegrationAndValidation() {
    std::vector<lab::Body> bodies = lab::makeGalaxyBodies(96, 0x31c0ffeeU);
    const lab::Vec3 initialCenter = lab::centerOfMass(bodies);
    for (int step = 0; step < 80; ++step) {
        const lab::BarnesHutTree tree = lab::buildMassOctree(bodies);
        const std::vector<lab::Vec3> accelerations = lab::barnesHutAccelerations(
            tree,
            bodies,
            0.5,
            0.001,
            0.02
        );
        lab::integrateSymplecticEuler(bodies, accelerations, 1.0 / 240.0);
    }
    const lab::SystemDiagnostics diagnostics = lab::systemDiagnostics(bodies, 0.001, 0.02);
    check(lab::allFiniteBodies(bodies), "fixed-step Barnes-Hut run remains finite");
    check(std::isfinite(diagnostics.totalEnergy), "system energy diagnostic is finite");
    check(
        lab::length(diagnostics.centerOfMass - initialCenter) < 0.002,
        "center-of-mass drift stays below the validation threshold"
    );
    const lab::BarnesHutValidationReport report = lab::validateBarnesHutExperiment(
        bodies,
        0.5,
        0.001,
        0.02
    );
    check(report.topologyValid, "final validation accepts the aggregate topology");
    check(report.finiteState, "final validation accepts the numerical state");
    check(report.zeroSelfForce, "final validation confirms zero self force");
    check(report.thetaAccuracyAcceptable, "final validation confirms theta accuracy");
    check(report.workReduced, "final validation confirms Barnes-Hut work reduction");
}

void testScalingWorkCounts() {
    const std::array<std::size_t, 2> counts{128U, 256U};
    const std::vector<lab::ScalingRow> rows = lab::makeScalingStudy(
        counts,
        0x31c0ffeeU,
        0.5,
        0.001,
        0.02
    );
    check(rows.size() == counts.size(), "scaling study returns every requested size");
    for (const lab::ScalingRow& row : rows) {
        check(
            row.directInteractions == row.bodyCount * (row.bodyCount - 1U),
            "direct work is exactly N times N-1"
        );
        const std::size_t barnesHutWork =
            row.barnesHutMetrics.approximatedNodes + row.barnesHutMetrics.exactInteractions;
        check(barnesHutWork < row.directInteractions, "Barnes-Hut reduces force-source work");
        check(
            std::isfinite(row.directMicroseconds) && std::isfinite(row.barnesHutMicroseconds),
            "both benchmark timings are finite"
        );
    }
}

} // namespace

int main() {
    testDeterministicGalaxy();
    testSoftenedPairForce();
    testDirectOracle();
    testFixedStepPlan();
    testMassOctreeTopology();
    testSelfForceAndOpeningCriterion();
    testThetaAccuracyTradeoff();
    testIntegrationAndValidation();
    testScalingWorkCounts();
    if (failures != 0) {
        std::cerr << failures << " validation checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 31 validation passed\n";
    return EXIT_SUCCESS;
}
