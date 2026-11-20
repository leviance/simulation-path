#pragma once
#include "markup/document.hpp"
#if LAB_CHECKPOINT >= 7001
#include "flex/properties.hpp"
#endif
#include <cstdint>

namespace tiny {
struct Selector {
    char prefix = 0;
    std::string name;
};

struct Declaration {
    std::string key, value;
    std::size_t offset = 0;
};

struct Rule {
    Selector selector;
    std::vector<Declaration> properties;
};

struct Sheet {
    std::vector<Rule> rules;
};

struct RGB {
    unsigned r = 0, g = 0, b = 0;
    bool operator==(const RGB&) const = default;
};

inline std::string trim(std::string_view value) {
    while (!value.empty() && space(value.front()))
        value.remove_prefix(1);
    while (!value.empty() && space(value.back()))
        value.remove_suffix(1);
    return std::string(value);
}

inline RGB color(std::string_view v, std::string_view source, std::size_t at) {
    if (v.size() != 7 || v[0] != '#')
        fail(source, at, "use #RRGGBB");
    unsigned rgb = 0;
    auto result = std::from_chars(v.data() + 1, v.data() + 7, rgb, 16);
    if (result.ec != std::errc{} || result.ptr != v.data() + 7)
        fail(source, at, "bad hex color");
    return {(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255};
}

inline double pixels(std::string_view s, std::string_view source, std::size_t at, double low, double high) {
    if (!s.ends_with("px"))
        fail(source, at, "expected px");
    const double v = number(s.substr(0, s.size() - 2), source, at);
    if (v < low || v > high)
        fail(source, at, "length outside allowed range");
    return v;
}

inline void validateProperty(const Declaration& d, std::string_view source) {
    const auto& k = d.key;
    const auto& v = d.value;
    if (k == "color" || k == "background" || k == "border-color") {
        color(v, source, d.offset);
        return;
    }
    if (k == "width") {
        if (v != "fill")
            pixels(v, source, d.offset, 8, 600);
        return;
    }
    if (k == "height") {
        if (v != "auto")
            pixels(v, source, d.offset, 8, 540);
        return;
    }
    if (k == "margin") {
        pixels(v, source, d.offset, 0, 64);
        return;
    }
    if (k == "padding") {
        pixels(v, source, d.offset, 0, 48);
        return;
    }
    if (k == "border") {
        pixels(v, source, d.offset, 0, 8);
        return;
    }
    if (k == "gap") {
        pixels(v, source, d.offset, 0, 32);
        return;
    }
#if LAB_CHECKPOINT >= 7001
    if (flexProperty(k, v, source, d.offset))
        return;
#endif
    fail(source, d.offset, "unsupported property: " + k);
}

#if LAB_CHECKPOINT >= 6902
// [snippet rules]
inline Sheet parseSheet(std::string_view source) {
    checkUtf8(source);
    Cursor c{source};
    c.take("\xef\xbb\xbf");
    Sheet sheet;
    c.skip();
    while (c.peek()) {
        if (sheet.rules.size() >= 64)
            fail(source, c.pos, "rule limit: 64");
        Rule rule;
        if (c.peek() == '#' || c.peek() == '.')
            rule.selector.prefix = source[c.pos++];
        rule.selector.name = c.word();
        if (!identifier(rule.selector.name))
            fail(source, c.pos, "expected simple selector");
        c.skip();
        c.need('{');
        c.skip();
        while (!c.take('}')) {
            Declaration d;
            d.offset = c.pos;
            d.key = c.word();
            c.skip();
            c.need(':');
            const auto begin = c.pos;
            while (c.peek() && c.peek() != ';' && c.peek() != '}')
                ++c.pos;
            d.value = trim(source.substr(begin, c.pos - begin));
            c.need(';');
            validateProperty(d, source);
            if (rule.properties.size() >= 24)
                fail(source, d.offset, "declaration limit: 24");
            rule.properties.push_back(d);
            c.skip();
        }
        sheet.rules.push_back(std::move(rule));
        c.skip();
    }
    return sheet;
}

// [/snippet rules]
#endif
} // namespace tiny
