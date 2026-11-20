#pragma once
#include "surface.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 5903
// Chừa một cửa ở tầm mắt để đi vào và xem mặt trong của hốc đá.
inline Column stoneShelter() {
    Column column = solidCube();
    for (int y = 4; y < 10; ++y) {
        for (int z = 0; z < 11; ++z) {
            for (int x = 5; x < 11; ++x) {
                column.put(x, y, z, Block::Air);
            }
        }
    }
    return column;
}
#endif
#if LAB_CHECKPOINT >= 5901
// [snippet exposed-face]
inline bool exposedFace(Block here, Block next) {
    if (here == Block::Air)
        return false;
    if (next == Block::Air)
        return true;
    return here != Block::Water && next == Block::Water;
}
// [/snippet exposed-face]

template <class ReadBlock>
Mesh visibleMesh(const Column& column, ReadBlock read) {
    Mesh mesh;
    for (int y = 0; y < column.height(); ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block block = column.get(x, y, z);
                if (block == Block::Air)
                    continue;
                const int wx = column.cx * side + x, wz = column.cz * side + z;
                const Vec3 cell{double(wx), double(y), double(wz)};
                // [snippet neighbor-face]
                for (int face = 0; face < 6; ++face) {
                    const Cell n = neighbors[face];
                    const Block other = read(wx + n.x, y + n.y, wz + n.z);
                    if (exposedFace(block, other)) {
                        mesh.push_back({cell + faceStarts[face], face, 1, 1, block});
                    }
                }
                // [/snippet neighbor-face]
            }
        }
    }
    return mesh;
}
#endif
} // namespace trail
