#pragma once
// Mỗi ID nằm đúng một bucket; hình cắt đường chia ở cha, không nhân bản vào nhiều con.
#include "model/dataset.hpp"
#include <array>
#include <chrono>
#include <unordered_map>
#include <unordered_set>

namespace maplab {
using Clock = std::chrono::steady_clock;

inline double milliseconds(Clock::time_point start, Clock::time_point end) {
    return std::chrono::duration<double, std::milli>(end - start).count();
}

struct Config {
    Box root = worldRoot;
    std::size_t capacity = 16;
    int maximumDepth = 12;
    double minimumSize = 4;
    std::size_t maximumNodes = 262145;
};

struct Node {
    Box box{};
    int depth{};
    std::unordered_set<std::uint32_t> ids;
    std::array<int, 4> children{-1, -1, -1, -1};

    bool leaf() const {
        return children[0] < 0;
    }
};

struct Query {
    std::vector<std::uint32_t> ids;
    std::vector<int> visited;
    std::vector<int> pruned;
    std::size_t candidates{};
    double milliseconds{};
};

class Quadtree {
    public:
    Config config;
    std::unordered_map<std::uint32_t, Object> objects;
    std::vector<Node> nodes;
    std::unordered_map<std::uint32_t, int> location;
    std::uint64_t revision{};
    double buildMilliseconds{};

    explicit Quadtree(const std::vector<Object>& input = {}, Config options = {})
        : config(options) {
        const auto start = Clock::now();
        if (input.size() > maximumObjects) {
            throw std::invalid_argument("Map object budget exceeded before allocation");
        }
        if (!validBox(config.root) || config.capacity < 1 || config.capacity > 128 || config.maximumDepth < 0 || config.maximumDepth > 16 || !std::isfinite(config.minimumSize) || config.minimumSize <= 0 || config.maximumNodes < 1 || config.maximumNodes > 262145) {
            throw std::invalid_argument("Invalid Quadtree limits");
        }
        nodes.push_back({config.root, 0, {}, {-1, -1, -1, -1}});
        objects.reserve(input.size());
        location.reserve(input.size());
        for (const auto& object : input) {
            insert(object);
        }
        buildMilliseconds = milliseconds(start, Clock::now());
    }

#if LAB_CHECKPOINT >= 4
    // [snippet:childSlot]
    int childSlot(const Box& box, const Node& node) const {
        const double midX = node.box.x + node.box.width / 2;
        const double midY = node.box.y + node.box.height / 2;
        int column = -1;
        int row = -1;
        if (right(box) <= midX) {
            column = 0;
        } else if (box.x >= midX) {
            column = 1;
        }
        if (bottom(box) <= midY) {
            row = 0;
        } else if (box.y >= midY) {
            row = 1;
        }
        if (column < 0 || row < 0) {
            return -1;
        }
        return row * 2 + column;
    }

    // [/snippet:childSlot]
#endif

    // [snippet:insert]
    void insert(const Object& object) {
        validateObject(object, config.root);
        if (objects.contains(object.id) || objects.size() >= maximumObjects) {
            throw std::invalid_argument("Duplicate ID or object budget exceeded");
        }
        objects.emplace(object.id, object);
        insertAt(0, object.id);
        ++revision;
    }

    // [/snippet:insert]

#if LAB_CHECKPOINT >= 5
    // [snippet:query]
    Query query(const Box& region) const {
        if (!validBox(region, true)) {
            throw std::invalid_argument("Invalid query region");
        }
        const auto start = Clock::now();
        Query result{};
        std::vector<int> stack{0};
        while (!stack.empty()) {
            const int index = stack.back();
            stack.pop_back();
            const auto& node = nodes.at(static_cast<std::size_t>(index));
            if (!intersects(node.box, region)) {
                result.pruned.push_back(index);
                continue;
            }
            result.visited.push_back(index);
            for (std::uint32_t id : node.ids) {
                ++result.candidates;
                if (intersects(objects.at(id).box, region)) {
                    result.ids.push_back(id);
                }
            }
            if (!node.leaf()) {
                for (int child : node.children) {
                    stack.push_back(child);
                }
            }
        }
        result.milliseconds = milliseconds(start, Clock::now());
        return result;
    }

    // [/snippet:query]
#endif

#if LAB_CHECKPOINT >= 7
    // [snippet:remove]
    bool remove(std::uint32_t id) {
        const auto found = location.find(id);
        if (found == location.end()) {
            return false;
        }
        nodes.at(static_cast<std::size_t>(found->second)).ids.erase(id);
        location.erase(found);
        objects.erase(id);
        ++revision;
        return true;
    }

    // [/snippet:remove]

    // [snippet:translateGroup]
    bool translateGroup(const std::unordered_set<std::uint32_t>& ids, Point offset) {
        if (!std::isfinite(offset.x) || !std::isfinite(offset.y)) {
            return false;
        }
        std::vector<Object> proposals;
        proposals.reserve(ids.size());
        for (std::uint32_t id : ids) {
            const auto found = objects.find(id);
            if (found == objects.end()) {
                return false;
            }
            Object proposal = found->second;
            proposal.box = translate(proposal.box, offset);
            if (!validBox(proposal.box) || !contains(config.root, proposal.box)) {
                return false;
            }
            proposals.push_back(proposal);
        }
        for (const auto& proposal : proposals) {
            remove(proposal.id);
        }
        for (const auto& proposal : proposals) {
            insert(proposal);
        }
        return true;
    }

    // [/snippet:translateGroup]
#endif

    private:
#if LAB_CHECKPOINT >= 4
    bool canSplit(const Node& node) const {
        return node.depth < config.maximumDepth && node.box.width / 2 >= config.minimumSize && node.box.height / 2 >= config.minimumSize && nodes.size() + 4 <= config.maximumNodes;
    }
#endif

    // [snippet:insertAt]
    void insertAt(int nodeIndex, std::uint32_t id) {
        const auto index = static_cast<std::size_t>(nodeIndex);
#if LAB_CHECKPOINT >= 4
        if (!nodes[index].leaf()) {
            const int slot = childSlot(objects.at(id).box, nodes[index]);
            if (slot >= 0) {
                insertAt(nodes[index].children[static_cast<std::size_t>(slot)], id);
                return;
            }
        }
#endif
        nodes[index].ids.insert(id);
        location[id] = nodeIndex;
#if LAB_CHECKPOINT >= 4
        if (nodes[index].leaf() && nodes[index].ids.size() > config.capacity && canSplit(nodes[index])) {
            split(nodeIndex);
        }
#endif
    }

    // [/snippet:insertAt]

#if LAB_CHECKPOINT >= 4
    // [snippet:split]
    void split(int nodeIndex) {
        const auto index = static_cast<std::size_t>(nodeIndex);
        const Box box = nodes[index].box;
        const int depth = nodes[index].depth;
        const std::vector<std::uint32_t> previous(nodes[index].ids.begin(), nodes[index].ids.end());
        std::array<int, 4> children{};
        for (int slot = 0; slot < 4; ++slot) {
            children[static_cast<std::size_t>(slot)] = static_cast<int>(nodes.size());
            const Box child{box.x + (slot % 2) * box.width / 2, box.y + (slot / 2) * box.height / 2, box.width / 2, box.height / 2};
            nodes.push_back({child, depth + 1, {}, {-1, -1, -1, -1}});
        }
        // Không giữ reference vào vector qua push_back: nó có thể vừa realloc.
        nodes[index].children = children;
        nodes[index].ids.clear();
        for (std::uint32_t id : previous) {
            insertAt(nodeIndex, id);
        }
    }

    // [/snippet:split]
#endif
};

inline Query queryBrute(const Quadtree& tree, const Box& region) {
    if (!validBox(region, true)) {
        throw std::invalid_argument("Invalid query region");
    }
    const auto start = Clock::now();
    Query result{};
    for (const auto& [id, object] : tree.objects) {
        ++result.candidates;
        if (intersects(object.box, region)) {
            result.ids.push_back(id);
        }
    }
    result.milliseconds = milliseconds(start, Clock::now());
    return result;
}
} // namespace maplab
