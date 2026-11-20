#pragma once
#include "geometry.hpp"
#include <vector>

namespace tiny {
enum class Axis { Row,
                  Column };
enum class Justify { Start,
                     Center,
                     End,
                     Between };
enum class Align { Start,
                   Center,
                   End,
                   Stretch };

struct Options {
    bool flex = false;
    Axis axis = Axis::Column;
    Justify justify = Justify::Start;
    Align align = Align::Stretch;
    double grow = 0;
    double basis = -1;
    bool operator==(const Options&) const = default;
};

struct Item {
    double basis = 0, cross = 0, grow = 0;
    double before = 0, after = 0, crossBefore = 0, crossAfter = 0;
    bool stretch = true;
};

// [snippet axes]
inline lab::Rect axisRect(Axis a, double main, double cross, double length, double thickness) {
    if (a == Axis::Row)
        return {main, cross, length, thickness};
    return {cross, main, thickness, length};
}

// [/snippet axes]

inline std::vector<lab::Rect> line(const Options& style, double available, double breadth, double gap, const std::vector<Item>& items) {
    // [snippet occupied]
    double occupied = 0, totalGrow = 0;
    if (items.size() > 1)
        occupied = gap * double(items.size() - 1);
    for (const auto& it : items) {
        occupied += it.before + it.basis + it.after;
        totalGrow += it.grow;
    }
    double remainder = std::max(0.0, available - occupied);
    // [/snippet occupied]
    double perWeight = 0, cursor = 0, spacing = gap;
#if LAB_CHECKPOINT >= 7003
    // [snippet share]
    if (totalGrow > 0) {
        perWeight = remainder / totalGrow;
        remainder = 0;
    }
    // [/snippet share]
#endif
#if LAB_CHECKPOINT >= 7004
    if (style.justify == Justify::Center)
        cursor = remainder / 2;
    if (style.justify == Justify::End)
        cursor = remainder;
    if (style.justify == Justify::Between && items.size() > 1)
        spacing += remainder / double(items.size() - 1);
#endif
    std::vector<lab::Rect> boxes;
    for (const auto& it : items) {
        const double length = it.basis + it.grow * perWeight;
        const double room = std::max(0.0, breadth - it.crossBefore - it.crossAfter);
        double cross = it.cross, inset = 0;
        if (style.align == Align::Stretch && it.stretch)
            cross = room;
#if LAB_CHECKPOINT >= 7004
        // [snippet align]
        const double extra = std::max(0.0, room - cross);
        if (style.align == Align::Center)
            inset = extra / 2;
        if (style.align == Align::End)
            inset = extra;
            // [/snippet align]
#endif
        cursor += it.before;
        boxes.push_back(axisRect(style.axis, cursor, it.crossBefore + inset, length, cross));
        cursor += length + it.after + spacing;
    }
    return boxes;
}
} // namespace tiny
