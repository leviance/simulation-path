#pragma once
#include "visibility.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6101
inline Cell maskCell(int face, int plane, int u, int v) {
    if (face < 2)
        return {plane, v, u};
    if (face < 4)
        return {u, plane, v};
    return {u, v, plane};
}

template <class ReadBlock>
Mesh greedyMesh(const Column& column, ReadBlock read) {
    Mesh mesh;
    for (int face = 0; face < 6; ++face) {
        const bool horizontal = face == 2 || face == 3;
        int planes = side, rows = column.height();
        if (horizontal) {
            planes = column.height();
            rows = side;
        }
        std::vector<Block> mask(side * rows);
        for (int plane = 0; plane < planes; ++plane) {
            std::fill(mask.begin(), mask.end(), Block::Air);
            for (int v = 0; v < rows; ++v)
                for (int u = 0; u < side; ++u) {
                    Cell c = maskCell(face, plane, u, v);
                    Block here = column.get(c.x, c.y, c.z);
                    if (here == Block::Air)
                        continue;
                    const Cell n = neighbors[face];
                    const Block next = read(column.cx * side + c.x + n.x, c.y + n.y, column.cz * side + c.z + n.z);
                    if (exposedFace(here, next))
                        mask[v * side + u] = here;
                }
            for (int v = 0; v < rows; ++v)
                for (int u = 0; u < side; ++u) {
                    const Block key = mask[v * side + u];
                    if (key == Block::Air)
                        continue;
                    int width = 1, height = 1;
                    // [snippet greedy-run]
                    const bool rigid = key != Block::Leaves && key != Block::Needles && key != Block::Water;
                    if (rigid) {
                        while (u + width < side && mask[v * side + u + width] == key)
                            ++width;
                        while (v + height < rows) {
                            bool fits = true;
                            for (int dx = 0; dx < width; ++dx) {
                                if (mask[(v + height) * side + u + dx] != key)
                                    fits = false;
                            }
                            if (!fits)
                                break;
                            ++height;
                        }
                    }
                    // [/snippet greedy-run]
                    // [snippet greedy-emit]
                    for (int dy = 0; dy < height; ++dy)
                        std::fill_n(mask.begin() + (v + dy) * side + u, width, Block::Air);
                    const Cell c = maskCell(face, plane, u, v);
                    const Vec3 world{double(column.cx * side + c.x), double(c.y), double(column.cz * side + c.z)};
                    mesh.push_back({world + faceStarts[face], face, width, height, key});
                    // [/snippet greedy-emit]
                }
        }
    }
    return mesh;
}
#endif
} // namespace trail
