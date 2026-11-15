#pragma once

#include "grid.hpp"

namespace sand {

using Rgba = std::array<std::uint8_t, 4>;

inline Rgba colorFor(Cell material) {
    if (material == Cell::Wall) {
        return {119, 132, 157, 255};
    }
    if (material == Cell::Sand) {
        return {229, 192, 123, 255};
    }
    if (material == Cell::Water) {
        return {65, 157, 220, 255};
    }
    return {11, 17, 28, 255};
}

#if LAB_CHECKPOINT >= 7
inline Rgba shadedColor(const Grid& grid, int x, int y, bool plain) {
    const Cell material = grid.at(x, y);
    Rgba color = colorFor(material);
    if (plain || material == Cell::Empty) {
        return color;
    }
    const unsigned grain = (static_cast<unsigned>(x) * 17U + static_cast<unsigned>(y) * 31U) % 13U;
    int change = static_cast<int>(grain) - 6;
    if (material == Cell::Water) {
        change = -static_cast<int>(24.0F * y / grid.height);
        if (grid.at(x, y - 1) == Cell::Empty) {
            change = 38;
        }
    }
    if (material == Cell::Wall) {
        change = -16;
        if (grid.at(x, y - 1) != Cell::Wall) {
            change = 26;
        }
    }
    for (std::size_t channel = 0; channel < 3; ++channel) {
        color[channel] = static_cast<std::uint8_t>(std::clamp(static_cast<int>(color[channel]) + change, 0, 255));
    }
    return color;
}

// destination chỉ là vùng ghi. Không đọc lại dữ liệu cũ từ texture vừa lock.
inline void writeRgbaRow(const Grid& grid, int y, std::uint8_t* destination, bool plain = false) {
    for (int x = 0; x < grid.width; ++x) {
        const Rgba color = shadedColor(grid, x, y, plain);
        const std::size_t offset = static_cast<std::size_t>(x) * 4;
        for (std::size_t channel = 0; channel < 4; ++channel) {
            destination[offset + channel] = color[channel];
        }
    }
}
#endif

} // namespace sand
