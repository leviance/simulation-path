#pragma once
// Node lưu index vào vector points bất biến; không copy vị trí sang từng node.
#include "model/dataset.hpp"
#include <chrono>
#include <numeric>
#include <utility>

namespace survey {
using Clock = std::chrono::steady_clock;

inline double elapsedMs(Clock::time_point start) {
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}

// [snippet:node]
struct Node {
    Box bounds{};
    std::array<int, 8> children{-1, -1, -1, -1, -1, -1, -1, -1};
    std::vector<std::size_t> indices;
    std::size_t depth{};
};

// [/snippet:node]

struct Result {
    std::vector<std::size_t> indices;
    std::vector<std::size_t> visited;
    std::vector<std::size_t> pruned;
    std::size_t candidates{};
    double milliseconds{};
};

inline Result brute(const std::vector<Point>& points, const Region& region) {
    const auto start = Clock::now();
    Result result{};
    for (std::size_t index = 0; index < points.size(); ++index) {
        ++result.candidates;
        if (accepts(region, points[index].position)) {
            result.indices.push_back(index);
        }
    }
    result.milliseconds = elapsedMs(start);
    return result;
}

class Octree {
    public:
    std::vector<Node> nodes;
    std::size_t capacity = 32;
    std::size_t maximumDepth = 14;
    std::size_t maximumNodes = 262145;
    double minimumHalf = 0.0001;
    double buildMilliseconds{};

    explicit Octree(const std::vector<Point>& points, std::size_t leafCapacity = 32)
        : capacity(leafCapacity) {
        if (capacity < 4 || capacity > 128 || points.size() > maximumPoints) {
            throw std::invalid_argument("Invalid tree budget");
        }
        const auto start = Clock::now();
        nodes.push_back({rootFor(points)});
        nodes[0].indices.resize(points.size());
        std::iota(nodes[0].indices.begin(), nodes[0].indices.end(), std::size_t{0});
#if LAB_CHECKPOINT >= 4
        split(0, points);
#endif
        buildMilliseconds = elapsedMs(start);
    }

    // [snippet:octant]
    static std::size_t octant(Vec3 p, Vec3 middle) {
        std::size_t slot = 0;
        if (p.x >= middle.x) {
            slot |= 1;
        }
        if (p.y >= middle.y) {
            slot |= 2;
        }
        if (p.z >= middle.z) {
            slot |= 4;
        }
        return slot;
    }

    // [/snippet:octant]

#if LAB_CHECKPOINT >= 4
    // [snippet:split]
    void split(std::size_t index, const std::vector<Point>& points) {
        const Box box = nodes[index].bounds;
        const std::size_t depth = nodes[index].depth;
        const Vec3 middle = (box.minimum + box.maximum) * 0.5;
        if (nodes[index].indices.size() <= capacity || depth >= maximumDepth || (box.maximum.x - box.minimum.x) * 0.25 < minimumHalf || nodes.size() + 8 > maximumNodes) {
            return;
        }
        // Không giữ Node& qua push_back: vector có thể cấp phát lại.
        std::vector<std::size_t> old;
        old.swap(nodes[index].indices);
        for (std::size_t slot = 0; slot < 8; ++slot) {
            Box child = box;
            if (slot & 1) {
                child.minimum.x = middle.x;
            } else {
                child.maximum.x = middle.x;
            }
            if (slot & 2) {
                child.minimum.y = middle.y;
            } else {
                child.maximum.y = middle.y;
            }
            if (slot & 4) {
                child.minimum.z = middle.z;
            } else {
                child.maximum.z = middle.z;
            }
            nodes[index].children[slot] = static_cast<int>(nodes.size());
            nodes.push_back({child, {-1, -1, -1, -1, -1, -1, -1, -1}, {}, depth + 1});
        }
        for (std::size_t pointIndex : old) {
            const auto slot = octant(points[pointIndex].position, middle);
            const int child = nodes[index].children[slot];
            nodes[std::size_t(child)].indices.push_back(pointIndex);
        }
        for (std::size_t slot = 0; slot < 8; ++slot) {
            split(std::size_t(nodes[index].children[slot]), points);
        }
    }

    // [/snippet:split]
#endif

    // [snippet:query]
    Result query(const std::vector<Point>& points, const Region& region) const {
#if LAB_CHECKPOINT >= 5
        const auto start = Clock::now();
        Result result{};
        std::vector<std::size_t> pending{0};
        while (!pending.empty()) {
            const auto index = pending.back();
            pending.pop_back();
            const Node& node = nodes[index];
            if (!mayOverlap(region, node.bounds)) {
                result.pruned.push_back(index);
                continue;
            }
            result.visited.push_back(index);
            if (node.children[0] >= 0) {
                for (int child : node.children) {
                    pending.push_back(std::size_t(child));
                }
            } else {
                for (std::size_t pointIndex : node.indices) {
                    ++result.candidates;
                    if (accepts(region, points[pointIndex].position)) {
                        result.indices.push_back(pointIndex);
                    }
                }
            }
        }
        result.milliseconds = elapsedMs(start);
        return result;
#else
        return brute(points, region);
#endif
    }

    // [/snippet:query]

    // [snippet:allocatedBytes]
    std::size_t allocatedBytes() const {
        std::size_t bytes = nodes.capacity() * sizeof(Node);
        for (const Node& node : nodes) {
            bytes += node.indices.capacity() * sizeof(std::size_t);
        }
        return bytes;
    }

    // [/snippet:allocatedBytes]
};
} // namespace survey
