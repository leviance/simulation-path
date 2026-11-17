#pragma once
#include "geometry.hpp"
#include "sampling.hpp"
#include <cstdint>
#include <unordered_map>

namespace slices {
inline constexpr double surfaceIso = 0.18;
inline constexpr int surfaceStride = 3;
inline constexpr std::size_t maxSurfaceTriangles = 180000;

#if LAB_CHECKPOINT >= 3
struct SurfaceNode {
    int index;
    double world;
};

inline std::vector<SurfaceNode> surfaceNodes(const Grid& grid, int axis, int step) {
    // Zero boundary nodes close the context mesh, without modifying Volume samples.
    std::vector<SurfaceNode> nodes{{-1, lower(grid, axis)}};
    for (int i = 0; i < grid.count[axis]; i += step) {
        nodes.push_back({i, worldCoordinate(grid, axis, i)});
    }
    if (nodes.back().index != grid.count[axis] - 1) {
        nodes.push_back({grid.count[axis] - 1, worldCoordinate(grid, axis, grid.count[axis] - 1)});
    }
    nodes.push_back({grid.count[axis], -lower(grid, axis)});
    return nodes;
}

inline double normalSample(const Volume& volume, Point point) {
#if LAB_CHECKPOINT >= 5
    return sampleLinear(volume, point).value_or(0);
#else
    return sampleNearest(volume, point).value_or(0);
#endif
}

// Presentation scaffold: marching tetrahedra on a coarse subset of the stored samples.
// The measurement images still read the complete 64^3/128^3 array.
inline Surface extractSurface(const Volume& volume, double iso = surfaceIso, int step = surfaceStride) {
    if (!std::isfinite(iso) || iso <= 0 || iso >= 1 || step < 1 || step > 8) {
        throw std::invalid_argument("Bounded isovalue and mesh stride required");
    }
    std::size_t expected = 1;
    for (int axis = 0; axis < 3; ++axis) {
        if (volume.grid.count[axis] < 1 || volume.grid.count[axis] > 128 || !std::isfinite(volume.grid.spacing[axis]) || volume.grid.spacing[axis] <= 0) {
            throw std::invalid_argument("Invalid volume grid for presentation");
        }
        expected *= static_cast<std::size_t>(volume.grid.count[axis]);
    }
    if (volume.values.size() != expected) {
        throw std::invalid_argument("Invalid volume storage for presentation");
    }
    const auto xs = surfaceNodes(volume.grid, 0, step);
    const auto ys = surfaceNodes(volume.grid, 1, step);
    const auto zs = surfaceNodes(volume.grid, 2, step);
    const int nx = static_cast<int>(xs.size());
    const int ny = static_cast<int>(ys.size());
    const int nz = static_cast<int>(zs.size());
    const auto total = static_cast<std::size_t>(nx) * ny * nz;
    std::vector<double> values(total);
    for (int z = 1; z < nz - 1; ++z) {
        for (int y = 1; y < ny - 1; ++y) {
            for (int x = 1; x < nx - 1; ++x) {
                values[static_cast<std::size_t>(x + nx * (y + ny * z))] = volume.voxel(xs[x].index, ys[y].index, zs[z].index);
            }
        }
    }
    const std::array<std::array<int, 3>, 8> offsets{{{0, 0, 0}, {1, 0, 0}, {1, 1, 0}, {0, 1, 0}, {0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {0, 1, 1}}};
    const std::array<std::array<int, 4>, 6> tetrahedra{{{0, 5, 1, 6}, {0, 1, 2, 6}, {0, 2, 3, 6}, {0, 3, 7, 6}, {0, 7, 4, 6}, {0, 4, 5, 6}}};
    std::unordered_map<std::uint64_t, SurfaceVertex> cache;
    Surface result;
    for (int z = 0; z < nz - 1; ++z) {
        for (int y = 0; y < ny - 1; ++y) {
            for (int x = 0; x < nx - 1; ++x) {
                std::array<int, 8> ids{};
                std::array<double, 8> scalar{};
                std::array<Point, 8> points{};
                double minimum = 1;
                double maximum = 0;
                for (int i = 0; i < 8; ++i) {
                    const auto offset = offsets[i];
                    ids[i] = x + offset[0] + nx * (y + offset[1] + ny * (z + offset[2]));
                    scalar[i] = values[static_cast<std::size_t>(ids[i])];
                    minimum = std::min(minimum, scalar[i]);
                    maximum = std::max(maximum, scalar[i]);
                    points[i] = {xs[x + offset[0]].world, ys[y + offset[1]].world, zs[z + offset[2]].world};
                }
                if (minimum > iso || maximum < iso) {
                    continue;
                }
                for (const auto tet : tetrahedra) {
                    std::vector<int> inside;
                    std::vector<int> outside;
                    for (int i : tet) {
                        if (scalar[i] >= iso) {
                            inside.push_back(i);
                        } else {
                            outside.push_back(i);
                        }
                    }
                    if (inside.empty() || outside.empty()) {
                        continue;
                    }
                    const Point e1 = subtract(points[tet[1]], points[tet[0]]);
                    const Point e2 = subtract(points[tet[2]], points[tet[0]]);
                    const Point e3 = subtract(points[tet[3]], points[tet[0]]);
                    const double determinant = dot(e1, cross(e2, e3));
                    const Point gradient = multiply(add(add(multiply(cross(e2, e3), scalar[tet[1]] - scalar[tet[0]]), multiply(cross(e3, e1), scalar[tet[2]] - scalar[tet[0]])), multiply(cross(e1, e2), scalar[tet[3]] - scalar[tet[0]])), 1 / determinant);
                    const auto edge = [&](int i, int j) -> SurfaceVertex {
                        const auto low = static_cast<std::uint64_t>(std::min(ids[i], ids[j]));
                        const auto high = static_cast<std::uint64_t>(std::max(ids[i], ids[j]));
                        const std::uint64_t key = low * total + high;
                        const auto cached = cache.find(key);
                        if (cached != cache.end()) {
                            return cached->second;
                        }
                        const double t = (iso - scalar[i]) / (scalar[j] - scalar[i]);
                        const Point point = add(points[i], multiply(subtract(points[j], points[i]), t));
                        Point grad{};
                        for (int axis = 0; axis < 3; ++axis) {
                            Point lo = point;
                            Point hi = point;
                            const double h = 2 * volume.grid.spacing[axis];
                            lo[axis] -= h;
                            hi[axis] += h;
                            grad[axis] = (normalSample(volume, hi) - normalSample(volume, lo)) / (2 * h);
                        }
                        Point normal = normalize(multiply(grad, -1));
                        if (std::hypot(grad[0], grad[1], grad[2]) < 1e-8) {
                            normal = normalize(multiply(gradient, -1));
                        }
                        const SurfaceVertex vertex{point, normal};
                        if (cache.size() >= 250000) {
                            throw std::runtime_error("Presentation vertex budget exceeded");
                        }
                        cache.emplace(key, vertex);
                        return vertex;
                    };
                    if (inside.size() == 1) {
                        result.push_back({edge(inside[0], outside[0]), edge(inside[0], outside[1]), edge(inside[0], outside[2])});
                    } else if (outside.size() == 1) {
                        result.push_back({edge(inside[0], outside[0]), edge(inside[1], outside[0]), edge(inside[2], outside[0])});
                    } else {
                        const auto a = edge(inside[0], outside[0]);
                        const auto b = edge(inside[0], outside[1]);
                        const auto c = edge(inside[1], outside[0]);
                        const auto d = edge(inside[1], outside[1]);
                        result.push_back({a, b, c});
                        result.push_back({b, d, c});
                    }
                    if (result.size() > maxSurfaceTriangles) {
                        throw std::runtime_error("Presentation triangle budget exceeded");
                    }
                }
            }
        }
    }
    return result;
}
#endif
} // namespace slices
