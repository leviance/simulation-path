#pragma once
#include "tokens.hpp"

namespace tiny {
struct Range {
    double low = 0, high = 100, step = 1, value = 0;
};

struct Element {
    std::string tag, id, text;
    std::vector<std::string> classes;
    std::optional<Range> range;
    int parent = -1;
    std::size_t offset = 0;
};

struct Document {
    std::vector<Element> elements;
    std::map<std::string, int> byId;
};

#if LAB_CHECKPOINT >= 6803
inline std::vector<std::string> names(const std::string& value, std::string_view source, std::size_t at) {
    std::vector<std::string> found;
    Cursor c{value};
    c.skip();
    while (c.peek()) {
        auto name = c.word();
        if (!identifier(name) || (!space(c.peek()) && c.peek()))
            fail(source, at, "invalid class");
        found.push_back(name);
        c.skip();
    }
    return found;
}

inline std::string attr(const Token& t, const std::string& name, const std::string& fallback = "") {
    auto it = t.attrs.find(name);
    if (it != t.attrs.end())
        return it->second;
    return fallback;
}

inline Element describe(const Token& t, int parent, std::string_view source) {
    const std::set<std::string> tags{"div", "h1", "span", "label", "button", "input"};
    if (!tags.contains(t.name))
        fail(source, t.offset, "unsupported tag: " + t.name);
    Element e;
    e.tag = t.name;
    e.offset = t.offset;
    e.parent = parent;
    for (const auto& [key, value] : t.attrs) {
#if LAB_CHECKPOINT >= 7100
        if (t.name == "input" && attr(t, "type") == "checkbox" && key == "label")
            continue;
#endif
        if (key == "id" || key == "class")
            continue;
        if (t.name == "input" && (key == "type" || key == "min" || key == "max" || key == "step" || key == "value"))
            continue;
        fail(source, t.offset, "unsupported attribute: " + key);
    }
    if (t.attrs.contains("id")) {
        e.id = attr(t, "id");
        if (!identifier(e.id))
            fail(source, t.offset, "invalid id");
    }
    e.classes = names(attr(t, "class"), source, t.offset);
    if (t.name == "input") {
#if LAB_CHECKPOINT >= 7100
        if (attr(t, "type") == "checkbox") {
            if (!t.empty || t.attrs.contains("min") || t.attrs.contains("max") || t.attrs.contains("step") || t.attrs.contains("value"))
                fail(source, t.offset, "checkbox must be empty and has no numeric range");
            e.text = attr(t, "label", e.id);
            if (e.text.size() > 40) fail(source,t.offset,"checkbox label too long");
            return e;
        }
#endif
        if (attr(t, "type") != "range" || !t.empty)
            fail(source, t.offset, "use <input type=\"range\" ... />");
        Range r;
        r.low = number(attr(t, "min", "0"), source, t.offset);
        r.high = number(attr(t, "max", "100"), source, t.offset);
        r.step = number(attr(t, "step", "1"), source, t.offset);
        r.value = r.low;
        if (t.attrs.contains("value"))
            r.value = number(attr(t, "value"), source, t.offset);
        if (r.low >= r.high || r.step <= 0 || r.step > r.high - r.low || r.value < r.low || r.value > r.high)
            fail(source, t.offset, "invalid min/max/step/value");
        e.range = r;
    }
    return e;
}

inline void appendText(std::string& output, const Token& t, std::string_view source) {
    for (std::size_t i = 0; i < t.name.size(); ++i) {
        const char ch = t.name[i];
        if (space(ch)) {
            if (!output.empty() && output.back() != ' ')
                output += ' ';
        } else if (ch == '&') {
            const auto rest = std::string_view(t.name).substr(i);
            bool decoded = false;
            for (const auto& [entity, glyph] : std::map<std::string, char>{{"&amp;", '&'}, {"&lt;", '<'}, {"&gt;", '>'}, {"&quot;", '"'}}) {
                if (rest.starts_with(entity)) {
                    output += glyph;
                    i += entity.size() - 1;
                    decoded = true;
                    break;
                }
            }
            if (!decoded)
                fail(source, t.offset + i, "unsupported entity");
        } else
            output += ch;
        if (output.size() > 40)
            fail(source, t.offset + i, "label exceeds 40 UTF-8 bytes");
    }
}

// [snippet parse-tree]
inline Document parse(std::string_view source) {
    checkUtf8(source);
    Cursor c{source};
    c.take("\xef\xbb\xbf");
    Document d;
    std::vector<int> open;
    while (true) {
        const Token token = next(c);
        if (token.kind == TagToken::End)
            break;
        if (token.kind == TagToken::Text) {
            if (open.empty() || d.elements[open.back()].tag == "div") {
                if (!std::all_of(token.name.begin(), token.name.end(), space))
                    fail(source, token.offset, "text needs a label");
            } else
                appendText(d.elements[open.back()].text, token, source);
            continue;
        }
        if (token.kind == TagToken::Close) {
            if (open.empty() || d.elements[open.back()].tag != token.name)
                fail(source, token.offset, "mismatched closing tag: " + token.name);
            auto& text = d.elements[open.back()].text;
            if (!text.empty() && text.back() == ' ')
                text.pop_back();
            open.pop_back();
            continue;
        }
        int parent = -1;
        if (open.empty()) {
            if (!d.elements.empty() || token.name != "div")
                fail(source, token.offset, "expected a single root div");
        } else {
            parent = open.back();
            if (d.elements[parent].tag != "div")
                fail(source, token.offset, "only div can contain elements");
        }
        if (d.elements.size() >= 32 || open.size() > 6)
            fail(source, token.offset, "node/depth limit");
        Element e = describe(token, parent, source);
        const int index = static_cast<int>(d.elements.size());
        if (!e.id.empty() && !d.byId.emplace(e.id, index).second)
            fail(source, token.offset, "duplicate id: " + e.id);
        d.elements.push_back(e);
        if (!token.empty)
            open.push_back(index);
    }
    if (d.elements.empty() || !open.empty())
        fail(source, c.pos, "empty or unclosed document");
    return d;
}

// [/snippet parse-tree]
#endif
} // namespace tiny
