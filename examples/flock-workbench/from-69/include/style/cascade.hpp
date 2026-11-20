#pragma once
#include "markup/desk.hpp"
#include "sheet.hpp"

namespace tiny {
struct Paint {
    RGB paper{33, 56, 64}, ink{231, 242, 232}, edge{74, 114, 112};
};

struct Pick {
    int priority = 0;
    std::size_t rule = 0;
    Declaration declaration;
};

struct Computed {
    lab::BoxStyle box;
    Paint paint;
    std::vector<std::size_t> matches;
    std::map<std::string, Pick> winner;
};

#if LAB_CHECKPOINT >= 6903
// [snippet match]
inline int match(const Selector& selector, const Element& e) {
    if (selector.prefix == '#' && selector.name == e.id)
        return 3;
    if (selector.prefix == '.' && std::find(e.classes.begin(), e.classes.end(), selector.name) != e.classes.end())
        return 2;
    if (!selector.prefix && selector.name == e.tag)
        return 1;
    return 0;
}

// [/snippet match]

inline void apply(Computed& c, const Declaration& d) {
    const auto& k = d.key;
    const auto& v = d.value;
    if (k == "background")
        c.paint.paper = color(v, v, 0);
    if (k == "color")
        c.paint.ink = color(v, v, 0);
    if (k == "border-color")
        c.paint.edge = color(v, v, 0);
    if (k == "width") {
        c.box.width = lab::Width::Fill;
        if (v != "fill") {
            c.box.width = lab::Width::Fixed;
            c.box.fixedWidth = pixels(v, v, 0, 8, 600);
        }
    }
    if (k == "height") {
        c.box.height = lab::Height::Auto;
        if (v != "auto") {
            c.box.height = lab::Height::Fixed;
            c.box.fixedHeight = pixels(v, v, 0, 8, 540);
        }
    }
    if (k == "margin" || k == "padding" || k == "gap" || k == "border") {
        const double n = pixels(v, v, 0, 0, 64);
        if (k == "margin")
            c.box.margin = {n, n, n, n};
        if (k == "padding")
            c.box.padding = {n, n, n, n};
        if (k == "gap")
            c.box.gap = n;
        if (k == "border")
            c.box.border = n;
    }
}

// [snippet compete]
inline Computed cascade(const Element& e, lab::BoxStyle base, const Sheet& sheet) {
    Computed c;
    c.box = base;
    for (std::size_t index = 0; index < sheet.rules.size(); ++index) {
        const auto& rule = sheet.rules[index];
        const int rank = match(rule.selector, e);
        if (!rank)
            continue;
        c.matches.push_back(index);
        for (const auto& d : rule.properties) {
            const auto previous = c.winner.find(d.key);
            if (previous != c.winner.end() && previous->second.priority > rank)
                continue;
            c.winner[d.key] = {rank, index, d};
        }
    }
    for (const auto& [key, pick] : c.winner)
        apply(c, pick.declaration);
    return c;
}

// [/snippet compete]
#endif
} // namespace tiny
