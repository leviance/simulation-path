#pragma once
#include "blocks.hpp"
#include <array>

namespace trail {
// Atlas tự vẽ bằng quy tắc trên lưới 16×16. Không cần tải ảnh của trò chơi.
inline Color paintTexel(Block block, int face, int u, int v) {
    const int n = static_cast<int>(hash(u, v, 31) % 19) - 9;
    const int broad = static_cast<int>(hash(u / 3, v / 3, 19) % 9) - 4;
    int variation = n + broad;
    Color base{128, 145, 153};
    if (block == Block::Grass) {
        base = {117, 159, 67};
        if (face != 2 && (face == 3 || v < 12 - static_cast<int>(hash(u / 2, 1, 7) % 4))) {
            base = {136, 98, 66};
        } else if ((u + 2 * v) % 13 < 2) {
            variation += 13;
        }
    } else if (block == Block::Soil) {
        base = {133, 94, 65};
        if ((hash(u / 2, v, 9) & 15) == 0)
            base = {162, 139, 105};
    } else if (block == Block::Stone) {
        base = {143, 148, 151};
        if ((v + u / 5 + static_cast<int>(hash(0, v / 4, 7) % 3)) % 8 == 0)
            variation -= 18;
    } else if (block == Block::Sand) {
        base = {224, 202, 145};
        variation = variation / 2;
        if ((v + u / 6) % 7 == 0)
            variation -= 8;
    } else if (block == Block::Wood) {
        base = {126, 86, 49};
        variation += static_cast<int>(hash(u / 2, v / 6, 12) % 32) - 18;
        if (face == 2 || face == 3) {
            const int ring = std::max(std::abs(u - 7), std::abs(v - 7));
            base = {172, 137, 88};
            variation = n / 2 - (ring % 3) * 9;
        }
    } else if (block == Block::Leaves || block == Block::Needles) {
        base = {77, 133, 57};
        if (block == Block::Needles)
            base = {51, 104, 77};
#if LAB_CHECKPOINT >= 6302
        if (block == Block::Needles && (face == 2 || (face != 3 && v > 13))) {
            const int patch = int(hash(u / 3, v / 3, 97) % 9);
            if (patch > 1)
                base = {195, 217, 218};
        }
#endif
        variation += static_cast<int>(hash(u / 2, v / 2, 17) % 29) - 12;
        if ((u - v + 16) % 7 == 0)
            variation += 13;
    } else if (block == Block::Water) {
        base = {64, 153, 170};
        variation = n / 3;
        if ((v + u / 4) % 8 == 0)
            variation += 9;
    } else if (block == Block::Snow) {
        base = {225, 236, 243};
        variation /= 3;
    }
    return {channel(base.r + variation), channel(base.g + variation), channel(base.b + variation)};
}

class Atlas {
    std::array<Color, materialCount * 6 * 256> pixels{};

public:
    Atlas() {
        for (int m = 0; m < materialCount; ++m) {
            for (int face = 0; face < 6; ++face) {
                for (int v = 0; v < 16; ++v) {
                    for (int u = 0; u < 16; ++u) {
                        pixels[((m * 6 + face) * 16 + v) * 16 + u] = paintTexel(static_cast<Block>(m), face, u, v);
                    }
                }
            }
        }
    }

    // [snippet tile-uv]
    Color sample(Block block, int face, double u, double v) const {
        const int tx = static_cast<int>(std::floor(u * 16)) & 15;
        const int ty = static_cast<int>(std::floor(v * 16)) & 15;
        return pixels[((static_cast<int>(block) * 6 + face) * 16 + ty) * 16 + tx];
    }
    // [/snippet tile-uv]
};
} // namespace trail
