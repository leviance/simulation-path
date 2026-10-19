#pragma once
#include "lab.hpp"
#include <array>
#include <cstdint>

namespace lab {
struct RoomBounds {
    double minX = -6.0;
    double maxX = 6.0;
    double floorY = 0.0;
    double ceilingY = 4.0;
    double minZ = 0.0;
    double maxZ = 22.0;
};

struct Segment3 {
    Vec3 from{};
    Vec3 to{};
    std::uint32_t color = 0x7DA5EEFFu;
};

using RoomGeometry = std::vector<Segment3>;

#if LAB_CHECKPOINT >= 1
inline void appendSegment(RoomGeometry& room, Vec3 from, Vec3 to, std::uint32_t color) {
    room.push_back({from, to, color});
}

inline void appendBox(RoomGeometry& room, Vec3 center, Vec3 half, std::uint32_t color) {
    // Hai vòng bốn cạnh và bốn cạnh nối hai vòng, cùng quy ước index của P13.
    const std::array<Vec3, 8> vertices{{
        {center.x - half.x, center.y - half.y, center.z - half.z},
        {center.x + half.x, center.y - half.y, center.z - half.z},
        {center.x + half.x, center.y + half.y, center.z - half.z},
        {center.x - half.x, center.y + half.y, center.z - half.z},
        {center.x - half.x, center.y - half.y, center.z + half.z},
        {center.x + half.x, center.y - half.y, center.z + half.z},
        {center.x + half.x, center.y + half.y, center.z + half.z},
        {center.x - half.x, center.y + half.y, center.z + half.z},
    }};
    const std::array<std::array<std::size_t, 2>, 12> edges{{
        {0, 1},
        {1, 2},
        {2, 3},
        {3, 0},
        {4, 5},
        {5, 6},
        {6, 7},
        {7, 4},
        {0, 4},
        {1, 5},
        {2, 6},
        {3, 7},
    }};
    for (const auto& edge : edges) {
        appendSegment(room, vertices[edge[0]], vertices[edge[1]], color);
    }
}

inline RoomGeometry makeRoomGeometry(const RoomBounds& b, double gridSpacing) {
    RoomGeometry room;
    if (!std::isfinite(gridSpacing) || gridSpacing < 0.5 || gridSpacing > 4.0 ||
        !std::isfinite(b.minX) || !std::isfinite(b.maxX) || !std::isfinite(b.minZ) || !std::isfinite(b.maxZ) ||
        !std::isfinite(b.floorY) || !std::isfinite(b.ceilingY) ||
        b.maxX <= b.minX || b.maxZ <= b.minZ || b.ceilingY <= b.floorY ||
        b.maxX - b.minX > 100.0 || b.maxZ - b.minZ > 100.0) {
        return room;
    }
    // Đoạn dài vẫn đúng vì renderer clip near/far và screen trước Bresenham.
    for (double x = b.minX; x <= b.maxX + 1e-9; x += gridSpacing) {
        appendSegment(room, {x, b.floorY, b.minZ}, {x, b.floorY, b.maxZ}, 0x4484AEFFu);
    }
    for (double z = b.minZ; z <= b.maxZ + 1e-9; z += gridSpacing) {
        appendSegment(room, {b.minX, b.floorY, z}, {b.maxX, b.floorY, z}, 0x4484AEFFu);
        appendSegment(room, {b.minX, b.floorY, z}, {b.minX, b.ceilingY, z}, 0x7DA5EEFFu);
        appendSegment(room, {b.maxX, b.floorY, z}, {b.maxX, b.ceilingY, z}, 0x7DA5EEFFu);
        appendSegment(room, {b.minX, b.ceilingY, z}, {b.maxX, b.ceilingY, z}, 0x7570BEFFu);
    }
    for (double x = b.minX; x <= b.maxX + 1e-9; x += gridSpacing) {
        appendSegment(room, {x, b.floorY, b.minZ}, {x, b.ceilingY, b.minZ}, 0x7DA5EEFFu);
        appendSegment(room, {x, b.floorY, b.maxZ}, {x, b.ceilingY, b.maxZ}, 0x7DA5EEFFu);
    }
    appendSegment(room, {b.minX, b.ceilingY, b.minZ}, {b.minX, b.ceilingY, b.maxZ}, 0x7570BEFFu);
    appendSegment(room, {b.maxX, b.ceilingY, b.minZ}, {b.maxX, b.ceilingY, b.maxZ}, 0x7570BEFFu);
    // Các mốc lệch trái/phải giúp người xem nhận ra mình đang đi, không orbit.
    appendBox(room, {-3.0, 0.75, 8.0}, {0.8, 0.75, 0.8}, 0xFFB454FFu);
    appendBox(room, {3.0, 1.1, 16.0}, {1.0, 1.1, 1.0}, 0x53F0AEFFu);
    appendSegment(room, {b.minX, 2.0, b.maxZ}, {b.maxX, 2.0, b.maxZ}, 0xFFB454FFu);
    return room;
}
#endif
} // namespace lab
