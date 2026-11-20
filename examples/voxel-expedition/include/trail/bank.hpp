#pragma once
#include "blocks.hpp"
#include <vector>

namespace trail {
#if LAB_CHECKPOINT >= 5802
struct Tree {
    int x, y, z, height;
    bool pine = false;
};

struct Column {
    int cx = 0, cz = 0;
    std::vector<Section> sections{1};
    std::vector<Tree> trees;

    int height() const {
        return side * static_cast<int>(sections.size());
    }

    Block get(int x, int y, int z) const {
        if (x < 0 || x >= side || z < 0 || z >= side || y < 0 || y >= height()) {
            return Block::Air;
        }
        return sections.at(y / side).at(localIndex(x, y % side, z));
    }

    void put(int x, int y, int z, Block block) {
        sections.at(y / side).at(localIndex(x, y % side, z)) = block;
    }
};

inline Column singleStone() {
    Column column;
    column.put(7, 7, 7, Block::Stone);
    return column;
}
#endif

#if LAB_CHECKPOINT >= 5803
inline Column solidCube() {
    Column column;
    column.sections.front().fill(Block::Stone);
    return column;
}
#endif

#if LAB_CHECKPOINT >= 5804
// Chỉ ghi phần giao với cột đang sinh. Hai chunk có thể cùng đọc một gốc cây.
inline void plantTree(Column& column, const Tree& tree) {
    column.trees.push_back(tree);
    const int radius = 3;
    for (int z = tree.z - radius; z <= tree.z + radius; ++z) {
        for (int x = tree.x - radius; x <= tree.x + radius; ++x) {
            const int lx = x - column.cx * side;
            const int lz = z - column.cz * side;
            if (lx < 0 || lx >= side || lz < 0 || lz >= side) {
                continue;
            }
            for (int h = 0; h <= tree.height + 1; ++h) {
                const int y = tree.y + h;
                if (y < 0 || y >= column.height()) {
                    continue;
                }
                const int dx = std::abs(x - tree.x);
                const int dz = std::abs(z - tree.z);
                if (dx == 0 && dz == 0 && h < tree.height) {
                    column.put(lx, y, lz, Block::Wood);
                    continue;
                }
                int crown = -1;
                if (tree.pine && h >= 2) {
                    crown = std::max(0, (tree.height + 1 - h) / 2);
                    if ((tree.height - h) % 3 == 0 && crown > 0)
                        --crown;
                } else if (!tree.pine && h >= tree.height - 3) {
                    crown = 2;
                    if (h >= tree.height)
                        crown = 1;
                }
                if (std::max(dx, dz) > crown || dx + dz > crown + 1 || column.get(lx, y, lz) != Block::Air) {
                    continue;
                }
                Block leaves = Block::Leaves;
                if (tree.pine)
                    leaves = Block::Needles;
                column.put(lx, y, lz, leaves);
            }
        }
    }
}

// [snippet bank-height]
inline int bankHeight(int x, int z) {
    const double creek = 6.3 + 2.3 * std::sin(z * 0.29);
    const double bank = std::max(0.0, std::abs(x - creek) - 1.35);
    return std::clamp(2 + static_cast<int>(std::floor(bank * 0.82)), 2, 9);
}
// [/snippet bank-height]

inline Column makeBank(int cx = 0, int cz = 0) {
    Column column;
    column.cx = cx;
    column.cz = cz;
    for (int z = 0; z < side; ++z) {
        for (int x = 0; x < side; ++x) {
            const int height = bankHeight(x, z);
            // [snippet bank-material]
            for (int y = 0; y <= height; ++y) {
                Block block = Block::Stone;
                if (y >= height - 2)
                    block = Block::Soil;
                if (y == height)
                    block = Block::Grass;
                if (height <= 4 && y == height)
                    block = Block::Sand;
                column.put(x, y, z, block);
            }
            for (int y = height + 1; y <= 3; ++y) {
                column.put(x, y, z, Block::Water);
            }
            // [/snippet bank-material]
        }
    }
    const int bx = cx * side, bz = cz * side;
    plantTree(column, {bx + 2, bankHeight(2, 11) + 1, bz + 11, 5});
    plantTree(column, {bx + 13, bankHeight(13, 12) + 1, bz + 12, 5});
    return column;
}
#endif
} // namespace trail
