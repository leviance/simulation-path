#pragma once

#include "lab.hpp"

namespace lab {

// Checkpoint 5: Octree giữ body indices và aggregate mass/center of mass từ lá lên root.
#if LAB_CHECKPOINT >= 5
struct Bounds3D {
    Vec3 minimum{};
    Vec3 maximum{};
};

inline Bounds3D cubicBoundsForBodies(std::span<const Body> bodies) {
    if (bodies.empty()) {
        return {{-1.0, -1.0, -1.0}, {1.0, 1.0, 1.0}};
    }
    Vec3 minimum = bodies.front().position;
    Vec3 maximum = bodies.front().position;
    for (const Body& body : bodies.subspan(1)) {
        minimum.x = std::min(minimum.x, body.position.x);
        minimum.y = std::min(minimum.y, body.position.y);
        minimum.z = std::min(minimum.z, body.position.z);
        maximum.x = std::max(maximum.x, body.position.x);
        maximum.y = std::max(maximum.y, body.position.y);
        maximum.z = std::max(maximum.z, body.position.z);
    }
    const Vec3 center = (minimum + maximum) * 0.5;
    const double halfExtent =
        std::max({maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z}) *
            0.505 +
        1.0e-6;
    return {
        {center.x - halfExtent, center.y - halfExtent, center.z - halfExtent},
        {center.x + halfExtent, center.y + halfExtent, center.z + halfExtent},
    };
}

inline bool pointInsideBounds(const Vec3& point, const Bounds3D& bounds) {
    return point.x >= bounds.minimum.x && point.x <= bounds.maximum.x &&
        point.y >= bounds.minimum.y && point.y <= bounds.maximum.y &&
        point.z >= bounds.minimum.z && point.z <= bounds.maximum.z;
}

inline int barnesHutOctant(const Vec3& point, const Bounds3D& bounds) {
    const Vec3 middle = (bounds.minimum + bounds.maximum) * 0.5;
    int octant = 0;
    if (point.x >= middle.x) {
        octant |= 1;
    }
    if (point.y >= middle.y) {
        octant |= 2;
    }
    if (point.z >= middle.z) {
        octant |= 4;
    }
    return octant;
}

inline Bounds3D barnesHutChildBounds(const Bounds3D& bounds, int octant) {
    const Vec3 middle = (bounds.minimum + bounds.maximum) * 0.5;
    Bounds3D child{bounds.minimum, middle};
    if ((octant & 1) != 0) {
        child.minimum.x = middle.x;
        child.maximum.x = bounds.maximum.x;
    }
    if ((octant & 2) != 0) {
        child.minimum.y = middle.y;
        child.maximum.y = bounds.maximum.y;
    }
    if ((octant & 4) != 0) {
        child.minimum.z = middle.z;
        child.maximum.z = bounds.maximum.z;
    }
    return child;
}

inline constexpr std::size_t noNodeIndex = std::numeric_limits<std::size_t>::max();

struct BarnesHutConfig {
    std::size_t leafCapacity{1};
    int maximumDepth{16};
    double minimumNodeSize{1.0e-6};
};

struct BarnesHutNode {
    Bounds3D bounds{};
    int depth{};
    std::vector<std::size_t> bodyIndices{};
    std::array<std::size_t, 8> children{
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
        noNodeIndex,
    };
    double totalMass{};
    Vec3 centerOfMass{};

    bool isLeaf() const {
        return children[0] == noNodeIndex;
    }
};

struct BarnesHutTree {
    BarnesHutConfig config{};
    std::vector<BarnesHutNode> nodes{};
    std::size_t bodyCount{};
    std::size_t leafCount{};
    std::size_t internalNodeCount{};
    int maximumObservedDepth{};
    std::size_t maximumLeafOccupancy{};
    double rebuildMicroseconds{};
};

inline bool nodeCanSplit(const BarnesHutNode& node, const BarnesHutConfig& config) {
    const double side = node.bounds.maximum.x - node.bounds.minimum.x;
    return node.depth < config.maximumDepth && side * 0.5 >= config.minimumNodeSize;
}

inline void insertBodyAtNode(
    BarnesHutTree& tree,
    std::span<const Body> bodies,
    std::size_t bodyIndex,
    std::size_t nodeIndex
) {
    if (!tree.nodes[nodeIndex].isLeaf()) {
        const int octant = barnesHutOctant(
            bodies[bodyIndex].position,
            tree.nodes[nodeIndex].bounds
        );
        const std::size_t childIndex = tree.nodes[nodeIndex].children[octant];
        insertBodyAtNode(tree, bodies, bodyIndex, childIndex);
        return;
    }

    if (
        tree.nodes[nodeIndex].bodyIndices.size() < tree.config.leafCapacity ||
        !nodeCanSplit(tree.nodes[nodeIndex], tree.config) ||
        tree.nodes.size() + 8U > 1'000'000U
    ) {
        tree.nodes[nodeIndex].bodyIndices.push_back(bodyIndex);
        return;
    }

    std::vector<std::size_t> indices = std::move(tree.nodes[nodeIndex].bodyIndices);
    indices.push_back(bodyIndex);
    const Bounds3D parentBounds = tree.nodes[nodeIndex].bounds;
    const int childDepth = tree.nodes[nodeIndex].depth + 1;
    const std::size_t firstChildIndex = tree.nodes.size();
    for (int octant = 0; octant < 8; ++octant) {
        BarnesHutNode child{};
        child.bounds = barnesHutChildBounds(parentBounds, octant);
        child.depth = childDepth;
        tree.nodes.push_back(std::move(child));
    }
    for (int octant = 0; octant < 8; ++octant) {
        tree.nodes[nodeIndex].children[octant] = firstChildIndex + std::size_t(octant);
    }
    for (const std::size_t oldIndex : indices) {
        const int octant = barnesHutOctant(bodies[oldIndex].position, parentBounds);
        const std::size_t childIndex = tree.nodes[nodeIndex].children[octant];
        insertBodyAtNode(tree, bodies, oldIndex, childIndex);
    }
}

inline void accumulateNodeMass(
    BarnesHutTree& tree,
    std::span<const Body> bodies,
    std::size_t nodeIndex
) {
    double mass = 0.0;
    Vec3 weightedPosition{};
    if (tree.nodes[nodeIndex].isLeaf()) {
        for (const std::size_t bodyIndex : tree.nodes[nodeIndex].bodyIndices) {
            mass += bodies[bodyIndex].mass;
            weightedPosition += bodies[bodyIndex].position * bodies[bodyIndex].mass;
        }
    } else {
        for (const std::size_t childIndex : tree.nodes[nodeIndex].children) {
            accumulateNodeMass(tree, bodies, childIndex);
            mass += tree.nodes[childIndex].totalMass;
            weightedPosition +=
                tree.nodes[childIndex].centerOfMass * tree.nodes[childIndex].totalMass;
        }
    }
    tree.nodes[nodeIndex].totalMass = mass;
    if (mass > 0.0) {
        tree.nodes[nodeIndex].centerOfMass = weightedPosition / mass;
    } else {
        tree.nodes[nodeIndex].centerOfMass = {};
    }
}

inline BarnesHutTree buildMassOctree(
    std::span<const Body> bodies,
    const BarnesHutConfig& config = {}
) {
    const auto started = std::chrono::steady_clock::now();
    BarnesHutTree tree{};
    tree.config = config;
    tree.bodyCount = bodies.size();
    tree.nodes.push_back({cubicBoundsForBodies(bodies), 0});
    for (std::size_t bodyIndex = 0; bodyIndex < bodies.size(); ++bodyIndex) {
        insertBodyAtNode(tree, bodies, bodyIndex, 0);
    }
    accumulateNodeMass(tree, bodies, 0);
    for (const BarnesHutNode& node : tree.nodes) {
        tree.maximumObservedDepth = std::max(tree.maximumObservedDepth, node.depth);
        if (node.isLeaf()) {
            ++tree.leafCount;
            tree.maximumLeafOccupancy =
                std::max(tree.maximumLeafOccupancy, node.bodyIndices.size());
        } else {
            ++tree.internalNodeCount;
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    tree.rebuildMicroseconds =
        std::chrono::duration<double, std::micro>(finished - started).count();
    return tree;
}
#endif

// Checkpoint 6: dùng opening criterion s/d < theta cho node không chứa target.
#if LAB_CHECKPOINT >= 6
inline void accumulateBarnesHutNode(
    const BarnesHutTree& tree,
    std::span<const Body> bodies,
    std::size_t targetIndex,
    std::size_t nodeIndex,
    double theta,
    double gravitationalConstant,
    double softening,
    AccelerationResult& result
) {
    const BarnesHutNode& node = tree.nodes[nodeIndex];
    ++result.metrics.visitedNodes;
    if (node.totalMass <= 0.0) {
        return;
    }

    if (node.isLeaf()) {
        for (const std::size_t sourceIndex : node.bodyIndices) {
            if (sourceIndex == targetIndex) {
                continue;
            }
            result.acceleration += softenedAcceleration(
                bodies[targetIndex].position,
                bodies[sourceIndex].position,
                bodies[sourceIndex].mass,
                gravitationalConstant,
                softening
            );
            ++result.metrics.exactInteractions;
        }
        return;
    }

    const Vec3 displacement = node.centerOfMass - bodies[targetIndex].position;
    const double distanceToCenter = length(displacement);
    const double nodeSize = node.bounds.maximum.x - node.bounds.minimum.x;
    const bool containsTarget = pointInsideBounds(bodies[targetIndex].position, node.bounds);
    if (
        !containsTarget && distanceToCenter > 0.0 &&
        nodeSize / distanceToCenter < theta
    ) {
        result.acceleration += softenedAcceleration(
            bodies[targetIndex].position,
            node.centerOfMass,
            node.totalMass,
            gravitationalConstant,
            softening
        );
        ++result.metrics.approximatedNodes;
        return;
    }

    for (const std::size_t childIndex : node.children) {
        accumulateBarnesHutNode(
            tree,
            bodies,
            targetIndex,
            childIndex,
            theta,
            gravitationalConstant,
            softening,
            result
        );
    }
}

inline AccelerationResult barnesHutAcceleration(
    const BarnesHutTree& tree,
    std::span<const Body> bodies,
    std::size_t targetIndex,
    double theta,
    double gravitationalConstant,
    double softening
) {
    AccelerationResult result{};
    if (targetIndex < bodies.size() && !tree.nodes.empty()) {
        accumulateBarnesHutNode(
            tree,
            bodies,
            targetIndex,
            0,
            theta,
            gravitationalConstant,
            softening,
            result
        );
    }
    return result;
}

inline std::vector<Vec3> barnesHutAccelerations(
    const BarnesHutTree& tree,
    std::span<const Body> bodies,
    double theta,
    double gravitationalConstant,
    double softening,
    ForceMetrics* totalMetrics = nullptr
) {
    std::vector<Vec3> accelerations(bodies.size());
    ForceMetrics metrics{};
    for (std::size_t targetIndex = 0; targetIndex < bodies.size(); ++targetIndex) {
        const AccelerationResult result = barnesHutAcceleration(
            tree,
            bodies,
            targetIndex,
            theta,
            gravitationalConstant,
            softening
        );
        accelerations[targetIndex] = result.acceleration;
        metrics.visitedNodes += result.metrics.visitedNodes;
        metrics.approximatedNodes += result.metrics.approximatedNodes;
        metrics.exactInteractions += result.metrics.exactInteractions;
    }
    if (totalMetrics) {
        *totalMetrics = metrics;
    }
    return accelerations;
}
#endif

// Checkpoint 7: inspector độc lập kiểm storage, child bounds và aggregate mass.
#if LAB_CHECKPOINT >= 7
struct BarnesHutTopologyReport {
    bool everyBodyStoredOnce{true};
    bool internalNodesEmpty{true};
    bool childIndicesValid{true};
    bool childBoundsValid{true};
    bool aggregateMassValid{true};
    bool centerOfMassValid{true};
    bool statisticsMatch{true};
};

inline bool nearlyEqual(double a, double b, double tolerance = 1.0e-9) {
    return std::abs(a - b) <= tolerance;
}

inline bool sameBounds(const Bounds3D& a, const Bounds3D& b) {
    return nearlyEqual(a.minimum.x, b.minimum.x) &&
        nearlyEqual(a.minimum.y, b.minimum.y) &&
        nearlyEqual(a.minimum.z, b.minimum.z) &&
        nearlyEqual(a.maximum.x, b.maximum.x) &&
        nearlyEqual(a.maximum.y, b.maximum.y) &&
        nearlyEqual(a.maximum.z, b.maximum.z);
}

inline BarnesHutTopologyReport inspectMassOctree(
    const BarnesHutTree& tree,
    std::span<const Body> bodies
) {
    BarnesHutTopologyReport report{};
    std::vector<int> insertionCounts(bodies.size(), 0);
    std::size_t leaves = 0;
    std::size_t internalNodes = 0;
    for (std::size_t nodeIndex = 0; nodeIndex < tree.nodes.size(); ++nodeIndex) {
        const BarnesHutNode& node = tree.nodes[nodeIndex];
        if (node.isLeaf()) {
            ++leaves;
            for (const std::size_t bodyIndex : node.bodyIndices) {
                if (bodyIndex >= bodies.size()) {
                    report.childIndicesValid = false;
                } else {
                    ++insertionCounts[bodyIndex];
                }
            }
            continue;
        }

        ++internalNodes;
        report.internalNodesEmpty = report.internalNodesEmpty && node.bodyIndices.empty();
        double childMass = 0.0;
        Vec3 weightedCenter{};
        for (int octant = 0; octant < 8; ++octant) {
            const std::size_t childIndex = node.children[octant];
            if (childIndex >= tree.nodes.size()) {
                report.childIndicesValid = false;
                continue;
            }
            const BarnesHutNode& child = tree.nodes[childIndex];
            report.childBoundsValid = report.childBoundsValid &&
                sameBounds(child.bounds, barnesHutChildBounds(node.bounds, octant));
            childMass += child.totalMass;
            weightedCenter += child.centerOfMass * child.totalMass;
        }
        report.aggregateMassValid =
            report.aggregateMassValid && nearlyEqual(childMass, node.totalMass);
        if (childMass > 0.0) {
            report.centerOfMassValid = report.centerOfMassValid &&
                length(weightedCenter / childMass - node.centerOfMass) <= 1.0e-9;
        }
    }
    report.everyBodyStoredOnce = std::all_of(
        insertionCounts.begin(),
        insertionCounts.end(),
        [](int count) {
            return count == 1;
        }
    );
    report.statisticsMatch = leaves == tree.leafCount &&
        internalNodes == tree.internalNodeCount &&
        leaves + internalNodes == tree.nodes.size();
    return report;
}
#endif

} // namespace lab
