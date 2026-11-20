#pragma once
#include "cascade.hpp"

namespace tiny {
inline bool sameEdges(lab::Edges a, lab::Edges b) {
    return a.left == b.left && a.top == b.top && a.right == b.right && a.bottom == b.bottom;
}

// [snippet geometry]
inline bool sameBox(const lab::BoxStyle& a, const lab::BoxStyle& b) {
    return a.width == b.width && a.height == b.height && a.fixedWidth == b.fixedWidth && a.fixedHeight == b.fixedHeight &&
        a.border == b.border && a.gap == b.gap && sameEdges(a.margin, b.margin) && sameEdges(a.padding, b.padding);
}

// [/snippet geometry]

struct Palette {
    lab::Styles defaults;
    std::map<lab::WidgetId, Computed> computed;
    Sheet sheet;
    std::string filename = "style.css";
    unsigned paints = 0;
};

#if LAB_CHECKPOINT >= 6903
// [snippet commit-styles]
inline void installSheet(Desk& d, Palette& palette, Sheet sheet, std::string_view source) {
    std::map<lab::WidgetId, Computed> next;
    auto boxes = palette.defaults;
    bool geometry = false;
    for (const auto& [id, index] : d.page.elements) {
        Computed c = cascade(d.page.document.elements[index], palette.defaults.at(id), sheet);
        const auto& node = *lab::find(*d.page.layout.scene.tree.root, id);
        if (!lab::validStyle(c.box, node)) {
            std::size_t at = 0;
            const auto it = c.winner.find("height");
            if (it != c.winner.end())
                at = it->second.declaration.offset;
            fail(source, at, "invalid box for #" + d.page.document.elements[index].id);
        }
#if LAB_CHECKPOINT >= 6904
        if (!sameBox(d.page.layout.scene.styles.at(id), c.box))
            geometry = true;
        boxes[id] = c.box;
#endif
        next.emplace(id, std::move(c));
    }
    if (geometry) {
        d.page.layout.scene.styles = std::move(boxes);
        lab::invalidate(d.page.layout, d.ui);
#if LAB_CHECKPOINT < 7002
        lab::ensureLayout(d.page.layout, d.ui);
#endif
    }
    palette.computed = std::move(next);
    palette.sheet = std::move(sheet);
    ++palette.paints;
}

// [/snippet commit-styles]
#endif

// [snippet read-sheet]
inline bool reloadCss(Desk& d, Palette& p, const std::filesystem::path& path) {
    try {
        const auto css = readFile(path);
        checkUtf8(css);
#if LAB_CHECKPOINT >= 6903
        installSheet(d, p, parseSheet(css), css);
        d.status = "Style: " + path.filename().string() + "   |   layout " + std::to_string(d.page.layout.passes);
#elif LAB_CHECKPOINT >= 6902
        d.status = std::to_string(parseSheet(css).rules.size()) + " rules; current theme unchanged";
#else
        d.status = std::to_string(css.size()) + " CSS bytes; current theme unchanged";
#endif
        p.filename = path.filename().string();
        d.error = false;
        return true;
    } catch (const std::exception& e) {
        d.error = true;
        d.status = path.filename().string() + ":" + e.what();
        return false;
    }
}

// [/snippet read-sheet]
} // namespace tiny
