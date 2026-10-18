#pragma once
#include "tree.hpp"
#include <map>

namespace lab {
#if LAB_CHECKPOINT >= 2
struct Edges {
    double left = 0;
    double top = 0;
    double right = 0;
    double bottom = 0;
};

enum class Width {
    Fill,
    Fixed
};
enum class Height {
    Auto,
    Fixed
};

// Style là đầu vào; Widget::local là kết quả của layout, không phải style.
struct BoxStyle {
    Width width = Width::Fill;
    double fixedWidth = 180;
    Height height = Height::Fixed;
    double fixedHeight = 24;
    Edges margin{4, 4, 4, 4};
    Edges padding{4, 4, 4, 4};
    double border = 1;
    double gap = 8;
};

using Styles = std::map<WidgetId, BoxStyle>;

inline BoxStyle defaultStyle(const Widget& node) {
    BoxStyle style;
    if (node.kind == Kind::Button)
        style.fixedHeight = 36;
    if (node.kind == Kind::Slider)
        style.fixedHeight = 32;
    if (node.kind == Kind::Panel) {
        style.height = Height::Auto;
        style.padding = {12, 12, 12, 12};
        style.border = 2;
    }
    return style;
}

inline bool validEdges(Edges edges, double maximum) {
    for (const double value : {edges.left, edges.top, edges.right, edges.bottom}) {
        if (!std::isfinite(value) || value < 0 || value > maximum)
            return false;
    }
    return true;
}

inline bool validStyle(const BoxStyle& style, const Widget& node) {
    return (style.width == Width::Fill || style.width == Width::Fixed) && (style.height == Height::Fixed || (style.height == Height::Auto && node.kind == Kind::Panel)) && std::isfinite(style.fixedWidth) && style.fixedWidth >= 8 && style.fixedWidth <= 600 && std::isfinite(style.fixedHeight) && style.fixedHeight >= 8 && style.fixedHeight <= 540 && validEdges(style.margin, 64) && validEdges(style.padding, 48) && std::isfinite(style.border) && style.border >= 0 && style.border <= 8 && std::isfinite(style.gap) && style.gap >= 0 && style.gap <= 32;
}

inline Rect contentBox(Rect box, const BoxStyle& style) {
    return {box.x + style.border + style.padding.left, box.y + style.border + style.padding.top, std::max(0.0, box.width - 2 * style.border - style.padding.left - style.padding.right), std::max(0.0, box.height - 2 * style.border - style.padding.top - style.padding.bottom)};
}
#endif
} // namespace lab
