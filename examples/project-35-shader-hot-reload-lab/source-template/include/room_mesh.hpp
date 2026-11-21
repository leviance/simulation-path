#pragma once
#include "pipeline.hpp"
#include <array>

namespace lab {
// Dùng 4 đỉnh riêng cho mỗi mặt: hai mặt gặp nhau ở góc nhưng không cùng pháp tuyến.
struct RoomVertex { Vec3 position, normal; };
struct UnitBox {
    std::array<RoomVertex, 24> vertices{};
    std::array<unsigned short, 36> indices{};
};
inline UnitBox unitBox() {
    const Vec3 normal[] = {{1,0,0},{-1,0,0},{0,1,0},{0,-1,0},{0,0,1},{0,0,-1}};
    const Vec3 right[] = {{0,0,-1},{0,0,1},{1,0,0},{1,0,0},{1,0,0},{-1,0,0}};
    const Vec3 up[] = {{0,1,0},{0,1,0},{0,0,-1},{0,0,1},{0,1,0},{0,1,0}};
    constexpr int signs[4][2] = {{-1,-1},{1,-1},{1,1},{-1,1}};
    constexpr int triangle[6] = {0,1,2,0,2,3};
    UnitBox box;
    for (int face = 0; face < 6; ++face) {
        for (int corner = 0; corner < 4; ++corner) {
            const auto u = scale(right[face], float(signs[corner][0]));
            const auto v = scale(up[face], float(signs[corner][1]));
            box.vertices[4 * face + corner] = {scale(add(normal[face], add(u, v)), 0.5F), normal[face]};
        }
        for (int i = 0; i < 6; ++i)
            box.indices[6 * face + i] = static_cast<unsigned short>(4 * face + triangle[i]);
    }
    return box;
}
} // namespace lab
