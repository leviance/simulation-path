#pragma once

#include "tree.hpp"

namespace lab {

// Checkpoint 8: theta sweep so lực xấp xỉ với direct oracle trên cùng target set.
#if LAB_CHECKPOINT >= 8
struct AccuracyRow {
    double theta{};
    double meanRelativeError{};
    double maximumRelativeError{};
    ForceMetrics metrics{};
};

inline std::vector<AccuracyRow> measureThetaAccuracy(
    std::span<const Body> bodies,
    std::span<const double> thetaValues,
    std::size_t sampleCount,
    double gravitationalConstant,
    double softening
) {
    if (bodies.empty()) {
        return {};
    }
    const BarnesHutTree tree = buildMassOctree(bodies);
    const std::size_t count = std::min(std::max<std::size_t>(1U, sampleCount), bodies.size());
    std::vector<std::size_t> targets{};
    std::vector<Vec3> exactAccelerations{};
    targets.reserve(count);
    exactAccelerations.reserve(count);
    for (std::size_t index = 0; index < count; ++index) {
        const std::size_t targetIndex = std::min(
            bodies.size() - 1U,
            index * bodies.size() / count
        );
        targets.push_back(targetIndex);
        exactAccelerations.push_back(
            directAcceleration(bodies, targetIndex, gravitationalConstant, softening).acceleration
        );
    }

    std::vector<AccuracyRow> rows{};
    for (const double theta : thetaValues) {
        AccuracyRow row{};
        row.theta = theta;
        for (std::size_t index = 0; index < targets.size(); ++index) {
            const AccelerationResult approximate = barnesHutAcceleration(
                tree,
                bodies,
                targets[index],
                theta,
                gravitationalConstant,
                softening
            );
            const double relativeError =
                length(approximate.acceleration - exactAccelerations[index]) /
                std::max(length(exactAccelerations[index]), 1.0e-12);
            row.meanRelativeError += relativeError;
            row.maximumRelativeError = std::max(row.maximumRelativeError, relativeError);
            row.metrics.visitedNodes += approximate.metrics.visitedNodes;
            row.metrics.approximatedNodes += approximate.metrics.approximatedNodes;
            row.metrics.exactInteractions += approximate.metrics.exactInteractions;
        }
        row.meanRelativeError /= double(targets.size());
        rows.push_back(row);
    }
    return rows;
}
#endif

// Checkpoint 9: scaling study báo cả thời gian lẫn số phép tương tác.
#if LAB_CHECKPOINT >= 9
struct ScalingRow {
    std::size_t bodyCount{};
    double directMicroseconds{};
    double barnesHutMicroseconds{};
    std::size_t directInteractions{};
    ForceMetrics barnesHutMetrics{};
};

inline ScalingRow measureScalingRow(
    std::size_t bodyCount,
    std::uint32_t seed,
    double theta,
    double gravitationalConstant,
    double softening
) {
    const std::vector<Body> bodies = makeGalaxyBodies(bodyCount, seed);
    const auto directStarted = std::chrono::steady_clock::now();
    std::size_t directInteractions = 0;
    const std::vector<Vec3> direct = directAccelerations(
        bodies,
        gravitationalConstant,
        softening,
        &directInteractions
    );
    const auto directFinished = std::chrono::steady_clock::now();

    const BarnesHutTree tree = buildMassOctree(bodies);
    const auto barnesHutStarted = std::chrono::steady_clock::now();
    ForceMetrics barnesHutMetrics{};
    const std::vector<Vec3> approximate = barnesHutAccelerations(
        tree,
        bodies,
        theta,
        gravitationalConstant,
        softening,
        &barnesHutMetrics
    );
    const auto barnesHutFinished = std::chrono::steady_clock::now();

    // Volatile sinks keep both result vectors observable in optimized builds.
    volatile double checksum = 0.0;
    for (std::size_t index = 0; index < bodies.size(); ++index) {
        checksum = checksum + direct[index].x + approximate[index].x;
    }
    (void)checksum;
    return {
        bodyCount,
        std::chrono::duration<double, std::micro>(directFinished - directStarted).count(),
        std::chrono::duration<double, std::micro>(barnesHutFinished - barnesHutStarted).count(),
        directInteractions,
        barnesHutMetrics,
    };
}

inline std::vector<ScalingRow> makeScalingStudy(
    std::span<const std::size_t> counts,
    std::uint32_t seed,
    double theta,
    double gravitationalConstant,
    double softening
) {
    std::vector<ScalingRow> rows{};
    for (const std::size_t count : counts) {
        rows.push_back(measureScalingRow(
            count,
            seed,
            theta,
            gravitationalConstant,
            softening
        ));
    }
    return rows;
}
#endif

// Checkpoint 10: diagnostics và report cuối cùng giữ correctness tách khỏi timing.
#if LAB_CHECKPOINT >= 10
struct SystemDiagnostics {
    double kineticEnergy{};
    double potentialEnergy{};
    double totalEnergy{};
    Vec3 momentum{};
    Vec3 centerOfMass{};
};

inline SystemDiagnostics systemDiagnostics(
    std::span<const Body> bodies,
    double gravitationalConstant,
    double softening
) {
    SystemDiagnostics diagnostics{};
    double mass = 0.0;
    Vec3 weightedPosition{};
    for (const Body& body : bodies) {
        mass += body.mass;
        weightedPosition += body.position * body.mass;
        diagnostics.momentum += body.velocity * body.mass;
        diagnostics.kineticEnergy += 0.5 * body.mass * lengthSquared(body.velocity);
    }
    for (std::size_t first = 0; first < bodies.size(); ++first) {
        for (std::size_t second = first + 1U; second < bodies.size(); ++second) {
            const double distance = std::sqrt(
                lengthSquared(bodies[second].position - bodies[first].position) +
                softening * softening
            );
            diagnostics.potentialEnergy -=
                gravitationalConstant * bodies[first].mass * bodies[second].mass /
                std::max(distance, 1.0e-12);
        }
    }
    diagnostics.totalEnergy = diagnostics.kineticEnergy + diagnostics.potentialEnergy;
    if (mass > 0.0) {
        diagnostics.centerOfMass = weightedPosition / mass;
    } else {
        diagnostics.centerOfMass = {};
    }
    return diagnostics;
}

inline bool allFiniteBodies(std::span<const Body> bodies) {
    return std::all_of(bodies.begin(), bodies.end(), [](const Body& body) {
        return finiteVector(body.position) && finiteVector(body.velocity) && body.mass > 0.0;
    });
}

struct BarnesHutValidationReport {
    bool topologyValid{};
    bool finiteState{};
    bool zeroSelfForce{};
    bool thetaAccuracyAcceptable{};
    bool workReduced{};
};

inline BarnesHutValidationReport validateBarnesHutExperiment(
    std::span<const Body> bodies,
    double theta,
    double gravitationalConstant,
    double softening
) {
    if (bodies.empty()) {
        return {};
    }
    const BarnesHutTree tree = buildMassOctree(bodies);
    const BarnesHutTopologyReport topology = inspectMassOctree(tree, bodies);
    const std::array<double, 1> thetaValues{theta};
    const std::vector<AccuracyRow> accuracy = measureThetaAccuracy(
        bodies,
        thetaValues,
        std::min<std::size_t>(24U, bodies.size()),
        gravitationalConstant,
        softening
    );
    const std::vector<Body> oneBody{{{}, {}, 1.0}};
    const BarnesHutTree oneBodyTree = buildMassOctree(oneBody);
    const AccelerationResult self = barnesHutAcceleration(
        oneBodyTree,
        oneBody,
        0,
        1.2,
        gravitationalConstant,
        softening
    );
    const AccelerationResult sample = barnesHutAcceleration(
        tree,
        bodies,
        std::min<std::size_t>(1U, bodies.size() - 1U),
        theta,
        gravitationalConstant,
        softening
    );
    const bool topologyValid = topology.everyBodyStoredOnce &&
        topology.internalNodesEmpty && topology.childIndicesValid &&
        topology.childBoundsValid && topology.aggregateMassValid &&
        topology.centerOfMassValid && topology.statisticsMatch;
    return {
        topologyValid,
        allFiniteBodies(bodies),
        length(self.acceleration) == 0.0,
        !accuracy.empty() && accuracy.front().meanRelativeError < 0.08,
        sample.metrics.exactInteractions + sample.metrics.approximatedNodes < bodies.size(),
    };
}
#endif

} // namespace lab
