#pragma once
#include "cloth_math.hpp"

#include <array>
#include <stdexcept>
#include <string>
#include <vector>

namespace cloth {

enum class Preset : std::uint32_t { Hanging,
                                    SphereDrape,
                                    DropTable };

struct Settings {
    std::uint32_t side{321U};
    Preset preset{Preset::Hanging};
    float extent{8.0F};
    float thickness{0.0125F};
    float compliance{2.0e-7F};
    float bendCompliance{2.0e-5F};
    float damping{0.5F};
    float friction{0.25F};
    float gravity{9.81F};
    float wind{0.0F};
    float dt{1.0F / 60.0F};
    std::uint32_t substeps{2U};
    std::uint32_t iterations{4U};
    Vec3 sphereCenter{0.0F, 1.75F, 0.0F};
    float sphereRadius{1.35F};
    Vec3 capsuleA{-1.0F, 0.9F, 0.0F};
    Vec3 capsuleB{1.0F, 0.9F, 0.0F};
    float capsuleRadius{0.45F};
    float floorHeight{0.0F};
    std::uint64_t candidateBudget{128000000ULL};
    std::uint64_t memoryBudget{512ULL * 1024ULL * 1024ULL};
};

// Explicit UI/demo preset selection changes scene obstacles, not material or discretization.
// makeTopology and controlled validation fixtures do not invoke this helper implicitly.
inline Settings presetSettings(Settings settings, Preset preset) {
    const Settings defaults{};
    settings.preset = preset;
    settings.floorHeight = defaults.floorHeight;
    settings.sphereCenter = defaults.sphereCenter;
    settings.sphereRadius = defaults.sphereRadius;
    settings.capsuleA = defaults.capsuleA;
    settings.capsuleB = defaults.capsuleB;
    settings.capsuleRadius = defaults.capsuleRadius;
    if (preset == Preset::DropTable) {
        // The large sphere no longer dictates this preset's silhouette: it is below the table.
        // A horizontal capsule touches the tabletop at its bottom and forms a raised draping bar.
        settings.floorHeight = 0.7F;
        settings.sphereCenter.y = 0.5F;
        settings.sphereRadius = 0.1F;
        settings.capsuleA.y = 1.15F;
        settings.capsuleB.y = 1.15F;
        settings.capsuleRadius = 0.45F;
    }
    return settings;
}

// std430: one distance constraint is exactly sixteen bytes. Lambda is a separate float SSBO.
struct Constraint {
    std::uint32_t a{};
    std::uint32_t b{};
    float rest{};
    float kind{};
};

static_assert(sizeof(Constraint) == 16U);

struct Topology {
    std::uint32_t side{};
    std::uint32_t pinned{};
    float spacing{};
    std::vector<Vec4> positions{};
    std::vector<std::uint32_t> indices{};
    std::vector<Constraint> constraints{};
    std::array<std::uint32_t, 13> colorOffsets{};
};

inline bool validSettings(const Settings& settings, std::string& error) {
    if (settings.side < 3U || settings.side > 1001U || !std::isfinite(settings.extent) || settings.extent < 1.0F || settings.extent > 8.0F) {
        error = "Resolution must be 3..1001 and extent must be 1..8 metres.";
        return false;
    }
    if (!std::isfinite(settings.dt) || settings.dt < 1.0F / 1000.0F || settings.dt > 1.0F / 30.0F || settings.substeps < 1U || settings.substeps > 8U || settings.iterations < 1U || settings.iterations > 12U) {
        error = "Timestep must be 1..33.33 ms; substeps 1..8; iterations 1..12.";
        return false;
    }
    if (!std::isfinite(settings.thickness) || settings.thickness < 0.002F || settings.thickness > 0.04F || !std::isfinite(settings.compliance) || settings.compliance < 0.0F || settings.compliance > 0.01F || !std::isfinite(settings.bendCompliance) || settings.bendCompliance < 0.0F || settings.bendCompliance > 0.1F || !std::isfinite(settings.damping) || settings.damping < 0.0F || settings.damping > 20.0F || !std::isfinite(settings.friction) || settings.friction < 0.0F || settings.friction > 1.0F || !std::isfinite(settings.gravity) || settings.gravity < 0.0F || settings.gravity > 20.0F || !std::isfinite(settings.wind) || std::abs(settings.wind) > 10.0F) {
        error = "Material, force or thickness is outside the declared finite range.";
        return false;
    }
    if (!finite(settings.sphereCenter) || !finite(settings.capsuleA) || !finite(settings.capsuleB) || !std::isfinite(settings.sphereRadius) || !std::isfinite(settings.capsuleRadius) || settings.sphereRadius < 0.1F || settings.sphereRadius > 2.0F || settings.capsuleRadius < 0.1F || settings.capsuleRadius > 1.0F || std::abs(settings.sphereCenter.x) > 2.0F || std::abs(settings.sphereCenter.z) > 2.0F || settings.sphereCenter.y < 0.5F || settings.sphereCenter.y > 3.0F || std::abs(settings.capsuleA.x) > 3.0F || std::abs(settings.capsuleA.z) > 3.0F || std::abs(settings.capsuleB.x) > 3.0F || std::abs(settings.capsuleB.z) > 3.0F || settings.capsuleA.y < 0.5F || settings.capsuleA.y > 3.0F || settings.capsuleB.y < 0.5F || settings.capsuleB.y > 3.0F || !std::isfinite(settings.floorHeight) || settings.floorHeight < 0.0F || settings.floorHeight > 1.0F) {
        error = "Obstacle is outside the declared safe domain.";
        return false;
    }
    return true;
}

inline Topology makeTopology(const Settings& settings) {
    std::string error{};
    if (!validSettings(settings, error)) {
        throw std::invalid_argument(error);
    }
    Topology result{};
    result.side = settings.side;
    result.spacing = settings.extent / static_cast<float>(settings.side - 1U);
    result.positions.reserve(static_cast<std::size_t>(settings.side) * settings.side);
    for (std::uint32_t row = 0U; row < settings.side; ++row) {
        for (std::uint32_t column = 0U; column < settings.side; ++column) {
            const float u = static_cast<float>(column) / static_cast<float>(settings.side - 1U);
            const float v = static_cast<float>(row) / static_cast<float>(settings.side - 1U);
            Vec3 point{(u - 0.5F) * settings.extent, 5.0F, (v - 0.5F) * settings.extent};
            float inverseMass = 1.0F;
            if (settings.preset == Preset::Hanging) {
                point = {(u - 0.5F) * settings.extent, 7.0F - v * 5.0F, 1.8F};
                if (row == 0U) {
                    inverseMass = 0.0F;
                    ++result.pinned;
                }
            }
            if (settings.preset == Preset::DropTable) {
                point.y = 4.5F + (u - 0.5F) * 0.25F;
            }
            result.positions.push_back(vector4(point, inverseMass));
        }
    }
    for (std::uint32_t row = 0U; row + 1U < settings.side; ++row) {
        for (std::uint32_t column = 0U; column + 1U < settings.side; ++column) {
            const std::uint32_t a = row * settings.side + column;
            const std::uint32_t b = a + 1U;
            const std::uint32_t c = a + settings.side;
            const std::uint32_t d = c + 1U;
            result.indices.insert(result.indices.end(), {a, c, b, b, c, d});
        }
    }
    std::array<std::vector<Constraint>, 12> colors{};
    auto add = [&](std::uint32_t color, std::uint32_t a, std::uint32_t b, float kind) {
        const float rest = length(xyz(result.positions[a]) - xyz(result.positions[b]));
        colors[color].push_back({a, b, rest, kind});
    };
    for (std::uint32_t row = 0U; row < settings.side; ++row) {
        for (std::uint32_t column = 0U; column < settings.side; ++column) {
            const std::uint32_t a = row * settings.side + column;
            if (column + 1U < settings.side) {
                add(column % 2U, a, a + 1U, 0.0F);
            }
            if (row + 1U < settings.side) {
                add(2U + row % 2U, a, a + settings.side, 0.0F);
            }
            if (row + 1U < settings.side && column + 1U < settings.side) {
                add(4U + column % 2U, a, a + settings.side + 1U, 1.0F);
                add(6U + column % 2U, a + 1U, a + settings.side, 1.0F);
            }
            // Two-edge distance is an explicit bending approximation, not a dihedral-angle model.
            if (column + 2U < settings.side) {
                add(8U + (column / 2U) % 2U, a, a + 2U, 2.0F);
            }
            if (row + 2U < settings.side) {
                add(10U + (row / 2U) % 2U, a, a + 2U * settings.side, 2.0F);
            }
        }
    }
    for (std::size_t color = 0U; color < colors.size(); ++color) {
        result.colorOffsets[color] = static_cast<std::uint32_t>(result.constraints.size());
        result.constraints.insert(result.constraints.end(), colors[color].begin(), colors[color].end());
    }
    result.colorOffsets.back() = static_cast<std::uint32_t>(result.constraints.size());
    return result;
}

inline bool topologyNeighbors(std::uint32_t a, std::uint32_t b, std::uint32_t side) {
    const int columnDistance = std::abs(static_cast<int>(a % side) - static_cast<int>(b % side));
    const int rowDistance = std::abs(static_cast<int>(a / side) - static_cast<int>(b / side));
    return columnDistance <= 2 && rowDistance <= 2;
}

struct Input {
    std::uint32_t dragId{noVertex};
    Vec3 dragTarget{};
    bool dragging{};
    std::uint32_t regionRadiusNodes{2U};
    std::uint32_t pinId{noVertex};
    int pinAction{-1};
};

} // namespace cloth
