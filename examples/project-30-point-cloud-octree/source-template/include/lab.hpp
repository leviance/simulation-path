#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <vector>

namespace lab {

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct PointSample {
    Vec3 position{};
};

struct Bounds3D {
    Vec3 minimum{};
    Vec3 maximum{};
};

inline Bounds3D normalizeVolume(const Vec3& a, const Vec3& b) {
    return {
        {std::min(a.x, b.x), std::min(a.y, b.y), std::min(a.z, b.z)},
        {std::max(a.x, b.x), std::max(a.y, b.y), std::max(a.z, b.z)},
    };
}

inline bool pointInsideVolume(const Vec3& point, const Bounds3D& bounds) {
    return point.x >= bounds.minimum.x && point.x <= bounds.maximum.x &&
        point.y >= bounds.minimum.y && point.y <= bounds.maximum.y &&
        point.z >= bounds.minimum.z && point.z <= bounds.maximum.z;
}

class XorShift32 {
    public:
    explicit XorShift32(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0U) {
            state_ = 0x6d2b79f5U;
        }
    }

    std::uint32_t next() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return state_;
    }

    double unit() {
        return double(next()) / double(std::numeric_limits<std::uint32_t>::max());
    }

    private:
    std::uint32_t state_{};
};

inline std::vector<PointSample> makePointCloud(
    std::size_t count,
    const Bounds3D& bounds,
    std::uint32_t seed,
    bool clustered
) {
    const Vec3 size{
        bounds.maximum.x - bounds.minimum.x,
        bounds.maximum.y - bounds.minimum.y,
        bounds.maximum.z - bounds.minimum.z,
    };
    const std::array<Vec3, 4> anchors{{
        {0.23, 0.31, 0.29},
        {0.72, 0.66, 0.68},
        {0.34, 0.76, 0.71},
        {0.73, 0.25, 0.36},
    }};
    XorShift32 random(seed);
    std::vector<PointSample> points{};
    points.reserve(count);

    for (std::size_t index = 0; index < count; ++index) {
        double x = random.unit();
        double y = random.unit();
        double z = random.unit();
        if (clustered && index % 5U != 0U) {
            const Vec3 anchor = anchors[index % anchors.size()];
            x = anchor.x + (x - 0.5) * 0.18;
            y = anchor.y + (y - 0.5) * 0.18;
            z = anchor.z + (z - 0.5) * 0.18;
        }
        points.push_back({{
            bounds.minimum.x + x * size.x,
            bounds.minimum.y + y * size.y,
            bounds.minimum.z + z * size.z,
        }});
    }
    return points;
}

struct BruteVolumeResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t scanned{};
};

inline void queryVolumeBruteForce(
    std::span<const PointSample> points,
    const Bounds3D& volume,
    BruteVolumeResult& result
) {
    result.hitIndices.clear();
    result.scanned = 0;
    for (std::size_t pointIndex = 0; pointIndex < points.size(); ++pointIndex) {
        ++result.scanned;
        if (pointInsideVolume(points[pointIndex].position, volume)) {
            result.hitIndices.push_back(pointIndex);
        }
    }
}

struct OrbitCamera {
    double yaw{0.7};
    double pitch{-0.35};
    double distance{2.4};
    double fieldOfViewRadians{1.0471975512};
    double aspect{1.0};
    double nearPlane{0.1};
};

struct ProjectedPoint {
    double x{};
    double y{};
    double depth{};
    bool visible{};
};

inline ProjectedPoint projectPointWithOrbit(const Vec3& point, const OrbitCamera& camera) {
    const double centeredX = point.x - 0.5;
    const double centeredY = point.y - 0.5;
    const double centeredZ = point.z - 0.5;
    const double cosineYaw = std::cos(camera.yaw);
    const double sineYaw = std::sin(camera.yaw);
    const double yawX = cosineYaw * centeredX - sineYaw * centeredZ;
    const double yawZ = sineYaw * centeredX + cosineYaw * centeredZ;
    const double cosinePitch = std::cos(camera.pitch);
    const double sinePitch = std::sin(camera.pitch);
    const double cameraY = cosinePitch * centeredY - sinePitch * yawZ;
    const double rotatedZ = sinePitch * centeredY + cosinePitch * yawZ;
    const double cameraZ = rotatedZ + camera.distance;
    if (cameraZ <= camera.nearPlane) {
        return {0.0, 0.0, cameraZ, false};
    }
    const double focalScale = 1.0 / std::tan(camera.fieldOfViewRadians * 0.5);
    const double safeAspect = std::max(0.0001, camera.aspect);
    return {
        yawX * focalScale / (cameraZ * safeAspect),
        cameraY * focalScale / cameraZ,
        cameraZ,
        true,
    };
}

// Checkpoint 1: chốt AABB 3D và cách mã hóa tám octant bằng ba bit.
#if LAB_CHECKPOINT >= 1
inline bool volumesOverlap(const Bounds3D& a, const Bounds3D& b) {
    return !(
        a.maximum.x < b.minimum.x || a.minimum.x > b.maximum.x ||
        a.maximum.y < b.minimum.y || a.minimum.y > b.maximum.y ||
        a.maximum.z < b.minimum.z || a.minimum.z > b.maximum.z
    );
}

inline int octreeOctant(const Vec3& point, const Bounds3D& bounds) {
    const double middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
    const double middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
    const double middleZ = (bounds.minimum.z + bounds.maximum.z) * 0.5;
    int octant = 0;
    if (point.x >= middleX) {
        octant |= 1;
    }
    if (point.y >= middleY) {
        octant |= 2;
    }
    if (point.z >= middleZ) {
        octant |= 4;
    }
    return octant;
}

inline Bounds3D octreeChildBounds(const Bounds3D& bounds, int octant) {
    const Vec3 middle{
        (bounds.minimum.x + bounds.maximum.x) * 0.5,
        (bounds.minimum.y + bounds.maximum.y) * 0.5,
        (bounds.minimum.z + bounds.maximum.z) * 0.5,
    };
    Bounds3D child{};
    child.minimum.x = bounds.minimum.x;
    child.minimum.y = bounds.minimum.y;
    child.minimum.z = bounds.minimum.z;
    child.maximum = middle;
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
#endif

// Checkpoint 2: tạo root leaf phủ toàn point cloud.
#if LAB_CHECKPOINT >= 2
inline constexpr std::size_t noNodeIndex = std::numeric_limits<std::size_t>::max();

struct OctreeConfig {
    Bounds3D bounds{};
    std::size_t leafCapacity{16};
    int maximumDepth{10};
    double minimumNodeSize{1.0 / 1024.0};
};

struct OctreeNode {
    Bounds3D bounds{};
    int depth{};
    std::vector<std::size_t> pointIndices{};
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

    bool isLeaf() const {
        return children[0] == noNodeIndex;
    }
};

struct Octree {
    OctreeConfig config{};
    std::vector<OctreeNode> nodes{};
    std::size_t pointCount{};
    std::size_t insertedCount{};
    std::size_t leafCount{};
    std::size_t internalNodeCount{};
    int maximumObservedDepth{};
    std::size_t maximumLeafOccupancy{};
    double rebuildMicroseconds{};
};

inline bool validOctreeConfig(const OctreeConfig& config) {
    const double sizeX = config.bounds.maximum.x - config.bounds.minimum.x;
    const double sizeY = config.bounds.maximum.y - config.bounds.minimum.y;
    const double sizeZ = config.bounds.maximum.z - config.bounds.minimum.z;
    return sizeX > 0.0 && sizeY > 0.0 && sizeZ > 0.0 &&
        config.leafCapacity > 0U && config.maximumDepth >= 0 &&
        config.minimumNodeSize >= 0.0;
}

inline Octree createRootOctree(
    std::span<const PointSample> points,
    const OctreeConfig& config
) {
    Octree tree{};
    tree.config = config;
    tree.pointCount = points.size();
    if (!validOctreeConfig(config)) {
        return tree;
    }
    tree.nodes.push_back({config.bounds, 0});
    for (std::size_t pointIndex = 0; pointIndex < points.size(); ++pointIndex) {
        if (pointInsideVolume(points[pointIndex].position, config.bounds)) {
            tree.nodes[0].pointIndices.push_back(pointIndex);
            ++tree.insertedCount;
        }
    }
    tree.leafCount = 1;
    tree.maximumLeafOccupancy = tree.insertedCount;
    return tree;
}
#endif

// Checkpoint 3: split leaf thành tám child rồi redistribute toàn bộ point index.
#if LAB_CHECKPOINT >= 3
inline bool nodeCanSplit(const OctreeNode& node, const OctreeConfig& config) {
    const double sizeX = node.bounds.maximum.x - node.bounds.minimum.x;
    const double sizeY = node.bounds.maximum.y - node.bounds.minimum.y;
    const double sizeZ = node.bounds.maximum.z - node.bounds.minimum.z;
    return node.depth < config.maximumDepth &&
        sizeX * 0.5 >= config.minimumNodeSize &&
        sizeY * 0.5 >= config.minimumNodeSize &&
        sizeZ * 0.5 >= config.minimumNodeSize;
}

inline void insertAtNode(
    Octree& tree,
    std::span<const PointSample> points,
    std::size_t pointIndex,
    std::size_t nodeIndex
) {
    const std::array<std::size_t, 8> children = tree.nodes[nodeIndex].children;
    if (!tree.nodes[nodeIndex].isLeaf()) {
        const int octant = octreeOctant(points[pointIndex].position, tree.nodes[nodeIndex].bounds);
        insertAtNode(tree, points, pointIndex, children[std::size_t(octant)]);
        return;
    }

    const bool leafHasSpace =
        tree.nodes[nodeIndex].pointIndices.size() < tree.config.leafCapacity;
    if (leafHasSpace || !nodeCanSplit(tree.nodes[nodeIndex], tree.config)) {
        tree.nodes[nodeIndex].pointIndices.push_back(pointIndex);
        return;
    }

    const Bounds3D parentBounds = tree.nodes[nodeIndex].bounds;
    const int childDepth = tree.nodes[nodeIndex].depth + 1;
    const std::size_t firstChildIndex = tree.nodes.size();
    for (int octant = 0; octant < 8; ++octant) {
        tree.nodes.push_back({octreeChildBounds(parentBounds, octant), childDepth});
    }

    std::vector<std::size_t> existingIndices = std::move(tree.nodes[nodeIndex].pointIndices);
    tree.nodes[nodeIndex].pointIndices.clear();
    tree.nodes[nodeIndex].children = {
        firstChildIndex,
        firstChildIndex + 1U,
        firstChildIndex + 2U,
        firstChildIndex + 3U,
        firstChildIndex + 4U,
        firstChildIndex + 5U,
        firstChildIndex + 6U,
        firstChildIndex + 7U,
    };

    for (const std::size_t existingIndex : existingIndices) {
        const int octant = octreeOctant(points[existingIndex].position, parentBounds);
        const std::size_t childIndex = tree.nodes[nodeIndex].children[std::size_t(octant)];
        insertAtNode(tree, points, existingIndex, childIndex);
    }
    const int octant = octreeOctant(points[pointIndex].position, parentBounds);
    const std::size_t childIndex = tree.nodes[nodeIndex].children[std::size_t(octant)];
    insertAtNode(tree, points, pointIndex, childIndex);
}

inline Octree buildOctree(
    std::span<const PointSample> points,
    const OctreeConfig& config
) {
    const auto started = std::chrono::steady_clock::now();
    Octree tree{};
    tree.config = config;
    tree.pointCount = points.size();
    if (!validOctreeConfig(config)) {
        return tree;
    }

    tree.nodes.push_back({config.bounds, 0});
    for (std::size_t pointIndex = 0; pointIndex < points.size(); ++pointIndex) {
        if (!pointInsideVolume(points[pointIndex].position, config.bounds)) {
            continue;
        }
        insertAtNode(tree, points, pointIndex, 0);
        ++tree.insertedCount;
    }

    for (const OctreeNode& node : tree.nodes) {
        tree.maximumObservedDepth = std::max(tree.maximumObservedDepth, node.depth);
        if (node.isLeaf()) {
            ++tree.leafCount;
            tree.maximumLeafOccupancy =
                std::max(tree.maximumLeafOccupancy, node.pointIndices.size());
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

// Checkpoint 4: inspector độc lập kiểm storage, child bounds và thống kê topology.
#if LAB_CHECKPOINT >= 4
struct OctreeTopologyReport {
    bool everyPointStoredOnce{};
    bool internalNodesEmpty{};
    bool childIndicesValid{};
    bool childBoundsValid{};
    bool capacityHonored{};
    bool statisticsMatch{};
};

inline bool sameBounds(const Bounds3D& a, const Bounds3D& b) {
    return a.minimum.x == b.minimum.x && a.minimum.y == b.minimum.y &&
        a.minimum.z == b.minimum.z && a.maximum.x == b.maximum.x &&
        a.maximum.y == b.maximum.y && a.maximum.z == b.maximum.z;
}

inline OctreeTopologyReport inspectOctreeTopology(
    const Octree& tree,
    std::size_t pointCount
) {
    std::vector<int> insertionCounts(pointCount, 0);
    bool internalNodesEmpty = true;
    bool childIndicesValid = true;
    bool childBoundsValid = true;
    bool capacityHonored = true;
    std::size_t leaves = 0;
    std::size_t internalNodes = 0;

    for (const OctreeNode& node : tree.nodes) {
        if (node.isLeaf()) {
            ++leaves;
            if (node.pointIndices.size() > tree.config.leafCapacity &&
                nodeCanSplit(node, tree.config)) {
                capacityHonored = false;
            }
            for (const std::size_t pointIndex : node.pointIndices) {
                if (pointIndex >= insertionCounts.size()) {
                    childIndicesValid = false;
                } else {
                    ++insertionCounts[pointIndex];
                }
            }
            continue;
        }

        ++internalNodes;
        internalNodesEmpty = internalNodesEmpty && node.pointIndices.empty();
        for (int octant = 0; octant < 8; ++octant) {
            const std::size_t childIndex = node.children[std::size_t(octant)];
            if (childIndex >= tree.nodes.size()) {
                childIndicesValid = false;
                continue;
            }
            childBoundsValid = childBoundsValid && sameBounds(tree.nodes[childIndex].bounds, octreeChildBounds(node.bounds, octant));
        }
    }

    bool everyPointStoredOnce = tree.insertedCount == pointCount;
    for (const int count : insertionCounts) {
        everyPointStoredOnce = everyPointStoredOnce && count == 1;
    }
    const bool statisticsMatch =
        leaves == tree.leafCount &&
        internalNodes == tree.internalNodeCount &&
        leaves + internalNodes == tree.nodes.size();
    return {
        everyPointStoredOnce,
        internalNodesEmpty,
        childIndicesValid,
        childBoundsValid,
        capacityHonored,
        statisticsMatch,
    };
}
#endif

// Checkpoint 5: prune node không overlap, exact-test points trong leaf còn lại.
#if LAB_CHECKPOINT >= 5
struct OctreeQueryResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t visitedNodes{};
    std::size_t prunedNodes{};
    std::size_t visitedLeaves{};
    std::size_t candidatesChecked{};
};

inline void queryOctreeNode(
    const Octree& tree,
    std::span<const PointSample> points,
    const Bounds3D& volume,
    std::size_t nodeIndex,
    OctreeQueryResult& result
) {
    const OctreeNode& node = tree.nodes[nodeIndex];
    ++result.visitedNodes;
    if (!volumesOverlap(node.bounds, volume)) {
        ++result.prunedNodes;
        return;
    }
    if (!node.isLeaf()) {
        for (const std::size_t childIndex : node.children) {
            queryOctreeNode(tree, points, volume, childIndex, result);
        }
        return;
    }

    ++result.visitedLeaves;
    for (const std::size_t pointIndex : node.pointIndices) {
        ++result.candidatesChecked;
        if (pointInsideVolume(points[pointIndex].position, volume)) {
            result.hitIndices.push_back(pointIndex);
        }
    }
}

inline void queryOctree(
    const Octree& tree,
    std::span<const PointSample> points,
    const Bounds3D& volume,
    OctreeQueryResult& result
) {
    result.hitIndices.clear();
    result.visitedNodes = 0;
    result.prunedNodes = 0;
    result.visitedLeaves = 0;
    result.candidatesChecked = 0;
    if (!tree.nodes.empty()) {
        queryOctreeNode(tree, points, volume, 0, result);
    }
}
#endif

// Checkpoint 6: canonicalize ngoài hot path để đối chiếu brute-force oracle.
#if LAB_CHECKPOINT >= 6
inline std::vector<std::size_t> canonicalVolumeHits(
    std::span<const std::size_t> hitIndices
) {
    std::vector<std::size_t> canonical(hitIndices.begin(), hitIndices.end());
    std::sort(canonical.begin(), canonical.end());
    return canonical;
}

inline bool octreeMatchesBruteForce(
    const OctreeQueryResult& octreeResult,
    const BruteVolumeResult& bruteResult
) {
    return canonicalVolumeHits(octreeResult.hitIndices) ==
        canonicalVolumeHits(bruteResult.hitIndices);
}

inline std::vector<Bounds3D> makeVolumeQueries(
    std::size_t count,
    const Bounds3D& bounds,
    const Vec3& size,
    std::uint32_t seed
) {
    const std::vector<PointSample> centers = makePointCloud(count, bounds, seed, false);
    std::vector<Bounds3D> volumes{};
    volumes.reserve(count);
    for (const PointSample& center : centers) {
        const Vec3 half{size.x * 0.5, size.y * 0.5, size.z * 0.5};
        volumes.push_back(normalizeVolume(
            {
                center.position.x - half.x,
                center.position.y - half.y,
                center.position.z - half.z,
            },
            {
                center.position.x + half.x,
                center.position.y + half.y,
                center.position.z + half.z,
            }
        ));
    }
    return volumes;
}
#endif

// Checkpoint 7: đo hai algorithm bằng cùng workload và checksum.
#if LAB_CHECKPOINT >= 7
struct BatchMetrics {
    std::size_t queryCount{};
    std::size_t totalVisitedNodes{};
    std::size_t totalCandidates{};
    std::size_t totalScanned{};
    std::uint32_t checksum{0x811c9dc5U};
    double elapsedMicroseconds{};
};

inline void updateChecksum(
    std::uint32_t& checksum,
    std::span<const std::size_t> hitIndices
) {
    std::uint32_t queryHash = std::uint32_t(hitIndices.size());
    for (const std::size_t pointIndex : hitIndices) {
        queryHash += std::uint32_t(pointIndex + 1U) * 0x9e3779b1U;
    }
    checksum ^= queryHash;
    checksum *= 0x01000193U;
}

inline BatchMetrics benchmarkOctree(
    const Octree& tree,
    std::span<const PointSample> points,
    std::span<const Bounds3D> volumes,
    int repetitions,
    OctreeQueryResult& workspace
) {
    BatchMetrics metrics{};
    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < std::max(0, repetitions); ++repetition) {
        for (const Bounds3D& volume : volumes) {
            queryOctree(tree, points, volume, workspace);
            ++metrics.queryCount;
            metrics.totalVisitedNodes += workspace.visitedNodes;
            metrics.totalCandidates += workspace.candidatesChecked;
            updateChecksum(metrics.checksum, workspace.hitIndices);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds =
        std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}

inline BatchMetrics benchmarkBruteVolumes(
    std::span<const PointSample> points,
    std::span<const Bounds3D> volumes,
    int repetitions,
    BruteVolumeResult& workspace
) {
    BatchMetrics metrics{};
    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < std::max(0, repetitions); ++repetition) {
        for (const Bounds3D& volume : volumes) {
            queryVolumeBruteForce(points, volume, workspace);
            ++metrics.queryCount;
            metrics.totalScanned += workspace.scanned;
            updateChecksum(metrics.checksum, workspace.hitIndices);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds =
        std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}
#endif

// Checkpoint 8: khảo sát capacity cùng topology, rebuild và candidate work.
#if LAB_CHECKPOINT >= 8
struct CapacityStudyRow {
    std::size_t leafCapacity{};
    std::size_t nodeCount{};
    std::size_t leafCount{};
    int maximumObservedDepth{};
    std::size_t maximumLeafOccupancy{};
    double rebuildMicroseconds{};
    BatchMetrics metrics{};
};

inline std::vector<CapacityStudyRow> makeCapacityStudy(
    std::span<const PointSample> points,
    const Bounds3D& bounds,
    std::span<const Bounds3D> volumes,
    std::span<const std::size_t> capacities,
    int repetitions
) {
    std::vector<CapacityStudyRow> rows{};
    rows.reserve(capacities.size());
    OctreeQueryResult workspace{};
    for (const std::size_t leafCapacity : capacities) {
        const Octree tree = buildOctree(
            points,
            {bounds, leafCapacity, 10, 1.0 / 1024.0}
        );
        const BatchMetrics metrics =
            benchmarkOctree(tree, points, volumes, repetitions, workspace);
        rows.push_back({
            leafCapacity,
            tree.nodes.size(),
            tree.leafCount,
            tree.maximumObservedDepth,
            tree.maximumLeafOccupancy,
            tree.rebuildMicroseconds,
            metrics,
        });
    }
    return rows;
}
#endif

// Checkpoint 9: preset và validation report của chương trình hoàn chỉnh.
#if LAB_CHECKPOINT >= 9
enum class PointDistribution {
    clustered,
    uniform,
};

inline const char* distributionLabel(PointDistribution distribution) {
    if (distribution == PointDistribution::clustered) {
        return "clustered";
    }
    return "uniform";
}

struct ValidationReport {
    bool topologyValid{};
    bool resultMatchesOracle{};
    bool candidateWorkReduced{};
    bool checksumMatches{};
    bool finiteTiming{};
    bool projectionFinite{};
};

inline ValidationReport validateOctreeExperiment(
    const Bounds3D& bounds,
    std::uint32_t seed
) {
    const std::vector<PointSample> points = makePointCloud(10'000, bounds, seed, true);
    const Octree tree = buildOctree(points, {bounds, 16, 10, 1.0 / 1024.0});
    const OctreeTopologyReport topology = inspectOctreeTopology(tree, points.size());
    const bool topologyValid =
        topology.everyPointStoredOnce &&
        topology.internalNodesEmpty &&
        topology.childIndicesValid &&
        topology.childBoundsValid &&
        topology.capacityHonored && topology.statisticsMatch;

    const std::vector<Bounds3D> volumes = makeVolumeQueries(
        32,
        bounds,
        {0.14, 0.12, 0.10},
        seed ^ 0x300030U
    );
    OctreeQueryResult octreeWorkspace{};
    BruteVolumeResult bruteWorkspace{};
    bool resultMatchesOracle = true;
    for (const Bounds3D& volume : volumes) {
        queryOctree(tree, points, volume, octreeWorkspace);
        queryVolumeBruteForce(points, volume, bruteWorkspace);
        resultMatchesOracle =
            resultMatchesOracle && octreeMatchesBruteForce(octreeWorkspace, bruteWorkspace);
    }

    const BatchMetrics octreeMetrics =
        benchmarkOctree(tree, points, volumes, 1, octreeWorkspace);
    const BatchMetrics bruteMetrics =
        benchmarkBruteVolumes(points, volumes, 1, bruteWorkspace);
    const bool candidateWorkReduced =
        octreeMetrics.totalCandidates < bruteMetrics.totalScanned;
    const bool checksumMatches = octreeMetrics.checksum == bruteMetrics.checksum;
    const bool finiteTiming =
        std::isfinite(tree.rebuildMicroseconds) &&
        std::isfinite(octreeMetrics.elapsedMicroseconds) &&
        std::isfinite(bruteMetrics.elapsedMicroseconds);
    const ProjectedPoint projected = projectPointWithOrbit({0.5, 0.5, 0.5}, OrbitCamera{});
    const bool projectionFinite =
        projected.visible && std::isfinite(projected.x) &&
        std::isfinite(projected.y) &&
        std::isfinite(projected.depth);
    return {
        topologyValid,
        resultMatchesOracle,
        candidateWorkReduced,
        checksumMatches,
        finiteTiming,
        projectionFinite,
    };
}
#endif

} // namespace lab
