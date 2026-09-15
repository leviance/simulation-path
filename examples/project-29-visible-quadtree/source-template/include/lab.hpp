#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
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

struct Vec2 {
    double x{};
    double y{};
};

struct Particle {
    Vec2 position{};
};

struct Bounds2D {
    Vec2 minimum{};
    Vec2 maximum{};
};

struct SelectionBox {
    Vec2 minimum{};
    Vec2 maximum{};
};

inline SelectionBox normalizeSelectionBox(const Vec2& a, const Vec2& b) {
    return {{std::min(a.x, b.x), std::min(a.y, b.y)}, {std::max(a.x, b.x), std::max(a.y, b.y)}};
}

inline bool pointInsideBox(const Vec2& point, const Bounds2D& box) {
    return point.x >= box.minimum.x && point.x <= box.maximum.x && point.y >= box.minimum.y && point.y <= box.maximum.y;
}

inline bool pointInsideSelection(const Vec2& point, const SelectionBox& selection) {
    return point.x >= selection.minimum.x && point.x <= selection.maximum.x && point.y >= selection.minimum.y && point.y <= selection.maximum.y;
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

inline std::vector<Particle> makeParticleCloud(std::size_t count, const Bounds2D& bounds, std::uint32_t seed, bool clustered) {
    const double width = bounds.maximum.x - bounds.minimum.x;
    const double height = bounds.maximum.y - bounds.minimum.y;
    const std::array<Vec2, 3> anchors{{{0.24, 0.27}, {0.72, 0.66}, {0.32, 0.79}}};
    XorShift32 random(seed);
    std::vector<Particle> particles{};
    particles.reserve(count);

    for (std::size_t index = 0; index < count; ++index) {
        double normalizedX = random.unit();
        double normalizedY = random.unit();
        if (clustered && index % 5U != 0U) {
            const Vec2 anchor = anchors[index % anchors.size()];
            normalizedX = anchor.x + (normalizedX - 0.5) * 0.2;
            normalizedY = anchor.y + (normalizedY - 0.5) * 0.2;
        }
        particles.push_back({{bounds.minimum.x + normalizedX * width, bounds.minimum.y + normalizedY * height}});
    }
    return particles;
}

struct BruteSelectionResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t scanned{};
};

inline void querySelectionBruteForce(std::span<const Particle> particles, const SelectionBox& selection, BruteSelectionResult& result) {
    result.hitIndices.clear();
    result.scanned = 0;
    for (std::size_t particleIndex = 0; particleIndex < particles.size(); ++particleIndex) {
        ++result.scanned;
        if (pointInsideSelection(particles[particleIndex].position, selection)) {
            result.hitIndices.push_back(particleIndex);
        }
    }
}

// Checkpoint 1: chốt quy ước AABB và quadrant trước khi tạo node.
#if LAB_CHECKPOINT >= 1
inline bool boxesOverlap(const Bounds2D& a, const Bounds2D& b) {
    return !(a.maximum.x < b.minimum.x || a.minimum.x > b.maximum.x || a.maximum.y < b.minimum.y || a.minimum.y > b.maximum.y);
}

inline Bounds2D selectionBounds(const SelectionBox& selection) {
    return {selection.minimum, selection.maximum};
}

inline int quadtreeQuadrant(const Vec2& point, const Bounds2D& bounds) {
    const double middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
    const double middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
    const bool east = point.x >= middleX;
    const bool north = point.y >= middleY;
    if (north) {
        if (east) {
            return 3;
        }
        return 2;
    }
    if (east) {
        return 1;
    }
    return 0;
}

inline Bounds2D quadtreeChildBounds(const Bounds2D& bounds, int quadrant) {
    const double middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
    const double middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
    if (quadrant == 0) {
        return {bounds.minimum, {middleX, middleY}};
    }
    if (quadrant == 1) {
        return {{middleX, bounds.minimum.y}, {bounds.maximum.x, middleY}};
    }
    if (quadrant == 2) {
        return {{bounds.minimum.x, middleY}, {middleX, bounds.maximum.y}};
    }
    return {{middleX, middleY}, bounds.maximum};
}
#endif

// Checkpoint 2: tạo root node và đưa toàn bộ index hợp lệ vào một leaf.
#if LAB_CHECKPOINT >= 2
inline constexpr std::size_t noNodeIndex = std::numeric_limits<std::size_t>::max();

struct QuadtreeConfig {
    Bounds2D bounds{};
    std::size_t leafCapacity{8};
    int maximumDepth{12};
    double minimumNodeSize{1.0 / 4096.0};
};

struct QuadtreeNode {
    Bounds2D bounds{};
    int depth{};
    std::vector<std::size_t> particleIndices{};
    std::array<std::size_t, 4> children{noNodeIndex, noNodeIndex, noNodeIndex, noNodeIndex};

    bool isLeaf() const {
        return children[0] == noNodeIndex;
    }
};

struct Quadtree {
    QuadtreeConfig config{};
    std::vector<QuadtreeNode> nodes{};
    std::size_t particleCount{};
    std::size_t insertedCount{};
    std::size_t leafCount{};
    std::size_t internalNodeCount{};
    int maximumObservedDepth{};
    std::size_t maximumLeafOccupancy{};
    double rebuildMicroseconds{};
};

inline bool validQuadtreeConfig(const QuadtreeConfig& config) {
    const double width = config.bounds.maximum.x - config.bounds.minimum.x;
    const double height = config.bounds.maximum.y - config.bounds.minimum.y;
    return width > 0.0 && height > 0.0 && config.leafCapacity > 0U && config.maximumDepth >= 0 && config.minimumNodeSize >= 0.0;
}

inline Quadtree createRootQuadtree(std::span<const Particle> particles, const QuadtreeConfig& config) {
    Quadtree tree{};
    tree.config = config;
    tree.particleCount = particles.size();
    if (!validQuadtreeConfig(config)) {
        return tree;
    }

    tree.nodes.push_back({config.bounds, 0});
    for (std::size_t particleIndex = 0; particleIndex < particles.size(); ++particleIndex) {
        if (pointInsideBox(particles[particleIndex].position, config.bounds)) {
            tree.nodes[0].particleIndices.push_back(particleIndex);
            ++tree.insertedCount;
        }
    }
    tree.leafCount = 1;
    tree.maximumLeafOccupancy = tree.insertedCount;
    return tree;
}
#endif

// Checkpoint 3: leaf vượt capacity sẽ split rồi phân phối lại index cũ.
#if LAB_CHECKPOINT >= 3
inline bool nodeCanSplit(const QuadtreeNode& node, const QuadtreeConfig& config) {
    const double width = node.bounds.maximum.x - node.bounds.minimum.x;
    const double height = node.bounds.maximum.y - node.bounds.minimum.y;
    return node.depth < config.maximumDepth && width * 0.5 >= config.minimumNodeSize && height * 0.5 >= config.minimumNodeSize;
}

inline void insertAtNode(Quadtree& tree, std::span<const Particle> particles, std::size_t particleIndex, std::size_t nodeIndex) {
    const std::array<std::size_t, 4> children = tree.nodes[nodeIndex].children;
    if (!tree.nodes[nodeIndex].isLeaf()) {
        const int quadrant = quadtreeQuadrant(particles[particleIndex].position, tree.nodes[nodeIndex].bounds);
        insertAtNode(tree, particles, particleIndex, children[std::size_t(quadrant)]);
        return;
    }

    QuadtreeNode& node = tree.nodes[nodeIndex];
    if (node.particleIndices.size() < tree.config.leafCapacity || !nodeCanSplit(node, tree.config)) {
        node.particleIndices.push_back(particleIndex);
        return;
    }

    const Bounds2D parentBounds = node.bounds;
    const int childDepth = node.depth + 1;
    const std::size_t firstChildIndex = tree.nodes.size();
    for (int quadrant = 0; quadrant < 4; ++quadrant) {
        tree.nodes.push_back({quadtreeChildBounds(parentBounds, quadrant), childDepth});
    }

    std::vector<std::size_t> existingIndices = std::move(tree.nodes[nodeIndex].particleIndices);
    tree.nodes[nodeIndex].particleIndices.clear();
    tree.nodes[nodeIndex].children = {firstChildIndex, firstChildIndex + 1U, firstChildIndex + 2U, firstChildIndex + 3U};

    for (const std::size_t existingIndex : existingIndices) {
        const int quadrant = quadtreeQuadrant(particles[existingIndex].position, parentBounds);
        insertAtNode(tree, particles, existingIndex, tree.nodes[nodeIndex].children[std::size_t(quadrant)]);
    }
    const int quadrant = quadtreeQuadrant(particles[particleIndex].position, parentBounds);
    insertAtNode(tree, particles, particleIndex, tree.nodes[nodeIndex].children[std::size_t(quadrant)]);
}

inline Quadtree buildQuadtree(std::span<const Particle> particles, const QuadtreeConfig& config) {
    const auto started = std::chrono::steady_clock::now();
    Quadtree tree{};
    tree.config = config;
    tree.particleCount = particles.size();
    if (!validQuadtreeConfig(config)) {
        return tree;
    }

    tree.nodes.push_back({config.bounds, 0});
    for (std::size_t particleIndex = 0; particleIndex < particles.size(); ++particleIndex) {
        if (!pointInsideBox(particles[particleIndex].position, config.bounds)) {
            continue;
        }
        insertAtNode(tree, particles, particleIndex, 0);
        ++tree.insertedCount;
    }

    for (const QuadtreeNode& node : tree.nodes) {
        tree.maximumObservedDepth = std::max(tree.maximumObservedDepth, node.depth);
        if (node.isLeaf()) {
            ++tree.leafCount;
            tree.maximumLeafOccupancy = std::max(tree.maximumLeafOccupancy, node.particleIndices.size());
        } else {
            ++tree.internalNodeCount;
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    tree.rebuildMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return tree;
}
#endif

// Checkpoint 4: kiểm topology thay vì tin hình vẽ trên màn hình.
#if LAB_CHECKPOINT >= 4
struct QuadtreeTopologyReport {
    bool everyParticleStoredOnce{};
    bool internalNodesEmpty{};
    bool childIndicesValid{};
    bool capacityHonored{};
    bool statisticsMatch{};
};

inline QuadtreeTopologyReport inspectQuadtreeTopology(const Quadtree& tree, std::size_t particleCount) {
    std::vector<int> insertionCounts(particleCount, 0);
    bool internalNodesEmpty = true;
    bool childIndicesValid = true;
    bool capacityHonored = true;
    std::size_t leaves = 0;
    std::size_t internalNodes = 0;

    for (const QuadtreeNode& node : tree.nodes) {
        if (node.isLeaf()) {
            ++leaves;
            const bool splitGuardReached = !nodeCanSplit(node, tree.config);
            if (node.particleIndices.size() > tree.config.leafCapacity && !splitGuardReached) {
                capacityHonored = false;
            }
            for (const std::size_t particleIndex : node.particleIndices) {
                if (particleIndex >= insertionCounts.size()) {
                    childIndicesValid = false;
                } else {
                    ++insertionCounts[particleIndex];
                }
            }
        } else {
            ++internalNodes;
            internalNodesEmpty = internalNodesEmpty && node.particleIndices.empty();
            for (const std::size_t childIndex : node.children) {
                childIndicesValid = childIndicesValid && childIndex < tree.nodes.size();
            }
        }
    }

    bool everyParticleStoredOnce = tree.insertedCount == particleCount;
    for (const int count : insertionCounts) {
        everyParticleStoredOnce = everyParticleStoredOnce && count == 1;
    }
    const bool statisticsMatch = leaves == tree.leafCount && internalNodes == tree.internalNodeCount && leaves + internalNodes == tree.nodes.size();
    return {everyParticleStoredOnce, internalNodesEmpty, childIndicesValid, capacityHonored, statisticsMatch};
}
#endif

// Checkpoint 5: bỏ cả subtree không overlap rồi exact-test point trong leaf.
#if LAB_CHECKPOINT >= 5
struct QuadtreeQueryResult {
    std::vector<std::size_t> hitIndices{};
    std::size_t visitedNodes{};
    std::size_t prunedNodes{};
    std::size_t visitedLeaves{};
    std::size_t candidatesChecked{};
};

inline void queryQuadtreeNode(const Quadtree& tree, std::span<const Particle> particles, const SelectionBox& selection, std::size_t nodeIndex, QuadtreeQueryResult& result) {
    const QuadtreeNode& node = tree.nodes[nodeIndex];
    ++result.visitedNodes;
    if (!boxesOverlap(node.bounds, selectionBounds(selection))) {
        ++result.prunedNodes;
        return;
    }

    if (!node.isLeaf()) {
        for (const std::size_t childIndex : node.children) {
            queryQuadtreeNode(tree, particles, selection, childIndex, result);
        }
        return;
    }

    ++result.visitedLeaves;
    for (const std::size_t particleIndex : node.particleIndices) {
        ++result.candidatesChecked;
        if (pointInsideSelection(particles[particleIndex].position, selection)) {
            result.hitIndices.push_back(particleIndex);
        }
    }
}

inline void queryQuadtree(const Quadtree& tree, std::span<const Particle> particles, const SelectionBox& selection, QuadtreeQueryResult& result) {
    result.hitIndices.clear();
    result.visitedNodes = 0;
    result.prunedNodes = 0;
    result.visitedLeaves = 0;
    result.candidatesChecked = 0;
    if (!tree.nodes.empty()) {
        queryQuadtreeNode(tree, particles, selection, 0, result);
    }
}
#endif

// Checkpoint 6: dùng brute force làm oracle cho cùng selection set.
#if LAB_CHECKPOINT >= 6
inline std::vector<std::size_t> canonicalSelectionHits(std::span<const std::size_t> hitIndices) {
    std::vector<std::size_t> canonical(hitIndices.begin(), hitIndices.end());
    std::sort(canonical.begin(), canonical.end());
    return canonical;
}

inline bool quadtreeMatchesBruteForce(const QuadtreeQueryResult& treeResult, const BruteSelectionResult& bruteResult) {
    return canonicalSelectionHits(treeResult.hitIndices) == canonicalSelectionHits(bruteResult.hitIndices);
}

inline std::vector<SelectionBox> makeSelectionQueries(std::size_t count, const Bounds2D& bounds, double width, double height, std::uint32_t seed) {
    const std::vector<Particle> centers = makeParticleCloud(count, bounds, seed, false);
    std::vector<SelectionBox> selections{};
    selections.reserve(count);
    for (const Particle& center : centers) {
        selections.push_back(normalizeSelectionBox({center.position.x - width * 0.5, center.position.y - height * 0.5}, {center.position.x + width * 0.5, center.position.y + height * 0.5}));
    }
    return selections;
}
#endif

// Checkpoint 7: benchmark cùng workload và khảo sát leafCapacity.
#if LAB_CHECKPOINT >= 7
struct BatchMetrics {
    std::size_t queryCount{};
    std::size_t totalVisitedNodes{};
    std::size_t totalCandidates{};
    std::size_t totalScanned{};
    std::uint32_t checksum{0x811c9dc5U};
    double elapsedMicroseconds{};
};

inline void updateChecksum(std::uint32_t& checksum, std::span<const std::size_t> hitIndices) {
    std::uint32_t queryHash = std::uint32_t(hitIndices.size());
    for (const std::size_t particleIndex : hitIndices) {
        queryHash += std::uint32_t(particleIndex + 1U) * 0x9e3779b1U;
    }
    checksum ^= queryHash;
    checksum *= 0x01000193U;
}

inline BatchMetrics benchmarkQuadtree(const Quadtree& tree, std::span<const Particle> particles, std::span<const SelectionBox> selections, int repetitions, QuadtreeQueryResult& workspace) {
    BatchMetrics metrics{};
    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < std::max(0, repetitions); ++repetition) {
        for (const SelectionBox& selection : selections) {
            queryQuadtree(tree, particles, selection, workspace);
            ++metrics.queryCount;
            metrics.totalVisitedNodes += workspace.visitedNodes;
            metrics.totalCandidates += workspace.candidatesChecked;
            updateChecksum(metrics.checksum, workspace.hitIndices);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}

inline BatchMetrics benchmarkBruteSelections(std::span<const Particle> particles, std::span<const SelectionBox> selections, int repetitions, BruteSelectionResult& workspace) {
    BatchMetrics metrics{};
    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < std::max(0, repetitions); ++repetition) {
        for (const SelectionBox& selection : selections) {
            querySelectionBruteForce(particles, selection, workspace);
            ++metrics.queryCount;
            metrics.totalScanned += workspace.scanned;
            updateChecksum(metrics.checksum, workspace.hitIndices);
        }
    }
    const auto finished = std::chrono::steady_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
    return metrics;
}

struct CapacityStudyRow {
    std::size_t leafCapacity{};
    std::size_t nodeCount{};
    std::size_t leafCount{};
    int maximumObservedDepth{};
    std::size_t maximumLeafOccupancy{};
    double rebuildMicroseconds{};
    BatchMetrics metrics{};
};

inline std::vector<CapacityStudyRow> makeCapacityStudy(std::span<const Particle> particles, const Bounds2D& bounds, std::span<const SelectionBox> selections, std::span<const std::size_t> capacities, int repetitions) {
    std::vector<CapacityStudyRow> rows{};
    rows.reserve(capacities.size());
    QuadtreeQueryResult workspace{};
    for (const std::size_t leafCapacity : capacities) {
        const Quadtree tree = buildQuadtree(particles, {bounds, leafCapacity, 12, 1.0 / 4096.0});
        const BatchMetrics metrics = benchmarkQuadtree(tree, particles, selections, repetitions, workspace);
        rows.push_back({leafCapacity, tree.nodes.size(), tree.leafCount, tree.maximumObservedDepth, tree.maximumLeafOccupancy, tree.rebuildMicroseconds, metrics});
    }
    return rows;
}
#endif

// Checkpoint 8: preset và validation report cho final.
#if LAB_CHECKPOINT >= 8
enum class QuadtreeDistribution {
    clustered,
    uniform,
};

inline const char* distributionLabel(QuadtreeDistribution distribution) {
    if (distribution == QuadtreeDistribution::clustered) {
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
};

inline ValidationReport validateQuadtreeExperiment(const Bounds2D& bounds, std::uint32_t seed) {
    const std::vector<Particle> particles = makeParticleCloud(10'000, bounds, seed, true);
    const Quadtree tree = buildQuadtree(particles, {bounds, 8, 12, 1.0 / 4096.0});
    const QuadtreeTopologyReport topology = inspectQuadtreeTopology(tree, particles.size());
    const bool topologyValid = topology.everyParticleStoredOnce && topology.internalNodesEmpty && topology.childIndicesValid && topology.capacityHonored && topology.statisticsMatch;

    const std::vector<SelectionBox> selections = makeSelectionQueries(32, bounds, 0.12, 0.09, seed ^ 0x290029U);
    QuadtreeQueryResult treeWorkspace{};
    BruteSelectionResult bruteWorkspace{};
    bool resultMatchesOracle = true;
    for (const SelectionBox& selection : selections) {
        queryQuadtree(tree, particles, selection, treeWorkspace);
        querySelectionBruteForce(particles, selection, bruteWorkspace);
        resultMatchesOracle = resultMatchesOracle && quadtreeMatchesBruteForce(treeWorkspace, bruteWorkspace);
    }

    const BatchMetrics treeMetrics = benchmarkQuadtree(tree, particles, selections, 1, treeWorkspace);
    const BatchMetrics bruteMetrics = benchmarkBruteSelections(particles, selections, 1, bruteWorkspace);
    const bool candidateWorkReduced = treeMetrics.totalCandidates < bruteMetrics.totalScanned;
    const bool checksumMatches = treeMetrics.checksum == bruteMetrics.checksum;
    const bool finiteTiming = std::isfinite(tree.rebuildMicroseconds) && std::isfinite(treeMetrics.elapsedMicroseconds) && std::isfinite(bruteMetrics.elapsedMicroseconds);
    return {topologyValid, resultMatchesOracle, candidateWorkReduced, checksumMatches, finiteTiming};
}
#endif

} // namespace lab
