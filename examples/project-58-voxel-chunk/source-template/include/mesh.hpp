#pragma once
#include "model.hpp"

namespace voxel {
// Mỗi quad có thứ tự đỉnh CCW khi nhìn từ bên ngoài cube.
inline constexpr std::array<std::array<Vec3, 4>, 6> faces{{
    {{{1, 0, 0}, {1, 1, 0}, {1, 1, 1}, {1, 0, 1}}},
    {{{0, 0, 1}, {0, 1, 1}, {0, 1, 0}, {0, 0, 0}}},
    {{{0, 1, 1}, {1, 1, 1}, {1, 1, 0}, {0, 1, 0}}},
    {{{0, 0, 0}, {1, 0, 0}, {1, 0, 1}, {0, 0, 1}}},
    {{{1, 0, 1}, {1, 1, 1}, {0, 1, 1}, {0, 0, 1}}},
    {{{0, 0, 0}, {0, 1, 0}, {1, 1, 0}, {1, 0, 0}}},
}};

inline Color faceColor([[maybe_unused]] int material, int face) {
    Color color{130, 180, 230, 255};
#if LAB_CHECKPOINT >= 4
    if (material == 1) {
        color = {100, 190, 90, 255};
    }
    if (material == 2) {
        color = {170, 115, 75, 255};
    }
    if (material == 3) {
        color = {150, 160, 180, 255};
    }
#endif
    const std::array<double, 6> shade{0.85, 0.65, 1.0, 0.5, 0.75, 0.6};
    const double factor = shade.at(static_cast<std::size_t>(face));
    color.r = static_cast<std::uint8_t>(color.r * factor);
    color.g = static_cast<std::uint8_t>(color.g * factor);
    color.b = static_cast<std::uint8_t>(color.b * factor);
    return color;
}

#if LAB_CHECKPOINT >= 1
inline void appendCube(Mesh& mesh, Vec3 origin, int material) {
    constexpr std::array<int, 6> corners{0, 1, 2, 0, 2, 3};
    for (int face = 0; face < 6; ++face) {
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
}
#endif

#if LAB_CHECKPOINT >= 3
inline Mesh buildMesh(const Chunk& chunk, [[maybe_unused]] int slice = 15) {
    if (slice < 0 || slice >= side) {
        throw std::invalid_argument("slice must be 0..15");
    }
    Mesh mesh;
    mesh.reserve(static_cast<std::size_t>(solidCount(chunk)) * 12);
    for (int y = 0; y < side; ++y) {
#if LAB_CHECKPOINT >= 6
        // Chỉ cắt phần hiển thị, không thay đổi dữ liệu chunk gốc.
        if (y > slice) {
            continue;
        }
#endif
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block block = get(chunk, x, y, z);
                if (block == Block::Air) {
                    continue;
                }
                appendCube(mesh, {static_cast<double>(x), static_cast<double>(y), static_cast<double>(z)}, static_cast<int>(block));
            }
        }
    }
    return mesh;
}
#endif
} // namespace voxel
