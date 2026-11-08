#pragma once
#include "cloth_grid.hpp"

#include <utility>

namespace cloth {

// The independent tests use a hand-derived answer, not this function as its own oracle.
inline bool solveDistance(Vec4& a, Vec4& b, float rest, float compliance, float h, float& lambda) {
    if (!finite(xyz(a)) || !finite(xyz(b)) || !std::isfinite(rest) || rest <= 0.0F
        || !std::isfinite(compliance) || compliance < 0.0F || !std::isfinite(h) || h <= 0.0F
        || a.w < 0.0F || b.w < 0.0F || !std::isfinite(a.w) || !std::isfinite(b.w)
        || !std::isfinite(lambda)) {
        return false;
    }
    const Vec3 delta = xyz(a) - xyz(b);
    const float distance = length(delta);
    if (distance < 1.0e-8F) {
        // An undefined distance gradient is skipped, never normalized into NaN.
        return true;
    }
    const float alpha = compliance / (h * h);
    const float denominator = a.w + b.w + alpha;
    if (denominator <= 0.0F) {
        return true;
    }
    const float increment = (-(distance - rest) - alpha * lambda) / denominator;
    lambda += increment;
    const Vec3 direction = delta / distance;
    a = vector4(xyz(a) + direction * (a.w * increment), a.w);
    b = vector4(xyz(b) - direction * (b.w * increment), b.w);
    return true;
}

struct Contact {
    Vec3 normal{0.0F, 1.0F, 0.0F};
    float penetration{};
};

inline Contact sphereContact(Vec3 point, Vec3 center, float radius, float thickness) {
    const Vec3 delta = point - center;
    const float distance = length(delta);
    Contact result{};
    result.normal = normalized(delta);
    result.penetration = std::max(0.0F, radius + thickness - distance);
    return result;
}

inline Contact capsuleContact(Vec3 point, Vec3 a, Vec3 b, float radius, float thickness) {
    return sphereContact(point, closestOnSegment(point, a, b), radius, thickness);
}

inline Vec3 analyticProjection(Vec3 point, const Settings& settings) {
    point.y = std::max(point.y, settings.floorHeight + settings.thickness);
    const auto sphere = sphereContact(point, settings.sphereCenter, settings.sphereRadius, settings.thickness);
    point = point + sphere.normal * sphere.penetration;
    const auto capsule = capsuleContact(point, settings.capsuleA, settings.capsuleB,
        settings.capsuleRadius, settings.thickness);
    point = point + capsule.normal * capsule.penetration;
    point.x = std::clamp(point.x, -4.95F, 4.95F);
    point.y = std::clamp(point.y, settings.floorHeight + settings.thickness, 7.95F);
    point.z = std::clamp(point.z, -4.95F, 4.95F);
    return point;
}

inline Vec3 coincidenceDirection(std::uint32_t a, std::uint32_t b) {
    Vec3 axis{};
    const std::uint32_t component = (a + b) % 3U;
    float sign = 1.0F;
    if (a < b) {
        sign = -1.0F;
    }
    if (component == 0U) {
        axis.x = sign;
    }
    if (component == 1U) {
        axis.y = sign;
    }
    if (component == 2U) {
        axis.z = sign;
    }
    return axis;
}

inline std::vector<Vec3> selfContactCorrections(const std::vector<Vec4>& positions,
    const CpuGrid& grid, std::uint32_t side, float thickness) {
    std::vector<Vec3> corrections(positions.size());
    const float diameter = 2.0F * thickness;
    for (std::uint32_t id = 0U; id < positions.size(); ++id) {
        if (positions[id].w == 0.0F) {
            continue;
        }
        const auto coordinate = cellCoordinate(xyz(positions[id]), grid.plan);
        Vec3 sum{};
        std::uint32_t contacts = 0U;
        for (int dz = -1; dz <= 1; ++dz) {
            for (int dy = -1; dy <= 1; ++dy) {
                for (int dx = -1; dx <= 1; ++dx) {
                    const int x = coordinate[0] + dx;
                    const int y = coordinate[1] + dy;
                    const int z = coordinate[2] + dz;
                    if (x < 0 || y < 0 || z < 0 || x >= static_cast<int>(grid.plan.nx)
                        || y >= static_cast<int>(grid.plan.ny) || z >= static_cast<int>(grid.plan.nz)) {
                        continue;
                    }
                    const auto cell = cellIndex(x, y, z, grid.plan);
                    for (std::uint32_t offset = 0U; offset < grid.counts[cell]; ++offset) {
                        const auto other = grid.ids[grid.offsets[cell] + offset];
                        if (topologyNeighbors(id, other, side)) {
                            continue;
                        }
                        const Vec3 delta = xyz(positions[id]) - xyz(positions[other]);
                        const float distance = length(delta);
                        if (distance >= diameter) {
                            continue;
                        }
                        Vec3 direction = coincidenceDirection(id, other);
                        if (distance > 1.0e-8F) {
                            direction = delta / distance;
                        }
                        const float weight = positions[id].w / (positions[id].w + positions[other].w);
                        sum = sum + direction * ((diameter - distance) * weight);
                        ++contacts;
                    }
                }
            }
        }
        if (contacts > 0U) {
            corrections[id] = limited(sum / static_cast<float>(contacts), thickness);
        }
    }
    return corrections;
}

inline std::vector<Vec4> meshNormals(const std::vector<Vec4>& positions, std::uint32_t side) {
    std::vector<Vec3> sums(positions.size());
    for (std::uint32_t row = 0U; row + 1U < side; ++row) {
        for (std::uint32_t column = 0U; column + 1U < side; ++column) {
            const std::uint32_t a = row * side + column;
            const std::array<std::array<std::uint32_t, 3>, 2> triangles{{{a, a + side, a + 1U},
                {a + 1U, a + side, a + side + 1U}}};
            for (const auto triangle : triangles) {
                const Vec3 normal = cross(xyz(positions[triangle[1]]) - xyz(positions[triangle[0]]),
                    xyz(positions[triangle[2]]) - xyz(positions[triangle[0]]));
                for (const auto id : triangle) {
                    sums[id] = sums[id] + normal;
                }
            }
        }
    }
    std::vector<Vec4> result{};
    result.reserve(sums.size());
    for (const auto normal : sums) {
        result.push_back(vector4(normalized(normal)));
    }
    return result;
}

struct CpuState {
    Topology topology{};
    std::vector<Vec4> positions{};
    std::vector<Vec4> velocities{};
    std::vector<Vec4> normals{};
};

inline CpuState makeCpuState(const Settings& settings) {
    CpuState state{};
    state.topology = makeTopology(settings);
    state.positions = state.topology.positions;
    state.velocities.resize(state.positions.size());
    state.normals = meshNormals(state.positions, state.topology.side);
    return state;
}

inline void cpuStep(CpuState& state, const Settings& settings) {
    const float h = settings.dt / static_cast<float>(settings.substeps);
    std::vector<float> lambdas(state.topology.constraints.size());
    for (std::uint32_t substep = 0U; substep < settings.substeps; ++substep) {
        const auto previous = state.positions;
        std::fill(lambdas.begin(), lambdas.end(), 0.0F);
        for (std::size_t id = 0U; id < state.positions.size(); ++id) {
            if (state.positions[id].w == 0.0F) {
                state.velocities[id] = {};
                continue;
            }
            Vec3 velocity = xyz(state.velocities[id]) + Vec3{settings.wind, -settings.gravity, 0.0F} * h;
            velocity = limited(velocity, 20.0F);
            state.positions[id] = vector4(xyz(state.positions[id]) + velocity * h, state.positions[id].w);
        }
        for (std::uint32_t iteration = 0U; iteration < settings.iterations; ++iteration) {
            for (std::size_t color = 0U; color < 12U; ++color) {
                for (auto edge = state.topology.colorOffsets[color]; edge < state.topology.colorOffsets[color + 1U]; ++edge) {
                    const auto constraint = state.topology.constraints[edge];
                    float compliance = settings.compliance;
                    if (constraint.kind == 2.0F) {
                        compliance = settings.bendCompliance;
                    }
                    solveDistance(state.positions[constraint.a], state.positions[constraint.b], constraint.rest,
                        compliance, h, lambdas[edge]);
                }
            }
#if LAB_CHECKPOINT >= 7
            for (auto& position : state.positions) {
                if (position.w > 0.0F) {
                    position = vector4(analyticProjection(xyz(position), settings), position.w);
                }
            }
#endif
#if LAB_CHECKPOINT >= 10
            const auto grid = buildCpuGrid(state.positions, makeGridPlan(settings));
            const auto corrections = selfContactCorrections(state.positions, grid, state.topology.side, settings.thickness);
            for (std::size_t id = 0U; id < state.positions.size(); ++id) {
                if (state.positions[id].w > 0.0F) {
                    state.positions[id] = vector4(analyticProjection(xyz(state.positions[id]) + corrections[id], settings),
                        state.positions[id].w);
                }
            }
#endif
        }
        for (std::size_t id = 0U; id < state.positions.size(); ++id) {
            if (state.positions[id].w == 0.0F) {
                state.velocities[id] = {};
                continue;
            }
            Vec3 velocity = (xyz(state.positions[id]) - xyz(previous[id])) / h;
#if LAB_CHECKPOINT >= 7
            const Vec3 point = xyz(state.positions[id]);
            const auto sphere = sphereContact(point, settings.sphereCenter, settings.sphereRadius, settings.thickness);
            const auto capsule = capsuleContact(point, settings.capsuleA, settings.capsuleB, settings.capsuleRadius, settings.thickness);
            Vec3 normal{};
            if (point.y < settings.floorHeight + settings.thickness + 0.0001F) {
                normal = {0.0F, 1.0F, 0.0F};
            }
            if (length(point - settings.sphereCenter) < settings.sphereRadius + settings.thickness + 0.0001F) {
                normal = sphere.normal;
            }
            if (length(point - closestOnSegment(point, settings.capsuleA, settings.capsuleB))
                < settings.capsuleRadius + settings.thickness + 0.0001F) {
                normal = capsule.normal;
            }
            if (length(normal) > 0.0F) {
                velocity = velocity - normal * std::min(0.0F, dot(velocity, normal));
                const Vec3 tangent = velocity - normal * dot(velocity, normal);
                velocity = velocity - tangent * settings.friction;
            }
#endif
            velocity = limited(velocity * std::exp(-settings.damping * h), 20.0F);
            state.velocities[id] = vector4(velocity);
        }
    }
    state.normals = meshNormals(state.positions, state.topology.side);
}

} // namespace cloth
