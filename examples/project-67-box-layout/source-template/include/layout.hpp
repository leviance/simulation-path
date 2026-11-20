#pragma once
#include "style.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
struct Size {
    double width = 0;
    double height = 0;
    double naturalHeight = 0;
};

using Measures = std::map<WidgetId, Size>;

// availableWidth còn chứa margin của node. Kết quả width/height là border box.
// [snippet measure]
inline Size measure(const Widget& node, double availableWidth, const Styles& styles, Measures& sizes) {
    const BoxStyle& style = styles.at(node.id);
    if (!validStyle(style, node) || !std::isfinite(availableWidth) || availableWidth < 0 || availableWidth > 960)
        throw std::out_of_range("invalid layout input");
    // [snippet offered-width]
    double width = style.fixedWidth;
    if (style.width == Width::Fill)
        width = std::max(0.0, availableWidth - style.margin.left - style.margin.right);
    // [/snippet offered-width]
    double naturalHeight = style.fixedHeight;
    if (node.kind == Kind::Panel) {
        const double innerWidth = contentBox({0, 0, width, 0}, style).width;
        double childrenHeight = 0;
        int visibleCount = 0;
        // [snippet natural-height]
        for (const auto& child : node.children) {
            if (!child->visible)
                continue;
            const Size childSize = measure(*child, innerWidth, styles, sizes);
            const BoxStyle& childStyle = styles.at(child->id);
            if (visibleCount > 0)
                childrenHeight += style.gap;
            childrenHeight += childStyle.margin.top + childSize.height + childStyle.margin.bottom;
            ++visibleCount;
        }
        naturalHeight = 2 * style.border + style.padding.top + childrenHeight + style.padding.bottom;
        // [/snippet natural-height]
    }
    double height = style.fixedHeight;
    if (style.height == Height::Auto)
        height = naturalHeight;
    // [snippet remember-size]
    const Size result{width, height, naturalHeight};
    sizes[node.id] = result;
    return result;
    // [/snippet remember-size]
}
// [/snippet measure]
#endif

#if LAB_CHECKPOINT >= 4
// Parent truyền origin local; không cộng tọa độ world ở bước arrange.
// [snippet arrange]
inline void arrange(Widget& node, double x, double y, const Styles& styles, const Measures& sizes) {
    const Size size = sizes.at(node.id);
    node.local = {x, y, size.width, size.height};
    const BoxStyle& style = styles.at(node.id);
    const Rect content = contentBox({0, 0, size.width, size.height}, style);
    double cursorY = content.y;
    int visibleCount = 0;
    for (const auto& child : node.children) {
        if (!child->visible)
            continue;
        const BoxStyle& childStyle = styles.at(child->id);
        const Size childSize = sizes.at(child->id);
        if (visibleCount > 0)
            cursorY += style.gap;
        const double childX = content.x + childStyle.margin.left;
        const double childY = cursorY + childStyle.margin.top;
#if LAB_CHECKPOINT >= 5
        arrange(*child, childX, childY, styles, sizes);
#else
        child->local = {childX, childY, childSize.width, childSize.height};
#endif
        cursorY = childY + childSize.height + childStyle.margin.bottom;
        ++visibleCount;
    }
}
// [/snippet arrange]
#endif
} // namespace lab
