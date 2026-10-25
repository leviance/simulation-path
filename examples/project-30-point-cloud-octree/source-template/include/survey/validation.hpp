#pragma once
// Validation chạy trên dataset hiện tại, không chỉ trên recipe mặc định.
#include "scene.hpp"
#include <unordered_set>

namespace survey {
// [snippet:sameIndices]
inline bool sameIndices(const Result& a, const Result& b) {
    auto first = a.indices;
    auto second = b.indices;
    std::sort(first.begin(), first.end());
    std::sort(second.begin(), second.end());
    return first == second && std::adjacent_find(first.begin(), first.end()) == first.end();
}

// [/snippet:sameIndices]

// [snippet:topologyErrors]
inline std::size_t topologyErrors(const Octree& tree, const std::vector<Point>& points) {
#if LAB_CHECKPOINT >= 9
    std::size_t errors = 0;
    std::vector<std::size_t> stored(points.size(), 0);
    std::vector<bool> reached(tree.nodes.size(), false);
    std::vector<std::size_t> pending{0};
    while (!pending.empty()) {
        const auto index = pending.back();
        pending.pop_back();
        if (index >= tree.nodes.size() || reached[index]) {
            ++errors;
            continue;
        }
        reached[index] = true;
        const Node& node = tree.nodes[index];
        if (node.depth > tree.maximumDepth || !valid(node.bounds)) {
            ++errors;
        }
        if (node.children[0] >= 0) {
            if (!node.indices.empty()) {
                ++errors;
            }
            for (int child : node.children) {
                if (child < 0 || std::size_t(child) >= tree.nodes.size()) {
                    ++errors;
                    continue;
                }
                if (tree.nodes[std::size_t(child)].depth != node.depth + 1) {
                    ++errors;
                }
                pending.push_back(std::size_t(child));
            }
        }
        for (auto pointIndex : node.indices) {
            if (pointIndex >= points.size()) {
                ++errors;
                continue;
            }
            ++stored[pointIndex];
            if (!contains(node.bounds, points[pointIndex].position)) {
                ++errors;
            }
        }
    }
    for (auto count : stored) {
        if (count != 1) {
            ++errors;
        }
    }
    for (bool seen : reached) {
        if (!seen) {
            ++errors;
        }
    }
    return errors;
#else
    static_cast<void>(tree);
    static_cast<void>(points);
    return 0;
#endif
}

// [/snippet:topologyErrors]

inline std::vector<Region> validationRegions(Box bounds) {
    std::vector<Region> regions;
    const Vec3 center = (bounds.minimum + bounds.maximum) * 0.5;
    const Vec3 half = (bounds.maximum - bounds.minimum) * 0.5;
    Random random{3009};
    for (std::size_t index = 0; index < 32; ++index) {
        Region region{};
        region.center = center + Vec3{(random.next() - 0.5) * half.x * 2, (random.next() - 0.5) * half.y * 2, (random.next() - 0.5) * half.z * 2};
        region.half = half * 0.2;
        region.radius = half.x * 0.3;
        if (index % 2) {
            region.shape = Shape::Sphere;
        }
        if (index % 3 == 0) {
            region.minimumHeight = center.y;
        }
        regions.push_back(region);
    }
    Region whole{};
    whole.center = center;
    whole.half = half;
    regions.push_back(whole);
    whole.center = bounds.maximum + Vec3{100, 100, 100};
    regions.push_back(whole);
    return regions;
}

struct Job {
    bool active{};
    bool paused{};
    bool benchmark{};
    bool useTree = true;
    std::size_t queryIndex{};
    std::size_t iteration{};
    std::size_t errors{};
    std::uint64_t checksum{};
    double batchMilliseconds{};
    std::vector<Region> regions;
    std::vector<double> samples;
    std::string report;
};

inline Job startValidation(const Scene& scene) {
    Job job{};
    job.active = true;
    job.regions = validationRegions(scene.tree.nodes[0].bounds);
    job.regions.insert(job.regions.begin(), scene.region);
    job.regions.push_back(cameraFrustum(scene.camera, 1.5));
    job.errors = topologyErrors(scene.tree, scene.points);
    if (job.errors != 0) {
        job.active = false;
        job.report = "Topology errors: " + std::to_string(job.errors) + "; query not started.";
    }
    return job;
}

// [snippet:tickValidation]
inline void tickValidation(Job& job, const Scene& scene) {
#if LAB_CHECKPOINT >= 9
    if (!job.active || job.paused) {
        return;
    }
    const auto start = Clock::now();
    do {
        const Region& region = job.regions.at(job.queryIndex);
        const Result indexed = scene.tree.query(scene.points, region);
        const Result reference = brute(scene.points, region);
        if (!sameIndices(indexed, reference)) {
            ++job.errors;
        }
        ++job.queryIndex;
        if (job.queryIndex == job.regions.size()) {
            job.active = false;
            job.report = std::to_string(job.queryIndex) + " queries; " + std::to_string(job.errors) + " errors";
        }
    } while (job.active && elapsedMs(start) < 6.0);
#else
    static_cast<void>(job);
    static_cast<void>(scene);
#endif
}

// [/snippet:tickValidation]
} // namespace survey
