#pragma once
#include "source.hpp"

namespace tiny {
enum class TagToken { Open,
                      Close,
                      Text,
                      End };

struct Token {
    TagToken kind = TagToken::End;
    std::size_t offset = 0;
    std::string name;
    std::map<std::string, std::string> attrs;
    bool empty = false;
};

#if LAB_CHECKPOINT >= 6802
// [snippet attribute]
inline void readAttribute(Cursor& c, Token& tag) {
    const auto at = c.pos;
    const std::string key = c.word();
    c.skip();
    c.need('=');
    c.skip();
    const char quote = c.peek();
    if (quote != '"' && quote != '\'')
        fail(c.source, c.pos, "quote attribute value");
    ++c.pos;
    const auto start = c.pos;
    while (c.peek() && c.peek() != quote) {
        if (c.peek() == '<' || c.peek() == '&')
            fail(c.source, c.pos, "markup inside attribute");
        ++c.pos;
    }
    const std::string value(c.source.substr(start, c.pos - start));
    c.need(quote);
    if (!tag.attrs.emplace(key, value).second)
        fail(c.source, at, "duplicate attribute: " + key);
}

// [/snippet attribute]

// [snippet next]
inline Token next(Cursor& c) {
    Token tag;
    tag.offset = c.pos;
    if (!c.peek())
        return tag;
    if (!c.take('<')) {
        tag.kind = TagToken::Text;
        while (c.peek() && c.peek() != '<')
            ++c.pos;
        tag.name = std::string(c.source.substr(tag.offset, c.pos - tag.offset));
        return tag;
    }
    tag.kind = TagToken::Open;
    if (c.take('/'))
        tag.kind = TagToken::Close;
    tag.name = c.word();
    while (true) {
        if (c.take('>'))
            break;
        if (tag.kind == TagToken::Open && c.take("/>")) {
            tag.empty = true;
            break;
        }
        if (!space(c.peek()))
            fail(c.source, c.pos, "expected space or >");
        c.skip();
        if (c.peek() == '>' || c.peek() == '/')
            continue;
        if (tag.kind == TagToken::Close)
            fail(c.source, c.pos, "closing tag has attributes");
        readAttribute(c, tag);
    }
    return tag;
}

// [/snippet next]
#endif
} // namespace tiny
