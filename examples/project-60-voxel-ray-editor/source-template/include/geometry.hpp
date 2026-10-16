#pragma once
#include "model.hpp"

namespace voxel {
// Thứ tự +X,-X,+Y,-Y,+Z,-Z phải khớp giữa quad, normal và neighbor offset.
inline constexpr std::array<std::array<Vec3, 4>, 6> faces{{
    {{{1, 0, 0}, {1, 1, 0}, {1, 1, 1}, {1, 0, 1}}},
    {{{0, 0, 1}, {0, 1, 1}, {0, 1, 0}, {0, 0, 0}}},
    {{{0, 1, 1}, {1, 1, 1}, {1, 1, 0}, {0, 1, 0}}},
    {{{0, 0, 0}, {1, 0, 0}, {1, 0, 1}, {0, 0, 1}}},
    {{{1, 0, 1}, {1, 1, 1}, {0, 1, 1}, {0, 0, 1}}},
    {{{0, 0, 0}, {0, 1, 0}, {1, 1, 0}, {1, 0, 0}}},
}};

inline Color faceColor(int material, int face) {
    const std::array<Color, 4> palette{{{11, 16, 32, 255}, {100, 190, 90, 255}, {170, 115, 75, 255}, {150, 160, 180, 255}}};
    Color color = palette.at(static_cast<std::size_t>(material));
    const std::array<double, 6> shade{0.85, 0.65, 1.0, 0.5, 0.75, 0.6};
    const double factor = shade.at(static_cast<std::size_t>(face));
    color.r = static_cast<std::uint8_t>(color.r * factor);
    color.g = static_cast<std::uint8_t>(color.g * factor);
    color.b = static_cast<std::uint8_t>(color.b * factor);
    return color;
}

inline void appendFace(Mesh& mesh, Vec3 origin, int material, int face) {
    constexpr std::array<int, 6> corners{0, 1, 2, 0, 2, 3};
    const auto& quad = faces.at(static_cast<std::size_t>(face));
    for (int triangle = 0; triangle < 2; ++triangle) {
        Triangle output{};
        output.color = faceColor(material, face);
        for (int vertex = 0; vertex < 3; ++vertex) {
            const int corner = corners.at(static_cast<std::size_t>(triangle * 3 + vertex));
            const Vec3 local = quad.at(static_cast<std::size_t>(corner));
            output.points.at(static_cast<std::size_t>(vertex)) = {origin.x + local.x, origin.y + local.y, origin.z + local.z};
        }
        mesh.push_back(output);
    }
}

inline void appendCube(Mesh& mesh, Vec3 origin, int material) {
    for (int face = 0; face < 6; ++face) {
        appendFace(mesh, origin, material, face);
    }
}
} // namespace voxel
