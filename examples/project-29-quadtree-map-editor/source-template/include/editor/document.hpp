#pragma once
// Mọi edit đi qua Document để selection, ID mới và index được cập nhật cùng nhau.
#include "spatial/quadtree.hpp"
#include <limits>
#include <optional>
#include <string>

namespace maplab {
struct EditMetrics {
    std::string action;
    std::size_t objects{};
    double milliseconds{};
};

struct Document {
    Quadtree tree;
    std::unordered_set<std::uint32_t> selection;
    std::uint64_t nextId{};
    bool useTree = true;
    std::optional<Query> lastQuery;
    std::optional<Box> selectionBox;
    EditMetrics edit{};
    std::string notice = "Choose a tool: Select / Pan / Move / Add.";

    explicit Document(std::size_t count = 100000, std::uint32_t seed = 1, Layout layout = Layout::Districts, Config config = {})
        : tree(makeObjects(count, seed, layout), config), nextId(count) {
#if LAB_CHECKPOINT < 5
        useTree = false;
#endif
    }

    Query query(const Box& box) const {
#if LAB_CHECKPOINT >= 5
        if (useTree) {
            return tree.query(box);
        }
#endif
        return queryBrute(tree, box);
    }

#if LAB_CHECKPOINT >= 3
    // [snippet:selectRegion]
    void selectRegion(Point a, Point b, bool additive = false) {
        const Box box = normalize(a, b);
        Query result = query(box);
        if (!additive) {
            selection.clear();
        }
        for (std::uint32_t id : result.ids) {
            selection.insert(id);
        }
        lastQuery = std::move(result);
        selectionBox = box;
        notice = "Range selection uses AABB intersection, including edge contact.";
    }

    // [/snippet:selectRegion]

    std::optional<std::uint32_t> topmost(Point point) const {
        const auto result = query({point.x, point.y, 0, 0});
        std::optional<std::uint32_t> top;
        for (std::uint32_t id : result.ids) {
            if (!top || id > *top) {
                top = id;
            }
        }
        return top;
    }

    // [snippet:pick]
    void pick(Point point, bool toggle = false) {
        const Box box{point.x, point.y, 0, 0};
        const auto top = topmost(point);
        if (!toggle) {
            selection.clear();
        }
        if (top) {
            if (toggle && selection.contains(*top)) {
                selection.erase(*top);
            } else {
                selection.insert(*top);
            }
        }
        lastQuery = query(box);
        selectionBox = box;
        notice = "Click chooses the highest ID: the last object in paint order.";
    }

    // [/snippet:pick]
#endif

    std::optional<Box> selectionBounds() const {
        if (selection.empty()) {
            return std::nullopt;
        }
        double left = std::numeric_limits<double>::infinity();
        double top = left;
        double endX = -left;
        double endY = -left;
        for (std::uint32_t id : selection) {
            const auto& box = tree.objects.at(id).box;
            left = std::min(left, box.x);
            top = std::min(top, box.y);
            endX = std::max(endX, right(box));
            endY = std::max(endY, bottom(box));
        }
        return Box{left, top, endX - left, endY - top};
    }

#if LAB_CHECKPOINT >= 7
    // [snippet:moveSelection]
    bool moveSelection(Point offset) {
        const auto start = Clock::now();
        const bool moved = tree.translateGroup(selection, offset);
        edit = {"move", selection.size(), milliseconds(start, Clock::now())};
        if (!moved) {
            edit.action = "rollback";
            notice = "Move rejected: the whole group keeps its old positions.";
        } else {
            notice = "Group committed. IDs and selection were preserved.";
        }
        lastQuery.reset();
        return moved;
    }

    // [/snippet:moveSelection]

    // [snippet:addObject]
    bool addObject(Point point, Kind kind) {
        const auto start = Clock::now();
        double size = 48;
        if (kind == Kind::Tree) {
            size = 24;
        } else if (kind == Kind::Park) {
            size = 64;
        }
        double height = size;
        if (kind == Kind::House) {
            height = 32;
        }
        const Box box{point.x - size / 2, point.y - size / 2, size, height};
        if (nextId > std::numeric_limits<std::uint32_t>::max() || tree.objects.size() >= maximumObjects || !validBox(box) || !contains(tree.config.root, box)) {
            notice = "Cannot add: outside root or object/ID budget exceeded.";
            return false;
        }
        const auto id = static_cast<std::uint32_t>(nextId);
        tree.insert({id, kind, box});
        ++nextId;
        selection.clear();
        selection.insert(id);
        lastQuery.reset();
        edit = {"insert", 1, milliseconds(start, Clock::now())};
        notice = "Object added. ID will not be reused after deletion.";
        return true;
    }

    // [/snippet:addObject]

    // [snippet:deleteSelection]
    void deleteSelection() {
        const auto start = Clock::now();
        const auto count = selection.size();
        for (std::uint32_t id : selection) {
            tree.remove(id);
        }
        selection.clear();
        lastQuery.reset();
        edit = {"remove", count, milliseconds(start, Clock::now())};
        notice = "Selection deleted; index has no old IDs.";
    }

    // [/snippet:deleteSelection]
#endif

    void rebuild(std::size_t capacity) {
        const auto start = Clock::now();
        std::vector<Object> objects;
        objects.reserve(tree.objects.size());
        for (const auto& [id, object] : tree.objects) {
            static_cast<void>(id);
            objects.push_back(object);
        }
        auto config = tree.config;
        config.capacity = capacity;
        auto rebuilt = Quadtree(objects, config);
        rebuilt.revision = tree.revision + 1;
        tree = std::move(rebuilt);
        lastQuery.reset();
        edit = {"rebuild", tree.objects.size(), milliseconds(start, Clock::now())};
    }
};
} // namespace maplab
