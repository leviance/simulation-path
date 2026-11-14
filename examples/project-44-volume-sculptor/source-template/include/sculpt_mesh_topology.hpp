#pragma once

#include "sculpt_math.hpp"
#include <algorithm>
#include <bit>
#include <numeric>
#include <span>
#include <vector>

namespace sculpt {

using PositionBits = std::array<std::uint32_t, 3>;

inline PositionBits meshPositionBits(const SurfaceVertex& vertex) {
    PositionBits key{};
    for (int axis = 0; axis < 3; ++axis) {
        float value = vertex.position[axis];
        if (!std::isfinite(value))
            throw std::invalid_argument("Topology cannot classify a non-finite vertex");
        // IEEE +0 and -0 describe one geometric point, not two disconnected vertices.
        if (value == 0)
            value = 0;
        key[axis] = std::bit_cast<std::uint32_t>(value);
    }
    return key;
}

struct MeshEdgeOwner {
    PositionBits first, second;
    int direction{};

    bool operator<(const MeshEdgeOwner& other) const {
        if (first != other.first)
            return first < other.first;
        return second < other.second;
    }
};

struct MeshTopology {
    std::size_t vertices{}, edges{}, faces{}, components{};
    std::size_t boundaryEdges{}, nonManifoldEdges{}, inconsistentEdges{};

    std::int64_t eulerCharacteristic() const {
        return static_cast<std::int64_t>(vertices) - static_cast<std::int64_t>(edges) + static_cast<std::int64_t>(faces);
    }

    bool closedOriented() const {
        return faces > 0 && boundaryEdges == 0 && nonManifoldEdges == 0 && inconsistentEdges == 0;
    }
};

// Validation oracle only. It checks emitted triangle connectivity without calling extraction again.
inline MeshTopology inspectMeshTopology(std::span<const SurfaceVertex> triangles) {
    if (triangles.empty() || triangles.size() % 3 != 0 || triangles.size() > 1000000)
        throw std::invalid_argument("Topology fixture needs complete triangles and at most one million vertices");
    std::vector<PositionBits> points;
    std::vector<MeshEdgeOwner> owners;
    points.reserve(triangles.size());
    owners.reserve(triangles.size());
    for (std::size_t first = 0; first < triangles.size(); first += 3) {
        const std::array<PositionBits, 3> corners{meshPositionBits(triangles[first]), meshPositionBits(triangles[first + 1]), meshPositionBits(triangles[first + 2])};
        if (corners[0] == corners[1] || corners[0] == corners[2] || corners[1] == corners[2])
            throw std::invalid_argument("A topology fixture triangle repeats its position");
        for (int corner = 0; corner < 3; ++corner) {
            points.push_back(corners[corner]);
            auto a = corners[corner];
            auto b = corners[(corner + 1) % 3];
            int direction = 1;
            if (b < a) {
                std::swap(a, b);
                direction = -1;
            }
            owners.push_back({a, b, direction});
        }
    }
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    std::sort(owners.begin(), owners.end());

    std::vector<std::size_t> parent(points.size()), sizes(points.size(), 1);
    std::iota(parent.begin(), parent.end(), 0);
    const auto root = [&](std::size_t point) {
        while (parent[point] != point) {
            parent[point] = parent[parent[point]];
            point = parent[point];
        }
        return point;
    };
    MeshTopology result;
    result.vertices = points.size();
    result.faces = triangles.size() / 3;
    result.components = points.size();
    for (std::size_t first = 0; first < owners.size();) {
        std::size_t last = first + 1;
        int directionSum = owners[first].direction;
        while (last < owners.size() && owners[first].first == owners[last].first && owners[first].second == owners[last].second) {
            directionSum += owners[last].direction;
            ++last;
        }
        ++result.edges;
        if (last - first == 1)
            ++result.boundaryEdges;
        else if (last - first != 2)
            ++result.nonManifoldEdges;
        else if (directionSum != 0)
            ++result.inconsistentEdges;

        const auto a = static_cast<std::size_t>(std::lower_bound(points.begin(), points.end(), owners[first].first) - points.begin());
        const auto b = static_cast<std::size_t>(std::lower_bound(points.begin(), points.end(), owners[first].second) - points.begin());
        auto firstRoot = root(a);
        auto secondRoot = root(b);
        if (firstRoot != secondRoot) {
            if (sizes[firstRoot] < sizes[secondRoot])
                std::swap(firstRoot, secondRoot);
            parent[secondRoot] = firstRoot;
            sizes[firstRoot] += sizes[secondRoot];
            --result.components;
        }
        first = last;
    }
    return result;
}

} // namespace sculpt
