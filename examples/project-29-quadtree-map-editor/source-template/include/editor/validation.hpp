#pragma once
// Kiểm topology trước rồi đối chiếu từng query trên cùng revision của bản đồ.
#include "spatial/quadtree.hpp"

namespace maplab {
struct ValidationJob {
    const Quadtree* tree{};
    std::uint64_t revision{};
    std::vector<Box> boxes;
    std::size_t checked{};
    std::size_t failures{};
    bool active{};
    bool stale{};
};

#if LAB_CHECKPOINT >= 9
inline std::vector<Box> queryFixtures(const Box& root) {
    std::vector<Box> boxes{root, {root.x, root.y, 0, 0}, {right(root), bottom(root), 0, 0}, {root.x - 2, root.y - 2, 1, 1}};
    for (int index = 0; index < 32; ++index) {
        const double x = ((index * 977 + 13) % 8192) / 8192.0;
        const double y = ((index * 2039 + 29) % 8192) / 8192.0;
        boxes.push_back({root.x + x * root.width, root.y + y * root.height, 32 + (index % 7) * root.width / 64, 32 + (index % 5) * root.height / 64});
    }
    return boxes;
}

// [snippet:inspectTopology]
inline std::size_t inspectTopology(const Quadtree& tree) {
    std::size_t failures = 0;
    std::unordered_map<std::uint32_t, int> stored;
    for (std::size_t index = 0; index < tree.nodes.size(); ++index) {
        const auto& node = tree.nodes[index];
        if (node.depth > tree.config.maximumDepth) {
            ++failures;
        }
        for (std::uint32_t id : node.ids) {
            ++stored[id];
            const auto object = tree.objects.find(id);
            const auto location = tree.location.find(id);
            if (object == tree.objects.end() || location == tree.location.end()) {
                ++failures;
                continue;
            }
            if (!contains(node.box, object->second.box) || location->second != static_cast<int>(index) || (!node.leaf() && tree.childSlot(object->second.box, node) >= 0)) {
                ++failures;
            }
        }
        if (!node.leaf()) {
            for (int child : node.children) {
                if (child <= static_cast<int>(index) || static_cast<std::size_t>(child) >= tree.nodes.size()) {
                    ++failures;
                } else if (tree.nodes[static_cast<std::size_t>(child)].depth != node.depth + 1) {
                    ++failures;
                }
            }
        }
        const bool splitAllowed = node.depth < tree.config.maximumDepth && node.box.width / 2 >= tree.config.minimumSize && node.box.height / 2 >= tree.config.minimumSize && tree.nodes.size() + 4 <= tree.config.maximumNodes;
        if (node.leaf() && node.ids.size() > tree.config.capacity && splitAllowed) {
            ++failures;
        }
    }
    if (stored.size() != tree.objects.size() || tree.location.size() != tree.objects.size() || tree.nodes.size() > tree.config.maximumNodes) {
        ++failures;
    }
    for (const auto& [id, object] : tree.objects) {
        static_cast<void>(object);
        if (stored[id] != 1) {
            ++failures;
        }
    }
    return failures;
}

// [/snippet:inspectTopology]

inline ValidationJob createValidation(const Quadtree& tree, const Box& view) {
    ValidationJob job{};
    job.tree = &tree;
    job.revision = tree.revision;
    job.boxes = queryFixtures(tree.config.root);
    job.boxes.push_back(view);
    job.failures = inspectTopology(tree);
    job.active = job.failures == 0;
    return job;
}

// [snippet:tickValidation]
inline void tickValidation(ValidationJob& job) {
    if (!job.active) {
        return;
    }
    if (job.tree->revision != job.revision) {
        job.stale = true;
        job.active = false;
        return;
    }
    const auto start = Clock::now();
    do {
        const auto& box = job.boxes.at(job.checked);
        auto actual = job.tree->query(box).ids;
        auto expected = queryBrute(*job.tree, box).ids;
        std::sort(actual.begin(), actual.end());
        std::sort(expected.begin(), expected.end());
        if (actual != expected) {
            ++job.failures;
        }
        ++job.checked;
    } while (job.checked < job.boxes.size() && milliseconds(start, Clock::now()) < 6.0);
    if (job.checked == job.boxes.size()) {
        job.active = false;
    }
}

// [/snippet:tickValidation]
#endif
} // namespace maplab
