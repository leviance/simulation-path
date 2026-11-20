#pragma once
#include "bank.hpp"
#include "cloud.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6301
struct Site {
    int ground = 0;
    double shore = 0, riverX = 0, inland = 0, riverLevel = 0;
    bool ocean = false, river = false, alpine = false, snow = false;
};

inline double riverCenter(double z, std::uint32_t seed) {
    const double offset = double(seed % 97) / 29;
    return 7 * std::sin(z * 0.042 + offset) + 4 * std::sin(z * 0.081 - offset);
}

inline int campX(std::uint32_t seed) {
    return int(std::floor(riverCenter(147, seed))) + 12;
}

// Đường mòn rẽ vào bếp rồi trở lại bờ; không san phẳng cả hẻm núi.
inline double pathX(double z, std::uint32_t seed) {
    const double bend = 1 - smooth(2, 10, std::abs(z - 147));
    return std::lerp(riverCenter(z, seed) + 7.15, campX(seed) + 0.5, bend);
}

inline Site siteAt(int x, int z, std::uint32_t seed) {
    Site s;
    const double offset = double(seed % 97) / 29;
    s.shore = 5 * std::sin(x * 0.044 + offset) + 3 * std::sin(x * 0.091 - offset);
    s.inland = z - s.shore;
    s.riverX = riverCenter(z, seed);
    const double bank = std::abs(x - s.riverX);
    const double broad = valueNoise(x / 58.0, z / 53.0, seed), fine = valueNoise(x / 17.0, z / 19.0, seed + 2);
    const double mountains = smooth(82, 177, s.inland);
    const double canyon = smooth(50, 87, s.inland) * (1 - smooth(128, 163, s.inland));
    s.riverLevel = 12 + std::clamp(s.inland, 0.0, 236.0) * 0.064;
    // [snippet land-profile]
    const double bed = s.riverLevel - 2.4;
    const double land = s.riverLevel + 2.8 + mountains * (6 + 7 * broad) + 6 * broad + 2 * fine + canyon * 15;
    const double edge = smooth(2.6, 17.0, bank);
    double ground = std::lerp(bed, land, edge);
    // Lối men bờ có độ cao tăng từ từ để tuyến chuẩn không bị vách đá chặn.
    const double trail = smooth(3.4, 6.4, bank) * (1 - smooth(7.5, 11.5, bank));
    ground = std::lerp(ground, s.riverLevel + 1 + mountains * 3, trail);
    const double coast = std::clamp(12 + 0.24 * s.inland + 1.3 * (fine - 0.5), 3.0, 17.0);
    ground = std::lerp(coast, ground, smooth(-3, 18, s.inland));
    // Nối lòng sông xuyên qua dải cát: cửa sông không có đập chắn vô tình.
    const double estuary = (1 - smooth(2.8, 6.0, bank)) * (1 - smooth(10, 24, s.inland));
    ground = std::lerp(ground, std::min(ground, bed), estuary);
    // Hai mỏm đá phía ngoài bãi cho mắt một mốc khi quan sát đỉnh sóng.
    const double reefA = std::hypot((x + 9.0) / 5.0, (z + 10.0) / 3.3);
    const double reefB = std::hypot((x - 16.0) / 4.2, (z + 14.0) / 2.6);
    ground += 5.4 * (1 - smooth(0, 1, reefA)) + 5.0 * (1 - smooth(0, 1, reefB));
    // Khoảng đất phẳng quanh bếp, đủ cho người quan sát đi vòng.
    const double clearing = 1 - smooth(4, 8, std::hypot(double(x - campX(seed)), double(z - 147)));
    ground = std::lerp(ground, 25.0, clearing);
    if (s.inland > 12) {
        const double center = pathX(z, seed);
        const double pathWeight = 1 - smooth(1.9, 3.8, std::abs(x + 0.5 - center));
        const double pathLevel = std::lerp(s.riverLevel + 1 + mountains * 3, 25.0, 1 - smooth(3, 10, std::abs(z - 147)));
        ground = std::lerp(ground, pathLevel, pathWeight);
    }
    // [/snippet land-profile]
    s.ground = std::clamp(int(std::floor(ground)), 2, 57);
    s.ocean = s.inland < 10 && s.ground < 12;
    s.river = !s.ocean && s.ground < int(std::floor(s.riverLevel)) && bank < 8;
    s.alpine = s.inland > 128;
    s.snow = s.alpine && (s.ground > 27 || s.inland > 161);
    return s;
}

inline Column naturalColumn(int cx, int cz, std::uint32_t seed) {
    Column column;
    column.cx = cx;
    column.cz = cz;
    column.sections.resize(4);
    for (int z = 0; z < 16; ++z)
        for (int x = 0; x < 16; ++x) {
            const int wx = cx * side + x, wz = cz * side + z;
            const Site s = siteAt(wx, wz, seed);
            for (int y = 0; y <= s.ground; ++y) {
                Block m = Block::Stone;
                if (y >= s.ground - 2)
                    m = Block::Soil;
                if (y == s.ground)
                    m = Block::Grass;
                if (s.inland < 11 || s.river || s.ocean) {
                    if (y >= s.ground - 1) {
                        m = Block::Sand;
                        if (s.inland < -4 && s.ground >= 12)
                            m = Block::Stone;
                    }
                } else if (s.snow && y == s.ground)
                    m = Block::Snow;
                else if (s.ground - s.riverLevel > 13 && !s.alpine && y >= s.ground - 2)
                    m = Block::Stone;
                column.put(x, y, z, m);
            }
            // [snippet fill-water]
            int water = 0;
            if (s.ocean)
                water = 12;
            else if (s.river)
                water = int(std::floor(s.riverLevel));
            for (int y = s.ground + 1; y <= water; ++y)
                column.put(x, y, z, Block::Water);
            // [/snippet fill-water]
        }
#if LAB_CHECKPOINT >= 6302
    // Xét cả gốc ở cột kề: tán cây có thể vươn qua đường biên.
    // [snippet tree-anchors]
    const int minX = int(std::floor((cx * side - 3) / 7.0)), minZ = int(std::floor((cz * side - 3) / 7.0));
    const int maxX = int(std::floor((cx * side + side + 2) / 7.0)), maxZ = int(std::floor((cz * side + side + 2) / 7.0));
    for (int gz = minZ; gz <= maxZ; ++gz)
        for (int gx = minX; gx <= maxX; ++gx) {
            const auto h = hash(gx, gz, seed + 99);
            if ((h & 7) == 0)
                continue;
            const int tx = gx * 7 + int((h >> 4) % 6), tz = gz * 7 + int((h >> 12) % 6);
            const Site s = siteAt(tx, tz, seed);
            if (std::abs(tx + 0.5 - pathX(tz, seed)) < 4.2 || std::hypot(double(tx - campX(seed)), double(tz - 147)) < 5.5)
                continue;
            const double lookoutX = std::floor(riverCenter(170, seed) + 18);
            if (std::hypot(tx - lookoutX, double(tz - 170)) < 4.8)
                continue;
            if (s.inland < 12 || s.river || s.ocean || std::abs(tx - s.riverX) < 9.5 || s.ground > 53)
                continue;
            plantTree(column, {tx, s.ground + 1, tz, 5 + int((h >> 20) % 3), s.alpine});
        }
// [/snippet tree-anchors]
#endif
    return column;
}
#endif
} // namespace trail
