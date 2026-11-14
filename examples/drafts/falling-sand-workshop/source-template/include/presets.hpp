#pragma once

#include "grid.hpp"

namespace sand {

inline const char* presetName(int preset) {
    if (preset == 1) {
        return "HOURGLASS";
    }
    if (preset == 2) {
        return "BREAK THE DAM";
    }
    if (preset == 3) {
        return "MIXTURE";
    }
    if (preset == 4) {
        return "EMPTY";
    }
    return "TERRACES";
}

// Seed chỉ dùng để tạo cảnh/màu. Luật di chuyển dùng parity, không gọi RNG mỗi tick.
inline std::uint32_t nextRandom(std::uint32_t& state) {
    state = state * 1664525U + 1013904223U;
    return state;
}

#if LAB_CHECKPOINT >= 7
inline Grid makeWorkshopScene(int preset = 0, std::uint32_t seed = 46, int columns = 512, int rows = 320) {
    Grid grid(columns, rows);
    if (preset == 4) {
        return grid;
    }
    auto box = [&](int left, int top, int right, int bottom, Cell material) {
        for (int y = top; y < bottom; ++y) {
            for (int x = left; x < right; ++x) {
                grid.set(x, y, material);
            }
        }
    };
    const int w = columns;
    const int h = rows;
    box(w / 16, h - 12, w - w / 16, h - 9, Cell::Wall);
    if (preset == 1) {
        const int center = w / 2;
        const int throat = h * 3 / 5;
        for (int y = h / 5; y < throat; ++y) {
            const int inset = throat - y;
            box(center - inset - 5, y, center - inset - 2, y + 1, Cell::Wall);
            box(center + inset + 2, y, center + inset + 5, y + 1, Cell::Wall);
            if (y < h * 2 / 5) {
                box(center - inset - 2, y, center + inset + 2, y + 1, Cell::Sand);
            }
        }
    } else if (preset == 2) {
        box(w / 12, h / 4, w / 2 - 3, h - 12, Cell::Water);
        box(w / 12 - 3, h / 4, w / 12, h - 9, Cell::Wall);
        box(w / 2 - 3, h / 5, w / 2, h - 9, Cell::Wall);
        box(w * 2 / 3, h / 5, w * 5 / 6, h / 3, Cell::Sand);
    } else if (preset == 3) {
        std::uint32_t state = seed;
        for (int y = h / 8; y < h * 3 / 4; ++y) {
            for (int x = w / 4; x < w * 3 / 4; ++x) {
                const std::uint32_t value = nextRandom(state) >> 24U;
                if (value < 72) {
                    grid.set(x, y, Cell::Sand);
                } else if (value < 216) {
                    grid.set(x, y, Cell::Water);
                }
            }
        }
        box(w / 4 - 3, h / 8, w / 4, h - 9, Cell::Wall);
        box(w * 3 / 4, h / 8, w * 3 / 4 + 3, h - 9, Cell::Wall);
    } else {
        box(w / 8, h / 10, w * 3 / 8, h / 3, Cell::Sand);
        box(w / 6, h / 2, w * 5 / 16, h / 2 + 3, Cell::Wall);
        box(w * 5 / 16, h * 2 / 3, w * 3 / 4, h * 2 / 3 + 3, Cell::Wall);
        box(w * 5 / 8, h / 10, w * 3 / 4, h * 3 / 10, Cell::Water);
        box(w * 9 / 16, h * 3 / 4, w * 7 / 8, h - 12, Cell::Water);
        box(w * 9 / 16 - 3, h * 3 / 4, w * 9 / 16, h - 9, Cell::Wall);
        box(w * 7 / 8, h * 3 / 4, w * 7 / 8 + 3, h - 9, Cell::Wall);
    }
    return grid;
}
#endif

} // namespace sand
